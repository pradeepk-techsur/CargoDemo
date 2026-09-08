---
slug: cargodemo-cbp-cargo-exception-review-app
scope: reduced
deferred_features: [F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22]
stories_excluded_deferred: 41
flow_steps_verified: 6
flow_steps_total: 6
verified: 2026-09-08T22:39:49Z
build: passed
app_url: http://localhost:3000
smoke: passed
dead_links: 0
routes_failed: 0
test_attempts: 2
playwright_pass: 22
playwright_fail: 0
playwright_skip: 0
---

# UAT — Express Task: cargodemo-cbp-cargo-exception-review-app

**Verified:** 2026-09-08
**Build:** ✓ Passed
**Application:** http://localhost:3000

## Test Results

| Status | Count |
|--------|-------|
| ✓ Pass | 22 |
| ✗ Fail | 0 |
| — Skip | 0 |
| **Total** | **22** |

**Fix cycles used:** 2/10

The single fix cycle scoped one ambiguous test selector (`queue-clear-filters`
resolved to two visible elements — the app correctly renders the clear-filters
affordance both in the filters sidebar and inside the no-match empty state). The
application code was not defective and was not changed; the test assertion was
narrowed to the empty-state region so it is unambiguous.

## User Flow Coverage

Primary flow: JRN-01.1 (flag → review → act with a mandatory human justification)

| # | Step (what the user does) | Evidence (file:line) | Status |
|---|---------------------------|----------------------|--------|
| 1 | Opens the Cargo Exception Queue at `/` and sees flagged shipments in a table | e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts:43 | pass |
| 2 | Sees the canonical SHP-2026-0007 with three distinct exception chips (never "3 exceptions") | e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts:72 | pass |
| 3 | Opens SHP-2026-0007 by activating its row, landing on the Shipment Review screen | e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts:100 | pass |
| 4 | Reads the entry data and the per-exception validation cards with field-level evidence rows | e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts:117 | pass |
| 5 | Selects "Place on hold", sees only its fields, and Submit stays disabled until the justification is valid | e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts:164 | pass |
| 6 | Types a valid justification, submits, and sees the confirmation quoting it with the new ON_HOLD status | e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts:203 | pass |

All six primary-flow steps carry `file:line` evidence and a passing test.

## User Story Coverage

Stories in the built scope (F0, F2, F3, F4, F5, F9, F17, F18). Every story below
maps only to built features and was exercised by the generated UAT spec.

| Story | Title | Status |
|-------|-------|--------|
| US-0.1 | Persist the Full Cargo Exception Domain | pass |
| US-0.4 | Start with a Seeded, Deterministic Demo Dataset | pass |
| US-1.5 | See Field-Level Evidence for Every Exception | pass |
| US-3.1 | Take One of Exactly Five Actions on a Case | pass |
| US-3.3 | Send a Case for Specialist Review | pass |
| US-3.4 | Place a Case on Hold with a Stated Reason | pass |
| US-3.5 | Escalate a Case and Transfer Authority Upward | pass |
| US-9.2 | Work a Queue of Flagged Shipments | pass |
| US-9.3 | Filter and Sort the Queue Deterministically | pass |
| US-9.4 | See Multi-Exception Shipments Without Collapsing | pass |
| US-9.5 | See the Whole Case on One Review Screen | pass |

## Deferred by scope decision

Scope for this express run is **reduced** (`SCOPE-DECISION.md` → `deferred_scope`).
The stories below were NOT tested because their `Feature Ref:` includes at least
one deferred feature (F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20,
F21, F22). They are not failures and not gaps — the spec describes the whole
23-feature system while this build is the flag → review → act slice of JRN-01.1.

