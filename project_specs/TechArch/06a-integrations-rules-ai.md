---

# 6. Rule Engine, AI Boundary & Integration Points

## 6.1 Integration Inventory

CargoDemo is deliberately near-hermetic. An integration not listed here does not exist and must not be added without amending PRD §5.8.

| # | Integration | Kind | Direction | Required for the demo | Failure behavior |
|---|---|---|---|---|---|
| I1 | Cargo-entry JSON file / local ingestion API | **Simulated** (stands in for ACE) | Inbound | Yes | Per-entry rejection; batch continues |
| I2 | AI provider (OpenAI/Anthropic-compatible HTTP) | **Real, optional** | Outbound | **No** | Deterministic fallback; walkthrough unaffected |
| I3 | SQLite database file | Real, local | Bidirectional | Yes | Startup abort |
| I4 | Local document storage (filesystem) | Real, local | Bidirectional | Yes | Startup abort; upload rolls back |
| I5 | Notification delivery (email/SMS) | **Simulated — generated, never transmitted** | — | Yes (as a recording) | N/A — no transport exists |
| I6 | Identity provider (PIV/CAC, SSO) | **Simulated — role selector** | — | Yes (as a selector) | N/A — no external call |
| I7 | Browser (embedded preview) | Real | Inbound | Yes | Deterministic port; stable URL |

Everything a production system of this shape would have — ACE connectivity, importer correspondence, message queues, schedulers, webhooks, external audit sinks, telemetry exporters — is explicitly absent (PRD §5.9).

### Egress summary

| Destination | When | Contains | Suppressible |
|---|---|---|---|
| AI provider | Summary/recommendation generation, **only when `CARGODEMO_AI_PROVIDER ≠ none`** | Synthetic shipment attributes, rule definitions, evidence | Yes — set the provider to `none`, **which is the default** |

**That is the complete egress inventory.** With `CARGODEMO_AI_PROVIDER=none` the application makes **zero** outbound network requests and the entire ten-step walkthrough still completes — the configuration used by the F21 end-to-end test and the recommended configuration for a live CBP demonstration.

## 6.2 Rule-Engine Configuration Storage

### Where configuration lives

**Entirely in the `rules` table** (`02a` §2.7). There is no rule DSL file, no YAML, no environment variable, and no hardcoded threshold anywhere in `src/domain/rules/`. The seed file `fixtures/rules.seed.json` is an *initial dataset*, not a runtime source — after boot, the database is the only authority.

```
  rules row
  ├─ exception_type    ──▶ selects which of exactly THREE evaluators runs   (code)
  ├─ conditions_json   ──▶ applicability gate, shared by all three          (data)
  ├─ params_json       ──▶ every threshold, list, count, and field path     (data)
  ├─ severity          ──▶ feeds priority derivation                        (data)
  ├─ priority_mapping  ──▶ optional per-rule severity→priority override     (data)
  ├─ enabled           ──▶ disabled rules never evaluate, ever              (data)
  └─ version           ──▶ stamped onto every exception the rule produces   (data)
```

**The dividing line is absolute:** `exception_type` selects *mechanism*; everything else is *behavior*, and all behavior is data. A `MISSING_REQUIRED_DOCUMENT` rule does not know which documents it requires until it reads `params_json`. An administrator changing `expected_digit_count` from 10 to 6, or adding a document type, or lowering a severity, produces a different validation outcome **with no code change and no redeploy** — which is exactly the F15/PRD §7 "rule configurability" success metric.

### Parameter validation

`params_json` is validated by Ajv against a JSON Schema chosen by `exception_type`, with **`additionalProperties: false`**. That last property is load-bearing: a typo in a parameter name is a `422 RULE_CONFIG_INVALID` on save rather than a silently ignored key that quietly disables a check. Cross-field checks are part of the same validation — for example, `check_known_codes: true` with an empty `known_codes` is invalid rather than a rule that passes everything (test RE-08).

Validation runs at three moments, deliberately:

