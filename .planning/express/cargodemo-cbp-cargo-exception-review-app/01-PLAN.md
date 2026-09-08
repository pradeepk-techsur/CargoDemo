---
phase: express-wave-1
plan: 01
type: execute
wave: 1
domain: database
depends_on: []
autonomous: true
files_modified:
  - package.json
  - tsconfig.json
  - vitest.config.ts
  - .gitignore
  - .env.example
  - src/server/config.ts
  - src/infra/db/connection.ts
  - src/infra/db/migrate.ts
  - src/infra/db/schemaSelfCheck.ts
  - src/infra/db/migrations/001_initial_schema.sql
  - src/infra/clock.ts
  - src/infra/ids.ts
  - src/infra/db/repositories/cargoRepository.ts
  - src/infra/db/repositories/caseRepository.ts
  - src/infra/db/repositories/ruleRepository.ts
  - src/infra/db/repositories/documentRepository.ts
  - src/infra/db/repositories/userRepository.ts
  - src/infra/db/index.ts
  - src/shared/types/db.ts
  - src/app/seedService.ts
  - fixtures/users.seed.json
  - fixtures/rules.seed.json
  - fixtures/cargo-entries.seed.json
  - scripts/migrate.ts
  - scripts/seed.ts
  - tests/integration/schema.migrate.test.ts
  - tests/integration/seed.test.ts
  - tests/integration/db-contract.test.ts

features:
  implements: ["F0", "F2"]
  depends_on: []
  enables: ["F4", "F5", "F3", "F9", "F17", "F18"]

must_haves:
  truths:
    - "A single command creates a SQLite database with the complete CargoDemo schema and exits 0."
    - "A second run of the migrate command applies nothing, changes nothing, and exits 0."
    - "A single command seeds 12 synthetic shipments; the exception queue has data before any UI exists."
    - "Running the seed command twice produces byte-identical row contents (deterministic IDs and timestamps)."
    - "SHP-2026-0007 exists with country_of_origin Malaysia, manufacturer country China, hts_code 8541.40, value $85,000.00 and CERTIFICATE_OF_ORIGIN not received."
    - "All seven case statuses and shipment data for all three exception types are present in the seeded set."
    - "A default login user (usr-cs-001, Marisol Reyes, CARGO_SPECIALIST) exists."
    - "The seven default rule rows exist as configuration data, readable by a later wave without code changes."
    - "Startup/self-check aborts non-zero if foreign keys are off, a governance CHECK is missing, or an append-only trigger is absent."
  artifacts:
    - path: "src/infra/db/migrations/001_initial_schema.sql"
      provides: "Verbatim Y0a + Y0b DDL, indexes and append-only triggers"
      contains: "CREATE TABLE cargo_entries"
    - path: "src/infra/db/migrate.ts"
      provides: "Forward-only, checksum-verified migration runner"
      exports: ["runMigrations"]
    - path: "src/infra/db/connection.ts"
      provides: "SQLite connection with foreign_keys=ON, WAL, busy_timeout"
      exports: ["openDb"]
    - path: "src/infra/db/schemaSelfCheck.ts"
      provides: "Blocking integrity assertions over CHECKs and triggers"
      exports: ["runSchemaSelfCheck"]
    - path: "src/app/seedService.ts"
      provides: "Deterministic, idempotent seed with coverage assertions"
      exports: ["runSeed", "SeedReport"]
    - path: "fixtures/cargo-entries.seed.json"
      provides: "The 12-shipment synthetic dataset including the canonical scenario"
      contains: "SHP-2026-0007"
    - path: "src/infra/db/index.ts"
      provides: "The public database module every later wave imports"
      exports: ["openDb", "runMigrations", "runSchemaSelfCheck", "runSeed", "repositories"]
  key_links:
    - from: "scripts/migrate.ts"
      to: "src/infra/db/migrations/001_initial_schema.sql"
      via: "runMigrations reads the numbered SQL file and records version+checksum"
      pattern: "migrations/001_initial_schema\\.sql"
    - from: "src/app/seedService.ts"
      to: "fixtures/cargo-entries.seed.json"
      via: "seed reads the fixture and upserts by deterministic id"
      pattern: "cargo-entries\\.seed\\.json"
    - from: "src/app/seedService.ts"
      to: "src/infra/clock.ts"
      via: "SeedClock fixed instant 2026-09-01T08:00:00.000Z drives every seeded timestamp"
      pattern: "SeedClock"

