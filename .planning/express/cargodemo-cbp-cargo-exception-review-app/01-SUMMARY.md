---
phase: express-wave-1
plan: 01
subsystem: database
tags: [sqlite, better-sqlite3, migrations, seed, schema, repositories, typescript, vitest]

requires: []
provides:
  - "Complete SQLite schema (21 tables, 3 append-only triggers, all governance CHECKs) in one forward-only migration"
  - "Checksum-verified migration runner + blocking schema self-check (F0)"
  - "Deterministic, idempotent 12-shipment synthetic seed incl canonical SHP-2026-0007 (F2)"
  - "7 default rule rows as configuration data; 5 seeded users incl usr-cs-001 default login"
  - "Typed row contract (src/shared/types/db.ts) + five repositories + src/infra/db public entrypoint"
  - "seedService `evaluate` hook boundary for wave 2 detection"
affects: [F4, F5, F3, F9, F17, F18]

tech-stack:
  added: [better-sqlite3, tsx, typescript, vitest, "@types/node", "@types/better-sqlite3"]
  patterns:
    - "openDb sets WAL + foreign_keys=ON + busy_timeout on every connection"
    - "One forward-only .sql migration read from disk; SHA-256 checksum recorded and re-verified"
    - "Deterministic seed via fixed SeedClock + fixture ids; upsert-by-id; single transaction"
    - "Repositories are factories of named prepared statements, bound params only, no ORM"
    - "src/infra/db is the sole database import path for later waves"

key-files:
  created:
    - src/infra/db/migrations/001_initial_schema.sql
    - src/infra/db/connection.ts
    - src/infra/db/migrate.ts
    - src/infra/db/schemaSelfCheck.ts
    - src/app/seedService.ts
    - src/infra/db/index.ts
    - src/shared/types/db.ts
    - fixtures/cargo-entries.seed.json
    - fixtures/rules.seed.json
    - fixtures/users.seed.json
  modified:
    - package.json

key-decisions:
  - "Case statuses seeded declaratively from fixture case_status (workflow state machine is wave 3)"
  - "SHP-2026-0009 CLEARED with populated approving official to satisfy cases clearance CHECK; no approvals/recommendations row"
  - "shipment_value_cents is the column name (FRD prose shipment_value_usd is the API projection); recommendations.concurrence uses Y0b 3-value enum"
  - "typecheck (tsc --noEmit) is the compile gate; project runs via tsx, no build/dist step"

patterns-established:
  - "Contract regression test pins exact column-name set of nine tables via PRAGMA table_info"
  - "Coverage + canonical-scenario + PII assertions run before seed commit, rollback on failure"

duration: 9min
completed: 2026-09-08
---

# Phase express-wave-1 Plan 01: Seeded, Governed Persistence Foundation Summary

**Complete CargoDemo SQLite schema (21 tables, append-only audit/notification triggers, four governance CHECKs) with a checksum-verified forward-only migration runner, a blocking integrity self-check, a deterministic 12-shipment idempotent seed reproducing the canonical solar-panel scenario SHP-2026-0007 field-for-field, and a typed repository layer published as the single `src/infra/db` entrypoint for waves 2-5.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-08T20:37:00Z
- **Completed:** 2026-09-08T20:47:30Z
- **Tasks:** 3
- **Files created/modified:** 30 (27 source/fixture/test files, package.json, .gitignore, .env.example)

## Accomplishments

- **F0 schema + migrations:** `001_initial_schema.sql` is the verbatim Y0a §1-§9 + Y0b §1-§9 DDL — all 21 tables, every CHECK and index, the two `audit_entries` append-only triggers and `notifications_no_delete`. `runMigrations` applies it forward-only inside one transaction, records a SHA-256 checksum, and throws `MIGRATION_CHECKSUM_MISMATCH` if an applied file changes. `runSchemaSelfCheck` blocks startup (`SCHEMA_INTEGRITY_FAILED`) unless FKs are on, all 21 tables exist, the four governance CHECKs are present, the three triggers exist, and the exceptions type CHECK lists exactly the three canonical codes.
- **F2 seed:** `runSeed` upserts 5 users, 7 rules (3 disabled), 12 shipments, 12 cases and 39 documents from fixtures, driven by a fixed `SeedClock` (2026-09-01T08:00:00.000Z) so two runs / a reseed are byte-identical. `SEED_IF_EMPTY` skips a non-empty DB; `FORCE_RESEED` truncates in Y0b §10 reverse-dependency order. Coverage, canonical-scenario and PII assertions run before commit and roll back on failure.
- **Wave contract:** `src/shared/types/db.ts` declares one row interface per contract table with property names identical to the SQL columns; five repositories expose named prepared statements only; `src/infra/db/index.ts` re-exports the whole surface plus `initDatabase` (open → migrate → self-check → seed) and `repositories(db)`.

