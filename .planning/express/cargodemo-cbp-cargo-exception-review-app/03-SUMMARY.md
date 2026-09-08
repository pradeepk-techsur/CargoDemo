---
phase: express-wave-3
plan: 03
subsystem: api
tags: [fastify, http-api, state-machine, workflow, sqlite, error-envelope, iframe-csp, vitest, typescript]

requires:
  - phase: express-wave-1
    provides: "SQLite schema (cases/case_actions/idempotency_keys/request_log), repositories(db), user/case/cargo/document repositories, SystemClock/UuidGenerator, usr-cs-001 default actor"
  - phase: express-wave-2
    provides: "SEVERITY_RANK, ExceptionRecord projection (exceptionRepository.listByCaseWithEvidence), PriorityBasisEntry, populated evaluations/exceptions/evidence after seed"
provides:
  - "The six-route HTTP API surface: GET /api/queue, GET /api/shipments/:shipment_id(+/exceptions,/documents), GET /api/cases/:case_id/available-actions, POST /api/cases/:case_id/actions"
  - "src/shared/api — the verbatim request/response contract + ErrorEnvelope/ApiErrorCode catalog wave 4 imports"
  - "Pure src/domain/workflow state machine: TRANSITIONS (all 35 pairs), evaluateTransition, four guards, mandatory justification, computeAvailableActions"
  - "Transactional executeAction — the single reachable cases.status writer; getAvailableActions sharing the same decision fn"
  - "Fastify app bound 0.0.0.0:3000, uniform error envelope, X-Request-Id, iframe-safe headers (no framing header/directive), SPA fallback"
affects: [F17, F18, F19, F20, F21, wave-4, wave-5]

tech-stack:
  added: [fastify, "@fastify/static"]
  patterns:
    - "src/shared/api is the single contract import path; wave 4 imports only from it (never src/server/app/domain/infra)"
    - "src/domain/workflow is pure: no better-sqlite3, no node:fs, no fastify, no clock (injected)"
    - "Availability is derived by calling evaluateTransition, so projection and enforcement cannot disagree"
    - "The only cases.status write lives in workflowRepository.applyTransition, reachable only from executeAction"
    - "One BEGIN IMMEDIATE transaction per action: justification -> idempotency -> version -> actor -> decide -> side-effects -> action row -> transition"
    - "ajv removeAdditional:false so an unknown query param or extra body field is a loud 422, never absorbed"
    - "Money is a decimal string via integer-cents maths (centsToUsdString), never a JS number"

key-files:
  created:
    - src/shared/api/errors.ts
    - src/shared/api/types.ts
    - src/shared/api/index.ts
    - src/domain/workflow/types.ts
    - src/domain/workflow/stateMachine.ts
    - src/domain/workflow/guards.ts
    - src/domain/workflow/justification.ts
    - src/domain/workflow/availableActions.ts
    - src/app/actorService.ts
    - src/app/queueService.ts
    - src/app/shipmentService.ts
    - src/app/workflowService.ts
    - src/app/money.ts
    - src/server/plugins/errorMapper.ts
    - src/server/plugins/headers.ts
    - src/server/plugins/spa.ts
    - src/server/routes/registry.ts
    - src/server/routes/queue.ts
    - src/server/routes/shipments.ts
    - src/server/routes/cases.ts
    - src/server/app.ts
    - src/server/index.ts
    - src/infra/db/repositories/workflowRepository.ts
    - src/infra/db/repositories/idempotencyRepository.ts
    - tests/unit/workflow.stateMachine.test.ts
    - tests/unit/workflow.availableActions.test.ts
    - tests/integration/api.boot.test.ts
    - tests/integration/api.queue.test.ts
    - tests/integration/api.read.test.ts
    - tests/integration/api.actions.test.ts
  modified:
    - package.json
    - .env.example
    - src/server/config.ts
    - src/infra/db/index.ts

