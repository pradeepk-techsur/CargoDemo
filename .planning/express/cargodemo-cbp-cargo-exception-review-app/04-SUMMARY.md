---
phase: express-wave-4
plan: 04
subsystem: ui
tags: [react, vite, react-router, tanstack-query, css-modules, playwright, typescript, spa, iframe-safe]

requires:
  - phase: express-wave-3
    provides: "src/shared/api contract (QueueRow/ShipmentDetail/ExceptionView/DocumentView/AvailableAction/ActionCommand/ActionResult/ErrorEnvelope), the six /api routes, the 0.0.0.0:3000 server with dist/client SPA fallback and no frame-blocking header"
  - phase: express-wave-2
    provides: "Exception types, severities, field-level EvidenceRecord and MissingInformationItem shapes rendered on the review screen"
  - phase: express-wave-1
    provides: "The seeded 12-shipment dataset — canonical SHP-2026-0007 (CRITICAL, 3 exceptions), clean SHP-2026-0011, mutated-in-tests SHP-2026-0001"
provides:
  - "F17 Cargo Exception Queue screen at the root route / — server-side filter/sort, multi-exception chips, keyboard+pointer row navigation, three empty/error states, URL-persisted query"
  - "F18 Shipment Review screen at /shipments/:shipmentId — entry data, documents (missing shown as absence), validation results with rule/authority/assertion/field-level evidence, and the five-action panel gated on a mandatory human justification"
  - "A Vite client building to dist/client, served by the wave 3 API same-origin on 0.0.0.0:3000"
  - "A Playwright suite (4 spec files, 27 tests) driving the real built bundle; the full test-id inventory wave 5's journey run targets"
affects: [express-wave-5, F21]

tech-stack:
  added: [react, react-dom, react-router-dom, "@tanstack/react-query", vite, "@vitejs/plugin-react", "@playwright/test"]
  patterns:
    - "The client imports ONLY from src/shared/api — never src/server/app/domain/infra (TechArch layer rule)"
    - "src/client/api/client.ts is the only fetch call site: relative same-origin /api URLs, URLSearchParams, no client-side value validation, If-Match-Case-Version on mutations"
    - "URL-restored QueueQuery params are forwarded to the server VERBATIM; the server is the sole validator, a 422 renders queue-error not unfiltered data"
    - "api/enums.ts drives filter controls and labels only; formatUsd is string-only (no Number on money)"
    - "Availability, reason text and justification_min_length all come from the server's available-actions projection — the client never computes permission"
    - "The Playwright suite drives the production path (built bundle + npm start) against a throwaway e2e.db, one worker, alphabetical order; only cross-screen mutates state and only on SHP-2026-0001"

key-files:
  created:
    - vite.config.ts
    - playwright.config.ts
    - src/client/index.html
    - src/client/main.tsx
    - src/client/App.tsx
    - src/client/routes.ts
    - src/client/styles/app.css
    - src/client/api/client.ts
    - src/client/api/enums.ts
    - src/client/api/hooks.ts
    - src/client/components/ui.tsx
    - src/client/components/ui.module.css
    - src/client/components/EvidenceRow.tsx
    - src/client/components/EvidenceRow.module.css
    - src/client/screens/queue/QueueScreen.tsx
    - src/client/screens/queue/QueueFilters.tsx
    - src/client/screens/queue/QueueTable.tsx
    - src/client/screens/queue/Queue.module.css
    - src/client/screens/review/ReviewScreen.tsx
    - src/client/screens/review/EntryDataPanel.tsx
    - src/client/screens/review/DocumentsPanel.tsx
    - src/client/screens/review/ValidationResultsPanel.tsx
    - src/client/screens/review/ActionPanel.tsx
    - src/client/screens/review/JustificationInput.tsx
    - src/client/screens/review/Review.module.css
    - e2e/shell.spec.ts
    - e2e/queue.spec.ts
    - e2e/review.spec.ts
    - e2e/cross-screen.spec.ts
  modified:
    - package.json
    - tsconfig.json
    - tests/integration/api.boot.test.ts

key-decisions:
  - "Route strings deliberately diverge from the mockups (/, /shipments/:shipmentId) because the application shell is deferred; the queue must be the landing route to be reachable without typing a URL"
  - "The cross-screen rejection is proven via CASE_VERSION_CONFLICT (an out-of-band transition staled the panel's held case_version) — the only server rejection reachable through a UI that disables unavailable actions"
  - "The wave-3 api.boot SPA-fallback test was updated to accept the built bundle HTML as well as the not-built notice, since building dist/client changes that route's response"

