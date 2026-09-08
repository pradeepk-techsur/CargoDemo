---
schema_version: 1
slug: cargodemo-cbp-cargo-exception-review-app
status: reviewed
generated_by: pivota_spec-plan-checker
date: 2026-09-08
plans_reviewed: 5
findings: { answerable: 1, auto_fixable: 6, informational: 0, blockers: 2 }
---

# Plan Review — CargoDemo (CBP cargo exception review app)

> `findings` counts are bucket counts and sum to the 7 findings returned.
> `blockers` is a **severity** count that crosses buckets — both blockers here sit in
> `auto_fixable` — so the four numbers are not meant to sum to the total.

## Verdict

Reviewed, 5 of 5 plans read in full. All 8 in-scope features (F0, F2, F3, F4, F5, F9, F17, F18)
have an implementing task; the dependency graph `[] → [1] → [1,2] → [3] → [1,2,3,4]` is acyclic
and every reference resolves; all 48 `must_haves.truths` across the five plans trace to a
delivering task with none contradicted; and the excluded-scope boundary is enforced by explicit
zero-row assertions in three separate plans rather than by prose alone.

Two blockers found, and they are the same defect in two places: a task's `<verify>` gate asserts
an artifact that a **later task in the same plan** creates, so the gate cannot pass when the
executor reaches it. Four warnings and one cosmetic info finding follow. Nothing found questions
the scope decision, and the checker independently spot-checked two schema claims against
`project_specs/FRD/Y0b-schema-workflow-audit.md` and found them sound.

Dimension 8 (Nyquist) was skipped — `workflow.research: false`, so there is no RESEARCH.md or
VALIDATION.md on this route.

## Answerable by the user

- **01-PLAN.md, 03-PLAN.md, 04-PLAN.md** · `scope_sanity` · Five plans were produced (one per
  wave) against `WAVE-SCHEDULE.md`'s `estimated_plans` totalling nine, so each plan absorbed
  roughly double the intended work. Plan 03 Task 2 touches 19 files; plan 04 Task 1 touches 28.
  Task-level file counts that large are the usual cause of an executor running out of context
  mid-task. Whether to spend a replan pass rebalancing this is a tradeoff the user owns.
  *Emitted as REVIEW-Q1.*

## Auto-fixable

- **03-PLAN.md** · `task_completeness` · **BLOCKER** — Task 2's `api.boot.test.ts` asserts the
  registry contains exactly six routes and that malformed JSON on the action route returns 400
  `MALFORMED_JSON`, but `src/server/routes/cases.ts` (which supplies
  `GET /api/cases/:case_id/available-actions` and `POST /api/cases/:case_id/actions`) is created
  in Task 3. Task 2's `<files>` lists only `registry.ts`, `queue.ts`, `shipments.ts`, so its
  `<verify>` cannot pass — and if `registry.ts` imports `cases.ts`, the `typecheck` in the same
  command fails first.
  *Fix:* Scope Task 2's boot test to the four read routes and move the six-route + malformed-JSON
  assertions into Task 3 (which re-touches `registry.ts` and runs the full suite anyway), or add
  `src/server/routes/cases.ts` to Task 2 as route registration with handlers delegating to Task
  3's service.

- **04-PLAN.md** · `task_completeness` · **BLOCKER** — Task 1's `<action>` step 6 specifies the
  router verbatim as `<Route path="/shipments/:shipmentId" element={<ReviewScreen />} />` and its
  `must_haves.artifacts` requires `App.tsx` to contain `/shipments/:shipmentId`, but
  `src/client/screens/review/ReviewScreen.tsx` is in Task 2's `<files>`. Task 1's `<verify>` runs
  `npm run typecheck && npm run build:client && test -f dist/client/index.html` — all three fail
  on an unresolved module. Task 1's `<done>` also asserts `/shipments/:shipmentId` renders the
  review screen, which is not achievable at that gate.
  *Fix:* Add a minimal `ReviewScreen.tsx` placeholder to Task 1's `<files>` (Task 2 fills it in),
  or move the review route registration into Task 2 and have Task 1 register `/` + `*` only,
  adjusting Task 1's `<done>` accordingly.

- **04-PLAN.md** · `playwright_testing` · Tasks 1 and 2 add every UI component (`QueueScreen`,
  `QueueTable`, 8 shared components; then `ReviewScreen`, `ActionPanel`, `EvidenceRow`, 4 panels)
  but verify only with `typecheck && build:client && grep`, which cannot show that a row click
  navigates, that `action-submit` is genuinely disabled, or that a panel renders non-empty. A
  rendering defect from Task 1 surfaces two tasks later.
  *Fix:* move `e2e/queue.spec.ts` into Task 1's `<files>` with
  `npx playwright test e2e/queue.spec.ts --reporter=list` in its `<verify>`, and
  `e2e/review.spec.ts` into Task 2, leaving Task 3 to own `playwright.config.ts` and the
  cross-screen assertions.

