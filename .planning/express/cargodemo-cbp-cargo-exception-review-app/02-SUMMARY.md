---
phase: express-wave-2
plan: 02
subsystem: rules
tags: [rule-engine, ajv, exception-detection, evidence, priority, sqlite, vitest, typescript]

requires:
  - phase: express-wave-1
    provides: "SQLite schema (evaluations/exceptions/evidence/cases/rules/cargo_entries/documents), repositories(db), seedService evaluate hook, DeterministicIdGenerator/SeedClock, typed row contract"
provides:
  - "Pure configuration-driven rule engine: evaluateEntry, ruleSetFingerprint, SEVERITY_RANK (src/domain/rules/engine.ts)"
  - "Three evaluators reading every threshold/list/path from rule.params (missingDocument, htsCode, countryOfOrigin)"
  - "Pure priority derivation: derivePriority with recorded PriorityBasisEntry[] (src/domain/priority.ts)"
  - "Detection service: detectExceptions + createEvaluateHook, one-txn persistence with write-time gates (src/app/evaluationService.ts)"
  - "ExceptionRecord/EvidenceRecord/MissingInformationItem/PriorityBasisEntry projection for waves 3-4 (src/shared/types/detection.ts)"
  - "Three repositories (evaluation/exception/exceptionRepository.listByCaseWithEvidence/evidence) on repositories(db)"
  - "Populated-state seed: migrate+seed leaves 12 evaluations, 15 exceptions, 33 evidence rows"
affects: [F3, F9, F17, F18]

tech-stack:
  added: [ajv]
  patterns:
    - "src/domain is pure: no better-sqlite3, no node:fs, no clock; node:crypto only for the fingerprint"
    - "Rules are DATA: exception_type selects the evaluator; every threshold/list/path read from rule.params"
    - "Closed evaluator map (no registration API); unknown type -> EXCEPTION_TYPE_UNSUPPORTED in invalid_rules[]"
    - "Ajv additionalProperties:false + useDefaults on every load, not only save"
    - "Allow-list field-path resolver rejecting __proto__/constructor/prototype"
    - "Detection runs in ONE db.transaction with write-time validation gates that roll back on violation"
    - "Deterministic ids derived from entry (eval-/exc-/evd-<seq>-<version>-<idx>) + pinned duration_ms=0 under seed/test"

key-files:
  created:
    - src/domain/rules/types.ts
    - src/domain/rules/normalize.ts
    - src/domain/rules/fieldPath.ts
    - src/domain/rules/conditions.ts
    - src/domain/rules/schemas.ts
    - src/domain/rules/evaluators/missingDocument.ts
    - src/domain/rules/evaluators/htsCode.ts
    - src/domain/rules/evaluators/countryOfOrigin.ts
    - src/domain/rules/engine.ts
    - src/domain/priority.ts
    - src/shared/types/rules.ts
    - src/shared/types/detection.ts
    - src/infra/db/repositories/evaluationRepository.ts
    - src/infra/db/repositories/exceptionRepository.ts
    - src/infra/db/repositories/evidenceRepository.ts
    - src/app/evaluationService.ts
    - tests/unit/rules.normalize.test.ts
    - tests/unit/rules.evaluators.test.ts
    - tests/unit/rules.engine.test.ts
    - tests/unit/priority.test.ts
    - tests/integration/detection.test.ts
    - tests/integration/seed-detection.test.ts
  modified:
    - package.json
    - src/infra/db/index.ts
    - src/app/seedService.ts
    - scripts/seed.ts

key-decisions:
  - "min_shipment_value_usd compared against shipment_value_cents/100 (never renamed a seeded param, never added a shipment_value_usd column)"
  - "Rules ordered by explicit SEVERITY_RANK DESC, not string sort (which gives MEDIUM>LOW>HIGH>CRITICAL)"
  - "duration_ms pinned to 0 under deterministic (seed/test) mode so two reseeds are byte-identical"
  - "FORCE_RESEED nulls cases.current_evaluation_id + exceptions.superseded_by_exception_id before the ordered delete"

patterns-established:
  - "Detection deviations from FRD F05 recorded and returned in DetectionResult instead of audit rows (audit feature out of scope)"
  - "Forward-only reconciliation: prior OPEN exceptions -> SUPERSEDED_BY_EVALUATION; RESOLVED_BY_REVALIDATION never written"
  - "Detection never mutates cases.status; all seven seeded statuses survive"

duration: 14min
completed: 2026-09-08
---

# Phase express-wave-2 Plan 02: Configuration-Driven Rule Engine & Exception Detection Summary