patterns-established:
  - "Task-local verify honesty: each task's <verify> passes using only files it and its predecessors created; App.tsx grows one route per task"
  - "Iframe safety asserted on the real served document in shell.spec.ts (no x-frame-options, no CSP frame-ancestors)"
  - "Human authority asserted structurally: the submit control is disabled until the server-advertised justification minimum is met, proven in three browser steps"

duration: 16min
completed: 2026-09-08
---

# Phase express-wave-4 Plan 04: Cargo Exception Queue & Shipment Review Screens Summary

**A routed React 18 + Vite 5 SPA served by the wave 3 API on `0.0.0.0:3000` as the same origin — the Cargo Exception Queue at the root route `/` (server-side filter/sort, one chip per distinct exception type, keyboard+pointer row navigation, three distinct empty/error states, URL-persisted query) and the Shipment Review screen at `/shipments/:shipmentId` (entry data, documents with missing ones shown as explicit absences, validation results carrying each rule's authority, assertion and field-level evidence, and a five-action panel whose submit stays inert until a human types a justification meeting the server-advertised minimum) — proven end to end by a 27-test Playwright suite driving the real built bundle.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-09-08T21:34:39Z
- **Completed:** 2026-09-08T21:50:40Z
- **Tasks:** 3
- **Files created/modified:** 32 (29 created, 3 modified)

## Accomplishments

- **F17 Cargo Exception Queue at `/`** — the preview URL with no path lands on the flagged shipments, no login, no shell, no intermediate screen. Rows show shipment ID, importer, one `ExceptionTypeChip` per distinct type (the canonical row shows three, never "3 exceptions"), priority, status, age and value. Filtering/sorting go through the server; applied chips render from the server's `applied` block; the clean shipment (`SHP-2026-0011`) is off the queue by default. A URL-restored filter the contract rejects (`?priority=URGENT`) surfaces `queue-error` with the `request_id` rather than unfiltered data.
- **F18 Shipment Review at `/shipments/:shipmentId`** — reached only by clicking a queue row, with a `Back to queue` link on every state. Nine entry fields (conflicting country emphasised, HTS digit-count annotated), documents with text status labels and a missing certificate shown as an explicit absence, one card per open exception carrying rule name/description, **Authority** (policy reference), assertion, ≥1 field-level evidence row and its missing-information list.
- **The governance surface** — the action panel renders all five actions on every render in fixed order; unavailable ones are disabled with the server's `reason_text` in the layout (not a tooltip). The justification textarea is empty on arrival, has a live counter against `justification_min_length` from the server, and the submit control is disabled until every required field including the justification is valid. A success shows a confirmation panel naming `{before} → {after}` and quoting the justification in the human band under the actor's name; a rejection shows the message + `request_id` inline and keeps the typed text; `CASE_VERSION_CONFLICT` refetches instead of retrying.
- **Proven in a real browser** — `npx playwright test` runs 27 tests across `shell`, `queue`, `review` and `cross-screen`, 0 failing, 0 skipped, against the production path (`npm run build:client && npm start`) on a throwaway `./data/e2e.db`.

## Routes, build and commands

- **Routes:** exactly two plus an inline not-found — `/` (queue, the landing screen) and `/shipments/:shipmentId` (review). No `/queue`, `/session`, `/admin`, `/notifications`, resolution or audit route. History routing; the wave 3 SPA fallback resolves deep links on reload.
- **Build output:** `npm run build:client` (aliased by `npm run build`) → `dist/client/` (index.html + hashed assets). Production serves it via `npm start` on `0.0.0.0:3000`, same origin — the frontend binds no port in production.
- **Dev inner loop:** `npm run dev:client` → Vite on `0.0.0.0:3001` proxying `/api` to `:3000` (never used by a demo or wave 5).
- **One-time prerequisite:** `npx playwright install --with-deps chromium` before the first `npm run test:e2e`; the config installs nothing itself.

## The four spec files (and which mutates state)

| File | Tests | Mutates? | Acts on |
|---|---|---|---|
| `e2e/shell.spec.ts` | 4 | no | served document only |
| `e2e/queue.spec.ts` | 10 | no | reads; navigates |
| `e2e/review.spec.ts` | 8 | no | canonical `SHP-2026-0007`, left untouched |
| `e2e/cross-screen.spec.ts` | 5 | **yes** | `SHP-2026-0001` only |

Playwright runs one worker in alphabetical order (`cross-screen`, `queue`, `review`, `shell`); the mutating spec runs first and touches only `SHP-2026-0001`, so the canonical `SHP-2026-0007` stays at `New` for every other spec and for wave 5.

## Test-id inventory (wave 5's journey-run selectors)

- **Queue:** `queue-screen`, `queue-loading`, `queue-error`, `queue-empty`, `queue-result-count`, `queue-table`, `queue-row`, `queue-row-{SHIPMENT_ID}`, `queue-row-shipment-id`, `queue-row-importer`, `queue-row-exceptions`, `queue-row-exception-chip` (with `data-exception-type`), `queue-row-priority`, `queue-row-status`, `queue-row-age`, `queue-filter-status`, `queue-filter-exception-type`, `queue-filter-priority`, `queue-sort-field`, `queue-sort-direction`, `queue-applied-filters`, `queue-clear-filters`. Rows carry `data-shipment-id`.
- **Review:** `review-screen`, `review-loading`, `review-error`, `review-not-found`, `back-to-queue`, `review-shipment-id`, `review-status`, `review-priority`, `review-value`, `entry-data-panel`, `entry-field-{importer|carrier|product-description|hts-code|country-of-origin|manufacturer-name|manufacturer-address|shipment-value|entry-date}`, `documents-panel`, `document-row`, `document-row-{TYPE}` (with `data-document-type`/`data-document-status`), `document-status`, `validation-results-panel`, `exception-card` (with `data-exception-type`/`data-exception-id`), `exception-rule-name`, `exception-policy-reference`, `exception-assertion`, `exception-severity`, `exception-missing-information`, `evidence-row` (with `data-field-path`), `resolved-exceptions-disclosure`, `action-panel`, `action-option-{ACTION}` (with `data-available`), `action-unavailable-reason`, `field-document-types`, `field-resolution-basis`, `field-hold-reason`, `field-escalation-reason`, `field-assign-to`, `justification-input`, `justification-counter`, `action-submit`, `action-error`, `action-confirmation`.

## Task Commits

1. **Task 1: scaffold the Vite/React client — API layer, UI kit, router, Playwright harness** — `5de9636` (feat)
2. **Task 2: Cargo Exception Queue at the root route** — `a5088b0` (feat)
3. **Task 3: Shipment Review screen with the five-action justification panel** — `61d4018` (feat)

_Plan metadata: this SUMMARY + STATE.md commit follows._

## Files Created/Modified

See frontmatter `key-files`. Highlights: `vite.config.ts` + `playwright.config.ts` (build + harness), `src/client/api/{client,enums,hooks}.ts` (the only network layer), `src/client/components/{ui,EvidenceRow}.tsx` (the shared kit), `src/client/screens/queue/*` and `src/client/screens/review/*` (the two screens), and the four `e2e/*.spec.ts` files.

## Decisions Made

- **Route strings diverge from the mockups on purpose** (`/` and `/shipments/:shipmentId`, not `/queue` and `/shipments/:id/review`): the application shell that owns the nav rail is deferred, so the queue must be the landing route to be reachable without typing a URL. Wave 5 was planned against these two paths.
- **The cross-screen rejection uses `CASE_VERSION_CONFLICT`.** The panel only enables actions the server marks available, so a redundant/invalid transition is never reachable through the radios. The test stales the panel's held `case_version` with an out-of-band transition, then submits — the deterministic, UI-reachable rejection that also proves "keep the typed justification" and "surface the request_id".
- **`CLEAR_EXCEPTION` is labelled "Clear exception"**, never "Approve", and its helper text says the acting user is recorded as making the decision — the two-person approval chain is deferred and the label must not claim otherwise.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wave-3 SPA-fallback test asserted the "not built" notice, which is wrong once dist/client exists**
- **Found during:** Task 3 (running `npm test` after the client build)
- **Issue:** `tests/integration/api.boot.test.ts` asserted the non-`/api` route returns the text/plain "CargoDemo API is running; client bundle not built" notice. Building `dist/client` (this wave's whole point) makes the SPA fallback correctly serve `index.html` instead, so the assertion failed (1/134).
- **Fix:** The test now branches on `content-type`: the built SPA HTML (`<div id="root">`) OR the not-built notice, both a 200 — matching `spa.ts`'s actual two-state behaviour. No server code changed.
- **Files modified:** tests/integration/api.boot.test.ts
- **Verification:** `npm test` = 134/134 both with and without a built bundle.
- **Committed in:** `61d4018` (Task 3 commit)

**2. [Rule 3 - Blocking] Doc-comment literals tripped the task's own forbidden-literal greps**
- **Found during:** Tasks 1–2 (running each task's `<verify>`)
- **Issue:** A `100vw / 100vh` mention in an `app.css` comment matched Task 1's `! grep ... 100vw|100vh` guard; and the `type="checkpoint"`-style column-name check in the "no action controls" queue test needed to avoid matching the "Clear all filters" button. Both are the same class of false positive wave 3 recorded.
- **Fix:** Rephrased the CSS comment to "viewport units" and narrowed the queue test's forbidden-name regex to `clear exception` (not bare `clear`), so only real violations are counted.
- **Files modified:** src/client/styles/app.css, e2e/queue.spec.ts
- **Verification:** every task's `<verify>` prints `CONTRACT_OK`.
- **Committed in:** `5de9636` / `a5088b0` (task commits)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking). **Impact:** the bug fix keeps the wave-3 suite green now that the bundle is built (necessary for correctness); the blocking fixes are comment/regex hygiene with no behavioural change. No scope creep, no contract change, no invented API field.

## Issues Encountered

None beyond the two deviations above. The `tsconfig.json` `types` array was left untouched (CSS-module and `import.meta.env` typings come from a `/// <reference types="vite/client" />` line in `main.tsx`/`routes.ts`), so `npm run typecheck` still covers the wave 1-3 server code.

## Known Stubs

None blocking. A scan of `src/client/` for `TODO`/`FIXME`/`not implemented`/`coming soon` returns only: (a) HTML `placeholder=` attributes on real form inputs (legitimate input hints, not stubs), and (b) doc-comments that explicitly describe deferred surfaces ("there is no upload control", "there is no approve/reject control") to document scope. No deferred UI is rendered — `review.spec.ts`'s "nothing deferred is on screen" test asserts at runtime that the page body matches none of `AI-generated|Recommended action|Model confidence|Revalidate|Audit record/trail|Upload|Approve clearance|Supervisor approval`.

## User Setup Required

None — the client is static assets served by the existing wave 3 API; SQLite is file-backed and needs no external service. The one operational note is a **one-time** `npx playwright install --with-deps chromium` before the first `npm run test:e2e`.

## Self-Check: PASSED

- All 29 created key-files exist on disk (verified via `npm run typecheck` resolving every import and `npm run build:client` bundling them).
- Three task commits exist: `5de9636`, `a5088b0`, `61d4018` (verified via `git log`).
- **Plan-level build/verify ran clean:** `npm run typecheck` (tsc --noEmit, covering server + client) exits 0; `npm run build:client` produces `dist/client/index.html` + hashed assets; `npm test` = 134/134 vitest; `npx playwright test` = 27/27 across all four spec files, 0 failing, 0 skipped; preview smoke on `0.0.0.0:3000` returns `200 text/html` with a CSP carrying no `frame-ancestors` and no `X-Frame-Options`, and a deep link to `/shipments/SHP-2026-0007` returns the same SPA HTML. Every task's `<verify>` and the plan's provides-artifact greps print `CONTRACT_OK`/`ROUTES_OK`/`ACCESS_OK`/`BUILD_OK`.
- `## Known Stubs` present, no blocking stub.

## Next Phase Readiness

- Wave 5 can wire and prove the full stack: both screens render against `src/shared/api` alone, the four spec files and their stable test ids are a reusable regression asset, and the canonical `SHP-2026-0007` is left unmutated at `New`.
- The preview renders in an iframe: `npm start` serves `dist/client` same-origin on `0.0.0.0:3000` with no frame-blocking header.
- Deferred and recorded (not rendered anywhere): the application shell/nav/role switcher, AI summary/recommendation/confidence, document upload/download lifecycle, revalidation diff, audit history, two-person approval chain.

---
*Phase: express-wave-4*
*Completed: 2026-09-08*
