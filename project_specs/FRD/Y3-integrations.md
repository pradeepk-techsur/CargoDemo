---

# Y3: Integration Points & Simulation Boundaries

CargoDemo is deliberately near-hermetic. This chunk enumerates every point at which the system touches something outside its own process, states which of them are real and which are simulated, and defines the contract and failure behavior for each. An integration not listed here does not exist and must not be added without amending PRD §5.8.

## §1 Integration inventory

| # | Integration | Kind | Direction | Required for the demo | Failure behavior |
|---|---|---|---|---|---|
| I1 | Cargo-entry JSON file / local ingestion API | **Simulated** (stands in for ACE) | Inbound | Yes | Per-entry rejection; batch continues |
| I2 | AI provider (OpenAI/Anthropic-compatible HTTP) | **Real, optional** | Outbound | **No** | Deterministic fallback; walkthrough unaffected |
| I3 | SQLite database file | Real, local | Bidirectional | Yes | Startup abort |
| I4 | Local document storage (filesystem) | Real, local | Bidirectional | Yes | Startup abort; upload rolls back |
| I5 | Notification delivery (email/SMS) | **Simulated — generated, never transmitted** | — | Yes (as a recording) | N/A — no transport exists |
| I6 | Identity provider (PIV/CAC, SSO) | **Simulated — role selector** | — | Yes (as a selector) | N/A — no external call |
| I7 | Browser (embedded preview) | Real | Inbound | Yes | Deterministic port; stable URL |

Everything else that a production system of this shape would have — ACE connectivity, importer correspondence, message queues, schedulers, webhooks, external audit sinks, telemetry exporters — is explicitly absent (PRD §5.9).

## §2 I1 — Cargo-entry ingestion (ACE simulation)

**What it stands in for:** a live ACE (Automated Commercial Environment) feed of cargo entries.

**What exists instead:** a versioned JSON file at a known path and a local HTTP endpoint accepting the identical envelope (F1). Both are administrator-gated in the API case and `SYSTEM`-actor in the file/CLI case.

**Contract:** the cargo-entry envelope and object schema of F1 §Inputs, `schema_version: "1.0"`, `additionalProperties: false`, 1–500 entries per batch, idempotent on `shipment_id`.

**Boundary properties that must remain visible in the demo:**
- The ingestion source is labeled on every shipment (`ingestion.source` in the shipment projection) as `seed`, `file:<name>`, or `api`.
- No ACE credential, endpoint, or client library appears anywhere in the codebase or configuration.
- Re-ingesting a `CLEARED` shipment is refused (`CASE_TERMINAL`), so an external feed cannot silently reopen a finalized decision.

**Failure behavior:** malformed envelope rejects the batch atomically; a malformed entry rejects only itself and is reported in the `IngestionReport` with a JSON pointer and reason.

**Forward path (out of scope, recorded for TechArch):** a real ACE adapter would implement the same `IngestionPort` interface the file and API paths implement, so the domain would be unchanged. No such adapter is built.

## §3 I2 — AI provider

**What it is:** a single outbound HTTPS request per summary or recommendation generation, to an OpenAI- or Anthropic-compatible chat completions endpoint.

**This is the only outbound network call the application makes.** Anything else attempting egress is a defect.

**Configuration:**

| Variable | Default | Meaning |
|---|---|---|
| `CARGODEMO_AI_PROVIDER` | `none` | `openai` \| `anthropic` \| `none`. **`none` is the supported demo default.** |
| `CARGODEMO_AI_MODEL` | provider default | Model identifier, recorded verbatim in provenance |
| `CARGODEMO_AI_API_KEY` | unset | Never logged, never returned by any endpoint, never committed |
| `CARGODEMO_AI_TIMEOUT_MS` | `10000` | Hard timeout; the fallback serves after it |

**Request contract:** a single call, no retries, temperature `0.2`, max output tokens 700 (summary) / 500 (rationale), JSON-mode output where the provider supports it. The prompt contains only the grounding set (F7 §Process step 3) — synthetic shipment attributes, rule definitions, and evidence. Because the entire dataset is synthetic, no real or personal data can be transmitted even when the provider is enabled (PRD §6 Privacy).

**Response contract:** strict JSON matching the summary or rationale schema. Anything else is discarded and the fallback is used.

**Failure behavior, exhaustively:**

| Condition | Behavior | Mode recorded |
|---|---|---|
| Provider disabled | No call attempted | `FALLBACK_PROVIDER_DISABLED` |
| DNS/TLS/connection failure | Fallback | `FALLBACK_PROVIDER_ERROR` |
| HTTP 4xx/5xx, including rate limits | Fallback | `FALLBACK_PROVIDER_ERROR` |
| No response within the timeout | Fallback | `FALLBACK_TIMEOUT` |
| Unparseable or schema-invalid output | Fallback | `FALLBACK_VALIDATION_FAILED` |
| Output fails the grounding or action-language check | Fallback | `FALLBACK_VALIDATION_FAILED` |

