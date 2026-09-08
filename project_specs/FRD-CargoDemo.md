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
---

## F0: Cargo Entry Data Model & Persistence

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** 2 (and structurally, all)

**Description:** F0 defines the canonical domain model that every other feature reads and writes: cargo entries, documents, rule definitions, evaluations, exceptions, evidence, cases, actions, document requests, recommendations, approvals, notifications, users, and audit entries. It also defines the persistence guarantees that make the governance claims enforceable rather than aspirational — closed enums at the schema level, foreign-key integrity, append-only audit storage, and evaluation versioning so history is never overwritten. Full DDL lives in `Y0a-schema-core.md` and `Y0b-schema-workflow-audit.md`; this chunk specifies the entity semantics, invariants, and migration behavior.

**Terminology:**
- **Business key vs surrogate key:** `shipment_id` is the human-facing business key (`SHP-2026-0007`); `cargo_entries.id` is the internal surrogate. Ingestion idempotency (F1) keys on the business key; all foreign keys use the surrogate.
- **Evaluation versioning:** Exceptions are not mutated in place across revalidations. Each evaluation creates a new `evaluations` row and a fresh set of `exceptions` rows bound to it, while the prior set is retained with its terminal status.
- **Soft-close, never delete:** Exceptions and document requests transition to closed statuses; no application code path issues `DELETE` against `exceptions`, `evidence`, `audit_entries`, or `notifications`.
- **Denormalized attribution:** Audit and approval rows store `*_user_name` and `*_user_role` alongside the user FK so a historical record stays readable and defensible independent of the current `users` table.

**Sub-features:**
- Cargo entry entity with the nine PRD-mandated attributes plus ingestion provenance
- Document entity with type, required/received state, provenance, and request linkage
- Rule definition entity with `params_json` as the sole behavioral surface
- Evaluation + exception + evidence entities with version binding
- Case entity holding status and derived priority
- Workflow entities: actions, document requests, recommendations, approvals
- Governance entities: append-only audit entries and notifications
- User entity backing the simulated login and role stamping
- Deterministic migrations and a clean-start guarantee

**Process:**
1. On application start, the persistence layer opens the SQLite database file at the configured path (`CARGODEMO_DB_PATH`, default `./data/cargodemo.db`), creating the file and parent directory if absent.
2. The migration runner reads the ordered migration list, compares it against the `schema_migrations` table, and applies any unapplied migration inside a single transaction per migration. Migrations are forward-only and idempotent by version number.
3. After migration, the runner enables `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` on every connection, and verifies that the append-only triggers on `audit_entries` and `notifications` exist (recreating them if a migration dropped them).
4. The runner executes a schema self-check: every enum-constrained column has its `CHECK` constraint present, and `exception_type` accepts exactly the three canonical codes. A failed self-check aborts startup with a non-zero exit code rather than serving requests against a degraded schema.
5. If the database contains zero `cargo_entries` rows, the runner invokes the seed routine (F2). If it contains rows, it leaves them untouched — start-up is never destructive.
6. The runner records a `SYSTEM`-actor audit entry of type `SCHEMA_MIGRATED` when one or more migrations were applied, capturing the from/to schema version.
7. Repositories expose entity-typed read/write operations. All writes that span more than one table (an action plus its audit entry plus its notification) execute inside one transaction so a partially recorded decision is impossible.

**Inputs:**
- `CARGODEMO_DB_PATH` (string, optional): filesystem path to the SQLite file. Default `./data/cargodemo.db`.
- `CARGODEMO_SEED_ON_EMPTY` (boolean, optional): default `true`. When `false`, an empty database is left empty.
- Migration files (ordered SQL or TypeScript modules) discovered at build time, each with an integer `version` and a `name`.
- Entity write payloads from F1, F4, F5, F6, F9–F13, F15.

**Outputs:**
- A migrated, integrity-checked SQLite database ready to serve requests.
- `schema_migrations` rows recording applied version, name, checksum, and `applied_at`.
- Startup log line reporting schema version, entry count, and whether seeding ran.
- `GET /api/health` schema section (F22) reporting `schema_version`, `foreign_keys_enabled`, `append_only_triggers_present`, `entry_count`.

**Validation:**
- `cargo_entries.shipment_id` MUST be unique, non-empty, and match `^[A-Z]{3}-\d{4}-\d{4}$`.
- `cargo_entries.shipment_value_usd` MUST be a non-negative number with at most 2 decimal places; stored as an integer count of cents to avoid float drift, exposed as a decimal string in the API.
- `cargo_entries.country_of_origin` MUST be non-empty as declared text; the normalized ISO alpha-2 form is stored separately in `country_of_origin_iso2` and MAY be null when unmappable (which itself is evidence — see F4 §5).
- `manufacturer_address_country` follows the same declared/normalized pair (`manufacturer_address_country_iso2`).
- `exceptions.exception_type` MUST be one of the three canonical codes; enforced by `CHECK` constraint, by the API request schema, and by the rule loader.
- `cases.status` MUST be one of the seven canonical statuses; `cases.priority` MUST be one of four canonical priorities.
- Exactly one `cases` row per `cargo_entries` row; enforced by a unique index on `cases.cargo_entry_id`.
- Exactly one `OPEN`-status `exceptions` row per `(evaluation_id, rule_id)` pair; enforced by a unique index.
- `evaluations.version` MUST be unique per `cargo_entry_id` and MUST increase by exactly 1 per evaluation.
- `audit_entries` MUST reject `UPDATE` and `DELETE` at the database level via triggers; `audit_entries.sequence_no` MUST be unique per case and gap-free.
- `documents.provenance` MUST be one of `SEEDED`, `SIMULATED_UPLOAD`, `INGESTED`.
- Every mutating write MUST carry a resolvable `actor_user_id` (or `actor_kind = 'SYSTEM'` with a null user and a non-null `system_actor_label`).
- Foreign keys MUST be enforced on every connection; a write that would orphan evidence, an exception, or an audit entry MUST fail rather than degrade.

**State transitions caused:** None directly. F0 supplies the storage and constraints that make F9's transitions verifiable; it does not itself move a case between statuses (except the `SYSTEM` `SCHEMA_MIGRATED` audit entry, which is case-independent).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Database file unwritable / directory not creatable | n/a (startup abort) | `DB_UNAVAILABLE` | "Cannot open database at {path}" |
| Migration checksum mismatch against applied version | n/a (startup abort) | `MIGRATION_CHECKSUM_MISMATCH` | "Migration {version} has changed after being applied" |
| Schema self-check failure (missing CHECK or trigger) | n/a (startup abort) | `SCHEMA_INTEGRITY_FAILED` | "Schema integrity check failed: {detail}" |
| Duplicate `shipment_id` on insert | 409 | `SHIPMENT_ID_CONFLICT` | "Shipment {shipment_id} already exists" |
| Unknown enum value written | 422 | `INVALID_ENUM_VALUE` | "{field} must be one of: {allowed}" |
| Attempt to UPDATE or DELETE an audit entry | 405 | `AUDIT_IMMUTABLE` | "Audit records are append-only and cannot be modified" |
| Foreign-key violation on write | 409 | `REFERENTIAL_INTEGRITY_VIOLATION` | "Referenced {entity} does not exist" |
| Write missing actor attribution | 500 | `ACTOR_ATTRIBUTION_MISSING` | "Internal error: mutating write lacked an acting user" |

**API Surface (this feature):** F0 exposes no endpoints of its own. Schema state is reported through `GET /api/health` (see `Y1c-api-admin.md`), and every entity in this chunk is projected by the endpoints in `Y1a`/`Y1b`.

**Schema Surface (this feature):** all tables — `users`, `cargo_entries`, `documents`, `document_requests`, `rules`, `evaluations`, `exceptions`, `evidence`, `cases`, `case_actions`, `recommendations`, `approvals`, `audit_entries`, `notifications`, `ai_outputs`, `schema_migrations`. Full DDL in `Y0a-schema-core.md` and `Y0b-schema-workflow-audit.md`.
---

## F1: Cargo Entry Ingestion

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** prerequisite to 1

**Description:** F1 loads simulated cargo entries into the system from a versioned cargo-entry JSON file or a local ingestion API endpoint using the same schema. It validates each entry independently, reports rejected entries without aborting the batch, is idempotent on `shipment_id`, and automatically triggers rule evaluation (F4) on every entry it accepts. It is explicitly not an ACE integration; the simulation boundary is documented in `Y3-integrations.md`.

**Terminology:**
- **Batch:** One ingestion invocation, whether file-driven or API-driven. Produces one `IngestionReport`.
- **Per-entry isolation:** A malformed entry fails alone. The batch continues, and the report distinguishes `created`, `updated`, and `rejected` entries with reasons.
- **Idempotent upsert:** Re-ingesting an entry with an existing `shipment_id` updates the mutable attributes of that entry rather than creating a duplicate, then re-evaluates it (producing a new evaluation version, not a duplicated case).
- **Cargo-entry schema version:** `schema_version` on the envelope, currently `"1.0"`. An unsupported version rejects the whole batch, because field semantics cannot be assumed.

**Sub-features:**
- File ingestion from a known path
- API ingestion of a single entry or an array of entries
- Per-entry schema validation with structured rejection reporting
- Idempotent upsert keyed on `shipment_id`
- Automatic evaluation trigger and case creation/refresh
- Ingestion audit entries

**Process:**
1. The caller invokes ingestion either by starting the app with `CARGODEMO_INGEST_FILE` set, by running the ingestion CLI (`npm run ingest -- <path>`), or by POSTing to `/api/ingest/cargo-entries`.
2. The envelope is parsed. If JSON parsing fails or `schema_version` is absent/unsupported, the batch is rejected in full with `INGEST_SCHEMA_VERSION_UNSUPPORTED` or `INGEST_MALFORMED_JSON`; nothing is written.
3. Each `entries[]` element is validated against the cargo-entry schema (see §Inputs). Validation failures are collected per entry with `shipment_id` (if readable), JSON pointer path, and reason. Invalid entries are skipped.
4. For each valid entry, the ingester normalizes derived fields: `country_of_origin_iso2` and `manufacturer_address_country_iso2` (via the country alias table in F4 §5), `hts_code_normalized` (digits only, per F4 §4), and `shipment_value_cents`.
5. The ingester looks up `shipment_id`. If absent, it inserts a `cargo_entries` row, inserts its `documents` rows, and creates a `cases` row with `status = NEW`. If present, it updates the mutable entry attributes and reconciles documents: declared documents not previously present are inserted with `provenance = 'INGESTED'`; documents already received via `SIMULATED_UPLOAD` are preserved and never overwritten.
6. The ingester writes a `SYSTEM`-actor audit entry per entry: `ENTRY_INGESTED` (new) or `ENTRY_REINGESTED` (updated), capturing the field-level diff for updates.
7. The ingester invokes the rule engine (F4) for the entry, which creates a new evaluation version and its exception set (F5), and recomputes case priority.
8. Case status after ingestion: a newly created case is `NEW`. A re-ingested case retains its current status unless it is `CLEARED`, in which case re-ingestion is refused with `CASE_TERMINAL` — a cleared shipment cannot be silently reopened by a data load.
9. The ingester returns an `IngestionReport` and logs a one-line summary (`ingested=N created=N updated=N rejected=N`).

**Inputs:**

Envelope:
- `schema_version` (string, required): MUST equal `"1.0"`.
- `source` (string, optional): free-text provenance label, e.g. `"seed-file"`, `"demo-api"`. Default `"api"` for API ingestion, the filename for file ingestion.
- `entries` (array, required): 1–500 cargo-entry objects.

Cargo-entry object:
- `shipment_id` (string, required): `^[A-Z]{3}-\d{4}-\d{4}$`.
- `importer_name` (string, required): 1–200 chars.
- `carrier_name` (string, required): 1–200 chars.
- `product_description` (string, required): 1–500 chars.
- `hts_code` (string, required, may be incomplete): 1–20 chars as declared. An empty string is rejected at ingestion; a *missing* HTS code is represented as `null`, which is valid input and produces an `INVALID_HTS_CODE` exception with sub-reason `MISSING`.
- `country_of_origin` (string, required): declared origin as text, 1–100 chars.
- `manufacturer` (object, required):
  - `name` (string, required): 1–200 chars.
  - `address` (object, required): `line1` (string, required), `city` (string, optional), `region` (string, optional), `postal_code` (string, optional), `country` (string, required, 1–100 chars).
- `shipment_value_usd` (number, required): `>= 0`, at most 2 decimals, `<= 1e9`.
- `entry_date` (string, required): ISO-8601 date (`YYYY-MM-DD`).
- `declared_priority_hint` (string, optional): one of `LOW`,`MEDIUM`,`HIGH`,`CRITICAL`. Advisory only; the authoritative priority is derived in F5 and this hint is recorded as evidence input, never used as the final value.
- `documents` (array, optional, default `[]`): objects with `document_type` (string, required, `^[A-Z0-9_]{3,60}$`), `status` (`RECEIVED` | `NOT_RECEIVED`, required), `filename` (string, optional), `received_at` (ISO-8601 datetime, optional).

**Outputs:**
- `IngestionReport`:
  - `batch_id` (uuid), `source`, `received_count`, `created_count`, `updated_count`, `rejected_count`
  - `created[]` / `updated[]`: `{ shipment_id, case_id, evaluation_version, exception_count, priority, status }`
  - `rejected[]`: `{ index, shipment_id_or_null, errors: [{ path, code, message }] }`
- Persisted `cargo_entries`, `documents`, `cases` rows; a new `evaluations` row plus `exceptions`/`evidence` per accepted entry.
- One audit entry per accepted entry; one aggregate `INGEST_BATCH_COMPLETED` audit entry per batch with the counts.

**Validation:**
- Envelope `schema_version` MUST be `"1.0"`; otherwise the batch is rejected atomically.
- `entries` MUST contain between 1 and 500 elements.
- Duplicate `shipment_id` values *within one batch* are rejected after the first occurrence with `INGEST_DUPLICATE_IN_BATCH`, so batch-internal ordering can never produce a nondeterministic result.
- Unknown top-level properties on a cargo-entry object are rejected (`additionalProperties: false`) so silent field drift cannot occur.
- `document_type` values are normalized to upper snake case before comparison; a `RECEIVED` document with no `filename` is rejected with `INGEST_DOCUMENT_FILENAME_REQUIRED`.
- Ingestion MUST NOT create a second case for an existing shipment, and MUST NOT modify a case whose status is `CLEARED`.
- Ingestion MUST NOT downgrade a document from `RECEIVED` to `NOT_RECEIVED` when the existing document's provenance is `SIMULATED_UPLOAD`; the incoming value is ignored and the discrepancy is recorded on the audit diff.
- API ingestion is restricted to `SYSTEM_ADMINISTRATOR` (F14). File/CLI ingestion runs as the `SYSTEM` actor with `system_actor_label = 'ingestion'`.
- Ingestion MUST be deterministic: given the same input file and the same enabled rule set, the resulting exception sets, priorities, and statuses are byte-identical (excluding timestamps, which are taken from a fixed clock in seed mode — see F2).

**State transitions caused:**

| Precondition | Result |
|---|---|
| No case exists for `shipment_id` | Case created with `status = NEW`, priority derived (F5) |
| Case exists, status ∈ {`NEW`,`IN_REVIEW`,`AWAITING_INFORMATION`,`ON_HOLD`,`ESCALATED`,`PENDING_APPROVAL`} | Status unchanged; new evaluation version created; priority recomputed; exception set replaced per F6 reconciliation semantics |
| Case exists, status = `CLEARED` | Rejected with `CASE_TERMINAL`; no write occurs |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Body is not valid JSON | 400 | `INGEST_MALFORMED_JSON` | "Request body is not valid JSON" |
| `schema_version` missing or unsupported | 422 | `INGEST_SCHEMA_VERSION_UNSUPPORTED` | "Unsupported cargo-entry schema version: {value}" |
| `entries` empty or over 500 | 422 | `INGEST_BATCH_SIZE_INVALID` | "entries must contain between 1 and 500 items" |
| Entry fails field validation | 207 (batch) / 422 (single) | `INGEST_ENTRY_INVALID` | "Entry {index} rejected: {first_reason}" |
| Duplicate shipment ID inside one batch | 207 (batch) | `INGEST_DUPLICATE_IN_BATCH` | "Duplicate shipment_id {id} within batch" |
| Received document without filename | 207/422 | `INGEST_DOCUMENT_FILENAME_REQUIRED` | "Received documents must include a filename" |
| Target case already cleared | 207/409 | `CASE_TERMINAL` | "Shipment {id} is Cleared and cannot be re-ingested" |
| Ingestion file not found | n/a (CLI exit 1) | `INGEST_FILE_NOT_FOUND` | "Cargo entry file not found at {path}" |
| Caller lacks the administrator role | 403 | `FORBIDDEN_ROLE` | "Role {role} may not ingest cargo entries" |
| Rule evaluation fails for an accepted entry | 207/500 | `EVALUATION_FAILED` | "Entry stored but evaluation failed: {detail}" |

A batch containing both accepted and rejected entries returns HTTP `207 Multi-Status` with the full `IngestionReport`. A single-entry request returns `201` on success or `422`/`409` on failure.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/ingest/cargo-entries` | ADM | Ingest a batch or single entry |
| GET | `/api/ingest/reports/{batch_id}` | ADM | Retrieve a prior batch report |

Full request/response schemas: `Y1c-api-admin.md` §Ingestion.

**Schema Surface (this feature):** writes `cargo_entries`, `documents`, `cases`, `evaluations` (via F4), `exceptions`/`evidence` (via F5), `audit_entries`; reads `rules`. Ingestion reports are persisted in `ingestion_batches` — see `Y0a-schema-core.md` §Ingestion.
---

## F2: Synthetic Seed Dataset

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** 1, 6, 10

**Description:** F2 provides a curated, fully synthetic dataset of 12 shipments that makes every screen, every exception type, and every queue status demonstrable with no manual data entry. It includes the canonical solar-panel scenario verbatim, a multi-exception shipment, a pre-cleared shipment with a complete historical audit trail for walkthrough step 10, document fixtures for both pre-attached documents and the step-6 simulated upload, and the users that back the simulated login. The seed script is deterministic and safe to re-run.

**Terminology:**
- **Deterministic seed:** All identifiers, timestamps, and generated content are fixed constants, not derived from `Date.now()` or a random source. Two seed runs produce byte-identical rows except for the database file's own metadata.
- **Seed clock:** A fixed base instant, `2026-09-01T08:00:00Z`, from which all seeded timestamps are computed as fixed offsets. Used only while seeding; live actions use the real clock.
- **Fixture:** A synthetic document file on disk under `fixtures/documents/`, referenced by seeded and uploadable documents.
- **Upload-ready fixture:** A fixture that is *not* attached at seed time and exists specifically to be attached during walkthrough step 6 (`CERTIFICATE_OF_ORIGIN_SHP-2026-0007.pdf`).

**Sub-features:**
- 12 synthetic shipments spanning all three exception types and all seven statuses
- The canonical solar-panel scenario, reproduced exactly
- A multi-exception shipment (the canonical one carries three)
- A pre-cleared shipment with a full historical audit chain including an approving official
- Document fixtures (attached and upload-ready)
- Seeded users for all three roles, including two supervisors
- Seeded rule set (the default rules of F4)
- Idempotent, re-runnable seed with explicit reset

**Process:**
1. The seed routine is invoked on an empty database at startup (F0 §Process step 5), by `npm run seed`, or by `POST /api/admin/reset` (F22).
2. If invoked in reset mode, the routine deletes all rows from all domain tables in reverse-dependency order inside one transaction, including `audit_entries` and `notifications`. This is the **only** code path permitted to remove audit rows, it is administrator-gated, and it is a whole-database reset rather than a selective edit — the append-only guarantee applies to the application's operational surface, not to a full demo reset. The reset is recorded by writing a fresh `SYSTEM` audit entry `DEMO_RESET` as the first row after reseeding.
3. The routine inserts users: 2 cargo specialists, 2 supervisors, 1 system administrator (see §Seeded users).
4. The routine inserts the default rule set (7 rules — see F4 §Default rule set) with fixed rule IDs.
5. The routine inserts the 12 cargo entries with their declared documents, using the seed clock for `entry_date` and document `received_at`.
6. The routine creates one case per entry and runs the rule engine (F4) against each, producing evaluation version 1 and its exception set. Priorities are derived, not hardcoded, so the seed proves the derivation rather than faking it.
7. The routine then applies scripted workflow history to the shipments that must not be in `NEW`: each scripted step is executed through the **real** workflow service (F9/F11) with a seeded acting user and a seed-clock timestamp, so every seeded status is backed by a genuine, complete audit chain and notification set rather than injected rows.
8. For the pre-cleared shipment, the scripted history covers: flagging → document request → upload → revalidation → specialist recommendation → supervisor approval, so walkthrough step 10 has a full ten-event timeline to replay from a shipment other than the live demo one.
9. The routine copies fixture files into the configured document storage directory if they are not already present, and verifies that the upload-ready fixture exists but is **not** attached to `SHP-2026-0007`.
10. The routine emits a `SeedReport` and verifies its own coverage assertions (§Validation). A coverage assertion failure aborts seeding with a non-zero exit rather than leaving a partially seeded demo.

**Inputs:**
- `mode` (enum, required): `SEED_IF_EMPTY` | `FORCE_RESEED`. Startup uses the former; `POST /api/admin/reset` uses the latter.
- `CARGODEMO_SEED_CLOCK` (ISO-8601 datetime, optional): overrides the seed base instant. Default `2026-09-01T08:00:00Z`.
- `CARGODEMO_DOC_STORAGE_DIR` (string, optional): default `./data/documents`.
- Static seed definition modules (shipments, users, rules, scripted histories) compiled into the app — not user-supplied at runtime.

**Outputs:**
- `SeedReport`: `{ mode, users_created, rules_created, entries_created, cases_created, exceptions_created, audit_entries_created, notifications_created, fixtures_copied, coverage: { exception_types: [...], statuses: [...], multi_exception_shipments: [...], precleared_shipments: [...] }, seed_clock, duration_ms }`
- A database in which the exception queue immediately shows work, and every screen has non-empty data.
- Fixture files present in document storage.
- `GET /api/health` seed section reporting `seeded: true`, `entry_count`, and `canonical_scenario_present: true` (F22).

**Seeded shipments (12):**

| Shipment | Commodity | Exceptions | Status | Purpose |
|---|---|---|---|---|
| `SHP-2026-0007` | Solar panels (canonical) | Missing doc + invalid HTS + origin conflict | `NEW` | The live walkthrough subject |
| `SHP-2026-0001` | Cotton apparel | Invalid HTS | `NEW` | Single-exception baseline |
| `SHP-2026-0002` | Lithium cells | Missing doc | `AWAITING_INFORMATION` | Open document request already in flight |
| `SHP-2026-0003` | Ceramic tile | Origin conflict | `IN_REVIEW` | Active review state |
| `SHP-2026-0004` | Auto brake pads | Missing doc + invalid HTS | `ON_HOLD` | Hold state, multi-exception |
| `SHP-2026-0005` | Bicycle frames | Origin conflict | `ESCALATED` | Escalated to supervisor |
| `SHP-2026-0006` | LED luminaires | Missing doc | `PENDING_APPROVAL` | Supervisor has approval work on landing |
| `SHP-2026-0008` | Steel fasteners | Invalid HTS + origin conflict | `PENDING_APPROVAL` | Second approval item; multi-exception |
| `SHP-2026-0009` | Frozen shrimp | Missing doc (resolved) | `CLEARED` | Pre-cleared with full historical audit trail |
| `SHP-2026-0010` | Plastic resin | Invalid HTS | `IN_REVIEW` | Filter/sort variety |
| `SHP-2026-0011` | Furniture | *(none)* | `NEW` | Clean shipment — proves clean entries stay off the queue |
| `SHP-2026-0012` | Pharmaceutical excipients | Missing doc + origin conflict | `AWAITING_INFORMATION` | Second awaiting-info case, `CRITICAL` priority |

**Seeded users:**

| User ID | Name | Role | Notes |
|---|---|---|---|
| `usr-cs-001` | Marisol Reyes | `CARGO_SPECIALIST` | Default acting user on first load |
| `usr-cs-002` | Marcus Hale | `CARGO_SPECIALIST` | Second specialist for hand-off scenarios |
| `usr-sup-001` | Dwayne Okafor | `SUPERVISOR` | The approving official in the walkthrough |
| `usr-sup-002` | Ronald Pike | `SUPERVISOR` | Exists so a supervisor-authored recommendation still has a distinct approver (F11 SoD-2) |
| `usr-adm-001` | Priya Raghavan | `SYSTEM_ADMINISTRATOR` | Rule administration and reset |

`usr-cs-001`, `usr-sup-001` and `usr-adm-001` **are** the three system personas PER-01, PER-02 and PER-03 of PERSONAS-CargoDemo. The seeded identity and the narrated identity are the same person by design: a walkthrough in which the queue shows a name the specification never mentions is a defect. `usr-cs-002` and `usr-sup-002` have no persona; they exist only so the hand-off and supervisor-authored-recommendation paths are demonstrable.

All names, companies, addresses, and document contents are invented. No real importer, carrier, manufacturer, or person is referenced anywhere in the dataset, fixtures, logs, or AI prompts.

**Validation (coverage assertions, enforced at seed time):**
- Entry count MUST be between 10 and 15 inclusive (currently 12).
- All three `exception_type` values MUST appear across the seeded exception set.
- All seven case statuses MUST be represented by at least one shipment.
- At least one shipment MUST carry ≥ 2 simultaneous `OPEN` exceptions; at least one MUST carry exactly 3.
- Exactly one shipment MUST be `CLEARED`, and it MUST have a non-null `approving_official_user_id` on its finalizing audit entry and ≥ 8 audit entries in its chain.
- At least one shipment MUST have zero exceptions and MUST NOT appear in the exception queue response.
- `SHP-2026-0007` MUST match the canonical scenario field-for-field: `country_of_origin = "Malaysia"`, `manufacturer.address.country = "China"`, `hts_code = "8541.40"`, `shipment_value_usd = 85000.00`, `CERTIFICATE_OF_ORIGIN` with `status = NOT_RECEIVED`, and exactly 3 `OPEN` exceptions of the three distinct types.
- The upload-ready fixture for `SHP-2026-0007` MUST exist on disk and MUST NOT be attached to the shipment.
- Every seeded shipment whose status is not `NEW` MUST have at least one `case_actions` row and a matching audit entry — no status is set without a recorded human act.
- Every seeded audit entry MUST satisfy the eight-field completeness rule of F12 for its entry class.
- No seeded string field may match the PII deny-list patterns (email address, US phone number, SSN-shaped digits); a match aborts seeding with `SEED_PII_SUSPECTED`.
- Two consecutive `FORCE_RESEED` runs MUST produce identical row contents for all non-audit tables and identical audit-entry payloads (timestamps included, because the seed clock is fixed).

**State transitions caused:** Seeding drives cases through real F9/F11 transitions to reach their target statuses. `SHP-2026-0009` traverses `NEW → AWAITING_INFORMATION → IN_REVIEW → PENDING_APPROVAL → CLEARED`. No seeded transition bypasses the state machine or the approval chain.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Seed invoked on non-empty DB without `FORCE_RESEED` | 409 | `SEED_DB_NOT_EMPTY` | "Database already contains data; use reset to reseed" |
| Coverage assertion fails | 500 | `SEED_COVERAGE_FAILED` | "Seed coverage assertion failed: {assertion}" |
| Canonical scenario mismatch | 500 | `SEED_CANONICAL_SCENARIO_INVALID` | "Canonical scenario shipment does not match required values: {detail}" |
| Fixture file missing from the repository | 500 | `SEED_FIXTURE_MISSING` | "Document fixture not found: {filename}" |
| Suspected PII in seed content | 500 | `SEED_PII_SUSPECTED` | "Seed data failed PII screen at {path}" |
| Scripted workflow step rejected by the state machine | 500 | `SEED_WORKFLOW_SCRIPT_INVALID` | "Seed history step {n} rejected: {reason}" |
| Non-administrator triggers reset | 403 | `FORBIDDEN_ROLE` | "Role {role} may not reset demo data" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/admin/reset` | ADM | Force reseed to pristine state (shared with F22) |
| GET | `/api/admin/seed-report` | ADM | Last seed report including coverage |

Full schemas: `Y1c-api-admin.md` §Demo operations.

**Schema Surface (this feature):** writes every domain table; see `Y0a`/`Y0b`. Fixture files live on the filesystem under `CARGODEMO_DOC_STORAGE_DIR`, referenced by `documents.storage_path`.
---

## F3: Backend HTTP API

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** 2 (and every step)

**Description:** F3 is the programmatic contract between the web UI and the domain services. It defines the transport-level conventions that all endpoints share — request validation, the uniform error envelope, acting-user resolution, role enforcement on every mutating route, pagination and filtering, and idempotency on action endpoints. The endpoint catalog itself is consolidated in `Y1a-api-read.md`, `Y1b-api-actions.md`, and `Y1c-api-admin.md`; this chunk specifies the cross-cutting behavior those endpoints inherit.

**Terminology:**
- **Acting user context:** The `{ user_id, name, role }` triple resolved server-side for every request from the session header/cookie established by F14. No endpoint accepts a role in the request body.
- **Uniform error envelope:** Every non-2xx response body is `{ error: { code, message, details?, field_errors?, request_id } }`. Clients branch on `code`, never on `message`.
- **Mutating endpoint:** Any `POST`, `PATCH`, `PUT`, or `DELETE` route. Every mutating endpoint performs an explicit role check and writes an audit entry (or is a pure read-through like AI generation, which writes an `ai_outputs` row instead).
- **Action idempotency key:** A client-supplied `Idempotency-Key` header on workflow action endpoints. Replaying the same key against the same case returns the original result instead of duplicating an action, an audit entry, and a notification.
- **Projection:** The API response shape for an entity, which is deliberately narrower and flatter than the schema (e.g. the queue projection returns an exception summary string plus a count, not the full exception graph).

**Sub-features:**
- Read endpoints: exception queue (filter/sort), shipment detail, exceptions, documents, audit, notifications, rules
- Action endpoints: five user actions, document request, document upload, revalidation, approval decisions
- AI endpoints: summary and recommended resolution retrieval/regeneration
- Rule CRUD restricted to the administrator
- Session/role endpoints for the simulated login
- Health and demo-operations endpoints
- Cross-cutting request validation, error contract, RBAC enforcement, and audit coupling

**Process:**
1. The server binds to `0.0.0.0` on `CARGODEMO_PORT` (default `3000` for the combined dev server, API mounted at `/api`) — see F22.
2. For every request the middleware chain runs in this fixed order: request-ID assignment → body size limit → JSON body parse → session resolution (acting user) → route match → request-schema validation → role authorization → handler → response serialization → audit flush verification.
3. Session resolution reads the `X-CargoDemo-Session` header (or the equivalent cookie) and loads the acting user. If absent or unresolvable, mutating and case-scoped read routes return `401 UNAUTHENTICATED`; the login/role-list and health routes remain open.
4. Request-schema validation validates path params, query params, and body against the route's declared schema. All failures for the request are collected and returned together in `field_errors`, so the UI can annotate every bad field in one round trip.
5. Role authorization consults the RBAC matrix (F14) using `(route_id, acting_role)` plus, where relevant, resource-level predicates (the self-approval block of F11). A denial returns `403` with `FORBIDDEN_ROLE` or `SELF_APPROVAL_BLOCKED` and writes an `ACCESS_DENIED` audit entry.
6. The handler executes domain logic inside a single transaction for mutating routes. The transaction includes the domain write, the audit entry, and the notification. If any part fails, the whole request fails and no partial state persists.
7. Before committing a mutating transaction, the audit-completeness guard (F12 §Process step 6) verifies the eight required fields for the entry class. A guard failure aborts the transaction with `AUDIT_INCOMPLETE`.
8. Responses are serialized with `Content-Type: application/json; charset=utf-8`, monetary values as decimal strings, timestamps as ISO-8601 UTC with milliseconds, and enums as the canonical codes from `00-header.md` §0.4.
9. The response includes `X-Request-Id` and, on mutating routes, `X-Case-Version` (the case's `updated_at` epoch-millis) so clients can detect concurrent modification.

**Inputs (cross-cutting):**
- `X-CargoDemo-Session` (string, required on protected routes): opaque session token issued by `POST /api/session`.
- `Idempotency-Key` (string, optional, ≤ 128 chars): required-by-convention on the workflow action endpoints; the UI always sends one.
- `If-Match-Case-Version` (integer, optional): when supplied on a mutating case route, the request is rejected with `CASE_VERSION_CONFLICT` if the case has changed since that version. The UI sends it for all five actions and both approval decisions.
- Query conventions on list routes: `page` (integer ≥ 1, default 1), `page_size` (integer 1–100, default 25), `sort` (comma-separated `field:asc|desc`), plus route-specific filters.

**Outputs:**
- JSON projections per `Y1a`–`Y1c`.
- List responses wrapped as `{ data: [...], page: { page, page_size, total, total_pages }, applied: { filters, sort } }` so the UI can render active-filter chips from the server's interpretation rather than its own.
- Single-resource responses returned unwrapped at the top level with an `_links` object for related resources (`shipment`, `exceptions`, `audit`, `notifications`, `ai`).
- `OpenAPI 3.1` document served at `GET /api/openapi.json`, generated from the same schemas used for validation so drift is structurally impossible.

**Validation:**
- Every route MUST declare a request schema; a route without one fails a startup self-check (`ROUTE_SCHEMA_MISSING`).
- Every mutating route MUST declare a required role set; a route without one fails the same startup self-check. This is the structural guarantee behind "authorization is never client-only".
- Unknown body properties are rejected (`additionalProperties: false`) on all mutating routes.
- Request bodies are limited to 64 KB except document upload, which is limited to 5 MB (F10).
- `page_size` > 100 is rejected rather than silently clamped.
- Unknown `sort` fields or filter values outside the canonical enums are rejected with `INVALID_QUERY_PARAM` rather than ignored.
- `Idempotency-Key` reuse with a *different* payload on the same case returns `409 IDEMPOTENCY_KEY_REUSED`; reuse with an identical payload returns the original `200`/`201` response and its original body.
- Concurrency: two simultaneous actions on the same case are serialized by a transaction on the `cases` row; the loser receives `409 CASE_VERSION_CONFLICT`.
- Read routes MUST NOT expose the AI provider API key, absolute filesystem paths, or SQL fragments in any response or error message.
- HTTP verbs MUST NOT be tunneled: `DELETE` is not offered on `audit_entries`, `notifications`, `exceptions`, or `evidence` at all, so no client can even express the request.

**State transitions caused:** None of its own. F3 is the transport for the transitions defined in F9, F10, and F11 and enforces the preconditions (authentication, authorization, schema validity, case version) before those transitions are attempted.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| No/invalid session on a protected route | 401 | `UNAUTHENTICATED` | "No acting user; select a role to continue" |
| Role not permitted for the route | 403 | `FORBIDDEN_ROLE` | "Role {role} may not perform {operation}" |
| Path resource not found | 404 | `RESOURCE_NOT_FOUND` | "{entity} {id} not found" |
| Body/query schema violation | 422 | `VALIDATION_FAILED` | "Request validation failed" (with `field_errors`) |
| Malformed JSON | 400 | `MALFORMED_JSON` | "Request body is not valid JSON" |
| Body exceeds size limit | 413 | `PAYLOAD_TOO_LARGE` | "Request body exceeds {limit}" |
| Unsupported media type on upload | 415 | `UNSUPPORTED_MEDIA_TYPE` | "Content type {type} is not accepted" |
| Case changed since `If-Match-Case-Version` | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |
| Idempotency key reused with different payload | 409 | `IDEMPOTENCY_KEY_REUSED` | "Idempotency-Key already used with a different request" |
| Invalid sort/filter parameter | 422 | `INVALID_QUERY_PARAM` | "{param} value {value} is not supported" |
| Unhandled server fault | 500 | `INTERNAL_ERROR` | "Unexpected error; request_id {request_id}" |
| AI provider unavailable on a non-fallback-eligible route | 503 | `AI_UNAVAILABLE` | "AI assistance unavailable" *(F7/F8 routes never return this — they fall back)* |

The full catalog, including every domain-specific code, is in `Y2-errors.md`.

**API Surface (this feature):** the entire catalog. Route groups:

| Group | Base path | Chunk |
|---|---|---|
| Session & roles | `/api/session`, `/api/users` | `Y1c` |
| Queue & shipments | `/api/queue`, `/api/shipments` | `Y1a` |
| Exceptions & evidence | `/api/shipments/{id}/exceptions` | `Y1a` |
| Documents & requests | `/api/shipments/{id}/documents`, `/api/document-requests` | `Y1b` |
| Workflow actions | `/api/cases/{id}/actions` | `Y1b` |
| Approvals | `/api/cases/{id}/approval` | `Y1b` |
| Revalidation | `/api/shipments/{id}/revalidate` | `Y1b` |
| AI assistance | `/api/shipments/{id}/ai/summary`, `/api/shipments/{id}/ai/recommendation` | `Y1c` |
| Audit & notifications | `/api/cases/{id}/audit`, `/api/notifications` | `Y1a` |
| Rules | `/api/rules` | `Y1c` |
| Ingestion & demo ops | `/api/ingest/*`, `/api/admin/*`, `/api/health` | `Y1c` |

**Schema Surface (this feature):** reads and writes all tables through the repository layer; owns `idempotency_keys` and `request_log` (bounded, non-PII) — see `Y0b-schema-workflow-audit.md` §Transport support.
---

## F4: Configurable Business Rule Engine

**Priority:** P0 · **Category:** Rules & Validation · **Walkthrough steps:** 4, 7

**Description:** F4 is a configuration-driven evaluator that validates a cargo entry against the persisted, enabled rule set and emits zero or more exception findings with field-level evidence. It supports **exactly three** exception types — missing required document, invalid/incomplete HTS code, and conflicting country of origin. The check *logic* for each type is implemented once as a typed evaluator; every threshold, document list, digit count, comparison field, severity, and condition is data in `rules.params_json`, so the System Administrator (F15) changes behavior without a code change or redeploy. Evaluation is deterministic: the same entry plus the same rule set always yields the same findings, in the same order, with the same evidence.

**Terminology:**
- **Evaluator:** The code implementing one `exception_type`. Exactly three exist and no mechanism for registering a fourth is exposed.
- **Rule definition:** A `rules` row: `{ id, name, exception_type, description, policy_reference, params_json, severity, priority_mapping, enabled, version, created_at, updated_at }`.
- **Finding:** The evaluator's in-memory output for one firing rule — `{ rule_id, exception_type, severity, sub_reason, evidence[], missing_information[], assertion }`. F5 persists findings as `exceptions` rows.
- **Sub-reason:** A machine-readable discriminator explaining *how* the rule failed (e.g. `INCOMPLETE_DIGITS` vs `NON_NUMERIC`). Drives the fallback recommendation (F8) and the resolution screen copy (F19).
- **Applicability condition:** A rule-level gate (value threshold, commodity keyword, HTS prefix, origin country) evaluated before the check itself. A rule whose conditions do not match is *not applicable* and produces no finding — which is distinct from being applicable and passing.
- **Normalization:** Deterministic canonicalization of input values (country → ISO alpha-2; HTS → digit string; document type → upper snake case) performed before comparison. Both the raw and the normalized value are recorded in evidence.

**Sub-features:**
- Rule loading, caching, and cache invalidation on rule change
- Applicability condition evaluation (shared across all three evaluators)
- `MISSING_REQUIRED_DOCUMENT` evaluator
- `INVALID_HTS_CODE` evaluator
- `CONFLICTING_COUNTRY_OF_ORIGIN` evaluator
- Deterministic multi-rule evaluation with stable ordering
- Rule-definition schema validation (shared with F15)

**Process:**
1. The engine is invoked with `(cargo_entry_id, trigger, actor)` where `trigger ∈ { INGESTION, MANUAL_REVALIDATION, DOCUMENT_UPLOAD, RULE_CHANGE, SEED }`.
2. The engine loads the cargo entry, its documents, and the enabled rule set. The rule set is cached in process and the cache is invalidated whenever any `rules` row is created, updated, enabled, or disabled (F15), so a rule change takes effect on the next evaluation with no restart.
3. The engine sorts the rule set deterministically by `(exception_type ASC, severity DESC, rule_id ASC)`. This ordering is the persisted order of findings and therefore the display order on F18/F19 — it never varies between runs.
4. For each rule, the engine evaluates applicability conditions (§3). Non-applicable rules are skipped and recorded in the evaluation's `skipped_rules[]` with the failing condition, so an administrator can see *why* a rule did not fire.
5. For each applicable rule, the engine dispatches to the evaluator for its `exception_type` and collects the finding, if any. An evaluator MUST NOT throw for ordinary bad data; malformed input is a finding, not a crash. Only a malformed *rule definition* raises, and it raises as `RULE_CONFIG_INVALID` attributed to that rule while the remaining rules still evaluate.
6. All findings are retained. No suppression, deduplication across rules, or "highest severity only" filtering occurs — a shipment with three firing rules yields three findings (PRD F4: "all firing rules are retained, none suppressed").
7. The engine returns an `EvaluationResult` to F5, which persists the evaluation version, the exceptions, and the evidence, and derives priority and status.

### §2 Rule definition schema (validated on save by F15 and on load by F4)

| Field | Type | Rules |
|---|---|---|
| `id` | string | `^rule-[a-z0-9-]{3,40}$`, immutable after creation |
| `name` | string | 3–120 chars, unique |
| `exception_type` | enum | exactly one of the three canonical codes |
| `description` | string | 10–500 chars, shown on F19 as the human-readable rule statement |
| `policy_reference` | string | 3–120 chars, e.g. `19 CFR 141.86` — displayed as the triggering authority |
| `severity` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |
| `priority_mapping` | object | optional override `{ "LOW":"LOW", ... }` mapping this rule's severity to a case-priority contribution; default is identity |
| `enabled` | boolean | disabled rules are never evaluated and never produce findings |
| `conditions` | object | applicability conditions, §3 |
| `params_json` | object | type-specific parameters, §4–§6. Validated against the JSON Schema for its `exception_type`. |
| `version` | integer | incremented on every save; stamped onto findings so an exception records the rule version that produced it |

A rule whose `params_json` fails its type schema is rejected on save (F15) and, if already persisted and later found invalid on load, is skipped with a `RULE_CONFIG_INVALID` entry in the evaluation result rather than silently ignored.

### §3 Applicability conditions (shared)

`conditions` is an object; all present conditions must match (logical AND). An empty object means always applicable.

| Condition | Type | Semantics |
|---|---|---|
| `min_shipment_value_usd` | number | applicable when `shipment_value_usd >= value` |
| `max_shipment_value_usd` | number | applicable when `shipment_value_usd <= value` |
| `commodity_keywords` | string[] | applicable when `product_description`, lowercased, contains any keyword lowercased as a substring |
| `hts_prefixes` | string[] | applicable when `hts_code_normalized` starts with any listed digit prefix. A null/empty HTS matches only if `""` is listed. |
| `country_of_origin_in` | string[] | applicable when `country_of_origin_iso2` is in the list |
| `country_of_origin_not_in` | string[] | applicable when `country_of_origin_iso2` is not in the list |

Evidence for a skipped rule records `{ condition, expected, actual, result: "NOT_APPLICABLE" }`.

### §4 `INVALID_HTS_CODE` — concrete validation logic

**Parameters (`params_json`):**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `expected_digit_count` | integer 6–12 | `10` | The number of significant digits a complete code must have |
| `min_digit_count` | integer 4–12 | `6` | Below this, the code is `INCOMPLETE_DIGITS` at elevated confidence; between `min` and `expected` it is still `INCOMPLETE_DIGITS` |
| `allowed_separators` | string[] | `[".", "-", " "]` | Characters stripped before digit counting |
| `allow_partial` | boolean | `false` | When `true`, a code with ≥ `min_digit_count` digits passes the length check (used to demonstrate a configuration change in F15) |
| `treat_missing_as_exception` | boolean | `true` | When `false`, a null/absent HTS produces no finding from this rule |
| `check_known_codes` | boolean | `false` | Enables the reference-list check |
| `known_code_prefix_length` | integer 4–10 | `6` | Number of leading digits compared against the reference list |
| `known_codes` | string[] | `[]` | Reference list of valid digit prefixes, supplied as configuration |
| `placeholder_characters` | string[] | `["X","x","*","?","#"]` | Any occurrence makes the code a placeholder, not a classification |

**Algorithm (executed in this exact order; the first failing check produces the finding and stops):**

1. **MISSING** — If `hts_code` is `null`, empty, or whitespace-only:
   - If `treat_missing_as_exception = false` → no finding.
   - Else → finding with `sub_reason = "MISSING"`, `missing_information = [{ field_path: "hts_code", requirement: "A complete {expected_digit_count}-digit HTS classification is required" }]`.
2. **Normalize** — Strip every character in `allowed_separators`; trim. Retain the result as `hts_code_normalized`.
3. **PLACEHOLDER** — If the normalized string contains any character in `placeholder_characters` → `sub_reason = "PLACEHOLDER"`. A code such as `8541.40.XX` is a placeholder, not merely incomplete, and is reported as such because the missing digits are unknown rather than merely absent.
4. **NON_NUMERIC** — If the normalized string contains any character that is not `0`–`9` → `sub_reason = "NON_NUMERIC"`. Evidence records the offending characters and their zero-based positions in the normalized string.
5. **ODD_STRUCTURE** — If the *raw* code contains a separator run of length > 1 (`8541..40`), a leading separator, or a trailing separator → `sub_reason = "ODD_STRUCTURE"`. This is checked after digit-content so that a genuinely non-numeric code reports the more specific reason.
6. **Digit count** — Let `d = normalized.length`.
   - If `d > expected_digit_count` → `sub_reason = "TOO_MANY_DIGITS"`.
   - If `d < expected_digit_count`:
     - If `allow_partial = true` **and** `d >= min_digit_count` → continue to step 7 (length accepted).
     - Else → `sub_reason = "INCOMPLETE_DIGITS"`, with `missing_information = [{ field_path: "hts_code", requirement: "{expected_digit_count}-digit classification required", observed_digits: d, missing_digits: expected_digit_count - d }]`.
   - If `d == expected_digit_count` → continue to step 7.
7. **UNKNOWN_CODE** — If `check_known_codes = true`: take the first `known_code_prefix_length` digits of the normalized code. If that prefix is not present in `known_codes` → `sub_reason = "UNKNOWN_CODE"`. If `known_codes` is empty while `check_known_codes = true`, the rule definition is invalid (`RULE_CONFIG_INVALID`) rather than passing everything.
8. If no check failed → no finding; the HTS code is valid and complete under this rule.

**Evidence emitted:** `{ field_path: "hts_code", raw_value: "8541.40", normalized_value: "854140", assertion: "HTS code has 6 significant digits; a complete classification requires 10", expected: "10 digits", observed: "6 digits", sub_reason: "INCOMPLETE_DIGITS" }`.

**Canonical scenario:** `"8541.40"` → normalized `"854140"`, `d = 6`, `expected_digit_count = 10`, `allow_partial = false` → `INCOMPLETE_DIGITS`, severity `HIGH`.

### §5 `CONFLICTING_COUNTRY_OF_ORIGIN` — concrete validation logic

**Parameters (`params_json`):**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `declared_field` | string | `"country_of_origin"` | The declared-origin field path |
| `comparison_fields` | string[] | `["manufacturer.address.country"]` | Origin-bearing fields compared against the declared origin, in order |
| `treat_missing_declared_as_conflict` | boolean | `true` | An undeclarable/unmappable declared origin is itself a finding |
| `treat_missing_comparison_as_conflict` | boolean | `false` | A null comparison field produces no finding, only an `insufficient_evidence` note |
| `allowed_pairs` | object[] | `[]` | Explicitly tolerated mismatches, `[{ declared: "MY", comparison: "SG" }]` |
| `case_sensitive` | boolean | `false` | Retained for completeness; normalization makes this irrelevant by default |

**Country normalization (deterministic, table-driven):**
1. Trim, collapse internal whitespace, uppercase.
2. Strip a trailing period and leading articles (`THE `).
3. Look up in the alias table, which maps ISO alpha-2 codes, ISO alpha-3 codes, official names, and a curated synonym list to alpha-2. Examples: `MALAYSIA → MY`, `MY → MY`, `MYS → MY`, `CHINA → CN`, `PEOPLE'S REPUBLIC OF CHINA → CN`, `PRC → CN`, `HONG KONG → HK` (distinct from `CN` by design), `TAIWAN → TW`, `VIET NAM`/`VIETNAM → VN`.
4. On lookup failure the normalized value is `null` and the raw value is retained.

The alias table is application data (not per-rule configuration) so that all three evaluators normalize identically; F15 does not expose it for editing.

**Algorithm:**
1. Normalize the declared origin: `declared_iso2 = normalize(entry[declared_field])`.
2. If `declared_iso2` is `null`:
   - If `treat_missing_declared_as_conflict = false` → no finding.
   - Else → finding with `sub_reason = "UNRESOLVABLE_DECLARED_ORIGIN"`, evidence recording the raw declared value and the assertion that it could not be resolved to a recognized country.
3. For each `comparison_fields` entry in order, resolve the value by dot-path against the cargo entry (and, where the path begins `documents.`, against the document set — e.g. `documents.CERTIFICATE_OF_ORIGIN.stated_country`):
   - If the path resolves to `null`/absent: record an `insufficient_evidence` note for that field. If `treat_missing_comparison_as_conflict = true` → finding with `sub_reason = "MISSING_COMPARISON_ORIGIN"` and `missing_information` naming the absent field; otherwise continue to the next field.
   - Normalize to `comparison_iso2`. If normalization fails → finding with `sub_reason = "UNRESOLVABLE_COMPARISON_ORIGIN"`.
   - If `comparison_iso2 == declared_iso2` → this field agrees; continue.
   - If the pair `{ declared_iso2, comparison_iso2 }` appears in `allowed_pairs` → tolerated; record an `allowed_pair_applied` note and continue.
   - Otherwise → **finding**, `sub_reason = "ORIGIN_MISMATCH"`, and evaluation of this rule stops at the first genuine mismatch (the first mismatch is the exception; additional disagreeing fields are appended to the same finding's evidence array rather than producing extra findings, because one rule produces at most one exception).
4. If every comparison field agreed or was tolerated/insufficient → no finding.

**Evidence emitted (canonical scenario):**
```
[
  { field_path: "country_of_origin",             raw_value: "Malaysia", normalized_value: "MY" },
  { field_path: "manufacturer.address.country",  raw_value: "China",    normalized_value: "CN" }
]
assertion: "Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)"
sub_reason: "ORIGIN_MISMATCH"
```

**Why the walkthrough works:** because the default `comparison_fields` contains only `manufacturer.address.country`, attaching a certificate of origin in step 6 cannot change this rule's inputs. The origin exception therefore *persists* through revalidation while the missing-document exception resolves — exactly the behavior walkthrough step 7 must demonstrate.

### §6 `MISSING_REQUIRED_DOCUMENT` — concrete validation logic

**Parameters (`params_json`):**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `required_document_types` | string[] | — (required, 1–20 items) | Document type codes that must be received |
| `match_mode` | enum | `"ALL"` | `ALL` = every listed type required; `ANY_ONE_OF` = at least one listed type satisfies the rule |
| `accept_statuses` | string[] | `["RECEIVED"]` | Document statuses that count as satisfying |
| `require_file_present` | boolean | `true` | A `RECEIVED` document with no `storage_path`/`filename` does not satisfy the requirement |
| `ignore_superseded` | boolean | `true` | Documents marked superseded do not satisfy the requirement |

**Algorithm:**
1. Build the received set: every `documents` row for the shipment whose `status` is in `accept_statuses`, whose `document_type` (normalized to upper snake case) is retained, excluding superseded rows when `ignore_superseded = true`, and excluding rows failing the `require_file_present` check.
2. Normalize `required_document_types` to upper snake case.
3. If `match_mode = "ALL"`: compute `missing = required \ received`. If `missing` is empty → no finding. Otherwise → **one** finding listing every missing type.
4. If `match_mode = "ANY_ONE_OF"`: if the intersection of `required` and `received` is non-empty → no finding. Otherwise → one finding listing all acceptable types as alternatives.
5. `missing_information` contains one entry per missing type: `{ document_type, requirement: "{Display name} is required for this shipment", required_by_rule: rule_id, policy_reference }`.
6. `sub_reason` is `DOCUMENT_NOT_RECEIVED` when the document row exists with `status = NOT_RECEIVED`, `DOCUMENT_NOT_DECLARED` when no row exists at all, and `DOCUMENT_FILE_MISSING` when a row claims `RECEIVED` but fails the file-present check. When multiple missing types have different sub-reasons, the finding's `sub_reason` is the most specific one in that precedence order and each `missing_information` entry keeps its own.

**Partial satisfaction is the key revalidation property:** a rule requiring three documents of which one arrives keeps its exception `OPEN` with a *shrunken* `missing_information` list. The exception resolves only when `missing` becomes empty. See F6 §Process step 6.

**Evidence emitted (canonical scenario):** `{ field_path: "documents", raw_value: "COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING", assertion: "CERTIFICATE_OF_ORIGIN has not been received", missing_information: [{ document_type: "CERTIFICATE_OF_ORIGIN", requirement: "Certificate of Origin is required for shipments valued at or above $50,000" }], sub_reason: "DOCUMENT_NOT_RECEIVED" }`.

### §7 Default rule set (seeded by F2, editable by F15)

| Rule ID | Type | Severity | Key params | Policy ref |
|---|---|---|---|---|
| `rule-doc-baseline` | `MISSING_REQUIRED_DOCUMENT` | `MEDIUM` | `required_document_types: [COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING]` | `19 CFR 141.81` |
| `rule-doc-highvalue-coo` | `MISSING_REQUIRED_DOCUMENT` | `HIGH` | `required_document_types: [CERTIFICATE_OF_ORIGIN]`, `conditions.min_shipment_value_usd: 50000` | `19 CFR 102.0` |
| `rule-doc-solar-cert` | `MISSING_REQUIRED_DOCUMENT` | `HIGH` | `required_document_types: [CERTIFICATE_OF_ORIGIN]`, `conditions.commodity_keywords: ["solar","photovoltaic"]` | `19 CFR 102.0` |
| `rule-hts-completeness` | `INVALID_HTS_CODE` | `HIGH` | `expected_digit_count: 10`, `min_digit_count: 6`, `allow_partial: false` | `19 CFR 152.11` |
| `rule-hts-known-chapter` | `INVALID_HTS_CODE` | `MEDIUM` | `check_known_codes: true`, `known_code_prefix_length: 4`, `known_codes: [...]`, `enabled: false` | `HTSUS General Rules` |
| `rule-origin-manufacturer` | `CONFLICTING_COUNTRY_OF_ORIGIN` | `CRITICAL` | `comparison_fields: ["manufacturer.address.country"]` | `19 CFR 134.1` |
| `rule-origin-certificate` | `CONFLICTING_COUNTRY_OF_ORIGIN` | `HIGH` | `comparison_fields: ["documents.CERTIFICATE_OF_ORIGIN.stated_country"]`, `enabled: false` | `19 CFR 134.1` |

`rule-doc-highvalue-coo` and `rule-doc-solar-cert` both require `CERTIFICATE_OF_ORIGIN` and both fire on the canonical shipment. To keep the canonical scenario at exactly three exceptions, `rule-doc-solar-cert` is seeded **disabled**; it exists so an administrator can demonstrate enabling a rule and seeing a fourth exception appear (F15). The canonical shipment's three exceptions therefore come from `rule-doc-highvalue-coo`, `rule-hts-completeness`, and `rule-origin-manufacturer`.

**Inputs:**
- `cargo_entry_id` (uuid, required)
- `trigger` (enum, required): `INGESTION` | `MANUAL_REVALIDATION` | `DOCUMENT_UPLOAD` | `RULE_CHANGE` | `SEED`
- `actor` (object, required): `{ user_id | null, role | null, actor_kind }`
- Implicit: the enabled `rules` set, the shipment's `documents`, and the country alias table

**Outputs:**
- `EvaluationResult`: `{ evaluation_id, cargo_entry_id, version, evaluated_at, trigger, rule_set_fingerprint, findings[], skipped_rules[], invalid_rules[], duration_ms }`
- `rule_set_fingerprint`: a SHA-256 over the ordered `(rule_id, version, enabled)` tuples — recorded on the evaluation so an audit reader can prove which rule configuration produced a finding.
- Findings handed to F5 for persistence.

**Validation:**
- `exception_type` MUST be one of exactly three values; the evaluator registry is a closed map and has no registration API.
- A rule with `enabled = false` MUST NOT produce a finding under any circumstances.
- The same `(entry, rule set)` MUST produce identical findings, identical ordering, and identical evidence arrays across runs — asserted by an F21 determinism test that evaluates each seeded entry twice and compares serialized results.
- Evaluation of a single shipment MUST complete in < 500 ms with the seeded rule set (PRD §6).
- Evaluators MUST NOT mutate the cargo entry, its documents, or the rule set.
- An invalid rule definition MUST NOT prevent other rules from evaluating.
- `params_json` MUST validate against the JSON Schema for its `exception_type`; unknown params are rejected (`additionalProperties: false`) so a typo in a parameter name cannot silently disable a check.

**State transitions caused:** None directly; F4 produces findings. F5 sets the case's initial status and priority, and F6 reconciles status after a revalidation.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Cargo entry not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| Rule `params_json` fails its type schema on load | 200 (reported in result) | `RULE_CONFIG_INVALID` | "Rule {rule_id} configuration is invalid: {detail}" |
| `check_known_codes` true with empty `known_codes` | 200 (reported) / 422 on save | `RULE_CONFIG_INVALID` | "known_codes must be non-empty when check_known_codes is enabled" |
| `comparison_fields` contains an unresolvable path | 200 (reported) / 422 on save | `RULE_PARAM_PATH_UNKNOWN` | "Field path {path} is not a recognized origin-bearing field" |
| Unknown `exception_type` persisted in `rules` | 500 | `EXCEPTION_TYPE_UNSUPPORTED` | "Rule {rule_id} declares unsupported exception type {type}" |
| Evaluation exceeds the 2 s hard ceiling | 500 | `EVALUATION_TIMEOUT` | "Rule evaluation exceeded time limit" |
| Evaluator raised unexpectedly | 500 | `EVALUATION_FAILED` | "Rule {rule_id} evaluation failed: {detail}" |

**API Surface (this feature):** F4 has no public endpoint of its own; it is invoked by F1 (ingestion), F6 (`POST /api/shipments/{id}/revalidate`), F15 (rule change impact preview: `POST /api/rules/{id}/preview-impact`), and F2 (seeding). See `Y1b`/`Y1c`.

**Schema Surface (this feature):** reads `rules`, `cargo_entries`, `documents`; writes `evaluations` (with `rule_set_fingerprint`, `skipped_rules_json`, `invalid_rules_json`). Exception/evidence persistence is F5's. See `Y0a-schema-core.md` §Rules and §Evaluation.
---

## F5: Exception Detection, Evidence Capture & Flagging

**Priority:** P0 · **Category:** Rules & Validation · **Walkthrough steps:** 1, 4

**Description:** F5 turns the rule engine's findings into reviewable work. It persists an exception per firing rule, stores the field-level evidence that triggered it, records what information is missing, derives the case priority from rule severity and shipment attributes, sets the initial queue status, and places the shipment on the exception queue. It also preserves the full evaluation history so pre- and post-revalidation states remain independently inspectable.

**Terminology:**
- **Flagging:** The act of making a shipment visible on the exception queue. A shipment is flagged if and only if its current evaluation has ≥ 1 `OPEN` exception, or its case status is `PENDING_APPROVAL` (which must remain visible to supervisors even after the underlying exceptions are proposed for clearance).
- **Current evaluation:** The `evaluations` row referenced by `cases.current_evaluation_id`. Queue and detail views read exceptions from the current evaluation only; prior evaluations are reachable through the audit/history views.
- **Evidence record:** One `evidence` row bound to one exception. Structured, never prose.
- **Missing information:** Evidence rows with `kind = 'MISSING'`, describing absent evidence. Rendered as the "missing information" panel on F19 and consumed by F8's fallback.
- **Derived priority:** `cases.priority`, computed by the algorithm in §Process step 6. Never set by a human, never taken from the ingestion hint.

**Sub-features:**
- Exception persistence per firing rule, bound to an evaluation version
- Structured evidence capture with raw and normalized values
- Missing-information capture
- Deterministic priority derivation
- Initial status assignment and queue membership
- Evaluation history preservation

**Process:**
1. F5 receives an `EvaluationResult` from F4 together with `(case_id, trigger, actor)`.
2. F5 inserts the `evaluations` row with `version = previous_version + 1` (or `1` for a first evaluation), `trigger`, `rule_set_fingerprint`, `evaluated_at`, `actor_kind`, and `actor_user_id`. Version assignment happens inside the same transaction that reads the previous maximum, so concurrent evaluations cannot collide.
3. For each finding, F5 inserts an `exceptions` row: `{ evaluation_id, cargo_entry_id, rule_id, rule_version, exception_type, severity, sub_reason, status: 'OPEN', assertion, first_detected_evaluation_id, opened_at }`.
   - `first_detected_evaluation_id` is carried forward from the earliest evaluation in which this `(cargo_entry_id, rule_id)` pair fired without an intervening resolution, so the UI can show "open since" age and the queue can sort by exception age rather than case age.
4. For each finding, F5 inserts `evidence` rows. Each row is `{ exception_id, kind, field_path, raw_value, normalized_value, comparison_field_path, comparison_raw_value, comparison_normalized_value, expected, observed, assertion, display_order }` where `kind ∈ { OBSERVED, COMPARISON, MISSING, CONTEXT }`:
   - `OBSERVED` — the value that failed (`hts_code = "8541.40"` → `"854140"`).
   - `COMPARISON` — the value it was measured against (`manufacturer.address.country = "China"` → `"CN"`).
   - `MISSING` — absent evidence (`CERTIFICATE_OF_ORIGIN` not received; 4 of 10 HTS digits absent).
   - `CONTEXT` — attributes that made the rule applicable (`shipment_value_usd = 85000.00 ≥ 50000 threshold`). Context evidence is what lets a reviewer see *why this rule applied to this shipment*.
   - `display_order` is assigned from the evaluator's emission order so the evidence panel renders identically on every load.
5. F5 reconciles the exception set against the prior evaluation (delegated to F6 §Process steps 5–7 when the trigger is a revalidation; on first evaluation there is nothing to reconcile).
6. F5 derives priority from the current `OPEN` exception set:
   1. `base = max(severity)` across `OPEN` exceptions, using the ordering `LOW < MEDIUM < HIGH < CRITICAL`, after applying each rule's `priority_mapping`. If there are no `OPEN` exceptions, `priority = LOW`.
   2. **Value escalation:** if `shipment_value_usd >= 50000`, raise one level.
   3. **Multiplicity escalation:** if the count of `OPEN` exceptions `>= 3`, raise one level.
   4. **Age escalation:** if the oldest `OPEN` exception's `opened_at` is more than 7 days before `now`, raise one level. (In seed mode `now` is the seed clock, keeping seeded priorities deterministic.)
   5. Clamp to `CRITICAL`. Each applied escalation is recorded in `cases.priority_basis_json` as `[{ factor, detail, from, to }]` so the queue can explain a priority on hover and the audit record can defend it.
   - *Canonical scenario:* base `CRITICAL` (origin rule) → value escalation and multiplicity escalation both clamp → `CRITICAL`, with all three factors listed in the basis.
7. F5 sets the initial case status when the case is newly created: `NEW` if ≥ 1 `OPEN` exception, `NEW` with `queued = false` if zero exceptions. On subsequent evaluations F5 never changes status itself; status changes belong to F6 (revalidation) and F9/F11 (human actions).
8. F5 sets `cases.current_evaluation_id` to the new evaluation, `cases.open_exception_count`, and `cases.exception_type_summary` (a deterministic, sorted, comma-joined list of distinct open exception types used by the queue projection).
9. F5 writes a `SYSTEM`-actor audit entry `EXCEPTIONS_DETECTED` (or `EXCEPTIONS_REEVALUATED`) capturing the evaluation version, the exception ID set with types and severities, the evidence summary, the derived priority with its basis, and the rule-set fingerprint.
10. F5 invalidates the cached AI summary and recommendation for the shipment, because both are bound to an evaluation version (F7, F8).

**Inputs:**
- `EvaluationResult` from F4 (findings, skipped rules, invalid rules, fingerprint)
- `case_id` (uuid, required)
- `trigger` (enum, required), `actor` (object, required)
- Cargo entry attributes needed for priority derivation: `shipment_value_usd`, existing `opened_at` values

**Outputs:**
- Persisted `evaluations`, `exceptions`, `evidence` rows
- Updated `cases`: `current_evaluation_id`, `priority`, `priority_basis_json`, `open_exception_count`, `exception_type_summary`, `queued`, `updated_at`
- `DetectionResult` returned to the caller: `{ evaluation_id, version, opened: [exception_id], retained: [exception_id], resolved: [exception_id], priority, priority_basis, queued }`
- One `EXCEPTIONS_DETECTED` / `EXCEPTIONS_REEVALUATED` audit entry
- Queue membership visible immediately at `GET /api/queue`

**Validation:**
- Every persisted exception MUST have ≥ 1 evidence row. An exception with no evidence is a defect and is rejected at write time with `EXCEPTION_EVIDENCE_REQUIRED`.
- Every `MISSING_REQUIRED_DOCUMENT` exception MUST have ≥ 1 `MISSING`-kind evidence row.
- Every `CONFLICTING_COUNTRY_OF_ORIGIN` exception with `sub_reason = ORIGIN_MISMATCH` MUST have ≥ 1 `OBSERVED` and ≥ 1 `COMPARISON` evidence row, each with a non-null `normalized_value`.
- Every `INVALID_HTS_CODE` exception MUST have an `OBSERVED` evidence row whose `expected` and `observed` fields are both populated.
- Evidence values MUST be stored as strings exactly as observed (no rounding, reformatting, or locale conversion), with the normalized form in a separate column.
- `evidence.raw_value` MUST NOT exceed 2 000 characters; longer values are truncated with an explicit `…(truncated)` marker and `truncated = true`.
- At most one `OPEN` exception may exist per `(evaluation_id, rule_id)`.
- Priority derivation MUST be a pure function of `(open exception severities, shipment value, open exception count, oldest opened_at, now)` — asserted by an F21 table-driven test.
- A shipment with zero `OPEN` exceptions MUST NOT appear in the default queue response, and MUST still be retrievable by direct ID.
- Prior evaluations, their exceptions, and their evidence MUST remain readable after a revalidation; F5 MUST NOT update or delete rows belonging to an earlier evaluation, except to set the terminal `status` of an exception being resolved (which F6 performs).

**State transitions caused:**

| Precondition | Result |
|---|---|
| New case, ≥ 1 finding | `status = NEW`, `queued = true`, priority derived |
| New case, 0 findings | `status = NEW`, `queued = false`, `priority = LOW` |
| Existing case, any status | Status untouched by F5; `priority`, `open_exception_count`, `queued` recomputed |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Exception written with no evidence | 500 | `EXCEPTION_EVIDENCE_REQUIRED` | "Exception {rule_id} produced no evidence and cannot be persisted" |
| Missing-document exception with no MISSING evidence | 500 | `MISSING_INFORMATION_REQUIRED` | "Missing-document exception must record the missing document types" |
| Evaluation version collision | 409 | `EVALUATION_VERSION_CONFLICT` | "Concurrent evaluation detected; retry" |
| Priority derivation produced a non-canonical value | 500 | `PRIORITY_DERIVATION_FAILED` | "Derived priority {value} is not a supported priority" |
| Case not found for the entry | 404 | `RESOURCE_NOT_FOUND` | "Case for shipment {id} not found" |
| Attempt to mutate a superseded evaluation's evidence | 405 | `EVALUATION_HISTORY_IMMUTABLE` | "Historical evaluation data cannot be modified" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/queue` | CS, SUP, ADM(read-only) | Flagged shipments with exception summary, priority, status |
| GET | `/api/shipments/{id}/exceptions` | CS, SUP, ADM | Current-evaluation exceptions with full evidence |
| GET | `/api/shipments/{id}/evaluations` | CS, SUP, ADM | Evaluation history with per-version exception sets |
| GET | `/api/shipments/{id}/evaluations/{version}` | CS, SUP, ADM | One historical evaluation, for before/after comparison |

Full schemas: `Y1a-api-read.md` §Queue and §Exceptions.

**Schema Surface (this feature):** writes `evaluations`, `exceptions`, `evidence`, and the derived columns on `cases`; writes `audit_entries`. See `Y0a-schema-core.md` §Evaluation.
---

## F6: Shipment Revalidation

**Priority:** P0 · **Category:** Rules & Validation · **Walkthrough step:** 7

**Description:** F6 re-runs the rule engine against a shipment after its evidence changes — most importantly after a simulated document upload — and reconciles the resulting exception set against the previous one. Exceptions that no longer fire are marked `RESOLVED_BY_REVALIDATION` and retained, never deleted. Exceptions that still fire are carried forward with their original open-since timestamp. Newly firing exceptions are surfaced. Priority and status are recomputed, an audit entry with the complete before/after exception sets is appended, and the AI summary and recommendation are regenerated against the new evaluation version. This is the mechanic that makes walkthrough step 7 verifiable rather than cosmetic.

**Terminology:**
- **Revalidation:** One evaluation whose `trigger` is `MANUAL_REVALIDATION`, `DOCUMENT_UPLOAD`, `RULE_CHANGE`, or `INGESTION` on an existing case. Every revalidation creates a new evaluation version; nothing is evaluated in place.
- **Reconciliation:** The comparison of the prior evaluation's exception set against the new one, keyed on `rule_id`. Produces three disjoint sets: `resolved`, `retained`, `new`.
- **Resolved-by-revalidation:** The terminal status applied to a prior-evaluation exception whose rule no longer fires. The row is preserved with `resolved_at`, `resolved_by_evaluation_id`, and `resolution_reason`.
- **Carry-forward:** The mechanism by which a retained exception keeps `first_detected_evaluation_id` and `opened_at` from its original detection, so age and "open since" survive revalidation.
- **Partial satisfaction:** A missing-document exception whose `missing_information` list shrinks but does not empty. The exception is `retained`, not `resolved`, and its evidence is refreshed to the shorter list.

**Sub-features:**
- Manual revalidation from the Shipment Review screen
- Automatic revalidation on evidence-changing events
- Three-way exception reconciliation with resolved-not-deleted semantics
- Carry-forward of open-since metadata
- Status and priority recomputation
- Before/after audit entry
- AI regeneration and change highlighting

**Process:**
1. Revalidation is triggered by one of four paths: a human clicking Revalidate on F18 (`POST /api/shipments/{id}/revalidate`), a successful simulated document upload (F10 §Process step 8), a re-ingestion of the entry (F1 §Process step 7), or an administrator applying a rule change with `revalidate_affected = true` (F15).
2. The service loads the case, verifies it is not `CLEARED` (terminal cases are never revalidated), and takes a transaction on the `cases` row so concurrent revalidations serialize.
3. The service snapshots the **before** state: the current evaluation version, its exception set with `{ exception_id, rule_id, exception_type, severity, sub_reason, status, missing_information }`, the case status, and the case priority.
4. The service invokes F4 with the trigger, producing a fresh `EvaluationResult`, and F5 persists a new evaluation version with its exceptions and evidence.
5. **Reconciliation** is computed by joining the before-set and after-set on `rule_id`:
   - `resolved` = rules in before-set with no finding in the after-set.
   - `retained` = rules present in both.
   - `new` = rules with a finding in the after-set that were absent from the before-set.
6. For each `resolved` exception, the service updates the prior-evaluation row to `status = 'RESOLVED_BY_REVALIDATION'`, sets `resolved_at`, `resolved_by_evaluation_id`, and `resolution_reason` (a structured value: `DOCUMENT_RECEIVED`, `HTS_CORRECTED`, `ORIGIN_ALIGNED`, `RULE_DISABLED`, `RULE_PARAMS_CHANGED`, or `CONDITION_NO_LONGER_APPLICABLE`, derived from the trigger and the rule's applicability outcome). **The row is never deleted, and its evidence is never modified** — the historical record of why it once fired stays intact and readable.
7. For each `retained` exception, the new-evaluation row inherits `first_detected_evaluation_id` and `opened_at` from the prior row, and the prior row is closed with `status = 'SUPERSEDED_BY_EVALUATION'` pointing at its successor. The new row carries refreshed evidence — critically, a missing-document exception whose required list is now partially satisfied shows the *shorter* `missing_information` list, so the specialist sees exactly what remains outstanding.
8. For each `new` exception, the row is created fresh with `first_detected_evaluation_id` = the current evaluation.
9. Priority is recomputed by F5 §Process step 6 against the post-revalidation `OPEN` set.
10. **Status recomputation** follows the table in §State transitions. Revalidation never clears a case and never bypasses approval: even when every exception resolves, the case moves to `IN_REVIEW`, not `CLEARED`. A human must still act, and clearance still requires supervisor approval (F11).
11. Any open document request whose requested document type is now satisfied is marked `FULFILLED` (F10), and requests that remain unsatisfied stay `OUTSTANDING`.
12. The service appends a `REVALIDATED` audit entry containing the complete before/after exception sets, the reconciliation classification per rule, the prior and new priority with basis, the prior and new status, the trigger, the actor, and the rule-set fingerprint of each evaluation.
13. The service generates a notification (F13) describing what changed in plain language, e.g. "1 exception resolved, 2 remain open".
14. The service invalidates and regenerates the AI summary (F7) and recommendation (F8) against the new evaluation version. Regeneration is asynchronous with respect to the response only in the sense that the response includes the reconciliation result immediately; the AI outputs are fetched by the UI on the next render and always resolve — via fallback if necessary — so the walkthrough never blocks.
15. The service returns a `RevalidationResult` that the UI uses to render the inline "what changed" indication on F18.

**Inputs:**
- `shipment_id` or `case_id` (path parameter, required)
- `trigger` (enum, server-determined, not client-supplied): `MANUAL_REVALIDATION` | `DOCUMENT_UPLOAD` | `RULE_CHANGE` | `INGESTION`
- `justification` (string, optional for manual revalidation, 0–1 000 chars): revalidation is not one of the five actions and does not require a justification, but a supplied note is recorded on the audit entry. *(Rationale: revalidation asserts nothing and decides nothing; it re-reads the rules. Mandatory justification applies to the five decision actions, F9.)*
- `If-Match-Case-Version` (integer, optional)
- Acting user from session (CS or SUP; ADM may revalidate only via the rule-change path)

**Outputs:**
- `RevalidationResult`:
  - `evaluation: { id, version, evaluated_at, trigger, rule_set_fingerprint }`
  - `resolved[]`: `{ exception_id, rule_id, exception_type, resolution_reason, was_open_since }`
  - `retained[]`: `{ exception_id, prior_exception_id, rule_id, exception_type, open_since, missing_information_before, missing_information_after, evidence_changed: boolean }`
  - `new[]`: `{ exception_id, rule_id, exception_type, severity, sub_reason }`
  - `priority: { before, after, basis }`, `status: { before, after }`
  - `open_exception_count: { before, after }`
  - `ai_regeneration: { summary_status, recommendation_status }` where status ∈ `REGENERATED` | `PENDING` | `FALLBACK`
- One `REVALIDATED` audit entry; one notification
- Updated case, exception, evidence, and document-request rows

**Validation:**
- Revalidation MUST be rejected when `cases.status = 'CLEARED'` (`CASE_TERMINAL`).
- Revalidation MUST create a new evaluation version even when nothing changes; a no-op revalidation is still recorded, because "we re-checked and nothing changed" is itself auditable information.
- Revalidation MUST NOT delete any `exceptions` or `evidence` row. An F21 test asserts that the total row count in both tables is monotonically non-decreasing across a revalidation.
- A `resolved` exception MUST retain its original evidence rows unmodified; only status and resolution metadata may be written.
- A `retained` exception MUST preserve `opened_at` and `first_detected_evaluation_id`; an F21 test asserts age continuity across revalidation.
- Revalidation MUST NOT transition a case to `CLEARED` or `PENDING_APPROVAL` under any circumstances.
- Revalidation MUST NOT alter `recommendations` or `approvals` rows. If the case is `PENDING_APPROVAL` when revalidated, the pending recommendation remains pending, and the audit entry records that the evidence changed while an approval was outstanding so the supervisor sees a "evidence changed since recommendation" warning on F19.
- Round-trip latency MUST be < 2 s with the seeded dataset (PRD §6), excluding the AI regeneration which resolves independently.
- Automatic revalidation MUST be idempotent with respect to the triggering event: a single document upload produces exactly one revalidation, guarded by the upload's transaction.

**State transitions caused:**

| Case status before | Post-revalidation open exceptions | Case status after | Rationale |
|---|---|---|---|
| `NEW` | ≥ 1 | `NEW` | Untouched work stays untouched; revalidation is not review |
| `NEW` | 0 | `IN_REVIEW` | Evidence now clean, but a human must still dispose of it |
| `IN_REVIEW` | any | `IN_REVIEW` | No change |
| `AWAITING_INFORMATION` | any, **and** every open document request is now fulfilled | `IN_REVIEW` | The information arrived; the case is unblocked and returns to active review |
| `AWAITING_INFORMATION` | any, with ≥ 1 request still outstanding | `AWAITING_INFORMATION` | Still blocked |
| `ON_HOLD` | any | `ON_HOLD` | A hold is a deliberate human decision; new evidence does not release it |
| `ESCALATED` | any | `ESCALATED` | Authority has been transferred; only a supervisor action changes this |
| `PENDING_APPROVAL` | any | `PENDING_APPROVAL` | Recommendation stands; supervisor is warned that evidence changed |
| `CLEARED` | n/a | rejected | Terminal |

**Walkthrough step 7, worked:** `SHP-2026-0007` at evaluation v1 has three `OPEN` exceptions and status `AWAITING_INFORMATION` (set by the step-5 document request). The step-6 upload attaches `CERTIFICATE_OF_ORIGIN` and triggers revalidation. At v2: `rule-doc-highvalue-coo` no longer fires → `resolved` with `resolution_reason = DOCUMENT_RECEIVED`; `rule-hts-completeness` and `rule-origin-manufacturer` still fire → `retained` with original `opened_at`; `new` is empty. Open count 3 → 2, priority stays `CRITICAL` (origin rule is `CRITICAL`), the outstanding request is `FULFILLED`, so status moves `AWAITING_INFORMATION → IN_REVIEW`. The audit entry records both exception sets in full; F18 renders "1 resolved, 2 retained" inline.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Shipment/case not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| Case is `CLEARED` | 409 | `CASE_TERMINAL` | "Cleared shipments cannot be revalidated" |
| Case modified concurrently | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |
| Role not permitted | 403 | `FORBIDDEN_ROLE` | "Role {role} may not revalidate shipments" |
| Rule engine failure during revalidation | 500 | `EVALUATION_FAILED` | "Revalidation failed; no changes were saved" |
| Evaluation version collision | 409 | `EVALUATION_VERSION_CONFLICT` | "Concurrent revalidation detected; retry" |
| Reconciliation produced an exception in two sets | 500 | `RECONCILIATION_INCONSISTENT` | "Internal error: exception classified in multiple sets" |
| Audit entry incomplete for the revalidation | 500 | `AUDIT_INCOMPLETE` | "Revalidation aborted: audit record would be incomplete" |

Because the entire revalidation runs in one transaction, any error above leaves the prior evaluation as the current one and no partial reconciliation persists.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/shipments/{id}/revalidate` | CS, SUP | Manual revalidation; returns `RevalidationResult` |
| GET | `/api/shipments/{id}/evaluations/{version}/diff/{other_version}` | CS, SUP, ADM | Before/after comparison of two evaluation versions |

Full schemas: `Y1b-api-actions.md` §Revalidation.

**Schema Surface (this feature):** writes `evaluations`, `exceptions` (new rows and terminal-status updates on prior rows), `evidence` (new rows only), `cases`, `document_requests`, `audit_entries`, `notifications`; invalidates `ai_outputs`. See `Y0a-schema-core.md` §Evaluation and `Y0b-schema-workflow-audit.md`.
---

## F7: AI Plain-Language Shipment Summary

**Priority:** P0 · **Category:** AI Assistance · **Walkthrough step:** 3

**Description:** F7 produces a request-time, plain-language narrative explaining what the shipment is and why it was flagged, so a specialist understands the case without reconstructing it from raw fields. Every claim is grounded in the captured evidence (F5), every summary carries provider/model attribution and generation timestamp, and every summary is cached against the evaluation version that produced it and regenerated on revalidation. A deterministic offline generator produces a complete, correct summary whenever the AI provider is disabled, unreachable, or slow — so the walkthrough completes with the provider off.

**Terminology:**
- **Evaluation-bound cache:** A summary is stored against `(cargo_entry_id, evaluation_id)`. A new evaluation version invalidates the previous summary rather than mutating it; prior summaries stay readable in the audit trail.
- **Grounding set:** The exact structured input given to the generator — shipment attributes, the open exception list, and the evidence rows. The generator has no other information source and no database access.
- **Fallback generator:** A pure, template-driven function that renders a summary from the grounding set with no network call. Deterministic: identical grounding set → byte-identical text.
- **Provenance:** `{ provider, model, generation_mode, generated_at, evaluation_version, grounding_fingerprint, latency_ms }` recorded on every summary and displayed with it.
- **Generation mode:** `LLM` | `FALLBACK_PROVIDER_DISABLED` | `FALLBACK_PROVIDER_ERROR` | `FALLBACK_TIMEOUT` | `FALLBACK_VALIDATION_FAILED`.

**Sub-features:**
- Grounding-set assembly from current evaluation state
- LLM generation with a constrained prompt
- Output validation (grounding check) before persistence
- Deterministic offline fallback generator
- Evaluation-version caching and regeneration
- Attribution metadata and AI labeling

**Process:**
1. The client requests `GET /api/shipments/{id}/ai/summary`. The service loads the case and its current evaluation.
2. If a cached `ai_outputs` row exists with `kind = 'SUMMARY'` and `evaluation_id` equal to the current evaluation, it is returned immediately with `cached = true`. This makes walkthrough step 3 instant on re-display and stable across a demo.
3. Otherwise the service assembles the grounding set:
   - Shipment: `shipment_id`, `importer_name`, `carrier_name`, `product_description`, `hts_code` (raw and normalized), `country_of_origin` (raw and ISO), `manufacturer.name`, `manufacturer.address.country` (raw and ISO), `shipment_value_usd`, `entry_date`.
   - Documents: received and missing types with provenance.
   - For each `OPEN` exception: `exception_type`, `sub_reason`, `severity`, rule `name`, rule `description`, `policy_reference`, and the full evidence rows with raw and normalized values.
   - Case: `status`, `priority`, `priority_basis`.
   - A `grounding_fingerprint` (SHA-256 of the canonically serialized grounding set) is computed and stored, so a reader can prove which state the text describes.
4. If `CARGODEMO_AI_PROVIDER` is `none`, the service goes straight to step 8 with `generation_mode = FALLBACK_PROVIDER_DISABLED`. No network call is attempted and no error is logged — disabled is a supported operating mode, not a failure.
5. Otherwise the service issues one provider call with the constrained prompt (§Prompt contract), a 10-second hard timeout, and no retries. A retry would risk exceeding the walkthrough's patience budget; the fallback is faster and always available.
6. On a provider response, the service validates the output (§Validation, grounding check). A response that fails validation is discarded and the fallback is used with `generation_mode = FALLBACK_VALIDATION_FAILED`; the rejected text is logged (without PII, of which there is none) for diagnosis but is never shown to a user.
7. On timeout or provider error, the fallback is used with the corresponding mode.
8. The fallback generator renders the summary from the grounding set (§Fallback algorithm).
9. The service persists an `ai_outputs` row: `{ kind: 'SUMMARY', cargo_entry_id, evaluation_id, content_json, provenance_json, grounding_fingerprint, generated_at }` and returns it. `ai_outputs` rows are append-only in the same sense as audit rows: superseded summaries are marked `superseded_by` rather than overwritten.
10. The UI renders the summary inside an "AI-generated" container with the provider, model, generation mode, and timestamp visible, and — when any fallback mode is active — a distinct "offline fallback summary" label plus the global degradation banner from F22.

**Prompt contract (LLM mode):**
- System instruction: the assistant explains a flagged cargo shipment to a CBP cargo specialist; it MUST use only the supplied structured facts; it MUST NOT invent regulations, values, dates, parties, or conclusions; it MUST NOT recommend or take an action (recommendations belong to F8); it MUST NOT state that the shipment is compliant or non-compliant as a legal conclusion.
- User content: the grounding set serialized as JSON.
- Requested output: strict JSON matching the summary schema (§Outputs). Temperature `0.2`, max output tokens `700`.
- No shipment data leaves the process in fallback mode, and no real or personal data exists to leave in LLM mode (PRD §6 Privacy).

**Fallback algorithm (deterministic, no network):**
1. **Overview sentence** — templated from shipment attributes: *"Shipment {shipment_id} is a consignment of {product_description} imported by {importer_name} via {carrier_name}, declared with a value of {value_formatted} and a country of origin of {country_of_origin}."*
2. **Flag sentence** — *"This shipment was flagged by {n} validation rule(s) and is currently {status} at {priority} priority."*
3. **Per-exception paragraph**, emitted in the deterministic exception order from F4 §Process step 3. Each paragraph is produced by the template registered for `(exception_type, sub_reason)`:
   - `MISSING_REQUIRED_DOCUMENT / DOCUMENT_NOT_RECEIVED`: *"{Rule name}: the following required document(s) have not been received — {missing list}. {Rule description} (Authority: {policy_reference}.)"*
   - `INVALID_HTS_CODE / INCOMPLETE_DIGITS`: *"{Rule name}: the declared HTS code {raw} resolves to {observed} significant digits, but a complete classification requires {expected}. The classification is incomplete, so duty treatment cannot be determined. (Authority: {policy_reference}.)"*
   - `INVALID_HTS_CODE / NON_NUMERIC` | `PLACEHOLDER` | `ODD_STRUCTURE` | `TOO_MANY_DIGITS` | `UNKNOWN_CODE` | `MISSING`: one dedicated template each, each naming the raw value and the specific defect.
   - `CONFLICTING_COUNTRY_OF_ORIGIN / ORIGIN_MISMATCH`: *"{Rule name}: the declared country of origin is {declared_raw} ({declared_iso}), but {comparison_field_label} states {comparison_raw} ({comparison_iso}). These do not agree, which calls the declared origin into question. (Authority: {policy_reference}.)"*
   - `CONFLICTING_COUNTRY_OF_ORIGIN / UNRESOLVABLE_DECLARED_ORIGIN` and `MISSING_COMPARISON_ORIGIN`: dedicated templates.
4. **Evidence sentence** — *"The evidence reviewed for these findings is: {field_path} = {raw_value}{, comparison}…"* rendered from the evidence rows in `display_order`.
5. **Closing sentence** — *"A cargo specialist must review this shipment and decide how to proceed. This summary was generated offline from the recorded evidence and does not include a recommendation."*
6. Every template renders only values present in the grounding set. A template with an unresolved placeholder is a defect; the renderer asserts that no `{…}` token survives and fails loudly rather than emitting a broken sentence.

Because a template exists for every `(exception_type, sub_reason)` pair defined in F4, and F4's sub-reason set is closed, the fallback can always produce a complete summary. An F21 test enumerates the cross-product and asserts template coverage.

**Inputs:**
- `shipment_id` (path, required)
- `regenerate` (query, boolean, optional, default `false`): forces regeneration even when a cached summary matches the current evaluation. Available to CS and SUP; recorded on the `ai_outputs` row as `regenerated_by_user_id`.
- Environment: `CARGODEMO_AI_PROVIDER` (`openai` | `anthropic` | `none`, default `none`), `CARGODEMO_AI_MODEL`, `CARGODEMO_AI_API_KEY`, `CARGODEMO_AI_TIMEOUT_MS` (default `10000`).

**Outputs:**

```
{
  "kind": "SUMMARY",
  "shipment_id": "SHP-2026-0007",
  "evaluation_version": 1,
  "content": {
    "overview": "string",
    "why_flagged": "string",
    "exception_narratives": [
      { "exception_id": "…", "exception_type": "…", "sub_reason": "…", "text": "string" }
    ],
    "evidence_reviewed": [
      { "field_path": "…", "raw_value": "…", "normalized_value": "…" }
    ],
    "closing": "string"
  },
  "provenance": {
    "provider": "deterministic-fallback",
    "model": "cargodemo-fallback-summary@1",
    "generation_mode": "FALLBACK_PROVIDER_DISABLED",
    "generated_at": "2026-09-08T14:03:11.412Z",
    "evaluation_version": 1,
    "grounding_fingerprint": "sha256:…",
    "latency_ms": 3,
    "is_ai_generated": true,
    "label": "AI-generated (offline fallback)"
  },
  "cached": false
}
```

**Validation:**
- The response MUST always carry a summary. F7 MUST NOT return `503`, an empty body, or a null summary under any provider condition — the fallback guarantees availability and an F21 test runs the entire walkthrough with `CARGODEMO_AI_PROVIDER=none`.
- **Grounding check (LLM output):** every numeric literal, currency amount, country name, HTS code, document type, and party name appearing in the generated text MUST appear in the grounding set. Detected by extracting candidate tokens (numbers, capitalized multi-word spans, ALL_CAPS codes) and matching them against the grounding set's value inventory plus a small allow-list of ordinary English words and rendered forms (e.g. `$85,000.00` matching `85000.00`). A single unmatched token fails validation and triggers the fallback.
- **Action-language check:** the generated text MUST NOT contain imperative resolution language reserved for F8 (`clear the shipment`, `approve`, `release`, `deny`, `seize`). A match fails validation.
- The summary MUST reference every `OPEN` exception; an exception narrative missing from the LLM output fails validation.
- Provenance MUST be complete: no summary is persisted or returned without `provider`, `model`, `generation_mode`, `generated_at`, and `grounding_fingerprint`.
- The summary MUST be visibly labeled as AI-generated wherever displayed (F16 shared component), and MUST NOT be rendered in the same visual container as human-authored justifications (F20).
- The cached summary MUST be invalidated when `cases.current_evaluation_id` changes; serving a summary whose `evaluation_id` differs from the case's current evaluation is a defect.
- p95 latency MUST be ≤ 5 s and the hard timeout MUST be 10 s (PRD §6); the fallback path MUST complete in < 50 ms.
- No summary text is ever treated as a decision, and `ai_outputs` rows MUST NOT be referenced as the `user_decision` field of any audit entry.

**State transitions caused:** None. F7 never changes case status, never creates an action, and cannot be invoked as an actor. Its outputs are inert.

**Error States:**

| Scenario | HTTP Status | Error Code | Behavior |
|---|---|---|---|
| Provider disabled | 200 | — | Fallback summary, `FALLBACK_PROVIDER_DISABLED` |
| Provider timeout (> 10 s) | 200 | — | Fallback summary, `FALLBACK_TIMEOUT` |
| Provider HTTP error / rate limit | 200 | — | Fallback summary, `FALLBACK_PROVIDER_ERROR`, provider status recorded in provenance |
| Provider returned unparseable JSON | 200 | — | Fallback summary, `FALLBACK_VALIDATION_FAILED` |
| Output failed the grounding check | 200 | — | Fallback summary, `FALLBACK_VALIDATION_FAILED`, rejected reason recorded |
| Shipment not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| No evaluation exists yet for the shipment | 409 | `NO_EVALUATION` | "Shipment has not been evaluated" |
| Fallback template missing for a sub-reason | 500 | `FALLBACK_TEMPLATE_MISSING` | "No summary template for {type}/{sub_reason}" *(prevented by the F21 coverage test)* |
| Unauthenticated | 401 | `UNAUTHENTICATED` | "No acting user" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/shipments/{id}/ai/summary` | CS, SUP, ADM | Retrieve (cached or generate) the summary |
| POST | `/api/shipments/{id}/ai/summary/regenerate` | CS, SUP | Force regeneration against the current evaluation |
| GET | `/api/shipments/{id}/ai/outputs` | CS, SUP, ADM | All AI outputs across evaluation versions, for the audit view |

Full schemas: `Y1c-api-admin.md` §AI assistance.

**Schema Surface (this feature):** writes `ai_outputs`; reads `cargo_entries`, `documents`, `evaluations`, `exceptions`, `evidence`, `rules`, `cases`. See `Y0b-schema-workflow-audit.md` §AI outputs.
---

## F8: AI Recommended Resolution with Confidence Level

**Priority:** P0 · **Category:** AI Assistance · **Walkthrough steps:** 4, 8

**Description:** F8 produces an advisory recommendation for how to resolve the exception: one of the five user actions, presented alongside the exception detected, the triggering rule and policy reference, the supporting evidence, the missing information, a plain-language rationale, and an explicit confidence level with a stated basis. The recommendation is inert — it is never executed, never pre-selected in the UI, and never recorded as a decision. It is recorded on the case so the audit record can show what the human was advised. A deterministic offline generator derives the recommendation from rule severity and sub-reason whenever the AI provider is unavailable, and the deterministic path is authoritative for the recommended *action* even in LLM mode.

**Terminology:**
- **Recommended action:** One of the five `00-header.md` §0.4.3 action codes. Never `APPROVE_CLEARANCE` — approval is a supervisor prerogative that the system does not recommend.
- **Confidence level:** `HIGH` | `MEDIUM` | `LOW`, always accompanied by a `confidence_basis` string stating *why* that level was assigned. A confidence level without a basis is invalid.
- **Deterministic action derivation:** The precedence table in §Action derivation. This runs in both LLM and fallback mode; the LLM may author the rationale prose but MUST NOT change the recommended action. This is what makes the recommendation reproducible and testable, and it means the demo behaves identically with the provider on or off.
- **Advisory record:** The persisted `ai_outputs` row with `kind = 'RECOMMENDATION'`, snapshotted onto every audit entry as the `ai_recommendation` field (F12).

**Sub-features:**
- Deterministic recommended-action derivation from the open exception set
- Confidence-level computation with stated basis
- Rationale generation (LLM-authored prose or fallback template)
- Presentation bundle: exception, rule, evidence, missing information
- Evaluation-version caching and regeneration
- Inertness guarantees and audit snapshotting

**Process:**
1. The client requests `GET /api/shipments/{id}/ai/recommendation`. The service loads the case and its current evaluation.
2. A cached `ai_outputs` row with `kind = 'RECOMMENDATION'` bound to the current evaluation is returned immediately with `cached = true`.
3. Otherwise the service assembles the same grounding set as F7 (F7 §Process step 3) plus the case's workflow context: current status, whether an open document request exists, whether a recommendation is already pending, and the acting user's role (so unavailable actions are not recommended).
4. The service computes the recommended action deterministically (§Action derivation). This step never calls the provider.
5. The service computes the confidence level deterministically (§Confidence derivation).
6. If the provider is enabled, the service requests a rationale only: the prompt supplies the grounding set **and the already-decided recommended action and confidence**, and asks for a plain-language justification traceable to the evidence. Timeout 10 s, no retries, temperature `0.2`.
7. The LLM rationale is validated with the same grounding check as F7, plus a check that it does not contradict the recommended action (it must not advocate a different action code, and must not use approval language). On failure, the fallback rationale template is used.
8. If the provider is disabled, times out, errors, or fails validation, the fallback rationale template renders the rationale from the evidence. The recommended action and confidence are unchanged, because they never came from the provider.
9. The service assembles the presentation bundle: for each `OPEN` exception, `{ exception_type, sub_reason, severity, rule_name, rule_description, policy_reference, evidence[], missing_information[] }`.
10. The service persists the `ai_outputs` row and returns it. The UI (F19) renders it with an AI-generated label, the confidence badge and basis, and an explicit statement that the AI recommends and the human decides. No action control is pre-selected and nothing is auto-submitted.
11. When a human subsequently takes an action (F9), the workflow service snapshots the current recommendation — action, confidence, basis, rationale, provenance, and `grounding_fingerprint` — into the audit entry's `ai_recommendation` field, including whether the human's chosen action **agreed** with it (`concurrence: AGREED | DIVERGED | NO_RECOMMENDATION_PRESENT | NOT_APPLICABLE`). Divergence is not an error; it is the point of the design, and recording it is what makes human authority demonstrable. `NOT_APPLICABLE` is recorded on `APPROVAL_DECISION` entries (F11 approve / reject / request-info): the recommended action is always one of the five user actions and never `APPROVE_CLEARANCE`, so an approval can neither agree nor disagree with it. The snapshot itself is still recorded in full, so the record still shows what the approver was advised.

### §Action derivation (deterministic, evaluated top-down; first match wins)

| # | Condition on the current `OPEN` exception set and case state | Recommended action |
|---|---|---|
| 1 | Case status is `PENDING_APPROVAL` | `SEND_FOR_SPECIALIST_REVIEW` *(rendered as "awaiting supervisor decision"; no new action is advised while approval is outstanding)* |
| 2 | Zero `OPEN` exceptions | `CLEAR_EXCEPTION` |
| 3 | ≥ 1 `OPEN` exception with `severity = CRITICAL` **and** case status ∉ {`ESCALATED`} | `ESCALATE_TO_SUPERVISOR` |
| 4 | ≥ 1 `OPEN` `MISSING_REQUIRED_DOCUMENT` exception with an unfulfilled requirement **and** no outstanding document request already covering every missing type | `REQUEST_INFORMATION` |
| 5 | ≥ 1 `OPEN` `MISSING_REQUIRED_DOCUMENT` exception **and** an outstanding request already covers every missing type | `PLACE_ON_HOLD` |
| 6 | Only `INVALID_HTS_CODE` exceptions remain, all with `sub_reason ∈ { INCOMPLETE_DIGITS, MISSING, PLACEHOLDER }` | `REQUEST_INFORMATION` |
| 7 | Only `INVALID_HTS_CODE` exceptions remain, other sub-reasons | `SEND_FOR_SPECIALIST_REVIEW` |
| 8 | Only `CONFLICTING_COUNTRY_OF_ORIGIN` exceptions remain, non-critical | `SEND_FOR_SPECIALIST_REVIEW` |
| 9 | Any other combination of ≥ 2 exception types | `SEND_FOR_SPECIALIST_REVIEW` |

*Canonical scenario at evaluation v1:* three open exceptions including `rule-origin-manufacturer` at `CRITICAL` → rule 3 matches → **`ESCALATE_TO_SUPERVISOR`**. The specialist in the walkthrough diverges from this advice by requesting the missing document instead, and the audit record captures `concurrence: DIVERGED` — a live, unscripted demonstration that the human decides. *(If a demo prefers the AI to advise the document request, the administrator can lower `rule-origin-manufacturer` severity to `HIGH` via F15, after which rule 4 matches and the recommendation becomes `REQUEST_INFORMATION`. Both paths are supported and neither is hardcoded.)*

**Role filtering:** if the derived action is not available to the acting user's role from the current state (F9's transition table), the recommendation is still returned with the derived action, but `available_to_current_role: false` and `unavailable_reason` are set, and the UI shows the action disabled with the reason. The recommendation is never silently rewritten to suit the viewer.

### §Confidence derivation (deterministic)

A score in `[0,1]` is computed and mapped to a level. Each factor contributes as stated; the score starts at `0.5`.

| Factor | Adjustment |
|---|---|
| Exactly one `OPEN` exception | `+0.20` |
| ≥ 3 `OPEN` exceptions | `−0.10` |
| Every `OPEN` exception has complete evidence (all required evidence kinds present per F5 §Validation) | `+0.15` |
| Any `OPEN` exception has `sub_reason` in the "unresolvable/ambiguous" set (`UNRESOLVABLE_DECLARED_ORIGIN`, `UNRESOLVABLE_COMPARISON_ORIGIN`, `MISSING_COMPARISON_ORIGIN`, `ODD_STRUCTURE`, `UNKNOWN_CODE`) | `−0.20` |
| The missing information is fully enumerable (every missing item names a concrete document type or a concrete digit count) | `+0.15` |
| Any exception at `CRITICAL` severity | `−0.05` (a critical finding warrants human scrutiny regardless of machine certainty) |
| An outstanding document request already exists for the same information | `−0.10` |
| Evidence changed since the current recommendation's grounding fingerprint | `−0.15` |

Mapping: `score >= 0.75 → HIGH`; `0.45 <= score < 0.75 → MEDIUM`; `score < 0.45 → LOW`.

`confidence_basis` is composed from the applied factors, e.g. *"Medium — three exceptions are open and one is critical, though all supporting evidence is complete and the missing information is fully enumerated."* The basis MUST name the factors that moved the score, so the confidence is inspectable rather than decorative.

**Inputs:**
- `shipment_id` (path, required)
- `regenerate` (query, boolean, optional, default `false`)
- Acting user from session (role affects `available_to_current_role`, never the derived action)
- Environment: same AI variables as F7

**Outputs:**

```
{
  "kind": "RECOMMENDATION",
  "shipment_id": "SHP-2026-0007",
  "evaluation_version": 1,
  "recommended_action": "ESCALATE_TO_SUPERVISOR",
  "confidence": { "level": "MEDIUM", "score": 0.55, "basis": "…", "factors": [ { "factor": "…", "adjustment": -0.10 } ] },
  "rationale": "string",
  "available_to_current_role": true,
  "unavailable_reason": null,
  "presentation": {
    "exceptions": [
      {
        "exception_id": "…", "exception_type": "…", "sub_reason": "…", "severity": "…",
        "rule": { "id": "rule-origin-manufacturer", "name": "…", "description": "…", "policy_reference": "19 CFR 134.1" },
        "evidence": [ { "kind": "OBSERVED", "field_path": "country_of_origin", "raw_value": "Malaysia", "normalized_value": "MY" } ],
        "missing_information": [ ]
      }
    ]
  },
  "governance_notice": "This is an AI-generated recommendation. It has not been acted on. A named official must decide.",
  "provenance": { "provider": "…", "model": "…", "generation_mode": "…", "generated_at": "…", "grounding_fingerprint": "sha256:…", "action_source": "DETERMINISTIC", "rationale_source": "LLM|FALLBACK", "is_ai_generated": true },
  "cached": false
}
```

**Validation:**
- `recommended_action` MUST be one of the five action codes. It MUST NOT be `APPROVE_CLEARANCE`, `REJECT_RECOMMENDATION`, or any non-action string.
- `confidence.level` MUST be present with a non-empty `confidence_basis`; a recommendation without a basis is rejected before persistence (`CONFIDENCE_BASIS_REQUIRED`).
- `action_source` MUST always be `DETERMINISTIC`. An implementation that lets the provider choose the action is a defect; an F21 test runs the same shipment with the provider enabled and disabled and asserts identical `recommended_action` and `confidence.level`.
- The rationale MUST pass the F7 grounding check and MUST NOT advocate an action other than `recommended_action`.
- The response MUST always be produced; F8 never returns `503`. The full walkthrough MUST complete with `CARGODEMO_AI_PROVIDER=none`.
- The recommendation MUST be inert: F8 MUST NOT write to `cases`, `case_actions`, `recommendations`, or `approvals`, and MUST NOT enqueue any deferred execution. An F21 test asserts that requesting a recommendation leaves `cases.updated_at` and `cases.status` unchanged.
- No audit entry may have `actor_kind = 'AI'` together with a non-null `user_decision` (`00-header.md` §0.4.7).
- Every audit entry for a human action MUST carry the `ai_recommendation` snapshot with `concurrence` computed; when no recommendation had been generated at action time, the field is the explicit object `{ present: false, reason: "NOT_GENERATED" }` rather than `null`, so the eight-field completeness rule of F12 is satisfiable and the absence is itself recorded.
- Presentation bundle MUST include the triggering rule and its `policy_reference` for every open exception — the resolution screen must never show a recommendation without showing its authority.
- p95 latency ≤ 5 s; hard timeout 10 s; fallback path < 50 ms.

**State transitions caused:** None, by construction. F8 is read-only with respect to workflow state.

**Error States:**

| Scenario | HTTP Status | Error Code | Behavior |
|---|---|---|---|
| Provider disabled/timeout/error/invalid output | 200 | — | Deterministic action + fallback rationale, mode recorded |
| Shipment not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| Shipment never evaluated | 409 | `NO_EVALUATION` | "Shipment has not been evaluated" |
| Derived action not in the canonical five | 500 | `RECOMMENDATION_ACTION_INVALID` | "Derived recommendation is not a supported user action" |
| Confidence computed without a basis | 500 | `CONFIDENCE_BASIS_REQUIRED` | "Recommendation confidence requires a stated basis" |
| Rationale contradicts the derived action | 200 | — | Falls back to the template rationale; contradiction logged |
| Unauthenticated | 401 | `UNAUTHENTICATED` | "No acting user" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/shipments/{id}/ai/recommendation` | CS, SUP, ADM | Retrieve (cached or generate) the recommendation |
| POST | `/api/shipments/{id}/ai/recommendation/regenerate` | CS, SUP | Force regeneration against the current evaluation |

Full schemas: `Y1c-api-admin.md` §AI assistance.

**Schema Surface (this feature):** writes `ai_outputs` (`kind = 'RECOMMENDATION'`); reads the same tables as F7 plus `document_requests`, `recommendations`. Snapshotted into `audit_entries.ai_recommendation_json` by F9/F11. See `Y0b-schema-workflow-audit.md`.
---

## F9 (Part 1 of 2): Exception Case Workflow — Statuses & State Machine

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 8

**Description:** F9 is the state machine governing a flagged shipment from queue entry to final disposition. This chunk specifies the seven statuses, the complete transition table keyed by `(from_status, action, role)`, the guards that qualify individual transitions, and the invariants that make the governance claims enforceable. The five actions themselves — their inputs, validation, side effects, and errors — are specified in `F09b-case-workflow-actions.md`.

**Terminology:**
- **Transition:** A `(from_status, action, actor_role) → to_status` triple that the server permits. Any triple absent from the table is invalid and is rejected server-side with a reason naming both the current status and the attempted action.
- **Guard:** An additional predicate a permitted transition must satisfy (e.g. "the recommendation's author is not the acting user"). A failed guard is a distinct error from an invalid transition, because the two mean different things to the user.
- **Self-loop:** A transition whose `from` and `to` status are equal. Only `AWAITING_INFORMATION --REQUEST_INFORMATION--> AWAITING_INFORMATION` is permitted, because a second document may legitimately be requested while the first is outstanding.
- **Terminal status:** `CLEARED`. No transition leaves it, and no action, ingestion, revalidation, or rule change may modify a cleared case.
- **Authority transfer:** The property of `ESCALATED` that specialists lose the ability to act on the case. This is what makes escalation meaningful rather than a label.

**Sub-features:**
- Seven canonical statuses with defined semantics
- The complete role-aware transition table
- Guards: self-approval block, terminal block, hold-release restriction, escalation authority transfer
- Invariants asserted by the test suite
- Server-side rejection with explanatory reasons

### §1 Status semantics

| Status | Entered when | Who may act | Exits to |
|---|---|---|---|
| `NEW` | Ingestion/seed flags the shipment (F5) | CS, SUP | `IN_REVIEW`, `AWAITING_INFORMATION`, `PENDING_APPROVAL`, `ON_HOLD`, `ESCALATED` |
| `IN_REVIEW` | A human takes the case up, information arrives, a hold is released, or a recommendation is rejected | CS, SUP | `AWAITING_INFORMATION`, `PENDING_APPROVAL`, `ON_HOLD`, `ESCALATED` |
| `AWAITING_INFORMATION` | A document request is opened | CS, SUP | `IN_REVIEW`, `AWAITING_INFORMATION` (self), `PENDING_APPROVAL`, `ON_HOLD`, `ESCALATED` |
| `ON_HOLD` | A human parks the case | CS (limited), SUP | `IN_REVIEW`, `AWAITING_INFORMATION`, `PENDING_APPROVAL` (SUP only), `ESCALATED` |
| `ESCALATED` | A human transfers authority upward | **SUP only** | `IN_REVIEW`, `AWAITING_INFORMATION`, `PENDING_APPROVAL`, `ON_HOLD` |
| `PENDING_APPROVAL` | A clearance recommendation is submitted | **SUP only, and not the recommender** | `CLEARED`, `IN_REVIEW`, `AWAITING_INFORMATION`, `ON_HOLD` |
| `CLEARED` | A distinct supervisor approves the recommendation | nobody | — (terminal) |

### §2 Complete transition table

Roles: **CS** = Cargo Specialist, **SUP** = Supervisor. **ADM** (System Administrator) appears in no row of this table: the administrator cannot adjudicate and is denied on every workflow action with `FORBIDDEN_ROLE` (F14).

| # | From | Action | CS | SUP | To | Guards |
|---|---|---|---|---|---|---|
| T01 | `NEW` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC |
| T02 | `NEW` | `SEND_FOR_SPECIALIST_REVIEW` | ✅ | ✅ | `IN_REVIEW` | — |
| T03 | `NEW` | `CLEAR_EXCEPTION` | ✅ | ✅ | `PENDING_APPROVAL` | G-REC |
| T04 | `NEW` | `PLACE_ON_HOLD` | ✅ | ✅ | `ON_HOLD` | — |
| T05 | `NEW` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T06 | `IN_REVIEW` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC |
| T07 | `IN_REVIEW` | `SEND_FOR_SPECIALIST_REVIEW` | ❌ | ❌ | — | invalid: already in review (`TRANSITION_REDUNDANT`) |
| T08 | `IN_REVIEW` | `CLEAR_EXCEPTION` | ✅ | ✅ | `PENDING_APPROVAL` | G-REC |
| T09 | `IN_REVIEW` | `PLACE_ON_HOLD` | ✅ | ✅ | `ON_HOLD` | — |
| T10 | `IN_REVIEW` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T11 | `AWAITING_INFORMATION` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC, G-DUP |
| T12 | `AWAITING_INFORMATION` | `SEND_FOR_SPECIALIST_REVIEW` | ✅ | ✅ | `IN_REVIEW` | G-CANCEL (outstanding requests are cancelled with a reason) |
| T13 | `AWAITING_INFORMATION` | `CLEAR_EXCEPTION` | ✅ | ✅ | `PENDING_APPROVAL` | G-REC, G-ACK (must acknowledge outstanding requests) |
| T14 | `AWAITING_INFORMATION` | `PLACE_ON_HOLD` | ✅ | ✅ | `ON_HOLD` | — |
| T15 | `AWAITING_INFORMATION` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T16 | `ON_HOLD` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC |
| T17 | `ON_HOLD` | `SEND_FOR_SPECIALIST_REVIEW` | ✅ | ✅ | `IN_REVIEW` | — (this is the release-from-hold path) |
| T18 | `ON_HOLD` | `CLEAR_EXCEPTION` | ❌ | ✅ | `PENDING_APPROVAL` | G-REC. *A held case must be released into review before a specialist may propose clearing it; a supervisor may propose directly.* |
| T19 | `ON_HOLD` | `PLACE_ON_HOLD` | ❌ | ❌ | — | invalid: already on hold (`TRANSITION_REDUNDANT`) |
| T20 | `ON_HOLD` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T21 | `ESCALATED` | `REQUEST_INFORMATION` | ❌ | ✅ | `AWAITING_INFORMATION` | G-DOC, G-AUTH |
| T22 | `ESCALATED` | `SEND_FOR_SPECIALIST_REVIEW` | ❌ | ✅ | `IN_REVIEW` | G-AUTH (this is the de-escalation path) |
| T23 | `ESCALATED` | `CLEAR_EXCEPTION` | ❌ | ✅ | `PENDING_APPROVAL` | G-REC, G-AUTH |
| T24 | `ESCALATED` | `PLACE_ON_HOLD` | ❌ | ✅ | `ON_HOLD` | G-AUTH |
| T25 | `ESCALATED` | `ESCALATE_TO_SUPERVISOR` | ❌ | ❌ | — | invalid: already escalated (`TRANSITION_REDUNDANT`) |
| T26 | `PENDING_APPROVAL` | `REQUEST_INFORMATION` | ❌ | ✅ | `AWAITING_INFORMATION` | G-DOC, G-SOD, G-WITHDRAW (pending recommendation → `RETURNED_FOR_INFORMATION`) |
| T27 | `PENDING_APPROVAL` | `SEND_FOR_SPECIALIST_REVIEW` | ❌ | ❌ | — | invalid while approval is outstanding (`APPROVAL_PENDING`) |
| T28 | `PENDING_APPROVAL` | `CLEAR_EXCEPTION` | ❌ | ❌ | — | invalid: a recommendation already exists (`RECOMMENDATION_ALREADY_PENDING`) |
| T29 | `PENDING_APPROVAL` | `PLACE_ON_HOLD` | ❌ | ✅ | `ON_HOLD` | G-SOD, G-WITHDRAW (recommendation → `WITHDRAWN`) |
| T30 | `PENDING_APPROVAL` | `ESCALATE_TO_SUPERVISOR` | ❌ | ❌ | — | invalid: already at supervisor authority (`TRANSITION_REDUNDANT`) |
| T31 | `PENDING_APPROVAL` | `APPROVE_CLEARANCE` *(F11, not one of the five)* | ❌ | ✅ | `CLEARED` | G-SOD, G-AUDIT |
| T32 | `PENDING_APPROVAL` | `REJECT_RECOMMENDATION` *(F11)* | ❌ | ✅ | `IN_REVIEW` | G-SOD |
| T33 | `CLEARED` | *any* | ❌ | ❌ | — | terminal (`CASE_TERMINAL`) |

**Reachability of `CLEARED`:** exactly one row (T31) targets `CLEARED`, it is available only to `SUPERVISOR`, and it is gated by G-SOD and G-AUDIT. There is no other path, no administrative override, no ingestion path, no revalidation path, and no bulk operation. This single-row property is asserted directly by an F21 test that enumerates the transition table and counts rows with `to_status = 'CLEARED'`.

### §3 Guards

| Guard | Applies to | Predicate | Error on failure |
|---|---|---|---|
| **G-DOC** | `REQUEST_INFORMATION` | The request names ≥ 1 document type; each named type is either listed in some open exception's `missing_information` or accompanied by `justify_unlisted_document = true` with a justification ≥ 20 chars | `DOCUMENT_TYPE_NOT_REQUIRED` |
| **G-DUP** | `REQUEST_INFORMATION` from `AWAITING_INFORMATION` | The new request MUST NOT duplicate an `OUTSTANDING` request for the same document type | `DUPLICATE_DOCUMENT_REQUEST` |
| **G-REC** | `CLEAR_EXCEPTION` | No `PENDING` recommendation exists on the case; the request enumerates the `exception_ids` being proposed for clearance and they match the current open set | `RECOMMENDATION_ALREADY_PENDING`, `EXCEPTION_SET_STALE` |
| **G-ACK** | `CLEAR_EXCEPTION` from `AWAITING_INFORMATION` | `acknowledge_outstanding_requests = true` must be supplied, and outstanding requests are marked `CANCELLED_BY_CLEARANCE` with the justification | `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` |
| **G-CANCEL** | `SEND_FOR_SPECIALIST_REVIEW` from `AWAITING_INFORMATION` | Outstanding requests are cancelled with `cancellation_reason` from the justification; recorded on the audit entry | — (always satisfiable) |
| **G-AUTH** | any action from `ESCALATED` | `acting_role = SUPERVISOR` | `ESCALATED_REQUIRES_SUPERVISOR` |
| **G-SOD** | T26, T29, T31, T32 | `acting_user_id != recommendation.recommended_by_user_id` | `SELF_APPROVAL_BLOCKED` |
| **G-WITHDRAW** | T26, T29 | The pending recommendation is closed with a terminal status and a reason before the transition commits | — (always satisfiable) |
| **G-AUDIT** | T31 | The audit entry being written satisfies the eight-field completeness rule, including a non-null `approving_official` (F12) | `AUDIT_INCOMPLETE` |

### §4 Invariants (each asserted by an F21 test)

- **I1 — Single clearance path.** Exactly one transition targets `CLEARED`, it requires `SUPERVISOR`, and it requires an approving official distinct from the recommender.
- **I2 — No AI actor.** No transition may be executed with `actor_kind = 'AI'` or `actor_kind = 'SYSTEM'`. All 33 rows require a `HUMAN` actor with a resolvable `user_id`. Ingestion, seeding, and revalidation write `SYSTEM` audit entries but execute **no** transition row, except the seed script which executes rows as a seeded human user (F2 §Process step 7).
- **I3 — Mandatory justification.** Every executed transition carries a non-empty justification of at least 10 characters. There is no transition path that omits it.
- **I4 — Audit-per-transition.** Every executed transition writes exactly one `audit_entries` row and exactly one `notifications` row, in the same transaction. Counting audit entries of action class must equal counting `case_actions` rows, always.
- **I5 — Status is always canonical.** `cases.status` is one of the seven codes at all times; there is no null, intermediate, or transient status.
- **I6 — Terminal immutability.** After `CLEARED`, `cases.status`, `cases.priority`, the recommendation, and the approval are immutable. Every mutating route returns `CASE_TERMINAL`.
- **I7 — Escalation transfers authority.** From `ESCALATED`, every specialist action is denied with `ESCALATED_REQUIRES_SUPERVISOR`, which is a `403`, not a `409` — it is an authority problem, not a state problem.
- **I8 — Redundant transitions are rejected, not absorbed.** Placing an already-held case on hold returns `409 TRANSITION_REDUNDANT` rather than silently succeeding, so the audit trail never contains a no-op decision.
- **I9 — Revalidation never transitions to `CLEARED` or `PENDING_APPROVAL`** (F6 §State transitions).
- **I10 — Denials are recorded.** Every rejected action (invalid transition, failed guard, role denial) writes an `ACCESS_DENIED` or `TRANSITION_REJECTED` audit entry with the acting user, attempted action, current status, and reason. A rejected attempt is itself governance-relevant information.

### §5 Reason strings surfaced to the UI

When the UI asks what a role may do from the current state (`GET /api/cases/{id}/available-actions`), the server returns every one of the five actions with `available: boolean` and, when false, a `reason` drawn from this fixed set — satisfying PRD §6 Usability ("every disabled action states why it is unavailable"):

| Reason code | Displayed text |
|---|---|
| `ROLE_NOT_PERMITTED` | "Your role (Cargo Specialist) cannot take this action." |
| `ESCALATED_REQUIRES_SUPERVISOR` | "This case has been escalated; only a Supervisor can act on it." |
| `TRANSITION_REDUNDANT` | "The case is already in this state." |
| `APPROVAL_PENDING` | "A clearance recommendation is awaiting supervisor decision." |
| `RECOMMENDATION_ALREADY_PENDING` | "A clearance recommendation has already been submitted." |
| `SELF_APPROVAL_BLOCKED` | "You submitted this recommendation and cannot decide on it." |
| `CASE_TERMINAL` | "This shipment has been cleared and can no longer be changed." |
| `HOLD_REQUIRES_RELEASE` | "Release the case from hold before recommending clearance." |
| `NO_MISSING_DOCUMENTS` | "There are no outstanding document requirements to request." |

**Error States (state-machine level; action-level errors are in F09b):**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Triple absent from the transition table | 409 | `INVALID_TRANSITION` | "Cannot {action} a case in status {status}" |
| Redundant transition | 409 | `TRANSITION_REDUNDANT` | "Case is already {status}" |
| Specialist acting on an escalated case | 403 | `ESCALATED_REQUIRES_SUPERVISOR` | "Only a Supervisor may act on an escalated case" |
| Any action on a cleared case | 409 | `CASE_TERMINAL` | "Shipment {id} is Cleared and cannot be changed" |
| Administrator attempting any workflow action | 403 | `FORBIDDEN_ROLE` | "System Administrators do not adjudicate shipments" |
| Approval action by the recommender | 403 | `SELF_APPROVAL_BLOCKED` | "You cannot approve your own recommendation" |
| Concurrent transition | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |

**API Surface (this part):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/cases/{id}/available-actions` | CS, SUP, ADM | The five actions with availability and reason for the acting role and current state |
| GET | `/api/workflow/transitions` | CS, SUP, ADM | The transition table as data, used by the UI and by the F21 invariant tests |

**Schema Surface (this part):** reads/writes `cases.status`, `cases.updated_at`; writes `case_actions`, `audit_entries`, `notifications`. See `Y0b-schema-workflow-audit.md` §Cases and §Actions.
---

## F9 (Part 2 of 2): The Five User Actions

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 8

**Description:** This chunk specifies each of the five human-initiated actions in detail: its purpose, request payload, action-specific validation, side effects beyond the status transition, the audit and notification it produces, and its error states. All five share a single endpoint shape and a single execution pipeline, described in §Common execution pipeline. The transition table and guards they must satisfy are in `F09a-case-workflow-state-machine.md`.

**Terminology:**
- **Action request:** The body posted to `POST /api/cases/{case_id}/actions`. Discriminated by `action`.
- **Justification:** Mandatory free-text authored by the acting human, 10–2 000 characters. It is the human's stated reasoning and is stored verbatim; it is never generated, prefilled, or defaulted by the AI or the UI.
- **Action record:** A `case_actions` row — the durable fact that a named human took a named action from a named state at a named time.
- **Side effect:** A domain write beyond the status change, e.g. creating a document request or a clearance recommendation.

**Sub-features:**
- `REQUEST_INFORMATION`
- `SEND_FOR_SPECIALIST_REVIEW`
- `CLEAR_EXCEPTION`
- `PLACE_ON_HOLD`
- `ESCALATE_TO_SUPERVISOR`
- Common execution pipeline with transactional audit + notification coupling

### §1 Common execution pipeline

1. **Authenticate** — resolve the acting user from the session; `401 UNAUTHENTICATED` if absent (F3).
2. **Validate the body** against the action's discriminated schema; `422 VALIDATION_FAILED` with `field_errors`.
3. **Load and lock** the case row inside a transaction; `404` if absent; check `If-Match-Case-Version`; `409 CASE_VERSION_CONFLICT` on mismatch.
4. **Terminal check** — `409 CASE_TERMINAL` if `status = CLEARED`.
5. **Role check** — is the action permitted to `acting_role` at all (F14)? `403 FORBIDDEN_ROLE`.
6. **Transition lookup** — is `(status, action, role)` in the table (F09a §2)? `409 INVALID_TRANSITION` / `409 TRANSITION_REDUNDANT` / `403 ESCALATED_REQUIRES_SUPERVISOR`.
7. **Guards** — evaluate the guards attached to the matched row; each failure returns its own code (F09a §3).
8. **Snapshot the AI recommendation** — read the current `ai_outputs` recommendation for the case's current evaluation and compute `concurrence` (F8 §Process step 11). If none exists, snapshot `{ present: false, reason: "NOT_GENERATED" }`.
9. **Snapshot the evidence reviewed** — the full open exception set with all evidence rows at the moment of decision. This snapshot is stored on the audit entry, not merely referenced, so the audit record remains complete even after later revalidations change the live exception set.
10. **Apply side effects** for the specific action (§2–§6).
11. **Write the `case_actions` row** and update `cases.status`, `cases.updated_at`, and `cases.last_action_id`.
12. **Write the audit entry** with all eight required fields; the completeness guard runs before commit (F12) and aborts with `500 AUDIT_INCOMPLETE` if any field is absent.
13. **Generate the notification** (F13) and link it to the audit entry, populating the audit entry's `generated_notification` field.
14. **Commit.** All of steps 10–13 are in one transaction — a state change without its audit entry and notification is structurally impossible.
15. **Respond** with the `ActionResult`, including the new status, the available actions from the new state, and the created side-effect resources.

Steps 12–13 have a mutual dependency (the audit entry references the notification and the notification references the audit entry). It is resolved by inserting the audit entry with a null `notification_id`, inserting the notification with the audit entry's ID, then performing the single permitted `UPDATE` on `audit_entries` — a `notification_id`-only update, allowed by the append-only trigger's `WHEN` clause, which permits exactly this one column to transition from null to non-null once and rejects every other update (see `Y0b` §Audit).

### §2 `REQUEST_INFORMATION` — Request additional information

**Purpose:** Ask for one or more specific missing documents. Walkthrough step 5.

**Additional inputs:**
- `document_types` (string[], required, 1–10 items): each `^[A-Z0-9_]{3,60}$`
- `requested_from` (string, optional, ≤ 200 chars): a synthetic addressee label such as `"Importer of record"`. Purely descriptive; nothing is transmitted (F13).
- `due_by` (ISO date, optional): informational only; no scheduler exists (PRD §5.9 excludes background jobs).
- `justify_unlisted_document` (boolean, optional, default `false`): required `true` when a requested type is not named in any open exception's `missing_information`.
- `acknowledge_outstanding_requests` — not used by this action.

**Validation:** G-DOC and G-DUP (F09a §3). Each `document_type` is normalized to upper snake case before comparison and storage. Requesting a document type that is already `RECEIVED` on the shipment is rejected with `DOCUMENT_ALREADY_RECEIVED`.

**Side effects:** creates one `document_requests` row per document type with `status = 'OUTSTANDING'`, `requested_by_user_id`, `requested_at`, `linked_exception_id` (the open exception whose `missing_information` names the type, when determinable), and `linked_rule_id`.

**Transition:** → `AWAITING_INFORMATION` (T01, T06, T11, T16, T21, T26).

**Notification:** recipient role `CARGO_SPECIALIST` (and `SUPERVISOR` when the case is escalated or pending approval), subject *"Document requested for {shipment_id}"*.

### §3 `SEND_FOR_SPECIALIST_REVIEW` — Send for specialist review

**Purpose:** Put the case into active review — taking up a new case, releasing a hold, de-escalating, or returning from information-gathering.

**Additional inputs:**
- `assign_to_user_id` (string, optional): a user with role `CARGO_SPECIALIST`. When omitted, the case is unassigned and appears in the general queue.
- `cancel_outstanding_requests` (boolean, optional, default `true` when transitioning from `AWAITING_INFORMATION`): outstanding requests are marked `CANCELLED` with the justification as the cancellation reason.

**Validation:** `assign_to_user_id`, if present, MUST resolve to an active user with role `CARGO_SPECIALIST`; otherwise `ASSIGNEE_INVALID`. A supervisor may assign; a specialist may assign only to themselves (`ASSIGNMENT_NOT_PERMITTED` otherwise) — a specialist can pick up work but cannot push it onto a colleague.

**Side effects:** sets `cases.assigned_to_user_id`; cancels outstanding document requests when applicable.

**Transition:** → `IN_REVIEW` (T02, T12, T17, T22). Invalid from `IN_REVIEW` (T07), `PENDING_APPROVAL` (T27).

**Notification:** recipient role `CARGO_SPECIALIST`, subject *"{shipment_id} assigned for specialist review"*.

### §4 `CLEAR_EXCEPTION` — Clear exception (recommend clearance)

**Purpose:** Propose that the shipment be cleared. Walkthrough step 8. **This action never clears anything by itself.** It creates a clearance recommendation and moves the case to `PENDING_APPROVAL`, where a distinct supervisor must approve (F11). The action is named "clear exception" because that is the operator-facing vocabulary mandated by the requirements; its effect is a recommendation, and the UI labels the submit control "Recommend clearance" with an explicit note that supervisor approval is required.

**Additional inputs:**
- `exception_ids` (string[], required, 0–20 items): the open exceptions being proposed for clearance. MUST equal the case's current open exception set exactly — a subset is rejected, because a partial clearance is not a supported disposition and silently clearing unlisted exceptions would break the audit claim. An empty array is valid only when the open set is empty.
- `resolution_basis` (enum, required): `EXCEPTIONS_RESOLVED` (evidence now satisfies the rules), `EXCEPTIONS_ACCEPTED` (still firing, but the reviewer judges them non-actionable), or `MIXED`.
- `acknowledge_outstanding_requests` (boolean, conditionally required): `true` when transitioning from `AWAITING_INFORMATION` (G-ACK).
- `justification` (inherited, required): when `resolution_basis` is `EXCEPTIONS_ACCEPTED` or `MIXED`, the minimum length is raised to 40 characters — accepting a still-firing exception demands a fuller stated reason than confirming a resolved one.

**Validation:** G-REC, G-ACK. `exception_ids` MUST match the current open set (`EXCEPTION_SET_STALE` otherwise, which is also what a concurrent revalidation produces). No `PENDING` recommendation may exist. From `ON_HOLD`, specialists are denied (T18) with reason `HOLD_REQUIRES_RELEASE`.

**Side effects:** creates a `recommendations` row `{ case_id, evaluation_id, recommended_by_user_id, recommended_by_name, recommended_by_role, recommended_action: 'CLEAR', resolution_basis, exception_ids_json, justification, ai_recommendation_snapshot_json, concurrence, status: 'PENDING', created_at }`.

**Transition:** → `PENDING_APPROVAL` (T03, T08, T13, T18, T23).

**Notification:** recipient role `SUPERVISOR`, subject *"Clearance recommendation awaiting approval — {shipment_id}"*, body naming the recommender, the exceptions, and the justification.

### §5 `PLACE_ON_HOLD` — Place on hold

**Purpose:** Park the case deliberately, with a stated reason, so it is visibly not being worked rather than silently stale.

**Additional inputs:**
- `hold_reason` (enum, required): `AWAITING_EXTERNAL_INPUT` | `PENDING_POLICY_GUIDANCE` | `RESOURCE_CONSTRAINT` | `OTHER`
- `hold_reason_detail` (string, required when `hold_reason = OTHER`, 10–500 chars)
- `review_by` (ISO date, optional): informational only

**Validation:** rejected from `ON_HOLD` (T19, `TRANSITION_REDUNDANT`). From `PENDING_APPROVAL` (T29) it is supervisor-only, subject to G-SOD, and withdraws the pending recommendation with `status = 'WITHDRAWN'` and `withdrawal_reason` from the justification.

**Side effects:** sets `cases.hold_reason`, `cases.hold_placed_by_user_id`, `cases.hold_placed_at`; withdraws a pending recommendation when applicable. Outstanding document requests are **retained** as `OUTSTANDING` — a hold does not cancel a request; the information may still arrive.

**Transition:** → `ON_HOLD` (T04, T09, T14, T24, T29).

**Notification:** recipient roles `CARGO_SPECIALIST` and `SUPERVISOR`, subject *"{shipment_id} placed on hold"*.

### §6 `ESCALATE_TO_SUPERVISOR` — Escalate to supervisor

**Purpose:** Transfer authority for the case upward. After escalation, specialists may no longer act on it (F09a I7).

**Additional inputs:**
- `escalation_reason` (enum, required): `POLICY_AMBIGUITY` | `HIGH_VALUE` | `REPEAT_OFFENDER_PATTERN` | `CONFLICTING_EVIDENCE` | `OTHER`
- `escalation_reason_detail` (string, required when `OTHER`, 10–500 chars)
- `escalate_to_user_id` (string, optional): a specific supervisor. When omitted, the case is escalated to the supervisor pool and appears for all supervisors.

**Validation:** rejected from `ESCALATED` (T25) and `PENDING_APPROVAL` (T30). `escalate_to_user_id`, if present, MUST resolve to an active `SUPERVISOR` (`ESCALATION_TARGET_INVALID`).

**Side effects:** sets `cases.escalated_to_user_id`, `cases.escalated_by_user_id`, `cases.escalated_at`, `cases.escalation_reason`. Outstanding document requests are retained.

**Transition:** → `ESCALATED` (T05, T10, T15, T20).

**Notification:** recipient role `SUPERVISOR` (or the specific escalation target), subject *"Escalated: {shipment_id}"*, body naming the escalating specialist, the reason, and the open exceptions.

### §7 Request and response shapes

**Request** — `POST /api/cases/{case_id}/actions`, headers `X-CargoDemo-Session`, `Idempotency-Key`, `If-Match-Case-Version`:

```
{
  "action": "REQUEST_INFORMATION",
  "justification": "Certificate of origin is required to substantiate the declared Malaysian origin given the Chinese manufacturer address.",
  "document_types": ["CERTIFICATE_OF_ORIGIN"],
  "requested_from": "Importer of record"
}
```

**Response** — `201 Created`:

```
{
  "action_id": "act-…",
  "case_id": "case-…",
  "shipment_id": "SHP-2026-0007",
  "action": "REQUEST_INFORMATION",
  "status": { "before": "NEW", "after": "AWAITING_INFORMATION" },
  "acting_user": { "id": "usr-cs-001", "name": "Marisol Reyes", "role": "CARGO_SPECIALIST" },
  "justification": "…",
  "occurred_at": "2026-09-08T14:06:22.104Z",
  "ai_recommendation": { "present": true, "recommended_action": "ESCALATE_TO_SUPERVISOR", "confidence": "MEDIUM", "concurrence": "DIVERGED" },
  "side_effects": { "document_requests": [ { "id": "dr-…", "document_type": "CERTIFICATE_OF_ORIGIN", "status": "OUTSTANDING" } ] },
  "audit_entry_id": "aud-…",
  "notification_id": "ntf-…",
  "available_actions": [ { "action": "REQUEST_INFORMATION", "available": true }, { "action": "SEND_FOR_SPECIALIST_REVIEW", "available": true }, … ],
  "case_version": 1757340382104
}
```

**Validation (common to all five):**
- `action` MUST be one of exactly the five codes; `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` posted here are rejected with `ACTION_NOT_A_USER_ACTION` and a pointer to the approval endpoint.
- `justification` is required on every action, 10–2 000 chars after trimming, and MUST NOT be whitespace-only or a copy of the AI rationale — an exact string match against the current AI rationale is rejected with `JUSTIFICATION_NOT_AUTHORED` to prevent the human record being a paste of machine text.
- Unknown properties are rejected; properties belonging to a different action's schema are rejected (e.g. `hold_reason` on `ESCALATE_TO_SUPERVISOR`).
- Actions MUST be idempotent under `Idempotency-Key` replay (F3).
- An action MUST NOT be executable by `SYSTEM_ADMINISTRATOR` under any state (F14).
- Every action MUST produce exactly one `case_actions`, one `audit_entries`, and one `notifications` row — never zero, never two (F09a I4).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Unknown or non-user action code | 422 | `ACTION_NOT_A_USER_ACTION` | "{action} is not one of the five user actions" |
| Justification missing/too short | 422 | `JUSTIFICATION_REQUIRED` | "A justification of at least {min} characters is required" |
| Justification identical to AI rationale | 422 | `JUSTIFICATION_NOT_AUTHORED` | "The justification must be authored by you, not copied from the AI rationale" |
| Requested document type not required by any open exception | 422 | `DOCUMENT_TYPE_NOT_REQUIRED` | "{type} is not required by any open exception; set justify_unlisted_document to request it anyway" |
| Duplicate outstanding request | 409 | `DUPLICATE_DOCUMENT_REQUEST` | "An outstanding request for {type} already exists" |
| Requested document already received | 409 | `DOCUMENT_ALREADY_RECEIVED` | "{type} has already been received" |
| `exception_ids` does not match the open set | 409 | `EXCEPTION_SET_STALE` | "The exception set changed; reload the shipment and resubmit" |
| Recommendation already pending | 409 | `RECOMMENDATION_ALREADY_PENDING` | "A clearance recommendation is already awaiting approval" |
| Outstanding requests not acknowledged | 422 | `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` | "Acknowledge the {n} outstanding document request(s) before recommending clearance" |
| Specialist clearing from hold | 403 | `HOLD_REQUIRES_RELEASE` | "Release the case from hold before recommending clearance" |
| Invalid assignee/escalation target | 422 | `ASSIGNEE_INVALID` / `ESCALATION_TARGET_INVALID` | "{user_id} is not an active {role}" |
| Specialist assigning to another specialist | 403 | `ASSIGNMENT_NOT_PERMITTED` | "Specialists may only assign a case to themselves" |
| Hold reason `OTHER` without detail | 422 | `VALIDATION_FAILED` | "hold_reason_detail is required when hold_reason is OTHER" |
| State-machine rejections | 403/409 | see F09a | see F09a |

**API Surface (this part):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/cases/{id}/actions` | CS, SUP | Execute one of the five actions |
| GET | `/api/cases/{id}/actions` | CS, SUP, ADM | Action history for the case |
| GET | `/api/cases/{id}/available-actions` | CS, SUP, ADM | Availability with reasons (F09a §5) |

Full schemas: `Y1b-api-actions.md` §Workflow actions.

**Schema Surface (this part):** writes `case_actions`, `cases`, `document_requests`, `recommendations`, `audit_entries`, `notifications`; reads `exceptions`, `evidence`, `ai_outputs`, `users`. See `Y0b-schema-workflow-audit.md`.
---

## F10: Document Request & Simulated Upload

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 6

**Description:** F10 lets a specialist request a specific missing document, then accept a simulated upload of that document against the open request, which attaches it to the shipment's document set and automatically triggers revalidation. It tracks the request lifecycle with requester, fulfiller, and timestamps, and it displays provenance so a viewer can always tell whether a document was seeded or uploaded during the session. No real importer correspondence exists and nothing is transmitted; the simulation boundary is documented in `Y3-integrations.md`.

**Terminology:**
- **Document request:** A `document_requests` row created by the `REQUEST_INFORMATION` action (F09b §2). One row per requested document type.
- **Request lifecycle:** `OUTSTANDING → FULFILLED` (a matching document was uploaded or ingested) or `OUTSTANDING → CANCELLED` (superseded by a review/clearance action). Terminal states are never reopened; a new need produces a new request.
- **Simulated upload:** Attaching a synthetic file to an outstanding request through `POST /api/document-requests/{id}/upload`. The file is stored in local document storage and the shipment gains a `documents` row with `provenance = 'SIMULATED_UPLOAD'`.
- **Provenance:** `SEEDED` (present at seed time), `INGESTED` (declared by a cargo-entry payload), or `SIMULATED_UPLOAD` (attached during a session). Displayed on F18 next to every document.
- **Fixture allow-list:** The set of synthetic files the system will accept. Uploads are restricted to synthetic content by size, MIME type, extension, and a content sanity check.

**Sub-features:**
- Document request creation tied to a missing-document exception and its rule
- Request lifecycle tracking with full attribution
- Simulated upload against an outstanding request
- Document attachment with provenance
- Automatic revalidation on successful upload
- Provenance display and request history

**Process:**
1. A specialist (or supervisor) executes `REQUEST_INFORMATION` (F09b §2). One `document_requests` row is created per requested type with `status = 'OUTSTANDING'`, `requested_by_user_id`, `requested_by_name`, `requested_at`, `linked_exception_id`, `linked_rule_id`, and `requested_from`. The case moves to `AWAITING_INFORMATION` and an audit entry plus notification are written. *(Walkthrough step 5 completes here.)*
2. The Shipment Review screen (F18) shows the outstanding request with an Upload control. The control is enabled only for `CARGO_SPECIALIST` and `SUPERVISOR`, and only while the request is `OUTSTANDING`.
3. The user selects a synthetic fixture. In the demo the UI offers the seeded upload-ready fixtures for the shipment (F2), so no file needs to be sourced from the presenter's machine; an arbitrary file may still be chosen and is subject to the same validation.
4. The client posts `multipart/form-data` to `POST /api/document-requests/{request_id}/upload` with the file part and a JSON `metadata` part.
5. The server validates the request state (`OUTSTANDING`), the case state (not `CLEARED`), the acting role, and the file (§Validation). Any failure aborts before anything is written to disk.
6. The server writes the file to `CARGODEMO_DOC_STORAGE_DIR/{shipment_id}/{request_id}-{sanitized_filename}`, computes its SHA-256, and records `file_size_bytes`, `mime_type`, and `content_hash`. A file whose hash already exists for the same shipment and document type is accepted but flagged `duplicate_of_document_id` so a re-upload during a repeated demo is visible rather than confusing.
7. The server inserts a `documents` row: `{ cargo_entry_id, document_type (copied from the request, not from client input), status: 'RECEIVED', filename, storage_path, content_hash, file_size_bytes, mime_type, provenance: 'SIMULATED_UPLOAD', uploaded_by_user_id, received_at, source_request_id }`. Taking the document type from the request rather than the payload is what makes it impossible to satisfy a certificate-of-origin requirement by uploading a file labelled as something else.
8. The server marks the request `FULFILLED` with `fulfilled_by_user_id`, `fulfilled_at`, and `fulfilling_document_id`.
9. The server **automatically triggers revalidation** (F6) with `trigger = DOCUMENT_UPLOAD`, inside the same transaction, so an upload can never leave the exception set stale. *(Walkthrough steps 6 and 7 complete here.)*
10. The server writes a `DOCUMENT_UPLOADED` audit entry (distinct from the `REVALIDATED` entry that F6 appends) and generates a notification.
11. The server responds with the created document, the updated request, and the embedded `RevalidationResult`, so the UI can render the "what changed" indication immediately without a second round trip.

**Inputs:**

*Request creation* — via the `REQUEST_INFORMATION` action (F09b §2), not a separate endpoint.

*Upload* — `POST /api/document-requests/{request_id}/upload`, `multipart/form-data`:
- `file` (binary, required): the synthetic document
- `metadata` (JSON part, required):
  - `original_filename` (string, required, 1–255 chars, `^[A-Za-z0-9._ -]+$`)
  - `note` (string, optional, ≤ 500 chars): free-text note recorded on the document and the audit entry
  - `stated_country` (string, optional, ≤ 100 chars): for certificate-type documents, the origin the document asserts. Recorded on the document so the optional `rule-origin-certificate` rule (F4 §7) has a field to read. Purely declarative — no document parsing exists.
- Headers: `X-CargoDemo-Session`, `Idempotency-Key`, `If-Match-Case-Version`

*Cancellation* — `POST /api/document-requests/{request_id}/cancel` with `{ reason: string (10–500 chars) }`.

**Outputs:**
- `UploadResult`:
  - `document`: `{ id, document_type, filename, provenance, content_hash, file_size_bytes, mime_type, received_at, uploaded_by: { id, name, role }, duplicate_of_document_id }`
  - `request`: `{ id, document_type, status: "FULFILLED", requested_by, requested_at, fulfilled_by, fulfilled_at }`
  - `revalidation`: the full `RevalidationResult` from F6
  - `audit_entry_id`, `notification_id`, `case_version`
- Persisted file in document storage; `documents`, `document_requests`, `evaluations`, `exceptions`, `evidence`, `cases`, `audit_entries`, `notifications` rows

**Validation:**
- The request MUST exist and be `OUTSTANDING`; `FULFILLED` or `CANCELLED` requests reject with `REQUEST_NOT_OUTSTANDING`.
- The case MUST NOT be `CLEARED` (`CASE_TERMINAL`).
- Acting role MUST be `CARGO_SPECIALIST` or `SUPERVISOR`; `SYSTEM_ADMINISTRATOR` is denied (F14) — the administrator does not participate in adjudication evidence.
- **File size:** 1 byte – 5 MB. Empty files reject with `FILE_EMPTY`; oversize with `413 PAYLOAD_TOO_LARGE`.
- **MIME type:** allow-list `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`. Anything else rejects with `415 UNSUPPORTED_MEDIA_TYPE`.
- **Extension:** MUST match the declared MIME type (`.pdf`, `.png`, `.jpg`/`.jpeg`, `.txt`, `.csv`); a mismatch rejects with `FILE_EXTENSION_MISMATCH`.
- **Magic-byte check:** the first bytes MUST be consistent with the declared MIME type (`%PDF-` for PDF, PNG/JPEG signatures for images; text types are checked for valid UTF-8 and the absence of NUL bytes). A mismatch rejects with `FILE_CONTENT_MISMATCH`. This is what enforces "restricted to synthetic fixtures" in practice: an executable or archive cannot be smuggled in under a permitted extension.
- **Filename sanitization:** path separators, `..`, control characters, and leading dots are stripped before storage. The stored path is always inside `CARGODEMO_DOC_STORAGE_DIR`; a computed path that escapes it aborts with `STORAGE_PATH_INVALID`.
- **PII screen:** for `text/plain` and `text/csv`, the content is screened against the PII deny-list patterns used by F2 (email, US phone, SSN-shaped digits). A match rejects with `PII_SUSPECTED` — the demo must remain safely public.
- `document_type` is NEVER read from client input on this endpoint; it is copied from the request row.
- Upload MUST trigger exactly one revalidation. Two concurrent uploads against the same case serialize on the case row; the second sees the first's evaluation and produces its own subsequent version.
- Idempotency-Key replay MUST return the original `UploadResult` without creating a second document, a second revalidation, or a second audit entry.
- A request MUST NOT be fulfilled by a document whose type differs from the requested type — structurally guaranteed by step 7.
- Cancellation is permitted only from `OUTSTANDING`, requires a reason, and does not by itself change the case status (the case status changes only through the F9 actions that cancel requests as a side effect).

**State transitions caused:**

| Event | Case status effect |
|---|---|
| Document request created (via `REQUEST_INFORMATION`) | → `AWAITING_INFORMATION` (F09a T01/T06/T11/T16/T21/T26) |
| Upload succeeds, all outstanding requests now fulfilled | Revalidation moves `AWAITING_INFORMATION → IN_REVIEW` (F6) |
| Upload succeeds, other requests still outstanding | Case remains `AWAITING_INFORMATION` |
| Upload succeeds while case is `ON_HOLD`/`ESCALATED`/`PENDING_APPROVAL` | Status unchanged; revalidation still runs and its result is recorded |
| Request cancelled | No direct status change |

**Walkthrough steps 5–7, worked:** Marisol Reyes (CS) requests `CERTIFICATE_OF_ORIGIN` on `SHP-2026-0007` with a justification → request `dr-0007-coo` is `OUTSTANDING`, case `NEW → AWAITING_INFORMATION`, audit + notification written. She uploads `CERTIFICATE_OF_ORIGIN_SHP-2026-0007.pdf` (the seeded upload-ready fixture) → document attached with `provenance = SIMULATED_UPLOAD`, request `FULFILLED`, revalidation runs at v2, the missing-document exception resolves, the HTS and origin exceptions are retained, the case moves to `IN_REVIEW`, and F18 renders "1 resolved, 2 retained".

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Request not found | 404 | `RESOURCE_NOT_FOUND` | "Document request {id} not found" |
| Request already fulfilled or cancelled | 409 | `REQUEST_NOT_OUTSTANDING` | "Request is {status} and cannot accept an upload" |
| Case cleared | 409 | `CASE_TERMINAL` | "Shipment {id} is Cleared" |
| Role not permitted | 403 | `FORBIDDEN_ROLE` | "Role {role} may not upload documents" |
| No file part | 422 | `FILE_REQUIRED` | "A file is required" |
| Empty file | 422 | `FILE_EMPTY` | "Uploaded file is empty" |
| File > 5 MB | 413 | `PAYLOAD_TOO_LARGE` | "File exceeds the 5 MB limit" |
| Disallowed MIME type | 415 | `UNSUPPORTED_MEDIA_TYPE` | "Content type {type} is not accepted" |
| Extension/MIME mismatch | 422 | `FILE_EXTENSION_MISMATCH` | "Extension {ext} does not match content type {type}" |
| Magic bytes inconsistent | 422 | `FILE_CONTENT_MISMATCH` | "File content does not match its declared type" |
| PII detected in text content | 422 | `PII_SUSPECTED` | "Uploaded content appears to contain personal data and was rejected" |
| Storage path escapes the storage directory | 500 | `STORAGE_PATH_INVALID` | "Invalid storage path" |
| Disk write failure | 500 | `STORAGE_WRITE_FAILED` | "Could not store the uploaded document" |
| Revalidation failed after attachment | 500 | `EVALUATION_FAILED` | "Upload rolled back: revalidation failed" |
| Cancel on a non-outstanding request | 409 | `REQUEST_NOT_OUTSTANDING` | "Only outstanding requests can be cancelled" |
| Cancel without a reason | 422 | `VALIDATION_FAILED` | "A cancellation reason is required" |

Because attachment and revalidation share one transaction, a revalidation failure rolls back the document row and the request status; the stored file is removed in the same cleanup path, so storage never diverges from the database.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/shipments/{id}/documents` | CS, SUP, ADM | Document set with provenance and request linkage |
| GET | `/api/shipments/{id}/document-requests` | CS, SUP, ADM | Request history with lifecycle and attribution |
| POST | `/api/document-requests/{id}/upload` | CS, SUP | Simulated upload (multipart) |
| POST | `/api/document-requests/{id}/cancel` | CS, SUP | Cancel an outstanding request |
| GET | `/api/documents/{id}/content` | CS, SUP, ADM | Download the stored synthetic file |
| GET | `/api/shipments/{id}/upload-fixtures` | CS, SUP | Seeded upload-ready fixtures offered by the UI |

Full schemas: `Y1b-api-actions.md` §Documents.

**Schema Surface (this feature):** writes `documents`, `document_requests`, `audit_entries`, `notifications`, and (via F6) `evaluations`/`exceptions`/`evidence`/`cases`. Files on the filesystem under `CARGODEMO_DOC_STORAGE_DIR`. See `Y0a-schema-core.md` §Documents.
---

## F11: Specialist → Supervisor Approval Chain

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 8, 9

**Description:** F11 is the separation-of-duties mechanism and the central governance claim of the demo. A Cargo Specialist may recommend clearance; only a Supervisor may approve it; the approving official is recorded by name; and no path to `CLEARED` exists that does not pass through an approval by a human distinct from the one who recommended. Supervisors may approve, reject (returning the case with a reason), or request more information. Every disposition writes the approving identity, decision, justification, and timestamp to the audit record and generates a notification.

**Terminology:**
- **Recommendation:** A `recommendations` row created by the `CLEAR_EXCEPTION` action (F09b §4). Statuses: `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`, `RETURNED_FOR_INFORMATION`.
- **Approval:** An `approvals` row recording a supervisor's disposition of a recommendation. One approval row per disposition; a rejected-then-resubmitted case has two recommendations and two approvals, both permanently readable.
- **Approving official:** The supervisor whose `APPROVE_CLEARANCE` moved the case to `CLEARED`. Stored as `approving_official_user_id` plus denormalized `approving_official_name` and `approving_official_role`.
- **Separation of duties (SoD):** The two enforced constraints, SoD-1 and SoD-2 (§1). Together they guarantee that a clearance always has an approving official distinct from the recommender.
- **Evidence-changed warning:** The flag raised when the case's current evaluation version differs from the evaluation version the recommendation was made against, meaning the supervisor is deciding on different evidence than the specialist saw.

**Sub-features:**
- Recommendation submission (delegated to F09b §4)
- Pending-approval visibility for supervisors
- Approve / reject / request-more-information dispositions
- SoD-1 and SoD-2 enforcement, server-side
- Approving-official recording and audit completeness gate
- Evidence-changed detection

### §1 The separation-of-duties constraints

**SoD-1 — Role constraint.** `CLEARED` is reachable only through `APPROVE_CLEARANCE`, and `APPROVE_CLEARANCE` requires `acting_role = SUPERVISOR`. A Cargo Specialist calling the approval endpoint receives `403 FORBIDDEN_ROLE`. A System Administrator receives `403 FORBIDDEN_ROLE`. There is exactly one transition row in the state machine targeting `CLEARED` (F09a T31), which makes this constraint auditable by inspection of the transition table rather than by trusting the handler.

**SoD-2 — Identity constraint.** `approvals.approver_user_id` MUST NOT equal `recommendations.recommended_by_user_id`. This is enforced in three places:
1. In the handler before any write.
2. By a database `CHECK`-equivalent trigger on `approvals` that raises when the two IDs match.
3. By the UI, which disables the approve/reject controls for the recommender — belt-and-braces, but never the only enforcement (PRD §6 Security: "role checks are never client-only").

Together SoD-1 and SoD-2 mean:
- **Specialist recommends → Supervisor approves.** The roles differ, so the officials necessarily differ. This is the walkthrough path (Marisol Reyes recommends; Dwayne Okafor approves).
- **Supervisor recommends → a *different* Supervisor approves.** When a supervisor uses `CLEAR_EXCEPTION` themselves, the case still enters `PENDING_APPROVAL` and SoD-2 forbids them from approving their own recommendation. The seed data contains two supervisors (`usr-sup-001`, `usr-sup-002`) precisely so this path is demonstrable rather than deadlocked (F2 §Seeded users).
- **No self-clearance exists at all.** There is no configuration flag, no administrator override, and no "single-approver mode". An implementation that adds one contradicts the demo's central claim.

**SoD-3 — Approval scope.** An approval disposes of exactly one `PENDING` recommendation on one case. There is no bulk-approve endpoint and no multi-case operation, because a single justification cannot honestly cover multiple independent decisions.

### §2 Process — recommendation submission (walkthrough step 8)

1. A specialist on F19 selects "Recommend clearance", enters a justification, and confirms the enumerated exception set.
2. The `CLEAR_EXCEPTION` action executes through the F09b pipeline: G-REC and (from `AWAITING_INFORMATION`) G-ACK are evaluated, the AI recommendation is snapshotted with `concurrence`, and the evidence set is snapshotted onto the audit entry.
3. A `recommendations` row is created with `status = 'PENDING'`, bound to the case's current `evaluation_id`.
4. The case moves to `PENDING_APPROVAL`. It remains visible in the queue with a distinct status badge and is surfaced to supervisors by the `pending_approval_only=true` queue filter (F17).
5. A notification addressed to the `SUPERVISOR` role is generated, naming the recommender, the shipment, the exceptions, and the justification.

### §3 Process — supervisor disposition (walkthrough step 9)

1. A supervisor opens the case. F19 renders the pending recommendation panel: recommender name and role, submission timestamp, `resolution_basis`, the enumerated exceptions with evidence, the specialist's justification, and the AI recommendation with its concurrence.
2. If `recommendations.evaluation_id != cases.current_evaluation_id`, the panel shows an **evidence-changed warning** naming both versions and linking to the evaluation diff (F6 API). The supervisor may still approve, but the warning and the acknowledgement are recorded on the approval.
3. The supervisor posts `POST /api/cases/{id}/approval` with `decision`, `justification`, and (when the warning is present) `acknowledge_evidence_changed: true`.
4. The server runs the F09b common pipeline steps 1–9, then applies the disposition:
   - **`APPROVE`** → recommendation `APPROVED`; an `approvals` row is written with the approving official; every exception in the recommendation's `exception_ids` is set to `CLEARED_BY_DECISION` with `cleared_by_approval_id`; the case moves to `CLEARED`; `cases.cleared_at`, `cases.approving_official_user_id`, and `cases.approving_official_name` are set.
   - **`REJECT`** → recommendation `REJECTED` with `rejection_reason`; an `approvals` row is written; exceptions remain `OPEN`; the case returns to `IN_REVIEW`; `cases.assigned_to_user_id` is set back to the recommender so the work returns to its author.
   - **`REQUEST_INFO`** → recommendation `RETURNED_FOR_INFORMATION`; an `approvals` row is written; a `document_requests` row is created per requested type; the case moves to `AWAITING_INFORMATION`. This is the supervisor exercising T26.
5. The audit-completeness gate (G-AUDIT) runs before commit. For an `APPROVE`, `approving_official` MUST be non-null and all eight F12 fields MUST be present; otherwise the transaction aborts with `AUDIT_INCOMPLETE` and the case does not clear.
6. A notification is generated: on approval, addressed to the recommender and the specialist role, subject *"Clearance approved for {shipment_id} by {approving_official_name}"*; on rejection, subject *"Clearance recommendation returned — {shipment_id}"* with the reason.
7. The response returns the case's new status, the approval record, and the audit entry ID so F20 can be opened directly on the finalizing entry (walkthrough step 10).

**Inputs:**

`POST /api/cases/{case_id}/approval`, headers `X-CargoDemo-Session`, `Idempotency-Key`, `If-Match-Case-Version`:
- `recommendation_id` (string, required): MUST be the case's `PENDING` recommendation. Requiring it explicitly prevents a supervisor from approving a recommendation that was replaced between page load and submit.
- `decision` (enum, required): `APPROVE` | `REJECT` | `REQUEST_INFO`
- `justification` (string, required, 10–2 000 chars; minimum 40 chars when `decision = REJECT`, because returning a colleague's work demands a fuller reason)
- `acknowledge_evidence_changed` (boolean, conditionally required `true` when the recommendation's evaluation version differs from the current one)
- `rejection_reason` (enum, required when `REJECT`): `INSUFFICIENT_JUSTIFICATION` | `EVIDENCE_INCOMPLETE` | `EXCEPTION_NOT_RESOLVED` | `POLICY_DISAGREEMENT` | `OTHER`
- `document_types` (string[], required when `REQUEST_INFO`, 1–10 items): same validation as F09b §2 G-DOC

**Outputs:**
- `ApprovalResult`:
  - `approval`: `{ id, recommendation_id, decision, rejection_reason, justification, approver: { id, name, role }, decided_at, evidence_changed: boolean, acknowledged_evidence_changed: boolean, recommendation_evaluation_version, current_evaluation_version }`
  - `recommendation`: `{ id, status, recommended_by: { id, name, role }, recommended_at, resolution_basis, exception_ids, justification }`
  - `case`: `{ id, shipment_id, status, cleared_at, approving_official: { id, name, role } | null }`
  - `exceptions_closed[]` (on approve): `{ exception_id, exception_type, status: "CLEARED_BY_DECISION" }`
  - `audit_entry_id`, `notification_id`, `case_version`
- Persisted `approvals`, `recommendations`, `exceptions`, `cases`, `audit_entries`, `notifications`, and (on `REQUEST_INFO`) `document_requests` rows

**Validation:**
- `acting_role` MUST be `SUPERVISOR` (SoD-1). CS and ADM receive `403 FORBIDDEN_ROLE`.
- `acting_user_id != recommendation.recommended_by_user_id` (SoD-2). Violation returns `403 SELF_APPROVAL_BLOCKED` and writes an `ACCESS_DENIED` audit entry — an attempted self-approval is itself governance-relevant and is recorded.
- The case MUST be `PENDING_APPROVAL`; any other status returns `409 INVALID_TRANSITION` (or `409 CASE_TERMINAL` when already cleared).
- `recommendation_id` MUST identify the case's current `PENDING` recommendation; otherwise `409 RECOMMENDATION_NOT_PENDING`.
- When the evidence-changed condition holds and `acknowledge_evidence_changed` is not `true`, reject with `409 EVIDENCE_CHANGED_UNACKNOWLEDGED`.
- On `APPROVE`, every exception in `exception_ids` MUST still exist; exceptions resolved by an intervening revalidation are recorded as `RESOLVED_BY_REVALIDATION` and are not re-closed, and the approval records which of the recommended exceptions were still open at decision time.
- On `APPROVE`, the eight-field audit completeness check MUST pass with a non-null `approving_official`; failure aborts the transaction (`AUDIT_INCOMPLETE`) and the case does **not** clear. This is the enforcement behind PRD §7's "0 decisions finalizable with a missing field".
- The approval endpoint MUST NOT accept any of the five user action codes, and `POST /api/cases/{id}/actions` MUST NOT accept `APPROVE_CLEARANCE`; the two surfaces are deliberately disjoint.
- Idempotency-Key replay returns the original `ApprovalResult` without producing a second approval.
- After `CLEARED`, `recommendations`, `approvals`, and the case's status/priority are immutable; every mutating route returns `CASE_TERMINAL`.

**State transitions caused:**

| From | Decision | To | Recommendation status | Exception effect |
|---|---|---|---|---|
| `PENDING_APPROVAL` | `APPROVE` | `CLEARED` | `APPROVED` | Listed open exceptions → `CLEARED_BY_DECISION` |
| `PENDING_APPROVAL` | `REJECT` | `IN_REVIEW` | `REJECTED` | Unchanged (remain `OPEN`) |
| `PENDING_APPROVAL` | `REQUEST_INFO` | `AWAITING_INFORMATION` | `RETURNED_FOR_INFORMATION` | Unchanged; new document requests created |
| `PENDING_APPROVAL` | `PLACE_ON_HOLD` (F09b §5, T29) | `ON_HOLD` | `WITHDRAWN` | Unchanged |

**Walkthrough steps 8–9, worked:** Marisol Reyes (`usr-cs-001`, CS) submits `CLEAR_EXCEPTION` on `SHP-2026-0007` at evaluation v2 with `resolution_basis = MIXED` (the document exception resolved; the HTS and origin exceptions are accepted with a 40+ character justification). The case moves to `PENDING_APPROVAL` and appears under the supervisor's pending filter. Dwayne Okafor (`usr-sup-001`, SUP) opens it, sees the recommendation, the evidence, the AI recommendation with `concurrence: DIVERGED`, and approves with his own justification. SoD-1 passes (he is a supervisor), SoD-2 passes (`usr-sup-001 != usr-cs-001`), the audit gate passes with `approving_official = Dwayne Okafor`, the two remaining exceptions close as `CLEARED_BY_DECISION`, the case becomes `CLEARED`, and the approval notification is generated. Had Marisol attempted the approval herself, she would have received `403 SELF_APPROVAL_BLOCKED` and the attempt would appear in the audit trail.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Specialist attempts approval | 403 | `FORBIDDEN_ROLE` | "Only a Supervisor may approve a clearance" |
| Administrator attempts approval | 403 | `FORBIDDEN_ROLE` | "System Administrators do not approve shipments" |
| Recommender attempts to approve own recommendation | 403 | `SELF_APPROVAL_BLOCKED` | "You submitted this recommendation and cannot decide on it" |
| Case not in `PENDING_APPROVAL` | 409 | `INVALID_TRANSITION` | "No clearance recommendation is awaiting decision" |
| Case already cleared | 409 | `CASE_TERMINAL` | "Shipment {id} is already Cleared" |
| `recommendation_id` stale or not pending | 409 | `RECOMMENDATION_NOT_PENDING` | "That recommendation is no longer pending" |
| Evidence changed and not acknowledged | 409 | `EVIDENCE_CHANGED_UNACKNOWLEDGED` | "Evidence changed since the recommendation (v{a} → v{b}); review and acknowledge before deciding" |
| Rejection without a reason code | 422 | `VALIDATION_FAILED` | "rejection_reason is required when rejecting" |
| Rejection justification under 40 chars | 422 | `JUSTIFICATION_REQUIRED` | "A rejection requires a justification of at least 40 characters" |
| Approval would produce an incomplete audit record | 500 | `AUDIT_INCOMPLETE` | "Clearance blocked: the audit record would be missing {field}" |
| Concurrent decision on the same recommendation | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/cases/{id}/approval` | SUP | Approve, reject, or return a pending recommendation |
| GET | `/api/cases/{id}/recommendations` | CS, SUP, ADM | All recommendations for the case with status and attribution |
| GET | `/api/cases/{id}/approvals` | CS, SUP, ADM | All approval dispositions for the case |
| GET | `/api/queue?pending_approval_only=true` | SUP | Supervisor's approval work list |

Full schemas: `Y1b-api-actions.md` §Approvals.

**Schema Surface (this feature):** writes `recommendations`, `approvals`, `exceptions` (status only), `cases` (`status`, `cleared_at`, `approving_official_*`), `document_requests`, `audit_entries`, `notifications`. See `Y0b-schema-workflow-audit.md` §Recommendations and §Approvals.
---

## F12: Decision & Audit Record

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough step:** 10

**Description:** F12 is the immutable, complete, append-only record of everything that happened to a case — sufficient to defend the decision after the fact. Every audit entry captures the **eight required fields**: the exception(s) involved, the evidence reviewed, the AI recommendation, the human decision, the decision justification, the timestamp, the approving official, and the generated notification. Entries cannot be edited or deleted through the application, they form a hash chain, and a decision cannot be finalized if any required field is absent. F12 also produces the chronological case timeline, distinguishes AI-authored from human-authored content, and exports the record for offline review.

**Terminology:**
- **Audit entry:** One `audit_entries` row. Immutable after commit (with the single, structurally constrained exception described in §3).
- **Entry class:** The category of event an entry records, which determines the completeness rules applied to it: `SYSTEM_EVENT`, `AI_OUTPUT`, `HUMAN_ACTION`, `APPROVAL_DECISION`, `ACCESS_DENIED`.
- **The eight fields:** The PRD-mandated audit content, specified field-by-field in §1.
- **Snapshot, not reference:** Evidence and AI recommendation are stored as JSON **copies** taken at decision time, not as foreign keys. A later revalidation changes the live exception set; the audit entry must still show what the decider actually saw.
- **Hash chain:** `entry_hash = SHA256(canonical_json(entry_without_hashes) || prev_hash)`, with `prev_hash` being the previous entry's hash for the same case (or the genesis constant for the first). Tampering with any historical row breaks verification for every subsequent row.
- **Completeness gate:** The pre-commit check that blocks a write whose entry class requires a field that is absent.

**Sub-features:**
- Eight-field audit entry capture
- Append-only enforcement at the application and database layers
- Hash chaining and verification
- Chronological case timeline assembly
- AI vs human content distinction
- Completeness enforcement at write time
- JSON and printable export

### §1 The eight required fields

| # | Field | Column | Type | Content |
|---|---|---|---|---|
| 1 | **Exception** | `exceptions_json` | JSON array | Snapshot of every exception in scope at the moment of the event: `{ exception_id, exception_type, sub_reason, severity, status, rule_id, rule_name, rule_version, policy_reference, opened_at }`. For a case-level action this is the full open set; for a resolution event it also includes the exceptions being resolved or closed. Never null — an empty case records `[]` with `exceptions_in_scope_count: 0`. |
| 2 | **Evidence reviewed** | `evidence_reviewed_json` | JSON array | Snapshot of every evidence row attached to the in-scope exceptions: `{ exception_id, kind, field_path, raw_value, normalized_value, comparison_field_path, comparison_raw_value, comparison_normalized_value, expected, observed, assertion }`, plus `documents_present[]` and `documents_missing[]` at that instant. This is what makes the decision reconstructable. |
| 3 | **AI recommendation** | `ai_recommendation_json` | JSON object | `{ present, recommended_action, confidence_level, confidence_basis, rationale, provenance: { provider, model, generation_mode, generated_at, grounding_fingerprint }, concurrence }` or the explicit `{ present: false, reason: "NOT_GENERATED" }`. Never null. `concurrence` is `AGREED | DIVERGED | NO_RECOMMENDATION_PRESENT` on `HUMAN_ACTION` entries and `NOT_APPLICABLE` on `APPROVAL_DECISION` entries, because the AI never recommends `APPROVE_CLEARANCE` (F8 §Process step 11). |
| 4 | **User decision** | `user_decision` + `user_decision_detail_json` | string + JSON | The action or disposition code (`REQUEST_INFORMATION`, `CLEAR_EXCEPTION`, `APPROVE`, `REJECT`, …) plus its action-specific parameters (`document_types`, `hold_reason`, `resolution_basis`, `rejection_reason`). Null only for `SYSTEM_EVENT` and `AI_OUTPUT` classes, which record no human decision. |
| 5 | **Decision justification** | `justification` | text | The human-authored free text, verbatim, 10–2 000 chars. Never generated, never defaulted. Null only for `SYSTEM_EVENT` and `AI_OUTPUT` classes. |
| 6 | **Timestamp** | `occurred_at` | ISO-8601 UTC ms | The server clock at commit. Never client-supplied. Monotonic per case: an entry whose `occurred_at` precedes its predecessor's is rejected. |
| 7 | **Approving official** | `approving_official_user_id`, `approving_official_name`, `approving_official_role` | string ×3 | The named approver. Non-null and required on `APPROVAL_DECISION` entries and on any entry transitioning the case to `CLEARED`. On other classes the field is present as an explicit `null` with `approving_official_applicable: false`, so absence is recorded rather than merely missing. |
| 8 | **Generated notification** | `notification_id` + `notification_snapshot_json` | string + JSON | The notification produced by this event: `{ id, recipient_role, recipient_user_id, subject, body, generated_at, transmitted: false }`. Required on every `HUMAN_ACTION` and `APPROVAL_DECISION` entry. |

Additional non-PRD-mandated columns carried on every entry for attribution and integrity: `case_id`, `cargo_entry_id`, `shipment_id`, `sequence_no`, `entry_class`, `event_type`, `actor_kind`, `actor_user_id`, `actor_name`, `actor_role`, `case_status_before`, `case_status_after`, `evaluation_version`, `rule_set_fingerprint`, `prev_hash`, `entry_hash`, `request_id`.

### §2 Completeness rules by entry class

| Entry class | Event types | Required of the eight | Optional/`null`-permitted |
|---|---|---|---|
| `SYSTEM_EVENT` | `ENTRY_INGESTED`, `ENTRY_REINGESTED`, `EXCEPTIONS_DETECTED`, `EXCEPTIONS_REEVALUATED`, `REVALIDATED`, `SCHEMA_MIGRATED`, `DEMO_RESET`, `RULE_CREATED`, `RULE_UPDATED`, `RULE_ENABLED`, `RULE_DISABLED` | 1, 2, 3, 6 | 4, 5 (no human decision), 7, 8 (`REVALIDATED` does generate a notification and therefore carries 8) |
| `AI_OUTPUT` | `AI_SUMMARY_GENERATED`, `AI_RECOMMENDATION_GENERATED` | 1, 2, 3, 6 | 4, 5, 7, 8 |
| `HUMAN_ACTION` | the five actions, `DOCUMENT_UPLOADED`, `DOCUMENT_REQUEST_CANCELLED` | **1, 2, 3, 4, 5, 6, 8** | 7 (explicit null with `approving_official_applicable: false`) |
| `APPROVAL_DECISION` | `CLEARANCE_APPROVED`, `CLEARANCE_REJECTED`, `CLEARANCE_RETURNED_FOR_INFORMATION` | **all eight**, with 7 non-null | — |
| `ACCESS_DENIED` | `ACCESS_DENIED`, `TRANSITION_REJECTED` | 1, 4 (the attempted decision), 6 | 2, 3, 5, 7, 8 |

The gate that matters for the PRD's governance claim is the `APPROVAL_DECISION` row: **all eight fields non-null, including a named approving official.** A `CLEARANCE_APPROVED` entry that would be missing any of them aborts the transaction, so the case does not clear (F11 §Validation).

### §3 Append-only enforcement

1. **No API surface.** No `PATCH`, `PUT`, or `DELETE` route exists for `audit_entries` or `notifications`. The routes are not defined at all, so no client can express the request.
2. **Repository constraint.** The audit repository exposes only `append()` and read methods. There is no `update()` or `delete()` to call.
3. **Database triggers.** `BEFORE UPDATE` and `BEFORE DELETE` triggers on `audit_entries` raise `AUDIT_IMMUTABLE`. The `UPDATE` trigger carries a single narrow `WHEN` exemption: it permits an update that changes **only** `notification_id` and `notification_snapshot_json`, only from null to non-null, and only within the same transaction that inserted the row. This exists solely to resolve the audit↔notification circular reference described in F09b §1 step 15, and every other update — including a second attempt to set `notification_id` — is rejected.
4. **Hash chain.** Each entry stores `prev_hash` and `entry_hash`. `GET /api/cases/{id}/audit/verify` recomputes the chain and reports `{ valid, entries_checked, first_invalid_sequence_no }`. An F21 test tampers with a row via direct SQL and asserts that verification fails.
5. **Reset is the only removal path.** `POST /api/admin/reset` (F2/F22) truncates and reseeds the entire database. It is administrator-gated, is a whole-environment operation rather than a selective edit, and writes a `DEMO_RESET` entry as the first row of the new chain. Selective deletion of a single entry or a single case's history is not implementable through any surface.

### §4 Process — writing an entry

1. The caller (F1, F5, F6, F7, F8, F9, F10, F11, F15) invokes `audit.append(draft)` inside the caller's existing transaction. There is no path that writes an audit entry in a separate transaction from the state change it records.
2. The service resolves `sequence_no` as `max(sequence_no) + 1` for the case, under the case-row lock already held by the caller, guaranteeing gap-free ordering.
3. The service stamps `occurred_at` from the server clock and validates monotonicity against the previous entry.
4. The service applies the completeness rules for the entry class (§2). A missing required field aborts with `AUDIT_INCOMPLETE`, naming the field.
5. The service computes `prev_hash` and `entry_hash` over the canonical JSON serialization (keys sorted, no whitespace, timestamps in ISO-8601 UTC ms).
6. The service inserts the row. The caller then inserts the notification and performs the single permitted `notification_id` update (§3.3).
7. On commit, the entry is permanent.

### §5 Process — reading the timeline (walkthrough step 10)

1. `GET /api/cases/{id}/audit` returns all entries ordered by `sequence_no` ascending, with `page_size` defaulting to 100 (a case timeline is meant to be read whole).
2. Each entry is projected with a `presentation` block the UI renders directly: `{ headline, actor_label, authorship: "HUMAN" | "AI" | "SYSTEM", status_change, decision_label, justification, exception_summary, evidence_rows, ai_block, approving_official_label, notification_block }`.
3. `authorship` drives the visual separation required by PRD F12 and F20: AI-authored content is never rendered inside a human-decision container, and every AI block carries its provenance.
4. The response includes a `completeness` block: `{ total_entries, decision_entries, decision_entries_complete, missing_fields: [] }`, so the screen can assert on-camera that the record is complete.
5. `GET /api/cases/{id}/audit/export?format=json` returns the full record including the hash chain and a `verification` block. `format=printable` returns the same content as server-rendered HTML suitable for the browser's print dialog. No PDF toolchain is required or used.

**Inputs:**
- `audit.append(draft)` internal call: `{ case_id, entry_class, event_type, actor, exceptions, evidence_reviewed, ai_recommendation, user_decision, user_decision_detail, justification, approving_official, case_status_before, case_status_after, evaluation_version, rule_set_fingerprint, request_id }`
- `GET /api/cases/{id}/audit` query: `page`, `page_size` (1–500, default 100), `entry_class` filter, `since_sequence_no`
- `GET /api/cases/{id}/audit/export` query: `format` = `json` | `printable`

**Outputs:**
- Persisted, hash-chained `audit_entries` rows
- Timeline projection with per-entry presentation blocks and the completeness summary
- `verification` result from the verify endpoint
- JSON or printable export of the full case record

**Validation:**
- Every write MUST satisfy the completeness rules for its entry class; failure aborts the enclosing transaction with `AUDIT_INCOMPLETE`.
- Every `APPROVAL_DECISION` entry MUST have all eight fields non-null. Asserted by an F21 test that enumerates every approval entry in the seeded and test-generated data.
- `occurred_at` MUST be server-generated and monotonic per case; a non-monotonic draft is rejected with `AUDIT_TIMESTAMP_NONMONOTONIC`.
- `sequence_no` MUST be gap-free per case; a gap is a verification failure.
- Evidence and AI recommendation MUST be stored as snapshots. An implementation that stores only foreign keys fails the F21 test that revalidates a case after a decision and asserts the earlier entry's evidence is unchanged.
- No audit entry may carry `actor_kind = 'AI'` together with a non-null `user_decision` (`00-header.md` §0.4.7).
- Audit entries MUST NOT be updated or deleted except by the narrowly scoped `notification_id` exemption; verified by trigger tests that attempt both and expect failure.
- The export MUST contain every field of every entry — an export that omits the AI recommendation or the evidence snapshot is a defect, because offline review is exactly the defensibility use case.
- Audit reads are permitted to all three roles; audit writes are never client-initiated (there is no "create audit entry" endpoint).

**State transitions caused:** None. F12 records transitions; it never causes them. Its only influence on state is negative: the completeness gate can *prevent* a transition (notably `PENDING_APPROVAL → CLEARED`).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Required field absent for the entry class | 500 | `AUDIT_INCOMPLETE` | "Audit record would be incomplete: {field} is required for {entry_class}" |
| Approval without an approving official | 500 | `AUDIT_INCOMPLETE` | "Clearance blocked: approving official is required" |
| Attempt to update or delete an entry | 405 | `AUDIT_IMMUTABLE` | "Audit records are append-only and cannot be modified" |
| Non-monotonic timestamp | 500 | `AUDIT_TIMESTAMP_NONMONOTONIC` | "Audit timestamp precedes the previous entry" |
| Sequence collision | 409 | `AUDIT_SEQUENCE_CONFLICT` | "Concurrent audit write detected; retry" |
| Hash chain verification failed | 200 (with `valid: false`) | `AUDIT_CHAIN_INVALID` | "Audit chain verification failed at entry {sequence_no}" |
| Case not found | 404 | `RESOURCE_NOT_FOUND` | "Case {id} not found" |
| Unknown export format | 422 | `INVALID_QUERY_PARAM` | "format must be json or printable" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/cases/{id}/audit` | CS, SUP, ADM | Chronological timeline with presentation blocks |
| GET | `/api/cases/{id}/audit/{sequence_no}` | CS, SUP, ADM | One entry in full |
| GET | `/api/cases/{id}/audit/verify` | CS, SUP, ADM | Hash-chain verification result |
| GET | `/api/cases/{id}/audit/export` | CS, SUP, ADM | Full record as JSON or printable HTML |
| GET | `/api/audit` | SUP, ADM | Cross-case audit search (filter by actor, event type, date range) |

Full schemas: `Y1a-api-read.md` §Audit.

**Schema Surface (this feature):** owns `audit_entries` and its immutability triggers; reads every other table for snapshotting. See `Y0b-schema-workflow-audit.md` §Audit.
---

## F13: Notification Generation

**Priority:** P1 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 9

**Description:** F13 generates and records a notification on every case state change and every decision, links it to the audit entry that produced it, and surfaces it in an in-app notification center with read state. Notifications are **generated, never transmitted** — no email, SMS, webhook, or outbound network call exists anywhere in the system. Every notification is explicitly labeled as recorded-not-transmitted so the simulation boundary is obvious on screen.

**Terminology:**
- **Notification:** A `notifications` row: the message that *would* have been sent, with recipient, subject, body, and timestamp.
- **Recipient role vs recipient user:** Notifications are addressed to a role (`CARGO_SPECIALIST`, `SUPERVISOR`) and optionally to a specific user (the case assignee, the recommender, a named escalation target). Role-addressed notifications appear for every user holding that role.
- **Read state:** Per user, not per notification row — two supervisors reading the same role-addressed notification track their own read state in `notification_reads`.
- **Transmission boundary:** `transmitted` is a column that is always `false` and has no code path that sets it `true`. Its presence in the schema and in every API response is deliberate: it makes the boundary explicit in the data, not merely in the UI copy.

**Sub-features:**
- Notification generation on every state change and decision
- Template catalog keyed by event type
- Audit-entry linkage in both directions
- In-app notification center with unread count and read marking
- Per-case notification list
- Explicit "generated, not transmitted" labeling

**Process:**
1. A notification is generated inside the same transaction as the audit entry it belongs to (F09b §1 step 13). There is no queue, no scheduler, and no retry — generation is synchronous and cannot partially fail.
2. The service selects the template for the event type (§Template catalog) and renders subject and body from the event context: shipment ID, importer, acting user name and role, action, justification excerpt (first 200 chars), exception summary, and status change.
3. The service resolves recipients per the template's addressing rule. A single event may generate exactly one notification row addressed to one role, optionally with a `recipient_user_id` for direct addressing. Multi-recipient fan-out is deliberately not implemented: one event produces one notification row, keeping the one-to-one audit linkage exact and testable (F09a I4).
4. The service inserts the `notifications` row with `audit_entry_id`, `transmitted: false`, `generated_at`, and `case_id`.
5. The caller performs the single permitted `notification_id` update on the audit entry (F12 §3.3), completing field 8 of the eight.
6. The notification appears immediately in the notification center for users holding the recipient role, and in the per-case notification list on F20 alongside the decision that produced it.
7. A user marks a notification read via `POST /api/notifications/{id}/read`, which upserts a `notification_reads` row for that user. Read state is per-user and never modifies the notification row itself.

### §Template catalog

| Event type | Recipient role | Direct recipient | Subject |
|---|---|---|---|
| `REQUEST_INFORMATION` | `CARGO_SPECIALIST` | case assignee, if any | "Document requested for {shipment_id}" |
| `SEND_FOR_SPECIALIST_REVIEW` | `CARGO_SPECIALIST` | assignee, if named | "{shipment_id} assigned for specialist review" |
| `CLEAR_EXCEPTION` | `SUPERVISOR` | escalation target, if any | "Clearance recommendation awaiting approval — {shipment_id}" |
| `PLACE_ON_HOLD` | `SUPERVISOR` | recommender, if withdrawn | "{shipment_id} placed on hold" |
| `ESCALATE_TO_SUPERVISOR` | `SUPERVISOR` | named supervisor, if any | "Escalated: {shipment_id}" |
| `DOCUMENT_UPLOADED` | `CARGO_SPECIALIST` | requester | "Document received for {shipment_id}" |
| `DOCUMENT_REQUEST_CANCELLED` | `CARGO_SPECIALIST` | requester | "Document request cancelled — {shipment_id}" |
| `REVALIDATED` | `CARGO_SPECIALIST` | assignee | "{shipment_id} revalidated: {n} resolved, {m} remaining" |
| `CLEARANCE_APPROVED` | `CARGO_SPECIALIST` | recommender | "Clearance approved for {shipment_id} by {approving_official_name}" |
| `CLEARANCE_REJECTED` | `CARGO_SPECIALIST` | recommender | "Clearance recommendation returned — {shipment_id}" |
| `CLEARANCE_RETURNED_FOR_INFORMATION` | `CARGO_SPECIALIST` | recommender | "More information requested before clearance — {shipment_id}" |
| `RULE_CREATED` / `RULE_UPDATED` / `RULE_ENABLED` / `RULE_DISABLED` | `SYSTEM_ADMINISTRATOR` | — | "Rule {rule_name} {change} by {actor_name}" |
| `DEMO_RESET` | `SYSTEM_ADMINISTRATOR` | — | "Demo data reset to pristine state" |

Every rendered body ends with the fixed sentence: *"This notification was generated and recorded by CargoDemo. It was not transmitted to any external recipient."*

**Inputs:**
- Internal `notifications.generate(context)`: `{ case_id, audit_entry_id, event_type, actor, status_before, status_after, justification, exception_summary, recipient_user_id? }`
- `GET /api/notifications` query: `unread_only` (boolean, default `false`), `case_id` (optional), `page`, `page_size` (1–100, default 25)
- `POST /api/notifications/{id}/read` — no body
- `POST /api/notifications/read-all` — optional `{ case_id }` to scope

**Outputs:**
- Persisted `notifications` row: `{ id, case_id, cargo_entry_id, shipment_id, audit_entry_id, event_type, recipient_role, recipient_user_id, subject, body, generated_at, transmitted: false }`
- Notification list projection with `read: boolean` computed for the acting user
- `unread_count` returned on every list response and by `GET /api/notifications/unread-count`, driving the shell's notification indicator (F16)
- Per-case notification list embedded in the F20 timeline

**Validation:**
- Every `HUMAN_ACTION` and `APPROVAL_DECISION` audit entry MUST have exactly one linked notification. Zero or two is a defect; asserted by an F21 test that counts rows per audit entry.
- `transmitted` MUST be `false` on every row. No code path sets it otherwise; an F21 test asserts the column's distinct value set is `{false}` after a full walkthrough.
- The application MUST make no outbound network request for notification purposes. The only permitted outbound call in the entire system is the optional AI provider call (F7/F8), documented in `Y3-integrations.md`.
- `recipient_role` MUST be one of the three canonical roles.
- Subject MUST be 1–200 chars; body 1–4 000 chars. Justification excerpts are truncated at 200 chars with an ellipsis rather than rejected.
- A notification MUST NOT contain content that is absent from the underlying event context — bodies are template-rendered, never AI-generated. (Notification text is deliberately not an AI surface: it must be reproducible for the audit record.)
- Read state MUST be per user; marking read MUST NOT modify the `notifications` row, which is append-only alongside `audit_entries`.
- A user MUST NOT be able to read notifications for a role they do not hold, except that `SUPERVISOR` and `SYSTEM_ADMINISTRATOR` may read all notifications for oversight (F14).
- Notifications MUST NOT be deletable through any surface.

**State transitions caused:** None. Notification generation is a consequence of a transition, never a cause of one.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Template missing for an event type | 500 | `NOTIFICATION_TEMPLATE_MISSING` | "No notification template for {event_type}" |
| Notification generation failed inside a transaction | 500 | `NOTIFICATION_GENERATION_FAILED` | "Action rolled back: notification could not be generated" |
| Notification not found | 404 | `RESOURCE_NOT_FOUND` | "Notification {id} not found" |
| Marking read a notification for another role | 403 | `FORBIDDEN_ROLE` | "This notification is not addressed to your role" |
| Attempt to update or delete a notification | 405 | `NOTIFICATION_IMMUTABLE` | "Notifications are recorded and cannot be modified" |
| Unauthenticated | 401 | `UNAUTHENTICATED` | "No acting user" |

Because generation is inside the action's transaction, `NOTIFICATION_GENERATION_FAILED` rolls back the entire action — a state change without its notification cannot be committed.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/notifications` | CS, SUP, ADM | Notification center list, filtered by role addressing |
| GET | `/api/notifications/unread-count` | CS, SUP, ADM | Badge count for the shell indicator |
| GET | `/api/cases/{id}/notifications` | CS, SUP, ADM | Per-case notifications with audit linkage |
| POST | `/api/notifications/{id}/read` | CS, SUP, ADM | Mark read for the acting user |
| POST | `/api/notifications/read-all` | CS, SUP, ADM | Mark all (optionally case-scoped) read |

Full schemas: `Y1a-api-read.md` §Notifications.

**Schema Surface (this feature):** owns `notifications` and `notification_reads`; referenced by `audit_entries.notification_id`. See `Y0b-schema-workflow-audit.md` §Notifications.
---

## F14: Role Simulation & Role-Based Access Control

**Priority:** P0 · **Category:** Access Control & Administration · **Walkthrough step:** 9

**Description:** F14 establishes a named acting user through a simulated login / role selector — no PIV/CAC, no SSO — and enforces exactly three roles server-side on every endpoint. The acting user's name and role are stamped on every audit entry. UI hiding is a convenience; the authoritative check is on the server, and every unauthorized attempt is rejected and recorded. This chunk contains the complete endpoint-by-role permission matrix.

**Terminology:**
- **Simulated login:** Selecting a seeded user from a list. `POST /api/session` issues an opaque session token bound to that user. There is no password, no identity provider, and no token exchange with an external system.
- **Acting user:** The `{ user_id, name, role }` resolved from the session on every request. Never taken from the request body, a query parameter, or a client-supplied role header.
- **Role switch:** Ending the current session and starting a new one as a different user. Switching is explicit and logged; it is not a privilege elevation within a session.
- **Route permission:** A declarative `{ route_id, allowed_roles, resource_predicates }` entry attached to every route at definition time. The matrix in §2 is generated from these declarations and served at `GET /api/rbac/matrix`, so the specification, the enforcement, and the tests read the same data.
- **Resource predicate:** A per-request check beyond the role, e.g. SoD-2 (F11) or the escalation authority transfer (F09a G-AUTH).

**Sub-features:**
- Simulated login / role selector with named users
- Session issuance, resolution, and termination
- Declarative route permissions with startup completeness self-check
- Server-side enforcement on every route
- Resource predicates for self-approval and escalation
- Denial logging as audit entries
- Actor stamping on every audit entry

### §1 Process

1. On first load the UI calls `GET /api/users` (open route) and renders the role selector listing the five seeded users with their roles.
2. The user selects an identity. The client calls `POST /api/session` with `{ user_id }`. The server verifies the user exists and is active, generates a random 32-byte token, stores `{ token_hash, user_id, created_at, last_seen_at }`, and returns `{ session_token, user: { id, name, role }, permissions_summary }`.
3. The client stores the token and sends it as `X-CargoDemo-Session` on every subsequent request. The token is also settable as an `HttpOnly` cookie for the embedded-preview case where header injection is inconvenient.
4. Every request resolves the acting user before route handling (F3 §Process step 3). Unresolvable sessions return `401 UNAUTHENTICATED` on protected routes.
5. The route's `allowed_roles` is checked. A role mismatch returns `403 FORBIDDEN_ROLE` and appends an `ACCESS_DENIED` audit entry recording the acting user, role, route, method, target resource, and reason.
6. Resource predicates run after the role check, so a supervisor attempting self-approval receives the specific `SELF_APPROVAL_BLOCKED` rather than a generic role denial — the distinction matters, because one is "your role cannot do this" and the other is "you personally cannot do this here".
7. The acting user's `id`, `name`, and `role` are stamped on every audit entry written during the request (`actor_user_id`, `actor_name`, `actor_role`).
8. `DELETE /api/session` ends the session. `POST /api/session` while a session exists implicitly ends the previous one and writes a `ROLE_SWITCHED` system audit entry with both identities, so a demo role switch is itself part of the record.
9. At startup, the route registry self-check asserts that every registered route declares `allowed_roles`, and that every mutating route declares a non-empty set. A route missing its declaration aborts startup with `ROUTE_PERMISSION_MISSING` — it is impossible to ship an unprotected mutating endpoint by omission.

### §2 Complete RBAC matrix

**CS** = Cargo Specialist · **SUP** = Supervisor · **ADM** = System Administrator · ✅ allowed · ❌ denied (`403 FORBIDDEN_ROLE`) · ⚠️ allowed subject to a resource predicate

| # | Method | Route | CS | SUP | ADM | Predicate |
|---|---|---|---|---|---|---|
| **Session & users** |
| 1 | GET | `/api/users` | ✅ | ✅ | ✅ | open (no session required) |
| 2 | POST | `/api/session` | ✅ | ✅ | ✅ | open |
| 3 | GET | `/api/session` | ✅ | ✅ | ✅ | — |
| 4 | DELETE | `/api/session` | ✅ | ✅ | ✅ | — |
| 5 | GET | `/api/rbac/matrix` | ✅ | ✅ | ✅ | — |
| 6 | POST | `/api/users` | ❌ | ❌ | ✅ | — |
| 7 | PATCH | `/api/users/{id}` | ❌ | ❌ | ✅ | — |
| **Queue & shipments (read)** |
| 8 | GET | `/api/queue` | ✅ | ✅ | ✅ | ADM read-only |
| 9 | GET | `/api/shipments/{id}` | ✅ | ✅ | ✅ | — |
| 10 | GET | `/api/shipments/{id}/exceptions` | ✅ | ✅ | ✅ | — |
| 11 | GET | `/api/shipments/{id}/evaluations` | ✅ | ✅ | ✅ | — |
| 12 | GET | `/api/shipments/{id}/evaluations/{v}` | ✅ | ✅ | ✅ | — |
| 13 | GET | `/api/shipments/{id}/evaluations/{a}/diff/{b}` | ✅ | ✅ | ✅ | — |
| 14 | GET | `/api/shipments/{id}/documents` | ✅ | ✅ | ✅ | — |
| 15 | GET | `/api/shipments/{id}/document-requests` | ✅ | ✅ | ✅ | — |
| 16 | GET | `/api/documents/{id}/content` | ✅ | ✅ | ✅ | — |
| 17 | GET | `/api/shipments/{id}/upload-fixtures` | ✅ | ✅ | ❌ | — |
| **Workflow (mutating)** |
| 18 | GET | `/api/cases/{id}/available-actions` | ✅ | ✅ | ✅ | ADM always receives all-false with `ROLE_NOT_PERMITTED` |
| 19 | GET | `/api/workflow/transitions` | ✅ | ✅ | ✅ | — |
| 20 | POST | `/api/cases/{id}/actions` — `REQUEST_INFORMATION` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`, `PENDING_APPROVAL` |
| 21 | POST | `/api/cases/{id}/actions` — `SEND_FOR_SPECIALIST_REVIEW` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`; invalid from `IN_REVIEW`, `PENDING_APPROVAL` |
| 22 | POST | `/api/cases/{id}/actions` — `CLEAR_EXCEPTION` | ⚠️ | ✅ | ❌ | CS denied from `ON_HOLD`, `ESCALATED`, `PENDING_APPROVAL` |
| 23 | POST | `/api/cases/{id}/actions` — `PLACE_ON_HOLD` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`, `PENDING_APPROVAL` |
| 24 | POST | `/api/cases/{id}/actions` — `ESCALATE_TO_SUPERVISOR` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`, `PENDING_APPROVAL` |
| 25 | GET | `/api/cases/{id}/actions` | ✅ | ✅ | ✅ | — |
| 26 | POST | `/api/shipments/{id}/revalidate` | ✅ | ✅ | ❌ | denied when `CLEARED` |
| **Documents (mutating)** |
| 27 | POST | `/api/document-requests/{id}/upload` | ✅ | ✅ | ❌ | request must be `OUTSTANDING`; case not `CLEARED` |
| 28 | POST | `/api/document-requests/{id}/cancel` | ✅ | ✅ | ❌ | request must be `OUTSTANDING` |
| **Approvals** |
| 29 | POST | `/api/cases/{id}/approval` | ❌ | ⚠️ | ❌ | **SoD-2**: approver ≠ recommender |
| 30 | GET | `/api/cases/{id}/recommendations` | ✅ | ✅ | ✅ | — |
| 31 | GET | `/api/cases/{id}/approvals` | ✅ | ✅ | ✅ | — |
| **AI assistance** |
| 32 | GET | `/api/shipments/{id}/ai/summary` | ✅ | ✅ | ✅ | — |
| 33 | POST | `/api/shipments/{id}/ai/summary/regenerate` | ✅ | ✅ | ❌ | — |
| 34 | GET | `/api/shipments/{id}/ai/recommendation` | ✅ | ✅ | ✅ | — |
| 35 | POST | `/api/shipments/{id}/ai/recommendation/regenerate` | ✅ | ✅ | ❌ | — |
| 36 | GET | `/api/shipments/{id}/ai/outputs` | ✅ | ✅ | ✅ | — |
| **Audit & notifications** |
| 37 | GET | `/api/cases/{id}/audit` | ✅ | ✅ | ✅ | — |
| 38 | GET | `/api/cases/{id}/audit/{sequence_no}` | ✅ | ✅ | ✅ | — |
| 39 | GET | `/api/cases/{id}/audit/verify` | ✅ | ✅ | ✅ | — |
| 40 | GET | `/api/cases/{id}/audit/export` | ✅ | ✅ | ✅ | — |
| 41 | GET | `/api/audit` (cross-case) | ❌ | ✅ | ✅ | — |
| 42 | GET | `/api/notifications` | ✅ | ✅ | ✅ | CS sees only `CARGO_SPECIALIST`-addressed items |
| 43 | GET | `/api/notifications/unread-count` | ✅ | ✅ | ✅ | same scoping |
| 44 | GET | `/api/cases/{id}/notifications` | ✅ | ✅ | ✅ | — |
| 45 | POST | `/api/notifications/{id}/read` | ⚠️ | ✅ | ✅ | must be addressed to the acting role |
| 46 | POST | `/api/notifications/read-all` | ✅ | ✅ | ✅ | scoped to the acting role |
| **Rules** |
| 47 | GET | `/api/rules` | ✅ | ✅ | ✅ | CS/SUP read-only — the rule must be visible to be defensible |
| 48 | GET | `/api/rules/{id}` | ✅ | ✅ | ✅ | — |
| 49 | POST | `/api/rules` | ❌ | ❌ | ✅ | — |
| 50 | PATCH | `/api/rules/{id}` | ❌ | ❌ | ✅ | — |
| 51 | POST | `/api/rules/{id}/enable` | ❌ | ❌ | ✅ | — |
| 52 | POST | `/api/rules/{id}/disable` | ❌ | ❌ | ✅ | — |
| 53 | POST | `/api/rules/{id}/preview-impact` | ❌ | ❌ | ✅ | — |
| 54 | GET | `/api/rules/{id}/history` | ✅ | ✅ | ✅ | — |
| **Ingestion & demo operations** |
| 55 | POST | `/api/ingest/cargo-entries` | ❌ | ❌ | ✅ | — |
| 56 | GET | `/api/ingest/reports/{batch_id}` | ❌ | ❌ | ✅ | — |
| 57 | POST | `/api/admin/reset` | ❌ | ❌ | ✅ | — |
| 58 | GET | `/api/admin/seed-report` | ❌ | ❌ | ✅ | — |
| 59 | GET | `/api/health` | ✅ | ✅ | ✅ | open (no session required) |
| 60 | GET | `/api/openapi.json` | ✅ | ✅ | ✅ | open |

**Role summaries derived from the matrix:**
- **Cargo Specialist** works the queue, reviews shipments, requests documents, uploads simulated documents, revalidates, takes the five actions subject to state, and recommends clearance. Cannot approve clearance (row 29), cannot edit rules (rows 49–53), cannot ingest or reset (rows 55–58), cannot read cross-case audit (row 41).
- **Supervisor** does everything a specialist can do, plus approves/rejects recommendations (row 29, subject to SoD-2), acts on escalated cases, and reads cross-case audit. Cannot edit rules (rows 49–53) — rule ownership is deliberately separated from adjudication authority.
- **System Administrator** manages rules, users, ingestion, and reset, and has read access across the domain for support purposes. Cannot adjudicate: denied on all five actions (rows 20–24), revalidation (26), upload/cancel (27–28), approval (29), and AI regeneration (33, 35). This is the mirror image of the supervisor's rule restriction — neither role can quietly become the other.

**Inputs:**
- `POST /api/session` body: `{ user_id: string (required) }`
- `X-CargoDemo-Session` header or `cargodemo_session` cookie on every protected request
- `POST /api/users` body (ADM): `{ name (2–120), role (enum), active (boolean, default true) }`
- `PATCH /api/users/{id}` body (ADM): `{ name?, role?, active? }`

**Outputs:**
- `POST /api/session` → `{ session_token, user: { id, name, role }, permissions_summary: { can_approve, can_edit_rules, can_adjudicate, can_reset } }`
- `GET /api/session` → the current acting user, or `401`
- `GET /api/rbac/matrix` → the declarative matrix as data, consumed by the UI to hide unavailable navigation and by the F21 tests to enumerate expectations
- `ACCESS_DENIED` audit entries on every rejection
- Actor stamping on every audit entry system-wide

**Validation:**
- The role MUST NOT be readable from any client-supplied field. An implementation accepting `role` in a body or query parameter is a defect; an F21 test posts a spoofed role alongside a specialist session and asserts the specialist's permissions still apply.
- Every route MUST declare `allowed_roles`; enforced by the startup self-check.
- Every mutating route MUST perform its role check **before** any domain write and before any resource predicate that could leak existence information.
- Denials MUST be recorded as `ACCESS_DENIED` audit entries with the attempted route, method, target ID, acting user, and reason (F12 §2).
- Session tokens MUST be random (≥ 256 bits), stored hashed, and MUST NOT encode the role — a token is an identity reference, not a capability grant.
- Only the three canonical roles may exist. `POST /api/users` with any other role value returns `422 INVALID_ENUM_VALUE`.
- A user MUST NOT be able to change their own role (`PATCH /api/users/{id}` with `id = acting_user_id` and a role change returns `403 SELF_ROLE_CHANGE_BLOCKED`), so an administrator cannot silently grant themselves approval authority mid-demo.
- Deactivating a user MUST invalidate their sessions; subsequent requests return `401 SESSION_INVALID`.
- The matrix served at `GET /api/rbac/matrix` MUST be generated from the same declarations the middleware enforces — not a hand-maintained copy.
- An F21 RBAC test MUST iterate the full cross-product of (60 routes × 3 roles) and assert the expected allow/deny outcome, including the two predicate cases (self-approval, escalation authority).

**State transitions caused:** None directly. F14 gates every transition and can prevent one; it never causes one.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| No session on a protected route | 401 | `UNAUTHENTICATED` | "No acting user; select a role to continue" |
| Session token unknown, expired, or for a deactivated user | 401 | `SESSION_INVALID` | "Session is no longer valid; sign in again" |
| Role not permitted for the route | 403 | `FORBIDDEN_ROLE` | "Role {role} may not perform {operation}" |
| Specialist acting on an escalated case | 403 | `ESCALATED_REQUIRES_SUPERVISOR` | "Only a Supervisor may act on an escalated case" |
| Recommender approving their own recommendation | 403 | `SELF_APPROVAL_BLOCKED` | "You submitted this recommendation and cannot decide on it" |
| Self role change | 403 | `SELF_ROLE_CHANGE_BLOCKED` | "You cannot change your own role" |
| Unknown user on session creation | 404 | `RESOURCE_NOT_FOUND` | "User {id} not found" |
| Inactive user on session creation | 403 | `USER_INACTIVE` | "User {id} is not active" |
| Unsupported role value | 422 | `INVALID_ENUM_VALUE` | "role must be one of: CARGO_SPECIALIST, SUPERVISOR, SYSTEM_ADMINISTRATOR" |
| Route registered without a permission declaration | n/a (startup abort) | `ROUTE_PERMISSION_MISSING` | "Route {method} {path} has no allowed_roles declaration" |

**API Surface (this feature):** rows 1–7 and 5 of the matrix above; full schemas in `Y1c-api-admin.md` §Session and roles.

**Schema Surface (this feature):** owns `users` and `sessions`; stamps `actor_*` columns on `audit_entries`. See `Y0b-schema-workflow-audit.md` §Users and sessions.
---

## F15: Rule Administration

**Priority:** P1 · **Category:** Access Control & Administration

**Description:** F15 is the System Administrator surface for managing business rules as configuration, proving the generated application remains adaptable without regeneration. It lists rules with type, severity, enabled state, and policy reference; creates, edits, enables, and disables rules within the three supported exception types; validates definitions on save with clear rejection messages; previews the effect of a change before applying it; and records every change in the audit trail with the administrator's identity and timestamp. It exists to support the four primary screens, not to expand the demo (PRD §5.8).

**Terminology:**
- **Rule version:** `rules.version`, incremented on every save. Exceptions record the rule version that produced them, so a finding remains explicable after the rule changes.
- **Impact preview:** A dry-run evaluation of the proposed rule set against all non-cleared shipments, reporting which exceptions would appear, disappear, or change severity — with **no writes**.
- **Apply with revalidation:** Saving a rule change and immediately revalidating affected shipments (F6 with `trigger = RULE_CHANGE`), so the effect is visible on the queue without a restart.
- **Rule history:** The append-only sequence of `RULE_CREATED` / `RULE_UPDATED` / `RULE_ENABLED` / `RULE_DISABLED` audit entries with before/after parameter diffs.

**Sub-features:**
- Rule list with type, severity, enabled state, policy reference, and current impact count
- Rule creation and editing within the three exception types
- Enable / disable toggling
- Parameter editing per exception type
- Definition validation on save with field-level messages
- Impact preview and apply-with-revalidation
- Change auditing with parameter diffs

**Process:**
1. The administrator opens the Rule Administration surface (reachable only from the administrator navigation, F16). It calls `GET /api/rules` and renders the list with, for each rule, the number of shipments currently carrying an `OPEN` exception from it.
2. Creating or editing a rule opens a type-aware form. Selecting an `exception_type` renders exactly the parameters that type accepts (F4 §4–§6); no free-form JSON editing is required, though the raw `params_json` is shown read-only for transparency.
3. On submit, the client calls `POST /api/rules/{id}/preview-impact` with the proposed definition. The server validates the definition, runs the rule set — with the proposed rule substituted in memory — against every non-cleared shipment, and returns the projected differences. **Nothing is written.** This satisfies PRD F15's "show the effect of a rule change".
4. The administrator reviews the preview: shipments that would gain an exception, lose one, or change priority, with counts and a per-shipment list capped at 100 entries.
5. On confirm, the client calls `POST /api/rules` (create) or `PATCH /api/rules/{id}` (edit) with `{ definition, change_note, revalidate_affected }`.
6. The server revalidates the definition, persists it with `version = version + 1`, invalidates the rule cache (F4 §Process step 2), and writes a `RULE_CREATED`/`RULE_UPDATED` audit entry containing the full before and after definitions, the computed parameter diff, the administrator's identity, the timestamp, and the change note.
7. If `revalidate_affected = true`, the server revalidates every non-cleared shipment whose exception set could be affected — determined as the union of (shipments with an `OPEN` exception from this rule) and (shipments matching the new definition's applicability conditions). Each revalidation is a normal F6 run with `trigger = RULE_CHANGE`, producing its own evaluation version and audit entry.
8. Enable/disable are dedicated endpoints rather than a `PATCH` field, because they are the most consequential single-click change and deserve their own audit event type and their own confirmation copy.
9. The response reports the saved rule, the revalidation summary, and a link to the rule history.

**Inputs:**

`POST /api/rules` / `PATCH /api/rules/{id}` body:
- `definition` (object, required): the rule definition per F4 §2 — `name`, `exception_type` (create only; immutable on edit), `description`, `policy_reference`, `severity`, `priority_mapping`, `conditions`, `params_json`
- `change_note` (string, required, 10–500 chars): why the change is being made. Recorded on the audit entry.
- `revalidate_affected` (boolean, optional, default `true`)

`POST /api/rules/{id}/preview-impact` body: `{ definition }` (the proposed definition; for an existing rule the ID is taken from the path)

`POST /api/rules/{id}/enable` / `.../disable` body: `{ change_note (required, 10–500 chars), revalidate_affected (boolean, default true) }`

`GET /api/rules` query: `exception_type`, `enabled`, `severity`, `page`, `page_size`

**Outputs:**
- Rule list projection: `{ id, name, exception_type, severity, enabled, policy_reference, description, version, updated_at, updated_by_name, open_exception_count, affected_shipment_count }`
- Rule detail adding `conditions`, `params_json`, and `params_schema` (the JSON Schema for its type, so the UI can render the form generically)
- `ImpactPreview`: `{ valid, evaluated_shipments, would_add: [{ shipment_id, exception_type, severity }], would_remove: [{ shipment_id, exception_id, exception_type }], would_change_severity: [...], would_change_priority: [{ shipment_id, from, to }], summary: { added, removed, unchanged, priority_changes }, truncated: boolean }`
- `RuleSaveResult`: `{ rule, previous_version, diff: [{ path, before, after }], revalidation: { shipments_revalidated, exceptions_added, exceptions_resolved, priorities_changed }, audit_entry_id }`
- Rule history: the audit entries for the rule with before/after definitions

**Validation:**
- `exception_type` MUST be one of exactly three values and is **immutable after creation** — changing a rule's type would orphan the exceptions it produced. Attempting it returns `422 RULE_TYPE_IMMUTABLE`.
- `params_json` MUST validate against the JSON Schema for its `exception_type`, with `additionalProperties: false`. Unknown parameters are rejected with a field-level message naming the parameter and listing the accepted ones — a typo must never silently disable a check.
- Type-specific cross-field validation:
  - HTS: `min_digit_count <= expected_digit_count`; `check_known_codes = true` requires a non-empty `known_codes`; every `known_codes` entry must be a digit string of length ≥ `known_code_prefix_length`.
  - Origin: `comparison_fields` MUST be non-empty and every entry MUST be a recognized origin-bearing path (`manufacturer.address.country`, `documents.{TYPE}.stated_country`); an unrecognized path returns `RULE_PARAM_PATH_UNKNOWN`.
  - Missing document: `required_document_types` MUST be non-empty, ≤ 20 items, each matching `^[A-Z0-9_]{3,60}$` after normalization, with no duplicates.
- `severity` MUST be one of the four canonical values; `conditions` MUST validate against the shared conditions schema (F4 §3).
- `name` MUST be unique across rules (case-insensitive), 3–120 chars.
- `policy_reference` and `description` are **required**, because F19 must always be able to display the triggering authority and a human-readable statement of the rule. A rule without them cannot be defended on screen.
- `change_note` is required on every mutation, including enable/disable. Rule changes are governance events and carry the same justification discipline as case actions.
- Only `SYSTEM_ADMINISTRATOR` may create, edit, enable, disable, or preview (F14 rows 49–53). All roles may read rules and rule history (rows 47–48, 54) — a specialist must be able to see the rule that flagged their shipment.
- Rule changes MUST NOT modify existing `exceptions` rows. Historical exceptions keep their `rule_version` and their original evidence; the effect of a change appears only in new evaluations (F6 resolved-not-deleted semantics, with `resolution_reason = RULE_PARAMS_CHANGED` or `RULE_DISABLED`).
- A rule MUST NOT be deletable. Disabling is the supported retirement path, so the rule that produced a historical exception remains readable forever. `DELETE /api/rules/{id}` is not defined.
- Impact preview MUST perform zero writes; asserted by an F21 test that snapshots row counts and `updated_at` values across a preview call.
- Preview and apply MUST use the same evaluator code path as production evaluation — a divergent "simulation" implementation would make the preview untrustworthy.
- A rule change MUST NOT affect a `CLEARED` case (F09a I6); such cases are excluded from the revalidation set and reported as `skipped_cleared` in the summary.

**State transitions caused:** None directly. Revalidation triggered by a rule change follows F6's status table, which never moves a case to `CLEARED` or `PENDING_APPROVAL`. A rule change can therefore change what a case is flagged for, and its priority, but never its disposition.

**Demonstration path (PRD §7 "Rule configurability"):** an administrator opens `rule-hts-completeness`, changes `expected_digit_count` from 10 to 6, previews (the preview reports that `SHP-2026-0007` and `SHP-2026-0001` would lose their HTS exception), applies with revalidation, and the queue immediately shows the reduced exception counts — with zero code changes and zero redeploys. Reverting the parameter restores the prior state, and both changes are in the rule history with the administrator's name.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Non-administrator attempts a mutation | 403 | `FORBIDDEN_ROLE` | "Only a System Administrator may manage rules" |
| Rule not found | 404 | `RESOURCE_NOT_FOUND` | "Rule {id} not found" |
| `exception_type` changed on edit | 422 | `RULE_TYPE_IMMUTABLE` | "A rule's exception type cannot be changed" |
| Unknown parameter in `params_json` | 422 | `RULE_CONFIG_INVALID` | "Unknown parameter '{param}' for {exception_type}; accepted: {list}" |
| Cross-field parameter violation | 422 | `RULE_CONFIG_INVALID` | "{detail}" (e.g. "min_digit_count cannot exceed expected_digit_count") |
| Unrecognized origin comparison path | 422 | `RULE_PARAM_PATH_UNKNOWN` | "Field path {path} is not a recognized origin-bearing field" |
| Empty `known_codes` with `check_known_codes` | 422 | `RULE_CONFIG_INVALID` | "known_codes must be non-empty when check_known_codes is enabled" |
| Duplicate rule name | 409 | `RULE_NAME_CONFLICT` | "A rule named '{name}' already exists" |
| Missing `change_note` | 422 | `CHANGE_NOTE_REQUIRED` | "A change note is required for rule changes" |
| Missing `policy_reference` or `description` | 422 | `VALIDATION_FAILED` | "policy_reference and description are required" |
| Enable/disable a rule already in that state | 409 | `TRANSITION_REDUNDANT` | "Rule {id} is already {state}" |
| Attempt to delete a rule | 405 | `RULE_DELETE_NOT_SUPPORTED` | "Rules cannot be deleted; disable the rule instead" |
| Revalidation failed after a successful save | 207 | `PARTIAL_REVALIDATION_FAILURE` | "Rule saved; {n} shipment(s) failed revalidation" |
| Preview exceeded the evaluation budget | 422 | `PREVIEW_TOO_LARGE` | "Impact preview limited to 500 shipments" |

A save and its revalidation are separate transactions by design: the rule change is durable even if a subsequent shipment revalidation fails, and the failure is reported rather than silently rolling back a valid configuration change. The affected shipments can be revalidated individually from F18.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/rules` | CS, SUP, ADM | Rule list with impact counts |
| GET | `/api/rules/{id}` | CS, SUP, ADM | Rule detail plus its params JSON Schema |
| POST | `/api/rules` | ADM | Create a rule |
| PATCH | `/api/rules/{id}` | ADM | Edit a rule |
| POST | `/api/rules/{id}/enable` | ADM | Enable |
| POST | `/api/rules/{id}/disable` | ADM | Disable |
| POST | `/api/rules/{id}/preview-impact` | ADM | Dry-run impact analysis |
| GET | `/api/rules/{id}/history` | CS, SUP, ADM | Change history with diffs |

Full schemas: `Y1c-api-admin.md` §Rules.

**Schema Surface (this feature):** writes `rules`, `audit_entries`, `notifications`; triggers writes to `evaluations`/`exceptions`/`evidence`/`cases` via F6. See `Y0a-schema-core.md` §Rules.
---

## F16: Application Shell, Navigation & Role Switcher

**Priority:** P0 · **Category:** User Interface

**Description:** F16 is the frame every screen lives in: layout, navigation across the four primary screens and the administrator surfaces, the simulated login / role selector with the acting user always visible, the notification indicator, the demo-mode and AI-fallback banners, and the shared visual language for status, priority, exception types, AI-generated content, and evidence. It also defines the loading, empty, and error states that every data-backed view inherits.

**Terminology:**
- **Primary navigation:** Exception Queue, Shipment Review, Recommended Resolution, Decision & Audit Record. The last three are case-scoped and are disabled until a shipment is selected.
- **Case context:** The currently selected `shipment_id`, held in the route (`/shipments/:shipmentId/review`) so a deep link restores the exact screen — important for a live demo where a mis-click must be recoverable in one step.
- **Role switcher:** The header control that ends the current session and starts a new one as a different seeded user (F14 §1 step 8).
- **Shared component:** A presentational component used identically everywhere so that a status badge, an AI label, or an evidence row never varies between screens.

**Sub-features:**
- Persistent layout with header, primary navigation, and content region
- Case-scoped routing and deep links
- Simulated login / role selector with always-visible acting user
- Role-aware navigation (administrator surfaces hidden from CS and SUP)
- Notification indicator with unread count and dropdown list
- Demo-mode and AI-fallback banners
- Shared components: status badge, priority indicator, exception-type chip, AI-content label, evidence row, justification input, disabled-action tooltip
- Loading, empty, and error states

**Process:**
1. On load, the app calls `GET /api/session`. If unauthenticated it renders the role selector as a full-screen gate listing the seeded users from `GET /api/users` with their names and roles. No screen is reachable without a named acting user — the identity is a prerequisite, not an afterthought.
2. On session establishment the shell renders: header (product name, demo-mode chip, notification indicator, acting user chip with name + role, role switcher), primary navigation, and the routed content.
3. The shell calls `GET /api/rbac/matrix` once and uses it to hide navigation entries the acting role cannot use. Hiding is presentational only; the server denies regardless (F14).
4. Selecting a queue row sets the case context and enables the three case-scoped navigation entries. Navigating between them preserves the context; returning to the queue clears it.
5. The shell polls `GET /api/notifications/unread-count` every 20 seconds and after every mutating action, and updates the indicator. Polling is used rather than websockets because the demo is single-session and has no async job surface (PRD §5.9).
6. The shell calls `GET /api/health` on load and every 60 seconds. When `ai.mode` is a fallback mode, it renders the AI-fallback banner: *"AI assistance is running in offline fallback mode. Summaries and recommendations are generated deterministically from the recorded evidence."* When the health check fails, it renders a degraded banner naming the failing subsystem.
7. Every data-backed view renders one of four states: loading (skeleton matching the eventual layout, never a spinner that shifts content), empty (explanatory text plus the action that would populate it), error (the error `code` rendered as human copy, with a Retry control and the `request_id` shown for support), or ready.
8. Role switching prompts for confirmation, calls `DELETE /api/session` then `POST /api/session`, clears client caches, and returns to the queue preserving the previously selected shipment as a deep link so a demo can re-enter the same case as a different role in two clicks.

**Inputs:**
- `GET /api/session`, `GET /api/users`, `GET /api/rbac/matrix`, `GET /api/notifications/unread-count`, `GET /api/health`
- Route parameters: `shipmentId`
- User interactions: navigation, role selection, notification open/read, banner dismissal (dismissal is per-session and never suppresses the fallback banner, which must remain visible while the condition holds)

**Outputs:**
- Rendered shell with active-route highlighting
- Acting user and role visible on every screen at all times
- Notification indicator with unread count and dropdown
- Persistent demo-mode chip reading *"Demo — synthetic data, simulated login, notifications not transmitted"*
- Shared components consumed by F17–F20

**Shared component contracts:**

| Component | Props | Rules |
|---|---|---|
| `StatusBadge` | `status` | Text label plus a distinct shape/icon; never color alone (PRD §6 Accessibility). `CLEARED` is visually distinct from all in-flight statuses. |
| `PriorityIndicator` | `priority`, `basis` | Text label plus rank glyph; tooltip lists the derivation factors from `priority_basis` (F5 §Process step 6). |
| `ExceptionTypeChip` | `exception_type`, `count?` | One chip per distinct type; multi-exception shipments render multiple chips, never a collapsed "3 exceptions" string (PRD F17). |
| `AiContentLabel` | `provenance` | Wraps all AI text. Renders "AI-generated" plus provider, model, generation mode, and timestamp. Renders "offline fallback" when the mode is any `FALLBACK_*`. Must never wrap human-authored text. |
| `EvidenceRow` | `evidence` | Renders `field_path`, raw value, normalized value, and the comparison pair when present, as labeled text — not prose. |
| `JustificationInput` | `minLength`, `value` | Required-field styling, live character count, inline error when under the minimum. Never prefilled, never populated from the AI rationale (F09b §Validation). |
| `DisabledActionButton` | `action`, `reason` | Renders the action disabled with the reason text visible (not tooltip-only), from F09a §5. |

**Validation:**
- Every screen MUST display the acting user's name and role; a screen that renders without them is a defect (PRD §6 Governance depends on the operator always knowing who they are acting as).
- Administrator-only navigation MUST be hidden from CS and SUP, and the corresponding routes MUST render a 403 view if reached by URL.
- The AI-fallback banner MUST be visible whenever any AI output on the current screen was produced in a fallback mode, and MUST NOT be dismissible while that condition holds.
- All four primary screens MUST be keyboard navigable: visible focus rings, logical tab order, skip-to-content link, `Escape` closing overlays, and `Enter`/`Space` activating controls.
- Semantic markup MUST be used: `<table>` with `<th scope>` for the queue and audit tables, heading hierarchy without skipped levels, `<nav>`/`<main>`/`<header>` landmarks, `aria-live="polite"` on the notification indicator and on post-action confirmations.
- Status and priority MUST be conveyed by text, not color alone; contrast MUST meet WCAG 2.1 AA (4.5:1 body, 3:1 large text and UI boundaries).
- The layout MUST be responsive from 1024px to 1920px and MUST remain usable in an embedded preview iframe with no horizontal scrolling of the primary content region.
- Loading states MUST reserve the eventual layout's space so content does not jump — a live demo cannot afford a mis-click caused by reflow.
- Every error view MUST show the server's error `code` translated to human copy plus the `request_id`; raw stack traces MUST NOT be rendered.
- The client MUST NOT cache mutating responses, and MUST invalidate queue, shipment, exception, AI, audit, and notification caches after any action, upload, revalidation, or approval.

**State transitions caused:** None. The shell initiates no workflow transitions; it routes to the screens that do.

**Error States:**

| Scenario | UI behavior | Underlying code |
|---|---|---|
| No session | Full-screen role selector gate | `UNAUTHENTICATED` |
| Session invalidated mid-demo | Toast plus return to the role selector, preserving the deep link | `SESSION_INVALID` |
| Route reached without permission | Inline 403 view naming the role and the required role | `FORBIDDEN_ROLE` |
| Shipment in the URL does not exist | Inline 404 view with a link back to the queue | `RESOURCE_NOT_FOUND` |
| API unreachable | Full-width error banner with Retry; navigation remains usable | network error |
| Health check reports a degraded subsystem | Persistent warning banner naming the subsystem | — |
| AI running in fallback | Persistent informational banner, non-dismissible | — |
| Case modified by another user | Toast "This case changed; reloading" plus automatic refetch | `CASE_VERSION_CONFLICT` |

**API Surface (this feature):** consumes rows 1–5, 43, and 59 of the F14 matrix. Defines no endpoints of its own.

**Schema Surface (this feature):** none directly; reads projections from `users`, `sessions`, `notifications`, and the health endpoint.
---

## F17: Cargo Exception Queue Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough step:** 1

**Description:** F17 is the landing screen and the first step of the walkthrough: the tabular list of flagged shipments a specialist works from. It shows shipment ID, importer, exception, priority, and status; supports filtering by status, exception type, and priority and sorting by priority and age; visually distinguishes items pending supervisor approval; indicates multi-exception shipments rather than collapsing them; and reflects state changes made elsewhere in the workflow.

**Terminology:**
- **Queue membership:** A shipment appears when it has ≥ 1 `OPEN` exception, or its case status is `PENDING_APPROVAL` (F5 §Terminology). Clean shipments and cleared shipments are excluded by default and reachable through filters.
- **Age:** Time since the oldest `OPEN` exception's `opened_at` — not since the case was created. A case that has been reworked shows the age of the problem, not the age of the paperwork.
- **Row selection:** Clicking or keyboard-activating a row navigates to that shipment's Review screen (walkthrough step 2).

**Sub-features:**
- Tabular list with the five PRD-mandated columns plus age and exception count
- Filter by status, exception type, priority, assignment, and pending-approval
- Sort by priority and by age
- Pending-approval visual distinction and supervisor quick filter
- Multi-exception indication
- Live reflection of workflow changes
- Loading, empty, and error states

**Process:**
1. On mount the screen calls `GET /api/queue` with the current filter/sort state (defaults: no filters, `sort=priority:desc,age:desc`, `page_size=25`).
2. The table renders one row per shipment with columns: **Shipment ID**, **Importer**, **Exception(s)**, **Priority**, **Status**, **Age**, **Assigned to**.
   - **Exception(s)** renders one `ExceptionTypeChip` per distinct open exception type plus a count when a type occurs more than once. A three-exception shipment shows three chips — never "3 exceptions" (PRD F17: multi-exception shipments must not be collapsed).
   - **Priority** renders `PriorityIndicator` with the derivation basis in its tooltip.
   - **Status** renders `StatusBadge`; `PENDING_APPROVAL` rows additionally carry a persistent "Awaiting your approval" marker for supervisors, and "Awaiting supervisor" for specialists.
3. Filter controls: status (multi-select over the seven statuses), exception type (multi-select over the three types), priority (multi-select over the four levels), assignment (`any` | `me` | `unassigned`), and a `Pending approval only` toggle that is prominent for supervisors and available to specialists.
4. Sort controls: Priority (default descending) and Age (descending = oldest first). Sorting is server-side; ties break on `shipment_id` ascending so ordering is stable and identical on every run (PRD §6 Determinism).
5. Applied filters render as removable chips built from the server's `applied` block, so the UI always shows the server's interpretation rather than its own optimistic state.
6. Selecting a row navigates to `/shipments/{shipment_id}/review` and sets the case context (F16).
7. The screen refetches on window focus, after any mutating action anywhere in the app, and on a 30-second interval, so post-action and post-revalidation state is reflected without a manual reload.
8. Empty state distinguishes three cases: no flagged shipments at all ("No shipments are currently flagged"), none matching the filters ("No shipments match these filters" plus a Clear filters control), and a data-load failure (error state with Retry).

**Inputs:**
- `GET /api/queue` query parameters:
  - `status` (repeatable, canonical status codes)
  - `exception_type` (repeatable, canonical type codes)
  - `priority` (repeatable, canonical priority codes)
  - `assignment` (`any` | `me` | `unassigned`, default `any`)
  - `pending_approval_only` (boolean, default `false`)
  - `include_clean` (boolean, default `false`) — shows shipments with zero exceptions
  - `include_cleared` (boolean, default `false`)
  - `sort` (default `priority:desc,age:desc`; allowed fields `priority`, `age`, `shipment_id`, `value`, `status`)
  - `page`, `page_size` (default 25, max 100)
- Acting user role from session (affects the pending-approval affordance and the `me` assignment filter)

**Outputs:**
- Rendered table with the columns above and a result count
- `QueueRow` projection per row:
  ```
  { shipment_id, case_id, importer_name, priority, priority_basis_summary, status,
    open_exception_count, exception_types: [{ type, count }], exception_summary,
    oldest_exception_opened_at, age_days, assigned_to: { id, name } | null,
    pending_approval: { recommended_by_name, recommended_at } | null,
    shipment_value_usd, updated_at }
  ```
- Navigation to the Shipment Review screen on row activation
- Active-filter chips and pagination controls

**Validation:**
- The default view MUST exclude shipments with zero `OPEN` exceptions and MUST exclude `CLEARED` cases, so the queue is a work list rather than a data dump. `SHP-2026-0011` (the clean seeded shipment) MUST NOT appear by default — this is the visible proof that clean entries stay off the queue.
- A `PENDING_APPROVAL` case MUST appear even if its exceptions are all proposed for clearance, because it is the supervisor's work item.
- Every row MUST show all five PRD-mandated columns; a build that omits any of them fails acceptance.
- Multi-exception shipments MUST render one chip per distinct type. The canonical shipment MUST show three distinct chips.
- Sorting MUST be deterministic: identical data MUST produce identical row order across reloads and across demo runs.
- Filter values outside the canonical enums MUST be rejected by the server (`INVALID_QUERY_PARAM`) rather than ignored, and the UI MUST surface the rejection rather than silently showing unfiltered data.
- Rows MUST be keyboard-selectable (`Tab` to the row, `Enter`/`Space` to open) with a visible focus ring, and the table MUST use `<th scope="col">` headers.
- Queue load MUST complete in < 1 s with the seeded dataset (PRD §6).
- The screen MUST NOT expose any action controls. All decisions happen on F18/F19, so the queue can never become a place where a shipment is dispositioned without its evidence being read.

**State transitions caused:** None. F17 is read-only; it is the entry point to the screens that transition state.

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| Queue fetch failed | Error panel with Retry and `request_id` | `INTERNAL_ERROR` / network |
| Invalid filter in a restored URL | Filter chip flagged invalid; server rejection surfaced; Clear filters offered | `INVALID_QUERY_PARAM` |
| No results with filters applied | Empty state with Clear filters | — |
| No flagged shipments at all | Empty state explaining that all shipments are clear | — |
| Session expired during polling | Toast plus role selector gate | `SESSION_INVALID` |
| Row target shipment deleted/reset mid-demo | Navigation shows the 404 view; queue refetches | `RESOURCE_NOT_FOUND` |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/queue` | CS, SUP, ADM | Filterable, sortable queue projection |

Full schema: `Y1a-api-read.md` §Queue.

**Schema Surface (this feature):** reads `cases`, `cargo_entries`, `exceptions`, `recommendations`, `users`. No writes.
---

## F18: Shipment Review Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough steps:** 2, 3, 5, 6, 7

**Description:** F18 is the full case detail view. It presents importer, carrier, product description, HTS code, country of origin, manufacturer (name and address), and shipment value; a documents-received panel with per-document state and provenance; a validation-results panel listing every detected exception with its rule and severity; and the AI-generated plain-language summary, clearly labeled with attribution. From this screen the specialist requests additional information, uploads a simulated document, revalidates, and navigates to Recommended Resolution. It shows inline what changed after a revalidation. Four of the ten walkthrough steps happen here.

**Terminology:**
- **Shipment header:** The identity block — shipment ID, importer, status, priority, value — pinned above the panels so the operator never loses context while scrolling.
- **Documents panel:** Required and received documents together, so a missing document is visible as an absence rather than inferable from a gap.
- **Validation results panel:** The exception list rendered independently of the AI summary, so a reviewer can verify the machine narrative against the machine findings (PRD §8 risk mitigation).
- **Change indication:** The post-revalidation banner and per-exception markers showing what resolved, what was retained, and what is new.

**Sub-features:**
- Shipment attribute display (all eight PRD-required fields plus entry date)
- Documents-received panel with state, provenance, and request linkage
- Validation results panel with rule, severity, policy reference, and evidence
- AI summary panel with attribution and AI labeling
- Actions: request information, upload simulated document, revalidate, go to Recommended Resolution
- Post-revalidation change indication
- Evaluation history access

**Process:**
1. On mount the screen calls, in parallel: `GET /api/shipments/{id}`, `GET /api/shipments/{id}/exceptions`, `GET /api/shipments/{id}/documents`, `GET /api/shipments/{id}/document-requests`, `GET /api/cases/{case_id}/available-actions`, and `GET /api/shipments/{id}/ai/summary`. The first five render the verifiable facts; the AI summary renders when it arrives, so a slow provider never delays the evidence. *(Walkthrough step 2 completes when the first five resolve.)*
2. The **shipment panel** renders: importer, carrier, product description, HTS code (raw, with the normalized digit count annotated when an HTS exception exists), country of origin, manufacturer name and full address with the country emphasized, shipment value formatted as USD, entry date, and the case's status and priority with derivation basis.
3. The **documents panel** renders one row per document type known to the case — every type required by any applicable rule plus every document actually present. Each row shows: type (display name), state (`Received` / `Missing` / `Requested`), provenance (`Seeded` / `Ingested` / `Uploaded this session`), filename with a download link, received timestamp, and, for requested items, the requester and request time. Uploaded-this-session documents are visually marked, satisfying PRD F10's provenance requirement.
4. The **validation results panel** renders one card per `OPEN` exception in the deterministic evaluation order (F4 §Process step 3): exception type chip, severity, rule name, rule description, policy reference, the `assertion` sentence, the evidence rows via `EvidenceRow`, and the missing-information list. Resolved exceptions from the current and prior evaluations are available under a "Resolved (n)" disclosure, so history is present but not noisy.
5. The **AI summary panel** renders the F7 output inside `AiContentLabel` with provider, model, generation mode, and timestamp. In fallback mode it additionally shows the offline-fallback label and the shell banner is active. A Regenerate control is available to CS and SUP. *(Walkthrough step 3 completes here.)*
6. **Request additional information** opens a dialog listing the document types named in open exceptions' missing information as checkboxes, plus an "other type" field gated by `justify_unlisted_document`, plus the mandatory `JustificationInput` (min 10 chars). Submitting posts the `REQUEST_INFORMATION` action (F09b §2). *(Walkthrough step 5.)*
7. **Upload simulated document** appears on each outstanding request row. It offers the seeded upload-ready fixtures for this shipment (`GET /api/shipments/{id}/upload-fixtures`) and a file picker. Submitting posts to `POST /api/document-requests/{id}/upload`. *(Walkthrough step 6.)*
8. On upload success the response embeds the `RevalidationResult`. The screen refetches and renders the **change indication**: a banner reading *"Revalidated: {n} exception(s) resolved, {m} retained, {k} new"*, a green "Resolved by revalidation" marker on each resolved exception card as it moves into the Resolved disclosure, and an "Updated" marker on retained exceptions whose missing-information list shrank. *(Walkthrough step 7.)*
9. **Revalidate** is a distinct control that posts `POST /api/shipments/{id}/revalidate` and produces the same change indication. It is available whenever the case is not `CLEARED`.
10. **Go to Recommended Resolution** navigates to F19 with the case context preserved.
11. Every action control that is unavailable renders as `DisabledActionButton` with the reason text from `GET /api/cases/{id}/available-actions` (F09a §5).

**Inputs:**
- Route parameter `shipmentId`
- `GET /api/shipments/{id}` → shipment attributes, case status, priority and basis, current evaluation version, assignment
- `GET /api/shipments/{id}/exceptions` → open and resolved exceptions with rule, severity, evidence, missing information
- `GET /api/shipments/{id}/documents`, `.../document-requests`, `.../upload-fixtures`
- `GET /api/shipments/{id}/ai/summary`
- `GET /api/cases/{id}/available-actions`
- User interactions: request information (document types + justification), upload (file + metadata), revalidate, regenerate summary, navigate

**Outputs:**
- Rendered detail view with four panels and the action bar
- Posted actions: `REQUEST_INFORMATION`, document upload, revalidation, summary regeneration
- Change indication after any revalidation
- Navigation to F19 and F20

**Validation:**
- All eight PRD-mandated attributes MUST be displayed: importer, carrier, product description, HTS code, country of origin, manufacturer name, manufacturer address, shipment value. A build omitting any of them fails acceptance.
- The documents panel MUST show missing documents explicitly, not merely omit them.
- The validation results panel MUST render independently of the AI summary and MUST remain fully usable when the AI summary is absent, loading, or in fallback — the human must be able to verify the finding without the narrative (PRD §8).
- The AI summary MUST be inside `AiContentLabel` with complete provenance; it MUST NOT be rendered in the same container as human-authored text, and it MUST NOT be presented as a finding.
- Every action button MUST be either enabled or disabled-with-a-visible-reason. There is no hidden-without-explanation state, satisfying PRD §6 Usability.
- Justification MUST be captured before any action is submitted; the submit control stays disabled until the minimum length is met.
- Upload MUST be offered only against an `OUTSTANDING` request; there is no free-floating "attach a document" affordance, because every document in the demo has a requested provenance or a seeded one.
- After a revalidation the screen MUST show what changed. A silent refresh is a defect — walkthrough step 7's entire purpose is visible reconciliation.
- Shipment detail MUST load in < 1 s with the seeded dataset (PRD §6), measured on the five non-AI calls.
- The screen MUST be fully keyboard operable, including the upload dialog, and MUST announce post-action results via `aria-live`.
- A first-time specialist MUST be able to identify why the shipment was flagged within 30 seconds without leaving this screen (PRD §6 Usability) — met by the validation results panel sitting above the fold alongside the summary, with the triggering rule and evidence in the same card.

**State transitions caused (via the actions it invokes):**

| Control | Transition |
|---|---|
| Request additional information | → `AWAITING_INFORMATION` (F09a T01/T06/T11/T16/T21) |
| Upload simulated document | No direct transition; the triggered revalidation may move `AWAITING_INFORMATION → IN_REVIEW` (F6) |
| Revalidate | Per F6's status table; never to `CLEARED` or `PENDING_APPROVAL` |
| Regenerate summary | None (F7 is inert) |

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| Shipment not found | 404 view with a link back to the queue | `RESOURCE_NOT_FOUND` |
| Shipment never evaluated | Validation panel shows "Not yet evaluated" with a Revalidate control | `NO_EVALUATION` |
| AI summary slow or failed | Panel shows the fallback summary with the offline label; never blocks the screen | — (F7 always returns) |
| Action rejected by the state machine | Inline dialog error naming the reason; the case refetches | `INVALID_TRANSITION`, `TRANSITION_REDUNDANT` |
| Action rejected by role | Inline error; the control becomes disabled with the reason | `FORBIDDEN_ROLE`, `ESCALATED_REQUIRES_SUPERVISOR` |
| Justification too short | Inline field error; submit stays disabled | `JUSTIFICATION_REQUIRED` |
| Duplicate document request | Dialog error naming the existing outstanding request | `DUPLICATE_DOCUMENT_REQUEST` |
| Upload rejected (type, size, content, PII) | Dialog error with the specific reason and the accepted types | `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`, `FILE_CONTENT_MISMATCH`, `PII_SUSPECTED` |
| Case changed concurrently | Toast plus automatic refetch; the action is not retried silently | `CASE_VERSION_CONFLICT` |
| Case cleared | All action controls disabled with "This shipment has been cleared" | `CASE_TERMINAL` |

**API Surface (this feature):** consumes matrix rows 9–17, 18, 20, 26, 27, 32, 33. Full schemas in `Y1a-api-read.md` §Shipments and `Y1b-api-actions.md`.

**Schema Surface (this feature):** reads `cargo_entries`, `cases`, `documents`, `document_requests`, `evaluations`, `exceptions`, `evidence`, `rules`, `ai_outputs`; writes indirectly via the actions it invokes.
---

## F19: Recommended Resolution Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough steps:** 4, 8, 9

**Description:** F19 is the decision-support view. It shows the exception detected, the triggering rule and policy with its reference, the supporting evidence, and the missing information required to resolve it; the AI-recommended action with its confidence level and rationale; and all five user actions, with unavailable ones visibly disabled and explained. Justification is mandatory before any action is submitted, nothing is pre-selected, nothing auto-submits, and the screen states explicitly that the AI recommends and the human decides. For supervisors it additionally presents the approve/reject controls for a pending recommendation.

**Terminology:**
- **Decision panel:** The action area holding the five actions, the justification input, and the submit control.
- **Governance notice:** The fixed statement rendered above the decision panel: *"The AI recommends. A named official decides. No action has been taken."*
- **Pending recommendation panel:** The supervisor-facing block showing a specialist's recommendation awaiting decision (F11 §3).
- **Authority Chain rail:** The persistent, non-interactive rail rendered directly beneath the case header showing `Recommend → Supervisor approval → Cleared`, with the acting user's position marked and any step outside their authority labelled as such. It is how the clearance boundary is *communicated* to a Cargo Specialist, for whom the approve/reject controls are not rendered at all. It is display only and causes no transition.
- **Concurrence:** Whether the human's selected action matches the AI recommendation. Displayed after submission and recorded on the audit entry (F8 §Process step 11).

**Sub-features:**
- Exception + triggering rule + evidence display
- Missing information display
- AI recommendation with confidence level, basis, and rationale
- All five actions with per-action availability and reasons
- Mandatory justification capture with action-specific minimums
- Explicit AI-recommends/human-decides framing
- Authority Chain rail (the clearance boundary made visible for every role)
- Supervisor approve/reject/return controls

**Process:**
1. On mount the screen calls `GET /api/shipments/{id}/ai/recommendation`, `GET /api/shipments/{id}/exceptions`, `GET /api/cases/{id}/available-actions`, and — when the case is `PENDING_APPROVAL` — `GET /api/cases/{id}/recommendations`.
2. The **exception block** renders one card per `OPEN` exception, each containing: the exception type chip and severity; the triggering rule's name, description, and `policy_reference` rendered as the authority; the evidence rows; and the missing-information list. This block is populated from the exception API, **not** from the AI response, so the evidence a reviewer sees is the system's finding rather than the model's retelling (PRD §8). *(Walkthrough step 4 completes here.)*
3. The **AI recommendation block** renders inside `AiContentLabel`: the recommended action as a labeled statement (*"AI suggests: Escalate to supervisor"* — a statement, never a pre-selected control), the confidence badge with its level, the `confidence_basis` sentence, the contributing factors, the rationale text, and full provenance. In fallback mode the offline label is shown and the shell banner is active.
4. The **governance notice** renders between the AI block and the decision panel, always, in both roles. The **Authority Chain rail** renders directly beneath the case header on every visit, for every role: `① Recommend → ② Supervisor approval → ③ Cleared`. For a Cargo Specialist, step ② is marked *"Not your authority — Supervisor role required; a supervisor other than you must approve"* and the rail carries the sentence *"Your role cannot set this shipment to Cleared. There is no action on this screen, and no path anywhere in the application, that does so."* For a Supervisor viewing a pending recommendation, step ② is marked *"You are here"* with the note that approving makes them the recorded approving official.
5. The **decision panel** renders all five actions as radio-style selectable cards, none selected initially. Each unavailable action renders as `DisabledActionButton` with its reason from `available-actions` — the operator sees all five and learns why two of them are closed, rather than seeing a shortened list.
6. Selecting an action reveals its action-specific fields: document types for `REQUEST_INFORMATION`; assignee for `SEND_FOR_SPECIALIST_REVIEW`; exception confirmation, `resolution_basis`, and the outstanding-request acknowledgement for `CLEAR_EXCEPTION`; `hold_reason` for `PLACE_ON_HOLD`; `escalation_reason` and optional target for `ESCALATE_TO_SUPERVISOR`.
7. The `JustificationInput` is always required. Its minimum is 10 characters, raised to 40 for `CLEAR_EXCEPTION` with `resolution_basis ∈ { EXCEPTIONS_ACCEPTED, MIXED }` (F09b §4). The submit control stays disabled until every required field is valid.
8. `CLEAR_EXCEPTION` submission shows a confirmation step restating: the exceptions being proposed for clearance, that this creates a **recommendation** and not a clearance, and that a supervisor distinct from the submitter must approve. Submitting posts the action; the case moves to `PENDING_APPROVAL`. *(Walkthrough step 8.)*
9. For a supervisor viewing a `PENDING_APPROVAL` case, the **pending recommendation panel** renders above the decision panel: recommender name and role, submission time, `resolution_basis`, enumerated exceptions, the specialist's justification verbatim, and the AI recommendation with concurrence. If the recommendation's evaluation version differs from the current one, the evidence-changed warning renders with a link to the version diff and an acknowledgement checkbox.
10. The supervisor's controls are **Approve**, **Reject**, and **Request more information**, each with its own mandatory justification (40-character minimum for Reject) and, for Reject, a reason code. Submitting posts `POST /api/cases/{id}/approval`. *(Walkthrough step 9.)*
11. If the acting user **is a Supervisor and is the recommender** (the supervisor-authored-recommendation path, F11 SoD-2 — a specialist never reaches this panel because the controls are not rendered for that role at all), the approve/reject controls render disabled with *"You submitted this recommendation and cannot decide on it"* — and the server rejects the request anyway if it is somehow issued.
12. After any successful submission the screen shows a confirmation summarizing the recorded decision, the resulting status, whether it agreed with the AI recommendation, and a link to the Decision & Audit Record screen.

**Inputs:**
- Route parameter `shipmentId`
- `GET /api/shipments/{id}/ai/recommendation`, `GET /api/shipments/{id}/exceptions`, `GET /api/cases/{id}/available-actions`, `GET /api/cases/{id}/recommendations`
- Action form fields per F09b §2–§6
- Approval form fields per F11 §Inputs

**Outputs:**
- Rendered decision-support view
- Posted action (`POST /api/cases/{id}/actions`) or approval (`POST /api/cases/{id}/approval`)
- Post-submission confirmation with the new status, concurrence, and audit link

**Validation:**
- All five actions MUST be presented, always. Filtering the list to only available actions is a defect — the requirement is that unavailable actions are *visibly disabled and explained* (PRD F19).
- No action MUST be pre-selected, and no form MUST auto-submit. An AI recommendation MUST NOT set the initial selection; it is rendered as text next to the controls, never as a default. This is the screen-level expression of "the AI never decides".
- The governance notice MUST be present on every render for every role.
- Justification MUST be captured before submission, MUST meet the action-specific minimum, and MUST NOT be prefilled from the AI rationale. A submission whose justification exactly matches the AI rationale is rejected server-side (`JUSTIFICATION_NOT_AUTHORED`) and surfaced inline.
- The triggering rule's `policy_reference` MUST be displayed for every exception. A recommendation without a visible authority is not defensible.
- Evidence and missing information MUST come from the exception API, not from the AI response.
- The confidence level MUST always be displayed with its basis; a confidence badge without a basis is a defect.
- Approve/reject controls MUST be hidden from specialists entirely — not rendered, not rendered-disabled — with the server enforcing the boundary regardless. This is a deliberate and bounded exception to the disabled-with-reason rule above: that rule governs **the five workflow actions**, which are the operator's action space and are always all five rendered. `APPROVE_CLEARANCE` is **not** one of the five (`00-header.md` §0.4.3, F09a T31), so rendering it to a specialist even in a disabled state would misrepresent the action space as six-wide and imply approval is something the specialist might one day be permitted on this case. The boundary is instead communicated by the **Authority Chain rail** (§Process step 4), which states in words that step ② belongs to the Supervisor role. A specialist who sees a shortened list of the five is a defect; a specialist who sees a disabled Approve button is also a defect.
- For a **Supervisor who authored the pending recommendation**, the approve/reject controls ARE rendered and disabled with the SoD-2 reason (§Process step 11), because approval is genuinely within that role's action space and is closed only for this case.
- The evidence-changed acknowledgement MUST be required when the versions differ; the submit control stays disabled until it is checked.
- The screen MUST be fully keyboard operable, including action selection (arrow keys within the radio group) and the confirmation step, with `aria-live` announcements on submission results.
- Every rejected submission MUST leave the entered justification intact so the operator does not retype it — a live demo cannot afford lost input.

**State transitions caused:** every transition in F09a is reachable from this screen, subject to role and state:

| Control | Transition |
|---|---|
| Request additional information | → `AWAITING_INFORMATION` |
| Send for specialist review | → `IN_REVIEW` |
| Clear exception | → `PENDING_APPROVAL` (never `CLEARED`) |
| Place on hold | → `ON_HOLD` |
| Escalate to supervisor | → `ESCALATED` |
| Approve (SUP) | → `CLEARED` |
| Reject (SUP) | → `IN_REVIEW` |
| Request more information (SUP) | → `AWAITING_INFORMATION` |

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| No open exceptions | Exception block shows "No open exceptions"; `CLEAR_EXCEPTION` is available with an empty set | — |
| AI recommendation in fallback | Rendered normally with the offline label; the recommended action is identical to the online path (F8 `action_source: DETERMINISTIC`) | — |
| Action unavailable for role/state | Disabled control with the visible reason | `ROLE_NOT_PERMITTED`, `ESCALATED_REQUIRES_SUPERVISOR`, `TRANSITION_REDUNDANT`, `APPROVAL_PENDING` |
| Justification too short / copied from AI | Inline field error; submit disabled | `JUSTIFICATION_REQUIRED`, `JUSTIFICATION_NOT_AUTHORED` |
| Exception set changed since load | Banner "The evidence changed; review and resubmit" plus refetch; the selection is preserved | `EXCEPTION_SET_STALE` |
| Recommendation already pending | Decision panel replaced by the pending recommendation panel | `RECOMMENDATION_ALREADY_PENDING` |
| Self-approval attempted | Inline error on the disabled control | `SELF_APPROVAL_BLOCKED` |
| Evidence changed, unacknowledged | Submit disabled until the checkbox is set; server rejection surfaced if bypassed | `EVIDENCE_CHANGED_UNACKNOWLEDGED` |
| Approval blocked by audit completeness | Prominent error: "Clearance blocked: the audit record would be incomplete ({field})" | `AUDIT_INCOMPLETE` |
| Case cleared | Whole panel replaced by a read-only disposition summary with an audit link | `CASE_TERMINAL` |

**API Surface (this feature):** consumes matrix rows 10, 18, 20–24, 29, 30, 34, 35. Full schemas in `Y1b-api-actions.md` §Workflow actions and §Approvals, `Y1c-api-admin.md` §AI assistance.

**Schema Surface (this feature):** reads `exceptions`, `evidence`, `rules`, `ai_outputs`, `recommendations`, `cases`; writes indirectly via actions and approvals.
---

## F20: Decision & Audit Record Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough step:** 10

**Description:** F20 is the accountability view and the final walkthrough step: a chronological replay of the complete, attributed history of a case. Every event — ingestion, flagging, AI summary and recommendation, document request, upload, revalidation, recommendation, approval, and the notification each produced — is shown with its exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, acting user and role, and approving official. AI-generated content is visually separated from human-authored decisions. The record can be exported or printed. The screen is read-only by construction: it contains no edit or delete affordance anywhere.

**Terminology:**
- **Timeline entry:** One rendered audit entry with its presentation block from F12 §5.
- **Authorship band:** The visual treatment distinguishing `HUMAN`, `AI`, and `SYSTEM` authored entries. Not color alone — each carries an explicit text label and a distinct icon (PRD §6 Accessibility).
- **Completeness assertion:** The header block reporting that every decision entry carries all eight required fields, so the claim can be shown on camera rather than asserted verbally.
- **Chain verification:** The on-demand hash-chain check (F12 §3.4) surfaced as a control on this screen.

**Sub-features:**
- Chronological timeline of every event
- Per-entry display of the eight audit fields plus actor attribution
- AI vs human visual separation
- Notifications shown alongside the decisions that produced them
- Completeness summary and chain verification
- Export as JSON and printable view
- Read-only construction

**Process:**
1. On mount the screen calls `GET /api/cases/{case_id}/audit?page_size=100` and `GET /api/cases/{case_id}/audit/verify`.
2. The **case header** renders: shipment ID, importer, current status, priority, and — when cleared — the disposition block naming the approving official, the clearance timestamp, and the recommender. This block is the one-glance answer to "who cleared this and on whose recommendation".
3. The **completeness block** renders `{ total_entries, decision_entries, decision_entries_complete, missing_fields }` as a plain statement: *"12 events recorded. 5 decisions, all 5 complete against the 8 required fields."* When `missing_fields` is non-empty it renders as a prominent failure, because an incomplete record is the failure mode the whole feature exists to prevent.
4. The **timeline** renders entries in ascending `sequence_no`, each as a card containing:
   - Header: sequence number, event type as human copy, `occurred_at` (absolute UTC plus relative), the authorship band label, and the actor as *"{name} ({role})"* or *"System"* / *"AI assistance"*.
   - Status change: `{before} → {after}` rendered with `StatusBadge` on each side, omitted when there is no change.
   - **Exception** (field 1): the exception snapshot as chips with type, severity, and rule name.
   - **Evidence reviewed** (field 2): the evidence snapshot via `EvidenceRow`, collapsed by default beyond three rows with a "Show all evidence" disclosure — collapsed, never omitted.
   - **AI recommendation** (field 3): inside `AiContentLabel`, showing the recommended action, confidence and basis, provenance, and the concurrence verdict (*"The decision agreed with / diverged from the AI recommendation"*). When absent, it renders the explicit *"No AI recommendation had been generated at this point"* rather than nothing.
   - **User decision** (field 4) and **justification** (field 5): in the human authorship band, the decision as human copy and the justification verbatim, never truncated.
   - **Timestamp** (field 6): in the card header.
   - **Approving official** (field 7): rendered prominently on approval entries as *"Approved by {name} ({role})"*; on other entries rendered as *"Not applicable"* rather than blank.
   - **Generated notification** (field 8): the notification's recipient, subject, and body in a distinct sub-block with the fixed label *"Generated, not transmitted"*.
5. A **filter bar** offers entry-class filters (all / decisions only / AI outputs / system events / access denials) and a "decisions only" quick toggle for a focused replay. Filtering is presentational; the underlying record is always complete.
6. **Verify chain** renders the verification result as *"Audit chain verified: 12 of 12 entries intact"* or, on failure, names the first invalid sequence number.
7. **Export** offers JSON download (`GET .../audit/export?format=json`) and Printable view (`format=printable`, opened in a new tab and triggering the browser print dialog). No PDF toolchain is used; the printable HTML is the offline artifact.
8. The screen registers no mutating handlers of any kind. There is no edit control, no delete control, no inline editing, and no context menu — read-only by construction rather than by permission check.

**Inputs:**
- Route parameter `shipmentId` (resolved to `case_id`)
- `GET /api/cases/{id}/audit` with `entry_class` filter, `page`, `page_size`
- `GET /api/cases/{id}/audit/verify`
- `GET /api/cases/{id}/audit/export?format=json|printable`
- `GET /api/cases/{id}/notifications` (embedded in the audit projection; fetched separately only for the standalone notification list)

**Outputs:**
- Rendered chronological timeline with all eight fields per decision entry
- Completeness summary and chain-verification result
- JSON export file `audit-{shipment_id}.json`
- Printable HTML view

**Validation:**
- Every one of the eight fields MUST be rendered for every decision entry. A field that is not applicable MUST render an explicit "Not applicable" — the reader must never have to infer whether a field was empty or simply not shown.
- AI-authored content MUST be visually separated from human-authored decisions, with a text label in addition to any styling.
- Generated notifications MUST be shown alongside the decisions that produced them, with the "generated, not transmitted" label.
- The screen MUST contain zero mutating affordances. An F21 test asserts that no `POST`/`PATCH`/`PUT`/`DELETE` request originates from this route during a full render and interaction pass.
- The timeline MUST cover the whole case history including ingestion and flagging, not only human decisions. Walkthrough step 10 requires replaying every step.
- Entries MUST be ordered by `sequence_no` ascending, and the ordering MUST be identical on every load.
- Justifications MUST be rendered verbatim and in full — never truncated, summarized, or paraphrased.
- The export MUST contain every field of every entry plus the hash chain (F12 §Validation).
- The screen MUST be keyboard navigable with semantic headings per entry, and the timeline MUST use a semantic list structure rather than presentational `div`s.
- For the pre-cleared seeded shipment `SHP-2026-0009`, this screen MUST render a complete history of at least 8 entries with a named approving official — the fallback demonstration target if the live walkthrough case is not yet cleared.

**State transitions caused:** None. F20 is read-only by construction.

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| Case not found | 404 view with a link back to the queue | `RESOURCE_NOT_FOUND` |
| Audit fetch failed | Error panel with Retry and `request_id` | `INTERNAL_ERROR` |
| Chain verification failed | Prominent red banner naming the first invalid sequence number; the timeline still renders | `AUDIT_CHAIN_INVALID` |
| A decision entry is missing a required field | Prominent failure in the completeness block naming the entry and the field | — (should be unreachable; the write-time gate prevents it) |
| Export failed | Toast with Retry; the timeline is unaffected | `INTERNAL_ERROR` |
| Empty history | Empty state: "No events recorded for this case yet" | — |
| Cross-case audit attempted by a specialist | Not offered in the UI; the server denies the route | `FORBIDDEN_ROLE` |

**API Surface (this feature):** consumes matrix rows 37–40 and 44. Full schemas in `Y1a-api-read.md` §Audit.

**Schema Surface (this feature):** reads `audit_entries`, `notifications`, `cases`, `cargo_entries`, `recommendations`, `approvals`. No writes.
---

## F21: Automated Test Suite

**Priority:** P0 · **Category:** Quality & Demo Readiness

**Description:** F21 is the set of automated tests that hold the governance claims true rather than merely asserted: rule-engine correctness across all three exception types, workflow-transition validity and invalidity, RBAC enforcement across every route and role, audit-record completeness and immutability, revalidation reconciliation, and an end-to-end run of the full ten-step walkthrough. Each claim made elsewhere in this FRD that is marked "asserted by an F21 test" is enumerated here with its test identifier.

**Terminology:**
- **Unit test:** Exercises a pure function or a single service against an in-memory or temporary SQLite database.
- **Integration test:** Exercises an HTTP route through the real middleware chain against a temporary, freshly seeded database.
- **E2E test:** Drives the running application through the browser (Playwright) against a freshly reset seeded environment.
- **Golden fixture:** A committed expected-output file (evaluation results, fallback summary text, audit export) compared byte-for-byte, which is how determinism claims are enforced.
- **Matrix test:** A table-driven test enumerating a cross-product (routes × roles, statuses × actions × roles) so coverage is structural rather than sampled.

**Sub-features:**
- Rule-engine test suite (three types, positive/negative, multi-exception, config-driven)
- Workflow-transition matrix tests
- RBAC matrix tests
- Audit-completeness and immutability tests
- Revalidation reconciliation tests
- AI fallback and determinism tests
- End-to-end walkthrough test
- Coverage and CI gating

**Process:**
1. `npm test` runs unit and integration suites against a temporary database created per test file, seeded deterministically with the F2 seed routine and the fixed seed clock. No test shares state with another.
2. `npm run test:e2e` starts the app on an ephemeral port with a fresh database, then runs the Playwright walkthrough.
3. `npm run test:all` runs both plus a lint and type check. This is the single command a reviewer runs to verify the build.
4. Determinism suites run each subject twice and compare serialized outputs.
5. Failures print the governing FRD reference (e.g. `F09a I1`) so a failure names the requirement it violates, not merely the assertion that broke.

### §1 Rule engine (F4, F5)

| Test ID | Assertion |
|---|---|
| RE-01 | `MISSING_REQUIRED_DOCUMENT`: fires when a required type is absent; each of the three sub-reasons is produced by its corresponding fixture |
| RE-02 | Missing-document: does not fire when all required types are received; `match_mode: ANY_ONE_OF` passes with one of several |
| RE-03 | Missing-document: `require_file_present` rejects a `RECEIVED` row with no file; `ignore_superseded` excludes superseded documents |
| RE-04 | Missing-document: partial satisfaction keeps the exception `OPEN` with a shrunken `missing_information` list |
| RE-05 | `INVALID_HTS_CODE`: table-driven over `MISSING`, `PLACEHOLDER`, `NON_NUMERIC`, `ODD_STRUCTURE`, `TOO_MANY_DIGITS`, `INCOMPLETE_DIGITS`, `UNKNOWN_CODE`, and the valid case — 8+ fixtures asserting the exact sub-reason and the check ordering of F4 §4 |
| RE-06 | HTS: `"8541.40"` with `expected_digit_count: 10` → `INCOMPLETE_DIGITS` with `observed_digits: 6`, `missing_digits: 4` |
| RE-07 | HTS: `allow_partial: true` with `d >= min_digit_count` produces no finding — a configuration change alters behavior with no code change |
| RE-08 | HTS: `check_known_codes: true` with an empty `known_codes` yields `RULE_CONFIG_INVALID`, not a silent pass |
| RE-09 | `CONFLICTING_COUNTRY_OF_ORIGIN`: Malaysia vs China → `ORIGIN_MISMATCH` with both normalized values in evidence |
| RE-10 | Origin: alias normalization — `MY`/`MYS`/`Malaysia` are equivalent; `PRC`/`China`/`People's Republic of China` are equivalent; `Hong Kong` is **not** equivalent to `China` |
| RE-11 | Origin: `allowed_pairs` suppresses a configured mismatch; `treat_missing_comparison_as_conflict` toggles the null-comparison behavior |
| RE-12 | Origin: unresolvable declared origin → `UNRESOLVABLE_DECLARED_ORIGIN` |
| RE-13 | Applicability conditions: value threshold, commodity keyword, HTS prefix, and origin-list conditions each gate correctly and appear in `skipped_rules` when not met |
| RE-14 | Multi-exception: the canonical shipment produces exactly 3 findings from the 3 expected rules, none suppressed |
| RE-15 | Determinism: evaluating every seeded shipment twice yields byte-identical serialized `EvaluationResult`s (golden fixtures) |
| RE-16 | Disabled rules never produce findings |
| RE-17 | An invalid rule definition does not prevent other rules from evaluating |
| RE-18 | Evidence completeness: every persisted exception has ≥ 1 evidence row and satisfies its type-specific evidence requirements (F5 §Validation) |
| RE-19 | Priority derivation: table-driven over severity, value, count, and age combinations, asserting the derived value and the recorded basis |
| RE-20 | Performance: single-shipment evaluation completes in < 500 ms |

### §2 Workflow transitions (F9)

| Test ID | Assertion |
|---|---|
| WF-01 | Matrix: all 7 statuses × 5 actions × 2 adjudicating roles (70 cases) produce exactly the outcome in F09a §2 — allowed with the stated target status, or rejected with the stated code |
| WF-02 | **I1** — exactly one transition targets `CLEARED`; it requires `SUPERVISOR`; enumerated from `GET /api/workflow/transitions` |
| WF-03 | **I2** — no transition executes with `actor_kind` of `AI` or `SYSTEM` |
| WF-04 | **I3** — every action rejects an absent, whitespace-only, or under-length justification |
| WF-05 | **I4** — each successful action produces exactly one `case_actions`, one `audit_entries`, and one `notifications` row |
| WF-06 | **I6** — every mutating route returns `CASE_TERMINAL` against a cleared case |
| WF-07 | **I7** — every specialist action from `ESCALATED` returns `403 ESCALATED_REQUIRES_SUPERVISOR` |
| WF-08 | **I8** — redundant transitions return `409 TRANSITION_REDUNDANT`, and no audit action entry is created |
| WF-09 | **I10** — every rejected action writes an `ACCESS_DENIED` or `TRANSITION_REJECTED` audit entry |
| WF-10 | Guards: G-DOC, G-DUP, G-REC, G-ACK, G-AUTH, G-SOD each produce their specific error code |
| WF-11 | `CLEAR_EXCEPTION` never produces `CLEARED`; it always produces `PENDING_APPROVAL` and a `PENDING` recommendation |
| WF-12 | Idempotency: replaying an action with the same `Idempotency-Key` returns the original result and creates no second row |
| WF-13 | Concurrency: two simultaneous actions on one case produce one success and one `CASE_VERSION_CONFLICT` |
| WF-14 | `available-actions` returns all five actions with correct availability and reason codes for every (status, role) pair |

### §3 RBAC (F14)

| Test ID | Assertion |
|---|---|
| AC-01 | Matrix: all 60 routes × 3 roles asserted against F14 §2, including open routes |
| AC-02 | Self-approval blocked: the recommender receives `403 SELF_APPROVAL_BLOCKED` on their own recommendation, at both the handler and the database trigger |
| AC-03 | A supervisor-authored recommendation cannot be approved by its author but can be approved by the second supervisor |
| AC-04 | Rule mutation by CS and SUP returns `403`; by ADM succeeds |
| AC-05 | All five actions, revalidation, upload, and approval by ADM return `403` |
| AC-06 | Role spoofing: a `role` field in the body, query, or a custom header does not change the effective role |
| AC-07 | Missing/invalid/deactivated session returns `401` on every protected route |
| AC-08 | Self role change returns `403 SELF_ROLE_CHANGE_BLOCKED` |
| AC-09 | Startup self-check fails when a route lacks an `allowed_roles` declaration (verified with a fixture route) |
| AC-10 | Every denial produces an `ACCESS_DENIED` audit entry with the attempted route and reason |

### §4 Audit completeness and immutability (F12)

| Test ID | Assertion |
|---|---|
| AU-01 | Every `HUMAN_ACTION` entry carries fields 1–6 and 8 non-null |
| AU-02 | Every `APPROVAL_DECISION` entry carries **all eight** fields non-null, including `approving_official_*` |
| AU-03 | A clearance attempt with a deliberately nulled required field aborts with `AUDIT_INCOMPLETE` and the case does **not** reach `CLEARED` |
| AU-04 | `UPDATE` and `DELETE` against `audit_entries` via direct SQL both raise; the API exposes no such route |
| AU-05 | The `notification_id` exemption permits exactly one null→non-null update and rejects a second attempt and any other column change |
| AU-06 | Hash chain verifies after a full walkthrough; tampering with a middle row via direct SQL causes verification to fail at that sequence number |
| AU-07 | `sequence_no` is gap-free and `occurred_at` is monotonic per case |
| AU-08 | Snapshot semantics: after a decision, a subsequent revalidation does not alter the earlier entry's `evidence_reviewed_json` or `ai_recommendation_json` |
| AU-09 | No entry has `actor_kind = 'AI'` with a non-null `user_decision` |
| AU-10 | Export contains every field of every entry plus the hash chain; golden-fixture comparison for the pre-cleared seeded case |
| AU-11 | Every `HUMAN_ACTION`/`APPROVAL_DECISION` entry has exactly one linked notification; `transmitted` is `false` on every notification |

### §5 Revalidation (F6)

| Test ID | Assertion |
|---|---|
| RV-01 | After the canonical upload, the missing-document exception is `RESOLVED_BY_REVALIDATION` and the HTS and origin exceptions are retained as `OPEN` |
| RV-02 | Retained exceptions preserve `opened_at` and `first_detected_evaluation_id` across revalidation |
| RV-03 | No `exceptions` or `evidence` row is ever deleted; row counts are monotonically non-decreasing |
| RV-04 | A no-op revalidation still creates a new evaluation version and an audit entry |
| RV-05 | Revalidation never produces `CLEARED` or `PENDING_APPROVAL`; the F6 status table is asserted for all seven starting statuses |
| RV-06 | `AWAITING_INFORMATION → IN_REVIEW` occurs only when every outstanding request is fulfilled |
| RV-07 | A rule parameter change with `revalidate_affected` resolves the affected exceptions with `resolution_reason = RULE_PARAMS_CHANGED` |
| RV-08 | A revalidation while `PENDING_APPROVAL` leaves the recommendation pending and sets the evidence-changed condition |
| RV-09 | Revalidation round-trip completes in < 2 s on the seeded dataset |

### §6 AI assistance (F7, F8)

| Test ID | Assertion |
|---|---|
| AI-01 | With `CARGODEMO_AI_PROVIDER=none`, both endpoints return `200` with complete content and a `FALLBACK_*` generation mode |
| AI-02 | Fallback determinism: identical grounding sets produce byte-identical summary and rationale text (golden fixtures) |
| AI-03 | Template coverage: every `(exception_type, sub_reason)` pair defined in F4 has a fallback summary template |
| AI-04 | The recommended action and confidence level are identical with the provider enabled (stubbed) and disabled — `action_source` is always `DETERMINISTIC` |
| AI-05 | Confidence is never returned without a basis |
| AI-06 | Grounding check rejects a stubbed provider response containing an invented value, and the fallback is served |
| AI-07 | A provider that never responds triggers the fallback at the configured timeout, and the request still returns `200` |
| AI-08 | Requesting a summary or recommendation performs no write to `cases`, `case_actions`, `recommendations`, or `approvals` |
| AI-09 | Summary and recommendation are cached per evaluation version and regenerated after revalidation |
| AI-10 | The AI recommendation snapshot with `concurrence` appears on every human action audit entry |

### §7 Ingestion, seed, and demo environment (F1, F2, F22)

| Test ID | Assertion |
|---|---|
| IN-01 | A batch with valid and invalid entries returns `207` with per-entry rejection reasons and persists only the valid entries |
| IN-02 | Re-ingesting the same `shipment_id` updates rather than duplicates and creates a new evaluation version |
| IN-03 | Re-ingesting a `CLEARED` shipment is rejected with `CASE_TERMINAL` |
| IN-04 | A `SIMULATED_UPLOAD` document is not downgraded by a re-ingestion declaring it not received |
| SD-01 | Seed coverage: 10–15 entries, all 3 exception types, all 7 statuses, ≥ 1 multi-exception shipment, exactly 1 pre-cleared with ≥ 8 audit entries and a named approving official, ≥ 1 clean shipment absent from the queue |
| SD-02 | The canonical scenario matches field-for-field and produces exactly 3 exceptions of the 3 distinct types |
| SD-03 | Two consecutive `FORCE_RESEED` runs produce identical rows including timestamps |
| SD-04 | The upload-ready fixture exists and is not attached at seed time |
| SD-05 | No seeded string matches the PII deny-list patterns |
| DE-01 | `GET /api/health` reports schema, seed, and AI subsystem status including fallback mode |
| DE-02 | Reset restores the pristine state and writes `DEMO_RESET` as the first entry of the new chain |

### §8 End-to-end walkthrough (all ten steps)

`E2E-01` executes the full narrative against a freshly reset environment with `CARGODEMO_AI_PROVIDER=none`, asserting at each step:

1. The queue lists flagged shipments with shipment ID, importer, exception, priority, and status; `SHP-2026-0007` shows three exception chips and `CRITICAL` priority; the clean shipment is absent.
2. Selecting the row loads the Shipment Review screen with all eight required attributes.
3. The AI summary renders with the AI-generated label and the offline-fallback label.
4. Navigating to Recommended Resolution shows the exception, the triggering rule with its policy reference, the evidence, the missing information, the AI recommendation, and the confidence with its basis; all five actions are present and none is pre-selected.
5. Requesting the certificate of origin with a justification moves the case to `AWAITING_INFORMATION` and creates an audit entry and a notification.
6. Uploading the fixture attaches the document with `Uploaded this session` provenance.
7. Revalidation resolves the missing-document exception, retains the HTS and origin exceptions, and the change indication reports "1 resolved, 2 retained".
8. The specialist recommends clearance with a justification; the case becomes `PENDING_APPROVAL` and appears under the supervisor's pending filter.
9. Switching to the supervisor, the approve control is enabled (and would be disabled for the specialist); approving moves the case to `CLEARED` with the approving official recorded and a notification generated.
10. The Decision & Audit Record screen replays every step with all eight fields on each decision entry, AI content visually separated, notifications shown alongside decisions, the completeness block reporting all decisions complete, and the chain verifying.

`E2E-02` repeats `E2E-01` three consecutive times after reset and asserts identical outcomes (PRD §7 repeatability). `E2E-03` asserts that a specialist attempting to approve their own recommendation is blocked in the UI and by the server.

**Inputs:** the seeded database, golden fixture files, a stubbed AI provider for the enabled-provider cases, and environment overrides for provider mode and timeout.

**Outputs:** test results with FRD requirement references on failure; a coverage report; golden fixtures regenerated only by an explicit `npm run test:update-goldens`.

**Validation:**
- Every behavior in §§1–8 MUST be covered. A merge that adds a route without an RBAC matrix row fails AC-01; a merge that adds a transition without a matrix row fails WF-01.
- The suite MUST pass with `CARGODEMO_AI_PROVIDER=none` and MUST NOT require network access.
- Tests MUST NOT share a database; each file provisions its own temporary file-backed SQLite instance.
- The E2E test MUST run against the same start command used for the demo, so a passing E2E implies a working demo.
- CI MUST gate on the full suite being green.

**Error States:** test failures report `{ test_id, frd_reference, expected, actual }`. Infrastructure failures (port in use, fixture missing) are distinguished from assertion failures so a red build is diagnosable in one read.

**API Surface (this feature):** none. Consumes the entire API.

**Schema Surface (this feature):** creates and destroys temporary databases with the production schema and migrations.
---

## F22: Demo Environment & Reset

**Priority:** P1 · **Category:** Quality & Demo Readiness

**Description:** F22 provides the operational guarantees that let the walkthrough be run repeatedly, live, without cleanup between runs: a single-command start with the dev server bound to `0.0.0.0` on a deterministic port for an embeddable preview URL, a one-command/one-click reset to pristine seeded state, a health check confirming database, seed data, and AI-assist availability including fallback status before a demo, deterministic seed output, and a graceful-degradation banner when AI assistance is in offline-fallback mode.

**Terminology:**
- **Deterministic port:** A fixed port from configuration, never an ephemeral one, so the preview URL is stable across restarts and embeddable in a briefing deck.
- **Single-command start:** `npm start` performs install-independent startup: migrate → seed if empty → serve both the API and the built/served frontend from one process on one port.
- **Pristine state:** The exact database contents produced by a fresh `FORCE_RESEED` (F2), byte-identical on every run.
- **Health check:** `GET /api/health`, an open route reporting subsystem status, used by the presenter before a demo and by the shell for the degradation banner.
- **Degradation banner:** The persistent, non-dismissible notice shown while AI assistance is in a fallback mode (F16 §Process step 6).

**Sub-features:**
- Single-command start with deterministic binding
- One-command and one-click reset
- Health check with subsystem detail
- Deterministic seed output
- AI-fallback degradation banner
- Pre-demo readiness verification

**Process:**
1. `npm start` runs the startup sequence: read configuration → open/create the SQLite database → run migrations (F0) → schema self-check → seed if empty (F2) → route registry self-check (F14 §1 step 9) → probe the AI provider → bind the server.
2. The server binds to `CARGODEMO_HOST` (default `0.0.0.0`) on `CARGODEMO_PORT` (default `3000`). **`3000` is the single deterministic port for this product** — it is the port the sandboxed preview expects and probes, and it is the platform convention (TechArch AD-05 records the same value). No other document may name a different default. Binding to `0.0.0.0` is what makes the sandbox preview reachable; binding to `localhost` would produce an unreachable preview URL and is treated as a misconfiguration warning at startup.
3. If the port is occupied, startup fails with `PORT_IN_USE` and a clear message naming the port and the environment variable to change it. The server does **not** silently pick another port — a shifting URL breaks an embedded demo.
4. Both the API (`/api/*`) and the frontend (all other paths, with SPA fallback to `index.html`) are served from the single process, so there is one URL and one command.
5. The startup log prints a readiness block: preview URL, schema version, entry count, canonical scenario present, AI mode, and the reset command.
6. The AI provider probe is a non-blocking capability check: if `CARGODEMO_AI_PROVIDER=none`, the mode is recorded as `FALLBACK_PROVIDER_DISABLED` without any network call. Otherwise a lightweight reachability check with a 3-second budget sets the mode to `LLM` or `FALLBACK_PROVIDER_ERROR`. **A failed probe never prevents startup.**
7. `GET /api/health` returns the readiness detail (§Outputs). It is an open route so a presenter can check it before selecting a role.
8. Reset is available as `npm run reset` (CLI) and as `POST /api/admin/reset` (administrator-only, exposed as a one-click control on the administrator surface with a confirmation step). Both invoke F2 with `FORCE_RESEED` inside one transaction.
9. After reset, the response and the CLI output report the `SeedReport` coverage block, so the presenter can confirm in one glance that the canonical scenario is present and the queue is populated.
10. The shell polls health every 60 seconds and renders the degradation banner whenever `ai.mode` is any `FALLBACK_*` value, or a warning banner whenever any subsystem reports `status: "degraded"` or `"failed"`.

**Inputs:**
- Environment: `CARGODEMO_HOST` (default `0.0.0.0`), `CARGODEMO_PORT` (default `3000`), `CARGODEMO_DB_PATH`, `CARGODEMO_DOC_STORAGE_DIR`, `CARGODEMO_SEED_ON_EMPTY`, `CARGODEMO_SEED_CLOCK`, `CARGODEMO_AI_PROVIDER`, `CARGODEMO_AI_MODEL`, `CARGODEMO_AI_API_KEY`, `CARGODEMO_AI_TIMEOUT_MS`
- `POST /api/admin/reset` body: `{ confirm: true }` (required; a reset without explicit confirmation is rejected)
- `GET /api/health` query: `verbose` (boolean, default `false`)

**Outputs:**
- A running application on a stable, embeddable URL
- Startup readiness log block
- `GET /api/health` response:
  ```
  {
    "status": "ok" | "degraded" | "failed",
    "version": "1.0.0",
    "uptime_s": 412,
    "subsystems": {
      "database":  { "status": "ok", "schema_version": 7, "foreign_keys": true, "append_only_triggers": true, "path_writable": true },
      "seed":      { "status": "ok", "seeded": true, "entry_count": 12, "canonical_scenario_present": true,
                     "exception_types_covered": 3, "statuses_covered": 7, "precleared_case": "SHP-2026-0009" },
      "rules":     { "status": "ok", "total": 7, "enabled": 5, "invalid": 0 },
      "documents": { "status": "ok", "storage_dir_writable": true, "fixtures_present": 9, "upload_ready_fixtures": 2 },
      "ai":        { "status": "ok", "provider": "none", "model": null,
                     "mode": "FALLBACK_PROVIDER_DISABLED", "fallback_available": true, "last_probe_at": "…" },
      "workflow":  { "status": "ok", "transitions_registered": 33, "clearance_paths": 1 },
      "rbac":      { "status": "ok", "routes_registered": 60, "routes_without_permission": 0 }
    },
    "demo": { "port": 3000, "host": "0.0.0.0", "preview_url": "http://0.0.0.0:3000", "reset_endpoint": "/api/admin/reset" }
  }
  ```
- `POST /api/admin/reset` response: the `SeedReport` (F2) plus `reset_at` and `duration_ms`

**Validation:**
- Startup MUST bind to `0.0.0.0` by default; a `localhost`-only binding logs a prominent warning naming the embedded-preview consequence.
- The port MUST be deterministic; automatic port fallback MUST NOT be implemented.
- Startup MUST fail loudly rather than serve a degraded schema: migration failure, schema self-check failure, and route-permission self-check failure all abort with a non-zero exit code (F0, F14).
- Startup MUST NOT require network access. An AI probe failure is a recorded mode, never a startup failure.
- The whole start path MUST work in a fresh sandbox with no pre-existing database, no external services, and no manual data entry.
- Reset MUST require `confirm: true` and the administrator role, and MUST produce a state satisfying every F2 coverage assertion; a failed assertion leaves the transaction rolled back and reports `SEED_COVERAGE_FAILED`.
- Reset MUST be safe to run between demo runs with no manual database intervention, and three consecutive reset-plus-walkthrough cycles MUST produce identical results (PRD §7, test `E2E-02`).
- `health.subsystems.workflow.clearance_paths` MUST equal `1`. Surfacing the governance invariant on the health endpoint means a presenter can demonstrate it without opening code.
- `health.subsystems.rbac.routes_without_permission` MUST equal `0`.
- The degradation banner MUST appear whenever AI assistance is in fallback and MUST NOT be dismissible while that condition holds.
- The health endpoint MUST NOT expose the AI API key, absolute filesystem paths outside the project, or any database credentials.
- The full walkthrough MUST complete with `CARGODEMO_AI_PROVIDER=none` — this is the supported demo default, not a fallback of last resort (PRD §7 "AI availability resilience").

**State transitions caused:** Reset destroys and recreates all cases, then drives the seeded cases through real F9/F11 transitions (F2 §Process step 7). No case transitions in place; the prior cases cease to exist.

**Error States:**

| Scenario | HTTP Status / exit | Error Code | Message |
|---|---|---|---|
| Port already in use | exit 1 | `PORT_IN_USE` | "Port {port} is in use; set CARGODEMO_PORT" |
| Database path unwritable | exit 1 | `DB_UNAVAILABLE` | "Cannot open database at {path}" |
| Migration or schema self-check failure | exit 1 | `SCHEMA_INTEGRITY_FAILED` | "Schema integrity check failed: {detail}" |
| Route registered without permissions | exit 1 | `ROUTE_PERMISSION_MISSING` | "Route {method} {path} has no allowed_roles declaration" |
| Document storage directory unwritable | exit 1 | `STORAGE_UNAVAILABLE` | "Document storage directory is not writable: {path}" |
| AI probe failed | 200 (health `degraded`) | — | `ai.mode = FALLBACK_PROVIDER_ERROR`; banner shown; startup proceeds |
| Reset without `confirm: true` | 422 | `CONFIRMATION_REQUIRED` | "Set confirm to true to reset demo data" |
| Reset by a non-administrator | 403 | `FORBIDDEN_ROLE` | "Only a System Administrator may reset demo data" |
| Reset coverage assertion failed | 500 | `SEED_COVERAGE_FAILED` | "Reset rolled back: {assertion}" |
| Health check subsystem failure | 200 with `status: "failed"` | — | Subsystem detail names the failure; the shell shows a warning banner |

**Pre-demo checklist (operational, derived from the health response):**
1. `GET /api/health` returns `status: "ok"` (or `"degraded"` with only the AI subsystem in fallback, which is an accepted demo configuration).
2. `seed.canonical_scenario_present` is `true` and `entry_count` is 12.
3. `workflow.clearance_paths` is `1` and `rbac.routes_without_permission` is `0`.
4. `documents.upload_ready_fixtures` is ≥ 1 so walkthrough step 6 has a file to attach.
5. The queue shows `SHP-2026-0007` with three exception chips at `CRITICAL` priority and status `New`.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/health` | open | Subsystem readiness including AI fallback status |
| POST | `/api/admin/reset` | ADM | Reset to pristine seeded state |
| GET | `/api/admin/seed-report` | ADM | Last seed report with coverage |

Full schemas: `Y1c-api-admin.md` §Demo operations.

**Schema Surface (this feature):** reads all tables for the health summary; reset truncates and reseeds all tables via F2.
---

# Y0a: Consolidated Database Schema — Core Domain

SQLite dialect. All tables use `TEXT` primary keys holding UUIDv4 or prefixed identifiers. Timestamps are `TEXT` in ISO-8601 UTC with milliseconds (`YYYY-MM-DDTHH:MM:SS.sssZ`) so lexicographic and chronological ordering coincide. Monetary values are stored as `INTEGER` cents. Booleans are `INTEGER` `0`/`1`. Every connection sets `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` (F0 §Process step 3).

This chunk covers cargo entries, documents, requests, rules, evaluations, exceptions, evidence, and ingestion. Workflow, governance, and transport tables are in `Y0b-schema-workflow-audit.md`.

## §1 Migrations

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  checksum    TEXT NOT NULL,
  applied_at  TEXT NOT NULL
);
```

## §2 Cargo entries

```sql
CREATE TABLE cargo_entries (
  id                                TEXT PRIMARY KEY,
  shipment_id                       TEXT NOT NULL UNIQUE,
  importer_name                     TEXT NOT NULL,
  carrier_name                      TEXT NOT NULL,
  product_description               TEXT NOT NULL,
  hts_code                          TEXT,                      -- declared, may be null/incomplete
  hts_code_normalized               TEXT,                      -- digits only, F4 §4 step 2
  country_of_origin                 TEXT NOT NULL,             -- declared text
  country_of_origin_iso2            TEXT,                      -- normalized, null when unmappable
  manufacturer_name                 TEXT NOT NULL,
  manufacturer_address_line1        TEXT NOT NULL,
  manufacturer_address_city         TEXT,
  manufacturer_address_region       TEXT,
  manufacturer_address_postal_code  TEXT,
  manufacturer_address_country      TEXT NOT NULL,
  manufacturer_address_country_iso2 TEXT,
  shipment_value_cents              INTEGER NOT NULL CHECK (shipment_value_cents >= 0),
  entry_date                        TEXT NOT NULL,             -- YYYY-MM-DD
  declared_priority_hint            TEXT CHECK (declared_priority_hint IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  ingestion_source                  TEXT NOT NULL,             -- 'seed' | 'file:<name>' | 'api'
  ingestion_batch_id                TEXT REFERENCES ingestion_batches(id),
  created_at                        TEXT NOT NULL,
  updated_at                        TEXT NOT NULL,
  CHECK (shipment_id GLOB '[A-Z][A-Z][A-Z]-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]')
);
CREATE INDEX idx_cargo_entries_importer ON cargo_entries(importer_name);
CREATE INDEX idx_cargo_entries_value    ON cargo_entries(shipment_value_cents);
```

## §3 Documents

```sql
CREATE TABLE documents (
  id                     TEXT PRIMARY KEY,
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  document_type          TEXT NOT NULL,                       -- upper snake case, normalized
  status                 TEXT NOT NULL CHECK (status IN ('RECEIVED','NOT_RECEIVED')),
  filename               TEXT,
  storage_path           TEXT,
  content_hash           TEXT,                                -- sha256 hex
  file_size_bytes        INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 5242880),
  mime_type              TEXT CHECK (mime_type IS NULL OR mime_type IN
                           ('application/pdf','image/png','image/jpeg','text/plain','text/csv')),
  provenance             TEXT NOT NULL CHECK (provenance IN ('SEEDED','INGESTED','SIMULATED_UPLOAD')),
  stated_country         TEXT,                                -- declarative, for origin rules reading documents.*
  note                   TEXT,
  superseded             INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0,1)),
  duplicate_of_document_id TEXT REFERENCES documents(id),
  source_request_id      TEXT REFERENCES document_requests(id),
  uploaded_by_user_id    TEXT REFERENCES users(id),
  received_at            TEXT,
  created_at             TEXT NOT NULL,
  -- F10 §Validation: a RECEIVED document must have a file when it is expected to satisfy a rule
  CHECK (status <> 'RECEIVED' OR filename IS NOT NULL)
);
CREATE INDEX idx_documents_entry_type ON documents(cargo_entry_id, document_type, status);
CREATE UNIQUE INDEX idx_documents_active_type
  ON documents(cargo_entry_id, document_type)
  WHERE superseded = 0 AND status = 'RECEIVED';
```

## §4 Document requests

```sql
CREATE TABLE document_requests (
  id                     TEXT PRIMARY KEY,
  case_id                TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  document_type          TEXT NOT NULL,
  status                 TEXT NOT NULL CHECK (status IN
                           ('OUTSTANDING','FULFILLED','CANCELLED','CANCELLED_BY_CLEARANCE')),
  linked_exception_id    TEXT REFERENCES exceptions(id),
  linked_rule_id         TEXT REFERENCES rules(id),
  requested_from         TEXT,
  due_by                 TEXT,
  requested_by_user_id   TEXT NOT NULL REFERENCES users(id),
  requested_by_name      TEXT NOT NULL,
  requested_at           TEXT NOT NULL,
  fulfilled_by_user_id   TEXT REFERENCES users(id),
  fulfilled_at           TEXT,
  fulfilling_document_id TEXT REFERENCES documents(id),
  cancellation_reason    TEXT,
  cancelled_by_user_id   TEXT REFERENCES users(id),
  cancelled_at           TEXT,
  created_at             TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_document_requests_outstanding
  ON document_requests(cargo_entry_id, document_type)
  WHERE status = 'OUTSTANDING';                                -- enforces guard G-DUP (F09a §3)
CREATE INDEX idx_document_requests_case ON document_requests(case_id, status);
```

## §5 Rules

```sql
CREATE TABLE rules (
  id                TEXT PRIMARY KEY,                          -- 'rule-<slug>'
  name              TEXT NOT NULL,
  name_lower        TEXT NOT NULL UNIQUE,                      -- case-insensitive uniqueness
  exception_type    TEXT NOT NULL CHECK (exception_type IN
                      ('MISSING_REQUIRED_DOCUMENT','INVALID_HTS_CODE','CONFLICTING_COUNTRY_OF_ORIGIN')),
  description       TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 500),
  policy_reference  TEXT NOT NULL CHECK (length(policy_reference) BETWEEN 3 AND 120),
  severity          TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority_mapping  TEXT,                                      -- JSON object, nullable = identity
  conditions_json   TEXT NOT NULL DEFAULT '{}',                -- F4 §3
  params_json       TEXT NOT NULL,                             -- F4 §4–§6, schema-validated per type
  enabled           INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  version           INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by_user_id TEXT REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_rules_enabled_type ON rules(enabled, exception_type);
```

There is deliberately **no** `DELETE` path for `rules` (F15 §Validation); retirement is `enabled = 0`.

## §6 Evaluations

```sql
CREATE TABLE evaluations (
  id                    TEXT PRIMARY KEY,
  cargo_entry_id        TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id               TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  version               INTEGER NOT NULL CHECK (version >= 1),
  trigger               TEXT NOT NULL CHECK (trigger IN
                          ('INGESTION','MANUAL_REVALIDATION','DOCUMENT_UPLOAD','RULE_CHANGE','SEED')),
  rule_set_fingerprint  TEXT NOT NULL,                         -- sha256 over ordered (rule_id, version, enabled)
  skipped_rules_json    TEXT NOT NULL DEFAULT '[]',
  invalid_rules_json    TEXT NOT NULL DEFAULT '[]',
  finding_count         INTEGER NOT NULL DEFAULT 0,
  duration_ms           INTEGER,
  actor_kind            TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM')),
  actor_user_id         TEXT REFERENCES users(id),
  evaluated_at          TEXT NOT NULL,
  UNIQUE (cargo_entry_id, version)
);
CREATE INDEX idx_evaluations_entry ON evaluations(cargo_entry_id, version DESC);
```

`actor_kind` here can never be `'AI'` — the rule engine is not an AI surface (`00-header.md` §0.4.7).

## §7 Exceptions

```sql
CREATE TABLE exceptions (
  id                            TEXT PRIMARY KEY,
  evaluation_id                 TEXT NOT NULL REFERENCES evaluations(id) ON DELETE RESTRICT,
  cargo_entry_id                TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id                       TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  rule_id                       TEXT NOT NULL REFERENCES rules(id) ON DELETE RESTRICT,
  rule_version                  INTEGER NOT NULL,
  exception_type                TEXT NOT NULL CHECK (exception_type IN
                                  ('MISSING_REQUIRED_DOCUMENT','INVALID_HTS_CODE','CONFLICTING_COUNTRY_OF_ORIGIN')),
  sub_reason                    TEXT NOT NULL,
  severity                      TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status                        TEXT NOT NULL CHECK (status IN
                                  ('OPEN','RESOLVED_BY_REVALIDATION','CLEARED_BY_DECISION','SUPERSEDED_BY_EVALUATION')),
  assertion                     TEXT NOT NULL,
  missing_information_json      TEXT NOT NULL DEFAULT '[]',
  first_detected_evaluation_id  TEXT NOT NULL REFERENCES evaluations(id),
  opened_at                     TEXT NOT NULL,                 -- carried forward on retention (F6 §7)
  resolved_at                   TEXT,
  resolved_by_evaluation_id     TEXT REFERENCES evaluations(id),
  resolution_reason             TEXT CHECK (resolution_reason IS NULL OR resolution_reason IN
                                  ('DOCUMENT_RECEIVED','HTS_CORRECTED','ORIGIN_ALIGNED','RULE_DISABLED',
                                   'RULE_PARAMS_CHANGED','CONDITION_NO_LONGER_APPLICABLE')),
  superseded_by_exception_id    TEXT REFERENCES exceptions(id),
  cleared_by_approval_id        TEXT REFERENCES approvals(id),
  created_at                    TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_exceptions_eval_rule ON exceptions(evaluation_id, rule_id);
CREATE INDEX idx_exceptions_case_status     ON exceptions(case_id, status);
CREATE INDEX idx_exceptions_type_status     ON exceptions(exception_type, status);
```

No application code path issues `DELETE FROM exceptions` (F6 §Validation, test RV-03).

## §8 Evidence

```sql
CREATE TABLE evidence (
  id                            TEXT PRIMARY KEY,
  exception_id                  TEXT NOT NULL REFERENCES exceptions(id) ON DELETE RESTRICT,
  kind                          TEXT NOT NULL CHECK (kind IN ('OBSERVED','COMPARISON','MISSING','CONTEXT')),
  field_path                    TEXT NOT NULL,
  raw_value                     TEXT,
  normalized_value              TEXT,
  comparison_field_path         TEXT,
  comparison_raw_value          TEXT,
  comparison_normalized_value   TEXT,
  expected                      TEXT,
  observed                      TEXT,
  assertion                     TEXT,
  truncated                     INTEGER NOT NULL DEFAULT 0 CHECK (truncated IN (0,1)),
  display_order                 INTEGER NOT NULL,
  created_at                    TEXT NOT NULL,
  CHECK (raw_value IS NULL OR length(raw_value) <= 2000)
);
CREATE INDEX idx_evidence_exception ON evidence(exception_id, display_order);
```

Evidence rows are insert-only. F5 §Validation requires ≥ 1 row per exception and type-specific kinds; the constraint is enforced in the repository's transactional write (a `CHECK` cannot span tables in SQLite) and asserted by test RE-18.

## §9 Ingestion batches

```sql
CREATE TABLE ingestion_batches (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  schema_version  TEXT NOT NULL,
  received_count  INTEGER NOT NULL,
  created_count   INTEGER NOT NULL,
  updated_count   INTEGER NOT NULL,
  rejected_count  INTEGER NOT NULL,
  report_json     TEXT NOT NULL,
  actor_user_id   TEXT REFERENCES users(id),
  actor_kind      TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM')),
  created_at      TEXT NOT NULL
);
```

## §10 Entity relationships

```
users ──< sessions
users ──< cases (assigned_to, escalated_to, approving_official)
cargo_entries 1──1 cases
cargo_entries 1──n documents
cargo_entries 1──n evaluations ──n exceptions ──n evidence
rules 1──n exceptions
cases 1──n document_requests ──0..1 documents (fulfilling)
cases 1──n case_actions, recommendations, approvals, audit_entries, notifications, ai_outputs
recommendations 1──n approvals
audit_entries 1──0..1 notifications  (mutual reference, F09b §1 step 15)
```

## §11 Referential and lifecycle rules

- Every foreign key uses `ON DELETE RESTRICT`. No cascade exists anywhere, so no single delete can silently remove history. The only bulk removal is the administrator reset (F2 §Process step 2), which truncates in reverse-dependency order inside one transaction.
- `cargo_entries.shipment_id` is the only business key exposed in URLs and the UI; all joins use surrogate IDs.
- `documents` uniqueness is scoped to active received rows, so a superseded document and its replacement coexist.
- `document_requests` uniqueness on `(cargo_entry_id, document_type) WHERE status = 'OUTSTANDING'` is the database-level expression of guard G-DUP.
- `exceptions` uniqueness on `(evaluation_id, rule_id)` guarantees one exception per firing rule per evaluation (F4 §Process step 6).
- `evaluations` uniqueness on `(cargo_entry_id, version)` plus in-transaction version assignment prevents concurrent evaluation collisions (F5 §Process step 2).
---

# Y0b: Consolidated Database Schema — Workflow, Governance & Transport

Conventions as in `Y0a-schema-core.md`. This chunk covers users and sessions, cases, actions, recommendations, approvals, audit entries, notifications, AI outputs, and transport-support tables.

## §1 Users and sessions

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,                                -- 'usr-cs-001'
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  role        TEXT NOT NULL CHECK (role IN
                ('CARGO_SPECIALIST','SUPERVISOR','SYSTEM_ADMINISTRATOR')),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  token_hash    TEXT NOT NULL UNIQUE,                          -- sha256 of a 32-byte random token
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  ended_at      TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id, ended_at);
```

The token is never stored in plaintext and never encodes the role (F14 §Validation).

## §2 Cases

```sql
CREATE TABLE cases (
  id                            TEXT PRIMARY KEY,
  cargo_entry_id                TEXT NOT NULL UNIQUE REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  shipment_id                   TEXT NOT NULL,                 -- denormalized for queue/audit readability
  status                        TEXT NOT NULL CHECK (status IN
                                  ('NEW','IN_REVIEW','AWAITING_INFORMATION','ON_HOLD',
                                   'ESCALATED','PENDING_APPROVAL','CLEARED')),
  priority                      TEXT NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority_basis_json           TEXT NOT NULL DEFAULT '[]',    -- F5 §Process step 6
  queued                        INTEGER NOT NULL DEFAULT 0 CHECK (queued IN (0,1)),
  current_evaluation_id         TEXT REFERENCES evaluations(id),
  open_exception_count          INTEGER NOT NULL DEFAULT 0,
  exception_type_summary        TEXT NOT NULL DEFAULT '',      -- sorted, comma-joined distinct open types
  assigned_to_user_id           TEXT REFERENCES users(id),
  hold_reason                   TEXT CHECK (hold_reason IS NULL OR hold_reason IN
                                  ('AWAITING_EXTERNAL_INPUT','PENDING_POLICY_GUIDANCE','RESOURCE_CONSTRAINT','OTHER')),
  hold_reason_detail            TEXT,
  hold_placed_by_user_id        TEXT REFERENCES users(id),
  hold_placed_at                TEXT,
  escalation_reason             TEXT,
  escalated_by_user_id          TEXT REFERENCES users(id),
  escalated_to_user_id          TEXT REFERENCES users(id),
  escalated_at                  TEXT,
  approving_official_user_id    TEXT REFERENCES users(id),
  approving_official_name       TEXT,
  approving_official_role       TEXT,
  cleared_at                    TEXT,
  last_action_id                TEXT REFERENCES case_actions(id),
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL,
  -- the schema-level expression of "no clearance without a named approving official" (F11 SoD-1)
  CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL))
);
CREATE INDEX idx_cases_status_priority ON cases(status, priority, updated_at DESC);
CREATE INDEX idx_cases_queued          ON cases(queued, priority);
```

`cases.updated_at` in epoch-millis form is the `X-Case-Version` value used for optimistic concurrency (F3 §Process step 9).

## §3 Case actions

```sql
CREATE TABLE case_actions (
  id                    TEXT PRIMARY KEY,
  case_id               TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id        TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  action                TEXT NOT NULL CHECK (action IN
                          ('REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW','CLEAR_EXCEPTION',
                           'PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR')),
  status_before         TEXT NOT NULL,
  status_after          TEXT NOT NULL,
  justification         TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
  parameters_json       TEXT NOT NULL DEFAULT '{}',            -- action-specific fields
  evaluation_id         TEXT REFERENCES evaluations(id),
  actor_user_id         TEXT NOT NULL REFERENCES users(id),
  actor_name            TEXT NOT NULL,
  actor_role            TEXT NOT NULL CHECK (actor_role IN ('CARGO_SPECIALIST','SUPERVISOR')),
  audit_entry_id        TEXT NOT NULL,
  idempotency_key       TEXT,
  occurred_at           TEXT NOT NULL
);
CREATE INDEX idx_case_actions_case ON case_actions(case_id, occurred_at);
CREATE UNIQUE INDEX idx_case_actions_idem ON case_actions(case_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

`actor_role` excludes `SYSTEM_ADMINISTRATOR` at the schema level — the administrator cannot adjudicate (F14 matrix rows 20–24).

## §4 Recommendations

```sql
CREATE TABLE recommendations (
  id                          TEXT PRIMARY KEY,
  case_id                     TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluation_id               TEXT NOT NULL REFERENCES evaluations(id),
  action_id                   TEXT NOT NULL REFERENCES case_actions(id),
  recommended_action          TEXT NOT NULL DEFAULT 'CLEAR' CHECK (recommended_action = 'CLEAR'),
  resolution_basis            TEXT NOT NULL CHECK (resolution_basis IN
                                ('EXCEPTIONS_RESOLVED','EXCEPTIONS_ACCEPTED','MIXED')),
  exception_ids_json          TEXT NOT NULL,
  justification               TEXT NOT NULL,
  ai_recommendation_snapshot_json TEXT NOT NULL,
  concurrence                 TEXT NOT NULL CHECK (concurrence IN
                                ('AGREED','DIVERGED','NO_RECOMMENDATION_PRESENT')),
  status                      TEXT NOT NULL CHECK (status IN
                                ('PENDING','APPROVED','REJECTED','WITHDRAWN','RETURNED_FOR_INFORMATION')),
  withdrawal_reason           TEXT,
  recommended_by_user_id      TEXT NOT NULL REFERENCES users(id),
  recommended_by_name         TEXT NOT NULL,
  recommended_by_role         TEXT NOT NULL,
  recommended_at              TEXT NOT NULL,
  closed_at                   TEXT
);
CREATE UNIQUE INDEX idx_recommendations_pending ON recommendations(case_id)
  WHERE status = 'PENDING';                                    -- enforces guard G-REC (F09a §3)
```

## §5 Approvals

```sql
CREATE TABLE approvals (
  id                              TEXT PRIMARY KEY,
  case_id                         TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  recommendation_id               TEXT NOT NULL REFERENCES recommendations(id),
  decision                        TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT','REQUEST_INFO')),
  rejection_reason                TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN
                                    ('INSUFFICIENT_JUSTIFICATION','EVIDENCE_INCOMPLETE',
                                     'EXCEPTION_NOT_RESOLVED','POLICY_DISAGREEMENT','OTHER')),
  justification                   TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
  approver_user_id                TEXT NOT NULL REFERENCES users(id),
  approver_name                   TEXT NOT NULL,
  approver_role                   TEXT NOT NULL CHECK (approver_role = 'SUPERVISOR'),
  recommended_by_user_id          TEXT NOT NULL REFERENCES users(id),   -- copied for the SoD-2 constraint
  recommendation_evaluation_version INTEGER NOT NULL,
  current_evaluation_version      INTEGER NOT NULL,
  evidence_changed                INTEGER NOT NULL DEFAULT 0 CHECK (evidence_changed IN (0,1)),
  acknowledged_evidence_changed   INTEGER NOT NULL DEFAULT 0 CHECK (acknowledged_evidence_changed IN (0,1)),
  audit_entry_id                  TEXT NOT NULL,
  idempotency_key                 TEXT,
  decided_at                      TEXT NOT NULL,
  -- SoD-1: only a supervisor approves (approver_role CHECK above)
  -- SoD-2: the approver is never the recommender
  CHECK (approver_user_id <> recommended_by_user_id),
  CHECK (decision <> 'REJECT' OR rejection_reason IS NOT NULL),
  CHECK (evidence_changed = 0 OR acknowledged_evidence_changed = 1)
);
CREATE INDEX idx_approvals_case ON approvals(case_id, decided_at);
```

The three `CHECK` constraints are the database-level enforcement of F11's governance claims. Handler-level checks come first and produce friendly errors; these constraints make a bypass impossible even by a defective code path.

## §6 Audit entries

```sql
CREATE TABLE audit_entries (
  id                          TEXT PRIMARY KEY,
  case_id                     TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id              TEXT REFERENCES cargo_entries(id),
  shipment_id                 TEXT,
  sequence_no                 INTEGER NOT NULL,
  entry_class                 TEXT NOT NULL CHECK (entry_class IN
                                ('SYSTEM_EVENT','AI_OUTPUT','HUMAN_ACTION','APPROVAL_DECISION','ACCESS_DENIED')),
  event_type                  TEXT NOT NULL,

  -- the eight required fields (F12 §1)
  exceptions_json             TEXT NOT NULL,                   -- 1
  evidence_reviewed_json      TEXT NOT NULL,                   -- 2
  ai_recommendation_json      TEXT NOT NULL,                   -- 3  (explicit {present:false} when absent)
  user_decision               TEXT,                            -- 4
  user_decision_detail_json   TEXT,                            -- 4
  justification               TEXT,                            -- 5
  occurred_at                 TEXT NOT NULL,                   -- 6
  approving_official_user_id  TEXT REFERENCES users(id),       -- 7
  approving_official_name     TEXT,                            -- 7
  approving_official_role     TEXT,                            -- 7
  notification_id             TEXT REFERENCES notifications(id), -- 8
  notification_snapshot_json  TEXT,                            -- 8

  -- attribution and integrity
  actor_kind                  TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM','AI')),
  actor_user_id               TEXT REFERENCES users(id),
  actor_name                  TEXT,
  actor_role                  TEXT,
  system_actor_label          TEXT,
  case_status_before          TEXT,
  case_status_after           TEXT,
  evaluation_version          INTEGER,
  rule_set_fingerprint        TEXT,
  request_id                  TEXT,
  prev_hash                   TEXT NOT NULL,
  entry_hash                  TEXT NOT NULL,

  UNIQUE (case_id, sequence_no),
  -- "the AI never decides" as a storage constraint (00-header §0.4.7)
  CHECK (actor_kind <> 'AI' OR user_decision IS NULL),
  -- human and approval entries must be attributable and justified
  CHECK (entry_class NOT IN ('HUMAN_ACTION','APPROVAL_DECISION')
         OR (actor_user_id IS NOT NULL AND justification IS NOT NULL AND user_decision IS NOT NULL)),
  -- an approval decision must name the approving official and its notification
  CHECK (entry_class <> 'APPROVAL_DECISION'
         OR (approving_official_user_id IS NOT NULL AND approving_official_name IS NOT NULL))
);
CREATE INDEX idx_audit_case_seq  ON audit_entries(case_id, sequence_no);
CREATE INDEX idx_audit_actor     ON audit_entries(actor_user_id, occurred_at);
CREATE INDEX idx_audit_event     ON audit_entries(event_type, occurred_at);
```

### Append-only triggers (F12 §3)

```sql
CREATE TRIGGER audit_entries_no_delete
BEFORE DELETE ON audit_entries
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_IMMUTABLE: audit records cannot be deleted');
END;

-- The single narrow exemption: notification_id / notification_snapshot_json may go null -> non-null once.
CREATE TRIGGER audit_entries_no_update
BEFORE UPDATE ON audit_entries
WHEN NOT (
     OLD.notification_id IS NULL
 AND NEW.notification_id IS NOT NULL
 AND OLD.id                         IS NEW.id
 AND OLD.case_id                    IS NEW.case_id
 AND OLD.sequence_no                IS NEW.sequence_no
 AND OLD.entry_class                IS NEW.entry_class
 AND OLD.event_type                 IS NEW.event_type
 AND OLD.exceptions_json            IS NEW.exceptions_json
 AND OLD.evidence_reviewed_json     IS NEW.evidence_reviewed_json
 AND OLD.ai_recommendation_json     IS NEW.ai_recommendation_json
 AND OLD.user_decision              IS NEW.user_decision
 AND OLD.user_decision_detail_json  IS NEW.user_decision_detail_json
 AND OLD.justification              IS NEW.justification
 AND OLD.occurred_at                IS NEW.occurred_at
 AND OLD.approving_official_user_id IS NEW.approving_official_user_id
 AND OLD.actor_kind                 IS NEW.actor_kind
 AND OLD.actor_user_id              IS NEW.actor_user_id
 AND OLD.prev_hash                  IS NEW.prev_hash
 AND OLD.entry_hash                 IS NEW.entry_hash
)
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_IMMUTABLE: audit records are append-only');
END;
```

Any second attempt to set `notification_id` fails the `OLD.notification_id IS NULL` condition and aborts (test AU-05).

## §7 Notifications

```sql
CREATE TABLE notifications (
  id              TEXT PRIMARY KEY,
  case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id  TEXT REFERENCES cargo_entries(id),
  shipment_id     TEXT,
  audit_entry_id  TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  recipient_role  TEXT NOT NULL CHECK (recipient_role IN
                    ('CARGO_SPECIALIST','SUPERVISOR','SYSTEM_ADMINISTRATOR')),
  recipient_user_id TEXT REFERENCES users(id),
  subject         TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body            TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  transmitted     INTEGER NOT NULL DEFAULT 0 CHECK (transmitted = 0),   -- structurally never transmitted
  generated_at    TEXT NOT NULL
);
CREATE INDEX idx_notifications_role ON notifications(recipient_role, generated_at DESC);
CREATE INDEX idx_notifications_case ON notifications(case_id, generated_at);

CREATE TRIGGER notifications_no_delete
BEFORE DELETE ON notifications
BEGIN
  SELECT RAISE(ABORT, 'NOTIFICATION_IMMUTABLE: notifications cannot be deleted');
END;

CREATE TABLE notification_reads (
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  read_at         TEXT NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);
```

`CHECK (transmitted = 0)` makes "generated, not transmitted" a schema guarantee rather than a convention (test AU-11).

## §8 AI outputs

```sql
CREATE TABLE ai_outputs (
  id                     TEXT PRIMARY KEY,
  kind                   TEXT NOT NULL CHECK (kind IN ('SUMMARY','RECOMMENDATION')),
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id                TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluation_id          TEXT NOT NULL REFERENCES evaluations(id),
  content_json           TEXT NOT NULL,
  provenance_json        TEXT NOT NULL,                        -- provider, model, mode, timestamps, latency
  grounding_fingerprint  TEXT NOT NULL,
  generation_mode        TEXT NOT NULL CHECK (generation_mode IN
                           ('LLM','FALLBACK_PROVIDER_DISABLED','FALLBACK_PROVIDER_ERROR',
                            'FALLBACK_TIMEOUT','FALLBACK_VALIDATION_FAILED')),
  recommended_action     TEXT,                                 -- RECOMMENDATION only; one of the five
  confidence_level       TEXT CHECK (confidence_level IS NULL OR confidence_level IN ('HIGH','MEDIUM','LOW')),
  confidence_basis       TEXT,
  superseded_by          TEXT REFERENCES ai_outputs(id),
  regenerated_by_user_id TEXT REFERENCES users(id),
  generated_at           TEXT NOT NULL,
  -- an AI output may never name an approval action, and confidence always carries a basis
  CHECK (recommended_action IS NULL OR recommended_action IN
         ('REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW','CLEAR_EXCEPTION',
          'PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR')),
  CHECK (confidence_level IS NULL OR confidence_basis IS NOT NULL)
);
CREATE UNIQUE INDEX idx_ai_outputs_current ON ai_outputs(cargo_entry_id, kind, evaluation_id)
  WHERE superseded_by IS NULL;
```

## §9 Transport support

```sql
CREATE TABLE idempotency_keys (
  key            TEXT NOT NULL,
  scope          TEXT NOT NULL,                                -- 'case:<id>:action' | 'request:<id>:upload' | …
  request_hash   TEXT NOT NULL,                                -- sha256 of the canonical request body
  response_json  TEXT NOT NULL,
  status_code    INTEGER NOT NULL,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (key, scope)
);

CREATE TABLE request_log (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL,
  method        TEXT NOT NULL,
  path          TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  actor_role    TEXT,
  duration_ms   INTEGER NOT NULL,
  error_code    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_request_log_created ON request_log(created_at DESC);
```

`request_log` stores no request bodies and no field values — only routing and outcome metadata — so it cannot become an accidental data sink (PRD §6 Privacy). It is bounded to the most recent 10 000 rows by a trim on insert.

## §10 Reset order

`POST /api/admin/reset` (F2, F22) truncates in this order inside one transaction, then reseeds:

`notification_reads → notifications → audit_entries → approvals → recommendations → case_actions → ai_outputs → evidence → exceptions → evaluations → document_requests → documents → cases → cargo_entries → ingestion_batches → rules → sessions → users → idempotency_keys → request_log`

The append-only delete triggers on `audit_entries` and `notifications` are dropped and recreated around the reset transaction by the migration-aware reset routine; this is the only code path permitted to do so, it is administrator-gated, and it operates on the whole database rather than any selected subset (F12 §3.5).
---

# Y1a: API — Read Endpoints

Conventions inherited from F3: `X-CargoDemo-Session` on every protected route; list responses wrapped in `{ data, page, applied }`; single resources unwrapped with `_links`; timestamps ISO-8601 UTC ms; money as decimal strings; enums as canonical codes.

## §1 Queue

### `GET /api/queue` — CS, SUP, ADM

Query: `status[]`, `exception_type[]`, `priority[]`, `assignment` (`any|me|unassigned`), `pending_approval_only`, `include_clean`, `include_cleared`, `sort`, `page`, `page_size`.

```jsonc
{
  "data": [
    {
      "shipment_id": "SHP-2026-0007",
      "case_id": "case-0007",
      "importer_name": "Helios Grid Supply",
      "carrier_name": "Pacific Blue Lines",
      "priority": "CRITICAL",
      "priority_basis_summary": "Critical rule severity; value ≥ $50,000; 3 open exceptions",
      "status": "NEW",
      "open_exception_count": 3,
      "exception_types": [
        { "type": "MISSING_REQUIRED_DOCUMENT", "count": 1 },
        { "type": "INVALID_HTS_CODE", "count": 1 },
        { "type": "CONFLICTING_COUNTRY_OF_ORIGIN", "count": 1 }
      ],
      "exception_summary": "Missing certificate of origin; incomplete HTS code; origin conflict",
      "oldest_exception_opened_at": "2026-09-01T08:00:00.000Z",
      "age_days": 7,
      "assigned_to": null,
      "pending_approval": null,
      "shipment_value_usd": "85000.00",
      "updated_at": "2026-09-08T13:59:02.771Z"
    }
  ],
  "page": { "page": 1, "page_size": 25, "total": 11, "total_pages": 1 },
  "applied": { "filters": { "include_clean": false, "include_cleared": false }, "sort": "priority:desc,age:desc" }
}
```

Default exclusions: zero-exception cases and `CLEARED` cases (F17 §Validation).

## §2 Shipments

### `GET /api/shipments/{shipment_id}` — CS, SUP, ADM

```jsonc
{
  "shipment_id": "SHP-2026-0007",
  "case_id": "case-0007",
  "importer_name": "Helios Grid Supply",
  "carrier_name": "Pacific Blue Lines",
  "product_description": "Photovoltaic solar panels, monocrystalline, 400W",
  "hts_code": "8541.40",
  "hts_code_normalized": "854140",
  "hts_digit_count": 6,
  "country_of_origin": "Malaysia",
  "country_of_origin_iso2": "MY",
  "manufacturer": {
    "name": "Selat Solar Manufacturing Sdn Bhd",
    "address": { "line1": "88 Jalan Industri", "city": "Shenzhen", "region": "Guangdong",
                 "postal_code": "518000", "country": "China", "country_iso2": "CN" }
  },
  "shipment_value_usd": "85000.00",
  "entry_date": "2026-08-28",
  "case": {
    "status": "NEW", "priority": "CRITICAL",
    "priority_basis": [
      { "factor": "BASE_SEVERITY", "detail": "rule-origin-manufacturer is CRITICAL", "from": null, "to": "CRITICAL" },
      { "factor": "VALUE_ESCALATION", "detail": "$85,000.00 ≥ $50,000", "from": "CRITICAL", "to": "CRITICAL" },
      { "factor": "MULTIPLICITY_ESCALATION", "detail": "3 open exceptions", "from": "CRITICAL", "to": "CRITICAL" }
    ],
    "open_exception_count": 3,
    "current_evaluation": { "id": "eval-0007-1", "version": 1, "evaluated_at": "2026-09-01T08:00:00.000Z",
                            "trigger": "SEED", "rule_set_fingerprint": "sha256:…" },
    "assigned_to": null, "hold_reason": null, "escalated_to": null,
    "approving_official": null, "cleared_at": null,
    "case_version": 1757340382104
  },
  "ingestion": { "source": "seed", "batch_id": "batch-seed-1" },
  "_links": { "exceptions": "/api/shipments/SHP-2026-0007/exceptions",
              "documents": "/api/shipments/SHP-2026-0007/documents",
              "ai_summary": "/api/shipments/SHP-2026-0007/ai/summary",
              "ai_recommendation": "/api/shipments/SHP-2026-0007/ai/recommendation",
              "audit": "/api/cases/case-0007/audit",
              "available_actions": "/api/cases/case-0007/available-actions" }
}
```

## §3 Exceptions and evidence

### `GET /api/shipments/{id}/exceptions` — CS, SUP, ADM

Query: `include_resolved` (boolean, default `true`), `evaluation_version` (integer, default = current).

```jsonc
{
  "evaluation": { "id": "eval-0007-1", "version": 1, "trigger": "SEED",
                  "evaluated_at": "2026-09-01T08:00:00.000Z", "rule_set_fingerprint": "sha256:…" },
  "open": [
    {
      "exception_id": "exc-0007-origin",
      "exception_type": "CONFLICTING_COUNTRY_OF_ORIGIN",
      "sub_reason": "ORIGIN_MISMATCH",
      "severity": "CRITICAL",
      "status": "OPEN",
      "assertion": "Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)",
      "opened_at": "2026-09-01T08:00:00.000Z",
      "rule": { "id": "rule-origin-manufacturer", "name": "Origin vs manufacturer address",
                "version": 1, "description": "…", "policy_reference": "19 CFR 134.1", "severity": "CRITICAL" },
      "evidence": [
        { "kind": "OBSERVED",   "field_path": "country_of_origin",
          "raw_value": "Malaysia", "normalized_value": "MY", "display_order": 1 },
        { "kind": "COMPARISON", "field_path": "manufacturer.address.country",
          "raw_value": "China", "normalized_value": "CN", "display_order": 2 }
      ],
      "missing_information": []
    },
    {
      "exception_id": "exc-0007-hts",
      "exception_type": "INVALID_HTS_CODE",
      "sub_reason": "INCOMPLETE_DIGITS",
      "severity": "HIGH",
      "status": "OPEN",
      "assertion": "HTS code has 6 significant digits; a complete classification requires 10",
      "rule": { "id": "rule-hts-completeness", "policy_reference": "19 CFR 152.11", "…": "…" },
      "evidence": [
        { "kind": "OBSERVED", "field_path": "hts_code", "raw_value": "8541.40",
          "normalized_value": "854140", "expected": "10 digits", "observed": "6 digits", "display_order": 1 }
      ],
      "missing_information": [
        { "field_path": "hts_code", "requirement": "10-digit classification required",
          "observed_digits": 6, "missing_digits": 4 }
      ]
    },
    {
      "exception_id": "exc-0007-doc",
      "exception_type": "MISSING_REQUIRED_DOCUMENT",
      "sub_reason": "DOCUMENT_NOT_RECEIVED",
      "severity": "HIGH",
      "status": "OPEN",
      "rule": { "id": "rule-doc-highvalue-coo", "policy_reference": "19 CFR 102.0", "…": "…" },
      "evidence": [
        { "kind": "OBSERVED", "field_path": "documents",
          "raw_value": "COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING", "display_order": 1 },
        { "kind": "MISSING",  "field_path": "documents.CERTIFICATE_OF_ORIGIN", "display_order": 2 },
        { "kind": "CONTEXT",  "field_path": "shipment_value_usd", "raw_value": "85000.00",
          "assertion": "Rule applies to shipments valued at or above $50,000", "display_order": 3 }
      ],
      "missing_information": [
        { "document_type": "CERTIFICATE_OF_ORIGIN",
          "requirement": "Certificate of Origin is required for shipments valued at or above $50,000",
          "required_by_rule": "rule-doc-highvalue-coo", "policy_reference": "19 CFR 102.0" }
      ]
    }
  ],
  "resolved": [],
  "counts": { "open": 3, "resolved_by_revalidation": 0, "cleared_by_decision": 0 }
}
```

Exception order is the deterministic evaluation order from F4 §Process step 3.

### `GET /api/shipments/{id}/evaluations` — CS, SUP, ADM
Returns `[{ id, version, trigger, evaluated_at, actor, finding_count, rule_set_fingerprint, exception_summary }]`, newest first.

### `GET /api/shipments/{id}/evaluations/{version}` — CS, SUP, ADM
Returns one historical evaluation with its full exception and evidence set, in the same shape as §3.

### `GET /api/shipments/{id}/evaluations/{a}/diff/{b}` — CS, SUP, ADM
```jsonc
{ "from": { "version": 1 }, "to": { "version": 2 },
  "resolved": [ { "exception_id": "exc-0007-doc", "rule_id": "rule-doc-highvalue-coo",
                  "exception_type": "MISSING_REQUIRED_DOCUMENT",
                  "resolution_reason": "DOCUMENT_RECEIVED", "was_open_since": "2026-09-01T08:00:00.000Z" } ],
  "retained": [ { "exception_id": "exc-0007-hts-v2", "prior_exception_id": "exc-0007-hts",
                  "rule_id": "rule-hts-completeness", "open_since": "2026-09-01T08:00:00.000Z",
                  "missing_information_before": [ "…" ], "missing_information_after": [ "…" ],
                  "evidence_changed": false } ],
  "new": [],
  "priority": { "before": "CRITICAL", "after": "CRITICAL" },
  "status": { "before": "AWAITING_INFORMATION", "after": "IN_REVIEW" },
  "open_exception_count": { "before": 3, "after": 2 } }
```

## §4 Documents

### `GET /api/shipments/{id}/documents` — CS, SUP, ADM
```jsonc
{ "data": [
    { "id": "doc-0007-inv", "document_type": "COMMERCIAL_INVOICE", "display_name": "Commercial Invoice",
      "status": "RECEIVED", "provenance": "SEEDED", "filename": "invoice_SHP-2026-0007.pdf",
      "mime_type": "application/pdf", "file_size_bytes": 20481, "content_hash": "sha256:…",
      "received_at": "2026-09-01T08:00:00.000Z", "uploaded_by": null,
      "source_request_id": null, "required_by_rules": ["rule-doc-baseline"],
      "_links": { "content": "/api/documents/doc-0007-inv/content" } },
    { "document_type": "CERTIFICATE_OF_ORIGIN", "display_name": "Certificate of Origin",
      "status": "NOT_RECEIVED", "provenance": null, "required_by_rules": ["rule-doc-highvalue-coo"],
      "outstanding_request": { "id": "dr-0007-coo", "requested_by": "Marisol Reyes",
                               "requested_at": "2026-09-08T14:06:22.104Z" } }
  ] }
```

### `GET /api/shipments/{id}/document-requests` — CS, SUP, ADM
Returns the full lifecycle per request: `{ id, document_type, status, requested_by, requested_at, requested_from, due_by, fulfilled_by, fulfilled_at, fulfilling_document_id, cancellation_reason, cancelled_by, cancelled_at, linked_exception_id, linked_rule_id }`.

### `GET /api/documents/{id}/content` — CS, SUP, ADM
Streams the stored synthetic file with `Content-Type` from `mime_type` and `Content-Disposition: attachment`.

### `GET /api/shipments/{id}/upload-fixtures` — CS, SUP
`[{ fixture_id, document_type, filename, mime_type, size_bytes, description }]` — the seeded upload-ready fixtures offered by F18's upload dialog.

## §5 Audit

### `GET /api/cases/{id}/audit` — CS, SUP, ADM
Query: `entry_class`, `since_sequence_no`, `page`, `page_size` (1–500, default 100).

```jsonc
{
  "case": { "id": "case-0007", "shipment_id": "SHP-2026-0007", "status": "CLEARED",
            "approving_official": { "id": "usr-sup-001", "name": "Dwayne Okafor", "role": "SUPERVISOR" },
            "cleared_at": "2026-09-08T14:22:09.883Z" },
  "completeness": { "total_entries": 12, "decision_entries": 5,
                    "decision_entries_complete": 5, "missing_fields": [] },
  "data": [
    {
      "id": "aud-0007-011", "sequence_no": 11,
      "entry_class": "APPROVAL_DECISION", "event_type": "CLEARANCE_APPROVED",
      "occurred_at": "2026-09-08T14:22:09.883Z",
      "actor": { "kind": "HUMAN", "user_id": "usr-sup-001", "name": "Dwayne Okafor", "role": "SUPERVISOR" },
      "status_change": { "before": "PENDING_APPROVAL", "after": "CLEARED" },
      "exceptions": [ { "exception_id": "exc-0007-hts-v2", "exception_type": "INVALID_HTS_CODE",
                        "severity": "HIGH", "status": "CLEARED_BY_DECISION",
                        "rule_id": "rule-hts-completeness", "policy_reference": "19 CFR 152.11" } ],
      "evidence_reviewed": [ { "exception_id": "exc-0007-hts-v2", "kind": "OBSERVED",
                               "field_path": "hts_code", "raw_value": "8541.40",
                               "normalized_value": "854140", "expected": "10 digits", "observed": "6 digits" } ],
      "ai_recommendation": { "present": true, "recommended_action": "ESCALATE_TO_SUPERVISOR",
                             "confidence_level": "MEDIUM", "confidence_basis": "…", "rationale": "…",
                             "provenance": { "provider": "deterministic-fallback",
                                             "model": "cargodemo-fallback-recommendation@1",
                                             "generation_mode": "FALLBACK_PROVIDER_DISABLED",
                                             "generated_at": "…", "grounding_fingerprint": "sha256:…" },
                             "concurrence": "DIVERGED" },
      "user_decision": "APPROVE",
      "user_decision_detail": { "recommendation_id": "rec-0007-1", "resolution_basis": "MIXED",
                                "evidence_changed": false },
      "justification": "Certificate of origin received and consistent with the entry. Residual HTS and origin findings reviewed and accepted with an annotation for the classification unit.",
      "approving_official": { "user_id": "usr-sup-001", "name": "Dwayne Okafor", "role": "SUPERVISOR" },
      "notification": { "id": "ntf-0007-011", "recipient_role": "CARGO_SPECIALIST",
                        "subject": "Clearance approved for SHP-2026-0007 by Dwayne Okafor",
                        "body": "…", "generated_at": "…", "transmitted": false },
      "evaluation_version": 2, "rule_set_fingerprint": "sha256:…",
      "prev_hash": "sha256:…", "entry_hash": "sha256:…",
      "presentation": { "headline": "Clearance approved", "authorship": "HUMAN",
                        "actor_label": "Dwayne Okafor (Supervisor)",
                        "decision_label": "Approved the clearance recommendation" }
    }
  ],
  "page": { "page": 1, "page_size": 100, "total": 12, "total_pages": 1 }
}
```

### `GET /api/cases/{id}/audit/{sequence_no}` — CS, SUP, ADM
One entry in the shape above.

### `GET /api/cases/{id}/audit/verify` — CS, SUP, ADM
`{ "valid": true, "entries_checked": 12, "first_invalid_sequence_no": null, "verified_at": "…" }`

### `GET /api/cases/{id}/audit/export` — CS, SUP, ADM
`format=json` → the full record with the chain and a `verification` block, `Content-Disposition: attachment; filename="audit-SHP-2026-0007.json"`. `format=printable` → server-rendered HTML.

### `GET /api/audit` — SUP, ADM
Cross-case search. Query: `actor_user_id`, `event_type`, `entry_class`, `shipment_id`, `from`, `to`, `page`, `page_size`.

## §6 Notifications

### `GET /api/notifications` — CS, SUP, ADM
Query: `unread_only`, `case_id`, `page`, `page_size`. Scoped to the acting role's addressing (F14 row 42).
```jsonc
{ "data": [ { "id": "ntf-0007-005", "case_id": "case-0007", "shipment_id": "SHP-2026-0007",
              "event_type": "REQUEST_INFORMATION", "recipient_role": "CARGO_SPECIALIST",
              "subject": "Document requested for SHP-2026-0007", "body": "…",
              "generated_at": "…", "transmitted": false, "read": false,
              "audit_entry_id": "aud-0007-005" } ],
  "unread_count": 4,
  "page": { "page": 1, "page_size": 25, "total": 9, "total_pages": 1 } }
```

### `GET /api/notifications/unread-count` — CS, SUP, ADM
`{ "unread_count": 4 }`

### `GET /api/cases/{id}/notifications` — CS, SUP, ADM
Per-case list in the same item shape, ordered by `generated_at` ascending.

## §7 Workflow reads

### `GET /api/cases/{id}/available-actions` — CS, SUP, ADM
```jsonc
{ "case_id": "case-0007", "status": "NEW", "acting_role": "CARGO_SPECIALIST",
  "actions": [
    { "action": "REQUEST_INFORMATION", "available": true,  "reason": null,
      "required_fields": ["justification","document_types"], "justification_min_length": 10 },
    { "action": "SEND_FOR_SPECIALIST_REVIEW", "available": true, "reason": null },
    { "action": "CLEAR_EXCEPTION", "available": true, "reason": null,
      "required_fields": ["justification","exception_ids","resolution_basis"] },
    { "action": "PLACE_ON_HOLD", "available": true, "reason": null },
    { "action": "ESCALATE_TO_SUPERVISOR", "available": true, "reason": null }
  ],
  "approval": { "available": false, "reason": "APPROVAL_PENDING_ABSENT" },
  "case_version": 1757340382104 }
```

### `GET /api/workflow/transitions` — CS, SUP, ADM
The F09a §2 table as data: `[{ id: "T01", from, action, allowed_roles, to, guards, invalid_reason }]`. Consumed by the UI and by tests WF-01 and WF-02.

### `GET /api/cases/{id}/actions` — CS, SUP, ADM
Action history: `[{ action_id, action, status_before, status_after, justification, parameters, actor, occurred_at, audit_entry_id }]`.

### `GET /api/cases/{id}/recommendations` / `GET /api/cases/{id}/approvals` — CS, SUP, ADM
As defined in F11 §Outputs, returned as lists ordered by time ascending.
---

# Y1b: API — Mutating & Workflow Endpoints

Every endpoint in this chunk: requires `X-CargoDemo-Session`; performs a server-side role check before any write; accepts `Idempotency-Key` and `If-Match-Case-Version`; executes its domain write, audit entry, and notification in one transaction; and returns `X-Case-Version` on success.

## §1 Workflow actions

### `POST /api/cases/{case_id}/actions` — CS, SUP · `201 Created`

Discriminated on `action`. Common fields: `action` (required), `justification` (required, 10–2 000 chars; 40 minimum for `CLEAR_EXCEPTION` with `EXCEPTIONS_ACCEPTED`/`MIXED`).

**`REQUEST_INFORMATION`**
```jsonc
{ "action": "REQUEST_INFORMATION",
  "justification": "Certificate of origin is required to substantiate the declared Malaysian origin given the Chinese manufacturer address.",
  "document_types": ["CERTIFICATE_OF_ORIGIN"],
  "requested_from": "Importer of record",
  "due_by": "2026-09-15",
  "justify_unlisted_document": false }
```

**`SEND_FOR_SPECIALIST_REVIEW`**
```jsonc
{ "action": "SEND_FOR_SPECIALIST_REVIEW",
  "justification": "Taking this case up for review.",
  "assign_to_user_id": "usr-cs-001",
  "cancel_outstanding_requests": true }
```

**`CLEAR_EXCEPTION`**
```jsonc
{ "action": "CLEAR_EXCEPTION",
  "justification": "Certificate of origin received and consistent with the declared origin. Residual HTS and origin findings reviewed and accepted with an annotation for the classification unit.",
  "exception_ids": ["exc-0007-hts-v2", "exc-0007-origin-v2"],
  "resolution_basis": "MIXED",
  "acknowledge_outstanding_requests": false }
```

**`PLACE_ON_HOLD`**
```jsonc
{ "action": "PLACE_ON_HOLD",
  "justification": "Holding pending classification guidance from the commodity team.",
  "hold_reason": "PENDING_POLICY_GUIDANCE",
  "hold_reason_detail": null,
  "review_by": "2026-09-20" }
```

**`ESCALATE_TO_SUPERVISOR`**
```jsonc
{ "action": "ESCALATE_TO_SUPERVISOR",
  "justification": "Origin conflict on a high-value consignment warrants supervisor authority.",
  "escalation_reason": "CONFLICTING_EVIDENCE",
  "escalation_reason_detail": null,
  "escalate_to_user_id": "usr-sup-001" }
```

**Response** — the `ActionResult` of F09b §7, containing `action_id`, `status.before/after`, `acting_user`, `justification`, `occurred_at`, `ai_recommendation` with `concurrence`, `side_effects`, `audit_entry_id`, `notification_id`, `available_actions`, `case_version`.

**Errors** — `401 UNAUTHENTICATED`; `403 FORBIDDEN_ROLE | ESCALATED_REQUIRES_SUPERVISOR | HOLD_REQUIRES_RELEASE | ASSIGNMENT_NOT_PERMITTED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | TRANSITION_REDUNDANT | CASE_TERMINAL | CASE_VERSION_CONFLICT | RECOMMENDATION_ALREADY_PENDING | EXCEPTION_SET_STALE | DUPLICATE_DOCUMENT_REQUEST | DOCUMENT_ALREADY_RECEIVED | IDEMPOTENCY_KEY_REUSED`; `422 VALIDATION_FAILED | ACTION_NOT_A_USER_ACTION | JUSTIFICATION_REQUIRED | JUSTIFICATION_NOT_AUTHORED | DOCUMENT_TYPE_NOT_REQUIRED | OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED | ASSIGNEE_INVALID | ESCALATION_TARGET_INVALID`; `500 AUDIT_INCOMPLETE | NOTIFICATION_GENERATION_FAILED`.

## §2 Approvals

### `POST /api/cases/{case_id}/approval` — SUP only · `200 OK`

```jsonc
{ "recommendation_id": "rec-0007-1",
  "decision": "APPROVE",
  "justification": "Evidence reviewed. The certificate substantiates the declared origin; the residual findings are annotated and accepted. Clearance approved.",
  "acknowledge_evidence_changed": false,
  "rejection_reason": null,
  "document_types": null }
```

`decision: "REJECT"` requires `rejection_reason` and a justification of ≥ 40 chars. `decision: "REQUEST_INFO"` requires `document_types` (1–10 items).

**Response** — the `ApprovalResult` of F11 §Outputs: `approval`, `recommendation`, `case` (with `approving_official` and `cleared_at` on approve), `exceptions_closed[]`, `audit_entry_id`, `notification_id`, `case_version`.

**Errors** — `403 FORBIDDEN_ROLE | SELF_APPROVAL_BLOCKED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | CASE_TERMINAL | RECOMMENDATION_NOT_PENDING | EVIDENCE_CHANGED_UNACKNOWLEDGED | CASE_VERSION_CONFLICT`; `422 VALIDATION_FAILED | JUSTIFICATION_REQUIRED`; `500 AUDIT_INCOMPLETE`.

`POST /api/cases/{id}/actions` MUST reject `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` with `422 ACTION_NOT_A_USER_ACTION`, and this endpoint MUST reject any of the five user action codes with the same error. The two surfaces are disjoint by design (F11 §Validation).

## §3 Revalidation

### `POST /api/shipments/{shipment_id}/revalidate` — CS, SUP · `200 OK`

```jsonc
{ "note": "Re-running rules after the certificate upload." }
```
`note` is optional (0–1 000 chars). Revalidation requires no justification because it asserts nothing (F6 §Inputs). `trigger` is server-determined and is never accepted from the client.

**Response** — the `RevalidationResult` of F6 §Outputs:
```jsonc
{ "evaluation": { "id": "eval-0007-2", "version": 2, "evaluated_at": "…",
                  "trigger": "MANUAL_REVALIDATION", "rule_set_fingerprint": "sha256:…" },
  "resolved": [ { "exception_id": "exc-0007-doc", "rule_id": "rule-doc-highvalue-coo",
                  "exception_type": "MISSING_REQUIRED_DOCUMENT",
                  "resolution_reason": "DOCUMENT_RECEIVED",
                  "was_open_since": "2026-09-01T08:00:00.000Z" } ],
  "retained": [ { "exception_id": "exc-0007-hts-v2", "prior_exception_id": "exc-0007-hts",
                  "rule_id": "rule-hts-completeness", "exception_type": "INVALID_HTS_CODE",
                  "open_since": "2026-09-01T08:00:00.000Z",
                  "missing_information_before": [ "…" ], "missing_information_after": [ "…" ],
                  "evidence_changed": false } ],
  "new": [],
  "priority": { "before": "CRITICAL", "after": "CRITICAL", "basis": [ "…" ] },
  "status":   { "before": "AWAITING_INFORMATION", "after": "IN_REVIEW" },
  "open_exception_count": { "before": 3, "after": 2 },
  "document_requests_fulfilled": ["dr-0007-coo"],
  "ai_regeneration": { "summary_status": "FALLBACK", "recommendation_status": "FALLBACK" },
  "audit_entry_id": "aud-0007-007", "notification_id": "ntf-0007-007",
  "case_version": 1757340501993 }
```

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 CASE_TERMINAL | CASE_VERSION_CONFLICT | EVALUATION_VERSION_CONFLICT`; `500 EVALUATION_FAILED | RECONCILIATION_INCONSISTENT | AUDIT_INCOMPLETE`.

## §4 Documents

### `POST /api/document-requests/{request_id}/upload` — CS, SUP · `201 Created`

`Content-Type: multipart/form-data` with two parts:
- `file` — binary, 1 byte – 5 MB, MIME in `{application/pdf, image/png, image/jpeg, text/plain, text/csv}`
- `metadata` — JSON: `{ "original_filename": "CERTIFICATE_OF_ORIGIN_SHP-2026-0007.pdf", "note": "Synthetic fixture attached during demo", "stated_country": "Malaysia" }`

`document_type` is **not** accepted from the client; it is copied from the request row (F10 §Process step 7).

**Response** — the `UploadResult` of F10 §Outputs, embedding the full `RevalidationResult` from §3.

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 REQUEST_NOT_OUTSTANDING | CASE_TERMINAL | CASE_VERSION_CONFLICT`; `413 PAYLOAD_TOO_LARGE`; `415 UNSUPPORTED_MEDIA_TYPE`; `422 FILE_REQUIRED | FILE_EMPTY | FILE_EXTENSION_MISMATCH | FILE_CONTENT_MISMATCH | PII_SUSPECTED`; `500 STORAGE_PATH_INVALID | STORAGE_WRITE_FAILED | EVALUATION_FAILED`.

### `POST /api/document-requests/{request_id}/cancel` — CS, SUP · `200 OK`
```jsonc
{ "reason": "Superseded by a broader request covering the full document set." }
```
Returns the updated request. Errors: `409 REQUEST_NOT_OUTSTANDING`, `422 VALIDATION_FAILED`, `403 FORBIDDEN_ROLE`.

## §5 Endpoint-to-transition map

| Endpoint | Transitions it can cause | Never causes |
|---|---|---|
| `POST /api/cases/{id}/actions` | T01–T06, T08–T18, T20–T24, T26, T29 | `CLEARED` |
| `POST /api/cases/{id}/approval` | T31 (`CLEARED`), T32 (`IN_REVIEW`), T26 (`AWAITING_INFORMATION`) | any of the five user actions |
| `POST /api/shipments/{id}/revalidate` | `NEW→IN_REVIEW`, `AWAITING_INFORMATION→IN_REVIEW` | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/upload` | indirectly via revalidation | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/cancel` | none | any |

`POST /api/cases/{id}/approval` is the sole endpoint in the entire API that can produce `CLEARED`, and only under `decision: "APPROVE"` by a supervisor who is not the recommender. This is the API-surface expression of F09a invariant I1.

## §6 Shared request headers

| Header | Required | Behavior |
|---|---|---|
| `X-CargoDemo-Session` | yes | Resolves the acting user; `401` if absent or invalid |
| `Idempotency-Key` | recommended (the UI always sends it) | Replay with an identical payload returns the original response; replay with a different payload returns `409 IDEMPOTENCY_KEY_REUSED` |
| `If-Match-Case-Version` | recommended | `409 CASE_VERSION_CONFLICT` when the case changed since that version |
| `Content-Type` | yes | `application/json` except upload, which is `multipart/form-data` |

## §7 Shared response headers

| Header | Present on | Meaning |
|---|---|---|
| `X-Request-Id` | all responses | Correlates with `request_log` and with the `request_id` in error bodies |
| `X-Case-Version` | mutating case routes | The case's new version for the client's next `If-Match-Case-Version` |
| `Location` | `201` responses | The canonical URL of the created resource |
---

# Y1c: API — Session, AI, Rules, Ingestion & Demo Operations

## §1 Session and roles

### `GET /api/users` — open · `200`
`[{ "id": "usr-cs-001", "name": "Marisol Reyes", "role": "CARGO_SPECIALIST", "active": true }, …]`
Open so the role selector can render before a session exists (F16 §Process step 1).

### `POST /api/session` — open · `201`
Request `{ "user_id": "usr-cs-001" }`
```jsonc
{ "session_token": "…", 
  "user": { "id": "usr-cs-001", "name": "Marisol Reyes", "role": "CARGO_SPECIALIST" },
  "permissions_summary": { "can_adjudicate": true, "can_approve": false,
                           "can_edit_rules": false, "can_reset": false } }
```
Errors: `404 RESOURCE_NOT_FOUND`, `403 USER_INACTIVE`. An existing session is implicitly ended and a `ROLE_SWITCHED` system audit entry is written (F14 §1 step 8).

### `GET /api/session` — CS, SUP, ADM · `200` / `401 UNAUTHENTICATED`
### `DELETE /api/session` — CS, SUP, ADM · `204`

### `GET /api/rbac/matrix` — CS, SUP, ADM · `200`
`[{ "route_id": "cases.actions.create", "method": "POST", "path": "/api/cases/{id}/actions", "allowed_roles": ["CARGO_SPECIALIST","SUPERVISOR"], "predicates": ["state_machine","escalation_authority"] }, …]`
Generated from the enforcement declarations, not hand-maintained (F14 §Validation).

### `POST /api/users` — ADM · `201` · `{ name, role, active }`
### `PATCH /api/users/{id}` — ADM · `200` · `{ name?, role?, active? }`
Errors: `422 INVALID_ENUM_VALUE`, `403 SELF_ROLE_CHANGE_BLOCKED`.

## §2 AI assistance

### `GET /api/shipments/{id}/ai/summary` — CS, SUP, ADM · `200`
Query: `regenerate` (boolean, default `false`).
Response: the F7 §Outputs object. **Always `200`** — provider failures produce a fallback, never an error (F7 §Validation).

### `POST /api/shipments/{id}/ai/summary/regenerate` — CS, SUP · `200`
Same response with `cached: false` and `regenerated_by_user_id` recorded.

### `GET /api/shipments/{id}/ai/recommendation` — CS, SUP, ADM · `200`
Response: the F8 §Outputs object, including `recommended_action`, `confidence` with `level`/`score`/`basis`/`factors`, `rationale`, `available_to_current_role`, the `presentation` bundle with rule and evidence per exception, the `governance_notice`, and `provenance` with `action_source: "DETERMINISTIC"`.

### `POST /api/shipments/{id}/ai/recommendation/regenerate` — CS, SUP · `200`

### `GET /api/shipments/{id}/ai/outputs` — CS, SUP, ADM · `200`
All AI outputs across evaluation versions: `[{ id, kind, evaluation_version, generation_mode, generated_at, superseded_by, provenance, content_summary }]`. Used by F20 to show what the decider was advised at each point in history.

Errors for all AI routes: `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `409 NO_EVALUATION`, `403 FORBIDDEN_ROLE` (regenerate only, ADM denied).

## §3 Rules

### `GET /api/rules` — CS, SUP, ADM · `200`
Query: `exception_type`, `enabled`, `severity`, `page`, `page_size`.
```jsonc
{ "data": [ { "id": "rule-origin-manufacturer", "name": "Origin vs manufacturer address",
              "exception_type": "CONFLICTING_COUNTRY_OF_ORIGIN", "severity": "CRITICAL",
              "enabled": true, "policy_reference": "19 CFR 134.1", "description": "…",
              "version": 1, "updated_at": "…", "updated_by_name": "Priya Raghavan",
              "open_exception_count": 4, "affected_shipment_count": 4 } ],
  "page": { "…": "…" } }
```

### `GET /api/rules/{id}` — CS, SUP, ADM · `200`
Adds `conditions`, `params_json`, and `params_schema` (the JSON Schema for its `exception_type`, so the admin form renders generically).

### `POST /api/rules` — ADM · `201`
```jsonc
{ "definition": {
    "id": "rule-doc-battery-cert",
    "name": "Battery safety certificate for lithium consignments",
    "exception_type": "MISSING_REQUIRED_DOCUMENT",
    "description": "Lithium cell consignments require a battery safety certificate.",
    "policy_reference": "49 CFR 173.185",
    "severity": "HIGH",
    "conditions": { "commodity_keywords": ["lithium", "battery"] },
    "params_json": { "required_document_types": ["BATTERY_SAFETY_CERTIFICATE"],
                     "match_mode": "ALL", "accept_statuses": ["RECEIVED"],
                     "require_file_present": true, "ignore_superseded": true } },
  "change_note": "Adding the certificate requirement flagged by the commodity team.",
  "revalidate_affected": true }
```

### `PATCH /api/rules/{id}` — ADM · `200`
Same body; `exception_type` MUST NOT change (`422 RULE_TYPE_IMMUTABLE`).

### `POST /api/rules/{id}/enable` / `POST /api/rules/{id}/disable` — ADM · `200`
`{ "change_note": "…", "revalidate_affected": true }`

### `POST /api/rules/{id}/preview-impact` — ADM · `200`
Body `{ "definition": { … } }`. Performs **zero writes** (F15 §Validation, test asserted).
```jsonc
{ "valid": true, "evaluated_shipments": 11,
  "would_add":    [ { "shipment_id": "SHP-2026-0002", "exception_type": "MISSING_REQUIRED_DOCUMENT",
                      "severity": "HIGH" } ],
  "would_remove": [ { "shipment_id": "SHP-2026-0007", "exception_id": "exc-0007-hts",
                      "exception_type": "INVALID_HTS_CODE" } ],
  "would_change_severity": [],
  "would_change_priority": [ { "shipment_id": "SHP-2026-0007", "from": "CRITICAL", "to": "HIGH" } ],
  "summary": { "added": 1, "removed": 1, "unchanged": 9, "priority_changes": 1 },
  "skipped_cleared": ["SHP-2026-0009"],
  "truncated": false }
```

### `GET /api/rules/{id}/history` — CS, SUP, ADM · `200`
`[{ audit_entry_id, event_type, occurred_at, actor, change_note, before, after, diff: [{ path, before, after }] }]`

**Rule save response** (`RuleSaveResult`):
```jsonc
{ "rule": { "…": "…" }, "previous_version": 1,
  "diff": [ { "path": "params_json.expected_digit_count", "before": 10, "after": 6 } ],
  "revalidation": { "shipments_revalidated": 6, "exceptions_added": 0,
                    "exceptions_resolved": 2, "priorities_changed": 1, "failures": [] },
  "audit_entry_id": "aud-rule-014" }
```

Errors: `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `405 RULE_DELETE_NOT_SUPPORTED`; `409 RULE_NAME_CONFLICT | TRANSITION_REDUNDANT`; `422 RULE_TYPE_IMMUTABLE | RULE_CONFIG_INVALID | RULE_PARAM_PATH_UNKNOWN | CHANGE_NOTE_REQUIRED | PREVIEW_TOO_LARGE | VALIDATION_FAILED`; `207 PARTIAL_REVALIDATION_FAILURE`.

## §4 Ingestion

### `POST /api/ingest/cargo-entries` — ADM · `201` / `207`
```jsonc
{ "schema_version": "1.0", "source": "demo-api",
  "entries": [ { "shipment_id": "SHP-2026-0013",
                 "importer_name": "Northwind Trading Co",
                 "carrier_name": "Cascade Freight Lines",
                 "product_description": "Ceramic floor tile, glazed",
                 "hts_code": "6907.21.10.00",
                 "country_of_origin": "Vietnam",
                 "manufacturer": { "name": "Mekong Ceramics JSC",
                                   "address": { "line1": "12 Industrial Road", "city": "Bien Hoa",
                                                "country": "Vietnam" } },
                 "shipment_value_usd": 42500.00,
                 "entry_date": "2026-09-05",
                 "documents": [ { "document_type": "COMMERCIAL_INVOICE", "status": "RECEIVED",
                                  "filename": "inv-13.pdf", "received_at": "2026-09-05T10:00:00.000Z" },
                                { "document_type": "PACKING_LIST", "status": "NOT_RECEIVED" } ] } ] }
```

Response — the `IngestionReport` of F1 §Outputs. `201` when every entry succeeded; `207 Multi-Status` when the batch was mixed.

Errors: `400 INGEST_MALFORMED_JSON`; `403 FORBIDDEN_ROLE`; `422 INGEST_SCHEMA_VERSION_UNSUPPORTED | INGEST_BATCH_SIZE_INVALID | INGEST_ENTRY_INVALID | INGEST_DOCUMENT_FILENAME_REQUIRED`; `409 CASE_TERMINAL | INGEST_DUPLICATE_IN_BATCH`.

### `GET /api/ingest/reports/{batch_id}` — ADM · `200`
Returns the stored `IngestionReport`.

## §5 Demo operations

### `GET /api/health` — open · `200`
Query: `verbose`. Response as specified in F22 §Outputs, with `status: "ok" | "degraded" | "failed"` and per-subsystem detail for `database`, `seed`, `rules`, `documents`, `ai`, `workflow`, `rbac`, plus the `demo` block with host, port, preview URL, and reset endpoint.

Never exposes the AI API key, database credentials, or absolute paths outside the project (F22 §Validation).

### `POST /api/admin/reset` — ADM · `200`
Request `{ "confirm": true }`. Response: the F2 `SeedReport` plus `reset_at` and `duration_ms`.
Errors: `403 FORBIDDEN_ROLE`; `422 CONFIRMATION_REQUIRED`; `500 SEED_COVERAGE_FAILED | SEED_CANONICAL_SCENARIO_INVALID | SEED_FIXTURE_MISSING | SEED_PII_SUSPECTED | SEED_WORKFLOW_SCRIPT_INVALID`.

### `GET /api/admin/seed-report` — ADM · `200`
The last `SeedReport` including the coverage block.

### `GET /api/openapi.json` — open · `200`
OpenAPI 3.1 document generated from the same schemas the middleware validates against, so specification drift is structurally impossible (F3 §Outputs).

## §6 Route inventory (60 routes)

| Group | Count | Routes |
|---|---|---|
| Session & users | 7 | `GET/POST/DELETE /api/session`, `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}`, `GET /api/rbac/matrix` |
| Queue & shipments | 6 | `/api/queue`, `/api/shipments/{id}`, `.../exceptions`, `.../evaluations`, `.../evaluations/{v}`, `.../evaluations/{a}/diff/{b}` |
| Documents | 6 | `.../documents`, `.../document-requests`, `.../upload-fixtures`, `/api/documents/{id}/content`, upload, cancel |
| Workflow | 5 | `POST/GET /api/cases/{id}/actions`, `/available-actions`, `/api/workflow/transitions`, `/api/shipments/{id}/revalidate` |
| Approvals | 3 | `POST /api/cases/{id}/approval`, `GET .../recommendations`, `GET .../approvals` |
| AI | 5 | summary, summary/regenerate, recommendation, recommendation/regenerate, outputs |
| Audit | 5 | `/audit`, `/audit/{seq}`, `/audit/verify`, `/audit/export`, `/api/audit` |
| Notifications | 5 | list, unread-count, per-case, read, read-all |
| Rules | 8 | list, detail, create, patch, enable, disable, preview-impact, history |
| Ingestion & demo | 5 | ingest, ingest report, health, reset, seed-report |
| OpenAPI | 1 | `/api/openapi.json` |
| **Total** | **60** | matches the F14 §2 matrix and the `health.subsystems.rbac.routes_registered` assertion |
---

# Y2: Cross-Feature Error Catalog

Every non-2xx response uses the uniform envelope from F3:

```jsonc
{ "error": { "code": "EXCEPTION_SET_STALE",
             "message": "The exception set changed; reload the shipment and resubmit",
             "details": { "expected": ["exc-a","exc-b"], "actual": ["exc-b"] },
             "field_errors": [ { "path": "exception_ids", "code": "STALE", "message": "…" } ],
             "request_id": "req-8f2a…" } }
```

Clients branch on `code`, never on `message`. Messages are user-facing copy; `details` is diagnostic; `field_errors` drives inline form annotation.

## §1 Transport and authentication (F3, F14)

| Code | HTTP | Retryable | Meaning / operator guidance |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | after login | No acting user; select a role |
| `SESSION_INVALID` | 401 | after login | Session unknown, ended, or the user was deactivated |
| `FORBIDDEN_ROLE` | 403 | no | The acting role may not perform the operation |
| `SELF_ROLE_CHANGE_BLOCKED` | 403 | no | A user cannot change their own role |
| `USER_INACTIVE` | 403 | no | The selected user is deactivated |
| `RESOURCE_NOT_FOUND` | 404 | no | The path resource does not exist |
| `MALFORMED_JSON` | 400 | after fix | Body is not valid JSON |
| `VALIDATION_FAILED` | 422 | after fix | Schema violation; see `field_errors` |
| `INVALID_ENUM_VALUE` | 422 | after fix | Value outside a canonical enum |
| `INVALID_QUERY_PARAM` | 422 | after fix | Unsupported filter or sort field |
| `PAYLOAD_TOO_LARGE` | 413 | no | Body or file exceeds its limit |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | no | Content type not in the upload allow-list |
| `IDEMPOTENCY_KEY_REUSED` | 409 | no | Key reused with a different payload |
| `CASE_VERSION_CONFLICT` | 409 | after reload | The case changed concurrently |
| `INTERNAL_ERROR` | 500 | maybe | Unhandled fault; quote `request_id` |

## §2 Ingestion and seed (F1, F2)

| Code | HTTP | Meaning |
|---|---|---|
| `INGEST_MALFORMED_JSON` | 400 | Payload unparseable |
| `INGEST_SCHEMA_VERSION_UNSUPPORTED` | 422 | Envelope `schema_version` not `"1.0"`; whole batch rejected |
| `INGEST_BATCH_SIZE_INVALID` | 422 | `entries` outside 1–500 |
| `INGEST_ENTRY_INVALID` | 207/422 | One entry failed field validation; others proceed |
| `INGEST_DUPLICATE_IN_BATCH` | 207 | Same `shipment_id` twice in one batch |
| `INGEST_DOCUMENT_FILENAME_REQUIRED` | 207/422 | `RECEIVED` document without a filename |
| `INGEST_FILE_NOT_FOUND` | exit 1 | CLI/file ingestion path missing |
| `SEED_DB_NOT_EMPTY` | 409 | Seed attempted on populated DB without `FORCE_RESEED` |
| `SEED_COVERAGE_FAILED` | 500 | A coverage assertion failed; seeding rolled back |
| `SEED_CANONICAL_SCENARIO_INVALID` | 500 | The solar-panel shipment does not match required values |
| `SEED_FIXTURE_MISSING` | 500 | A document fixture is absent from the repository |
| `SEED_PII_SUSPECTED` | 500 | Seed content matched a PII deny-list pattern |
| `SEED_WORKFLOW_SCRIPT_INVALID` | 500 | A scripted seed transition was rejected by the state machine |

## §3 Rules and evaluation (F4, F5, F15)

| Code | HTTP | Meaning |
|---|---|---|
| `RULE_CONFIG_INVALID` | 422 on save / reported in result on load | `params_json` failed its type schema or a cross-field check |
| `RULE_PARAM_PATH_UNKNOWN` | 422 | `comparison_fields` names an unrecognized origin-bearing path |
| `RULE_TYPE_IMMUTABLE` | 422 | Attempt to change a rule's `exception_type` |
| `RULE_NAME_CONFLICT` | 409 | Rule name already used |
| `CHANGE_NOTE_REQUIRED` | 422 | Rule mutation without a change note |
| `RULE_DELETE_NOT_SUPPORTED` | 405 | Rules are disabled, never deleted |
| `PREVIEW_TOO_LARGE` | 422 | Impact preview beyond the 500-shipment budget |
| `PARTIAL_REVALIDATION_FAILURE` | 207 | Rule saved; some shipments failed to revalidate |
| `EXCEPTION_TYPE_UNSUPPORTED` | 500 | A persisted rule declares a fourth exception type |
| `EVALUATION_FAILED` | 500 | Rule evaluation raised |
| `EVALUATION_TIMEOUT` | 500 | Evaluation exceeded the 2 s ceiling |
| `EVALUATION_VERSION_CONFLICT` | 409 | Concurrent evaluation; retry |
| `EXCEPTION_EVIDENCE_REQUIRED` | 500 | An exception was written with no evidence |
| `MISSING_INFORMATION_REQUIRED` | 500 | A missing-document exception lacked its missing types |
| `PRIORITY_DERIVATION_FAILED` | 500 | Derived priority outside the canonical set |
| `EVALUATION_HISTORY_IMMUTABLE` | 405 | Attempt to modify a superseded evaluation |
| `NO_EVALUATION` | 409 | Operation requires an evaluated shipment |

## §4 Workflow and state machine (F9)

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_TRANSITION` | 409 | `(status, action, role)` is absent from the transition table |
| `TRANSITION_REDUNDANT` | 409 | The case is already in the target state |
| `CASE_TERMINAL` | 409 | The case is `CLEARED` and immutable |
| `ESCALATED_REQUIRES_SUPERVISOR` | 403 | A specialist acted on an escalated case |
| `HOLD_REQUIRES_RELEASE` | 403 | A specialist tried to clear from `ON_HOLD` |
| `APPROVAL_PENDING` | 409 | The action is unavailable while approval is outstanding |
| `ACTION_NOT_A_USER_ACTION` | 422 | An approval code posted to the actions endpoint, or vice versa |
| `JUSTIFICATION_REQUIRED` | 422 | Missing or under-length justification |
| `JUSTIFICATION_NOT_AUTHORED` | 422 | Justification is an exact copy of the AI rationale |
| `DOCUMENT_TYPE_NOT_REQUIRED` | 422 | Requested type is not in any open exception's missing information |
| `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` | 422 | Clearance proposed with unacknowledged open requests |
| `ASSIGNEE_INVALID` / `ESCALATION_TARGET_INVALID` | 422 | Target user is not an active user of the required role |
| `ASSIGNMENT_NOT_PERMITTED` | 403 | A specialist tried to assign work to another specialist |
| `EXCEPTION_SET_STALE` | 409 | `exception_ids` no longer matches the open set |

## §5 Documents (F10)

| Code | HTTP | Meaning |
|---|---|---|
| `REQUEST_NOT_OUTSTANDING` | 409 | Upload or cancel against a fulfilled/cancelled request |
| `DUPLICATE_DOCUMENT_REQUEST` | 409 | An outstanding request for the type already exists |
| `DOCUMENT_ALREADY_RECEIVED` | 409 | The requested type is already on the shipment |
| `FILE_REQUIRED` | 422 | No file part in the multipart body |
| `FILE_EMPTY` | 422 | Zero-byte upload |
| `FILE_EXTENSION_MISMATCH` | 422 | Extension inconsistent with the declared MIME type |
| `FILE_CONTENT_MISMATCH` | 422 | Magic bytes inconsistent with the declared MIME type |
| `PII_SUSPECTED` | 422 | Text content matched a PII deny-list pattern |
| `STORAGE_PATH_INVALID` | 500 | Computed path escapes the storage directory |
| `STORAGE_WRITE_FAILED` | 500 | Disk write failed; the transaction rolled back |

## §6 Approvals and governance (F11, F12)

| Code | HTTP | Meaning |
|---|---|---|
| `SELF_APPROVAL_BLOCKED` | 403 | The recommender attempted to decide their own recommendation (SoD-2) |
| `RECOMMENDATION_ALREADY_PENDING` | 409 | A pending recommendation already exists (G-REC) |
| `RECOMMENDATION_NOT_PENDING` | 409 | The referenced recommendation is no longer pending |
| `EVIDENCE_CHANGED_UNACKNOWLEDGED` | 409 | Evidence changed since the recommendation and was not acknowledged |
| `AUDIT_INCOMPLETE` | 500 | A required audit field was absent; the whole transaction aborted |
| `AUDIT_IMMUTABLE` | 405 | Update or delete attempted against an audit entry |
| `AUDIT_TIMESTAMP_NONMONOTONIC` | 500 | Draft timestamp precedes the previous entry |
| `AUDIT_SEQUENCE_CONFLICT` | 409 | Concurrent audit write; retry |
| `AUDIT_CHAIN_INVALID` | 200 with `valid:false` | Hash-chain verification failed at a named sequence number |
| `NOTIFICATION_TEMPLATE_MISSING` | 500 | No template registered for the event type |
| `NOTIFICATION_GENERATION_FAILED` | 500 | Notification could not be generated; the action rolled back |
| `NOTIFICATION_IMMUTABLE` | 405 | Update or delete attempted against a notification |

## §7 AI assistance (F7, F8)

The AI endpoints are **fallback-first**: provider unavailability is never surfaced as an error to the client, because the walkthrough must complete with the provider disabled. The conditions below produce `200` with a `FALLBACK_*` generation mode.

| Condition | Client-visible outcome | Generation mode |
|---|---|---|
| `CARGODEMO_AI_PROVIDER=none` | `200` with a complete fallback output | `FALLBACK_PROVIDER_DISABLED` |
| Provider exceeded the 10 s timeout | `200` | `FALLBACK_TIMEOUT` |
| Provider returned an HTTP error or rate limit | `200` | `FALLBACK_PROVIDER_ERROR` |
| Provider output unparseable or failed the grounding check | `200` | `FALLBACK_VALIDATION_FAILED` |

Genuine AI-route errors:

| Code | HTTP | Meaning |
|---|---|---|
| `FALLBACK_TEMPLATE_MISSING` | 500 | No fallback template for an `(exception_type, sub_reason)` pair |
| `RECOMMENDATION_ACTION_INVALID` | 500 | Derived action is not one of the five |
| `CONFIDENCE_BASIS_REQUIRED` | 500 | Confidence computed without a stated basis |
| `AI_UNAVAILABLE` | 503 | Reserved; **never returned by `/ai/summary` or `/ai/recommendation`** |

## §8 Startup and environment (F0, F14, F22)

These abort startup with exit code 1 rather than serving a degraded application.

| Code | Meaning |
|---|---|
| `DB_UNAVAILABLE` | Database file or directory unwritable |
| `MIGRATION_CHECKSUM_MISMATCH` | An applied migration's content changed |
| `SCHEMA_INTEGRITY_FAILED` | A required CHECK or append-only trigger is missing |
| `ROUTE_SCHEMA_MISSING` | A route lacks a request schema declaration |
| `ROUTE_PERMISSION_MISSING` | A route lacks an `allowed_roles` declaration |
| `PORT_IN_USE` | The deterministic port is occupied; no automatic fallback |
| `STORAGE_UNAVAILABLE` | Document storage directory unwritable |
| `CONFIRMATION_REQUIRED` | Reset requested without `confirm: true` (runtime, `422`) |

## §9 Error-handling principles

1. **Distinguish authority from state.** `403` means "you may not"; `409` means "not from here". A specialist acting on an escalated case gets `403 ESCALATED_REQUIRES_SUPERVISOR`, not a generic transition error, because the two demand different operator responses.
2. **Never silently absorb.** Redundant transitions, unknown filters, and unknown parameters are rejected, not ignored. Silent absorption is how an audit trail acquires a no-op decision or a rule quietly stops checking.
3. **Fail the whole transaction.** Any error during a mutating action rolls back the domain write, the audit entry, and the notification together. There is no state in which a case moved but its record did not.
4. **Fall back rather than fail** — but only for AI assistance, and only with the fallback labeled. Nothing else in the system degrades silently.
5. **Record denials.** Every `403` and every rejected transition writes an audit entry (F09a I10). A blocked self-approval attempt is exactly the kind of event an oversight reviewer wants to see.
6. **Never leak.** Error messages contain no API keys, no absolute paths outside the project, no SQL, and no stack traces. Diagnosis happens through `request_id` and the server log.
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