| Moment | Behavior on failure |
|---|---|
| **On save** (F15, `POST`/`PATCH /api/rules`) | `422 RULE_CONFIG_INVALID` with `field_errors`; nothing persists |
| **On load** (F4, every evaluation) | The rule is **skipped and recorded** in `evaluations.invalid_rules_json`; the other rules still evaluate (test RE-17) |
| **On startup** (health probe) | Counted as `health.subsystems.rules.invalid`; a non-zero value degrades health but does not block startup |

Validating on load as well as on save is defence against a rule made invalid by a migration or a direct database edit. A silently non-firing rule is the worst possible failure for a compliance system: it looks like a passing shipment.

### The three evaluators (closed set)

| `exception_type` | Module | Parameter surface |
|---|---|---|
| `MISSING_REQUIRED_DOCUMENT` | `rules/evaluators/missingDocument.ts` | `required_document_types`, `match_mode`, `accept_statuses`, `require_file_present`, `ignore_superseded` |
| `INVALID_HTS_CODE` | `rules/evaluators/htsCode.ts` | `expected_digit_count`, `min_digit_count`, `allowed_separators`, `allow_partial`, `treat_missing_as_exception`, `check_known_codes`, `known_code_prefix_length`, `known_codes`, `placeholder_characters` |
| `CONFLICTING_COUNTRY_OF_ORIGIN` | `rules/evaluators/countryOfOrigin.ts` | `declared_field`, `comparison_fields`, `treat_missing_declared_as_conflict`, `treat_missing_comparison_as_conflict`, `allowed_pairs`, `case_sensitive` |

**The evaluator registry is a closed map with no registration API.** A fourth exception type cannot be added by configuration, by plugin, or by a rules row — `exception_type` carries a `CHECK` constraint on both `rules` and `exceptions`, and a persisted unknown value raises `EXCEPTION_TYPE_UNSUPPORTED`. Adding a type would require a code change *and* a migration *and* a PRD amendment. That friction is the intended enforcement of PRD §5.8.

### Evaluation pipeline

```
  invoke(cargo_entry_id, trigger, actor)
    │
    ├─ ① load entry + documents + ENABLED rule set (process-cached)
    ├─ ② sort deterministically: (exception_type ASC, severity DESC, rule_id ASC)
    │      └─ this ordering IS the persisted finding order and the UI display order
    ├─ ③ per rule: evaluate applicability conditions
    │      └─ not applicable → skipped_rules[] WITH the failing condition
    │         ("did not apply" is distinct from "passed", and both are recorded)
    ├─ ④ per applicable rule: dispatch to its evaluator
    │      └─ bad DATA is a finding, never a throw
    │         bad RULE DEFINITION → invalid_rules[], other rules continue
    ├─ ⑤ retain ALL findings — no suppression, no dedup, no "highest severity only"
    ├─ ⑥ compute rule_set_fingerprint = sha256 over ordered (rule_id, version, enabled)
    └─ ⑦ hand EvaluationResult to F5 for persistence + priority derivation
```

**Rule-set caching and invalidation.** The enabled rule set is cached in process and invalidated whenever any `rules` row is created, updated, enabled, or disabled. A rule change therefore takes effect **on the very next evaluation, with no restart** — which is what makes the F15 administrator demo (change a parameter, preview the impact, revalidate, see the queue change) work live. The cache is keyed by the same `rule_set_fingerprint` recorded on evaluations, so a stale cache would be visible as a fingerprint mismatch rather than a silent wrong answer.

**Determinism.** The same `(entry, rule set)` produces identical findings, identical ordering, and identical evidence arrays on every run — asserted by RE-15, which evaluates every seeded shipment twice and byte-compares serialized results against golden fixtures. Evaluators never mutate the entry, its documents, or the rule set; they are pure functions of their inputs.

### Why the canonical walkthrough works