## Task Commits

1. **Task 1: Scaffold + schema + migration runner** — `05f60b9` (feat)
2. **Task 2: Deterministic idempotent seed** — `e9bd2f7` (feat)
3. **Task 3: Repository layer + wave-boundary contract** — `89a00cf` (feat)

## SeedReport (fresh database)

```json
{"mode":"SEED_IF_EMPTY","users_created":5,"rules_created":7,"entries_created":12,"cases_created":12,"documents_created":39,"evaluations_created":0,"exceptions_created":0,"coverage":{"exception_types":["CONFLICTING_COUNTRY_OF_ORIGIN","INVALID_HTS_CODE","MISSING_REQUIRED_DOCUMENT"],"statuses":["AWAITING_INFORMATION","CLEARED","ESCALATED","IN_REVIEW","NEW","ON_HOLD","PENDING_APPROVAL"],"multi_exception_shipments":["SHP-2026-0007","SHP-2026-0004","SHP-2026-0008","SHP-2026-0012"],"precleared_shipments":["SHP-2026-0009"]},"seed_clock":"2026-09-01T08:00:00.000Z","duration_ms":2,"evaluate_hook_present":false}
```

## Files Created/Modified

- `src/infra/db/migrations/001_initial_schema.sql` — verbatim Y0a + Y0b DDL, indexes, append-only triggers
- `src/infra/db/connection.ts` — `openDb(path?)` with WAL/foreign_keys/busy_timeout pragmas
- `src/infra/db/migrate.ts` — `runMigrations`, forward-only, checksum-verified
- `src/infra/db/schemaSelfCheck.ts` — `runSchemaSelfCheck` blocking integrity assertions
- `src/app/seedService.ts` — `runSeed`, `SeedReport`, `SeedOptions.evaluate` hook, coverage/PII guards
- `src/infra/clock.ts`, `src/infra/ids.ts` — `SeedClock` / `DeterministicIdGenerator`
- `src/infra/db/index.ts` — sole DB entrypoint: re-exports + `repositories(db)` + `initDatabase`
- `src/shared/types/db.ts` — nine row interfaces + closed unions
- `src/infra/db/repositories/*.ts` — cargo/case/rule/document/user repositories
- `src/server/config.ts` — fail-fast env config
- `fixtures/{users,rules,cargo-entries}.seed.json` — synthetic dataset
- `scripts/migrate.ts`, `scripts/seed.ts` — CLI entrypoints
- `tests/integration/{schema.migrate,seed,db-contract}.test.ts` — 24 passing tests
- `package.json` — scripts: `migrate`, `seed`, `seed:reset`, `typecheck`, `test`

## Wave 2 handoff — table/column contract and evaluate hook

- **Import path:** later waves import the database ONLY from `src/infra/db`.
- **Column names are binding.** The nine tables waves 2-5 consume (`users`, `cargo_entries`, `documents`, `rules`, `evaluations`, `exceptions`, `evidence`, `cases`, `case_actions`) have their exact column-name set pinned by `tests/integration/db-contract.test.ts` — a rename fails that test.
- **evaluate hook signature wave 2 must call:**
  ```ts
  runSeed(db, {
    mode: 'SEED_IF_EMPTY' | 'FORCE_RESEED',
    evaluate?: (db: Db, cargoEntryId: string) => void,
  })
  ```
  Wave 1 never passes `evaluate`, so `evaluations`/`exceptions`/`evidence` stay empty. When wave 2 passes its evaluator, the seed calls it once per entry after the case row is written, and wave 2 recomputes each case's `priority`, `queued`, `open_exception_count`, `exception_type_summary` and `current_evaluation_id` authoritatively via `caseRepository.updateProjection(...)`. The seeded projection values are the declared expectation (`cargo-entries.seed.json.expected_exception_types`), not a computed truth.
- **Wave 5 runtime:** `npm run migrate && npm run seed && <serve>`, or a single `initDatabase()` call.

## Decisions Made

- **Case statuses seeded declaratively** from each fixture's `case_status` rather than driven through a state machine — the F9/F11 workflow service is a later wave. Recorded deviation from FRD F02 §Process steps 6-9.
- **SHP-2026-0009** seeded `CLEARED` with `approving_official_user_id=usr-sup-001`, name, role and `cleared_at` populated purely to satisfy the `cases` clearance CHECK; no `approvals`/`recommendations` row (approval chain out of scope).
- **No audit/notification rows, no document binaries on disk, no upload-ready fixture** — those depend on excluded features. Seeded `documents` are metadata only; `RECEIVED` rows carry a `filename` as the schema CHECK requires.
- **`evaluations`/`exceptions`/`evidence` intentionally empty** in this wave (rule engine + detection are wave 2).