In every case the endpoint returns `200` with complete content. **The recommended action and the confidence level are computed deterministically in-process and are identical with the provider enabled or disabled** (F8 §Action derivation, test AI-04); only the prose rationale and the summary narrative differ. This is what makes "the walkthrough completes with the AI provider disabled" a structural property rather than a hope.

**Startup probe:** a 3-second reachability check that sets `health.subsystems.ai.mode`. It never blocks or fails startup (F22 §Process step 6).

## §4 I3 — SQLite database

**What it is:** a single file-backed SQLite database at `CARGODEMO_DB_PATH`, opened in WAL mode with foreign keys enforced on every connection. No database server, no container, no network dependency.

**Contract:** the schema in `Y0a` and `Y0b`, applied by forward-only migrations with checksum verification.

**Failure behavior:** an unwritable path, a checksum mismatch, or a failed schema self-check aborts startup with a non-zero exit code (F0 §Error States). The application never serves requests against a database whose integrity it has not verified — in particular, it never serves with the audit append-only triggers absent.

## §5 I4 — Document storage

**What it is:** the local filesystem under `CARGODEMO_DOC_STORAGE_DIR`, holding synthetic fixtures and simulated uploads at `{shipment_id}/{request_id}-{sanitized_filename}`.

**Contract:** files are 1 byte – 5 MB, restricted to `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`, with extension and magic-byte consistency checks and a PII screen on text content (F10 §Validation).

**Failure behavior:** an unwritable directory aborts startup. A write failure during upload rolls back the document row, the request status change, and the triggered revalidation, and removes any partially written file — storage and database never diverge.

**Boundary property:** there is no path by which a document arrives from outside the operator's own browser. No inbox, no importer portal, no correspondence channel exists.

## §6 I5 — Notification delivery (absent by design)

**What a production system would have:** email or SMS delivery to importers, brokers, and internal recipients.

**What exists:** notification rows with recipient, subject, body, and timestamp, persisted and linked to the audit entry that produced them, with `transmitted` constrained to `0` at the schema level (`Y0b` §7).

**Enforcement that nothing is transmitted:**
1. No SMTP, SMS, webhook, or push client is a dependency of the project.
2. `notifications.transmitted` carries `CHECK (transmitted = 0)`; a transmission attempt could not even be recorded.
3. Every rendered body ends with the fixed sentence *"This notification was generated and recorded by CargoDemo. It was not transmitted to any external recipient."*
4. Every notification is displayed under the "Generated, not transmitted" label (F13, F20).
5. Test AU-11 asserts the column's distinct value set after a full walkthrough.

## §7 I6 — Identity (absent by design)

**What a production system would have:** PIV/CAC smart-card authentication or SSO against an agency identity provider.

**What exists:** a role selector over five seeded users issuing an opaque local session token (F14). No external call, no federation, no password, no token exchange.

**Boundary properties:**
- The simulated-login nature is labeled in the UI (F16 demo-mode chip).
- The session token is random, hashed at rest, and does not encode the role — role resolution always reads the `users` row, so a forged token cannot grant authority even in principle.
- Authorization is nonetheless enforced with production discipline: server-side on every route, with a startup self-check that no route lacks a declaration (F14 §1 step 9). The *authentication* is simulated; the *authorization* is real, because that is the property being demonstrated.

## §8 I7 — Browser and preview environment

**What it is:** the sandboxed preview serving one origin. The API is mounted at `/api/*` and the SPA is served from all other paths with `index.html` fallback, from a single process bound to `0.0.0.0` on a deterministic port.

**Contract:** same-origin requests only; no CORS configuration is required or provided, which removes an entire class of demo-day failure. No third-party scripts, fonts, analytics, or CDN assets are loaded — every asset is served from the app itself, so the UI renders identically with no internet connection.

**Failure behavior:** an occupied port aborts startup rather than silently rebinding (F22 §Process step 3).

## §9 Egress summary

| Destination | When | Contains | Suppressible |
|---|---|---|---|
| AI provider | Summary/recommendation generation, only when `CARGODEMO_AI_PROVIDER ≠ none` | Synthetic shipment attributes, rule definitions, evidence | Yes — set the provider to `none`, which is the default |

That is the complete egress inventory. With `CARGODEMO_AI_PROVIDER=none` the application makes **zero** outbound network requests and the entire ten-step walkthrough still completes — the configuration used by the F21 end-to-end test and the recommended configuration for a live CBP demonstration.
