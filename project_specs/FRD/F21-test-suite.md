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
