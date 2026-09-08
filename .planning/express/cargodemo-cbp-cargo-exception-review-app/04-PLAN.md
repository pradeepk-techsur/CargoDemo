---
phase: express-wave-4
plan: 04
type: execute
wave: 4
domain: frontend
depends_on: [3]
autonomous: true
files_modified:
  - package.json
  - tsconfig.json
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

features:
  implements: ["F17", "F18"]
  depends_on: ["F3", "F9", "F5", "F0", "F2"]
  enables: []

must_haves:
  truths:
    - "Opening the app root URL shows the Cargo Exception Queue with the flagged shipments listed — no URL typing, no login, no landing page in between."
    - "Each queue row shows shipment ID, importer, exception(s), priority and status, and a multi-exception shipment shows one chip per distinct exception type rather than a count."
    - "Clicking or keyboard-activating a queue row opens that shipment's review screen; a back link returns to the queue."
    - "The review screen shows the entry fields, the documents with their received/not-received state, and every open exception with its triggering rule, policy reference and field-level evidence."
    - "The action panel always lists all five workflow actions; an unavailable one is visibly disabled with the server's reason text rendered in the layout."
    - "An action cannot be submitted without a justification meeting the server-advertised minimum length; the submit control stays disabled until it is met."
    - "A successful action shows a confirmation naming the recorded status change, and the new status is visible on both the review screen and the queue."
    - "A rejected action shows the server's error message and its request_id, and leaves the typed justification intact."
    - "The queue filters and sorts through the server, and an unknown filter value surfaces the server's rejection rather than showing unfiltered data."
    - "The built client is served by the wave 3 API on 0.0.0.0:3000 as the same origin, and renders inside an iframe because nothing frame-blocking is emitted."
  artifacts:
    - path: "src/client/App.tsx"
      provides: "The router: queue at the root route, review at /shipments/:shipmentId, inline not-found"
      exports: ["App"]
      contains: "/shipments/:shipmentId"
    - path: "src/client/screens/queue/QueueScreen.tsx"
      provides: "The Cargo Exception Queue screen with filters, sort, result count, three empty/error states and URL-persisted query"
      exports: ["QueueScreen"]
      min_lines: 80
    - path: "src/client/screens/queue/QueueTable.tsx"
      provides: "The queue table: mandated columns, multi-exception chips, row navigation by pointer and keyboard"
      exports: ["QueueTable"]
      min_lines: 60
    - path: "src/client/screens/review/ReviewScreen.tsx"
      provides: "The Shipment Review screen composing entry data, documents, validation results and the action panel, with the back link"
      exports: ["ReviewScreen"]
      min_lines: 60
    - path: "src/client/screens/review/ActionPanel.tsx"
      provides: "All five actions with availability, per-action fields, mandatory justification and error surfacing"
      exports: ["ActionPanel"]
      min_lines: 100
    - path: "src/client/api/client.ts"
      provides: "The typed fetch wrapper and the ApiError carrying code, message and request_id"
      exports: ["apiGet", "apiPost", "ApiError"]
    - path: "vite.config.ts"
      provides: "Client build into dist/client and the dev server on 0.0.0.0:3001 proxying /api to the API on 3000"
      contains: "dist/client"
    - path: "playwright.config.ts"
      provides: "Browser test harness driving the real built client served by the API"
      contains: "webServer"
  key_links:
    - from: "src/client/screens/queue/QueueTable.tsx"
      to: "/shipments/:shipmentId"
      via: "row click and Enter/Space navigate with react-router; this is the only inbound path to the review screen"
      pattern: "shipments/"
    - from: "src/client/api/hooks.ts"
      to: "GET /api/queue"
      via: "useQueue builds QueueQuery params and calls apiGet"
      pattern: "/api/queue"
    - from: "src/client/screens/review/ActionPanel.tsx"
      to: "POST /api/cases/:case_id/actions"
      via: "useSubmitAction posts the discriminated ActionCommand with the human-typed justification"
      pattern: "/actions"
    - from: "src/client/screens/review/ActionPanel.tsx"
      to: "GET /api/cases/:case_id/available-actions"
      via: "availability, reason text and justification_min_length all come from the server projection, never from client logic"
      pattern: "available-actions"

integration_contracts:
  requires:
    - from_plan: "03"
      artifact: "src/shared/api — the only contract import path for the client"
      exports: ["QueueQuery", "QueueRow", "QueueResponse", "ShipmentDetail", "ExceptionsResponse", "ExceptionView", "DocumentsResponse", "DocumentView", "AvailableActionsResponse", "AvailableAction", "ActionCommand", "ActionResult", "ErrorEnvelope", "ApiErrorCode"]
      verify: "grep -q \"export \\* from './types'\" src/shared/api/index.ts && grep -q \"export \\* from './errors'\" src/shared/api/index.ts && grep -q 'QueueRow' src/shared/api/types.ts && grep -q 'ShipmentDetail' src/shared/api/types.ts && grep -q 'AvailableActionsResponse' src/shared/api/types.ts && grep -q 'ActionResult' src/shared/api/types.ts && grep -q 'ErrorEnvelope' src/shared/api/errors.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "The six HTTP routes — the complete API surface the screens may call"
      exports: ["GET /api/queue", "GET /api/shipments/:shipment_id", "GET /api/shipments/:shipment_id/exceptions", "GET /api/shipments/:shipment_id/documents", "GET /api/cases/:case_id/available-actions", "POST /api/cases/:case_id/actions"]
      verify: "grep -q \"'/api/queue'\" src/server/routes/queue.ts && grep -q 'shipment_id/exceptions' src/server/routes/shipments.ts && grep -q 'shipment_id/documents' src/server/routes/shipments.ts && grep -q 'available-actions' src/server/routes/cases.ts && grep -q 'case_id/actions' src/server/routes/cases.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "Queue row field names the table renders verbatim"
      exports: ["shipment_id", "importer_name", "priority", "priority_basis_summary", "status", "open_exception_count", "exception_types", "exception_summary", "age_days", "shipment_value_usd"]
      verify: "grep -q 'priority_basis_summary' src/shared/api/types.ts && grep -q 'exception_types' src/shared/api/types.ts && grep -q 'exception_summary' src/shared/api/types.ts && grep -q 'age_days' src/shared/api/types.ts && grep -q 'shipment_value_usd' src/shared/api/types.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "Shipment detail and exception field names the review panels render verbatim"
      exports: ["carrier_name", "product_description", "hts_code", "country_of_origin", "manufacturer", "case_version", "case_id", "policy_reference", "missing_information", "evidence", "assertion"]
      verify: "grep -q 'product_description' src/shared/api/types.ts && grep -q 'manufacturer' src/shared/api/types.ts && grep -q 'case_version' src/shared/api/types.ts && grep -q 'policy_reference' src/shared/api/types.ts && grep -q 'missing_information' src/shared/api/types.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "Available-actions projection — availability, reason text and the justification floor the panel obeys"
      exports: ["actions[] always five", "available", "reason", "reason_text", "required_fields", "justification_min_length", "case_version"]
      verify: "grep -q 'reason_text' src/shared/api/types.ts && grep -q 'justification_min_length' src/shared/api/types.ts && grep -q 'required_fields' src/shared/api/types.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "The uniform error envelope the UI surfaces instead of failing silently"
      exports: ["error.code", "error.message", "error.field_errors", "error.request_id"]
      verify: "grep -q 'request_id' src/shared/api/errors.ts && grep -q 'field_errors' src/shared/api/errors.ts && grep -q 'INVALID_QUERY_PARAM' src/shared/api/errors.ts && grep -q 'CASE_VERSION_CONFLICT' src/shared/api/errors.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "Server binding, SPA fallback and the start command the built client is served by"
      exports: ["npm start", "host 0.0.0.0", "port 3000", "dist/client/index.html fallback for every non-/api path", "no X-Frame-Options, no frame-ancestors"]
      verify: "grep -q '0.0.0.0' src/server/index.ts && grep -q 'dist/client' src/server/plugins/spa.ts && ! grep -rqi 'x-frame-options\\|frame-ancestors' src/server/ && node -e \"const s=require('./package.json').scripts; if(!s.start) process.exit(1)\" && echo CONTRACT_OK"

  provides:
    - artifact: "Client routes — the complete set of URLs the app serves. There are two, plus an inline not-found."
      exports: ["/", "/shipments/:shipmentId"]
      shape: |
        # /                        Cargo Exception Queue. The app ROOT and the landing screen:
        #                          loading the preview URL with no path lands here.
        # /shipments/:shipmentId   Shipment Review for one shipment, e.g. /shipments/SHP-2026-0007.
        #                          Reached by clicking a queue row. Carries a "Back to queue" link.
        # Anything else            Inline not-found view rendered in place, with a "Back to queue" link.
        #
        # There is no /queue, no /session, no /admin, no /notifications, no resolution route and no
        # audit route: those screens are deferred by the recorded scope decision and are not in this
        # plan. No navigation element anywhere in the client points at a path not on this list.
        # History routing (BrowserRouter). In production the wave 3 SPA fallback serves index.html
        # for every non-/api path, so a deep link to /shipments/SHP-2026-0007 resolves on reload.
      verify: "grep -q 'shipments/:shipmentId' src/client/App.tsx && grep -q 'path=\"/\"' src/client/App.tsx && ! grep -rqE 'to=\"/(queue|session|admin|notifications)|/resolution|/audit' src/client/ && echo CONTRACT_OK"

    - artifact: "Stable test ids on the queue screen — the selectors wave 5's Playwright run targets"
      exports: ["queue-screen", "queue-loading", "queue-error", "queue-empty", "queue-result-count", "queue-table", "queue-row", "queue-row-{SHIPMENT_ID}", "queue-row-shipment-id", "queue-row-importer", "queue-row-exceptions", "queue-row-exception-chip", "queue-row-priority", "queue-row-status", "queue-row-age", "queue-filter-status", "queue-filter-exception-type", "queue-filter-priority", "queue-sort-field", "queue-sort-direction", "queue-applied-filters", "queue-clear-filters"]
      shape: |
        # Every id is on a `data-testid` attribute. Row ids are stable across runs because the seed is
        # deterministic and the server sorts deterministically.
        [data-testid="queue-screen"]                       the route container
        [data-testid="queue-table"]                        the <table>
        [data-testid="queue-row"]                          every row; also carries data-shipment-id
        [data-testid="queue-row-SHP-2026-0007"]            the canonical row, addressable directly
        [data-testid="queue-row-exception-chip"]           one per distinct exception type on a row;
                                                           carries data-exception-type
        [data-testid="queue-row-status"]                   text label, e.g. "New" / "In review"
        [data-testid="queue-row-priority"]                 text label, e.g. "Critical"
        [data-testid="queue-result-count"]                 "10 flagged shipments · showing 10"
                                                           (illustrative only: 12 seeded shipments minus
                                                           the clean one and the cleared one = 10 default
                                                           rows. No assertion depends on the number.)
        [data-testid="queue-error"]                        error panel; contains the request_id
        # Assertion wave 5 can rely on: the canonical row renders exactly 3 exception chips.
      verify: "grep -q 'queue-row-exception-chip' src/client/screens/queue/QueueTable.tsx && grep -q 'data-shipment-id' src/client/screens/queue/QueueTable.tsx && grep -q 'queue-table' src/client/screens/queue/QueueTable.tsx && grep -q 'queue-result-count' src/client/screens/queue/QueueScreen.tsx && echo CONTRACT_OK"

    - artifact: "Stable test ids on the review screen — the selectors wave 5's Playwright run targets"
      exports: ["review-screen", "review-loading", "review-error", "review-not-found", "back-to-queue", "review-shipment-id", "review-status", "review-priority", "review-value", "entry-data-panel", "entry-field-{name}", "documents-panel", "document-row", "document-row-{TYPE}", "document-status", "validation-results-panel", "exception-card", "exception-rule-name", "exception-policy-reference", "exception-assertion", "exception-severity", "evidence-row", "exception-missing-information", "resolved-exceptions-disclosure", "action-panel", "action-option-{ACTION}", "action-unavailable-reason", "field-document-types", "field-resolution-basis", "field-hold-reason", "field-escalation-reason", "field-assign-to", "justification-input", "justification-counter", "action-submit", "action-error", "action-confirmation"]
      shape: |
        [data-testid="back-to-queue"]                      link to "/"; present on every review render
        [data-testid="review-status"]                      current case status as a text label
        [data-testid="entry-field-importer"]               plus -carrier, -product-description, -hts-code,
                                                           -country-of-origin, -manufacturer-name,
                                                           -manufacturer-address, -shipment-value, -entry-date
        [data-testid="document-row"]                       one per document type; carries
                                                           data-document-type and data-document-status
        [data-testid="document-row-CERTIFICATE_OF_ORIGIN"] addressable directly
        [data-testid="exception-card"]                     one per OPEN exception; carries
                                                           data-exception-type and data-exception-id
        [data-testid="evidence-row"]                       one per evidence record inside a card
        [data-testid="action-option-REQUEST_INFORMATION"]  one per action, always all five present:
                                                           REQUEST_INFORMATION, SEND_FOR_SPECIALIST_REVIEW,
                                                           CLEAR_EXCEPTION, PLACE_ON_HOLD,
                                                           ESCALATE_TO_SUPERVISOR. Each carries
                                                           data-available="true|false".
        [data-testid="action-unavailable-reason"]          the server's reason_text, rendered in layout
        [data-testid="justification-input"]                <textarea>, never prefilled
        [data-testid="action-submit"]                      disabled until every required field is valid
        [data-testid="action-confirmation"]                panel (not a toast) naming before -> after status
        [data-testid="action-error"]                       server message + request_id, justification kept
        # Assertions wave 5 can rely on: the canonical shipment renders 3 exception-card elements, each
        # with >= 1 evidence-row; action-submit is disabled while justification-input is under length.
      verify: "grep -q 'back-to-queue' src/client/screens/review/ReviewScreen.tsx && grep -q 'exception-card' src/client/screens/review/ValidationResultsPanel.tsx && grep -q 'evidence-row' src/client/components/EvidenceRow.tsx && grep -q 'justification-input' src/client/screens/review/JustificationInput.tsx && grep -q 'action-submit' src/client/screens/review/ActionPanel.tsx && grep -q 'action-confirmation' src/client/screens/review/ActionPanel.tsx && echo CONTRACT_OK"

    - artifact: "Build, dev and preview commands, and the bind host/port — no collision with the wave 3 API"
      exports: ["npm run build:client", "npm run build", "npm run dev:client", "npm run test:e2e", "npm start"]
      shape: |
        # PRODUCTION / PREVIEW — ONE origin, ONE port. There is no second server at demo time.
        #   npm run build:client   -> vite build, output dist/client (index.html + hashed assets)
        #   npm run build          -> alias of build:client, so wave 5 can call one name
        #   npm start              -> wave 3's server: migrate -> seed-if-empty -> listen 0.0.0.0:3000,
        #                             serving dist/client for every non-/api path.
        #   Preview URL            -> http://0.0.0.0:3000/  (the queue, at the root path)
        #   The frontend does NOT bind a port in production. The API owns 3000; the client is static
        #   assets inside it. Same origin, so fetch('/api/...') needs no CORS and no base URL.
        #
        # DEVELOPER INNER LOOP ONLY — never used for a demo or by wave 5's journey run:
        #   npm run dev:client     -> vite dev server, host 0.0.0.0, port 3001, strictPort,
        #                             proxy /api -> http://127.0.0.1:3000 (the API run separately).
        #   3001 is chosen because the API owns 3000; the two never contend.
        #
        # FRAMING — the preview embeds the app in an iframe:
        #   The client emits no headers at all in production (it is static files served by the API,
        #   which sends no X-Frame-Options and a CSP with no frame-ancestors directive). vite.config.ts
        #   configures NO `server.headers` and NO `preview.headers`, so the dev server does not
        #   reintroduce a frame block either.
        #
        # Vite is a devDependency; the production runtime installs and runs no frontend server.
      verify: "node -e \"const s=require('./package.json').scripts; for (const k of ['build','build:client','dev:client','test:e2e','start']) if(!s[k]) process.exit(1)\" && grep -q 'dist/client' vite.config.ts && grep -q '3001' vite.config.ts && grep -q \"'/api'\" vite.config.ts && ! grep -qi 'headers' vite.config.ts && echo CONTRACT_OK"

    - artifact: "The client's API access rules — what wave 5 can assume about network traffic from the browser"
      exports: ["same-origin relative URLs only", "no endpoint outside the six", "no actor or role ever sent"]
      shape: |
        # Every request from the browser is a relative, same-origin URL beginning "/api/".
        # No absolute URL, no other host, no CORS, no cookies, no Authorization header.
        # The client calls only the six wave 3 routes. It never calls an AI, audit, notification,
        # document-upload, revalidation, approval, rule-admin or session endpoint: those features are
        # deferred and no such route exists to call.
        # The client never sends an actor id, a user id as "who I am", or a role. Identity is resolved
        # server-side; a client-claimed actor would be a 422 anyway (additionalProperties: false).
        # Mutating requests send `If-Match-Case-Version: <case.case_version>`; on 409
        # CASE_VERSION_CONFLICT the UI refetches and asks the user to resubmit, never retries silently.
      verify: "grep -q 'If-Match-Case-Version' src/client/api/client.ts && ! grep -rq 'http://' src/client/ && ! grep -rq 'https://' src/client/ && ! grep -rqE 'actor_user_id|acting_role' src/client/ && echo CONTRACT_OK"
