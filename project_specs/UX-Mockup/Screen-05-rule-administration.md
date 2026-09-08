### Screen 5: Rule Administration (Administrator Surface)

**Feature:** F15 · **Routes:** `/admin/rules`, `/admin/rules/:ruleId` · **Role:** System Administrator only
**Purpose:** Prove that business rules are configuration owned by the customer, not code owned by a vendor — changeable, previewable, validated, and audited, with 0 code changes and 0 redeploys.
**User Stories:** US-8.5, US-8.6, US-12.6
**Personas:** PER-03 (primary), PER-04 (observer — she asks to see a rule changed in front of her)

**Scope discipline.** This surface exists **only to support the four primary screens** (PROJECT.md Constraints; PRD §5.8). It is deliberately plain: a table, a form, a preview, a history. It must not acquire dashboards, charts, or a rule-authoring DSL, and it must never be presented as a fifth primary screen.

#### Layout — rule list (`/admin/rules`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Rule Administration                                              👤 Priya Raghavan    │
│ Business rules are configuration. Changes take effect without a code change or a       │
│ redeploy, and every change is recorded under your name.                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS  Exception type ▾   Enabled ▾   Severity ▾                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Rule                    │ Type            │ Sev.   │ Enabled │ Policy ref  │ v │ Open │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Certificate of origin   │ Missing         │ HIGH   │ ✔ Yes   │ 19 CFR      │ 1 │  3   │
│ required above $50,000  │ document        │        │         │ 102.0       │   │      │
│  rule-doc-highvalue-coo │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Baseline entry          │ Missing         │ MEDIUM │ ✔ Yes   │ 19 CFR      │ 1 │  1   │
│ documents required      │ document        │        │         │ 141.81      │   │      │
│  rule-doc-baseline      │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Solar certificate       │ Missing         │ HIGH   │ ✕ No    │ 19 CFR      │ 1 │  0   │
│ required                │ document        │        │         │ 102.0       │   │      │
│  rule-doc-solar-cert    │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ HTS code completeness   │ Incomplete HTS  │ HIGH   │ ✔ Yes   │ 19 CFR      │ 3 │  4   │
│  rule-hts-completeness  │                 │        │         │ 152.11      │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ HTS known-code check    │ Incomplete HTS  │ MEDIUM │ ✕ No    │ HTSUS       │ 1 │  0   │
│  rule-hts-known-chapter │                 │        │         │ General     │   │      │
│                         │                 │        │         │ Rules       │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Declared origin must    │ Origin conflict │CRITICAL│ ✔ Yes   │ 19 CFR      │ 2 │  3   │
│ match manufacturer      │                 │        │         │ 134.1       │   │      │
│ address country         │                 │        │         │             │   │      │
│  rule-origin-           │                 │        │         │             │   │      │
│    manufacturer         │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Declared origin must    │ Origin conflict │ HIGH   │ ✕ No    │ 19 CFR      │ 1 │  0   │
│ match certificate       │                 │        │         │ 134.1       │   │      │
│ stated country          │                 │        │         │             │   │      │
│  rule-origin-certificate│                 │        │         │             │   │      │
│─────────────────────────┴─────────────────┴────────┴─────────┴─────────────┴───┴──────│
│                                                                  [ + Create rule ]    │
│ ⓘ Rules cannot be deleted. Disabling is the retirement path, so the rule that          │
│   produced a historical exception stays readable forever.                              │
│ ⓘ Exactly three exception types are supported. A fourth type is out of scope by        │
│   recorded decision (PRD §5.8).                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

The list reads as **configuration**, with a policy-reference column and a version column — the answer to *"if this is a code listing dressed up as a screen, I'll know in five seconds"* (JRN-03.1 stage 1).