**A pure, data-driven rule engine (three evaluators whose every threshold, document list, digit count and comparison field is read from `rules.params_json`) plus a one-transaction detection layer that turns findings into `evaluations`/`exceptions`/`evidence` rows with derived priority and queue membership — making a fresh `npm run migrate && npm run seed` leave a real, populated exception queue behind (12 evaluations, 15 exceptions, 33 evidence rows).**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-08T20:50:57Z
- **Completed:** 2026-09-08T21:04:53Z
- **Tasks:** 3
- **Files created/modified:** 25 (21 created, 4 modified)

## Accomplishments

- **F4 rule engine (pure):** `evaluateEntry(entry, rules)` filters to enabled rules, orders by `(exception_type ASC, SEVERITY_RANK DESC, rule_id ASC)`, validates params with Ajv on load, evaluates applicability conditions, dispatches through a closed evaluator map, and returns findings + skipped_rules + invalid_rules + a SHA-256 rule-set fingerprint. Three evaluators read all thresholds/lists/paths from `rule.params`; the `grep` for hardcoded `50000`/`"CERTIFICATE_OF_ORIGIN"`/`manufacturer.address.country` in `src/domain/rules/evaluators/` finds nothing.
- **F5 detection:** `detectExceptions(db, input, deps?)` runs inside one `db.transaction()`, inserting the evaluation, superseding prior OPEN exceptions, persisting exceptions + field-level evidence with carried-forward `opened_at`/`first_detected_evaluation_id`, enforcing write-time gates, deriving priority, and publishing the case projection via `caseRepository.updateProjection`. Never writes `cases.status`.
- **Populated seed:** `scripts/seed.ts` passes `createEvaluateHook()`; the seed asserts detection coverage (non-empty + no orphan evidence; per-shipment detected == fixture expected; canonical=3, clean=0) before commit and rolls back with `SEED_COVERAGE_FAILED` on divergence.

## Exported signatures (wave 3 contract)

```ts
// src/domain/rules/engine.ts
export const SEVERITY_RANK: Record<Severity, number>; // LOW 0, MEDIUM 1, HIGH 2, CRITICAL 3
export function evaluateEntry(entry: EntrySnapshot, rules: RuleDefinition[]): EvaluationResult;
export function ruleSetFingerprint(rules: RuleDefinition[]): string; // sha256 hex over ordered (id,version,enabled)

// src/domain/priority.ts
export function derivePriority(input: {
  severities: Severity[]; shipment_value_cents: number; open_exception_count: number;
  oldest_opened_at: string | null; now: string;
}): { priority: CasePriority; basis: PriorityBasisEntry[] };

// src/app/evaluationService.ts
export function detectExceptions(db, input: DetectionInput, deps?: DetectionDeps): DetectionResult;
export function createEvaluateHook(opts?: { trigger?; clock?; ids? }): (db, cargoEntryId: string) => void;
```

## The persisted exception shape (real SHP-2026-0007 row)

A verbatim serialized `ExceptionRecord` from `exceptionRepository.listByCaseWithEvidence` after a fresh seed — the shape wave 3 serves and wave 4 renders:

```json
{
  "id": "exc-0007-1-2",
  "evaluation_id": "eval-0007-1",
  "cargo_entry_id": "ent-0007",
  "case_id": "case-0007",
  "rule_id": "rule-doc-highvalue-coo",
  "rule_version": 1,
  "exception_type": "MISSING_REQUIRED_DOCUMENT",
  "sub_reason": "DOCUMENT_NOT_RECEIVED",
  "severity": "HIGH",
  "status": "OPEN",
  "assertion": "CERTIFICATE_OF_ORIGIN has not been received",
  "missing_information": [
    {
      "field_path": null,
      "document_type": "CERTIFICATE_OF_ORIGIN",
      "requirement": "Certificate Of Origin is required for this shipment",
      "required_by_rule": "rule-doc-highvalue-coo",
      "policy_reference": "19 CFR 102.0",
      "observed_digits": null,
      "missing_digits": null
    }
  ],
  "first_detected_evaluation_id": "eval-0007-1",
  "opened_at": "2026-09-01T08:00:00.000Z",
  "created_at": "2026-09-01T08:00:00.000Z",
  "evidence": [
    { "kind": "OBSERVED", "field_path": "documents",
      "raw_value": "BILL_OF_LADING, COMMERCIAL_INVOICE, PACKING_LIST",
      "expected": "CERTIFICATE_OF_ORIGIN", "display_order": 0, "truncated": 0 },
    { "kind": "MISSING", "field_path": "documents", "raw_value": "CERTIFICATE_OF_ORIGIN",
      "expected": "RECEIVED", "display_order": 1, "truncated": 0 },
    { "kind": "CONTEXT", "field_path": "shipment_value_usd", "raw_value": "85000.00",
      "expected": ">= 50000", "assertion": "shipment_value_usd = 85000.00 >= 50000 threshold",
      "display_order": 2, "truncated": 0 }
  ],
  "rule_name": "High-Value Certificate of Origin",
  "rule_description": "Shipments valued at or above fifty thousand dollars require a certificate of origin to substantiate the declared country of origin.",
  "policy_reference": "19 CFR 102.0"
}
```