The default `rule-origin-manufacturer` sets `comparison_fields: ["manufacturer.address.country"]` and nothing else. Attaching a certificate of origin in step 6 therefore **cannot change that rule's inputs**, and the HTS code is untouched by document evidence. So step 7 resolves exactly one exception and retains exactly two — the behavior the walkthrough must demonstrate — and it does so as a *consequence of configuration*, not a special case in code. `rule-origin-certificate` (which would read `documents.CERTIFICATE_OF_ORIGIN.stated_country`) and `rule-doc-solar-cert` are seeded **disabled**, so the canonical shipment has exactly three exceptions and an administrator has two rules available to demonstrate enabling.

## 6.3 AI Integration Boundary

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AiAssistService                                                             │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐     │
│   │  DETERMINISTIC CORE — always runs, never calls the network         │     │
│   │                                                                    │     │
│   │   recommended_action  ← domain/ai/recommendation.ts (9-row table)  │     │
│   │   confidence.level    ← domain/ai/recommendation.ts (8 factors)    │     │
│   │   confidence.basis    ← composed from the factors that moved it    │     │
│   │   presentation bundle ← exceptions + rule + policy_ref + evidence  │     │
│   │   grounding_fingerprint ← sha256 over the grounding set            │     │
│   └────────────────────────────┬───────────────────────────────────────┘     │
│                                │                                             │
│              ┌─────────────────┴──────────────────┐                          │
│              │  provider === 'none'?  (DEFAULT)   │                          │
│              ├───────────── YES ──────────────────┤                          │
│              │   NO NETWORK ACTIVITY AT ALL       │                          │
│              │   prose ← deterministic templates  │                          │
│              │   mode  ← FALLBACK_PROVIDER_DISABLED                          │
│              ├───────────── NO ───────────────────┤                          │
│              │   ONE HTTPS POST, no retries,      │                          │
│              │   temperature 0.2, 10 s abort      │                          │
│              │   prompt carries the grounding set │                          │
│              │   AND the already-decided action   │                          │
│              │   and confidence — asks ONLY for   │                          │
│              │   a rationale/narrative            │                          │
│              │        │                           │                          │
│              │        ├─ valid + grounded → prose, mode LLM                  │
│              │        └─ any failure ──────▶ deterministic templates         │
│              └────────────────────────────────────┘                          │
│                                │                                             │
│   ┌────────────────────────────▼───────────────────────────────────────┐     │
│   │  ALWAYS 200. ai_outputs row written with content + provenance.     │     │
│   │  provenance.action_source === 'DETERMINISTIC'  (permanently)       │     │
│   └────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The determinism contract

> **The recommended action and the confidence level are ALWAYS computed deterministically, in process, from the open exception set and case state. The AI provider authors prose only — the summary narrative and the recommendation rationale. It never selects the action, never sets the confidence, and never takes an action.**

Four consequences, each of which is an asserted property rather than an intention:

| Consequence | Enforcement | Test |
|---|---|---|
| The recommendation is **identical** with the provider enabled or disabled | The action/confidence code path never calls `AiProvider` | **AI-04** runs the same shipment with a stubbed provider on and off and asserts identical `recommended_action` and `confidence.level` |
| `provenance.action_source` is permanently `"DETERMINISTIC"` | Typed as the literal `'DETERMINISTIC'` in `03c`; no code path sets another value | AI-04 |
| The prose cannot contradict the advice | The LLM rationale is validated against the grounding set **and** checked for advocating a different action code or using approval language; failure → template | AI-06 |
| The walkthrough completes with zero egress | `provider === 'none'` short-circuits before any client construction | **AI-01**, **E2E-01** (which runs with `CARGODEMO_AI_PROVIDER=none`) |

**This is what turns "the demo works without the AI" from a hope into a structural property.** If the provider chose the action, disabling it would change the demo's behavior and the fallback would be a degradation. Because it does not, disabling the provider changes only the wording — and the wording is deterministic too.

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `CARGODEMO_AI_PROVIDER` | **`none`** | `openai` \| `anthropic` \| `none`. **`none` is the supported demo default** |
| `CARGODEMO_AI_MODEL` | provider default | Recorded verbatim in provenance |
| `CARGODEMO_AI_API_KEY` | unset | Never logged, never returned by any endpoint, never committed |
| `CARGODEMO_AI_TIMEOUT_MS` | `10000` | Hard timeout; the fallback serves after it |

