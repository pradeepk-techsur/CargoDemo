---
schema_version: 1
slug: cargodemo-cbp-cargo-exception-review-app
round: 1
asked_at: 2026-09-08T19:32:00Z
answered_at: 2026-09-08T19:34:00Z
questions_assembled: 3
questions_asked: 3
questions_defaulted: 0
replan_ran: true
scope_recut: false
---

# Clarifications — CargoDemo (CBP cargo exception review app)

## What was asked

Three questions were assembled from two producers — two from `pivota_spec-scope-auditor`
(`SCOPE-DECISION.md`) and one from the plan check (`PLAN-REVIEW.md`). No PRD-gap questions were
synthesised: the auditor's `budget.gap_trip` was `false` and it recorded no gap against a selected
feature. The cap is four, so all three were asked in a single `question` call. All three were
answered by the user; none was defaulted.

Ranked by what the answer moves: `SCOPE-Q1` first (it changes which journey is built end-to-end),
then `SCOPE-Q2` (it can move which features are selected), then `REVIEW-Q1` (a warning-severity
plan-quality tradeoff).

## What was decided

```yaml
- id: SCOPE-Q1
  source: scope-decision
  question: "This spec is 23 features and express reliably builds about 8, so I'm building one slice of the 10-step walkthrough end-to-end and deferring the rest. I picked flag the shipment, review it, then act on it with a justification. Keep that slice, or start somewhere else?"
  answer: "Keep: flag, review, then act"
  answered_by: user
  affects: [F3, F7, F9, F11, F12, F18, F19, F20]
  effect: "Primary journey unchanged (JRN-01.1 front slice). No re-cut; included_features and excluded_features stand as audited."

- id: SCOPE-Q2
  source: scope-decision
  question: "The audit record and its screen (walkthrough step 10) do not fit alongside the slice I picked. I can trade one selected feature for it, but not add it on top. Which trade do you want?"
  answer: "Keep as is: no audit trail"
  answered_by: user
  affects: [F3, F12, F18, F20]
  effect: "No trade made. The audit record and audit screen remain excluded from this build. Decisions and their mandatory justifications are still persisted to case action history, so the disposition is recoverable even though the dedicated audit surface is out of scope."

- id: REVIEW-Q1
  source: plan-review
  question: "Five plans were produced where the wave schedule estimated nine, so plan 03 Task 2 touches 19 files and plan 04 Task 1 touches 28 — large enough that an executor may exhaust context mid-task. The replan can rewrite waves 3 and 4 to rebalance work across their tasks, but it cannot split a wave into extra plan files. How should I spend the single replan pass?"
  answer: "Rebalance waves 3 and 4 into smaller tasks"
  answered_by: user
  affects: [F3, F9, F17, F18]
  effect: "Waves 3 and 4 replanned: both blockers fixed, oversized tasks rebalanced, per-task browser proof added, fragile grep gates replaced. Wave-external integration contracts held constant so wave 5 stays valid."
```

## Not asked (taken on default)

None. Three questions were assembled and the cap is four, so nothing ranked below the cut and
nothing was dropped by the invariant re-check.

## What changed in the plans

**Scope:** unchanged. No answer moved a feature, so `SCOPE-DECISION.md` was not rewritten and
`scope_recut` is `false`. `mvp_scope.included_features` remains `[F0, F2, F3, F4, F5, F9, F17,
F18]` and `deferred_scope.excluded_features` remains the same 15 IDs.

**`WAVE-SCHEDULE.md`:** no patch required, and this was checked rather than assumed. The reconcile
rule is `features: <- (the wave's features) minus excluded_features plus any feature an answer
moved into this wave`. No re-cut occurred and no answer moved a feature between waves, so every
wave's `features:` line already matches the post-clarification plan set.

**Replanned waves (one pass, parallel):**

- **Wave 3 — `03-PLAN.md`** · rewritten. Fixes the blocker where Task 2's `api.boot.test.ts`
  asserted six routes and a malformed-JSON case while `routes/cases.ts` was not created until Task
  3; rebalances Task 2 (was 19 files); and replaces two formatting-fragile gate commands (the
  single-physical-line `UPDATE cases` grep and the `method:` count that also matched
  `registry.ts`).
- **Wave 4 — `04-PLAN.md`** · rewritten. Fixes the blocker where Task 1's `App.tsx` imported a
  `ReviewScreen` that Task 2 created; rebalances Task 1 (was 28 files); moves
  `e2e/queue.spec.ts` into Task 1 and `e2e/review.spec.ts` into Task 2 so each screen gets browser
  proof in the task that builds it; resolves the frozen-enum contradiction by constraining the
  enums to the filter UI controls only and forwarding URL-restored `QueueQuery` values verbatim so
  the server stays the validator; and corrects the illustrative `queue-result-count` example.

Both replanned waves were required to hold their `integration_contracts.provides` constant, so
wave 5's declared requirements remain satisfied and wave 5 did not need replanning.

**Applied directly (mechanical and local, no planner spawned):**

- **`05-PLAN.md`** · corrected the illustrative readiness string from `Seeded 12 entries · 8
  flagged` to `10 flagged`. With 12 seeded shipments, one clean (`SHP-2026-0011`, `queued=0`) and
  one `CLEARED` (`SHP-2026-0009`) are excluded by the default queue filters, leaving 10 default
  rows. No assertion depended on the number; the fix stops a reader treating 8 as a contract.

**Not re-checked.** Per the one-pass bound the replanned files are not sent back to the plan
checker. They are judged by scope gate 2 and by the user's pre-launch review.

## Self-check

- [x] Exactly one `question` call was made in this run
- [x] `CLARIFICATIONS.md` exists and all 3 assembled questions have an entry
- [x] No question asked *whether* to reduce scope — `SCOPE-Q1` and `SCOPE-Q2` both ask *which*
- [x] No re-cut happened, so `SCOPE-DECISION.md` was not rewritten
- [x] The plan set did not move, so `WAVE-SCHEDULE.md` needed no `features:` patch (verified)
- [x] No new route, table, scope value or UI component was created