#### Layout — rule editor with impact preview (`/admin/rules/rule-hts-completeness`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to rules      HTS code completeness      v3 · enabled · 4 open exceptions      │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ DEFINITION                                │ IMPACT PREVIEW                             │
│                                           │                                            │
│ Name        HTS code completeness         │  Not yet run.                              │
│ Exception   Incomplete HTS  🔒 immutable  │  Preview the effect of this change before   │
│  type       ⓘ A rule's exception type     │  applying it. Preview performs no writes.   │
│             cannot be changed — it would  │                                            │
│             orphan the exceptions it      │  ── after [ Preview impact ] ──            │
│             produced.                     │                                            │
│ Description HTS classification must be    │  Evaluated 12 shipments (1 cleared case     │
│  ┌──────────────────────────────────────┐ │  skipped — a rule change never disturbs a  │
│  │ complete to the configured digit     │ │  cleared disposition).                     │
│  │ count.                               │ │                                            │
│  └──────────────────────────────────────┘ │  Would add       0 exceptions               │
│ Policy ref  19 CFR 152.11                 │  Would remove    2 exceptions               │
│  ⓘ Required. F19 must always be able to   │  Severity change 0                          │
│    display the triggering authority.      │  Priority change 1 shipment                 │
│ Severity    ▾ HIGH                        │                                            │
│ Priority    ▾ HIGH when value > 50000     │  ┌──────────────┬──────────────┬─────────┐ │
│  mapping                                  │  │ SHP-2026-0007│ Incomplete   │ removed │ │
│                                           │  │              │ HTS          │         │ │
│ PARAMETERS  (type-aware form)             │  │ SHP-2026-0001│ Incomplete   │ removed │ │
│ expected_digit_count   [ 6            ]   │  │              │ HTS          │         │ │
│   was 10                                  │  │ SHP-2026-0007│ priority     │unchanged│ │
│ min_digit_count        [ 6            ]   │  │              │ (Critical)   │         │ │
│ check_known_codes      [ ] off            │  │ SHP-2026-0001│ priority     │ High →  │ │
│ known_codes            (disabled while    │  │              │ leaves queue │ Low     │ │
│                         check is off)     │  └──────────────┴──────────────┴─────────┘ │
│                                           │  Showing 3 of 3 changes.                   │
│ CONDITIONS   value_usd > 0                │                                            │
│                                           │  [ Back to editing ]                       │
│ RAW params_json  (read-only, for          │  [ Apply with revalidation ]                │
│  transparency)                            │  [ ] Apply without revalidating            │
│  { "expected_digit_count": 6,             │      (queue will not update until the next │
│    "min_digit_count": 6,                  │       evaluation)                          │
│    "check_known_codes": false }           │                                            │
│                                           │                                            │
│ CHANGE NOTE (required, 10–500 chars)      │                                            │
│  ┌──────────────────────────────────────┐ │                                            │
│  │ Policy update: subheading-level      │ │                                            │
│  │ classification is now sufficient for │ │                                            │
│  │ this commodity class.                │ │                                            │
│  └──────────────────────────────────────┘ │                                            │
│                              78 / 10 ✔    │                                            │
│                                           │                                            │
│ [ Cancel ]  [ Preview impact ]            │                                            │
│           ⓘ Apply is unavailable until a  │                                            │
│             preview has been run on this  │                                            │
│             draft.                        │                                            │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│ [ Disable rule ]                                         [ View rule history (4) ]     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Layout — validation failure (the 9am-on-demo-day test)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ✕ The rule was not saved. The previous rule set remains in effect.                    │
│   No changes were applied and no shipment was revalidated.                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ expected_digit_count   [ ten                                       ]  ← field-level    │
│   ✕ Must be a whole number. "ten" is not a number.                                     │
│                                                                                        │
│ min_digit_count        [ 12                                        ]                   │
│   ✕ min_digit_count cannot exceed expected_digit_count.                                │
│                                                                                        │
│ known_codes            [ (empty)                                   ]                   │
│   ✕ known_codes must be non-empty when check_known_codes is enabled.                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Messages name **the parameter and the constraint**, never a generic failure. *"What happens if I get this wrong at 9am on a demo day?"* — she finds out in the form, not through an empty queue an hour later (JRN-03.1 stage 2).

#### Layout — apply result

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ✔ Rule saved at version 4 by Priya Raghavan (System Administrator), 8 Sep 09:12 UTC   │
│                                                                                        │
│   PARAMETER DIFF                                                                       │
│     params_json.expected_digit_count   10 → 6                                          │
│     params_json.min_digit_count        10 → 6                                          │
│   REVALIDATION                                                                         │
│     2 shipments revalidated · 2 exceptions resolved · 1 priority changed              │
│     1 cleared case skipped                                                             │
│   AUDIT                                                                                │
│     RULE_UPDATED entry written with the full before/after definition, the diff,        │
│     your identity, the timestamp, and your change note.                                │
│                                                                                        │
│   [ View rule history ]   [ Go to Exception Queue to see the effect ]                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

The forward affordance goes **straight to the queue**, because the demonstrable claim is that the effect is visible on the working surface immediately, with no restart (PRD §7 Rule configurability).

#### Layout — Environment & Reset (`/admin/environment`, F22)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Environment & Reset                                              👤 Priya Raghavan    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ HEALTH CHECK                                                    [ Re-run check ]      │
│   Database            ✔ ok        14 shipments, 12 rules, 96 audit entries            │
│   Seed data           ✔ ok        deterministic seed v1, canonical scenario present   │
│   AI assistance       ⚠ fallback  provider unreachable; deterministic fallback active │
│                                    ⓘ The walkthrough completes in this mode. All AI    │
│                                      output is labelled OFFLINE FALLBACK.             │
│   Canonical scenario  ✔ ok        SHP-2026-0007 · 3 exceptions at evaluation v1       │
│   Pre-cleared case    ✔ ok        SHP-2026-0009 · 9 audit entries · approving         │
│                                    official recorded                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ RESET TO PRISTINE SEEDED STATE                                                         │
│   Restores the database to the deterministic seed. All session uploads, decisions,     │
│   approvals, audit entries and notifications created during this run are discarded.    │
│   ⚠ This is a demo-environment operation. It is the one place in the application       │
│     where recorded history is removed, and it removes ALL of it — it cannot remove     │
│     or alter a single entry. Append-only holds within a run.                            │
│                                                                                        │
│   Type RESET to confirm  [                    ]        [ Reset environment ]          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