### Request contract (only when a provider is enabled)

A single call, **no retries**, `temperature: 0.2`, max output tokens 700 (summary) / 500 (rationale), JSON-mode output where the provider supports it. The prompt contains only the **grounding set**: synthetic shipment attributes, rule definitions, and captured evidence. Because the entire dataset is synthetic, **no real or personal data can be transmitted even when the provider is enabled** (PRD §6 Privacy).

For the recommendation, the prompt additionally carries the **already-decided action and confidence** and asks for a justification traceable to the evidence. The model is not being asked what to do; it is being asked to explain a decision the system has already made deterministically.

### Failure behavior, exhaustively

| Condition | Behavior | `generation_mode` recorded |
|---|---|---|
| Provider disabled (`none`) | **No call attempted** | `FALLBACK_PROVIDER_DISABLED` |
| DNS / TLS / connection failure | Fallback | `FALLBACK_PROVIDER_ERROR` |
| HTTP 4xx/5xx, including rate limits | Fallback | `FALLBACK_PROVIDER_ERROR` |
| No response within `CARGODEMO_AI_TIMEOUT_MS` | Fallback | `FALLBACK_TIMEOUT` |
| Unparseable or schema-invalid output | Fallback | `FALLBACK_VALIDATION_FAILED` |
| Output fails the grounding or action-language check | Fallback | `FALLBACK_VALIDATION_FAILED` |

**In every case the endpoint returns `200` with complete content.** `AI_UNAVAILABLE` is a reserved error code that `/ai/summary` and `/ai/recommendation` never return (`Y2` §7). Provider unavailability is a recorded mode, not an error — because in the default configuration it is the *expected* mode.

### Deterministic fallback generators

`domain/ai/fallback/summary.ts` and `rationale.ts` render prose from templates keyed by `(exception_type, sub_reason)`. They are pure functions of the grounding set: identical grounding produces **byte-identical** text, compared against golden fixtures (AI-02). Template coverage is exhaustive — every `(exception_type, sub_reason)` pair defined in F4 has a template, asserted by AI-03, and a missing one is `FALLBACK_TEMPLATE_MISSING` (a genuine `500`, because it is a build defect rather than a runtime condition). The fallback path completes in **< 50 ms**.

Fallback output is **functionally complete, not a stub**: it names the commodity, the importer, the value, each exception, its triggering rule and policy reference, the evidence fields, and the missing information. A stakeholder watching the default configuration sees a complete product, clearly labeled — which is why the degradation banner is presented as a feature (the simulation boundary made obvious) rather than an apology.

### Inertness

`AiAssistService` writes to `ai_outputs` **and nothing else**. It MUST NOT write `cases`, `case_actions`, `recommendations`, or `approvals`, and MUST NOT enqueue any deferred execution. Test AI-08 asserts that requesting a recommendation leaves `cases.updated_at` and `cases.status` unchanged. At the storage layer, `audit_entries CHECK (actor_kind <> 'AI' OR user_decision IS NULL)` makes an AI-authored decision unwritable, and `ai_outputs CHECK` excludes approval codes from `recommended_action` — **the system structurally cannot recommend that a supervisor approve something.**

When a human later takes an action, the workflow service snapshots the current recommendation — action, confidence, basis, rationale, provenance, grounding fingerprint — into the audit entry, together with `concurrence: AGREED | DIVERGED | NO_RECOMMENDATION_PRESENT`. Approval decisions (F11) record `NOT_APPLICABLE`, because the AI never advises `APPROVE_CLEARANCE` and so an approval can neither agree nor disagree with it. **Divergence is not an error; it is the point.** In the canonical walkthrough the deterministic table advises `ESCALATE_TO_SUPERVISOR` (a `CRITICAL` origin finding is present) and the specialist instead requests the missing document — so step 10 shows a recorded, unscripted instance of a human overruling the machine.

### Startup probe