---

<objective>
Ship the two in-scope screens as a routed React + Vite single-page app served by the wave 3 API:
the **Cargo Exception Queue** at the application root route, and the **Shipment Review** screen at
`/shipments/:shipmentId`, reached by clicking a queue row.

Purpose: waves 1-3 produced a database that knows which shipments are flagged and why, and an HTTP
contract that can list them, explain them and act on them. None of it is operable by a person. This
wave is the human surface — and the scope decision kept both screens as first-class features
precisely so this build is not an API with a demo attached. A cargo specialist opens the preview
URL, sees the flagged shipments ordered by priority, opens the canonical solar-panel shipment, reads
the three exceptions with the rule that fired and the field values that triggered it, and records a
decision with a justification they wrote themselves. The governance claim is visible here or nowhere:
the machine lays out the evidence, and the button that changes anything is inert until a human types
a reason.

Output: a Vite client building to `dist/client` (served by the API on `0.0.0.0:3000`, same origin),
two screens with stable test ids, and a Playwright suite that proves each screen in the same task
that builds it.
</objective>

<feature_dependencies>
Implements: F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
Depends on: F3: Backend HTTP API, F9: Exception Case Workflow & User Actions (wave 3), F5: Exception Detection, Evidence Capture & Flagging (wave 2), F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset (wave 1)
Enables: None — this is the last feature wave; wave 5 wires and proves the stack end to end.
</feature_dependencies>

<context>
@.planning/PROJECT.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/SCOPE-DECISION.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/WAVE-SCHEDULE.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/03-PLAN.md
@project_specs/FRD/F17-queue-screen.md
@project_specs/FRD/F18-review-screen.md
@project_specs/UX-Mockup/Screen-01-exception-queue.md
@project_specs/UX-Mockup/Screen-02-shipment-review.md
@project_specs/UX-Mockup/Y0-patterns.md
@project_specs/UX-Mockup/Y1-responsive.md
@project_specs/UX-Mockup/Y2-accessibility.md
@project_specs/UserStories/Epic-09-four-primary-screens.md
@project_specs/UserStories/Epic-03-workflow-actions.md
@project_specs/TechArch/05-tech-stack.md
@src/shared/api/types.ts
@src/shared/api/errors.ts
</context>

<scope_boundary>
Read this before writing a component. It is the difference between a correct wave and a rejected one.

**Two screens exist. Not four, not five.** The Cargo Exception Queue and the Shipment Review screen.
Everything else the mockups show belongs to a feature the recorded scope decision defers, and must
not be built, stubbed, linked to, or hinted at.

**Routability without an application shell.** The shell, navigation rail and role switcher feature is
deferred and is not in this plan, but the two screens must still be reachable. Implement exactly the
minimum the two screens themselves require, and nothing more:

- the router;
- the queue mounted at the **root route** `/`, so the preview URL lands on it with no typing;
- clickable queue rows as the inbound navigation to `/shipments/:shipmentId`;
- a **"Back to queue"** link on the review screen.

Do **not** build a persistent navigation rail or sidebar, a role switcher, a simulated-login gate, a
notification bell, a demo-guide strip, or a link to any screen this build does not serve. A dead link
or a 404 from a nav element is a defect, so the rule is simple: every link points at `/` or at
`/shipments/:shipmentId`.

**Route strings deliberately diverge from the mockups, and this is recorded, not accidental.** The
mockup chunks route the queue at `/queue` and the review screen at `/shipments/:id/review`, because
they assume the shell feature that owns the navigation rail — which is deferred and out of scope
here. With no shell, the queue must be the landing route or it is unreachable without typing a URL,
so this build serves `/` and `/shipments/:shipmentId`. Wave 5 was planned against exactly those two
paths; do not "restore" the mockup paths.

**Surfaces the mockups show that are NOT built here.** Each is deferred by the recorded scope
decision. Where the screen chunk shows it, leave it out entirely — do not render a placeholder, an
empty panel, a greyed control or a "coming soon" affordance, because a placeholder for a governance
feature reads as a broken governance feature:

