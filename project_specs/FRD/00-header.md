# Functional Requirements Document (FRD)
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Author** | Pivota Spec Framework (FRD Generator) |
| **Upstream Documents** | `.planning/PROJECT.md`, `project_specs/PRD-CargoDemo.md` |
| **Downstream Documents** | TechArch-CargoDemo, UserStories-CargoDemo |
| **Feature Coverage** | F0–F22 (all 23 PRD features) |

---

## 0.1 Scope

This document specifies the functional behavior of every CargoDemo feature named in PRD §5 (F0–F22): the inputs each accepts, the outputs it produces, the validation rules it enforces, the state transitions it may cause, and the errors it returns. It is written to be implementable without further interpretation. Where the PRD states an intent ("validate HTS codes"), this FRD states the executable rule (normalization, digit-count comparison, failure sub-reason, evidence payload). Where the PRD states a governance claim ("no clearance without a named approving official"), this FRD states the server-side enforcement point that makes the claim unfalsifiable.

Non-functional targets (latency, accessibility, determinism) are inherited from PRD §6 and are restated here only where they change functional behavior — most notably the AI provider timeout, which triggers the deterministic fallback path (F7, F8).

## 0.2 Document Layout & Conventions

This FRD is authored as chunk files under `project_specs/FRD/` and assembled into the canonical `project_specs/FRD-CargoDemo.md`. Both forms carry identical content.

| Convention | Meaning |
|---|---|
| `F{n}` | Feature identifier, matching PRD §9 exactly. `F09a`/`F09b` are two chunks of the single feature F9. |
| `Y0`–`Y3` | Cross-feature chunks: consolidated schema, API, error catalog, integrations. |
| `§Process step N` | Reference to a numbered step inside a feature's Process section. |
| `field.path` | Dot-notation reference to a field on the cargo entry or a related entity, as used verbatim in evidence records. |
| `MUST` / `MUST NOT` | Enforced server-side; a violation is a defect and is covered by an F21 test. |
| `SHOULD` | Expected behavior; deviation must be recorded in TechArch-CargoDemo. |
| **AI-authored** | Content produced by F7/F8. Always stored and displayed with provenance metadata and never treated as a decision. |

### Chunk index

| Chunk | Contents |
|---|---|
| `00-header.md` | This section: scope, conventions, shared terminology, canonical vocabularies |
| `F00-data-model-persistence.md` | F0 — Cargo entry data model & persistence |
| `F01-cargo-entry-ingestion.md` | F1 — Ingestion from JSON file / local API |
| `F02-synthetic-seed-dataset.md` | F2 — Seeded synthetic dataset |
| `F03-backend-http-api.md` | F3 — Backend HTTP API contract |
| `F04-rule-engine.md` | F4 — Configurable rule engine, three exception types |
| `F05-exception-detection-evidence.md` | F5 — Exception creation, evidence capture, flagging |
| `F06-shipment-revalidation.md` | F6 — Revalidation semantics |
| `F07-ai-summary.md` | F7 — AI plain-language summary + fallback |
| `F08-ai-recommendation.md` | F8 — AI recommendation, confidence + fallback |
| `F09a-case-workflow-state-machine.md` | F9 (part 1) — Statuses and the full transition table |
| `F09b-case-workflow-actions.md` | F9 (part 2) — The five user actions in detail |
| `F10-document-request-upload.md` | F10 — Document request & simulated upload |
| `F11-approval-chain.md` | F11 — Specialist → Supervisor approval chain |
| `F12-audit-record.md` | F12 — Eight-field, append-only audit record |
| `F13-notifications.md` | F13 — Notification generation (recorded, not transmitted) |
| `F14-rbac.md` | F14 — Role simulation and full RBAC matrix |
| `F15-rule-administration.md` | F15 — Rule administration surface |
| `F16-app-shell.md` | F16 — Shell, navigation, role switcher |
| `F17-queue-screen.md` | F17 — Cargo Exception Queue screen |
| `F18-review-screen.md` | F18 — Shipment Review screen |
| `F19-resolution-screen.md` | F19 — Recommended Resolution screen |
| `F20-audit-screen.md` | F20 — Decision & Audit Record screen |
| `F21-test-suite.md` | F21 — Automated test suite |
| `F22-demo-environment.md` | F22 — Demo environment, reset, health check |
| `Y0a-schema-core.md` | Consolidated DDL: entries, documents, rules, exceptions, evidence |
| `Y0b-schema-workflow-audit.md` | Consolidated DDL: cases, actions, recommendations, approvals, audit, notifications, users |
| `Y1a-api-read.md` | Read endpoints |
| `Y1b-api-actions.md` | Mutating/workflow endpoints |
| `Y1c-api-admin.md` | Admin, AI, and operational endpoints |
| `Y2-errors.md` | Cross-feature error catalog |
| `Y3-integrations.md` | External integration points and simulation boundaries |