key-decisions:
  - "CLEAR_EXCEPTION reaches CLEARED directly and records the acting user as approving official; the two-person approval step is deferred, the schema CHECK is satisfied honestly, not weakened"
  - "PENDING_APPROVAL is a seed-only inbound status; its outbound rows are permitted (T27/T28/T30 modified) since their FRD reasons reference a pending recommendation this build never creates"
  - "The role dimension collapses (access control out of scope): every action attributed to usr-cs-001 resolved server-side; role-derived reason codes are unreachable"
  - "No audit/notification rows per transition; case_actions.audit_entry_id is the literal AUDIT_NOT_IN_SCOPE sentinel"
  - "Fastify ajv removeAdditional:false; unknown query params rejected in queueService allow-list too (Fastify strips unknown querystring props by default)"

patterns-established:
  - "Contract-first: src/shared/api written before the transport, greppable by wave 4/5"
  - "Iframe-safety asserted as an ABSENCE in the boot test; forbidden literals kept out of src/server/ and package.json"
  - "Human-authority asserted structurally: a source walk proves exactly one cases.status writer"

duration: 21min
completed: 2026-09-08
---

# Phase express-wave-3 Plan 03: Case Workflow State Machine & HTTP API Summary

**A pure `src/domain/workflow` state machine (all 35 status×action transitions as reviewable data, four guards, mandatory justification with a 40-char accepted/mixed clearance floor) and a Fastify server bound to `0.0.0.0:3000` exposing exactly six `/api` routes — the queue read, full shipment detail, exceptions-with-evidence, documents, available-actions, and the transactional action write — every failure in the uniform `{ error: { code, message, details?, field_errors?, request_id } }` envelope, and the only `cases.status` write reachable solely from an explicit, attributed, justified human action.**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-09-08T21:08:47Z
- **Completed:** 2026-09-08T21:29:40Z
- **Tasks:** 3
- **Files created/modified:** 34 (30 created, 4 modified)

## Accomplishments