| Mockup element | Status |
|---|---|
| The AI plain-language summary panel on the review screen | deferred — no provider, no route, not in this plan |
| The recommended-action / confidence-level panel and the whole Recommended Resolution screen | deferred — out of scope |
| The document request dialog with fixture picker, the upload control and the download link | deferred — out of scope |
| The "Revalidate" button and the "Compare v1 → v2" evaluation diff | deferred — out of scope |
| The "View audit record" link, the audit timeline and the printable view | deferred — out of scope |
| Approve / reject controls, the Authority Chain rail, the pending-recommendation panel | deferred — out of scope |
| Role-dependent rendering, the "Pending approval only" supervisor toggle, the assignment filter | deferred — out of scope |
| The rule-administration surface and the read-only "View triggering rule" drawer | deferred — out of scope |
| The demo-mode chip, the AI-fallback banner and the notification list | deferred — out of scope |

The review screen therefore shows: **the entry fields, the documents with their state and provenance,
and the validation results with their triggering rule, policy reference, assertion and field-level
evidence** — plus the action panel. It shows no machine prose, no recommendation, no confidence
score, and no history of who did what.

**Authorship banding still applies to what remains.** The mockups' three-band system exists because
an evaluator must never mistake machine text for a finding. With the AI panels deferred there is no
machine prose on either screen, so only two bands are in play: the **system band** for rule findings,
evidence rows and status transitions (plain bordered surface, tabular label-value layout, gear glyph,
the label *"System finding — deterministic rule evaluation"*), and the **human band** for the
justification the user types and the confirmation quoting it back (neutral surface, solid 3px left
border, person glyph, actor name and role). Do not invent an AI band for content that does not exist,
and do not render the human band around server-generated text.

**The five actions, and the one input that gates all of them.** The action panel exposes exactly the
five actions wave 3 implements — `REQUEST_INFORMATION`, `SEND_FOR_SPECIALIST_REVIEW`,
`CLEAR_EXCEPTION`, `PLACE_ON_HOLD`, `ESCALATE_TO_SUPERVISOR` — all five on every render, in that
fixed order, with unavailable ones disabled and their reason text visible in the layout rather than
in a tooltip. `REQUEST_INFORMATION` is present because it is one of the five workflow actions; the
document-request record and upload lifecycle behind it is deferred and not in this plan, so the panel
collects document type names and nothing else. **Justification is mandatory and never prefilled**, at
the `justification_min_length` the server advertises for the selected action, with a live counter and
a submit control that stays disabled until it is met. The user, not the machine, makes the decision,
and it is not submittable without a recorded reason.

**Never invent an API field or an endpoint.** Wave 3 declares six routes and their exact response
shapes. Import the types from `src/shared/api` and render those field names verbatim. If a screen
element needs a field that is not in wave 3's declared response, that element is not built in this
wave — it is a dependency problem, not a field to invent. Consequences already known and accepted:

- `QueueQuery` has no `assignment` parameter and no `pending_approval_only` toggle, so the queue
  offers **status, exception type and priority** filters, plus `include_clean` / `include_cleared`
  toggles, and nothing else. An unknown query parameter is a `422` from the server, so sending a
  filter the contract does not declare would break the screen outright.
- `QueueRow` carries no `pending_approval` block. A case in `PENDING_APPROVAL` renders as an ordinary
  status badge with that label; the supervisor-specific "awaiting your approval" treatment is
  deferred with the role feature and is out of scope.
- `ShipmentDetail._links` names API paths, not UI routes. Do not turn them into links.
- The five in-scope `_links` do not include an audit or AI link, because those routes do not exist.

**The frozen enums constrain the filter UI, NOT the query the client sends.** This distinction is
load-bearing and was got wrong once already:

- `src/client/api/enums.ts` exists to (a) render the filter checkbox options and (b) map a server code
  to a display label. That is its entire job.
- A `QueueQuery` value **restored from the URL** (`useSearchParams`) is forwarded to the server
  **verbatim**. It is never filtered, sanitised, dropped or coerced against the frozen arrays.
- The server is therefore the only validator. `?priority=URGENT` reaches `GET /api/queue`, comes back
  `422 INVALID_QUERY_PARAM`, and the screen renders `queue-error` with the server's message and
  `request_id` — never unfiltered data. If the client silently dropped `URGENT`, the server would
  never reject it, the queue would render every row, and the user would be looking at a result set
  that does not match the URL they are on. That is the failure this rule prevents.

**Layer rule.** The client imports **only** from `src/shared/api`. It must not import from
`src/server`, `src/app`, `src/domain` or `src/infra` — that boundary is a real TechArch rule and the
reason the contract exists. All data access goes through `src/client/api/`.

**Presentation stack, fixed by TechArch §5.2.** React 18, Vite 5, React Router 6, TanStack Query 5,
CSS Modules with design tokens. No UI component library, no CSS framework, no CDN font, no state
library beyond TanStack Query, no HTTP client library — `fetch` only. Next.js is not used, so no
`next.config.*` file of any extension is created.

**Iframe discipline (UX principle P8).** No `window.open`, no `target="_blank"`, no `window.confirm`
/ `alert` / `prompt`, no Fullscreen API, no `window.print()`. Layout responds to its container, not
to `100vw` / `100vh`. Overlays, if any, are in-frame and focus-trapped.

**How the three tasks are sequenced, and the one rule that keeps every gate honest.**

Each task's `<verify>` must pass **at that task's completion, using only files that task and its
predecessors created**. No task may import, render or assert against a file a later task creates.
That constrains `src/client/App.tsx`, which all three tasks edit, in one specific way:

| Task | Routes registered in `App.tsx` after it | Screens it may import |
|---|---|---|
| 1 | `*` → inline not-found only | none |
| 2 | `/` → `QueueScreen`, `*` | `QueueScreen` |
| 3 | `/`, `/shipments/:shipmentId` → `ReviewScreen`, `*` | `QueueScreen`, `ReviewScreen` |

So Task 1 ships a booting, iframe-safe application whose every path renders the inline not-found;
Task 2 mounts the queue at the root; Task 3 mounts the review screen and closes the loop. Task 2's
queue spec therefore asserts that activating a row **navigates to `/shipments/SHP-2026-0007`** — the
queue's own contract — and Task 3's review spec asserts that the review screen **renders** at that
URL when a row is clicked. Both assertions stay true and stay green forever after; neither reaches
forward into work that does not exist yet.

`playwright.config.ts` is created in **Task 1**, before the first spec file, and is not modified
again by this plan. Task 3 owns the cross-screen spec.
</scope_boundary>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold the Vite/React client — typed API layer, shared UI kit, router with the inline not-found, and the Playwright harness proven on a booting iframe-safe app</name>
  <files>
package.json
tsconfig.json
vite.config.ts
playwright.config.ts
src/client/index.html
src/client/main.tsx
src/client/App.tsx
src/client/routes.ts
src/client/styles/app.css
src/client/api/client.ts
src/client/api/enums.ts
src/client/components/ui.tsx
src/client/components/ui.module.css
e2e/shell.spec.ts
  </files>

  <feature_dependencies>
Implements: F17: Cargo Exception Queue Screen, F18: Shipment Review Screen — the shared foundation both screens are built from: the build, the router, the typed API client, the display vocabularies and the accessible component kit
Depends on: F3: Backend HTTP API (the `src/shared/api` contract and the server that serves `dist/client`, wave 3)
Enables: Task 2 (the queue screen) and Task 3 (the review screen) of this plan
  </feature_dependencies>

  <action>
This task ships no screen. It ships the ground both screens stand on, and it proves in a real browser
that the ground holds: the bundle builds, the API serves it same-origin, and nothing frame-blocking
is on the wire. Getting that wrong is the most expensive failure in this delivery, because a blank
iframe returns HTTP 200 and looks like success to every check that only reads a status code.

**1. `package.json`.** Add dependencies `react` `^18.3`, `react-dom` `^18.3`, `react-router-dom`
`^6.26`, `@tanstack/react-query` `^5.51`. Add devDependencies `vite` `^5.4`,
`@vitejs/plugin-react` `^4.3`, `@types/react` `^18.3`, `@types/react-dom` `^18.3`,
`@playwright/test` `^1.47`. Add scripts:

```json
"dev:client":     "vite",
"build:client":   "vite build",
"build":          "npm run build:client",
"preview:client": "vite preview",
"test:e2e":       "playwright test"
```

Leave every existing wave 1-3 script byte-identical. Do not add a UI kit, a CSS framework, an icon
package, an HTTP client or a state library — TechArch §5.4 excludes each deliberately and the short
dependency list is a reviewable property here.

**2. `tsconfig.json`.** Extend wave 1's config rather than replacing it: add `"jsx": "react-jsx"` and
`"lib": ["ES2022", "DOM", "DOM.Iterable"]`. Keep `strict: true` and `noUncheckedIndexedAccess: true`
— the client obeys the same strictness as the server. Leave the existing `include` and, critically,
the existing `types` array **untouched**: narrowing `types` to `["vite/client"]` would strip the node
types the wave 1-3 server code needs and break `npm run typecheck` for the whole repository. CSS
module and `import.meta.env` typings come from a `/// <reference types="vite/client" />` line at the
top of `main.tsx` instead, which makes those ambient declarations global to the program without
touching `types`.

**3. `vite.config.ts`.**

```ts
export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  base: '/',
  build: { outDir: '../../dist/client', emptyOutDir: true },
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false } },
  },
});
```

`3001` because the wave 3 API owns `3000` and the two must never contend. Do **not** configure
`server.headers` or `preview.headers`: any `X-Frame-Options` or CSP `frame-ancestors` value would
blank the preview iframe, and this is the one place a frontend build can accidentally reintroduce it.
In production nothing here runs — the API serves `dist/client` on port 3000, same origin. `dist/` is
already in `.gitignore` from wave 1; verify rather than duplicate.

**4. `playwright.config.ts`** — created here because this task runs the first spec, and not modified
again by this plan.

```ts
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,          // one server, one SQLite file, mutating specs
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'],
              viewport: { width: 1280, height: 720 } } }],
  webServer: {
    command: 'rm -rf ./data/e2e.db ./data/e2e.db-wal ./data/e2e.db-shm && npm run build:client && npm start',
    url: 'http://127.0.0.1:3000/api/queue',
    env: { CARGODEMO_DB_PATH: './data/e2e.db', CARGODEMO_SEED_ON_EMPTY: 'true' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
```

Three deliberate choices. The suite drives **the production path** — the built bundle served by the
real start command on port 3000 — not the Vite dev server, because that is what the preview runs and
a dev-only pass would prove the wrong thing. It uses a **separate database file**, wiped before each
run, so mutating specs get a fresh deterministic seed. And the readiness probe is `GET /api/queue`,
a real endpoint returning real data; there is no health endpoint, because that belongs to a feature
which is deferred and out of scope.

**Spec-independence rule, binding on every spec file in this plan.** Playwright runs the files in one
worker in alphabetical order (`cross-screen`, `queue`, `review`, `shell`), so a mutating spec runs
before a reading one. Therefore: no spec may assert an exact total row count, and no spec may assert
the status of a shipment another spec mutates. Only `cross-screen.spec.ts` mutates state, and it acts
on **`SHP-2026-0001`**, never on the canonical `SHP-2026-0007` — which keeps the canonical row at
`New` for every other spec and for wave 5.