## FRD/TechArch inconsistencies noted (Task 1 step 3) and resolution taken

1. **`shipment_value_cents` vs `shipment_value_usd`.** `Y0a` §2 defines the column `cargo_entries.shipment_value_cents` (INTEGER cents); FRD F0/F02 prose refers to `shipment_value_usd` (e.g. `$85,000.00`). **Resolution:** the DDL is authoritative — the column is `shipment_value_cents` and the canonical value is stored as `8500000`. `shipment_value_usd` is understood as the API-facing dollar projection a later wave derives, not a stored column.
2. **`recommendations.concurrence` enum arity.** `Y0b` §4 lists three values (`AGREED`, `DIVERGED`, `NO_RECOMMENDATION_PRESENT`); TechArch `02b` §2b.4 lists a fourth (`NOT_APPLICABLE`). **Resolution:** the FRD DDL (three values) is authoritative and copied verbatim. This build writes zero `recommendations` rows, so the difference is inert here; flagged for wave 3 which owns that table.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted the plan's `<verify>` command reporter flag**
- **Found during:** Task 1 (running the plan's verification one-liner)
- **Issue:** The plan's `<verify>` commands invoke `npx vitest run ... --reporter=list`. In the installed vitest (1.6.1) `list` is not a valid built-in reporter name and vitest aborts with "Failed to load custom Reporter from list".
- **Fix:** Ran the suites with vitest's default reporter (`npx vitest run <file>`), which is equivalent for pass/fail gating. No source change; only the verification invocation was adjusted. `npm test` (`vitest run`) — the committed script — uses the default reporter and works.
- **Files modified:** none (verification-command only)
- **Verification:** all three suites green (24 tests) via `npx vitest run`.
- **Committed in:** n/a (no code change)

**2. [Rule 3 - Blocking] `.gitignore` is a Pivota-managed file; added project entries outside the managed block**
- **Found during:** Task 1 (the plan lists `.gitignore` as a file to author with `data/`, `.env`)
- **Issue:** A pre-existing `.gitignore` with a `pivota:gitignore-managed` block already covered `node_modules/`, `dist/`, `build/`. Overwriting it would clobber managed patterns.
- **Fix:** Appended `data/` and `.env` below the managed block's closing marker rather than rewriting the file.
- **Files modified:** `.gitignore`
- **Verification:** `data/` and `.env` are ignored; managed block intact.
- **Committed in:** `05f60b9` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking/tooling). **Impact on plan:** none on delivered behaviour — both are environment/tooling accommodations. No scope creep; no schema, seed or contract change.

## Known Stubs

None found. A `grep` for TODO/FIXME/placeholder/not-implemented over `src/`, `scripts/` and `fixtures/` returns no hits (the `placeholder_characters` / `PLACEHOLDER` tokens are the HTS rule's legitimate domain parameter and sub-reason, not incomplete code). `evaluations`/`exceptions`/`evidence` being empty is the specified wave-1 scope boundary, not a stub — the `evaluate` hook is the documented seam wave 2 fills.

## Issues Encountered

None beyond the two tooling deviations above.

## User Setup Required

None — SQLite is file-backed and needs no external service. No `docker-compose.yml` was authored (wave 5 owns the single-command boot). Copy `.env.example` to `.env` if non-default paths/ports are wanted; defaults work out of the box.

## Self-Check: PASSED

- All 10 created key-files exist on disk (verified).
- Three task commits exist: `05f60b9`, `e9bd2f7`, `89a00cf` (verified via `git log`).
- Compile gate `npm run typecheck` (`tsc --noEmit`) exits 0; migrate/seed/seed:reset all exit 0; full `vitest run` = 24/24 passing.
- `## Known Stubs` present, no blocking stub.

## Next Phase Readiness

- Persistence foundation complete. Wave 2 (F4 rule engine, F5 detection) can import `src/infra/db`, call `runSeed(db, { mode, evaluate })` with its evaluator, and write to `evaluations`/`exceptions`/`evidence` + `caseRepository.updateProjection`.
- Column-name contract is regression-locked by `db-contract.test.ts`.
- `recommendations.concurrence` enum arity flagged for wave 3 (the wave that first writes that table).

---
*Phase: express-wave-1*
*Completed: 2026-09-08*