- **F9 state machine (pure):** `TRANSITIONS` is one row per `(from, action)` pair over the 7 statuses × 5 actions with the FRD's T01–T33 ids; `evaluateTransition` checks terminal → row/redundancy → justification → guards, mutating nothing and reading no clock. Exactly six rows target `CLEARED` and every one is `CLEAR_EXCEPTION` — the countable expression of "only an explicit human clearance clears a case". Guards G-DOC/G-DUP/G-REC/G-ACK are pure predicates; `computeAvailableActions` returns all five actions with availability *derived from the same `evaluateTransition`*, so the projection and the write path cannot disagree.
- **F3 transport:** `buildApp` assembles request-id → iframe-safe headers → body-limit/JSON-parser → error-mapper → request_log → routes → SPA (last) in a fixed order; `index.ts` runs migrate → self-check → seed-if-empty (with wave 2's detection hook) → default-actor check → `listen({ host: '0.0.0.0', port: 3000 })`. Every non-2xx is the uniform envelope; every response carries `X-Request-Id`; `/api/*` carries `Cache-Control: no-store`; no framing header and no framing CSP directive is ever emitted.
- **The action write:** `executeAction` runs one `BEGIN IMMEDIATE` transaction — mandatory justification, idempotency replay, optimistic `If-Match-Case-Version`, server-resolved actor, the pure transition decision, action-specific side effects as columns + `parameters_json`, exactly one `case_actions` row, then the sole `applyTransition`. `CLEAR_EXCEPTION` populates the acting user as the approving official and `cleared_at`, satisfying the schema CHECK honestly.

## The six endpoints (with a real captured body each)

**`GET /api/queue`** — filter (status/exception_type/priority, include_clean/include_cleared), sort (priority via `SEVERITY_RANK`, age, updated_at, shipment_id, status), paginate. Canonical row:

```json
{"shipment_id":"SHP-2026-0007","case_id":"case-0007","importer_name":"Helios Import Partners LLC","carrier_name":"Transpacific Container Line","priority":"CRITICAL","priority_basis_summary":"Highest open-exception severity is CRITICAL; Shipment value 85000.00 >= 50000; VALUE_ESCALATION absorbed by CRITICAL ceiling; 3 open exceptions >= 3; MULTIPLICITY_ESCALATION absorbed by CRITICAL ceiling","status":"NEW","open_exception_count":3,"exception_types":[{"type":"CONFLICTING_COUNTRY_OF_ORIGIN","count":1},{"type":"INVALID_HTS_CODE","count":1},{"type":"MISSING_REQUIRED_DOCUMENT","count":1}],"exception_summary":"Origin conflict; HTS code issue; Missing documents","oldest_exception_opened_at":"2026-09-01T08:00:00.000Z","age_days":7,"assigned_to":null,"shipment_value_usd":"85000.00","updated_at":"2026-09-01T08:00:00.000Z"}
```

**`GET /api/shipments/:shipment_id`** — `SHP-2026-0007`: `hts_code "8541.40"`, `hts_digit_count 6`, `country_of_origin "Malaysia"`, `manufacturer.address.country "China"`, `shipment_value_usd "85000.00"`, `case.status "NEW"`, `case.priority "CRITICAL"`, `case.case_version 1788249600000`, `_links = {exceptions, documents, available_actions, actions}` (no link to a route that does not exist).

**`GET /api/shipments/:shipment_id/exceptions`** — `open.length === 3`; the origin exception carries an `OBSERVED` row (`country_of_origin` / `Malaysia` / `MY`) beside a `COMPARISON` row (`manufacturer.address.country` / `China` / `CN`); the HTS exception's `OBSERVED` has `expected "10 digits"`, `observed "6 digits"`; the document exception's `missing_information` names `CERTIFICATE_OF_ORIGIN` with `policy_reference "19 CFR 102.0"`.

**`GET /api/shipments/:shipment_id/documents`** — three baseline docs `RECEIVED` with filenames + `CERTIFICATE_OF_ORIGIN` `NOT_RECEIVED`, all Title Cased (`Certificate Of Origin`); `required_by_rules` populated from open exceptions; `requested` derived from `REQUEST_INFORMATION` history (null before any action).

**`GET /api/cases/:case_id/available-actions`** — `{ status: "NEW", actor: usr-cs-001, actions: [all five], case_version }`; every unavailable entry carries a non-null `reason` + `reason_text`.

**`POST /api/cases/:case_id/actions`** → `201` with `X-Case-Version` + `Location`. Real body (send-for-review on `case-0001`):

```json
{"action":"SEND_FOR_SPECIALIST_REVIEW","status":{"before":"NEW","after":"IN_REVIEW"},"acting_user":{"id":"usr-cs-001","name":"Marisol Reyes","role":"CARGO_SPECIALIST"},"case_version":1788902999428,"side_effects":{"document_types_requested":[],"case_assigned_to":null,"escalated_to":null,"hold_reason":null,"exceptions_cleared":[],"approving_official":null,"cleared_at":null}}
```

## The transition table as implemented (deviations from FRD F09a §2 called out)

| From | REQUEST_INFORMATION | SEND_FOR_SPECIALIST_REVIEW | CLEAR_EXCEPTION | PLACE_ON_HOLD | ESCALATE_TO_SUPERVISOR |
|---|---|---|---|---|---|
| NEW | AWAITING_INFORMATION | IN_REVIEW | **CLEARED** | ON_HOLD | ESCALATED |
| IN_REVIEW | AWAITING_INFORMATION | REDUNDANT | **CLEARED** | ON_HOLD | ESCALATED |
| AWAITING_INFORMATION | AWAITING_INFORMATION | IN_REVIEW | **CLEARED** | ON_HOLD | ESCALATED |
| ON_HOLD | AWAITING_INFORMATION | IN_REVIEW | **CLEARED** | REDUNDANT | ESCALATED |
| ESCALATED | AWAITING_INFORMATION | IN_REVIEW | **CLEARED** | ON_HOLD | REDUNDANT |
| PENDING_APPROVAL | AWAITING_INFORMATION | IN_REVIEW | **CLEARED** | ON_HOLD | ESCALATED |
| CLEARED | CASE_TERMINAL (all five) | | | | |

Deviations, each carrying a `note` string in `TRANSITIONS`:
- **CLEAR_EXCEPTION → CLEARED directly** (FRD sends it to PENDING_APPROVAL) — see the clearance boundary below.
- **Role dimension dropped**: T18 (ON_HOLD) and T21–T24 (ESCALATED) become permitted for the single actor; the reason codes `ROLE_NOT_PERMITTED`, `ESCALATED_REQUIRES_SUPERVISOR`, `HOLD_REQUIRES_RELEASE`, `SELF_APPROVAL_BLOCKED` are unreachable and never emitted.
- **PENDING_APPROVAL outbound rows T27/T28/T30 modified to permitted** — a seed-only inbound status; their FRD reasons all referenced a pending recommendation entity this build never creates.

## The clearance boundary

`CLEAR_EXCEPTION` transitions directly to `CLEARED` and records **the acting user as the approving official on their own decision** — `approving_official_user_id`, `approving_official_name`, `approving_official_role` and `cleared_at` are populated from the resolved actor, which is exactly what satisfies `CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL))`. The CHECK is **not** weakened, dropped or worked around. A genuine two-person specialist-to-supervisor approval step, where the approver must differ from the recommender, is **deferred** and not implemented here — wave 4 must label the control "Clear exception" and MUST NOT imply supervisor approval happened. Clearing also sets `open_exception_count = 0`, `queued = 0`, `exception_type_summary = ''` and marks the exact open set `CLEARED_BY_DECISION` (detection is not re-run).

## The five accepted ActionCommand bodies

- `REQUEST_INFORMATION`: `{ action, justification, document_types[1..10], requested_from?, due_by?, justify_unlisted_document? }` — unlisted type needs `justify_unlisted_document:true` + a ≥20-char justification.
- `SEND_FOR_SPECIALIST_REVIEW`: `{ action, justification, assign_to_user_id? }` — invalid assignee → 422 `ASSIGNEE_INVALID`.
- `CLEAR_EXCEPTION`: `{ action, justification, exception_ids[0..20], resolution_basis, acknowledge_outstanding_requests? }` — accepted/mixed basis raises the justification floor to 40.
- `PLACE_ON_HOLD`: `{ action, justification, hold_reason, hold_reason_detail?, review_by? }`.
- `ESCALATE_TO_SUPERVISOR`: `{ action, justification, escalation_reason, escalation_reason_detail?, escalate_to_user_id? }` — non-supervisor target → 422 `ESCALATION_TARGET_INVALID`.

Every variant is `additionalProperties: false`; a cross-schema property (e.g. `hold_reason` on an escalation) is a 422 `VALIDATION_FAILED`. Optional headers: `Idempotency-Key` (≤128), `If-Match-Case-Version` (integer).

## Reachable error codes

Transport: `RESOURCE_NOT_FOUND` (404), `MALFORMED_JSON` (400), `VALIDATION_FAILED`/`INVALID_QUERY_PARAM` (422), `PAYLOAD_TOO_LARGE` (413), `IDEMPOTENCY_KEY_REUSED`/`CASE_VERSION_CONFLICT` (409), `INTERNAL_ERROR` (500). Workflow: `INVALID_TRANSITION`/`TRANSITION_REDUNDANT`/`CASE_TERMINAL`/`DUPLICATE_DOCUMENT_REQUEST`/`DOCUMENT_ALREADY_RECEIVED`/`EXCEPTION_SET_STALE` (409), `ACTION_NOT_A_USER_ACTION`/`JUSTIFICATION_REQUIRED`/`DOCUMENT_TYPE_NOT_REQUIRED`/`OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED`/`ASSIGNEE_INVALID`/`ESCALATION_TARGET_INVALID` (422). Every body is `{ error: { code, message, details?, field_errors?, request_id } }`; SQL/stack traces/paths/env values are stripped.

## Label rules wave 4 will render

- **`exception_summary`** (queue): `MISSING_REQUIRED_DOCUMENT → "Missing documents"`, `INVALID_HTS_CODE → "HTS code issue"`, `CONFLICTING_COUNTRY_OF_ORIGIN → "Origin conflict"`, joined by `'; '` in persisted evaluation order.
- **`display_name`** (documents): the document type Title Cased — `CERTIFICATE_OF_ORIGIN → "Certificate Of Origin"`.
- **`priority_basis_summary`** (queue): `cases.priority_basis_json` entries' `detail` joined by `'; '`.

## shipment_value_usd conversion

Canonical column `cargo_entries.shipment_value_cents` (integer). API field `shipment_value_usd` is a decimal STRING via integer maths (`centsToUsdString`: `Math.trunc(abs/100)` + `String(abs%100).padStart(2,'0')`) — `8500000 → "85000.00"`. Never a float `.toFixed(2)`, never a JS number.

## Bind host, port, header set

Binds `0.0.0.0:3000` (`CARGODEMO_HOST`/`CARGODEMO_PORT`), no automatic port fallback. `npm start` = `tsx src/server/index.ts`. Headers: CSP `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'` (**no framing directive**), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` on `/api/*`, `X-Request-Id` everywhere, `X-Case-Version` on the action 201. **No framing header, no HSTS, no CORS.** The framing header must never be reintroduced, and its literal name must stay out of `src/server/` and `package.json` — three contract greps assert its absence.

## Task Commits

1. **Task 1: API contract + pure case workflow state machine** — `ca3a8db` (feat)
2. **Task 2: Fastify server, error envelope, iframe-safe headers, queue read** — `7ad1115` (feat)
3. **Task 3: complete API surface — shipment reads, available-actions, action write** — `aa66060` (feat)

_Plan metadata: this SUMMARY + STATE.md commit follows._

## Files Created/Modified

See frontmatter `key-files`. Highlights: `src/shared/api/{types,errors,index}.ts` (the contract), `src/domain/workflow/*` (pure state machine), `src/app/{workflowService,shipmentService,queueService,actorService,money}.ts`, `src/server/{app,index}.ts` + `plugins/*` + `routes/*`, `src/infra/db/repositories/{workflowRepository,idempotencyRepository}.ts`.

## Decisions Made

- **Clearance boundary** (above): acting user as approving official; two-person approval deferred; CHECK satisfied honestly.
- **PENDING_APPROVAL outbound permitted**; role dimension collapsed to the single actor.
- **Fastify ajv `removeAdditional:false`** plus a queueService allow-list, because Fastify silently strips unknown querystring properties by default — without both, an unknown filter would be absorbed rather than 422'd.
- **`resolution_reason` left NULL on decision clearance** (its enum is for revalidation-based resolution, not a human decision); `cleared_by_approval_id` NULL (approval chain deferred).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unknown query parameters were silently absorbed by Fastify**
- **Found during:** Task 2 (queue validation test)
- **Issue:** Fastify's default querystring AJV strips unknown properties, so `?wat=1` reached the handler as `{}` and returned 200 instead of the required 422 `INVALID_QUERY_PARAM` — a filter that quietly stops filtering.
- **Fix:** Set `ajv.customOptions.removeAdditional=false` on the Fastify factory (so `additionalProperties:false` errors instead of stripping) **and** added an explicit allow-list check in `parseQueueQuery`. Query/param validation failures are mapped to `INVALID_QUERY_PARAM` (body failures stay `VALIDATION_FAILED`).
- **Files modified:** src/server/app.ts, src/app/queueService.ts, src/server/plugins/errorMapper.ts
- **Verification:** `?wat=1`, `?status=NOPE`, `?sort=bogus:desc`, `?page_size=101` all 422 in api.queue.test.ts.
- **Committed in:** `7ad1115` (Task 2 commit)

**2. [Rule 2 - Missing Critical] include_cleared could not surface a cleared case (queued=0)**
- **Found during:** Task 3 (clearance end-to-end test)
- **Issue:** A cleared case has `queued=0`, so the default clean filter hid it even under `include_cleared=true`; the shipment could never reappear on the queue after clearance.
- **Fix:** When `include_cleared` is on and `include_clean` is off, the clean filter becomes `(queued = 1 OR status = 'CLEARED')`, so `include_cleared=true` surfaces cleared cases without also un-hiding clean non-cleared ones.
- **Files modified:** src/app/queueService.ts
- **Verification:** the clearance test asserts `SHP-2026-0007` leaves the default queue and reappears under `include_cleared=true`.
- **Committed in:** `aa66060` (Task 3 commit)

**3. [Rule 3 - Blocking] Doc-comment literals inflated the human-authority and route-count gates**
- **Found during:** Task 3 (source-walk test + route-count verify)
- **Issue:** The `UPDATE cases SET status` phrase in `workflowRepository.ts` comments and a `url: '/api/…'` example in `registry.ts` matched the case-insensitive, comment-matching gates (4 status-writes counted instead of 1; 7 route urls instead of 6).
- **Fix:** Rephrased the comments obliquely so only the real statement and the six real route literals are counted, exactly as the plan's scope boundary instructs for forbidden/countable literals.
- **Files modified:** src/infra/db/repositories/workflowRepository.ts, src/server/routes/registry.ts
- **Verification:** both `<verify>` gates now report a count of 1 and 6 respectively.
- **Committed in:** `aa66060` (Task 3 commit)

**4. [Rule 3 - Blocking] Plan `<verify>` uses `--reporter=list`, unsupported in vitest 1.6.1**
- **Found during:** all tasks (as recorded in waves 1 and 2)
- **Issue:** the installed vitest (1.6.1) does not accept `--reporter=list` and aborts.
- **Fix:** ran suites with vitest's default reporter (`npx vitest run <files>`), equivalent for pass/fail gating; the committed `npm test` uses the default reporter. No source change.
- **Files modified:** none (verification-invocation only)
- **Committed in:** n/a

---

**Total deviations:** 3 auto-fixed code changes (1 bug, 1 missing-critical, 1 blocking) + 1 tooling accommodation. **Impact:** all necessary for correctness (query safety, cleared-case visibility) or to pass the plan's own gates; no scope creep, no contract change.

## Known Stubs

None found. A scan of the Task 2/3 source (`src/app/*`, `src/server/*`, the two new repositories) for `TODO`/`FIXME`/`not implemented`/`coming soon` returns no hits. The `AUDIT_NOT_IN_SCOPE` sentinel written to `case_actions.audit_entry_id` is the plan's explicit, recorded deferral (the audit-record feature is out of scope), not incomplete code. The deferred surfaces (audit/notification rows, document-request lifecycle, two-person approval, AI assistance) are declared scope boundaries, verified absent by the excluded-tables scope check.

## Issues Encountered

None beyond the four deviations above.

## User Setup Required

None — SQLite is file-backed and needs no external service. `npm start` runs migrate → self-check → seed-if-empty → actor check → listen; no `docker-compose.yml` (wave 5 owns any single-command boot wrapper). Copy `.env.example` to `.env` only for non-default paths/ports.

## Self-Check: PASSED

- All 30 created key-files exist on disk (verified via typecheck + test imports resolving; the six route/service/repository files each back a green test).
- Three task commits exist: `ca3a8db`, `7ad1115`, `aa66060` (verified via `git log`).
- **Plan-level build/verify ran clean:** `npm run typecheck` (tsc --noEmit) exits 0; full `npx vitest run` = 134/134 across 15 files; `rm -rf data && npm run migrate && npm run seed` populates 12 evaluations / 15 exceptions / 33 evidence; `npm start` boots on `0.0.0.0:3000` and `curl /api/queue` returns 200 with `X-Request-Id` + `Cache-Control: no-store`, no `X-Frame-Options`, and `SHP-2026-0007` present (PREVIEW_OK); ROUTES_OK (6 unique /api urls), AUTHORITY_OK (exactly one cases.status writer), IFRAME_OK, LAYERS_OK (domain pure), SCOPE_OK (audit/notifications/approvals/recommendations/document_requests/ai_outputs/sessions all 0), NO_COMPOSE_OK; every `integration_contracts.provides` grep prints its CONTRACT_OK.
- `## Known Stubs` present, no blocking stub.

## Next Phase Readiness

- Wave 4 can build the queue and review screens against `src/shared/api` alone, with every response field declared verbatim here.
- Six routes exist and nothing else; the action write is the only state-changing path and is fully attributed and justified.
- Deferred and recorded for later waves: the two-person supervisor approval chain, the document request/upload lifecycle, audit/notification rows, AI summary/recommendation — all out of this build's scope, all with their tables verified empty.

---
*Phase: express-wave-3*
*Completed: 2026-09-08*