**5. `src/client/index.html`** — `<html lang="en">`, a `<div id="root">`, a `<meta name="viewport">`,
`<title>CargoDemo — Cargo Exception Handling</title>`, and a module script importing `./main.tsx`. No
CDN link of any kind, and no absolute URL anywhere in the file.

**6. `src/client/main.tsx`** — the `/// <reference types="vite/client" />` line, then mount `<App />`
inside `<QueryClientProvider>` and `<BrowserRouter>`. Configure the QueryClient with
`refetchOnWindowFocus: true`, `retry: 1`, `staleTime: 5_000`. Import `./styles/app.css`.

**7. `src/client/App.tsx` + `src/client/routes.ts`** — the whole navigation surface of the
application. In **this** task `App.tsx` registers the catch-all only:

```tsx
export function App() {
  return (
    <Routes>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

`NotFound` is a small component **inline in this file** (`data-testid="not-found"`): a heading, the
sentence *"That page does not exist."*, and a `<Link to={QUEUE_PATH}>Back to queue</Link>`. There is
no separate not-found module, because one inline view is the entire requirement.

Task 2 adds `<Route path="/" element={<QueueScreen />} />` and Task 3 adds
`<Route path="/shipments/:shipmentId" element={<ReviewScreen />} />` above it. Registering them here
would import files that do not exist yet and fail this task's own typecheck and build.

`routes.ts` exports the path builders and nothing else — `QUEUE_PATH = '/'`,
`REVIEW_PATH_PATTERN = '/shipments/:shipmentId'`, and
`reviewPath(shipmentId) => '/shipments/' + encodeURIComponent(shipmentId)`. Every link and every
`<Route path>` in the client is written from these, so no route string is written twice and a link can
never point at a path the router does not serve. There is no shell, no sidebar and no header nav —
the application shell feature is deferred and is not in this plan.

**8. `src/client/styles/app.css`** — the design tokens and the global baseline in one stylesheet:
CSS custom properties for surface, border, text, focus-ring and the two authorship bands (system:
plain border + gear glyph; human: solid 3px left border + person glyph), plus resets, typography and
focus styling. WCAG 2.1 AA: body text ≥ 4.5:1 on its surface, borders and focus rings ≥ 3:1, and
**disabled-control reason text must also meet 4.5:1** — the reason is information, not decoration,
and washing it out is the commonest failure of this pattern. A visible focus ring on every focusable
element, including table rows. Layout sizes from container width and `%`/`rem`, never `100vw` /
`100vh` (the app renders inside an iframe of unknown size). Baseline 1280×720, usable 1024-1920 wide
with no horizontal scrolling of the content region. Honour `prefers-reduced-motion` by reducing the
only two transitions (disclosure expand, progress line) to instant state changes.

**9. `src/client/api/client.ts`** — the only place `fetch` is called:

- `ApiError extends Error` carrying `{ status, code, message, details?, field_errors?, request_id }`,
  parsed from wave 3's envelope `{ error: { code, message, details?, field_errors?, request_id } }`.
  When a response is non-2xx and the body is not a parseable envelope, synthesize
  `code: 'INTERNAL_ERROR'` with the HTTP status and a `request_id` read from the `X-Request-Id`
  header. **Never surface a raw response body, a stack or an absolute path** — the user sees
  `message` and `request_id`, nothing else.
- `apiGet<T>(path, params?)` builds the query string with `URLSearchParams`, appending repeatable
  params (`status`, `exception_type`, `priority`) once per value, and omitting any param whose value
  is undefined or an empty array. **It does not validate values** — see the enum-scoping rule in
  `<scope_boundary>`; the server is the validator. Path segments interpolated from route params go
  through `encodeURIComponent`.
- `apiPost<T>(path, body, opts?)` sends `Content-Type: application/json` and, when
  `opts.caseVersion` is given, the `If-Match-Case-Version` header.
- All URLs are **relative and same-origin**, beginning `/api/`. No base URL, no absolute host, no
  CORS, no credentials, no Authorization header. The client never sends an actor id or a role:
  identity is resolved server-side and a client-claimed actor would be a `422` anyway.

**10. `src/client/api/enums.ts`** — the display vocabularies. Export each as a frozen array **for
rendering the filter controls and mapping a code to a label, and for nothing else**: values restored
from the URL are forwarded to the server verbatim, so the server stays the validator (see
`<scope_boundary>`). Statuses: `NEW`, `IN_REVIEW`, `AWAITING_INFORMATION`, `ON_HOLD`, `ESCALATED`,
`PENDING_APPROVAL`, `CLEARED` → *"New"*, *"In review"*, *"Awaiting information"*, *"On hold"*,
*"Escalated"*, *"Pending approval"*, *"Cleared"*. Priorities `LOW|MEDIUM|HIGH|CRITICAL` →
*"Low"*/*"Medium"*/*"High"*/*"Critical"* with rank glyphs `▮`/`▮▮`/`▮▮▮`/`▮▮▮▮`. Exception types
`MISSING_REQUIRED_DOCUMENT`, `INVALID_HTS_CODE`, `CONFLICTING_COUNTRY_OF_ORIGIN` → *"Missing
document"*, *"Incomplete HTS"*, *"Origin conflict"*. Severities as words. Action codes with their
display labels — `CLEAR_EXCEPTION` is labelled **"Clear exception"**, never "Approve" and never
anything implying a supervisor approved it (wave 3 records the acting user as the approving official
on their own decision; the two-person approval chain is deferred and out of scope, and the label must
not claim otherwise). Also export `formatUsd(decimalString)`, which formats `"85000.00"` into
`$85,000.00` using **string operations only** — never `Number()`, because money crossing a float is
a defect waiting for a demo.

**11. `src/client/components/ui.tsx` + `ui.module.css`** — the shared kit, one module for all of it
so the file count stays reviewable. Export:

- `Panel` — the system band container: a `<section aria-labelledby>` with a heading, an optional
  count line, the gear glyph (`aria-hidden`) and the label *"System finding — deterministic rule
  evaluation"* where the content is rule output. Accepts `loading` / `error` / `empty` slots.
- `StatusBadge` — the status **text label** plus a distinct shape per status. Never colour alone.
- `PriorityIndicator` — the priority text label plus its rank glyph, with `priority_basis_summary`
  rendered in an adjacent `<span>` (visible text, not a `title=` tooltip — a projector audience and
  a keyboard user must both be able to read it).
- `ExceptionTypeChip` — one chip per distinct type, with the count appended when > 1.
- `ErrorPanel` — takes an `ApiError`, renders the human message, the reference `request_id`, and a
  **Retry** button. This is the single component that turns wave 3's envelope into something a user
  can read; nothing anywhere else formats an error.
- `EmptyState` — message plus an optional remedial action.
- `Skeleton` — placeholders that **reserve the final layout dimensions**. Never a centred spinner
  that collapses to zero height: a presenter must never mis-click a row that moves under the cursor
  when data arrives. Regions carry `aria-busy="true"` while loading, and skeleton nodes are
  `aria-hidden`.

**12. `e2e/shell.spec.ts`** — the harness proof, and three assertions that stay true for the life of
the project (they are properties of the served document, not of any screen):

- **The document is served and the app mounts.** `const res = await page.goto('/')` → status `200`,
  `content-type` contains `text/html`, the body contains a `<script` tag, and
  `expect(page.locator('#root')).not.toBeEmpty()` — an HTML shell with an empty root means the bundle
  did not build or did not execute.
- **Nothing frame-blocking is on the wire.** From `res.headers()` (names lowercased): no
  `x-frame-options` key at all, and if `content-security-policy` (or `-report-only`) is present, its
  value contains no `frame-ancestors` directive. On failure the assertion message must say *remove
  the header rather than relaxing this check*.
- **The API is same-origin and owns `/api`.** `page.request.get('/api/queue')` → `200` with a JSON
  body carrying a `data` array, and `page.request.get('/api/not-a-route')` → `404` with
  `content-type: application/json` and an `error.code` of `RESOURCE_NOT_FOUND` — proving the SPA
  fallback is registered after the API and cannot swallow an API 404.
- **A deep link returns the same SPA document.** `page.request.get('/shipments/SHP-2026-0007')` →
  `200 text/html`, so a reload inside the iframe resolves rather than 404ing. This asserts the HTTP
  response, not the rendered view, so it is true both now and after Task 3.

Note for the summary: `npx playwright install --with-deps chromium` must run once before the first
execution; the config installs nothing itself.
  </action>

  <verify>
npm install 2>&1 | tail -3 && npm run typecheck && npm run build:client 2>&1 | tail -5 && test -f dist/client/index.html && npx playwright install --with-deps chromium 2>&1 | tail -2 && npx playwright test e2e/shell.spec.ts --reporter=list 2>&1 | tail -20 && grep -q 'dist/client' vite.config.ts && grep -q '3001' vite.config.ts && ! grep -qi 'headers' vite.config.ts && grep -q 'If-Match-Case-Version' src/client/api/client.ts && ! grep -rqiE 'window\.(open|print|confirm|alert|prompt)|target="_blank"|dangerouslySetInnerHTML|100vw|100vh' src/client/ && ! grep -rqE "from '\.\./\.\./(server|app|domain|infra)|src/(server|app|domain|infra)" src/client/ && ! grep -rqE 'http://|https://' src/client/ && echo CONTRACT_OK
  </verify>

  <done>
- `npm install`, `npm run typecheck` and `npm run build:client` all exit 0, and `dist/client/index.html`
  plus hashed assets exist. `npm run typecheck` still covers the wave 1-3 server code — the `types`
  array in `tsconfig.json` was not narrowed.
- `npx playwright test e2e/shell.spec.ts` passes with 0 failing and 0 skipped, driving the real
  `npm run build:client && npm start` against a throwaway `./data/e2e.db`.
- The served document returns 200 `text/html`, mounts a non-empty `#root`, carries **no**
  `x-frame-options` header and no CSP `frame-ancestors` directive; `/api/queue` returns JSON rows from
  the same origin; an unknown `/api` path returns the JSON error envelope rather than the SPA HTML;
  and a deep link to `/shipments/SHP-2026-0007` returns the same SPA document.
- The router registers `*` → the inline not-found **only**, so at this gate every path renders that
  view. The queue arrives at `/` in Task 2 and the review screen at `/shipments/:shipmentId` in
  Task 3; no file in this task imports a screen module.
- `routes.ts` is the single source of both path strings, and `reviewPath` encodes its segment.
- `api/client.ts` is the only `fetch` call site: relative same-origin `/api/` URLs, `URLSearchParams`
  query building with no client-side value validation, `encodeURIComponent` on interpolated segments,
  the `If-Match-Case-Version` header on mutations, and an `ApiError` exposing only `message` and
  `request_id` to the UI.
- `api/enums.ts` provides labels and filter options only, and `formatUsd` converts the decimal string
  with string operations — `Number(` appears nowhere near a money value.