| Story | Title | Feature Ref (deferred) |
|-------|-------|------------------------|
| US-0.2 | Ingest Simulated Cargo Entries from a JSON File | F1 |
| US-0.3 | Post Cargo Entries to a Local Ingestion Endpoint | F1, F14 |
| US-0.5 | Consume One Consistent Backend API from the UI | F3, F14 |
| US-1.6 | Revalidate a Shipment After Its Evidence Changes | F6 |
| US-1.7 | Have Revalidation Recorded and the AI Refreshed | F6, F12, F13 |
| US-2.1 | Read a Plain-Language Summary of Why a Shipment Was Flagged | F7, F18 |
| US-2.2 | See Every AI Output Labelled and Attributed | F7, F8, F18, F19, F20 |
| US-2.3 | Continue the Walkthrough When the AI Provider Is Unavailable | F7, F8, F22 |
| US-2.4 | See a Recommended Resolution with an Explicit Confidence Level | F8, F19 |
| US-2.5 | Have Agreement or Divergence with the AI Recorded | F8, F12 |
| US-3.2 | Request Additional Information | F9, F10 |
| US-3.6 | Have Invalid Transitions Rejected with a Clear Reason | F9, F12 |
| US-3.7 | See Why an Action Is Unavailable to Me | F9, F19 |
| US-4.1 | Track the Lifecycle of a Document Request | F10 |
| US-4.2 | Upload a Simulated Document Against an Open Request | F10, F14 |
| US-4.3 | Be Prevented from Uploading Anything Other Than a Synthetic Document | F10 |
| US-4.4 | Have an Upload Trigger Revalidation Atomically | F10, F6 |
| US-4.5 | See Where Every Document Came From | F10, F18 |
| US-5.1 | Recommend Clearance and Route It to a Supervisor | F11, F9 |
| US-5.2 | Find Pending-Approval Work Without Hunting for It | F11, F17 |
| US-5.3 | Approve a Clearance as the Named Approving Official | F11, F12, F13 |
| US-5.4 | Reject or Return a Recommendation with a Reason | F11, F13 |
| US-5.5 | Be Warned When the Evidence Changed Since the Recommendation | F11, F6 |
| US-6.1 | Have Every Decision Recorded with All Eight Required Fields | F12 |
| US-6.2 | Be Blocked from Finalising an Incomplete Decision | F12, F21 |
| US-6.3 | Rely on the Record Being Append-Only | F12, F22 |
| US-6.4 | Read the Complete Case Timeline in Chronological Order | F12, F20 |
| US-6.5 | Export a Case Record for Offline Review | F12, F20 |
| US-6.6 | Read the Evidence as It Was at Decision Time | F12, F21 |
| US-7.1 | Have a Notification Generated on Every Decision and State Change | F13, F12 |
| US-7.2 | See Notifications In-App and Know They Were Never Sent | F13, F16, F20 |
| US-8.1 | Enter the Application as a Named Acting User | F14 |
| US-8.2 | Work Within My Role as a Cargo Specialist | F14 |
| US-8.3 | Work Within My Role as a Supervisor | F14 |
| US-8.4 | Have Authorisation Enforced Server-Side on Every Mutating Operation | F14, F21 |
| US-8.5 | Manage Business Rules as Configuration | F15, F14 |
| US-8.6 | Preview and Audit the Effect of a Rule Change | F15, F12, F6 |
| US-9.1 | Navigate the Application with My Role Always Visible | F16 |
| US-9.6 | See What Changed After a Revalidation | F18, F6 |
| US-9.7 | Decide from a Screen That States the AI Recommends and I Decide | F19 |
| US-9.9 | Replay the Complete Audit Trail on a Read-Only Screen | F20, F12 |

Additional deferred stories (Epic 10 test-suite family, Epic 11 walkthrough steps
3/5/6/7/8/9/10, Epic 12 governance guardrails referencing deferred approval/audit/AI
features) are likewise out of the built slice. The three governance headline claims —
the approval chain, the audit trail, and the AI assistance — are deferred by design;
this slice demonstrates governed exception detection and a justified human action.

## Failing Tests

None — all tests passed.

## Playwright Report

Test file: `e2e/uat/cargodemo-cbp-cargo-exception-review-app.spec.ts`
Results: `playwright-results.json`

Structure (walkthrough shape, `verify-mvp-mode`): three ordered sections —
1. Primary user flow — JRN-01.1 (flag → review → act) — 6 steps, all pass
2. Secondary flows (queue filters/sort/chips/empty-states, evidence detail,
   five-action visible-reason panel, send-for-review + escalate transitions)
3. Technical checks (seeded deterministic dataset, INVALID_QUERY_PARAM surfaced,
   deep-link render, unknown /api JSON error envelope)

## Build Log

Build system: npm
Build attempts: 1/10
Build status: ✓ Passed

The app is a Fastify API on 0.0.0.0:3000 serving the built React/Vite SPA from
`dist/client` same-origin; SQLite datastore seeded in-process at boot. UAT ran
against the production start command (`npm start`) via the project's own
`playwright.config.ts` webServer (fresh `./data/e2e.db` per run).

## Next Steps

All acceptance criteria **of the built scope** verified — 11 of 52 in-spec stories
tested; 41 deferred (see `## Deferred by scope decision`). Express task
cargodemo-cbp-cargo-exception-review-app is production-ready **for that scope**
(the flag → review → act slice of JRN-01.1), not for the full 23-feature spec.
To build the remainder, take the standard phase route per `SCOPE-DECISION.md` →
Graduation path.
