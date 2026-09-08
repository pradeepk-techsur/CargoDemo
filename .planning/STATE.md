---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed express/cargodemo-cbp-cargo-exception-review-app plan 05 (wave 5, integration)
last_updated: "2026-09-08T22:15:49.963Z"
last_activity: "2026-09-08 — Express wave 4 complete: F17 Cargo Exception Queue + F18 Shipment Review React/Vite SPA served by the wave-3 API on 0.0.0.0:3000 (134 vitest + 27 Playwright green)"
progress:
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-08)

**Core value:** A cargo specialist can open a flagged shipment, immediately understand *why* it was flagged and what evidence triggered it, and resolve it through a human-authored decision that is permanently traceable.
**Current focus:** Phase 1 — Seeded, Governed, Servable Foundation

## Current Position

Phase: 1 of 6 (Seeded, Governed, Servable Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-08 - UAT verified express task cargodemo-cbp-cargo-exception-review-app (22/22 passed, 1 fix cycle)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (express)
- Average duration: ~17 min
- Total execution time: 1.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| express-wave-1 | 1 | 9 min | 9 min |
| express-wave-2 | 1 | 14 min | 14 min |
| express-wave-3 | 1 | 21 min | 21 min |
| express-wave-4 | 1 | 16 min | 16 min |
| express-wave-5 | 1 | 25 min | 25 min |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table; technical decisions AD-01–AD-15 in `project_specs/TechArch/00-overview.md` §0.8.
Recent decisions affecting current work:

- [Roadmap]: Phases sequenced by the 10-step walkthrough, not by technical layer — steps 1–3 live after Phase 2, all ten after Phase 5.
- [Roadmap]: The four screens are paired with the backend they expose (F17/F18 → Phase 2, F19 → Phase 3, F20 → Phase 4); no final UI phase.
- [Roadmap]: Governance claims spread across Phases 1, 2, 3 and 5; the last phase (F15 rule administration) is deliberately non-load-bearing.
- [Roadmap]: F21 mapped wholly to Phase 5 because its E2E family cannot complete until step 10 exists; earlier phases still carry plan-level tests.
- [AD-08/AD-09]: Recommended action and confidence are always deterministic; `CARGODEMO_AI_PROVIDER=none` is the default and every phase's criteria hold with it.
- [AD-05/AD-06]: Deterministic port 3000 bound to 0.0.0.0, no frame-blocking headers — owned by Phase 1.
- [Wave 2]: `min_shipment_value_usd` param kept as spelled; compared as `shipment_value_cents/100 >= min_shipment_value_usd` (no column rename, no new column).
- [Wave 2]: Rules ordered by explicit SEVERITY_RANK DESC (LOW0/MED1/HIGH2/CRIT3), never string sort; same rank drives max(severity) in priority derivation.
- [Wave 2]: `evaluations.duration_ms` pinned to 0 under deterministic (seed/test) mode for byte-identical reseeds; live evaluations record the real value.
- [Wave 3]: CLEAR_EXCEPTION reaches CLEARED directly, recording the acting user as approving official (schema CHECK satisfied honestly); two-person approval deferred.
- [Wave 3]: Role dimension collapsed (access control out of scope) — every action attributed to usr-cs-001; PENDING_APPROVAL is seed-only inbound with its outbound rows permitted.
- [Wave 3]: Exactly one cases.status writer (workflowRepository.applyTransition), reachable only from executeAction; asserted by a source-walk test.
- [Wave 3]: Fastify ajv removeAdditional:false + queueService allow-list, because Fastify silently strips unknown querystring props; unknown param -> 422 INVALID_QUERY_PARAM.
- [Wave 4]: Client routes diverge from the mockups on purpose — queue at `/` (landing), review at `/shipments/:shipmentId` — because the application shell is deferred; the queue must be the root to be reachable without typing a URL.
- [Wave 4]: URL-restored QueueQuery params are forwarded to the server verbatim (never intersected with the frozen enums); the server is the sole validator, a 422 renders queue-error, not unfiltered data.
- [Wave 4]: The one UI-reachable action rejection is CASE_VERSION_CONFLICT (the panel disables unavailable actions), proven in cross-screen.spec by staling the held case_version.
- [Wave 5]: Single-command boot via `npm start` + `prestart` build guard — build-if-stale → migrate → seed-if-empty → assert queue non-empty (QUEUE_EMPTY_AFTER_SEED exit 1) → serve 0.0.0.0:3000. No docker-compose (SQLite is file-backed).
- [Wave 5]: Readiness probed by GET /api/queue (no health endpoint — that feature is deferred); the queue proves the whole data path in one request.
- [Wave 5]: The two Playwright harnesses are partitioned by testIgnore '**/journey/**' + disjoint DB files (e2e.db vs journey.db), run sequentially; the journey run always starts from a freshly seeded canonical shipment.
- [Wave 5]: The journey submits PLACE_ON_HOLD (NEW→ON_HOLD), non-terminal so the state change is visible on both screens; CLEAR_EXCEPTION avoided to not imply a supervisor approval that is deferred.

### Pending Todos

None yet.

### Blockers/Concerns

- [Spec context] Three spec masters are too large to read whole (FRD 4749 lines, TechArch 3407, UX-Mockup 2581, UserStories 1632). Use the chunked directories: `project_specs/FRD/`, `project_specs/TechArch/`, `project_specs/UX-Mockup/`, `project_specs/UserStories/`.
- [RTM G1] The four screens and shell have no dedicated component test family — coverage is E2E-only unless per-screen tests are added during phase planning.

### Express Tasks Completed

| # | Description | Date | Commit | UAT | Scope | Directory |
|---|-------------|------|--------|-----|-------|-----------|
| cargodemo-cbp-cargo-exception-review-app | CargoDemo — CBP cargo exception review app (flag → review → act slice of JRN-01.1) | 2026-09-08 | e92191b | ✓ 22/22 | mvp 8/23 | [cargodemo-cbp-cargo-exception-review-app](./express/cargodemo-cbp-cargo-exception-review-app/) |

## Session Continuity

Last session: 2026-09-08T22:15:49.962Z
Stopped at: Completed express/cargodemo-cbp-cargo-exception-review-app plan 05 (wave 5, integration)
Resume file: None

### Express task progress

- express/cargodemo-cbp-cargo-exception-review-app plan 01 (wave 1, database): COMPLETE — 21-table schema, F0 migrations/self-check, F2 12-shipment idempotent seed, typed repository contract published at src/infra/db. 24 integration tests green.
- express/cargodemo-cbp-cargo-exception-review-app plan 02 (wave 2, rules+detection): COMPLETE — F4 pure config-driven rule engine (three evaluators, closed map, Ajv, fingerprint), F5 one-transaction detection with write-time evidence gates + derived priority + queue projection, seed hook populates 12 evaluations / 15 exceptions / 33 evidence on migrate+seed. 78 tests green (9 files). detectExceptions/createEvaluateHook/derivePriority + ExceptionRecord projection published for wave 3.
- express/cargodemo-cbp-cargo-exception-review-app plan 03 (wave 3, workflow+API): COMPLETE — F9 pure state machine (35 transitions as data, four guards, mandatory justification), F3 six-route Fastify API bound 0.0.0.0:3000 with uniform error envelope + iframe-safe headers (no framing header/directive), transactional executeAction as the sole cases.status writer. 134 tests green (15 files). src/shared/api contract published for wave 4; CLEAR_EXCEPTION records acting user as approving official (two-person approval deferred). Fastify + @fastify/static added.
- express/cargodemo-cbp-cargo-exception-review-app plan 04 (wave 4, frontend): COMPLETE — F17 Cargo Exception Queue at `/` (server-side filter/sort, multi-exception chips, keyboard+pointer row nav, three empty/error states, URL-persisted query) + F18 Shipment Review at `/shipments/:shipmentId` (entry data, documents-as-absence, per-exception rule/authority/assertion/evidence, five-action panel gated on a mandatory human justification with server-advertised min, confirmation quoting justification in the human band, request_id error surfacing). React 18 + Vite 5 + React Router 6 + TanStack Query 5, CSS Modules; builds to dist/client, served same-origin by the wave-3 API on 0.0.0.0:3000. Client imports only src/shared/api. 27 Playwright tests (4 spec files; only cross-screen mutates state, on SHP-2026-0001) + 134 vitest still green. Application shell/nav/role switcher, AI/recommendation, upload, revalidate, audit, approval chain all deferred and unrendered.
- express/cargodemo-cbp-cargo-exception-review-app plan 05 (wave 5, integration): COMPLETE — THE SINGLE START COMMAND: `npm start` on a fresh checkout (no ./data, no dist/client) builds the client via a prestart guard (scripts/ensureClientBuild.mjs, build-if-stale), migrates, seeds with detection, asserts the queue is non-empty (QUEUE_EMPTY_AFTER_SEED exit 1 / worked-empty warning), and serves 0.0.0.0:3000 with a readiness block printing the literal preview URL. verify:preview (scripts/verifyPreview.mjs) boots the real command and proves iframe-safety (no X-Frame-Options / CSP frame-ancestors), deep-link fallback, JSON error envelope on unknown /api, no CORS, no dead client nav target — killing its own process group every exit. verify:journey (e2e/journey/primary-journey.spec.ts, partitioned config) is one 6-stage browser run: non-empty queue → SHP-2026-0007 opens → 3 evidenced exceptions (Malaysia|China, 8541.40 10-vs-6, missing cert) → PLACE_ON_HOLD with a typed ≥40-char justification → On hold on both screens; asserts no deferred surface renders. verify:all green (134 vitest + PREVIEW OK + 27 e2e + 6 journey). No docker-compose, no health/reset endpoint, no new dependency. Terminal wave of the build.
