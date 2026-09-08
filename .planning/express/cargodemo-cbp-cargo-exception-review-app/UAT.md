---
slug: cargodemo-cbp-cargo-exception-review-app
scope: reduced
deferred_features: [F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22]
stories_excluded_deferred: 15
flow_steps_verified: 6
flow_steps_total: 6
verified: 2026-09-08T22:22:59Z
build: passed
app_url: http://localhost:3000
smoke: passed
dead_links: 0
routes_failed: 0
test_attempts: 1
playwright_pass: 33
playwright_fail: 0
playwright_skip: 0
---

# UAT — Express Task: cargodemo-cbp-cargo-exception-review-app

**Verified:** 2026-09-08T22:22:59Z
**Build:** ✓ Passed
**Application:** http://localhost:3000
**Scope:** Reduced — 8 of 23 features (JRN-01.1 flag → review → act slice)

## Test Results

| Status | Count |
|--------|-------|
| ✓ Pass | 33 |
| ✗ Fail | 0 |
| — Skip | 0 |
| **Total** | **33** |

**Fix cycles used:** 0/10

Composition: 6 primary-journey tests (`e2e/journey/primary-journey.spec.ts`) +
27 e2e tests across queue, review, cross-screen and shell (`e2e/*.spec.ts`).

## User Flow Coverage

Primary flow: JRN-01.1 — flagged queue to a justified, propagated decision

| # | Step (what the user does) | Evidence (file:line) | Status |
|---|---------------------------|----------------------|--------|
| 1 | Opens the queue and sees flagged shipments | e2e/journey/primary-journey.spec.ts:46 | pass |
| 2 | Finds the canonical solar-panel shipment (SHP-2026-0007) and opens it | e2e/journey/primary-journey.spec.ts:76 | pass |
| 3 | Reads the exceptions with their triggering rule and field-level evidence | e2e/journey/primary-journey.spec.ts:110 | pass |
| 4 | Submits an action with a mandatory justification | e2e/journey/primary-journey.spec.ts:194 | pass |
| 5 | Sees the state change reflected on both the review screen and the queue | e2e/journey/primary-journey.spec.ts:244 | pass |
| 6 | Integrity guards hold (single status writer, no deferred surfaces) | e2e/journey/primary-journey.spec.ts:261 | pass |

## User Story Coverage

Coverage is against the built scope (features F0, F2, F3, F4, F5, F9, F17, F18).
Each in-scope capability is exercised by the suites below.

| Area | Feature | Suite | Status |
|-------|---------|-------|--------|
| Cargo Exception Queue (landing, columns, chips, filter/sort, nav) | F17 | e2e/queue.spec.ts (10 tests) | pass |
| Shipment Review (entry data, documents-as-absence, evidence, 5-action panel, justification gate) | F18, F9, F5 | e2e/review.spec.ts (8 tests) | pass |
| Action submit → confirmation → propagation → rejection handling | F9, F3 | e2e/cross-screen.spec.ts (5 tests) | pass |
| Served SPA document, same-origin API, deep-link fallback, no frame-blocking | F17/F18, F3 | e2e/shell.spec.ts (4 tests) | pass |
| End-to-end flag → review → act journey on canonical seed | F0, F2, F3, F4, F5, F9, F17, F18 | e2e/journey/primary-journey.spec.ts (6 tests) | pass |

## Deferred by scope decision

These stories were NOT tested because their features are deferred from this build
(`SCOPE-DECISION.md` → `deferred_scope`). They are not failures and not gaps —
the functionality was deliberately not built for this express slice.

| Feature | Name | Deferred story areas |
|---------|------|----------------------|
| F1 | Cargo Entry Ingestion (JSON / local API) | second ingestion interface |
| F6 | Shipment Revalidation | walkthrough step 7 |
| F7 | AI Plain-Language Shipment Summary | walkthrough step 3 |
| F8 | AI Recommended Resolution with Confidence | walkthrough step 4 (advisory) |
| F10 | Document Request & Simulated Upload | walkthrough steps 5–6 |
| F11 | Specialist → Supervisor Approval Chain | walkthrough steps 8–9 |
| F12 | Decision & Audit Record | walkthrough step 10 |
| F13 | Notification Generation | notifications off decisions |
| F14 | Role Simulation & RBAC | roles + server-side enforcement |
| F15 | Rule Administration | in-app rule editing |
| F16 | Application Shell, Navigation & Role Switcher | persistent shell/nav |
| F19 | Recommended Resolution Screen | AI decision-support surface |
| F20 | Decision & Audit Record Screen | audit surface |
| F21 | Automated Test Suite | governance-claim test family |
| F22 | Demo Environment & Reset | one-action reset |

The build demonstrates *governed exception detection and a justified human action*.
It does not demonstrate the approval chain, the audit trail, or the AI assistance —
the product's three headline governance claims — which are the first items on the
graduation path in `SCOPE-DECISION.md`.

## Failing Tests

None — all tests passed.

## Playwright Report

Test files:
- `e2e/journey/primary-journey.spec.ts` (config: `playwright.journey.config.ts`)
- `e2e/queue.spec.ts`, `e2e/review.spec.ts`, `e2e/cross-screen.spec.ts`, `e2e/shell.spec.ts` (config: `playwright.config.ts`)

Both configs drive the PRODUCTION path (`npm start` — prestart client build →
migrate → seed → serve on 0.0.0.0:3000) against a throwaway seeded SQLite DB, so
each run begins from a freshly seeded canonical shipment.

## Build Log

Build system: npm
Build: `npm run build:client` → `dist/client/` produced (client bundle up to date on boot)
Boot: single-command `npm start` reached a served, seeded app on 0.0.0.0:3000
Boot smoke (dev-server wrapper `.pivota/start-dev.sh`): pass — port bound, `/` 200,
`/api/queue` 200 with real seeded rows, no fatal markers
Route/nav smoke: dead_links=0, routes_failed=0

## Next Steps

All acceptance criteria **of the built scope** verified — the 8 in-scope features
across 33 Playwright tests; 15 features deferred (see `## Deferred by scope decision`).
Express task `cargodemo-cbp-cargo-exception-review-app` is production-ready **for that
scope**, not for the full 23-feature spec. To build the remainder, follow the
graduation path in `SCOPE-DECISION.md` (standard phase route).