## 0.3 Shared Terminology

These terms are used with identical meaning in every chunk. Feature-specific terms are defined inside their own chunk.

- **Cargo entry / shipment**: The unit of work. One row in `cargo_entries`, uniquely keyed by `shipment_id` (business key, e.g. `SHP-2026-0007`). "Shipment" and "cargo entry" are interchangeable in this document.
- **Case**: The workflow wrapper around a shipment — exactly one case per shipment, created on first ingestion. The case holds `status`, `priority`, and the pointer to the current evaluation. A shipment with no exceptions still has a case; it is simply absent from the exception queue.
- **Rule definition**: A persisted configuration row (`rules`) describing one check. Rule *logic* is selected by `exception_type`; rule *behavior* is entirely driven by `params_json`. No rule thresholds, document lists, digit counts, or country comparisons exist in code.
- **Evaluation (evaluation version)**: One complete execution of the enabled rule set against one shipment, recorded in `evaluations` with a monotonically increasing `version` per shipment. Every exception, every piece of evidence, and every AI output is bound to an evaluation version, so pre- and post-revalidation states are both permanently inspectable.
- **Exception**: One firing rule against one shipment within one evaluation. Carries `exception_type`, `severity`, `status`, captured `evidence`, and `missing_information`.
- **Evidence**: A structured, field-level record of *why* a rule fired — `field_path`, `raw_value`, `normalized_value`, `comparison_field_path`, `comparison_raw_value`, `comparison_normalized_value`, `assertion`. Evidence is never prose; the plain-language rendering is the AI summary's job (F7) and is stored separately.
- **Missing information**: The subset of evidence describing what is *absent* (a required document type not received, an HTS code with too few digits). Drives both the AI recommendation (F8) and the resolution screen's "missing information" panel (F19).
- **Action**: One of exactly five human-initiated workflow operations (F9). An action always carries a mandatory justification, always causes a validated state transition, always writes exactly one audit entry, and always generates exactly one notification.
- **Recommendation (clearance recommendation)**: A specialist's or supervisor's proposal to clear a shipment, created by the `clear_exception` action. Advisory until approved. Not to be confused with the **AI recommendation** (F8), which is machine-authored and inert.
- **Approval**: A supervisor's disposition of a pending recommendation — `approve`, `reject`, or `request_info`. The approving supervisor is the **approving official** and is stamped by name on the audit record.
- **Approving official**: The named human whose approval makes a clearance real. Recorded as `approving_official_user_id` + denormalized `approving_official_name` + `approving_official_role` so the audit record remains readable even if user records change.
- **Audit entry**: One immutable row in `audit_entries`. Append-only, hash-chained, carrying the eight required fields defined in F12.
- **Notification**: A generated, persisted, never-transmitted message linked to the audit entry that produced it (F13).
- **Acting user**: The named user established by the simulated login / role switcher (F14). Every mutating request resolves an acting user server-side; requests without one are rejected.
- **Fallback mode**: The state in which the AI provider is disabled, unreachable, or exceeded its timeout, and F7/F8 outputs are produced by the deterministic offline generators. Fallback outputs are functionally complete, clearly labeled, and sufficient for the entire 10-step walkthrough.

## 0.4 Canonical Vocabularies

Every chunk in this FRD uses these exact identifier strings. Implementations MUST use them verbatim as persisted values and as API enum values, because the audit record, the seed data, and the test suite all key off them.

### 0.4.1 Roles

| Role code | Display name | Adjudicates | Approves clearance | Edits rules |
|---|---|---|---|---|
| `CARGO_SPECIALIST` | Cargo Specialist | Yes | No | No |
| `SUPERVISOR` | Supervisor | Yes | Yes | No |
| `SYSTEM_ADMINISTRATOR` | System Administrator | No | No | Yes |

Abbreviated in tables as **CS**, **SUP**, **ADM**. Full endpoint-by-endpoint matrix: F14.

### 0.4.2 Case statuses (7)