- **04-PLAN.md** · `key_links_planned` · Task 1 step 9 specifies `enums.ts` as frozen arrays "so a
  filter can only ever send a value the server accepts", while step 12 requires a `422
  INVALID_QUERY_PARAM` on a restored filter to render `queue-error`. Task 3's queue spec asserts
  `page.goto('/?priority=URGENT')` renders `[data-testid="queue-error"]` and no `queue-table`. If
  URL-restored params are sanitised against the frozen enums, `URGENT` is dropped, the server
  never rejects, unfiltered data renders, and the assertion fails.
  *Fix:* state explicitly that the frozen enums constrain the **filter UI controls only**, and
  that `QueueQuery` values restored from `useSearchParams` are forwarded to the server verbatim so
  the server remains the validator.

- **03-PLAN.md** · `task_completeness` · Two of Task 3's gate commands are formatting-fragile and
  can fail on correct code: `test $(grep -rn "UPDATE cases" src/ | grep -c "status") -eq 1`
  requires `UPDATE cases` and `status` on the same physical line, so the idiomatic multi-line
  `UPDATE cases\n SET status = ?, ...` yields 0 and fails the gate; and
  `grep -rn "method:" src/server/routes/ | wc -l` expects 6 but `registry.ts` lives in that
  directory and enumerating routes there adds matches.
  *Fix:* use a whitespace-tolerant check, e.g.
  `test $(grep -rzoP 'UPDATE\s+cases\s+SET\s+status' src/ | grep -c .) -eq 1`, and count routes
  from the registry export rather than a raw `method:` grep.

- **04-PLAN.md, 05-PLAN.md** · `requirement_coverage` · Illustrative counts disagree with the
  seeded dataset. Plan 04's test-id contract shows `queue-result-count` as
  `"8 flagged shipments · showing 8"` and plan 05's readiness block shows
  `Seeded 12 entries · 8 flagged`. With 12 seeded shipments, one clean (`SHP-2026-0011`,
  `queued=0`) and one `CLEARED` (`SHP-2026-0009`) excluded by the default queue filters, the
  default queue is 10 rows. No assertion depends on the number, so this is cosmetic — but worth
  correcting so a reader does not treat 8 as a contract.
  *Fix:* correct the example strings; no assertion depends on the number.

## Informational

None — every finding was either answerable or auto-fixable, and per the triage rules no blocker
may be filed here.

Recorded but **not** raised as a finding, because it is a defended decision rather than drift: the
plans create the full `Y0a`/`Y0b` schema, including tables only excluded features would use
(`audit_entries`, `approvals`, `notifications`, `ai_outputs`). Plan 01's `<scope_boundary>` argues
this is F0's own DDL breadth and then enforces the line hard — zero rows, zero repositories, zero
endpoints on those tables, asserted by scope checks in plans 01, 02 and 03. The checker also
verified against the real DDL that `cases` has no CHECK on `approving_official_role` and that
`case_actions.audit_entry_id` is `TEXT NOT NULL` with no foreign key, so plan 03's "acting user as
official" approach and its `'AUDIT_NOT_IN_SCOPE'` sentinel both work as written.

## Open Questions

```yaml
- id: REVIEW-Q1
  source: plan-review
  header: "Plan size"
  question: "Five plans were produced where the wave schedule estimated nine, so plan 03 Task 2 touches 19 files and plan 04 Task 1 touches 28 — large enough that an executor may exhaust context mid-task. The replan can rewrite waves 3 and 4 to rebalance work across their tasks, but it cannot split a wave into extra plan files. How should I spend the single replan pass?"
  options:
    - "Rebalance waves 3 and 4 into smaller tasks"
    - "Fix the two blockers only, keep task sizes"
    - "Stop and use the phase route instead"
  default: "Rebalance waves 3 and 4 into smaller tasks"
  affects: [F3, F9, F17, F18]
  can_widen_scope: false
```

## Self-check

- [x] `answerable (1) + auto_fixable (6) + informational (0)` == 7 findings returned
- [x] No `blocker` sits in `informational` — both are `auto_fixable`
- [x] `REVIEW-Q1`'s `default` appears verbatim in its own `options`
- [x] No question offers re-adding an excluded feature
- [x] `REVIEW-Q1` carries `source: plan-review` and exactly the frozen eight keys
- [x] No cross-wave `dependency_correctness` finding was returned, so no `requires_rewave` marker
      is needed — both blockers are *within-plan* task ordering, fixable by a per-wave planner
- [x] Frontmatter `findings` counts equal the entry counts in the body sections