A 3-second reachability check sets `health.subsystems.ai.mode`. With `provider === 'none'` the mode is recorded as `FALLBACK_PROVIDER_DISABLED` **without any network call**. **A failed probe never blocks or fails startup** — startup must not require network access (P4).

## 6.4 I1 — Cargo-Entry Ingestion (ACE Simulation)

**Stands in for:** a live ACE (Automated Commercial Environment) feed.

**What exists instead:** a versioned JSON file at a known path and a local HTTP endpoint accepting the identical envelope (`03c` §3c.4). The API path is administrator-gated; the file/CLI path runs as a `SYSTEM` actor.

**Contract:** `schema_version: "1.0"`, `additionalProperties: false`, 1–500 entries per batch, idempotent on `shipment_id`.

**Boundary properties that must remain visible during the demo:**

- The ingestion source is labeled on every shipment (`ingestion.source`) as `seed`, `file:<name>`, or `api`.
- **No ACE credential, endpoint, or client library appears anywhere in the codebase or configuration.**
- Re-ingesting a `CLEARED` shipment is refused with `CASE_TERMINAL`, so an external feed cannot silently reopen a finalized decision (IN-03).

**Failure behavior:** a malformed envelope rejects the batch atomically; a malformed entry rejects only itself and is reported in the `IngestionReport` with a JSON pointer and reason.

**Forward path (out of scope, recorded):** a real ACE adapter would implement the same `IngestionPort` the file and API paths implement, leaving the domain unchanged. **No such adapter is built.**

## 6.5 I5 — Notification Delivery (Absent by Design)

**What a production system would have:** email or SMS delivery to importers, brokers, and internal recipients.

**What exists:** notification rows with recipient, subject, body, and timestamp, persisted and linked to the audit entry that produced them.

**Five independent enforcements that nothing is transmitted:**

1. **No SMTP, SMS, webhook, or push client is a dependency of the project.** There is no code that could send anything.
2. `notifications.transmitted` carries `CHECK (transmitted = 0)` — a transmission attempt could not even be *recorded*.
3. The TypeScript type is the literal `false`, not `boolean`, so a client cannot write code branching on a transmitted notification.
4. Every rendered body ends with the fixed sentence *"This notification was generated and recorded by CargoDemo. It was not transmitted to any external recipient."*
5. Every notification is displayed under the "Generated, not transmitted" label (F13, F20), and test AU-11 asserts the column's distinct value set after a full walkthrough.

## 6.6 I6 — Identity (Absent by Design)

**What a production system would have:** PIV/CAC smart-card authentication or SSO against an agency identity provider.

**What exists:** a role selector over five seeded users issuing an opaque local session token. No external call, no federation, no password, no token exchange. Full specification in `04-security` §4.2.

## 6.7 I3, I4, I7 — Local Resources

| # | Resource | Contract | Failure behavior |
|---|---|---|---|
| I3 | SQLite at `CARGODEMO_DB_PATH` | Schema of `02a`/`02b`, forward-only migrations with checksum verification, WAL, FK on per connection | Unwritable path, checksum mismatch, or failed schema self-check → **exit 1**. The application never serves against a database whose integrity it has not verified — in particular, never with the audit append-only triggers absent |
| I4 | Filesystem at `CARGODEMO_DOC_STORAGE_DIR` | `{shipment_id}/{request_id}-{sanitized_filename}`; 1 byte–5 MB; five allowed MIME types with extension and magic-byte consistency; PII screen on text content | Unwritable directory → exit 1. A write failure during upload rolls back the document row, the request status change, and the triggered revalidation, and removes any partially written file — **storage and database never diverge** |
| I7 | Browser via the embedded preview | Single origin: API at `/api/*`, SPA on all other paths with `index.html` fallback, one process bound to `0.0.0.0:3000`. **Same-origin only — no CORS configuration is required or provided**, which removes an entire class of demo-day failure. No third-party scripts, fonts, analytics, or CDN assets | An occupied port aborts startup rather than silently rebinding. Iframe-compatibility header constraints in `04-security` §4.7 |