| Status code | Display | Meaning | Terminal |
|---|---|---|---|
| `NEW` | New | Flagged by ingestion/evaluation, not yet touched by a human | No |
| `IN_REVIEW` | In Review | A human has taken it up, or it has returned from information-gathering, hold, or rejection | No |
| `AWAITING_INFORMATION` | Awaiting Information | An open document request exists; the case is blocked on evidence | No |
| `ON_HOLD` | On Hold | Deliberately parked; no work expected until released | No |
| `ESCALATED` | Escalated | Raised to supervisor authority; specialists may no longer act on it | No |
| `PENDING_APPROVAL` | Pending Approval | A clearance recommendation exists and awaits a distinct supervisor | No |
| `CLEARED` | Cleared | Finalized by an approving official. Immutable. | **Yes** |

PRD F0 §Capabilities lists these statuses with the informal labels "Under Review" and "Info Requested". `IN_REVIEW` and `AWAITING_INFORMATION` are the canonical codes; the informal labels are accepted as display aliases only and MUST NOT appear as persisted values.

### 0.4.3 The five user actions

| Action code | Display | Primary effect |
|---|---|---|
| `REQUEST_INFORMATION` | Request additional information | Opens a document request → `AWAITING_INFORMATION` |
| `SEND_FOR_SPECIALIST_REVIEW` | Send for specialist review | Assigns/returns to active review → `IN_REVIEW` |
| `CLEAR_EXCEPTION` | Clear exception | Creates a clearance recommendation → `PENDING_APPROVAL` (never → `CLEARED`) |
| `PLACE_ON_HOLD` | Place on hold | Parks the case → `ON_HOLD` |
| `ESCALATE_TO_SUPERVISOR` | Escalate to supervisor | Transfers authority → `ESCALATED` |

Supervisor approval operations (`APPROVE_CLEARANCE`, `REJECT_RECOMMENDATION`) are **not** among the five actions; they belong to the approval chain (F11) and are available only from `PENDING_APPROVAL`.

### 0.4.4 Exception types (exactly three)

| Type code | Display | Detection summary |
|---|---|---|
| `MISSING_REQUIRED_DOCUMENT` | Missing required document | A parameterized required document type has no received document |
| `INVALID_HTS_CODE` | Invalid/incomplete HTS code | HTS fails format normalization, digit-count, or known-code checks |
| `CONFLICTING_COUNTRY_OF_ORIGIN` | Conflicting country of origin | Declared `country_of_origin` disagrees with a configured origin-bearing field |

A fourth exception type MUST NOT be added; `exception_type` is a closed enum enforced at the database and API layers (PRD §5.8).

### 0.4.5 Exception statuses

| Status code | Set by | Meaning |
|---|---|---|
| `OPEN` | Rule engine | Currently firing |
| `RESOLVED_BY_REVALIDATION` | F6 | No longer fires after evidence changed. Retained, never deleted. |
| `CLEARED_BY_DECISION` | F11 approval | Closed by an approved human clearance despite still firing |

### 0.4.6 Severity and priority

Rule severity (`rules.severity`): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
Case priority (`cases.priority`): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` — derived, never hand-set. Derivation is specified once, in F5 §Process step 6.

### 0.4.7 Actor kinds

Every audit entry and AI output records an `actor_kind`: `HUMAN`, `SYSTEM` (ingestion, seeding, automatic revalidation), or `AI` (F7/F8 generation). `actor_kind = 'AI'` MUST NOT appear on any entry that also carries a `user_decision`; this is the machine-readable form of the "AI never decides" guarantee and is asserted by an F21 test.

## 0.5 Canonical Demo Scenario (referenced throughout)

The solar-panel shipment from PRD §3.2 is used as the worked example in F4, F5, F6, F7, F8, F10, F11, and F12. Its canonical shape:

- `shipment_id = "SHP-2026-0007"`, importer `Helios Grid Supply` (synthetic), carrier `Pacific Blue Lines` (synthetic)
- `product_description = "Photovoltaic solar panels, monocrystalline, 400W"`
- `hts_code = "8541.40"` → 6 significant digits against an expected 10 → `INVALID_HTS_CODE` (sub-reason `INCOMPLETE_DIGITS`)
- `country_of_origin = "Malaysia"` (`MY`) vs `manufacturer.address.country = "China"` (`CN`) → `CONFLICTING_COUNTRY_OF_ORIGIN`
- `shipment_value_usd = 85000.00`, above the $50,000 documentation threshold
- `CERTIFICATE_OF_ORIGIN` not received → `MISSING_REQUIRED_DOCUMENT`
- Resulting case: three `OPEN` exceptions, `priority = CRITICAL`, `status = NEW`

Walkthrough step 7 depends on a precise property of this scenario: uploading the certificate of origin resolves **exactly one** exception. The default origin rule compares only `manufacturer.address.country`, so the uploaded certificate cannot incidentally resolve the origin conflict, and the HTS code is untouched by document evidence. See F6 §Process step 7 and F4 §5.