The origin exception carries `OBSERVED country_of_origin Malaysia/MY` + `COMPARISON manufacturer.address.country China/CN`; the HTS exception's `OBSERVED` row has `expected: "10 digits"`, `observed: "6 digits"`.

## Priority derivation & initial queue status (wave 3/4 must not re-implement)

1. base = max OPEN-exception severity by `SEVERITY_RANK` after each rule's `priority_mapping`; no OPEN exceptions => `LOW`.
2. `VALUE_ESCALATION` when `shipment_value_cents >= 5000000` (= $50,000) => +1 level.
3. `MULTIPLICITY_ESCALATION` when `open_exception_count >= 3` => +1 level.
4. `AGE_ESCALATION` when the oldest `opened_at` is > 7 days before `now` => +1 level.
5. clamp at `CRITICAL`; every applied step (including an absorbed `CLAMP`) is appended to `priority_basis_json`.

Detection sets `cases.queued = open_exception_count > 0 ? 1 : 0`, `current_evaluation_id`, `open_exception_count`, and `exception_type_summary`. **The delimiter wave 4 splits `exception_type_summary` on is a single comma `,`** (sorted distinct OPEN types).

## Seed report (fresh migrate + seed)

```json
{"mode":"SEED_IF_EMPTY","users_created":5,"rules_created":7,"entries_created":12,"cases_created":12,"documents_created":39,"evaluations_created":12,"exceptions_created":15,"evidence_created":33,"seed_clock":"2026-09-01T08:00:00.000Z","evaluate_hook_present":true}
```

## Task Commits

1. **Task 1: configuration-driven rule engine + three evaluators** — `5061098` (feat)
2. **Task 2: persist detection (evaluations/exceptions/evidence/priority/projection)** — `f065132` (feat)
3. **Task 3: wire seed evaluate hook -> populated exception queue** — `0e7c657` (feat)

_Plan metadata: this SUMMARY + STATE.md commit follows._

## Files Created/Modified

See frontmatter `key-files`. Highlights:
- `src/domain/rules/engine.ts` — pure engine, closed evaluator map, ordering + fingerprint
- `src/domain/rules/evaluators/*.ts` — three data-driven evaluators
- `src/domain/priority.ts` — pure priority derivation with recorded basis
- `src/app/evaluationService.ts` — one-transaction detection + seed hook
- `src/shared/types/detection.ts` — ExceptionRecord/EvidenceRecord projection for waves 3-4
- `src/infra/db/index.ts` — `{ evaluations, exceptions, evidence }` added to `repositories(db)`
- `src/app/seedService.ts` / `scripts/seed.ts` — hook wiring + detection-coverage guard

## Two spec-name conflicts resolved (as required by <output>)

1. **`min_shipment_value_usd` vs `shipment_value_cents`.** FRD F04 §3 / F05 step 6 spell the parameter and threshold in dollars (`min_shipment_value_usd: 50000`), while the canonical column is `cargo_entries.shipment_value_cents` (Y0a). **Resolution:** the seeded parameter name is kept exactly as spelled, and conversion happens only at the comparison site — `shipment_value_cents / 100 >= min_shipment_value_usd` (in `conditions.ts`). No seeded parameter renamed; no `shipment_value_usd` column added.
2. **`severity DESC` ordering.** F04 §Process step 3 says "order by severity DESC", but `severity` is a TEXT enum, so a string sort yields `MEDIUM > LOW > HIGH > CRITICAL`. **Resolution:** ordering uses the explicit `SEVERITY_RANK` map (`LOW 0, MEDIUM 1, HIGH 2, CRITICAL 3`) descending, exported from `engine.ts`; the same rank drives `max(severity)` in `derivePriority`. Proven by the severity-ordering test.

## Decisions Made

- `duration_ms` is pinned to `0` when a `DeterministicIdGenerator` is supplied (seed/test mode) so two consecutive force-reseeds produce byte-identical evaluation rows (the must-have determinism contract); live evaluations record the real measured duration.
- Deterministic ids are derived from the entry (`eval-<seq>-<version>`, `exc-…-<idx>`, `evd-…-<order>`) so they are stable regardless of iteration order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `duration_ms` broke byte-identical determinism**
- **Found during:** Task 2 (detection determinism integration test)
- **Issue:** `evaluateEntry` measures `duration_ms` from `process.hrtime`, which varies run-to-run; two force-reseeds therefore produced non-identical `evaluations` rows, violating the must-have "byte-identical reseeds" contract.
- **Fix:** In `detectExceptions`, when a `DeterministicIdGenerator` is supplied (seed/test mode) persist `duration_ms = 0`; live evaluations still record the real value.
- **Files modified:** src/app/evaluationService.ts
- **Verification:** the determinism test and `seed-detection` force-reseed test both assert byte-identical `evaluations`/`exceptions`/`evidence` snapshots — green.
- **Committed in:** f065132 (Task 2 commit)