integration_contracts:
  requires: []          # wave 1 — nothing upstream
  provides:
    - artifact: "src/infra/db/migrations/001_initial_schema.sql"
      exports:
        - "table cargo_entries"
        - "table documents"
        - "table rules"
        - "table evaluations"
        - "table exceptions"
        - "table evidence"
        - "table cases"
        - "table case_actions"
        - "table users"
        - "table schema_migrations"
        - "tables (schema only, no behaviour in this build): sessions, document_requests, recommendations, approvals, audit_entries, notifications, notification_reads, ai_outputs, ingestion_batches, idempotency_keys, request_log"
      shape: |
        -- Column names and types below are BINDING. Waves 2-5 MUST use these exact
        -- names. Full verbatim DDL (with every CHECK and index) is in
        -- project_specs/FRD/Y0a-schema-core.md §1-§9 and Y0b-schema-workflow-audit.md §1-§9.

        cargo_entries(
          id TEXT PK, shipment_id TEXT UNIQUE NOT NULL, importer_name TEXT NOT NULL,
          carrier_name TEXT NOT NULL, product_description TEXT NOT NULL,
          hts_code TEXT, hts_code_normalized TEXT,
          country_of_origin TEXT NOT NULL, country_of_origin_iso2 TEXT,
          manufacturer_name TEXT NOT NULL, manufacturer_address_line1 TEXT NOT NULL,
          manufacturer_address_city TEXT, manufacturer_address_region TEXT,
          manufacturer_address_postal_code TEXT, manufacturer_address_country TEXT NOT NULL,
          manufacturer_address_country_iso2 TEXT,
          shipment_value_cents INTEGER NOT NULL, entry_date TEXT NOT NULL,
          declared_priority_hint TEXT, ingestion_source TEXT NOT NULL,
          ingestion_batch_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)

        documents(
          id TEXT PK, cargo_entry_id TEXT NOT NULL, document_type TEXT NOT NULL,
          status TEXT NOT NULL /* RECEIVED|NOT_RECEIVED */, filename TEXT, storage_path TEXT,
          content_hash TEXT, file_size_bytes INTEGER, mime_type TEXT,
          provenance TEXT NOT NULL /* SEEDED|INGESTED|SIMULATED_UPLOAD */,
          stated_country TEXT, note TEXT, superseded INTEGER NOT NULL DEFAULT 0,
          duplicate_of_document_id TEXT, source_request_id TEXT, uploaded_by_user_id TEXT,
          received_at TEXT, created_at TEXT NOT NULL)

        rules(
          id TEXT PK /* rule-<slug> */, name TEXT NOT NULL, name_lower TEXT NOT NULL UNIQUE,
          exception_type TEXT NOT NULL /* MISSING_REQUIRED_DOCUMENT|INVALID_HTS_CODE|CONFLICTING_COUNTRY_OF_ORIGIN */,
          description TEXT NOT NULL, policy_reference TEXT NOT NULL,
          severity TEXT NOT NULL /* LOW|MEDIUM|HIGH|CRITICAL */, priority_mapping TEXT,
          conditions_json TEXT NOT NULL DEFAULT '{}', params_json TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
          created_by_user_id TEXT, updated_by_user_id TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL)

        evaluations(
          id TEXT PK, cargo_entry_id TEXT NOT NULL, case_id TEXT NOT NULL,
          version INTEGER NOT NULL, trigger TEXT NOT NULL /* INGESTION|MANUAL_REVALIDATION|DOCUMENT_UPLOAD|RULE_CHANGE|SEED */,
          rule_set_fingerprint TEXT NOT NULL, skipped_rules_json TEXT NOT NULL DEFAULT '[]',
          invalid_rules_json TEXT NOT NULL DEFAULT '[]', finding_count INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER, actor_kind TEXT NOT NULL /* HUMAN|SYSTEM */, actor_user_id TEXT,
          evaluated_at TEXT NOT NULL, UNIQUE(cargo_entry_id, version))

        exceptions(
          id TEXT PK, evaluation_id TEXT NOT NULL, cargo_entry_id TEXT NOT NULL,
          case_id TEXT NOT NULL, rule_id TEXT NOT NULL, rule_version INTEGER NOT NULL,
          exception_type TEXT NOT NULL, sub_reason TEXT NOT NULL, severity TEXT NOT NULL,
          status TEXT NOT NULL /* OPEN|RESOLVED_BY_REVALIDATION|CLEARED_BY_DECISION|SUPERSEDED_BY_EVALUATION */,
          assertion TEXT NOT NULL, missing_information_json TEXT NOT NULL DEFAULT '[]',
          first_detected_evaluation_id TEXT NOT NULL, opened_at TEXT NOT NULL,
          resolved_at TEXT, resolved_by_evaluation_id TEXT, resolution_reason TEXT,
          superseded_by_exception_id TEXT, cleared_by_approval_id TEXT, created_at TEXT NOT NULL)

        evidence(
          id TEXT PK, exception_id TEXT NOT NULL, kind TEXT NOT NULL /* OBSERVED|COMPARISON|MISSING|CONTEXT */,
          field_path TEXT NOT NULL, raw_value TEXT, normalized_value TEXT,
          comparison_field_path TEXT, comparison_raw_value TEXT, comparison_normalized_value TEXT,
          expected TEXT, observed TEXT, assertion TEXT, truncated INTEGER NOT NULL DEFAULT 0,
          display_order INTEGER NOT NULL, created_at TEXT NOT NULL)

        cases(
          id TEXT PK, cargo_entry_id TEXT NOT NULL UNIQUE, shipment_id TEXT NOT NULL,
          status TEXT NOT NULL /* NEW|IN_REVIEW|AWAITING_INFORMATION|ON_HOLD|ESCALATED|PENDING_APPROVAL|CLEARED */,
          priority TEXT NOT NULL /* LOW|MEDIUM|HIGH|CRITICAL */,
          priority_basis_json TEXT NOT NULL DEFAULT '[]', queued INTEGER NOT NULL DEFAULT 0,
          current_evaluation_id TEXT, open_exception_count INTEGER NOT NULL DEFAULT 0,
          exception_type_summary TEXT NOT NULL DEFAULT '', assigned_to_user_id TEXT,
          hold_reason TEXT, hold_reason_detail TEXT, hold_placed_by_user_id TEXT, hold_placed_at TEXT,
          escalation_reason TEXT, escalated_by_user_id TEXT, escalated_to_user_id TEXT, escalated_at TEXT,
          approving_official_user_id TEXT, approving_official_name TEXT, approving_official_role TEXT,
          cleared_at TEXT, last_action_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL)))

        case_actions(
          id TEXT PK, case_id TEXT NOT NULL, cargo_entry_id TEXT NOT NULL,
          action TEXT NOT NULL /* REQUEST_INFORMATION|SEND_FOR_SPECIALIST_REVIEW|CLEAR_EXCEPTION|PLACE_ON_HOLD|ESCALATE_TO_SUPERVISOR */,
          status_before TEXT NOT NULL, status_after TEXT NOT NULL,
          justification TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
          parameters_json TEXT NOT NULL DEFAULT '{}', evaluation_id TEXT,
          actor_user_id TEXT NOT NULL, actor_name TEXT NOT NULL,
          actor_role TEXT NOT NULL /* CARGO_SPECIALIST|SUPERVISOR */,
          audit_entry_id TEXT NOT NULL, idempotency_key TEXT, occurred_at TEXT NOT NULL)

        users(
          id TEXT PK, name TEXT NOT NULL, role TEXT NOT NULL /* CARGO_SPECIALIST|SUPERVISOR|SYSTEM_ADMINISTRATOR */,
          active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
      verify: "grep -q 'CREATE TABLE cargo_entries' src/infra/db/migrations/001_initial_schema.sql && grep -q 'manufacturer_address_country_iso2' src/infra/db/migrations/001_initial_schema.sql && grep -q 'CREATE TABLE evidence' src/infra/db/migrations/001_initial_schema.sql && grep -q 'CREATE TABLE case_actions' src/infra/db/migrations/001_initial_schema.sql && grep -q \"status <> 'CLEARED'\" src/infra/db/migrations/001_initial_schema.sql && echo CONTRACT_OK"

    - artifact: "src/infra/db/index.ts"
      exports: ["openDb", "runMigrations", "runSchemaSelfCheck", "runSeed", "repositories"]
      shape: |
        // The ONLY database entrypoint later waves import. Import path: `src/infra/db`
        export function openDb(path?: string): Database;              // foreign_keys=ON, WAL, busy_timeout=5000
        export function runMigrations(db: Database): { applied: number[]; schemaVersion: number };
        export function runSchemaSelfCheck(db: Database): void;       // throws SCHEMA_INTEGRITY_FAILED
        export function runSeed(db: Database, opts: { mode: 'SEED_IF_EMPTY' | 'FORCE_RESEED' }): SeedReport;
        export const repositories: {
          cargo: CargoRepository; cases: CaseRepository; rules: RuleRepository;
          documents: DocumentRepository; users: UserRepository;
        };
        // Row types for every table above are exported from `src/shared/types/db.ts`.
      verify: "grep -qE 'export (function|const) openDb' src/infra/db/index.ts src/infra/db/connection.ts && grep -q 'runMigrations' src/infra/db/index.ts && grep -q 'runSeed' src/infra/db/index.ts && grep -q 'repositories' src/infra/db/index.ts && echo CONTRACT_OK"

    - artifact: "package.json scripts (migration + seed entrypoints)"
      exports: ["npm run migrate", "npm run seed", "npm run seed:reset", "npm test"]
      shape: |
        "migrate":    "tsx scripts/migrate.ts"     # migrate + schema self-check, exit 1 on failure
        "seed":       "tsx scripts/seed.ts"        # SEED_IF_EMPTY, idempotent, prints SeedReport
        "seed:reset": "tsx scripts/seed.ts --force-reseed"
        "test":       "vitest run"
        # Wave 5 composes the runtime as: npm run migrate && npm run seed && <serve>
      verify: "node -e \"const s=require('./package.json').scripts; if(!s.migrate||!s.seed||!s['seed:reset']||!s.test) process.exit(1)\" && echo CONTRACT_OK"

    - artifact: "fixtures/cargo-entries.seed.json + fixtures/rules.seed.json + fixtures/users.seed.json"
      exports:
        - "12 shipments SHP-2026-0001..SHP-2026-0012 with deterministic ids ent-00NN / case-00NN"
        - "7 rule rows: rule-doc-baseline, rule-doc-highvalue-coo, rule-doc-solar-cert(disabled), rule-hts-completeness, rule-hts-known-chapter(disabled), rule-origin-manufacturer, rule-origin-certificate(disabled)"
        - "5 users: usr-cs-001, usr-cs-002, usr-sup-001, usr-sup-002, usr-adm-001"
        - "per-shipment declared field `expected_exception_types` — the contract wave 2 detection must reproduce"
      shape: |
        # Seed clock (fixed): 2026-09-01T08:00:00.000Z. Every seeded timestamp is a fixed offset from it.
        # Canonical scenario, BINDING field-for-field (FRD F02 §Validation):
        #   shipment_id "SHP-2026-0007", product_description contains "solar",
        #   country_of_origin "Malaysia" (iso2 "MY"),
        #   manufacturer_address_country "China" (iso2 "CN"),
        #   hts_code "8541.40" (hts_code_normalized "854140"),
        #   shipment_value_cents 8500000,
        #   documents: CERTIFICATE_OF_ORIGIN status NOT_RECEIVED,
        #   expected_exception_types: [MISSING_REQUIRED_DOCUMENT, INVALID_HTS_CODE, CONFLICTING_COUNTRY_OF_ORIGIN]
        # Case status coverage (all seven): NEW(0007,0001,0011) IN_REVIEW(0003,0010)
        #   AWAITING_INFORMATION(0002,0012) ON_HOLD(0004) ESCALATED(0005)
        #   PENDING_APPROVAL(0006,0008) CLEARED(0009)
        # SHP-2026-0011 is the clean shipment: 10-digit HTS, matching origin, all baseline
        #   documents RECEIVED, value below 50000 USD, expected_exception_types [] and queued=0.
      verify: "node -e \"const e=require('./fixtures/cargo-entries.seed.json');const a=Array.isArray(e)?e:e.shipments;if(a.length<10||a.length>15)process.exit(1);const c=a.find(x=>x.shipment_id==='SHP-2026-0007');if(!c||c.country_of_origin!=='Malaysia'||c.manufacturer_address_country!=='China'||c.hts_code!=='8541.40'||c.shipment_value_cents!==8500000)process.exit(1);const st=new Set(a.map(x=>x.case_status));for(const s of ['NEW','IN_REVIEW','AWAITING_INFORMATION','ON_HOLD','ESCALATED','PENDING_APPROVAL','CLEARED'])if(!st.has(s))process.exit(1)\" && echo CONTRACT_OK"

    - artifact: "seed-time authority boundary for wave 2"
      exports:
        - "seedService accepts an optional `evaluate` hook: (db, cargoEntryId) => void"
        - "cases.priority / queued / open_exception_count / exception_type_summary / current_evaluation_id are seeded from the fixture's declared expectation and are recomputed authoritatively by wave 2 detection"
      shape: |
        // src/app/seedService.ts
        export interface SeedOptions {
          mode: 'SEED_IF_EMPTY' | 'FORCE_RESEED';
          // Wave 2 (F4/F5) passes its evaluator here so seeded shipments get
          // evaluations/exceptions/evidence rows. When omitted (wave 1), the seed
          // writes NO evaluations, exceptions or evidence rows and says so in SeedReport.
          evaluate?: (db: Database, cargoEntryId: string) => void;
        }
      verify: "grep -q 'evaluate?:' src/app/seedService.ts && grep -q 'FORCE_RESEED' src/app/seedService.ts && echo CONTRACT_OK"
---

<objective>
Stand up the persistence foundation for CargoDemo: the complete SQLite schema with its
migration runner and blocking integrity self-check (F0), and the deterministic, idempotent
synthetic seed of 12 shipments — including the canonical solar-panel scenario SHP-2026-0007,
the seven default rule rows as configuration data, and the five seeded users (F2).

Purpose: every later wave reads and writes through this schema. Waves 2-5 are forbidden from
inventing column names, so the column names this plan ships ARE the contract.
Output: a repo that can run `npm run migrate && npm run seed` in a fresh checkout and end up
with a database whose exception queue has real work in it.
</objective>

<feature_dependencies>
Implements: F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset
Depends on: None (wave 1)
Enables: F4: Configurable Business Rule Engine, F5: Exception Detection & Evidence Capture, F3: Backend HTTP API, F9: Exception Case Workflow & User Actions, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
</feature_dependencies>

<context>
@.planning/PROJECT.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/SCOPE-DECISION.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/WAVE-SCHEDULE.md
@project_specs/FRD/Y0a-schema-core.md
@project_specs/FRD/Y0b-schema-workflow-audit.md
@project_specs/FRD/F00-data-model-persistence.md
@project_specs/FRD/F02-synthetic-seed-dataset.md
@project_specs/FRD/F04-rule-engine.md
@project_specs/TechArch/02a-data-model-core.md
@project_specs/TechArch/02b-data-model-workflow-audit.md
@project_specs/TechArch/05-tech-stack.md
</context>

<scope_boundary>
Read this before writing code. It is the difference between a correct wave and a rejected one.

**Schema breadth is IN scope; behaviour on the wide part is not.** The F0 DDL in
`Y0a`/`Y0b` defines tables that only excluded features would use — approval chains,
audit records, notifications, AI outputs, sessions, document requests. Create every one of
those tables exactly as specified: a partially-created schema is a worse artifact than the
specified one, and the governance CHECKs and append-only triggers on them are part of F0.
What you must NOT do is build any behaviour, endpoint, seed content or UI on them.

Concretely, this plan writes rows into ONLY these tables:
`users`, `rules`, `cargo_entries`, `documents`, `cases`.
It writes **zero** rows into `audit_entries`, `notifications`, `notification_reads`,
`approvals`, `recommendations`, `document_requests`, `ai_outputs`, `sessions`,
`case_actions`, `ingestion_batches`, `idempotency_keys`, `request_log`.

**Recorded deviations from FRD F02, and why.** F02 §Process steps 6-9 require the seed to
reach each non-NEW status by driving the real workflow service, to write a full audit chain
for the pre-cleared shipment, and to stage an upload-ready document fixture. All three
depend on features excluded from this build by the recorded scope decision, so:

- Case statuses are seeded **declaratively** from the fixture's `case_status` field rather
  than driven through a state machine, because the workflow state machine arrives in wave 3.
- No audit or notification rows are written: the audit-record and notification features are
  deferred, so writing rows there would be behaviour on a deferred feature.
- `SHP-2026-0009` is seeded `CLEARED` with `approving_official_user_id`,
  `approving_official_name`, `approving_official_role` and `cleared_at` populated from
  `usr-sup-001`, purely to satisfy the `cases` clearance CHECK constraint. The
  specialist-to-supervisor approval chain itself is out of scope — no `approvals` or
  `recommendations` row is created.
- No document fixture binaries are copied to disk and no upload-ready fixture is staged;
  document upload and file serving are out of scope. Seeded `documents` rows are metadata
  only (a `RECEIVED` row still sets `filename`, as the schema CHECK requires).
- `evaluations`, `exceptions` and `evidence` stay **empty** in this wave: producing them is
  the rule engine (F4) and detection (F5) work of wave 2. The seed exposes an optional
  `evaluate` hook (see `integration_contracts.provides`) that wave 2 fills in.

**Infrastructure:** SQLite is file-backed and needs no server process, so this wave ships
**no** `docker-compose.yml` and no datastore service. Do not create one. Wave 5 owns the
single-command boot.
</scope_boundary>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold the project and ship the complete schema with a checksum-verified migration runner</name>
  <files>
package.json
tsconfig.json
vitest.config.ts
.gitignore
.env.example
src/server/config.ts
src/infra/db/connection.ts
src/infra/db/migrate.ts
src/infra/db/schemaSelfCheck.ts
src/infra/db/migrations/001_initial_schema.sql
scripts/migrate.ts
tests/integration/schema.migrate.test.ts
  </files>

  <feature_dependencies>
Implements: F0: Cargo Entry Data Model & Persistence (schema, migrations, integrity self-check)
Depends on: None (wave 1)
Enables: F2: Synthetic Seed Dataset (Task 2 of this plan), F4, F5, F3, F9
  </feature_dependencies>

  <action>
**1. Scaffold (repo is empty apart from specs).** Per TechArch `05-tech-stack` §5.2 and
`01-components` §1.1:

- `package.json`: `"type": "module"`, `"private": true`, node engine `>=20`.
  - dependencies: `better-sqlite3` `^11.0.0`
  - devDependencies: `typescript` `~5.4`, `tsx` `^4`, `vitest` `^1`,
    `@types/node` `^20`, `@types/better-sqlite3` `^7`
  - scripts: `"migrate": "tsx scripts/migrate.ts"`, `"typecheck": "tsc --noEmit"`,
    `"test": "vitest run"` (the seed scripts are added in Task 2).
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`,
  `module: ES2022`, `moduleResolution: bundler`, `resolveJsonModule: true`,
  `include: ["src", "scripts", "tests"]`.
- `vitest.config.ts`: node environment, `include: ["tests/**/*.test.ts"]`, no globals needed.
- `.gitignore`: `node_modules/`, `data/`, `dist/`, `.env`.
- `.env.example`: every variable from TechArch §5.5 with empty or default values —
  `CARGODEMO_HOST=0.0.0.0`, `CARGODEMO_PORT=3000`, `CARGODEMO_DB_PATH=./data/cargodemo.db`,
  `CARGODEMO_DOC_STORAGE_DIR=./data/documents`, `CARGODEMO_SEED_ON_EMPTY=true`,
  `CARGODEMO_SEED_CLOCK=2026-09-01T08:00:00.000Z`, `CARGODEMO_AI_PROVIDER=none`,
  `CARGODEMO_LOG_LEVEL=info`. No secret values.
- `src/server/config.ts`: parse and validate those variables, **fail fast** — an invalid
  value throws rather than defaulting silently (TechArch §5.5). Export a typed `config`
  object plus a `loadConfig(env)` function so tests can inject.

**2. `src/infra/db/connection.ts` — `openDb(path?)`.** Opens better-sqlite3 at
`path ?? config.CARGODEMO_DB_PATH`, creating parent directories. On EVERY connection set,
in this order: `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`,
`PRAGMA busy_timeout = 5000` (TechArch §2.1 — `foreign_keys` is off by default in SQLite
and `ON DELETE RESTRICT` is inert without it). Unwritable path → throw `DB_UNAVAILABLE`
with the path in the message.

**3. `src/infra/db/migrations/001_initial_schema.sql` — the DDL.**

Copy the DDL **verbatim, character-for-character**, in this order:

1. `project_specs/FRD/Y0a-schema-core.md` §1 through §9 — `schema_migrations`,
   `cargo_entries`, `documents`, `document_requests`, `rules`, `evaluations`,
   `exceptions`, `evidence`, `ingestion_batches`, including every `CHECK`, every
   `CREATE INDEX` and every `CREATE UNIQUE INDEX ... WHERE ...` partial index.
2. `project_specs/FRD/Y0b-schema-workflow-audit.md` §1 through §9 — `users`, `sessions`,
   `cases`, `case_actions`, `recommendations`, `approvals`, `audit_entries` (plus the two
   append-only triggers `audit_entries_no_delete` and `audit_entries_no_update` exactly as
   written, `IS` comparisons and all), `notifications` (plus
   `notifications_no_delete`), `notification_reads`, `ai_outputs`, `idempotency_keys`,
   `request_log`.

Do **not** rename a column, relax a `CHECK`, drop an index, reorder columns, "simplify" the
`audit_entries_no_update` trigger, or convert a partial index into a full one. Those
constraints are the product's governance claims expressed in SQL. Two consistency notes,
both resolved in favour of the FRD text you are copying: `Y0a` defines
`cargo_entries.shipment_value_cents` (the FRD F0 §Validation prose calls the API-facing
projection `shipment_value_usd` — the column is `_cents`), and `recommendations.concurrence`
takes the three-value enum in `Y0b` §4 (TechArch `02b` §2b.4 lists a fourth value
`NOT_APPLICABLE`; the FRD DDL is the authority here and this build writes no
`recommendations` rows at all, so the difference is inert — record it in the summary).

Because tables in `Y0a` reference tables defined in `Y0b` (`cases`, `users`, `approvals`)
and vice-versa, keep everything in this single migration file: SQLite resolves foreign-key
targets at DML time, not DDL time, so one file with this ordering is correct.

**4. `src/infra/db/migrate.ts` — `runMigrations(db)`.** Per FRD F0 §Process steps 2-3 and
§Error States:

- Discover migrations as an ordered list of `{ version, name, sql }` (read the `.sql` files
  from `src/infra/db/migrations/` sorted by numeric prefix; use `fs.readFileSync` at
  runtime, not a bundler import, so the file is the artifact).
- Compare against the `schema_migrations` table. Create that table first if absent (its DDL
  is the first statement of `001`, so bootstrap by executing `001` inside its transaction
  when `schema_migrations` does not exist).
- Apply each unapplied migration inside **one transaction per migration**, then insert
  `{ version, name, checksum, applied_at }` where `checksum` is the SHA-256 hex of the file
  contents via `node:crypto`.
- If an already-applied version's checksum differs from the file on disk, throw
  `MIGRATION_CHECKSUM_MISMATCH: Migration {version} has changed after being applied`.
- Forward-only: no `down`, no rollback path.
- Return `{ applied: number[], schemaVersion: number }`.

**5. `src/infra/db/schemaSelfCheck.ts` — `runSchemaSelfCheck(db)`.** Blocking assertions
(FRD F0 §Process step 4, TechArch §2.1). Throw `SCHEMA_INTEGRITY_FAILED: {detail}` if any
fails:

- `PRAGMA foreign_keys` returns 1.
- All 21 tables exist (query `sqlite_master`).
- The four governance CHECK constraints are present — assert by reading
  `sqlite_master.sql` for the table and matching: `cases` contains `status <> 'CLEARED'`;
  `approvals` contains `approver_user_id <> recommended_by_user_id` and
  `approver_role = 'SUPERVISOR'`; `notifications` contains `transmitted = 0`.
- The three append-only triggers exist: `audit_entries_no_delete`,
  `audit_entries_no_update`, `notifications_no_delete`
  (`SELECT name FROM sqlite_master WHERE type='trigger'`).
- `exceptions.exception_type` accepts exactly the three canonical codes — assert the CHECK
  text lists `MISSING_REQUIRED_DOCUMENT`, `INVALID_HTS_CODE`,
  `CONFLICTING_COUNTRY_OF_ORIGIN` and nothing else.

**6. `scripts/migrate.ts`.** Load config → `openDb()` → `runMigrations` →
`runSchemaSelfCheck` → print one readiness line
(`schema_version=N applied=[...] foreign_keys=on triggers=3`) → exit 0. Any failure: print
the error code and message to stderr and `process.exit(1)`. Never serve or seed from here.

**7. `tests/integration/schema.migrate.test.ts` — the boot test.** Vitest, temp database
file per test (`fs.mkdtempSync`), no network. This is the cheapest, highest-yield test in
the wave: it converts a broken schema into a red test minutes after it is written.

- migrate on a fresh temp DB → exits without throwing; `schema_migrations` has one row with
  a non-empty checksum; `runSchemaSelfCheck` passes.
- migrate twice → second call reports `applied: []` and the row count in
  `schema_migrations` is unchanged (idempotent).
- tamper: after migrating, `UPDATE schema_migrations SET checksum='deadbeef'` then migrate
  again → throws `MIGRATION_CHECKSUM_MISMATCH`.
- all 21 tables and the 3 triggers exist.
- governance constraints actually bite (these assert the CHECKs, not just their text):
  inserting a `cases` row with `status='CLEARED'` and null `approving_official_user_id`
  throws; inserting a `case_actions` row with `justification='short'` throws; inserting a
  `notifications` row with `transmitted=1` throws.
- foreign keys bite: inserting a `documents` row with a `cargo_entry_id` that does not
  exist throws.
  </action>

  <verify>
npm install 2>&1 | tail -3 && npm run typecheck && npm run migrate && npm run migrate && npx vitest run tests/integration/schema.migrate.test.ts --reporter=list 2>&1 | tail -20 && echo TASK1_OK
  </verify>

  <done>
- `npm install`, `npm run typecheck` and `npm run migrate` all exit 0 on a fresh checkout.
- A second `npm run migrate` applies nothing and still exits 0.
- `tests/integration/schema.migrate.test.ts` passes with 0 failing and 0 skipped.
- All 21 tables from `Y0a` §1-§9 and `Y0b` §1-§9 exist, plus the 3 append-only triggers.
- The four governance CHECK constraints and foreign-key enforcement are proven by tests
  that assert a violating INSERT throws — not merely that the constraint text is present.
- `001_initial_schema.sql` is a verbatim copy of the FRD DDL: no renamed column, no relaxed
  CHECK, no dropped or widened index.
  </done>
</task>

<task type="auto">
  <name>Task 2: Ship the deterministic, idempotent synthetic seed — 12 shipments, the canonical scenario, 7 rule rows, 5 users</name>
  <files>
src/infra/clock.ts
src/infra/ids.ts
fixtures/users.seed.json
fixtures/rules.seed.json
fixtures/cargo-entries.seed.json
src/app/seedService.ts
scripts/seed.ts
tests/integration/seed.test.ts
  </files>

  <feature_dependencies>
Implements: F2: Synthetic Seed Dataset
Depends on: F0: Cargo Entry Data Model & Persistence (Task 1 of this plan)
Enables: F4: Configurable Business Rule Engine, F5: Exception Detection & Evidence Capture, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
  </feature_dependencies>

  <action>
**1. `src/infra/clock.ts` and `src/infra/ids.ts`** (TechArch `01-components` §1.3.4).
`SystemClock` (real `Date`) and `SeedClock` — a fixed base instant from
`CARGODEMO_SEED_CLOCK`, default `2026-09-01T08:00:00.000Z`, with a `plusMinutes(n)` /
monotonic `step()` helper so every seeded timestamp is a fixed offset from the base and is
formatted ISO-8601 UTC with milliseconds. `ids.ts`: `UuidGenerator` and
`DeterministicIdGenerator` (prefix + zero-padded counter). Seeding uses `SeedClock` +
`DeterministicIdGenerator` exclusively — this is what makes two seed runs byte-identical.

**2. `fixtures/users.seed.json` — 5 users, verbatim from FRD F02 §Seeded users.**

| id | name | role |
|---|---|---|
| `usr-cs-001` | Marisol Reyes | `CARGO_SPECIALIST` |
| `usr-cs-002` | Marcus Hale | `CARGO_SPECIALIST` |
| `usr-sup-001` | Dwayne Okafor | `SUPERVISOR` |
| `usr-sup-002` | Ronald Pike | `SUPERVISOR` |
| `usr-adm-001` | Priya Raghavan | `SYSTEM_ADMINISTRATOR` |

`usr-cs-001` is the default login user for the rest of the build.

**3. `fixtures/rules.seed.json` — the 7 default rules, verbatim from FRD F04 §7,** with
`params_json` / `conditions_json` keys taken exactly from F04 §4 (HTS), §5 (origin) and
§6 (documents). `version: 1`, `name_lower` = lowercased `name`. Fixed IDs:

| id | exception_type | severity | enabled | conditions | params |
|---|---|---|---|---|---|
| `rule-doc-baseline` | `MISSING_REQUIRED_DOCUMENT` | `MEDIUM` | 1 | `{}` | `required_document_types: ["COMMERCIAL_INVOICE","PACKING_LIST","BILL_OF_LADING"]`, `match_mode: "ALL"`, `accept_statuses: ["RECEIVED"]`, `require_file_present: true`, `ignore_superseded: true` |
| `rule-doc-highvalue-coo` | `MISSING_REQUIRED_DOCUMENT` | `HIGH` | 1 | `min_shipment_value_usd: 50000` | `required_document_types: ["CERTIFICATE_OF_ORIGIN"]`, `match_mode: "ALL"`, `accept_statuses: ["RECEIVED"]`, `require_file_present: true`, `ignore_superseded: true` |
| `rule-doc-solar-cert` | `MISSING_REQUIRED_DOCUMENT` | `HIGH` | **0** | `commodity_keywords: ["solar","photovoltaic"]` | `required_document_types: ["CERTIFICATE_OF_ORIGIN"]`, rest as above |
| `rule-hts-completeness` | `INVALID_HTS_CODE` | `HIGH` | 1 | `{}` | `expected_digit_count: 10`, `min_digit_count: 6`, `allowed_separators: [".","-"," "]`, `allow_partial: false`, `treat_missing_as_exception: true`, `check_known_codes: false`, `known_code_prefix_length: 6`, `known_codes: []`, `placeholder_characters: ["X","x","*","?","#"]` |
| `rule-hts-known-chapter` | `INVALID_HTS_CODE` | `MEDIUM` | **0** | `{}` | as above but `check_known_codes: true`, `known_code_prefix_length: 4`, `known_codes: ["8541","6109","8507","6907","8708","8714","9405","7318","0306","3901","9403","2942"]` |
| `rule-origin-manufacturer` | `CONFLICTING_COUNTRY_OF_ORIGIN` | `CRITICAL` | 1 | `{}` | `declared_field: "country_of_origin"`, `comparison_fields: ["manufacturer.address.country"]`, `treat_missing_declared_as_conflict: true`, `treat_missing_comparison_as_conflict: false`, `allowed_pairs: []`, `case_sensitive: false` |
| `rule-origin-certificate` | `CONFLICTING_COUNTRY_OF_ORIGIN` | `HIGH` | **0** | `{}` | as above but `comparison_fields: ["documents.CERTIFICATE_OF_ORIGIN.stated_country"]` |

`policy_reference` values verbatim from F04 §7 (`19 CFR 141.81`, `19 CFR 102.0`,
`19 CFR 102.0`, `19 CFR 152.11`, `HTSUS General Rules`, `19 CFR 134.1`, `19 CFR 134.1`).
`description` 10-500 chars each. `rule-doc-solar-cert` is seeded **disabled** on purpose so
the canonical shipment carries exactly three exceptions (F04 §7 note) — its three come from
`rule-doc-highvalue-coo`, `rule-hts-completeness` and `rule-origin-manufacturer`.

**4. `fixtures/cargo-entries.seed.json` — 12 shipments.** Follow the table in FRD F02
§Seeded shipments exactly for shipment id, commodity, expected exceptions and status. Each
entry carries: every `cargo_entries` column value, a `documents[]` array, a `case_status`,
a `declared_priority` and an `expected_exception_types[]` array (the last is the contract
wave 2's detection must reproduce, and is asserted by the seed's own coverage check).
Deterministic ids: `ent-00NN` for the entry, `case-00NN` for the case,
`doc-00NN-<document_type_lowercased>` for documents.

`SHP-2026-0007` is **BINDING, field-for-field** (F02 §Validation):
`product_description` contains "Solar", `country_of_origin: "Malaysia"`,
`country_of_origin_iso2: "MY"`, `manufacturer_address_country: "China"`,
`manufacturer_address_country_iso2: "CN"`, `hts_code: "8541.40"`,
`hts_code_normalized: "854140"`, `shipment_value_cents: 8500000`, a
`CERTIFICATE_OF_ORIGIN` document row with `status: "NOT_RECEIVED"` (and
`COMMERCIAL_INVOICE`, `PACKING_LIST`, `BILL_OF_LADING` all `RECEIVED`), `case_status: "NEW"`,
`expected_exception_types` = all three types.

The other 11 shipments must be constructed so the declared expectations are actually
reachable by wave 2's evaluators — this is the part that silently breaks a later wave if
done carelessly:

- expecting `INVALID_HTS_CODE` → `hts_code` normalizes to fewer than 10 digits
  (e.g. `"6109.10"`), otherwise a complete 10-digit code.
- expecting `CONFLICTING_COUNTRY_OF_ORIGIN` → `country_of_origin_iso2` differs from
  `manufacturer_address_country_iso2`, otherwise they match.
- expecting `MISSING_REQUIRED_DOCUMENT` → at least one of the three baseline types is
  `NOT_RECEIVED`/absent, or `shipment_value_cents >= 5000000` with `CERTIFICATE_OF_ORIGIN`
  not received.
- `SHP-2026-0011` is the clean shipment: complete 10-digit HTS, matching origin ISO codes,
  all three baseline documents `RECEIVED` with filenames, `shipment_value_cents` below
  `5000000`, `expected_exception_types: []`, `case_status: "NEW"`, `queued: 0`. It proves
  clean entries stay off the queue.
- `SHP-2026-0012` declares `CRITICAL` priority; `SHP-2026-0009` is the single `CLEARED`
  shipment (see the clearance note below).

Statuses must cover all seven: `NEW` (0007, 0001, 0011), `IN_REVIEW` (0003, 0010),
`AWAITING_INFORMATION` (0002, 0012), `ON_HOLD` (0004), `ESCALATED` (0005),
`PENDING_APPROVAL` (0006, 0008), `CLEARED` (0009).

All names, companies and addresses are invented. No email addresses, phone numbers or
SSN-shaped digit strings anywhere in the fixtures.

**5. `src/app/seedService.ts` — `runSeed(db, opts)`.**

- `opts.mode`: `SEED_IF_EMPTY` (skip with a report when `cargo_entries` is non-empty) or
  `FORCE_RESEED` (delete all rows in the `Y0b` §10 reverse-dependency order inside one
  transaction, then reseed; in this build the audit and notification tables are empty, so
  the trigger drop/recreate dance is not needed — but do the deletes in that documented
  order so wave-5 reset behaves).
- `opts.evaluate?`: the optional hook declared in `integration_contracts.provides`. Wave 1
  never passes it, so this wave writes **no** `evaluations`, `exceptions` or `evidence`
  rows; when a later wave passes it, the seed calls it once per entry after the case row is
  written.
- Insert order: `users` → `rules` → `cargo_entries` → `documents` → `cases`.
- **Idempotency:** every insert is an upsert on the deterministic primary key —
  `INSERT INTO t (...) VALUES (...) ON CONFLICT(id) DO UPDATE SET <every non-id column>`.
  Re-running `npm run seed` therefore never duplicates a row and never changes one either,
  because both the ids and the timestamps come from fixed sources. Wrap the whole seed in a
  single `db.transaction(...)()`.
- `cases` rows: `status` from `case_status`, `priority` from `declared_priority`,
  `queued = expected_exception_types.length > 0 ? 1 : 0`,
  `open_exception_count = expected_exception_types.length`,
  `exception_type_summary` = sorted distinct expected types comma-joined,
  `current_evaluation_id = NULL`, `priority_basis_json = '[]'`. Add a comment stating that
  wave 2's detection layer recomputes `priority`, `queued`, `open_exception_count`,
  `exception_type_summary` and `current_evaluation_id` authoritatively — these seeded values
  are the declared expectation, not a computed truth.
- For `SHP-2026-0009` only, also set `approving_official_user_id = 'usr-sup-001'`,
  `approving_official_name = 'Dwayne Okafor'`, `approving_official_role = 'SUPERVISOR'` and
  `cleared_at` = a seed-clock offset, because the `cases` clearance CHECK requires it. Write
  no `approvals` or `recommendations` row — the approval chain is deferred and not in this
  plan.
- **Coverage assertions, checked before commit** (FRD F02 §Validation, minus the assertions
  that depend on excluded features). A failure throws and rolls back rather than leaving a
  half-seeded demo:
  - entry count between 10 and 15 inclusive (12);
  - all three `exception_type` codes appear across the union of `expected_exception_types`;
  - all seven `cases.status` values present;
  - at least one shipment with >= 2 expected types and at least one with exactly 3;
  - exactly one `CLEARED` shipment, and it has a non-null `approving_official_user_id`;
  - at least one shipment with zero expected types and `queued = 0`;
  - `SHP-2026-0007` matches the canonical scenario field-for-field
    (throw `SEED_CANONICAL_SCENARIO_INVALID` with the offending field otherwise);
  - PII deny-list screen over every seeded string: email pattern, US phone pattern,
    SSN-shaped digits → throw `SEED_PII_SUSPECTED` naming the path.
- Return a `SeedReport`:
  `{ mode, users_created, rules_created, entries_created, cases_created, documents_created, evaluations_created, exceptions_created, coverage: { exception_types, statuses, multi_exception_shipments, precleared_shipments }, seed_clock, duration_ms, evaluate_hook_present }`.

**6. `scripts/seed.ts`.** `--force-reseed` selects `FORCE_RESEED`, default is
`SEED_IF_EMPTY`. Runs migrate + self-check first (so `npm run seed` works on a fresh
database), then `runSeed`, then prints the `SeedReport` as one JSON line. Exit 1 with the
error code on any failure. Add `"seed"` and `"seed:reset"` to `package.json` scripts.

**7. `tests/integration/seed.test.ts`.** Temp DB per test, no network:

- seed on a fresh DB → 5 users, 7 rules, 12 entries, 12 cases, documents > 0;
  `evaluations`, `exceptions`, `evidence`, `audit_entries`, `notifications`,
  `approvals`, `recommendations`, `document_requests`, `case_actions` all have **0** rows.
- **determinism:** seed, snapshot all rows of `users`/`rules`/`cargo_entries`/`documents`/
  `cases` as sorted canonical JSON; `FORCE_RESEED`; snapshot again; assert
  byte-identical strings (timestamps included).
- **idempotency:** run `SEED_IF_EMPTY` twice and `runSeed` directly twice → row counts
  unchanged, no duplicate rows, no throw.
- **canonical scenario:** query `SHP-2026-0007` and assert every binding field, plus that
  its `CERTIFICATE_OF_ORIGIN` document is `NOT_RECEIVED` and its
  `expected_exception_types` has all three codes.
- **coverage:** all seven statuses present; all three exception types across expectations;
  exactly one `CLEARED` case with a non-null `approving_official_user_id`; the clean
  shipment has `queued = 0`.
- **default login user:** `usr-cs-001` exists, `role = 'CARGO_SPECIALIST'`, `active = 1`.
- **negative:** a fixture mutated in-memory to break the canonical scenario makes
  `runSeed` throw `SEED_CANONICAL_SCENARIO_INVALID` and leaves the tables unchanged.
  </action>

  <verify>
npm run typecheck && npm run seed && npm run seed && npm run seed:reset && npx vitest run tests/integration/seed.test.ts --reporter=list 2>&1 | tail -25 && echo TASK2_OK
  </verify>

  <done>
- `npm run seed` exits 0 on a fresh database and again on an already-seeded one, with no
  duplicated rows either time.
- `npm run seed:reset` truncates and reseeds to byte-identical content.
- `tests/integration/seed.test.ts` passes with 0 failing and 0 skipped, including the
  determinism, idempotency, canonical-scenario, coverage and negative cases.
- 12 shipments spanning all three exception types (by declared expectation) and all seven
  case statuses; `usr-cs-001` exists as the default login user; 7 rule rows exist as
  configuration data.
- `evaluations`, `exceptions`, `evidence`, `audit_entries`, `notifications`, `approvals`,
  `recommendations`, `document_requests` and `case_actions` are provably empty — the wave
  writes rows into exactly `users`, `rules`, `cargo_entries`, `documents`, `cases`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Publish the repository layer and the wave-boundary database contract</name>
  <files>
src/shared/types/db.ts
src/infra/db/repositories/cargoRepository.ts
src/infra/db/repositories/caseRepository.ts
src/infra/db/repositories/ruleRepository.ts
src/infra/db/repositories/documentRepository.ts
src/infra/db/repositories/userRepository.ts
src/infra/db/index.ts
tests/integration/db-contract.test.ts
  </files>

  <feature_dependencies>
Implements: F0: Cargo Entry Data Model & Persistence (repository surface and typed row contract)
Depends on: F0 schema and F2 seed (Tasks 1 and 2 of this plan)
Enables: F4, F5 (wave 2), F3, F9 (wave 3), F17, F18 (wave 4)
  </feature_dependencies>

  <action>
**1. `src/shared/types/db.ts` — the typed row contract.** One exported interface per table
this build reads or writes, with property names **identical** to the SQL column names
(snake_case, no camelCase translation) and types matching the storage conventions
(`TEXT` → `string`, nullable → `| null`, `INTEGER` boolean → `0 | 1`, cents → `number`):
`UserRow`, `CargoEntryRow`, `DocumentRow`, `RuleRow`, `EvaluationRow`, `ExceptionRow`,
`EvidenceRow`, `CaseRow`, `CaseActionRow`. Also export the closed string-literal unions used
by later waves: `ExceptionType`, `CaseStatus`, `CasePriority`, `Severity`, `UserRole`,
`CaseAction`, `DocumentStatus`, `DocumentProvenance`, `EvaluationTrigger`, `ExceptionStatus`.
No column may be renamed here — a later wave that reads `password_hash`-style drift from a
type file will produce SQL that fails at runtime.

**2. Repositories (`src/infra/db/repositories/*.ts`).** Thin modules of **named prepared
statements**, no ORM, no dynamic SQL string concatenation from caller input, no query
builder (TechArch §5.3 "No ORM"). Every value goes in as a bound parameter. Each repository
is a factory taking the `Database` handle and returning the methods, so tests can pass a
temp DB.

- `cargoRepository`: `getById`, `getByShipmentId`, `listAll`, `insert` (upsert form used by
  the seed), `listDocuments(cargoEntryId)`.
- `documentRepository`: `listByEntry`, `listReceivedByEntry`, `getById`, `upsert`.
- `ruleRepository`: `listEnabled` (ordered `exception_type ASC, severity DESC, rule_id ASC`
  per F04 §Process step 3 — wave 2 depends on this ordering being the persisted order),
  `listAll`, `getById`, `upsert`.
- `caseRepository`: `getById`, `getByCargoEntryId`, `listQueued`, `loadForUpdate` (a plain
  `SELECT ... WHERE id = ?` used inside a `BEGIN IMMEDIATE` transaction by wave 3),
  `upsert`, `updateProjection({ case_id, priority, queued, open_exception_count, exception_type_summary, current_evaluation_id, priority_basis_json, updated_at })`
  — the single write path wave 2 uses to publish recomputed derived fields.
- `userRepository`: `getById`, `listActive`, `upsert`.

Do **not** add repositories for the tables this build carries schema-only: no audit,
notification, approval, recommendation, document-request or AI-output repository. Those
features are out of scope; a repository for them would be behaviour on a deferred feature.

**3. `src/infra/db/index.ts` — the public entrypoint.** Re-export `openDb`,
`runMigrations`, `runSchemaSelfCheck`, `runSeed`, the row types, and a
`repositories(db)` factory returning `{ cargo, cases, rules, documents, users }`. Every
later wave imports the database **only** from `src/infra/db` — state that in a file-header
comment. Add an `initDatabase(opts?)` convenience that does
`openDb → runMigrations → runSchemaSelfCheck → runSeed({mode:'SEED_IF_EMPTY'})` and returns
`{ db, repositories, schemaVersion, seedReport }`, so wave 5's boot sequence is one call.

**4. `tests/integration/db-contract.test.ts` — the contract regression test.** This file is
what stops waves 2-5 from drifting off the column names; it must stay green forever.

- Migrate + seed a temp DB via `initDatabase`, then for each of the nine contract tables run
  `PRAGMA table_info(<table>)` and assert the exact column-name set matches a literal array
  written out in the test. A renamed or dropped column fails here immediately.
- `ruleRepository.listEnabled()` returns exactly 4 rules (the 3 disabled ones excluded) in
  the documented `(exception_type ASC, severity DESC, rule_id ASC)` order.
- `cargoRepository.getByShipmentId('SHP-2026-0007')` returns the canonical row and its
  documents include a `NOT_RECEIVED` `CERTIFICATE_OF_ORIGIN`.
- `caseRepository.listQueued()` excludes `SHP-2026-0011` (the clean shipment).
- `caseRepository.updateProjection` round-trips: write recomputed derived values, read them
  back, and confirm `updated_at` changed (this is the write path wave 2 will use).
- `userRepository.getById('usr-cs-001')` returns the default login user.
- `initDatabase` is safe to call twice against the same path: second call reports
  `applied: []` and does not duplicate rows.
  </action>

  <verify>
npm run typecheck && npx vitest run --reporter=list 2>&1 | tail -30 && node -e "const s=require('./package.json').scripts; if(!s.migrate||!s.seed||!s['seed:reset']||!s.test) process.exit(1)" && grep -q 'repositories' src/infra/db/index.ts && echo TASK3_OK
  </verify>

  <done>
- `src/infra/db/index.ts` exports `openDb`, `runMigrations`, `runSchemaSelfCheck`,
  `runSeed`, `initDatabase` and `repositories`, and is the only database import path.
- `src/shared/types/db.ts` declares one row interface per contract table with property
  names identical to the SQL column names.
- `tests/integration/db-contract.test.ts` passes with 0 failing and 0 skipped, and asserts
  the exact column-name set of all nine contract tables via `PRAGMA table_info`.
- The full suite (`npx vitest run`) is green: schema, seed and contract test files.
- No repository exists for the schema-only tables belonging to excluded features.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| env→filesystem | `CARGODEMO_DB_PATH` / `CARGODEMO_DOC_STORAGE_DIR` cross from the environment into filesystem open/create calls |
| fixture→database | Repo-committed seed JSON crosses into SQL INSERT statements |
| caller→SQL | Repository callers (later waves) pass identifiers that reach SQLite queries |
| migration file→schema | On-disk SQL crosses into `db.exec`, defining every governance constraint |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | `src/infra/db/repositories/*.ts` — every query reaching SQLite | mitigate | All repository methods are **named prepared statements with bound parameters only**; no template-literal SQL and no caller-supplied string is concatenated into a query. Asserted structurally by review of the five repository files, which contain no `${` inside a SQL string. |
| T-01-02 | Tampering | `src/infra/db/migrate.ts` — applied-migration integrity | mitigate | SHA-256 checksum of each migration file is recorded in `schema_migrations` and re-verified on every run; a mismatch throws `MIGRATION_CHECKSUM_MISMATCH` and aborts before any DML. Test in `tests/integration/schema.migrate.test.ts` tampers with the stored checksum and asserts the abort. |
| T-01-03 | Elevation of privilege | `src/infra/db/schemaSelfCheck.ts` — governance constraints could be silently absent | mitigate | `runSchemaSelfCheck` asserts `foreign_keys=ON`, the four governance CHECKs (`cases` clearance, `approvals` SoD ×2, `notifications transmitted=0`) and the three append-only triggers, throwing `SCHEMA_INTEGRITY_FAILED` otherwise. `scripts/migrate.ts` and `initDatabase` both call it before any caller can touch data. |
| T-01-04 | Information disclosure | `fixtures/*.seed.json` → `src/app/seedService.ts` PII screen | mitigate | Seed-time deny-list screen over every seeded string (email, US phone, SSN-shaped digits) throws `SEED_PII_SUSPECTED` and rolls back the transaction. All fixture names, companies and addresses are invented; no real importer, carrier or person appears. |
| T-01-05 | Tampering | `src/server/config.ts` → `openDb` path handling | mitigate | `config.ts` validates every variable and fails fast on an invalid value rather than defaulting silently; the DB path is resolved once in `openDb` and an unwritable target throws `DB_UNAVAILABLE`. No user-request-derived path reaches the filesystem in this wave (no HTTP surface exists yet). |
| T-01-06 | Repudiation | `audit_entries` / `notifications` append-only triggers | transfer | The triggers are created and self-checked here, but nothing in this build writes to those tables — the audit-record feature is deferred and out of scope. Residual risk (no operational audit trail) is owned by the recorded scope decision in `SCOPE-DECISION.md`. |
| T-01-07 | Denial of service | `scripts/migrate.ts`, `scripts/seed.ts` startup path | accept | A locked or unwritable SQLite file aborts the process with a non-zero exit and a named error code rather than serving against a degraded schema. Single-process, single-writer, ~12 rows: no concurrency mitigation needed. Residual risk accepted per TechArch AD-03. |
</threat_model>

<verification>
Run from the repository root on a clean checkout:

1. `npm install && npm run typecheck` — exits 0.
2. `rm -rf data && npm run migrate && npm run migrate` — both exit 0; the second applies
   nothing.
3. `npm run seed && npm run seed && npm run seed:reset` — all exit 0; no duplicated rows.
4. `npx vitest run --reporter=list` — all three integration test files green, 0 failing,
   0 skipped.
5. Contract spot-checks (each must print `CONTRACT_OK`): the four `verify` one-liners in
   `integration_contracts.provides`.
6. Scope check — these must all print `0`:
   `npx tsx -e "import {openDb} from './src/infra/db/connection.ts'; const d=openDb(); for (const t of ['evaluations','exceptions','evidence','audit_entries','notifications','approvals','recommendations','document_requests','case_actions']) console.log(t, d.prepare('select count(*) c from '+t).get().c)"`
7. No compose file was added: `test ! -f docker-compose.yml && echo NO_COMPOSE_OK`.
</verification>

<success_criteria>
- `npm run migrate` then `npm run seed` on a fresh checkout produces a database with 12
  shipments, 12 cases spanning all seven statuses, 7 rule rows and 5 users — repeatably and
  idempotently.
- `SHP-2026-0007` matches the canonical solar-panel scenario field-for-field, with all three
  expected exception types declared and its certificate of origin not received.
- Two consecutive seed runs produce byte-identical rows in every seeded table, timestamps
  included.
- The migration file is a verbatim copy of `Y0a` §1-§9 + `Y0b` §1-§9 DDL, indexes and
  triggers; the schema self-check proves the four governance CHECKs and three append-only
  triggers exist and blocks startup if any is missing.
- `src/infra/db` is the single database entrypoint, exporting migrate, self-check, seed and
  repositories, with row types whose property names equal the SQL column names.
- `tests/integration/db-contract.test.ts` pins the exact column-name set of the nine tables
  waves 2-5 consume, so a later rename fails a test instead of a demo.
- No behaviour, seed content, repository or endpoint exists for tables belonging to excluded
  features.
</success_criteria>

<output>
After completion, create
`.planning/express/cargodemo-cbp-cargo-exception-review-app/01-SUMMARY.md` recording:
schema version applied, the `SeedReport` JSON, the exact table/column contract handed to
wave 2, the `evaluate` hook signature wave 2 must call, the migrate/seed commands wave 5
must run, and the two FRD/TechArch inconsistencies noted in Task 1 step 3
(`shipment_value_cents` vs the `shipment_value_usd` projection name, and the
`recommendations.concurrence` enum arity) with the resolution taken.
</output>