- `components/ui.tsx` exports Panel, StatusBadge, PriorityIndicator, ExceptionTypeChip, ErrorPanel,
  EmptyState and Skeleton; status and priority carry a text label plus shape or glyph, never colour
  alone; skeletons reserve final dimensions.
- `vite.config.ts` builds to `dist/client`, binds the dev server to `0.0.0.0:3001` with an `/api`
  proxy to port 3000, and configures no response headers — nothing can reintroduce a frame block.
- No `window.open` / `print` / `confirm` / `alert` / `prompt`, no `target="_blank"`, no
  `dangerouslySetInnerHTML`, no `100vw` / `100vh`, no absolute URL, and no import from `src/server`,
  `src/app`, `src/domain` or `src/infra` anywhere under `src/client/`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Ship the Cargo Exception Queue at the application root route, and prove it in a real browser</name>
  <files>
src/client/App.tsx
src/client/api/hooks.ts
src/client/screens/queue/QueueScreen.tsx
src/client/screens/queue/QueueFilters.tsx
src/client/screens/queue/QueueTable.tsx
src/client/screens/queue/Queue.module.css
e2e/queue.spec.ts
  </files>

  <feature_dependencies>
Implements: F17: Cargo Exception Queue Screen (tabular list, server-side filter and sort, multi-exception chips, row navigation, three empty/error states)
Depends on: F3: Backend HTTP API (GET /api/queue and the QueueRow contract, wave 3), F5: Exception Detection, Evidence Capture & Flagging (the exception types and priorities the rows display, wave 2), F2: Synthetic Seed Dataset (the shipments listed, wave 1), and Task 1 of this plan (the build, router, API client, enums and UI kit)
Enables: F18: Shipment Review Screen (the row click is its only inbound navigation; Task 3 mounts the destination)
  </feature_dependencies>

  <action>
**1. `src/client/api/hooks.ts`** — created here with the query-key factory and the queue hook:

```ts
export const qk = {
  queue:     (q: QueueQuery) => ['queue', q] as const,
  shipment:  (id: string)    => ['shipment', id] as const,
  exceptions:(id: string)    => ['exceptions', id] as const,
  documents: (id: string)    => ['documents', id] as const,
  actions:   (caseId: string)=> ['available-actions', caseId] as const,
};
export function useQueue(query: QueueQuery) { /* apiGet<QueueResponse>('/api/queue', query) */ }
```

Task 3 extends this same file with `useShipment`, `useExceptions`, `useDocuments`,
`useAvailableActions` and the `useSubmitAction` mutation. Declaring the whole key factory now keeps
the invalidation surface in one place. Only these six calls will ever exist; there is no hook for an
AI, audit, notification, upload, revalidation or session route, because no such route exists.

**2. `src/client/App.tsx`** — add the root route above the catch-all, and change nothing else:

```tsx
<Routes>
  <Route path="/" element={<QueueScreen />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

The queue is the **root** route: the preview URL with no path lands on it, with no shell, no sidebar
and no header nav. The review route arrives in Task 3.

**3. `src/client/screens/queue/QueueScreen.tsx`** — the landing screen.

- Holds the `QueueQuery` in the URL search params via `useSearchParams`, so a filtered view is
  shareable and survives reload. Defaults `sort=priority:desc,age:desc`, `page=1`, `page_size=25`.
- **Forwards restored params verbatim.** Reading the query from the URL means: take the raw string
  values, group the repeatable ones into arrays, coerce only the two booleans and the two integers by
  shape, and hand the rest to `useQueue` **unchanged**. Do **not** intersect them with the frozen
  arrays in `api/enums.ts` — those exist to render the filter controls and the labels. The server is
  the validator, and a value it rejects must reach it in order to be rejected.
- Header: `<h1>Cargo Exception Queue</h1>` and a result line
  `"{page.total} flagged shipment(s) · showing {data.length}"` in `[data-testid="queue-result-count"]`.
  Both numbers come from the server's response; nothing is computed client-side.
- Renders `QueueFilters`, `QueueTable` and the pagination controls (Prev / Next with the page
  numbers), each state distinct: `queue-loading` (skeleton table with the real column headers and
  rows at final height, `aria-busy="true"`), `queue-error` (`ErrorPanel`), `queue-empty`.
- **Three distinct empty/error states**, which is a stated acceptance criterion: no filters applied
  and zero rows → *"No shipments are currently flagged. Clean entries stay off this queue."*; filters
  applied and zero rows → *"No shipments match these filters."* plus a **Clear all filters** button;
  a failed fetch → the error panel with Retry and the `request_id`. A server rejection of a restored
  filter (`422 INVALID_QUERY_PARAM`) renders the **error panel, not unfiltered data**, with the
  server's message, its `request_id` and a Clear-filters control — silently showing everything would
  be worse than showing nothing, because the rows on screen would not match the URL.

**4. `src/client/screens/queue/QueueFilters.tsx`** — only the filters the contract declares:

- Status (multi-select over the seven), Exception type (multi-select over the three), Priority
  (multi-select over the four), each a labelled `<fieldset>` of checkboxes built from the frozen
  arrays, keyboard reachable, with test ids `queue-filter-status`, `queue-filter-exception-type`,
  `queue-filter-priority`.
- `include_clean` and `include_cleared` checkboxes, both default off, so the queue is a work list:
  the clean seeded shipment must **not** appear by default, and that absence is the visible proof
  that clean entries stay off the queue.
- Sort: a field select (`priority`, `age`, `updated_at`, `shipment_id`, `status`) and a direction
  select (`queue-sort-field`, `queue-sort-direction`), composed into the `sort` string. Sorting is
  **server-side only** — never re-sort rows in the client, because two demo runs must produce
  identical row order.
- Applied-filter chips in `[data-testid="queue-applied-filters"]` rendered from the server's
  `applied` block, each with a remove button labelled *"Remove filter: Priority High"*, plus
  **Clear all filters** (`queue-clear-filters`). The UI shows the server's interpretation, never
  optimistic client state.
- No assignment filter and no pending-approval toggle: `QueueQuery` declares neither, and the role
  feature they belong to is deferred and out of scope.

**5. `src/client/screens/queue/QueueTable.tsx`** — a real `<table>` with a visually-hidden
`<caption>`, `<thead>` and `<th scope="col">` on every column, and `aria-sort` on the active sort
column. Columns, in order: **Shipment ID** (monospace, `queue-row-shipment-id`), **Importer**
(`queue-row-importer`), **Exception(s)** (`queue-row-exceptions`), **Priority**
(`queue-row-priority`), **Status** (`queue-row-status`), **Age** (`queue-row-age`, `{age_days}d`),
**Value** (`formatUsd(shipment_value_usd)` from the decimal **string**). Row rules:

- `data-testid="queue-row"` plus `data-testid="queue-row-{shipment_id}"` and
  `data-shipment-id="{shipment_id}"` on every `<tr>`.
- The row is the selectable region: `tabIndex={0}`, `role="link"`, an `aria-label` summarising the
  row, a visible focus ring **on the row itself** (not only on an inner element), and click plus
  `Enter`/`Space` calling `navigate(reviewPath(shipment_id))`. This is the only inbound navigation to
  the review screen, so it must work with both pointer and keyboard.
- **Exception(s)** renders one `ExceptionTypeChip` per entry in `exception_types`, each carrying
  `data-testid="queue-row-exception-chip"` and `data-exception-type`, followed by
  `open_exception_count` as text. **Never** collapse to "3 exceptions": a three-problem $85,000
  shipment must not look like a single-issue one, and the canonical row must show three distinct
  chips.
- `StatusBadge` and `PriorityIndicator` from the UI kit, so status and priority are always a text
  label plus a shape or glyph — never colour alone. `priority_basis_summary` renders as visible text.
- Fixed proportional column widths — no content-dependent sizing, so cell positions are stable across
  reloads. The table never scrolls horizontally; if the frame is narrow, the Value column moves into
  a row disclosure.
- **No action controls anywhere on this screen**: no approve button, no bulk select, no inline status
  editor, no row overflow menu. Every disposition happens on the review screen, so a shipment can
  never be dispositioned without its evidence being read.

**6. `e2e/queue.spec.ts`** — F17's acceptance criteria as browser assertions. Static analysis cannot
show that a row click navigates or that a rejected filter surfaces; these are browser facts, and the
file becomes a permanent regression asset that every later gate re-runs.

- **Landing.** `page.goto('/')` renders `[data-testid="queue-screen"]` with an `<h1>` of *"Cargo
  Exception Queue"* and a non-empty `[data-testid="queue-table"]`; `page.url()` ends with `/`. No
  login, no redirect, no intermediate screen. This is the routability proof.
- **Mandated columns.** The header row contains Shipment ID, Importer, Exception(s), Priority and
  Status. All five are present or the build fails acceptance.
- **Multi-exception, uncollapsed.** `[data-testid="queue-row-SHP-2026-0007"]` exists and contains
  **exactly three** `[data-testid="queue-row-exception-chip"]` elements with three distinct
  `data-exception-type` values; the row's text does **not** match `/3 exceptions/`.
- **Clean entries stay off the queue.** `[data-testid="queue-row-SHP-2026-0011"]` is **absent** by
  default and appears after enabling the `include_clean` toggle.
- **Deterministic priority ordering.** With `sort=priority:desc`, collect every row's
  `[data-testid="queue-row-priority"]` text and assert the sequence is non-increasing across
  Critical → High → Medium → Low. This is the assertion that fails if anyone ever string-sorts the
  enum.
- **Server-side filtering.** Note the row count, select the `INVALID_HTS_CODE` exception-type filter,
  and assert the row set is a subset of it, that every remaining row carries a chip of that type, and
  that an applied-filter chip appears in `[data-testid="queue-applied-filters"]`. **Clear all
  filters** restores the earlier count. Compare against the count this test observed, never against
  a hard-coded number.
- **A rejected filter surfaces; it never silently widens.** `page.goto('/?priority=URGENT')` renders
  `[data-testid="queue-error"]` containing a `req_` reference and **no** `[data-testid="queue-table"]`.
  This is the assertion that fails if the client ever sanitises URL-restored params against the frozen
  enums instead of forwarding them.
- **Row navigation, pointer.** Clicking `[data-testid="queue-row-SHP-2026-0007"]` leaves the browser
  at `/shipments/SHP-2026-0007` — asserted with `await expect(page).toHaveURL(/\/shipments\/SHP-2026-0007$/)`.
  Navigating to the right URL is the queue's own contract; that the review screen renders there is
  asserted by `e2e/review.spec.ts`, which owns that screen.
- **Row navigation, keyboard.** Focus the canonical row, press `Enter`, and assert the same URL —
  PER-01 is keyboard-first and this is a stated acceptance criterion.
- **No action controls.** The queue screen contains zero `<button>` elements whose accessible name
  matches `/approve|clear|hold|escalate|request/i`.
  </action>

  <verify>
npm run typecheck && npm run build:client 2>&1 | tail -5 && npx playwright test e2e/queue.spec.ts --reporter=list 2>&1 | tail -30 && grep -q 'queue-result-count' src/client/screens/queue/QueueScreen.tsx && grep -q 'queue-row-exception-chip' src/client/screens/queue/QueueTable.tsx && grep -q 'data-shipment-id' src/client/screens/queue/QueueTable.tsx && grep -q 'queue-table' src/client/screens/queue/QueueTable.tsx && grep -q 'path="/"' src/client/App.tsx && grep -q '/api/queue' src/client/api/hooks.ts && ! grep -rqE 'pending_approval_only|assignment=' src/client/screens/queue/ && ! grep -rqiE 'window\.(open|print|confirm|alert|prompt)|target="_blank"|dangerouslySetInnerHTML' src/client/ && echo CONTRACT_OK
  </verify>

  <done>
- `npm run typecheck` and `npm run build:client` exit 0, and
  `npx playwright test e2e/queue.spec.ts` passes with 0 failing and 0 skipped.
- The queue is the root route: loading the app with no path shows the flagged shipments, with no
  login, redirect or intermediate screen.
- Each row renders shipment ID, importer, one chip per distinct exception type, priority, status, age
  and value; the canonical shipment's row shows three distinct chips and never the text
  "3 exceptions"; the clean seeded shipment is absent until `include_clean` is enabled.
- Priority ordering comes from the server and is non-increasing under `sort=priority:desc`; no row
  ordering is computed in the client.
- Filters send only declared `QueueQuery` params — no assignment filter and no pending-approval
  toggle exists — and applied chips are rendered from the server's `applied` block.
- URL-restored query values are forwarded to the server verbatim: `/?priority=URGENT` produces the
  server's `422 INVALID_QUERY_PARAM`, and the screen shows `queue-error` with its `request_id` and
  **no** table. The frozen enums are used only to build the filter controls and the display labels.
- The three empty/error states are distinguishable: nothing flagged, nothing matching the filters
  (with Clear all filters), and a load failure (with Retry and the `request_id`).
- Activating a row by mouse **and** by `Enter` leaves the browser at `/shipments/{shipment_id}`, with
  a visible focus ring on the row itself. The destination screen is mounted in Task 3; this task's
  gate asserts the navigation, and `review.spec.ts` asserts the render.
- The table uses `<th scope="col">`, a visually-hidden `<caption>` and `aria-sort`, and status and
  priority are conveyed by text label plus shape or glyph, never colour alone.
- The queue screen registers no mutating control of any kind.
  </done>
</task>

<task type="auto">
  <name>Task 3: Ship the Shipment Review screen — entry data, documents, evidence, the five-action panel gated on a mandatory justification — and prove it plus the cross-screen loop in a real browser</name>
  <files>
src/client/App.tsx
src/client/api/hooks.ts
src/client/components/EvidenceRow.tsx
src/client/screens/review/ReviewScreen.tsx
src/client/screens/review/EntryDataPanel.tsx
src/client/screens/review/DocumentsPanel.tsx
src/client/screens/review/ValidationResultsPanel.tsx
src/client/screens/review/ActionPanel.tsx
src/client/screens/review/JustificationInput.tsx
src/client/screens/review/Review.module.css
e2e/review.spec.ts
e2e/cross-screen.spec.ts
  </files>

  <feature_dependencies>
Implements: F18: Shipment Review Screen (entry attributes, documents panel, validation results with rule and field-level evidence, the five-action panel with mandatory justification), and closes F17: Cargo Exception Queue Screen by making the row click land on a rendered screen
Depends on: F3: Backend HTTP API (shipment detail, exceptions, documents, available-actions and the action write, wave 3), F9: Exception Case Workflow & User Actions (the five actions, availability reasons and the justification floor, wave 3), F5: Exception Detection, Evidence Capture & Flagging (the exceptions and field-level evidence rendered, wave 2), and Tasks 1 and 2 of this plan
Enables: None — this is the terminal screen of the in-scope journey slice; wave 5 reuses this harness and these selectors.
  </feature_dependencies>

  <action>
**1. `src/client/api/hooks.ts`** — extend the file Task 2 created (do not rewrite it) with
`useShipment(shipmentId)`, `useExceptions(shipmentId)`, `useDocuments(shipmentId)`,
`useAvailableActions(caseId)` and `useSubmitAction(caseId)`. The mutation, on success, invalidates
the queue, shipment, exceptions, documents and available-actions keys from the `qk` factory, so no
screen re-derives state locally.

**2. `src/client/App.tsx`** — add the review route above the catch-all, and change nothing else:

```tsx
<Routes>
  <Route path="/" element={<QueueScreen />} />
  <Route path="/shipments/:shipmentId" element={<ReviewScreen />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

Write the path from `REVIEW_PATH_PATTERN` in `routes.ts` so it can never drift from `reviewPath()`.
These two routes plus the inline not-found are the entire navigation surface of the application.

**3. `src/client/components/EvidenceRow.tsx`** — the smallest and most important component on the
screen. Renders one evidence record as a `<dl>` pair inside the system band: the `field_path` as
`<dt>` in monospace, and as `<dd>` the raw value, the normalized value, and — where the record
carries a comparison or an expected/observed pair — both sides rendered side by side. **Never
summarize evidence into prose.** The entire point is that a reviewer sees
`country_of_origin = "Malaysia"` beside `manufacturer.address.country = "China"` and can check the
finding themselves. Every row carries `data-testid="evidence-row"` and `data-field-path`.

**4. `src/client/screens/review/ReviewScreen.tsx`** — the composition and the data orchestration.

- Reads `shipmentId` from the route. Fires the reads in parallel via the hooks: shipment detail,
  exceptions, documents, and — once `case_id` is known from the detail response — available-actions.
  The panels resolve independently, each with its own skeleton at final dimensions, so a slow panel
  never gates the others.
- A **sticky case header** at the top of the scroll container, always visible while scrolling:
  `back-to-queue` link, then `<h1>Shipment Review — {shipment_id}</h1>`, then importer, `StatusBadge`,
  `PriorityIndicator` with its basis, and the value. Test ids `review-shipment-id`, `review-status`,
  `review-priority`, `review-value`.
- **`Back to queue`** is a real `<a href>` (via react-router `Link`) to `QUEUE_PATH`, rendered on
  every state of this screen including the loading, error and not-found states. It is the only
  navigation element on the screen; there is no forward link, because the screen it would point at is
  deferred and out of scope.
- Layout: two columns at ≥ 1024px — left holds entry data and documents, right holds validation
  results, with the action panel full width beneath. Single column below 1024px in the fixed order
  header → entry data → documents → validation results → action panel. Sizes come from the container,
  never from viewport units.
- States: loading (`review-loading`, per-panel skeletons, `aria-busy`), `404 RESOURCE_NOT_FOUND` →
  `review-not-found` with the server message and the back link, any other failure → `review-error`
  with `ErrorPanel`. The container itself always carries `data-testid="review-screen"`.

**5. `EntryDataPanel.tsx`** — the system band, label-value layout, all eight mandated attributes plus
the entry date. Each field gets `data-testid="entry-field-{name}"`: `importer`, `carrier`,
`product-description`, `hts-code`, `country-of-origin`, `manufacturer-name`, `manufacturer-address`
(full address with the **country emphasised**, because it is the field that conflicts),
`shipment-value`, `entry-date`. When `hts_digit_count` is present, annotate the HTS code with
*"{n} digits normalized"* — the annotation is what makes the incomplete classification legible at a
glance. Format the value with `formatUsd` from the decimal **string** (`"85000.00"` → `$85,000.00`);
never `Number()` it. A build omitting any of the eight fails acceptance.

**6. `DocumentsPanel.tsx`** — one row per `DocumentView`, `data-testid="document-row"` plus
`data-testid="document-row-{document_type}"`, `data-document-type` and `data-document-status`. Each
row shows `display_name`, the state as a **text label** in `[data-testid="document-status"]`
(*"Received"* / *"Not received"*, never a colour or an icon alone), the provenance (*Seeded* /
*Ingested* / *Uploaded this session*), the filename and the received timestamp when present, and
`required_by_rules` when the type is missing. When `requested` is populated, add *"Requested by
{name} on {date}"*, derived from the case's action history. **Missing documents render as an explicit
absence**, never as a gap in the list — a missing certificate is the finding, so it must be as visible
as a received one. Include the standing note *"Every document is either seeded with the demo data or
recorded against a request. No importer correspondence path exists."* There is **no upload control
and no download link**: that lifecycle is deferred and not in this plan, and there is no route to
call.

**7. `ValidationResultsPanel.tsx`** — the panel the 30-second comprehension target depends on. One
`<article data-testid="exception-card">` per **open** exception, in the server's persisted evaluation
order (never re-sorted client-side), each carrying `data-exception-type` and `data-exception-id`, and
each containing, in this order:

- the `ExceptionTypeChip` and the severity as a **word** (`data-testid="exception-severity"`);
- `rule.name` (`exception-rule-name`) and `rule.description`;
- `rule.policy_reference` labelled **"Authority"** (`exception-policy-reference`);
- the `assertion` sentence (`exception-assertion`);
- an **EVIDENCE** sub-block of `EvidenceRow`s — at least one per exception, always;
- a **MISSING INFORMATION** list (`exception-missing-information`) rendering each item's requirement
  and its policy reference, or the word *"None"* when empty.

Header line: *"{open} open · Resolved ({resolved})"*. Resolved exceptions live behind a collapsed
`<button aria-expanded>` disclosure (`resolved-exceptions-disclosure`) and are marked *"Resolved, not
deleted"* — history stays present without making the working set noisy. If
`ExceptionsResponse.evaluation` is `null`, render *"Not yet evaluated"* rather than an empty panel.
There is **no "View triggering rule" drawer** and no evaluation-diff link: both are deferred and out
of scope; the rule name, description and authority are already on the card, which is what the
comprehension target actually requires.

**8. `JustificationInput.tsx`** — the control that makes the decision the human's.

- A real `<label>`, `<textarea data-testid="justification-input" aria-required="true">`, **empty on
  arrival, always**. No template, no placeholder text that could be submitted, and no
  suggest-a-justification affordance anywhere in the product.
- A live counter `data-testid="justification-counter"` reading `"{n} / {min} minimum"`, associated
  via `aria-describedby`, with `aria-live="off"` on the counter so a screen reader is not interrupted
  on every keystroke; the under-minimum error is announced once on blur.
- The standing note beneath the field: *"Write your own reasoning. This text is recorded verbatim
  under your name."*
- `min` is `justification_min_length` **from the server's available-actions projection for the
  selected action** — one source of truth, never a hard-coded 10 in the client. The panel re-reads it
  when the selected action changes, so a clearance with an accepted/mixed basis raises the floor
  without any client-side rule.
- The typed text is **preserved on every rejection**. A live demo cannot afford retyping 400
  characters.

**9. `ActionPanel.tsx`** — the human band, and the governance claim made visible.

- Renders **all five actions on every render**, in the fixed order `REQUEST_INFORMATION`,
  `SEND_FOR_SPECIALIST_REVIEW`, `CLEAR_EXCEPTION`, `PLACE_ON_HOLD`, `ESCALATE_TO_SUPERVISOR`, as a
  single `role="radiogroup"` of cards, each `data-testid="action-option-{ACTION}"` with
  `data-available="true|false"`. **None is selected initially** and no form auto-submits. The list is
  never shortened: a hidden action explains nothing, and the operator has to be able to learn the
  shape of their own authority including its edges.
- An unavailable action renders disabled with **three simultaneous signals** — disabled styling, the
  word `UNAVAILABLE`, and a lock glyph — and its `reason_text` **from the server** rendered as a
  paragraph in the layout (`data-testid="action-unavailable-reason"`), never a tooltip and never a
  `title=`. The card stays focusable with `aria-disabled="true"` and the reason wired via
  `aria-describedby`, so a keyboard user hears why rather than skipping past silently. The client
  never invents reason copy — the reason shown is the reason the server would return.
- Selecting an action reveals **only that action's** fields, driven by `required_fields`:
  - `REQUEST_INFORMATION` → `field-document-types`: a checkbox list built from the open exceptions'
    `missing_information` document types, plus an "other type" text input gated by a
    `justify_unlisted_document` checkbox. Submits `document_types` normalized to upper snake case.
    Optional `requested_from` and `due_by` inputs, both labelled **descriptive only — nothing is
    transmitted**.
  - `SEND_FOR_SPECIALIST_REVIEW` → optional `field-assign-to` (omit it entirely rather than guessing
    user ids; there is no users endpoint, so leave it unset unless a value is typed).
  - `CLEAR_EXCEPTION` → `field-resolution-basis` select
    (`EXCEPTIONS_RESOLVED` / `EXCEPTIONS_ACCEPTED` / `MIXED`), and `exception_ids` submitted as the
    **exact current open set** read from the exceptions response — the server rejects a subset or a
    superset with `EXCEPTION_SET_STALE`, so send the whole set, display it read-only, and never let
    the user partially select. An `acknowledge_outstanding_requests` checkbox appears when the case is
    `AWAITING_INFORMATION`. The control is labelled **"Clear exception"** and its helper text says the
    acting user is recorded as making this decision; it must not imply a supervisor approved it.
  - `PLACE_ON_HOLD` → `field-hold-reason` select over the four codes, with a detail textarea required
    when `OTHER`.
  - `ESCALATE_TO_SUPERVISOR` → `field-escalation-reason` select over the five codes, with a detail
    textarea required when `OTHER`.
- `JustificationInput` sits beneath the fields and applies to every action.
- `data-testid="action-submit"` is **disabled until every required field is valid**, including the
  justification minimum — the gate is visible before the attempt, not an error after it. It is also
  disabled while the mutation is in flight, so a double-click cannot double-post.
- Submit posts `POST /api/cases/{case_id}/actions` with the discriminated `ActionCommand` and the
  `If-Match-Case-Version` header carrying `case.case_version`. On success: invalidate the shipment,
  exceptions, documents, available-actions and queue queries, then render a
  **`data-testid="action-confirmation"` panel** (a panel, not a toast — a confirmation must not vanish
  before a presenter finishes a sentence) announced via `aria-live="polite"`, stating: what was
  recorded, the status change as `{before} → {after}` in words, the justification quoted verbatim in
  the human band under the actor's name and role from `ActionResult.acting_user`, and what the user
  can do next. Reset the form.
- On failure: render `data-testid="action-error"` inline with the server's message and `request_id`,
  **keep the typed justification**, and handle the specific codes the server can return —
  `JUSTIFICATION_REQUIRED`, `VALIDATION_FAILED` (map `field_errors` onto the offending inputs so every
  bad field is annotated in one round trip), `INVALID_TRANSITION`, `TRANSITION_REDUNDANT`,
  `CASE_TERMINAL`, `DOCUMENT_TYPE_NOT_REQUIRED`, `DUPLICATE_DOCUMENT_REQUEST`,
  `DOCUMENT_ALREADY_RECEIVED`, `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED`, `EXCEPTION_SET_STALE`,
  `ASSIGNEE_INVALID`, `ESCALATION_TARGET_INVALID`. On `CASE_VERSION_CONFLICT`, refetch and tell the
  user the case changed — **never retry silently**.
- When the case status is `CLEARED`, replace the whole panel with a read-only disposition summary
  (status, cleared timestamp, the recorded approving official from `ShipmentDetail`) rather than
  disabling five controls: at a terminal state there is nothing to explain, only a disposition to
  report.
- The panel contains **no approve/reject control and no authority rail** — the approval chain is
  deferred and out of scope, and rendering a control for it would misdescribe the action space.

**10. `Review.module.css`** — the two-column layout, the sticky header, the panel and card surfaces,
and the human band treatment, all from the tokens in `styles/app.css`. Container-relative sizing
only.

**11. `e2e/review.spec.ts`** — the review screen's own contract, read-only. It must not mutate a case,
so that it is order-independent from the mutating spec:

- **Reached by clicking a queue row.** From `page.goto('/')`, click
  `[data-testid="queue-row-SHP-2026-0007"]` and assert the URL is `/shipments/SHP-2026-0007` **and**
  `[data-testid="review-screen"]` is visible. This is the assertion that proves the screen is not
  orphaned — the queue spec proved the navigation, this proves the destination renders.
- **Whole case on one screen.** All nine entry fields render non-empty: `entry-field-importer`,
  `-carrier`, `-product-description`, `-hts-code`, `-country-of-origin`, `-manufacturer-name`,
  `-manufacturer-address`, `-shipment-value`, `-entry-date`. `-country-of-origin` contains *Malaysia*
  and `-manufacturer-address` contains *China* — the conflict must be readable side by side without
  leaving the screen.
- **Documents, absence included.** `[data-testid="documents-panel"]` lists at least one row with
  `data-document-status="RECEIVED"`, and `[data-testid="document-row-CERTIFICATE_OF_ORIGIN"]` carries
  `data-document-status="NOT_RECEIVED"` with a visible *"Not received"* text label.
- **Evidence renders.** `[data-testid="exception-card"]` count is **3**, and their
  `data-exception-type` values are exactly the set `MISSING_REQUIRED_DOCUMENT`, `INVALID_HTS_CODE`,
  `CONFLICTING_COUNTRY_OF_ORIGIN`. For **every** card: non-empty `exception-rule-name`, non-empty
  `exception-policy-reference`, non-empty `exception-assertion`, and at least one
  `[data-testid="evidence-row"]`. The origin card's evidence text contains both *Malaysia* and
  *China*; the HTS card's evidence text contains *8541.40*; the missing-document card's
  `exception-missing-information` mentions *CERTIFICATE_OF_ORIGIN*. An exception with no evidence is
  the failure mode the whole product exists to prevent.
- **All five actions, always.** `[data-testid^="action-option-"]` count is exactly **5**, in the fixed
  order, and every element with `data-available="false"` has a visible non-empty
  `[data-testid="action-unavailable-reason"]` — asserted as visible text, not as a `title` attribute.
- **Justification gates the submit, asserted in three steps and without submitting.** Select an
  available action that is **not** `CLEAR_EXCEPTION` and fill its required fields. Assert the textarea
  was **empty on arrival**; with an empty justification `[data-testid="action-submit"]` is
  **disabled**; after typing `abc` it is still **disabled** and `[data-testid="justification-counter"]`
  shows the shortfall; at the advertised minimum it becomes **enabled**. Then reload the page rather
  than submitting — the submission path is `cross-screen.spec.ts`'s, and this spec leaves the
  canonical shipment untouched.
- **Not found.** `/shipments/SHP-9999-0000` renders `[data-testid="review-not-found"]` with a working
  `back-to-queue` link, not a blank screen and not a crash.
- **Nothing deferred is on screen.** The page body text does not match
  `/AI[- ]generated|Recommended action|Model confidence|Revalidate|Audit (record|trail)|Upload|Approve clearance|Supervisor approval/i`.

**12. `e2e/cross-screen.spec.ts`** — the loop that only exists when both screens are built. One
`test.describe.serial` block sharing a page. It is the only spec in this plan that mutates state, and
it acts on **`SHP-2026-0001`**, never the canonical shipment:

- **Submit an action with a justification.** Go to `/`, click
  `[data-testid="queue-row-SHP-2026-0001"]`, record `[data-testid="review-status"]` as
  `statusBefore`, select an available non-clearing action (`PLACE_ON_HOLD` when available, otherwise
  the first available action that is not `CLEAR_EXCEPTION`), fill its required fields, type a
  justification comfortably above the advertised minimum, and submit.
- **The confirmation is a panel and names the change.** `[data-testid="action-confirmation"]` becomes
  visible, quotes the typed justification verbatim, and names the `{before} → {after}` status
  transition.
- **The new status is visible on the review screen.** `[data-testid="review-status"]` no longer reads
  `statusBefore`.
- **The new status is visible on the queue.** Click `[data-testid="back-to-queue"]`, assert the URL is
  `/` and the table renders, then assert that row's `[data-testid="queue-row-status"]` shows the new
  status. The decision propagated through the API to the list a colleague works from — the closing
  assertion of the slice.
- **A rejection is surfaced and the input survives.** Re-open the same shipment and submit the same
  action again, which the server now rejects (`TRANSITION_REDUNDANT`, or `INVALID_TRANSITION` /
  `EXCEPTION_SET_STALE` depending on the action chosen). Assert `[data-testid="action-error"]` renders
  a human message plus a `req_` reference **and** that the justification textarea still holds the
  typed text. A silent failure here is the defect this test exists to prevent.
- **No orphan navigation, runtime half.** On the queue and again on the review screen, evaluate
  `[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))` and assert every href
  is `/` or matches `^/shipments/[^/]+$`. Every navigation element points at a route the app serves.
  </action>

  <verify>
npm run typecheck && npm run build:client 2>&1 | tail -5 && npx playwright test --reporter=list 2>&1 | tail -40 && grep -q 'shipments/:shipmentId' src/client/App.tsx && grep -q 'back-to-queue' src/client/screens/review/ReviewScreen.tsx && grep -q 'exception-card' src/client/screens/review/ValidationResultsPanel.tsx && grep -q 'evidence-row' src/client/components/EvidenceRow.tsx && grep -q 'justification-input' src/client/screens/review/JustificationInput.tsx && grep -q 'action-submit' src/client/screens/review/ActionPanel.tsx && grep -q 'action-confirmation' src/client/screens/review/ActionPanel.tsx && grep -q 'available-actions' src/client/api/hooks.ts && ! grep -rqiE 'AI-generated|Model confidence|Recommended action|Revalidate|Audit record|Approve clearance' src/client/screens/review/ && ! grep -rqE 'to="/(queue|session|admin|notifications)|/resolution|/audit' src/client/ && echo CONTRACT_OK
  </verify>

  <done>
- `npm run typecheck` and `npm run build:client` exit 0, and `npx playwright test` passes the **whole**
  suite — `shell`, `queue`, `review` and `cross-screen` — with 0 failing and 0 skipped.
- `App.tsx` now registers exactly `/`, `/shipments/:shipmentId` and the inline not-found; no other
  path is registered and no link in the client points anywhere else.
- Clicking a queue row opens a rendered review screen at `/shipments/{id}`, and `Back to queue` is
  present on every state of that screen, including loading, error and not-found, pointing at `/`.
- The review screen renders all eight mandated entry attributes plus the entry date, each with its own
  test id, with the manufacturer address country emphasised and the HTS digit count annotated, and the
  value formatted from the decimal string.
- The documents panel lists every known document type with a text state label, provenance, and an
  explicit not-received state for missing types — a missing document is visible as an absence. No
  upload control and no download link exists.
- The validation results panel renders one card per open exception carrying its type, severity, rule
  name and description, policy reference, assertion, at least one evidence row with the raw and
  normalized field values, and its missing-information list. It renders independently of any other
  panel.
- The action panel always renders exactly five action cards in the fixed order; every unavailable one
  is disabled with the server's `reason_text` visible in the layout and reachable by keyboard.
- The justification textarea is never prefilled, shows a live counter against the server-advertised
  minimum, and the submit control is disabled until every required field including the justification
  is valid — asserted in the browser in three steps.
- A successful action shows a confirmation panel naming the before → after status and quoting the
  justification under the actor's name, and the new status is visible on both the review screen and
  the queue row.
- A rejected action shows the server's message and `request_id` inline and leaves the typed
  justification intact; `CASE_VERSION_CONFLICT` refetches instead of retrying.
- No AI summary, recommendation, confidence, revalidate, upload, download, audit, approve or reject
  element is rendered anywhere, and the greps in `<verify>` find none.
- Only `cross-screen.spec.ts` mutates state and it acts on `SHP-2026-0001`, so the canonical
  `SHP-2026-0007` is left at its seeded state for wave 5.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user input → API | Filter values, sort strings, document type names, reason codes and justification text typed or selected by the user and sent to the wave 3 API as query params or a JSON body |
| route param → API path | The `:shipmentId` URL segment, fully user-controlled, interpolated into `/api/shipments/{id}` request paths |
| API/db → render | Importer names, product descriptions, manufacturer addresses, rule text, evidence values, error messages and justifications, all originating in the database and reflected into the DOM |
| server error → user | Wave 3's error envelope, which may carry `details` and `field_errors` alongside the user-facing message |
| build config → preview iframe | Vite dev/preview server response headers, the one place a frontend build can reintroduce a frame block |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Tampering | `API/db → render` across every panel — stored values reflected into the DOM (XSS) | mitigate | All dynamic content renders as React children (auto-escaped). `dangerouslySetInnerHTML` appears nowhere in `src/client/` — asserted by the grep in every task's `<verify>`. Evidence values render as text nodes inside `src/client/components/EvidenceRow.tsx`'s `<dl>`, never as markup. |
| T-04-02 | Tampering | `user input → API` — query string construction in `src/client/api/client.ts::apiGet` | mitigate | The query string is built with `URLSearchParams` (never string concatenation), so a crafted value cannot inject query structure. Validation of the values themselves is deliberately **not** done in the client: `QueueScreen.tsx` forwards URL-restored `QueueQuery` values verbatim and the server rejects anything outside its enums with `422 INVALID_QUERY_PARAM`, which `QueueScreen.tsx` surfaces as `queue-error` instead of falling back to unfiltered data. Client-side sanitising would hide the rejection and render a result set that does not match the URL; `e2e/queue.spec.ts` asserts the rejection path. |
| T-04-03 | Tampering | `route param → API path` — `shipmentId` interpolated into request paths in `src/client/api/client.ts` and `src/client/routes.ts::reviewPath` | mitigate | Every path segment taken from a route param passes through `encodeURIComponent` before interpolation, in both the API path builder and the router link builder, so a crafted segment cannot escape into a different path or add query structure. |
| T-04-04 | Information disclosure | `server error → user` — error rendering in `src/client/components/ui.tsx::ErrorPanel` and `ActionPanel.tsx`'s `action-error` | mitigate | `ErrorPanel` is the single component that formats an error, and it renders only `error.message` and `error.request_id`. Raw response bodies, stack traces, absolute paths and `details` payloads are never rendered; `field_errors` are used only to annotate the matching input by `path`. Diagnosis happens through `request_id`. |
| T-04-05 | Elevation of privilege | `user input → API` — action submission in `src/client/screens/review/ActionPanel.tsx` | mitigate | The client is never the authority. Availability, reason text and `justification_min_length` all come from `GET /api/cases/:id/available-actions` and are re-enforced by the server on `POST`; the client renders the projection and never computes permission itself. The client never sends an actor id or a role — identity is resolved server-side, and the request schemas are `additionalProperties: false`, so a client-claimed actor is a `422`. Disabling a control is a usability affordance, not a security control. |
| T-04-06 | Spoofing | `build config → preview iframe` — response headers from `vite.config.ts` | mitigate | `vite.config.ts` configures no `server.headers` and no `preview.headers`, asserted by `! grep -qi 'headers' vite.config.ts` in Task 1 `<verify>`; the production path emits no headers from the client at all (static assets served by the wave 3 API, which sends no `X-Frame-Options` and a CSP with no `frame-ancestors`). `e2e/shell.spec.ts` asserts on the real served document that no `x-frame-options` header and no CSP `frame-ancestors` directive is present, so a regression fails a test in Task 1 rather than blanking a live demo. |
| T-04-07 | Repudiation | `user input → API` — the justification captured in `src/client/screens/review/JustificationInput.tsx` | mitigate | Justification is mandatory on every action, never prefilled, never templated, and never generated: the textarea is empty on arrival and the submit control in `ActionPanel.tsx` stays disabled until the server-advertised minimum is met. `ActionResult.acting_user` and the verbatim justification are quoted back in the confirmation panel, so the operator sees exactly what was recorded under their name. `e2e/review.spec.ts` asserts the empty-on-arrival and three-step gate; `e2e/cross-screen.spec.ts` asserts the verbatim quotation. |
| T-04-08 | Denial of service | `user input → API` — repeated or concurrent action submission from `ActionPanel.tsx` | mitigate | The submit control is disabled while the mutation is in flight (TanStack Query `isPending`), and every mutating request carries `If-Match-Case-Version`; on `409 CASE_VERSION_CONFLICT` the panel refetches and asks the user to resubmit rather than retrying silently, so a stale client cannot loop against the case row. |
| T-04-09 | Spoofing | Authentication of the acting user | accept | There is no login, session or identity check anywhere in this build: access control is deferred by the recorded scope decision and is out of scope. Every action is attributed to wave 3's single server-resolved default actor. Residual risk is owned by the scope decision (`SCOPE-DECISION.md`), which states plainly that the approval chain and role enforcement are not demonstrated by this slice. |
| T-04-10 | Information disclosure | Outbound network surface of the browser bundle | mitigate | Every request is a relative same-origin `/api/...` URL built in `src/client/api/client.ts`; there is no absolute URL, no second host, no CDN, no font service, no analytics and no telemetry in the bundle — asserted by the absolute-URL grep in Task 1 `<verify>` and in this plan's `integration_contracts.provides`. The dependency list adds no HTTP client and no CDN asset. |
</threat_model>

<verification>
Run in order; each must pass before the next is meaningful.

1. `npm install && npm run typecheck` — exits 0, covering the wave 1-3 server code as well as the
   client (the `tsconfig.json` `types` array was not narrowed).
2. `npm run build:client && test -f dist/client/index.html` — the bundle exists.
3. `npm test` — wave 1-3 unit and integration suites still green (no server file was touched).
4. `npx playwright install --with-deps chromium && npx playwright test --reporter=list` — all four
   spec files, 0 failing, 0 skipped.
5. **Preview smoke, by hand or by wave 5:** `npm start`, then
   `curl -sS -D- -o /dev/null http://127.0.0.1:3000/` returns `200 text/html` and the header block
   contains **no** `x-frame-options` and no `frame-ancestors`; `curl -sS http://127.0.0.1:3000/` returns
   the SPA `index.html`; `curl -sS http://127.0.0.1:3000/shipments/SHP-2026-0007` returns the same
   `index.html` (deep-link fallback works).
6. **Orphan-route check:** every `to=` / `href=` in `src/client/` resolves to `/` or
   `/shipments/:shipmentId`. No dead link, no 404 from a navigation element. (Asserted statically by
   the greps and at runtime by `e2e/cross-screen.spec.ts`.)
7. **Scope check:** `grep -riE 'ai-summary|recommendation|confidence|revalidate|audit|upload|approve|role-switch' src/client/`
   returns nothing.
</verification>

<success_criteria>
- Loading the preview URL at `/` shows the Cargo Exception Queue with the seeded flagged shipments —
  reachable without typing a URL, with no shell, no login and no intermediate screen.
- Every row shows shipment ID, importer, one chip per distinct exception type, priority and status;
  the canonical solar-panel shipment shows three distinct chips; the clean shipment is absent by
  default.
- Filtering and sorting go through the server, applied chips come from the server's interpretation,
  and a rejected filter value — forwarded verbatim from the URL — shows the error with its
  `request_id` rather than unfiltered data.
- Clicking or keyboard-activating a row opens `/shipments/{id}` and renders the review screen; a
  `Back to queue` link returns. These are the only two navigation elements in the application and both
  resolve to routes it serves.
- The review screen shows all eight mandated entry attributes plus the entry date, the documents with
  missing ones rendered as explicit absences, and one card per open exception carrying its rule,
  authority, assertion, field-level evidence and missing-information list — usable with no other panel
  present.
- The action panel always renders all five actions; unavailable ones are disabled with the server's
  reason text visible in the layout and reachable by keyboard.
- No action is submittable without a justification meeting the server-advertised minimum; the
  justification is never prefilled and survives every rejection.
- A submitted action shows a confirmation panel naming the status change and quoting the justification,
  and the new status appears on both screens.
- Nothing deferred renders anywhere: no AI prose, no recommendation, no confidence score, no
  revalidate, no upload, no audit history, no approval control, no role switcher.
- `npm run build:client` produces `dist/client`, `npm start` serves it on `0.0.0.0:3000` as the same
  origin, and the served document carries no frame-blocking header — the preview iframe renders.
- Each screen is proved in the browser by the task that builds it, every task's `<verify>` passes with
  only the files that task and its predecessors created, and `npx playwright test` passes with 0
  failing and 0 skipped once all three tasks are done. The canonical shipment is left unmutated for
  wave 5.
</success_criteria>

<output>
After completion, record the summary at
`.planning/express/cargodemo-cbp-cargo-exception-review-app/04-SUMMARY.md`, noting in particular:
the two route paths, the `dist/client` build output and the commands that produce it, the one-time
`npx playwright install --with-deps chromium` prerequisite, the four spec files and which of them
mutates state, and the full test-id inventory wave 5's journey run will target.
</output>