The reset copy is careful for a reason: an evaluator who sees a "reset" button next to an append-only claim will ask about it. The wording states that reset is **wholesale and environmental**, never selective — it cannot be used to remove or edit one inconvenient entry (US-6.3, US-12.4).

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Rule list as a configuration table with policy reference and version | List screen | Rules must read as data on first glance |
| Primary | Type-aware parameter form | Editor, left | No free-form JSON required; a typo cannot silently disable a check |
| Primary | Impact preview with per-shipment changes | Editor, right | *"Preview the effect before trusting it"* — and zero writes |
| Primary | Field-level validation messages | Inline, per parameter | Names the parameter and the constraint |
| Primary | Change note (required) | Editor, bottom-left | Rule changes are governance events and carry justification discipline |
| Secondary | Enable/disable with its own confirmation copy | Editor footer | The most consequential single-click change |
| Secondary | Rule history with before/after diffs | Link from the editor | Configuration drift is traceable |
| Secondary | Health check with AI-fallback status | Environment screen | Pre-demo signal; she must not find out mid-demonstration |
| Tertiary | Raw `params_json`, read-only | Editor, beneath the form | Transparency without an editing path |
| Tertiary | Standing notes: three types only, no deletion | List footer | Scope discipline is a recorded decision, visible on the surface |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading | Table skeleton with real headers | `aria-busy` |
| Ready | As wireframed | Result count |
| Empty (unreachable with seed data) | Panel + **Create rule** | *"No rules are configured. Validation would flag nothing."* |
| Draft edited, not previewed | **Apply** disabled with a visible reason | *"Run a preview on this draft before applying."* |
| Preview running | Preview panel inline progress | *"Evaluating 14 shipments…"* |
| Preview: no changes | Preview panel states it plainly | *"This change would not alter any current exception or priority."* |
| Preview truncated | Table footer | *"Showing 100 of 214 changes."* |
| Preview too large | Error in the preview panel | *"Impact preview is limited to 500 shipments."* |
| Validation failed | Banner + field-level errors; **prior rule set remains in effect**; no partial state | see wireframe |
| Duplicate name | Field-level error on Name | *"A rule named 'HTS code completeness' already exists."* |
| Type change attempted | Field is `readonly` with a lock glyph; server would return `RULE_TYPE_IMMUTABLE` | *"A rule's exception type cannot be changed."* |
| Change note missing | Field-level error; submit disabled | *"A change note is required for rule changes."* |
| Saving | Buttons show inline progress; form locked | *"Saving…"* |
| Saved, revalidation ok | Apply-result panel | see wireframe |
| Saved, revalidation partly failed (`207`) | Apply-result panel with a warning section naming the failed shipments and a per-shipment revalidate link on F18 | *"Rule saved at version 4. 1 shipment failed revalidation; the configuration change is durable."* |
| Enable/disable redundant | Inline error | *"Rule rule-hts-completeness is already enabled."* |
| Non-administrator reaches the route | Inline 403 view; nav entry absent | *"Rule Administration requires the System Administrator role. You are acting as Cargo Specialist."* |
| Health check degraded | Amber row naming the subsystem; shell banner active | see Environment wireframe |
| Reset confirmation not typed | **Reset environment** disabled | *"Type RESET to confirm."* |
| Reset running | Full-screen in-frame progress; navigation locked | *"Reseeding… do not navigate away."* |
| Reset complete | Result panel + link to the queue | *"Pristine seeded state restored. 14 shipments, canonical scenario present."* |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| Rule row | Selectable | → `/admin/rules/:ruleId` |
| Exception type / Enabled / Severity filters | Multi-select | Server-side re-query |
| **Create rule** | Primary button | Empty editor; `exception_type` selectable **once**, from exactly three options |
| Parameter fields | Type-aware inputs | Rendered from the type's `params_schema`; dependent fields disable when their gate is off |
| **Preview impact** | Primary button | `POST /api/rules/{id}/preview-impact`; zero writes |
| **Apply with revalidation** | Primary button | Enabled only after a successful preview on the current draft |
| **Apply without revalidating** | Checkbox modifier | Sets `revalidate_affected = false`, with the consequence stated inline |
| **Disable / Enable rule** | Secondary button → confirmation | Own audit event type and own copy: *"Disabling stops this rule firing on future evaluations. Existing exceptions keep their evidence and their rule version."* |
| **View rule history** | Link → in-frame drawer | Append-only `RULE_CREATED` / `RULE_UPDATED` / `RULE_ENABLED` / `RULE_DISABLED` entries with before/after diffs, administrator identity, timestamp, change note |
| **Re-run check** | Secondary button | Re-issues `GET /api/health` |
| **Reset environment** | Destructive button, typed confirmation | `RESET` must be typed; in-frame progress; no `window.confirm` |
| **Go to Exception Queue** | Forward link on the apply result | → `/queue` |

**No delete control exists anywhere on this surface.** Not in the list, not in the editor, not in an overflow menu (FRD F15 §Validation).

---
