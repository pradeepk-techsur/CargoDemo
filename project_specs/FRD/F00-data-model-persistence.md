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