**2. [Rule 3 - Blocking] `npm run seed:reset` failed with FOREIGN KEY constraint**
- **Found during:** Task 3 (first `seed:reset` after the hook populated detection)
- **Issue:** `cases.current_evaluation_id` references `evaluations` and `exceptions.superseded_by_exception_id` references `exceptions`; wave 1's `FORCE_RESEED` ordered-delete loop never hit this because those tables were empty. With detection populated, deleting `evaluations`/`exceptions` failed the FK.
- **Fix:** Before the ordered delete, `UPDATE cases SET current_evaluation_id = NULL` and `UPDATE exceptions SET superseded_by_exception_id = NULL`. Reset order otherwise untouched.
- **Files modified:** src/app/seedService.ts
- **Verification:** `npm run seed:reset` twice in a row exits 0 and produces byte-identical rows.
- **Committed in:** 0e7c657 (Task 3 commit)

**3. [Rule 3 - Blocking] plan `<verify>` uses `--reporter=list`, unsupported in vitest 1.6.1**
- **Found during:** all tasks (running the plan's verification one-liners)
- **Issue:** As recorded in the wave-1 summary, the installed vitest (1.6.1) does not accept `--reporter=list` as a built-in and aborts. This is a verification-command-only issue.
- **Fix:** Ran the suites with vitest's default reporter (`npx vitest run <files>`), equivalent for pass/fail gating. No source change; the committed `npm test` (`vitest run`) uses the default reporter.
- **Files modified:** none (verification-invocation only)
- **Verification:** full suite green (9 files, 78 tests) via `npx vitest run`.
- **Committed in:** n/a (no code change)

---

**Total deviations:** 3 auto-fixed (1 determinism bug, 2 blocking — one FK/reset, one tooling). **Impact on plan:** all necessary for correctness (determinism, resettable seed) or environment; no scope creep, no contract change.

## Known Stubs

None found. A scan of `src/domain/`, `src/app/evaluationService.ts`, `scripts/seed.ts` and `src/shared/types/detection.ts` for `TODO`/`FIXME`/`not implemented`/`coming soon` returns no hits (the `placeholder_characters`/`PLACEHOLDER` tokens are the HTS rule's legitimate domain parameter/sub-reason; `DOCUMENT_NOT_RECEIVED`/`is required but not present` are evidence assertion copy, not incomplete code). The recorded scope deviations (no audit/notification rows, forward-only reconciliation, `resolved` always empty) are the plan's declared boundaries, not stubs.

## Issues Encountered

None beyond the three deviations above.

## User Setup Required

None — SQLite is file-backed and needs no external service. No `docker-compose.yml` was authored (wave 5 owns the single-command boot).

## Self-Check: PASSED

- All 21 created key-files exist on disk (verified via typecheck + test imports resolving).
- Three task commits exist: `5061098`, `f065132`, `0e7c657` (verified via `git log`).
- `npm run typecheck` (`tsc --noEmit`) exits 0; full `npx vitest run` = 78/78 passing across 9 files.
- Plan-level build/verify ran clean: `rm -rf data && npm run migrate && npm run seed` → exceptions 15, evidence 33, canonical SHP-2026-0007 = 3 OPEN, 0 orphan-evidence, 7 distinct case statuses, 12 evaluations; `npm run seed && npm run seed:reset` both exit 0; excluded tables (audit_entries/notifications/approvals/recommendations/document_requests/case_actions/ai_outputs/sessions) all count 0; `src/domain/` imports no DB/fs/clock; no `docker-compose.yml`.
- `## Known Stubs` present, no blocking stub.

## Next Phase Readiness

- Wave 3 (F3 backend HTTP API, F9 case workflow) can import `detectExceptions`/`createEvaluateHook`, read `ExceptionRecord[]` from `exceptionRepository.listByCaseWithEvidence`, and derive priority via `derivePriority` — none of which it should re-implement.
- `exception_type_summary` splits on `,`; `priority_basis_json` explains every priority.
- The queue wave 4 renders is backed by real rows; `caseRepository.listQueued()` already filters on `queued = 1`.
- Open follow-ups owned by later waves: revalidation reconciliation (RESOLVED_BY_REVALIDATION), audit/notification rows, AI summary/recommendation — all explicitly out of this build's scope.

---
*Phase: express-wave-2*
*Completed: 2026-09-08*
