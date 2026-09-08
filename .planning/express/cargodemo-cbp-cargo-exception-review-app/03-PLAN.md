---
phase: express-wave-3
plan: 03
type: execute
wave: 3
domain: backend
depends_on: [1, 2]
autonomous: true
files_modified:
  - package.json
  - .env.example
  - src/server/config.ts
  - src/shared/api/index.ts
  - src/shared/api/types.ts
  - src/shared/api/errors.ts
  - src/domain/workflow/types.ts
  - src/domain/workflow/stateMachine.ts
  - src/domain/workflow/guards.ts
  - src/domain/workflow/justification.ts
  - src/domain/workflow/availableActions.ts
  - src/app/actorService.ts
  - src/app/queueService.ts
  - src/app/shipmentService.ts
  - src/app/workflowService.ts
  - src/infra/db/repositories/workflowRepository.ts
  - src/infra/db/repositories/idempotencyRepository.ts
  - src/infra/db/index.ts
  - src/server/plugins/errorMapper.ts
  - src/server/plugins/headers.ts
  - src/server/plugins/spa.ts
  - src/server/routes/registry.ts
  - src/server/routes/queue.ts
  - src/server/routes/shipments.ts
  - src/server/routes/cases.ts
  - src/server/app.ts
  - src/server/index.ts
  - tests/unit/workflow.stateMachine.test.ts
  - tests/unit/workflow.availableActions.test.ts
  - tests/integration/api.boot.test.ts
  - tests/integration/api.queue.test.ts
  - tests/integration/api.read.test.ts
  - tests/integration/api.actions.test.ts

features:
  implements: ["F9", "F3"]
  depends_on: ["F0", "F2", "F4", "F5"]
  enables: ["F17", "F18"]

must_haves:
  truths:
    - "A client can list the exception queue over HTTP, filtered by status, exception type and priority, and sorted by priority or age."
    - "A client can read one shipment's full detail: entry fields, its case state, its documents and its exceptions with field-level evidence."
    - "A client can ask what the five actions are for a case and, for each unavailable one, why."
    - "A user can take any of the five actions over HTTP and the case status changes exactly as the state machine says it should."
    - "An action without a justification of at least 10 characters is rejected; no state change occurs."
    - "An illegal transition is rejected with the spec's error envelope naming the current status and the attempted action; no state change occurs."
    - "Every recorded transition names a human actor and carries that actor's justification verbatim; the server never transitions a case on its own."
    - "A cleared case is terminal: every subsequent action returns CASE_TERMINAL."
    - "Every non-2xx response is the uniform envelope { error: { code, message, details?, field_errors?, request_id } }."
    - "The server binds 0.0.0.0:3000 and sends no X-Frame-Options header and no frame-ancestors directive, so the preview iframe renders."
  artifacts:
    - path: "src/domain/workflow/stateMachine.ts"
      provides: "The transition table as data plus the pure evaluateTransition decision function"
      exports: ["TRANSITIONS", "evaluateTransition", "CASE_STATUSES", "USER_ACTIONS"]
    - path: "src/domain/workflow/availableActions.ts"
      provides: "All five actions with available + reason for a given case state"
      exports: ["computeAvailableActions"]
    - path: "src/app/workflowService.ts"
      provides: "Transactional execution of the five actions"
      exports: ["executeAction", "getAvailableActions"]
    - path: "src/server/app.ts"
      provides: "Fastify assembly, plugin order, route registration, request id, iframe-safe headers"
      exports: ["buildApp"]
    - path: "src/server/index.ts"
      provides: "Startup: migrate -> self-check -> seed-if-empty -> listen 0.0.0.0:3000"
      contains: "0.0.0.0"
    - path: "src/shared/api/types.ts"
      provides: "The response and request contract wave 4 imports verbatim"
      exports: ["QueueRow", "ShipmentDetail", "ExceptionsResponse", "DocumentsResponse", "AvailableActionsResponse", "ActionCommand", "ActionResult", "ErrorEnvelope"]
  key_links:
    - from: "src/server/routes/cases.ts"
      to: "src/app/workflowService.ts"
      via: "POST /api/cases/:case_id/actions handler calls executeAction inside one transaction"
      pattern: "executeAction"
    - from: "src/app/workflowService.ts"
      to: "src/domain/workflow/stateMachine.ts"
      via: "evaluateTransition decides every transition; the service never branches on status itself"
      pattern: "evaluateTransition"
    - from: "src/app/queueService.ts"
      to: "src/domain/rules/engine.ts"
      via: "SEVERITY_RANK drives priority ordering; never ORDER BY severity/priority as text"
      pattern: "SEVERITY_RANK"
    - from: "src/server/plugins/headers.ts"
      to: "the preview iframe"
      via: "no framing header and no framing CSP directive is ever emitted"
      pattern: "buildResponseHeaders"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "src/infra/db/index.ts"
      exports: ["openDb", "runMigrations", "runSchemaSelfCheck", "runSeed", "initDatabase", "repositories"]
      verify: "grep -q 'initDatabase' src/infra/db/index.ts && grep -q 'runSchemaSelfCheck' src/infra/db/index.ts && grep -q 'repositories' src/infra/db/index.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/infra/db/repositories/caseRepository.ts"
      exports: ["getById", "getByCargoEntryId", "listQueued", "loadForUpdate", "updateProjection"]
      verify: "grep -q 'loadForUpdate' src/infra/db/repositories/caseRepository.ts && grep -q 'getByCargoEntryId' src/infra/db/repositories/caseRepository.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/infra/db/repositories/cargoRepository.ts + documentRepository.ts + userRepository.ts"
      exports: ["getByShipmentId", "listDocuments", "listByEntry", "getById", "listActive"]
      verify: "grep -q 'getByShipmentId' src/infra/db/repositories/cargoRepository.ts && grep -q 'listByEntry' src/infra/db/repositories/documentRepository.ts && grep -q 'listActive' src/infra/db/repositories/userRepository.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/infra/db/migrations/001_initial_schema.sql — the tables this wave writes and reads"
      exports:
        - "cases(id, cargo_entry_id, shipment_id, status, priority, priority_basis_json, queued, current_evaluation_id, open_exception_count, exception_type_summary, assigned_to_user_id, hold_reason, hold_reason_detail, hold_placed_by_user_id, hold_placed_at, escalation_reason, escalated_by_user_id, escalated_to_user_id, escalated_at, approving_official_user_id, approving_official_name, approving_official_role, cleared_at, last_action_id, created_at, updated_at) + CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL))"
        - "case_actions(id, case_id, cargo_entry_id, action, status_before, status_after, justification, parameters_json, evaluation_id, actor_user_id, actor_name, actor_role, audit_entry_id, idempotency_key, occurred_at) + CHECK (length(trim(justification)) >= 10) + UNIQUE INDEX (case_id, idempotency_key) WHERE idempotency_key IS NOT NULL"
        - "idempotency_keys(key, scope, request_hash, response_json, status_code, created_at) PRIMARY KEY (key, scope)"
        - "cargo_entries(... shipment_value_cents ...), documents(... document_type, status, filename, provenance, stated_country, superseded ...), users(id, name, role, active)"
      verify: "grep -q 'CREATE TABLE case_actions' src/infra/db/migrations/001_initial_schema.sql && grep -q 'CREATE TABLE idempotency_keys' src/infra/db/migrations/001_initial_schema.sql && grep -q 'shipment_value_cents' src/infra/db/migrations/001_initial_schema.sql && grep -q 'approving_official_user_id' src/infra/db/migrations/001_initial_schema.sql && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "fixtures/users.seed.json — the single default actor this build attributes every action to"
      exports: ["usr-cs-001 = Marisol Reyes, role CARGO_SPECIALIST, active 1"]
      verify: "node -e \"const u=require('./fixtures/users.seed.json');const a=Array.isArray(u)?u:u.users;const d=a.find(x=>x.id==='usr-cs-001');if(!d||d.role!=='CARGO_SPECIALIST')process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "src/shared/types/detection.ts"
      exports: ["ExceptionRecord", "EvidenceRecord", "MissingInformationItem", "PriorityBasisEntry"]
      verify: "grep -q 'ExceptionRecord' src/shared/types/detection.ts && grep -q 'MissingInformationItem' src/shared/types/detection.ts && grep -q 'PriorityBasisEntry' src/shared/types/detection.ts && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "src/infra/db/repositories/exceptionRepository.ts"
      exports: ["listOpenByEntry", "listByCaseWithEvidence"]
      verify: "grep -q 'listByCaseWithEvidence' src/infra/db/repositories/exceptionRepository.ts && grep -q 'listOpenByEntry' src/infra/db/repositories/exceptionRepository.ts && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "src/domain/rules/engine.ts — SEVERITY_RANK, the only correct severity/priority ordering"
      exports: ["SEVERITY_RANK"]
      verify: "grep -q 'SEVERITY_RANK' src/domain/rules/engine.ts && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "Populated state after migrate + seed — the queue this wave serves is backed by real rows"
      exports: ["exceptions > 0", "evidence > 0", "SHP-2026-0007 has 3 OPEN exceptions", "SHP-2026-0011 has 0 and cases.queued = 0"]
      verify: "grep -q 'createEvaluateHook' scripts/seed.ts && grep -q 'createEvaluateHook' src/app/evaluationService.ts && echo CONTRACT_OK"

  provides:
    - artifact: "HTTP endpoint inventory — the complete API surface of this build"
      exports:
        - "GET  /api/queue"
        - "GET  /api/shipments/:shipment_id"
        - "GET  /api/shipments/:shipment_id/exceptions"
        - "GET  /api/shipments/:shipment_id/documents"
        - "GET  /api/cases/:case_id/available-actions"
        - "POST /api/cases/:case_id/actions"
      shape: |
        # There are SIX routes under /api. Nothing else exists; any other /api path is
        # 404 RESOURCE_NOT_FOUND. Wave 4 must not call an endpoint that is not on this list.
        # Base path /api; same-origin only; no CORS configuration exists.
        # Content-Type: application/json; charset=utf-8 on every response.
        # Every response carries X-Request-Id. POST /api/cases/:id/actions also carries X-Case-Version.
        # Any non-/api path is served by the SPA fallback (see the "server binding" contract).
      verify: "grep -q \"'/api/queue'\" src/server/routes/queue.ts && grep -q 'shipment_id/exceptions' src/server/routes/shipments.ts && grep -q 'available-actions' src/server/routes/cases.ts && grep -q \"case_id/actions\" src/server/routes/cases.ts && echo CONTRACT_OK"

    - artifact: "GET /api/queue — the queue row shape wave 4 renders"
      exports: ["QueueQuery", "QueueRow", "QueueResponse"]
      shape: |
        // src/shared/api/types.ts — field names are BINDING and verbatim. Wave 4 imports
        // these types; it must not invent, rename or infer a field.
        export interface QueueQuery {
          status?: CaseStatus[];          // repeatable: ?status=NEW&status=IN_REVIEW
          exception_type?: ExceptionType[];
          priority?: Priority[];
          include_clean?: boolean;        // default false — zero-exception cases are off the queue
          include_cleared?: boolean;      // default false
          sort?: string;                  // default 'priority:desc,age:desc'
                                          // allowed fields: priority | age | updated_at | shipment_id | status
          page?: number;                  // default 1
          page_size?: number;             // default 25, max 100 (101 => 422, never clamped)
        }

        export interface QueueRow {
          shipment_id: string;                    // "SHP-2026-0007"
          case_id: string;                        // "case-0007"
          importer_name: string;
          carrier_name: string;
          priority: Priority;                     // 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
          priority_basis_summary: string;         // cases.priority_basis_json details joined by '; '
          status: CaseStatus;
          open_exception_count: number;
          exception_types: Array<{ type: ExceptionType; count: number }>;   // multi-exception stays multi
          exception_summary: string;              // server-rendered labels joined by '; '
          oldest_exception_opened_at: string | null;   // ISO-8601 UTC ms
          age_days: number;                       // floor((now - oldest_exception_opened_at)/86400000); 0 when null
          assigned_to: UserRef | null;
          shipment_value_usd: string;             // decimal STRING from shipment_value_cents, e.g. "85000.00"
          updated_at: string;                     // ISO-8601 UTC ms
        }

        export interface QueueResponse {
          data: QueueRow[];
          page: { page: number; page_size: number; total: number; total_pages: number };
          applied: { filters: Record<string, unknown>; sort: string };
        }

        // exception_summary label map (server-rendered, deterministic):
        //   MISSING_REQUIRED_DOCUMENT       -> "Missing " + missing document types, Title Cased, joined by ", "
        //   INVALID_HTS_CODE                -> "Incomplete HTS code" | "Invalid HTS code" (by sub_reason)
        //   CONFLICTING_COUNTRY_OF_ORIGIN   -> "Origin conflict"
        // Segments joined by '; ' in the exceptions' persisted evaluation order.
      verify: "grep -q 'priority_basis_summary' src/shared/api/types.ts && grep -q 'exception_summary' src/shared/api/types.ts && grep -q 'shipment_value_usd' src/shared/api/types.ts && grep -q 'oldest_exception_opened_at' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "GET /api/shipments/:shipment_id — full shipment detail"
      exports: ["ShipmentDetail", "CaseActionView"]
      shape: |
        export interface ShipmentDetail {
          shipment_id: string;
          case_id: string;
          importer_name: string;
          carrier_name: string;
          product_description: string;
          hts_code: string | null;
          hts_code_normalized: string | null;
          hts_digit_count: number | null;
          country_of_origin: string;
          country_of_origin_iso2: string | null;
          manufacturer: {
            name: string;
            address: {
              line1: string; city: string | null; region: string | null;
              postal_code: string | null; country: string; country_iso2: string | null;
            };
          };
          shipment_value_usd: string;             // "85000.00" — decimal string, never a JS number
          entry_date: string;                     // "2026-08-28"
          case: {
            status: CaseStatus;
            priority: Priority;
            priority_basis: PriorityBasisEntry[];        // parsed from cases.priority_basis_json
            open_exception_count: number;
            current_evaluation: { id: string; version: number; evaluated_at: string;
                                  trigger: string; rule_set_fingerprint: string } | null;
            assigned_to: UserRef | null;
            hold_reason: string | null;
            hold_reason_detail: string | null;
            escalation_reason: string | null;
            escalated_to: UserRef | null;
            approving_official: UserRef | null;          // populated when status === 'CLEARED'
            cleared_at: string | null;
            case_version: number;                        // epoch millis of cases.updated_at
            action_history: CaseActionView[];            // ascending by occurred_at, most recent 20
          };
          _links: { exceptions: string; documents: string; available_actions: string; actions: string };
        }

        export interface CaseActionView {
          action_id: string;
          action: UserAction;
          status_before: CaseStatus;
          status_after: CaseStatus;
          justification: string;                  // verbatim, human-authored
          parameters: Record<string, unknown>;    // parsed from case_actions.parameters_json
          actor: UserRef;
          occurred_at: string;
        }

        // `_links.actions` is the POST action endpoint (the write target), not a history route.
        // No ai_summary, ai_recommendation or audit link is emitted: those surfaces are deferred,
        // and a link to a route that does not exist is worse than no link.
      verify: "grep -q 'ShipmentDetail' src/shared/api/types.ts && grep -q 'action_history' src/shared/api/types.ts && grep -q 'case_version' src/shared/api/types.ts && grep -q 'hts_digit_count' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "GET /api/shipments/:shipment_id/exceptions — exceptions with field-level evidence"
      exports: ["ExceptionsResponse", "ExceptionView"]
      shape: |
        export interface ExceptionsResponse {
          evaluation: { id: string; version: number; trigger: string;
                        evaluated_at: string; rule_set_fingerprint: string } | null;
          open: ExceptionView[];        // deterministic evaluation order, never re-sorted client-side
          resolved: ExceptionView[];    // CLEARED_BY_DECISION / SUPERSEDED_BY_EVALUATION rows
          counts: { open: number; resolved_by_revalidation: number; cleared_by_decision: number };
        }

        // ExceptionView is wave 2's ExceptionRecord (src/shared/types/detection.ts) re-exported
        // unchanged, with `rule` presented as an object for rendering:
        export interface ExceptionView {
          exception_id: string;                   // = exceptions.id
          exception_type: ExceptionType;
          sub_reason: string;                     // 'INCOMPLETE_DIGITS' | 'ORIGIN_MISMATCH' | 'DOCUMENT_NOT_RECEIVED' | ...
          severity: Severity;
          status: 'OPEN' | 'RESOLVED_BY_REVALIDATION' | 'CLEARED_BY_DECISION' | 'SUPERSEDED_BY_EVALUATION';
          assertion: string;                      // one sentence, rendered from the evidence values
          opened_at: string;
          rule: { id: string; name: string; version: number; description: string;
                  policy_reference: string; severity: Severity };
          evidence: EvidenceRecord[];             // wave 2 shape, ordered by display_order ASC, length >= 1
          missing_information: MissingInformationItem[];   // wave 2 shape
        }
      verify: "grep -q 'ExceptionsResponse' src/shared/api/types.ts && grep -q 'missing_information' src/shared/api/types.ts && grep -q 'policy_reference' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "GET /api/shipments/:shipment_id/documents — documents received panel"
      exports: ["DocumentsResponse", "DocumentView"]
      shape: |
        export interface DocumentsResponse { data: DocumentView[] }

        export interface DocumentView {
          id: string | null;                      // null for a required-but-absent type
          document_type: string;                  // "CERTIFICATE_OF_ORIGIN"
          display_name: string;                   // "Certificate Of Origin" — Title Cased server-side
          status: 'RECEIVED' | 'NOT_RECEIVED';
          provenance: 'SEEDED' | 'INGESTED' | 'SIMULATED_UPLOAD' | null;
          filename: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          received_at: string | null;
          required_by_rules: string[];            // rule ids from open exceptions' missing_information
          requested: { requested_at: string; requested_by: UserRef;
                       action_id: string; requested_from: string | null } | null;
        }

        // `requested` is derived from this case's REQUEST_INFORMATION action history, so the review
        // screen can show "requested" beside a missing document. It is NOT a document-request
        // record: the document request and upload lifecycle is deferred and not in this plan,
        // so there is no request id, no fulfilment, no upload and no content route.
      verify: "grep -q 'DocumentsResponse' src/shared/api/types.ts && grep -q 'required_by_rules' src/shared/api/types.ts && grep -q 'display_name' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "GET /api/cases/:case_id/available-actions — what the user may do, and why not"
      exports: ["AvailableActionsResponse", "AvailableAction", "UnavailableReason"]
      shape: |
        export type UnavailableReason =
          | 'TRANSITION_REDUNDANT' | 'CASE_TERMINAL' | 'NO_MISSING_DOCUMENTS';

        export interface AvailableAction {
          action: UserAction;
          available: boolean;
          reason: UnavailableReason | null;       // ALWAYS non-null when available === false
          reason_text: string | null;             // the fixed display string for `reason`
          required_fields: string[];              // e.g. ['justification','document_types']
          justification_min_length: number;       // 10, or 40 for CLEAR_EXCEPTION with accepted/mixed basis
        }

        export interface AvailableActionsResponse {
          case_id: string;
          shipment_id: string;
          status: CaseStatus;
          actor: UserRef;                         // the single default actor, resolved server-side
          actions: AvailableAction[];             // ALWAYS all five, never a filtered subset
          case_version: number;
        }

        // Fixed reason_text strings (FRD F09a §5), the only three reachable in this build:
        //   TRANSITION_REDUNDANT -> "The case is already in this state."
        //   CASE_TERMINAL        -> "This shipment has been cleared and can no longer be changed."
        //   NO_MISSING_DOCUMENTS -> "There are no outstanding document requirements to request."
        // Role-derived reasons (ROLE_NOT_PERMITTED, ESCALATED_REQUIRES_SUPERVISOR,
        // HOLD_REQUIRES_RELEASE, SELF_APPROVAL_BLOCKED) are unreachable: access control is
        // out of scope for this build, so nothing can produce them.
      verify: "grep -q 'AvailableActionsResponse' src/shared/api/types.ts && grep -q 'reason_text' src/shared/api/types.ts && grep -q 'NO_MISSING_DOCUMENTS' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "POST /api/cases/:case_id/actions — the action write (request body per action)"
      exports: ["ActionCommand", "RequestInformationCommand", "SendForSpecialistReviewCommand", "ClearExceptionCommand", "PlaceOnHoldCommand", "EscalateToSupervisorCommand"]
      shape: |
        // Discriminated on `action`. additionalProperties: false on every variant — a property
        // belonging to a different action's schema is a 422, never silently ignored.
        // `justification` is REQUIRED on all five: 10-2000 chars after trimming, never
        // whitespace-only, never defaulted, never generated. This is the product's core claim.

        interface ActionBase { justification: string }

        export interface RequestInformationCommand extends ActionBase {
          action: 'REQUEST_INFORMATION';
          document_types: string[];               // 1-10 items, /^[A-Z0-9_]{3,60}$/ after upper-snake normalization
          requested_from?: string | null;         // <= 200 chars, descriptive only; nothing is transmitted
          due_by?: string | null;                 // YYYY-MM-DD, informational only
          justify_unlisted_document?: boolean;    // default false; true requires justification >= 20 chars
        }
        export interface SendForSpecialistReviewCommand extends ActionBase {
          action: 'SEND_FOR_SPECIALIST_REVIEW';
          assign_to_user_id?: string | null;      // must resolve to an active user, else 422 ASSIGNEE_INVALID
        }
        export interface ClearExceptionCommand extends ActionBase {
          action: 'CLEAR_EXCEPTION';
          exception_ids: string[];                // 0-20; MUST equal the case's current OPEN set exactly
          resolution_basis: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';
          acknowledge_outstanding_requests?: boolean;   // required true when status is AWAITING_INFORMATION
                                                        // and a document type was requested and not received
        }
        export interface PlaceOnHoldCommand extends ActionBase {
          action: 'PLACE_ON_HOLD';
          hold_reason: 'AWAITING_EXTERNAL_INPUT' | 'PENDING_POLICY_GUIDANCE' | 'RESOURCE_CONSTRAINT' | 'OTHER';
          hold_reason_detail?: string | null;     // required 10-500 chars when hold_reason === 'OTHER'
          review_by?: string | null;              // YYYY-MM-DD, informational only
        }
        export interface EscalateToSupervisorCommand extends ActionBase {
          action: 'ESCALATE_TO_SUPERVISOR';
          escalation_reason: 'POLICY_AMBIGUITY' | 'HIGH_VALUE' | 'REPEAT_OFFENDER_PATTERN'
                           | 'CONFLICTING_EVIDENCE' | 'OTHER';
          escalation_reason_detail?: string | null;     // required 10-500 chars when 'OTHER'
          escalate_to_user_id?: string | null;          // must resolve to an active SUPERVISOR, else 422
        }

        export type ActionCommand =
          | RequestInformationCommand | SendForSpecialistReviewCommand | ClearExceptionCommand
          | PlaceOnHoldCommand | EscalateToSupervisorCommand;

        // Optional request headers:
        //   Idempotency-Key        <= 128 chars. Identical replay returns the original 201 body;
        //                          a different payload under the same key => 409 IDEMPOTENCY_KEY_REUSED.
        //   If-Match-Case-Version  integer. Stale => 409 CASE_VERSION_CONFLICT.
      verify: "grep -q 'ClearExceptionCommand' src/shared/api/types.ts && grep -q 'resolution_basis' src/shared/api/types.ts && grep -q 'justify_unlisted_document' src/shared/api/types.ts && grep -q 'escalation_reason' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "POST /api/cases/:case_id/actions — the 201 response shape"
      exports: ["ActionResult"]
      shape: |
        export interface ActionResult {
          action_id: string;
          case_id: string;
          shipment_id: string;
          action: UserAction;
          status: { before: CaseStatus; after: CaseStatus };
          acting_user: UserRef;                   // { id, name, role } — always a resolved human
          justification: string;                  // verbatim, as submitted
          occurred_at: string;                    // ISO-8601 UTC ms
          side_effects: {
            document_types_requested: string[];
            case_assigned_to: UserRef | null;
            escalated_to: UserRef | null;
            hold_reason: string | null;
            exceptions_cleared: string[];         // exception ids set to CLEARED_BY_DECISION
            approving_official: UserRef | null;   // set only by CLEAR_EXCEPTION (see the clearance note)
            cleared_at: string | null;
          };
          available_actions: AvailableAction[];   // refreshed for the NEW state, so the UI needs no refetch
          case_version: number;                   // also returned as the X-Case-Version response header
        }
      verify: "grep -q 'ActionResult' src/shared/api/types.ts && grep -q 'available_actions' src/shared/api/types.ts && grep -q 'exceptions_cleared' src/shared/api/types.ts && echo CONTRACT_OK"

    - artifact: "The uniform error envelope and its code catalog"
      exports: ["ErrorEnvelope", "ApiErrorCode"]
      shape: |
        // EVERY non-2xx response body, without exception. Clients branch on `code`, never `message`.
        export interface ErrorEnvelope {
          error: {
            code: ApiErrorCode;
            message: string;                      // user-facing copy
            details?: Record<string, unknown>;    // diagnostic, e.g. { expected: [...], actual: [...] }
            field_errors?: Array<{ path: string; code: string; message: string }>;
            request_id: string;                   // matches the X-Request-Id response header
          };
        }

        export type ApiErrorCode =
          // transport (FRD Y2 §1)
          | 'RESOURCE_NOT_FOUND'          // 404
          | 'MALFORMED_JSON'              // 400
          | 'VALIDATION_FAILED'           // 422 (with field_errors)
          | 'INVALID_QUERY_PARAM'         // 422
          | 'PAYLOAD_TOO_LARGE'           // 413
          | 'IDEMPOTENCY_KEY_REUSED'      // 409
          | 'CASE_VERSION_CONFLICT'       // 409
          | 'INTERNAL_ERROR'              // 500
          // workflow (FRD Y2 §4)
          | 'INVALID_TRANSITION'          // 409  "Cannot {action} a case in status {status}"
          | 'TRANSITION_REDUNDANT'        // 409  "Case is already {status}"
          | 'CASE_TERMINAL'               // 409  "Shipment {id} is Cleared and cannot be changed"
          | 'ACTION_NOT_A_USER_ACTION'    // 422
          | 'JUSTIFICATION_REQUIRED'      // 422
          | 'DOCUMENT_TYPE_NOT_REQUIRED'  // 422
          | 'DUPLICATE_DOCUMENT_REQUEST'  // 409
          | 'DOCUMENT_ALREADY_RECEIVED'   // 409
          | 'OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED' // 422
          | 'EXCEPTION_SET_STALE'         // 409
          | 'ASSIGNEE_INVALID'            // 422
          | 'ESCALATION_TARGET_INVALID';  // 422

        // Error bodies never contain SQL, stack traces, absolute paths or environment values.
      verify: "grep -q 'ErrorEnvelope' src/shared/api/errors.ts && grep -q 'INVALID_TRANSITION' src/shared/api/errors.ts && grep -q 'JUSTIFICATION_REQUIRED' src/shared/api/errors.ts && grep -q 'request_id' src/shared/api/errors.ts && echo CONTRACT_OK"

    - artifact: "Server binding, headers and start command"
      exports: ["npm start", "buildApp", "host 0.0.0.0", "port 3000"]
      shape: |
        # Binding — BINDING for the sandbox preview proxy:
        #   host 0.0.0.0 (CARGODEMO_HOST), port 3000 (CARGODEMO_PORT). Port occupied => exit 1,
        #   never an automatic fallback: a shifting URL breaks an embedded preview.
        # Startup sequence (src/server/index.ts):
        #   runMigrations -> runSchemaSelfCheck -> runSeed(SEED_IF_EMPTY) -> default-actor check -> listen
        #   Any failure => stderr + process.exit(1). One readiness line on success.
        # package.json: "start": "tsx src/server/index.ts"
        #
        # Response headers — the iframe contract:
        #   NO framing header is ever sent (neither the DENY nor the SAMEORIGIN value).
        #   CSP: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';
        #        script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none';
        #        base-uri 'self'      <-- NO framing directive at all
        #   X-Content-Type-Options: nosniff ; Referrer-Policy: no-referrer
        #   Cache-Control: no-store on /api/* ; no Strict-Transport-Security ; no CORS headers
        #
        # SPA fallback (src/server/plugins/spa.ts), registered LAST so /api always wins:
        #   dist/client/index.html present -> served for every non-/api path (wave 4's bundle)
        #   absent                         -> 200 text/plain "CargoDemo API is running; client bundle not built"
        #   Wave 4 builds into dist/client; wave 5 owns the single-command boot around `npm start`.
      verify: "grep -q '0.0.0.0' src/server/index.ts && grep -q '3000' src/server/config.ts && ! grep -rqi 'X-Frame-Options\\|frame-ancestors' src/server/ && node -e \"const s=require('./package.json').scripts; if(!s.start) process.exit(1)\" && echo CONTRACT_OK"

    - artifact: "Case workflow semantics wave 4 must render and wave 5 must drive"
      exports: ["TRANSITIONS", "the five action codes", "the seven statuses", "the clearance boundary"]
      shape: |
        # The five action codes, verbatim:
        #   REQUEST_INFORMATION | SEND_FOR_SPECIALIST_REVIEW | CLEAR_EXCEPTION
        #   PLACE_ON_HOLD       | ESCALATE_TO_SUPERVISOR
        # The seven statuses, verbatim:
        #   NEW | IN_REVIEW | AWAITING_INFORMATION | ON_HOLD | ESCALATED | PENDING_APPROVAL | CLEARED
        #
        # Transition table as implemented in this build (CLEARED is terminal):
        #   NEW                  RI->AWAITING_INFORMATION  SFSR->IN_REVIEW  CE->CLEARED  POH->ON_HOLD  ETS->ESCALATED
        #   IN_REVIEW            RI->AWAITING_INFORMATION  SFSR=REDUNDANT   CE->CLEARED  POH->ON_HOLD  ETS->ESCALATED
        #   AWAITING_INFORMATION RI->AWAITING_INFORMATION  SFSR->IN_REVIEW  CE->CLEARED  POH->ON_HOLD  ETS->ESCALATED
        #   ON_HOLD              RI->AWAITING_INFORMATION  SFSR->IN_REVIEW  CE->CLEARED  POH=REDUNDANT ETS->ESCALATED
        #   ESCALATED            RI->AWAITING_INFORMATION  SFSR->IN_REVIEW  CE->CLEARED  POH->ON_HOLD  ETS=REDUNDANT
        #   PENDING_APPROVAL     RI->AWAITING_INFORMATION  SFSR->IN_REVIEW  CE->CLEARED  POH->ON_HOLD  ETS->ESCALATED
        #   CLEARED              every action => 409 CASE_TERMINAL
        #
        # CLEARANCE BOUNDARY — read this before rendering or driving CLEAR_EXCEPTION:
        #   CLEAR_EXCEPTION clears the case directly and records the ACTING USER as the approving
        #   official on their own decision (cases.approving_official_user_id / _name / _role and
        #   cases.cleared_at), which is what satisfies the schema's clearance CHECK. The real
        #   two-person specialist-to-supervisor approval step is deferred and not in this plan;
        #   the schema CHECK is neither weakened nor dropped to work around its absence.
        #   Wave 4 MUST label the control "Clear exception" and MUST NOT imply supervisor approval.
        #
        # PENDING_APPROVAL is a seed-only inbound status in this build: nothing transitions into it.
      verify: "grep -q 'PENDING_APPROVAL' src/domain/workflow/stateMachine.ts && grep -q 'CASE_TERMINAL' src/domain/workflow/stateMachine.ts && grep -q 'approving_official_user_id' src/app/workflowService.ts && echo CONTRACT_OK"

    - artifact: "src/shared/api — the single import path for the contract"
      exports: ["everything above, re-exported from src/shared/api/index.ts"]
      shape: |
        // Wave 4 imports ONLY from 'src/shared/api'. It must not import from src/server,
        // src/app, src/domain or src/infra (TechArch 01-components §1.2 layer rule).
        export * from './types';
        export * from './errors';
      verify: "grep -q \"export \\* from './types'\" src/shared/api/index.ts && grep -q \"export \\* from './errors'\" src/shared/api/index.ts && echo CONTRACT_OK"
---

<objective>
Implement the case workflow state machine with its five human actions (F9) and the HTTP
contract the two in-scope screens consume (F3): the queue read with filter and sort, the full
shipment detail with documents and exceptions-with-evidence, the available-actions projection,
and the action write endpoint — all behind one uniform error envelope, on a server bound to
0.0.0.0:3000.

Purpose: waves 1 and 2 built a database that knows which shipments are flagged and why. Nothing
can reach it yet, and nothing can act on it. This wave is the whole middle of the product: it
turns detected exceptions into a queue a person can work, and it turns a person's decision into
a validated, attributed, justified state change. The governance claim the demo exists to make
lives here — the server never transitions a case on its own, every transition is caused by an
explicit user action carrying an actor and a justification, and an illegal transition is
refused with a reason rather than absorbed.

Output: a pure `src/domain/workflow/*` state machine, the `src/shared/api` contract wave 4
imports verbatim, a Fastify app with six routes, three read services, and the transactional
action write.
</objective>

<feature_dependencies>
Implements: F9: Exception Case Workflow & User Actions, F3: Backend HTTP API
Depends on: F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset (wave 1), F4: Configurable Business Rule Engine, F5: Exception Detection, Evidence Capture & Flagging (wave 2)
Enables: F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
</feature_dependencies>

<context>
@.planning/PROJECT.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/SCOPE-DECISION.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/WAVE-SCHEDULE.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/01-PLAN.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/02-PLAN.md
@project_specs/FRD/F09a-case-workflow-state-machine.md
@project_specs/FRD/F09b-case-workflow-actions.md
@project_specs/FRD/F03-backend-http-api.md
@project_specs/FRD/Y1a-api-read.md
@project_specs/FRD/Y1b-api-actions.md
@project_specs/FRD/Y2-errors.md
@project_specs/TechArch/01-components.md
@project_specs/TechArch/03a-api-conventions-read.md
@project_specs/TechArch/03b-api-actions.md
@project_specs/TechArch/04-security.md
@project_specs/TechArch/05-tech-stack.md
</context>

<scope_boundary>
Read this before writing code. It is the difference between a correct wave and a rejected one.

**Six routes exist. Not seven.** `GET /api/queue`, `GET /api/shipments/:shipment_id`,
`GET /api/shipments/:shipment_id/exceptions`, `GET /api/shipments/:shipment_id/documents`,
`GET /api/cases/:case_id/available-actions`, `POST /api/cases/:case_id/actions`. Do not add,
stub or route anything else. In particular do not add: a login or session route, a users or
role route, a document upload, download, content or request route, a revalidation route, an AI
summary or recommendation route, an audit or notification route, a rule administration route,
an approval route, an ingestion route, a reset route, an OpenAPI route, or a health route. Each
belongs to a feature that is **deferred** by the recorded scope decision. A health check in
particular belongs to the demo-environment feature, which is **out of scope** here; wave 5 can
probe readiness with `GET /api/queue`, which is a real endpoint returning real data.

**Human authority is the invariant.** There is no code path anywhere in this wave that changes
`cases.status` other than `executeAction`, and `executeAction` cannot be reached without a
resolved human actor and a justification the human wrote. No scheduler, no background job, no
inference, no cascade. Assert it: the only statement in the codebase matching
`UPDATE cases SET status` lives in `workflowRepository.applyTransition`, and it is called from
exactly one place.

**Access control is out of scope, so the role dimension collapses.** There is no session, no
login screen, no identity provider, no permission matrix and no role gating. Every action is
attributed to the single default user wave 1 seeded (`usr-cs-001`, Marisol Reyes,
`CARGO_SPECIALIST`), resolved server-side from the `users` table on every request so the name
and role on the record come from the database rather than from a request field. Nothing in a
request body, query string or header may name an actor or a role; the request schemas are
`additionalProperties: false`, so an attempt is a loud 422.

Consequences, all of them recorded rather than silently absorbed:

- The role column of the FRD transition table is dropped. Rows that differ only by role
  (T18 from `ON_HOLD`, T21-T24 from `ESCALATED`) become permitted for the single actor.
- The reason codes `ROLE_NOT_PERMITTED`, `ESCALATED_REQUIRES_SUPERVISOR`,
  `HOLD_REQUIRES_RELEASE` and `SELF_APPROVAL_BLOCKED` are unreachable and are not emitted.
- "Escalate to supervisor" and "send for specialist review" record the state transition, the
  actor and the justification. Neither implements a second-person step: the approval chain is
  **deferred**.

**The clearance boundary — the most consequential decision in this wave.** The FRD sends
`CLEAR_EXCEPTION` to `PENDING_APPROVAL` awaiting a supervisor, and the schema's
`CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT
NULL))` enforces that no case is cleared without a named official. The supervisor approval
chain is **deferred** by the recorded scope decision, so shipping the FRD path verbatim would
strand every clearance in `PENDING_APPROVAL` forever and break the primary journey this build
exists to demonstrate. Therefore, in this build:

- `CLEAR_EXCEPTION` transitions directly to `CLEARED` and records **the acting user as the
  approving official on their own decision** — `approving_official_user_id`,
  `approving_official_name`, `approving_official_role` and `cleared_at` are all populated from
  the resolved actor, which is exactly what satisfies the CHECK.
- The CHECK is **not** weakened, dropped, or worked around. It is satisfied honestly.
- A real two-person approval step, where the approver must differ from the recommender, is
  **deferred** and is not implemented here. Say so in the summary, and do not let wave 4 label
  the control in a way that implies supervisor approval happened.
- `PENDING_APPROVAL` becomes a seed-only inbound status: two seeded shipments carry it and
  nothing in this build transitions into it. Its outbound rows T27, T28 and T30 are modified to
  permitted, because their spec reasons (`APPROVAL_PENDING`, `RECOMMENDATION_ALREADY_PENDING`,
  supervisor authority) all reference a pending recommendation entity that this build never
  creates. Leaving them blocked would strand those two shipments for no reason a user could act
  on.

**What this wave writes.** Rows into exactly three tables: `case_actions`, `idempotency_keys`,
and `request_log`. Column updates on `cases` (`status`, `assigned_to_user_id`, `hold_reason`,
`hold_reason_detail`, `hold_placed_by_user_id`, `hold_placed_at`, `escalation_reason`,
`escalated_by_user_id`, `escalated_to_user_id`, `escalated_at`, `approving_official_*`,
`cleared_at`, `last_action_id`, `open_exception_count`, `queued`, `exception_type_summary`,
`updated_at`) and on `exceptions` (`status` to `CLEARED_BY_DECISION` on a clearance). It writes
**zero** rows into `audit_entries`, `notifications`, `notification_reads`, `approvals`,
`recommendations`, `document_requests`, `ai_outputs`, `sessions`, and it creates no evaluation,
exception or evidence rows — detection belongs to wave 2 and is not re-run here.

**Recorded deviations from FRD F09a/F09b, and why.**

- **No audit entry and no notification per transition.** F09b §1 steps 12-13 and invariant I4
  couple every transition to one audit entry and one notification inside the transaction. The
  audit-record and notification features are **deferred**, so there is no append-only surface to
  write to and no template catalog to render. The durable fact of the decision is the
  `case_actions` row, which carries the actor, the role, the before and after status, the
  verbatim justification and the action parameters. `case_actions.audit_entry_id` is
  `TEXT NOT NULL` with no foreign key; write the literal sentinel `'AUDIT_NOT_IN_SCOPE'` so the
  absence is explicit rather than a fabricated id that looks like a record.
- **Invariant I10 (denials are recorded) is not persisted.** A rejected action returns the error
  envelope and is written to `request_log` with its `error_code`; it produces no audit entry,
  because audit is **deferred**.
- **No document request rows.** F09b §2's side effect creates `document_requests` rows; the
  document request and upload lifecycle is **deferred**. The requested document types, the
  `requested_from` label and the `due_by` date are recorded in
  `case_actions.parameters_json`, surfaced in `case.action_history` and on the documents panel
  as `DocumentView.requested`. Guard G-DUP is evaluated against that action history instead of
  against outstanding request rows, and G-CANCEL has nothing to cancel.
- **Guards G-AUTH, G-SOD, G-WITHDRAW and G-AUDIT are not applicable** — they gate on role,
  on a recommendation, or on an audit entry, none of which exist here. G-DOC, G-DUP, G-REC's
  exception-set half, and G-ACK are all implemented; see Task 1.
- **`JUSTIFICATION_NOT_AUTHORED` is not implemented.** It rejects a justification that is an
  exact copy of the AI rationale; AI assistance is **deferred**, so there is no rationale to
  copy and the check has no referent. Every other justification rule is enforced.
- **`ai_recommendation`, `audit_entry_id` and `notification_id` are absent from `ActionResult`**
  and `pending_approval` is absent from `QueueRow`, for the same reasons. Emitting a null field
  for a feature that does not exist would mislead wave 4 into rendering a placeholder.

**Two things you own that waves 1-2 deliberately left to you.**

1. **The `shipment_value_usd` projection.** The canonical column is
   `cargo_entries.shipment_value_cents` (integer cents). The API field is
   `shipment_value_usd`, a **decimal string** such as `"85000.00"`. Convert with integer maths
   (`Math.trunc(cents / 100)` and `String(cents % 100).padStart(2, '0')`), never
   `(cents/100).toFixed(2)` on a float, and never emit a JS number for money.
2. **Severity and priority ordering.** `priority` is a TEXT enum that string-sorts to
   `MEDIUM > LOW > HIGH > CRITICAL`. Import `SEVERITY_RANK` from wave 2's
   `src/domain/rules/engine.ts` and build the SQL `ORDER BY` from it as a generated
   `CASE priority WHEN … THEN <rank> END` expression, so there is exactly one ranking in the
   codebase. `ORDER BY priority DESC` anywhere is a defect.

**Two forbidden literal strings.** The wave-4 and wave-5 integration contracts assert
`! grep -rqi 'x-frame-options\|frame-ancestors' src/server/`, and this plan's own gates add
`helmet` to that list over `src/server/` and `package.json`. Those greps are
case-insensitive and match comments and string literals as readily as code. So: **never write
the literal text `X-Frame-Options`, `frame-ancestors` or `helmet` anywhere under `src/server/`
or in `package.json`** — not in code, not in a comment, not in a test fixture string. When you
need to explain the rule in a comment, refer to it obliquely ("no framing header is emitted;
see the plan's scope boundary"). The tests that assert the header is absent live under
`tests/`, which no contract greps, so they may name it freely.

**Infrastructure:** SQLite is file-backed and needs no server process, so this wave ships
**no** `docker-compose.yml` and no datastore service. Do not create one. `npm start` runs
migrate → self-check → seed-if-empty → listen; wave 5 owns whatever single-command wrapper it
needs around that.

**Task boundaries are gate boundaries.** Each task's `<verify>` must pass at the moment that
task completes, using only files that task and its predecessors created — and must still pass
at the end of the wave, when later tasks have added routes and services. That is why Task 2's
boot test asserts route **inclusion** and a universal per-route property, while the exact
six-route inventory is asserted in Task 3, after `routes/shipments.ts` and `routes/cases.ts`
exist. Do not move an assertion earlier than the file it depends on, and do not write a gate
whose truth a later task would break.
</scope_boundary>

<tasks>

<task type="auto">
  <name>Task 1: Declare the API contract and build the case state machine as pure domain data — transitions, guards, justification rules, available-actions projection</name>
  <files>
src/shared/api/errors.ts
src/shared/api/types.ts
src/shared/api/index.ts
src/domain/workflow/types.ts
src/domain/workflow/stateMachine.ts
src/domain/workflow/guards.ts
src/domain/workflow/justification.ts
src/domain/workflow/availableActions.ts
tests/unit/workflow.stateMachine.test.ts
tests/unit/workflow.availableActions.test.ts
  </files>

  <feature_dependencies>
Implements: F9: Exception Case Workflow & User Actions (statuses, transition table, guards, mandatory justification, availability projection), F3: Backend HTTP API (the shared request/response contract and the error envelope)
Depends on: F0: Cargo Entry Data Model & Persistence (the `cases` and `case_actions` vocabularies from wave 1), F5: Exception Detection, Evidence Capture & Flagging (wave 2's `ExceptionRecord`, `EvidenceRecord`, `MissingInformationItem`, `PriorityBasisEntry`)
Enables: F3's transport layer (Tasks 2 and 3 of this plan), F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
  </feature_dependencies>

  <action>
This task ships **types and pure functions only**: no Fastify, no database, no HTTP. It exists
first because both later tasks import from it, and it is where the contract wave 4 renders is
written down. Everything in `src/domain/workflow/` is **pure**: no `better-sqlite3`, no
`node:fs`, no `Date.now()`, no network, no Fastify. The clock comes in as a parameter. This is a
real layer rule from TechArch `01-components` §1.2 and it is what lets the whole state machine be
exhaustively tested without a database. `src/shared/` is the lowest layer: it imports nothing
from `src/domain`, `src/app`, `src/server` or `src/infra` **except** wave 2's pure type module
`src/shared/types/detection.ts`, which is also in `src/shared`.

**1. `src/shared/api/errors.ts`** — the error catalog and envelope type, exactly as declared in
this plan's `integration_contracts.provides` ("The uniform error envelope and its code catalog").
Export `ApiErrorCode` (every code in that union, verbatim), `ErrorEnvelope`, and a `DomainError`
class carrying `{ code, httpStatus, message, details?, field_errors? }` plus one factory per code
so no handler builds an error by hand. Include the HTTP status mapping from FRD `Y2` verbatim.
The `Y2` §9.1 distinction is preserved in spirit even though no `403` is reachable in this build:
a state problem is `409`, a validation problem is `422`. Waves 4 and 5 grep this file for
`ErrorEnvelope`, `request_id`, `RESOURCE_NOT_FOUND`, `INVALID_QUERY_PARAM` and
`CASE_VERSION_CONFLICT`, so every one of those tokens must appear here literally.

**2. `src/shared/api/types.ts`** — the whole request/response contract, transcribed **verbatim**
from this plan's `integration_contracts.provides`: `QueueQuery`, `QueueRow`, `QueueResponse`,
`ShipmentDetail`, `CaseActionView`, `ExceptionsResponse`, `ExceptionView`, `DocumentsResponse`,
`DocumentView`, `UnavailableReason`, `AvailableAction`, `AvailableActionsResponse`, the five
`*Command` interfaces, `ActionCommand`, `ActionResult`, plus `UserRef` and `PageInfo`. Do not
rename, add or drop a field: wave 4 was planned against these names and greps this file for
`priority_basis_summary`, `exception_summary`, `shipment_value_usd`, `oldest_exception_opened_at`,
`action_history`, `case_version`, `hts_digit_count`, `required_by_rules`, `display_name`,
`reason_text`, `justification_min_length`, `required_fields`, `exceptions_cleared`,
`resolution_basis`, `justify_unlisted_document` and `escalation_reason`.

Two structural rules:

- **Re-export, never redeclare, wave 2's shapes.** `EvidenceRecord`, `MissingInformationItem`
  and `PriorityBasisEntry` come from `src/shared/types/detection.ts` unchanged
  (`export type { … } from '../types/detection';`). One declaration per shape, or the two will
  drift and the review screen will render a field the server never sends.
- **This file owns the canonical vocabularies**, because it is the lowest layer both the domain
  and the client can import:

  ```ts
  export const CASE_STATUSES = ['NEW','IN_REVIEW','AWAITING_INFORMATION','ON_HOLD',
                                'ESCALATED','PENDING_APPROVAL','CLEARED'] as const;
  export const USER_ACTIONS  = ['REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW',
                                'CLEAR_EXCEPTION','PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR'] as const;
  export type CaseStatus = typeof CASE_STATUSES[number];
  export type UserAction = typeof USER_ACTIONS[number];
  ```
  plus the `ExceptionType`, `Severity` and `Priority` aliases (`Priority = Severity`) matching
  TechArch `03a` §3.2.

**3. `src/shared/api/index.ts`** — exactly two lines, because the contract's verify greps for
them literally:

```ts
export * from './types';
export * from './errors';
```
with a file-header comment stating that wave 4 imports **only** from `src/shared/api` and must
not reach into `src/server`, `src/app`, `src/domain` or `src/infra`.

**4. `src/domain/workflow/types.ts`** — the workflow-local types, re-exporting the vocabularies
so domain code has one import path:

```ts
export { CASE_STATUSES, USER_ACTIONS } from '../../shared/api/types';
export type { CaseStatus, UserAction } from '../../shared/api/types';

export type GuardId = 'G-DOC' | 'G-DUP' | 'G-REC' | 'G-ACK';

export interface TransitionRow {
  id: string;                       // 'T01' … 'T33', preserving the FRD numbering
  from: CaseStatus;
  action: UserAction;
  to: CaseStatus | null;            // null => the row is an explicit invalid row
  guards: GuardId[];
  invalid_reason: 'TRANSITION_REDUNDANT' | 'CASE_TERMINAL' | null;
  note: string | null;              // records a deviation from the FRD row, when there is one
}

export interface TransitionContext {           // everything a guard needs, all pre-loaded
  status: CaseStatus;
  open_exception_ids: string[];                // current OPEN set, in evaluation order
  missing_document_types: string[];            // union of open exceptions' missing_information
  received_document_types: string[];           // documents RECEIVED and not superseded
  requested_document_types: string[];          // requested since the case last entered AWAITING_INFORMATION
  now: string;                                 // ISO-8601 UTC ms — injected, never read here
}

export type TransitionDecision =
  | { ok: true;  row: TransitionRow; to: CaseStatus }
  | { ok: false; error: DomainError };
```

**5. `src/domain/workflow/stateMachine.ts`** — `TRANSITIONS` as **data**, one row per
`(from, action)` pair over the seven statuses and five actions, keeping the FRD's `T01`-`T33`
ids so the table stays reviewable against the spec. Re-export `CASE_STATUSES` and `USER_ACTIONS`
from `./types` so this module is the single import for the state machine. Transcribe FRD `F09a`
§2 and apply exactly the modifications recorded in `<scope_boundary>`, each carrying a `note`
string naming the deviation:

| From | RI | SFSR | CE | POH | ETS |
|---|---|---|---|---|---|
| `NEW` | T01 → `AWAITING_INFORMATION` (G-DOC) | T02 → `IN_REVIEW` | T03 → **`CLEARED`** (G-REC) | T04 → `ON_HOLD` | T05 → `ESCALATED` |
| `IN_REVIEW` | T06 → `AWAITING_INFORMATION` (G-DOC) | T07 invalid `TRANSITION_REDUNDANT` | T08 → **`CLEARED`** (G-REC) | T09 → `ON_HOLD` | T10 → `ESCALATED` |
| `AWAITING_INFORMATION` | T11 → `AWAITING_INFORMATION` (G-DOC, G-DUP) | T12 → `IN_REVIEW` | T13 → **`CLEARED`** (G-REC, G-ACK) | T14 → `ON_HOLD` | T15 → `ESCALATED` |
| `ON_HOLD` | T16 → `AWAITING_INFORMATION` (G-DOC) | T17 → `IN_REVIEW` | T18 → **`CLEARED`** (G-REC) | T19 invalid `TRANSITION_REDUNDANT` | T20 → `ESCALATED` |
| `ESCALATED` | T21 → `AWAITING_INFORMATION` (G-DOC) | T22 → `IN_REVIEW` | T23 → **`CLEARED`** (G-REC) | T24 → `ON_HOLD` | T25 invalid `TRANSITION_REDUNDANT` |
| `PENDING_APPROVAL` | T26 → `AWAITING_INFORMATION` (G-DOC) | T27 → `IN_REVIEW` | T28 → **`CLEARED`** (G-REC) | T29 → `ON_HOLD` | T30 → `ESCALATED` |
| `CLEARED` | T33 invalid `CASE_TERMINAL` for all five actions | | | | |

Export `evaluateTransition(status, action, context, command): TransitionDecision`:

1. `status === 'CLEARED'` → `409 CASE_TERMINAL` "Shipment is Cleared and cannot be changed".
   Terminal is checked first so a cleared case never reports a redundancy or a guard failure.
2. Look up the `(from, action)` row. A row with `invalid_reason` returns that code as a `409`
   with the FRD message text (`"Case is already {status}"`). A missing row — impossible once the
   table is complete — returns `409 INVALID_TRANSITION` with
   `"Cannot {action} a case in status {status}"`. Redundant transitions are **rejected, not
   absorbed**: silently succeeding would put a no-op decision on the record.
3. Evaluate the row's guards in order; the first failure returns its own code.
4. Otherwise `{ ok: true, row, to }`.

`evaluateTransition` never reads a clock, never touches a database, and never mutates its
arguments.

**6. `src/domain/workflow/guards.ts`** — the four applicable guards, each a pure predicate over
`TransitionContext` and the command:

- **G-DOC** (`REQUEST_INFORMATION`): every requested type, after upper-snake normalization, is
  either in `context.missing_document_types`, or `justify_unlisted_document === true` with a
  justification of at least 20 characters. Otherwise `422 DOCUMENT_TYPE_NOT_REQUIRED` naming the
  offending type and pointing at the flag, exactly as FRD `Y2` §4 words it. A type already in
  `context.received_document_types` is `409 DOCUMENT_ALREADY_RECEIVED`.
- **G-DUP** (`REQUEST_INFORMATION` from `AWAITING_INFORMATION`): a requested type already in
  `context.requested_document_types` is `409 DUPLICATE_DOCUMENT_REQUEST`. That list is derived
  from the case's action history rather than from request rows — see `<scope_boundary>`.
- **G-REC** (`CLEAR_EXCEPTION`): `command.exception_ids`, as a set, must equal
  `context.open_exception_ids` exactly. A subset, a superset or an unknown id is
  `409 EXCEPTION_SET_STALE` with `details: { expected, actual }`. An empty array is valid only
  when the open set is empty. A partial clearance is not a supported disposition, and silently
  clearing unlisted exceptions would break the traceability claim the product is making.
- **G-ACK** (`CLEAR_EXCEPTION` from `AWAITING_INFORMATION`): when
  `context.requested_document_types` is non-empty and none of those types has since been
  received, `acknowledge_outstanding_requests` must be `true`, else
  `422 OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` naming the count.

Export `GUARDS` as a map keyed by `GuardId` so `evaluateTransition` dispatches through data.

**7. `src/domain/workflow/justification.ts`** — `validateJustification(action, command)`.
Mandatory on **every** action: trim, then require 10-2000 characters and reject whitespace-only,
else `422 JUSTIFICATION_REQUIRED` "A justification of at least {min} characters is required".
For `CLEAR_EXCEPTION` with `resolution_basis` of `EXCEPTIONS_ACCEPTED` or `MIXED` the minimum
rises to 40: accepting a still-firing exception demands a fuller stated reason than confirming a
resolved one. Export `justificationMinLength(action, resolutionBasis?)` so the
available-actions projection advertises the same number the write path enforces — one source,
never two.

**8. `src/domain/workflow/availableActions.ts`** — `computeAvailableActions(context)` returning
**all five** actions, never a filtered subset, each with `available`, `reason`, `reason_text`,
`required_fields` and `justification_min_length`. A hidden action explains nothing; PRD §6
Usability requires every unavailable action to state why. Derive availability by calling
`evaluateTransition` with a probe command per action, so availability and enforcement can never
disagree — if the projection says available and the write path refuses, that is a bug the shared
call makes impossible. Additionally: `REQUEST_INFORMATION` is unavailable with reason
`NO_MISSING_DOCUMENTS` when `context.missing_document_types` is empty and nothing has been
requested. `required_fields` per action: `REQUEST_INFORMATION` →
`['justification','document_types']`; `CLEAR_EXCEPTION` →
`['justification','exception_ids','resolution_basis']`; `PLACE_ON_HOLD` →
`['justification','hold_reason']`; `ESCALATE_TO_SUPERVISOR` →
`['justification','escalation_reason']`; `SEND_FOR_SPECIALIST_REVIEW` → `['justification']`.
The three reachable `reason_text` strings are the fixed FRD `F09a` §5 copy, verbatim.

**9. `tests/unit/workflow.stateMachine.test.ts`** — exhaustive, no database:

- **The full cross-product.** Iterate all 7 statuses × 5 actions (35 pairs) and assert the
  outcome against a literal expectation table written out in the test. This is the test that
  makes the transition table reviewable: a future edit that quietly permits something must
  change this table too.
- Every one of the 35 pairs is either a permitted transition to a canonical status or an
  explicit rejection with a code — no pair is undefined.
- `CLEARED` plus each of the five actions → `409 CASE_TERMINAL`.
- `IN_REVIEW` + `SEND_FOR_SPECIALIST_REVIEW`, `ON_HOLD` + `PLACE_ON_HOLD`, `ESCALATED` +
  `ESCALATE_TO_SUPERVISOR` → `409 TRANSITION_REDUNDANT`, with the current status in the message.
- **Exactly six rows target `CLEARED`**, one per non-terminal status, and every one of them is
  the `CLEAR_EXCEPTION` action. Count it from `TRANSITIONS` rather than asserting it in prose —
  this is the countable expression of "only an explicit human clearance decision clears a case".
- Justification: missing, empty, whitespace-only and 9-character justifications are all
  `422 JUSTIFICATION_REQUIRED` for **all five** actions; a 39-character justification with
  `resolution_basis: 'MIXED'` is rejected and with `'EXCEPTIONS_RESOLVED'` is accepted.
- G-DOC: an unlisted document type is `DOCUMENT_TYPE_NOT_REQUIRED`; the same type with
  `justify_unlisted_document: true` and a 25-character justification passes; with a
  15-character justification it fails.
- G-DUP: requesting an already-requested type from `AWAITING_INFORMATION` is
  `DUPLICATE_DOCUMENT_REQUEST`; requesting a different type passes.
- G-REC: a subset, a superset and an unknown exception id are each `EXCEPTION_SET_STALE`; the
  exact open set passes; an empty array with an empty open set passes.
- G-ACK: clearing from `AWAITING_INFORMATION` with an outstanding requested type and no
  acknowledgement is `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED`; with `true` it passes.
- Purity: `evaluateTransition` does not mutate the context or the command (deep-freeze both and
  assert no throw).

**10. `tests/unit/workflow.availableActions.test.ts`**:

- For each of the seven statuses, the projection returns exactly five entries, in the fixed
  action order, and every entry with `available: false` has a non-null `reason` **and** a
  non-null `reason_text`.
- Availability agrees with enforcement for all 35 pairs: for each pair, `available === true`
  iff `evaluateTransition` returns `ok: true` for a well-formed command.
- `NO_MISSING_DOCUMENTS` appears for `REQUEST_INFORMATION` when nothing is missing, and does not
  appear for the canonical shipment's context (which has a missing certificate of origin).
- `justification_min_length` is 10 everywhere and 40 for `CLEAR_EXCEPTION` when the caller
  passes an accepted/mixed basis probe.
- No entry ever carries a role-derived reason, since access control is out of scope for this
  build.
  </action>

  <verify>
npm run typecheck && npx vitest run tests/unit/workflow.stateMachine.test.ts tests/unit/workflow.availableActions.test.ts --reporter=list 2>&1 | tail -30 && ! grep -rqE "^import .*(better-sqlite3|node:fs|fastify|'fs')" src/domain/workflow/ && grep -q 'ErrorEnvelope' src/shared/api/errors.ts && grep -q 'INVALID_TRANSITION' src/shared/api/errors.ts && grep -q 'JUSTIFICATION_REQUIRED' src/shared/api/errors.ts && grep -q 'request_id' src/shared/api/errors.ts && grep -q 'RESOURCE_NOT_FOUND' src/shared/api/errors.ts && grep -q 'INVALID_QUERY_PARAM' src/shared/api/errors.ts && grep -q 'CASE_VERSION_CONFLICT' src/shared/api/errors.ts && grep -q 'ShipmentDetail' src/shared/api/types.ts && grep -q 'shipment_value_usd' src/shared/api/types.ts && grep -q 'reason_text' src/shared/api/types.ts && grep -q 'justification_min_length' src/shared/api/types.ts && grep -q 'exceptions_cleared' src/shared/api/types.ts && grep -q "export \* from './types'" src/shared/api/index.ts && grep -q "export \* from './errors'" src/shared/api/index.ts && grep -q 'PENDING_APPROVAL' src/domain/workflow/stateMachine.ts && grep -q 'CASE_TERMINAL' src/domain/workflow/stateMachine.ts && echo TASK1_OK
  </verify>

  <done>
- `npm run typecheck` exits 0 and both unit test files pass with 0 failing, 0 skipped.
- `src/shared/api/{types,errors,index}.ts` declare the contract exactly as this plan's
  `integration_contracts.provides` spells it: every field name, every error code, and the two
  literal re-export lines in `index.ts`. Every contract grep in the `<verify>` line passes.
- `TRANSITIONS` covers all 35 `(status, action)` pairs with no undefined outcome, and the test
  asserts every one against a literal expectation table.
- Exactly six rows target `CLEARED`, all of them `CLEAR_EXCEPTION`, counted from the table.
- A missing, empty, whitespace-only or under-length justification is rejected for all five
  actions, with the 40-character floor enforced for accepted/mixed clearance.
- Redundant transitions return `409 TRANSITION_REDUNDANT` rather than succeeding silently, and
  every action on a `CLEARED` case returns `409 CASE_TERMINAL`.
- G-DOC, G-DUP, G-REC and G-ACK each reject and each pass under test, with the exact FRD error
  codes.
- The availability projection agrees with the enforcement path for all 35 pairs, and every
  unavailable action carries a reason and its display text.
- `src/domain/workflow/` imports no database driver, no filesystem module and no HTTP framework
  — the import-scoped grep in `<verify>` finds nothing.
  </done>
</task>

<task type="auto">
  <name>Task 2: Stand up the Fastify server — plugins, error envelope, iframe-safe headers, 0.0.0.0:3000 boot, and the queue read</name>
  <files>
package.json
.env.example
src/server/config.ts
src/app/actorService.ts
src/app/queueService.ts
src/server/plugins/errorMapper.ts
src/server/plugins/headers.ts
src/server/plugins/spa.ts
src/server/routes/registry.ts
src/server/routes/queue.ts
src/server/app.ts
src/server/index.ts
tests/integration/api.boot.test.ts
tests/integration/api.queue.test.ts
  </files>

  <feature_dependencies>
Implements: F3: Backend HTTP API (transport conventions, uniform error envelope, request id, iframe-safe headers, SPA fallback, deterministic binding, the queue read endpoint)
Depends on: F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset (wave 1), F4: Configurable Business Rule Engine (wave 2's `SEVERITY_RANK`), F5: Exception Detection, Evidence Capture & Flagging (wave 2 — the OPEN exceptions the queue aggregates), F9's contract types (Task 1 of this plan)
Enables: F17: Cargo Exception Queue Screen
  </feature_dependencies>

  <action>
This task ends with a server that boots on `0.0.0.0:3000`, serves a real exception queue from
seeded rows, and answers every failure in the uniform envelope. It registers **one** route
(`GET /api/queue`); Task 3 adds the other five. That split is deliberate: it keeps this task
inside a reviewable context budget and it means every gate here is true both now and at the end
of the wave.

**1. `package.json`** — add dependencies `fastify` `^4` and `@fastify/static` `^7`. Ajv is
already present from wave 2 and Fastify uses it internally for schema compilation. Add scripts
`"start": "tsx src/server/index.ts"` and `"dev": "tsx watch src/server/index.ts"`. Do not add a
UI dependency, an HTTP client, a logger, an ORM, a CORS plugin, or a security-header middleware
— TechArch §5.4 excludes each deliberately, the short dependency list is a reviewable security
property here, and the header middleware in particular would reintroduce the framing header that
blanks the preview. Do not name that middleware package anywhere in this file (see the forbidden
literals in `<scope_boundary>`).

**2. `src/server/config.ts`** — extend wave 1's config with `CARGODEMO_DEFAULT_ACTOR_USER_ID`
(default `usr-cs-001`), and add it to `.env.example` with that default. Keep the fail-fast
contract: an invalid value aborts startup rather than defaulting silently. `CARGODEMO_HOST`
defaults to `0.0.0.0` and `CARGODEMO_PORT` to `3000` (the literal `3000` must remain in this
file — waves 4 and 5 grep for it); a host of `localhost` or `127.0.0.1` logs a prominent warning
naming the consequence — the preview proxy cannot reach it.

**3. `src/app/actorService.ts` — `resolveActor(db)`.** Loads
`config.CARGODEMO_DEFAULT_ACTOR_USER_ID` from the `users` table via wave 1's `userRepository`
and returns `{ id, name, role }`. Throws with a clear message if the user is absent or
`active = 0`. There is no session, no token and no login: access control is out of scope for
this build, and the acting identity is a server-side constant resolved against the database, so
the name and role on every record are read facts rather than client claims. Never accept an
actor or a role from a request. `src/server/index.ts` calls `resolveActor` once during startup
and exits 1 if it throws, so a missing default user is a boot failure rather than a runtime
surprise mid-demo.

**4. `src/app/queueService.ts` — `listQueue(db, query)`.** One indexed read over `cases` joined
to `cargo_entries`, plus an aggregate over `exceptions` where `status = 'OPEN'`:

- Default filters exclude zero-exception cases (`queued = 0`) and `CLEARED` cases, overridable
  by `include_clean` and `include_cleared` (FRD `F17` §Validation).
- `status`, `exception_type` and `priority` are repeatable query params validated against the
  canonical enums; a value outside an enum is `422 INVALID_QUERY_PARAM` naming the parameter and
  the value, never ignored. The `exception_type` filter matches cases having at least one OPEN
  exception of that type.
- **Sorting.** Parse `sort` as comma-separated `field:asc|desc` over
  `priority | age | updated_at | shipment_id | status`; an unknown field is
  `422 INVALID_QUERY_PARAM`. Default `priority:desc,age:desc`. Build the priority ordering as a
  generated `CASE priority WHEN 'CRITICAL' THEN 3 … END` expression **derived from wave 2's
  `SEVERITY_RANK` map** (`import { SEVERITY_RANK } from '../domain/rules/engine'`), so the
  ranking exists once in the codebase; `age` orders by `oldest_exception_opened_at` ascending for
  `desc` (older ranks higher). `ORDER BY priority DESC` as raw text is a defect — it yields
  `MEDIUM > LOW > HIGH > CRITICAL`.
- Pagination: `page` ≥ 1 default 1, `page_size` 1-100 default 25; `page_size = 101` is
  `422 INVALID_QUERY_PARAM`, **never silently clamped**.
- Project each row into `QueueRow` exactly as the contract declares: `exception_types` as
  `{ type, count }` pairs so a multi-exception shipment stays visibly multi-exception rather
  than collapsing to one; `exception_summary` from the label map in the contract;
  `priority_basis_summary` by joining `cases.priority_basis_json` entries' `detail` with `'; '`;
  `shipment_value_usd` via the integer-cents conversion; `age_days` as
  `floor((now - oldest_exception_opened_at) / 86400000)`, 0 when there is no open exception.
- Return `{ data, page, applied }` where `applied` echoes the server's interpretation of the
  filters and sort, so the UI renders active-filter chips from the server's reading rather than
  its own.

**5. Plugins and hooks, registered in this fixed order in `src/server/app.ts`.** The order is a
property, not a preference: nothing that touches domain state runs before validation.

- **Request id (an `onRequest` hook declared inline in `app.ts`)** — assign
  `X-Request-Id` (`req-` plus 8 random hex), attach it to the request context, echo it on every
  response and in every error body. It lives in `app.ts` rather than its own plugin file purely
  to keep this task's file count reviewable; it is ~15 lines.
- `headers.ts` — export `buildResponseHeaders(path)` plus the `onSend` hook that applies it: the
  header set from the contract — the CSP **with no framing directive of any kind**,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`
  on `/api/*`. **Never send a framing header.** Do not install a security-header middleware: its
  defaults include the framing header, which blanks the Pivota Preview iframe and fails the demo
  before a screen renders. There is no CORS configuration and no `Strict-Transport-Security`.
  Remember the forbidden literals: do not write the header's name or the CSP directive's name
  anywhere under `src/server/`, not even in a comment.
- Body limit 1 MB → `413 PAYLOAD_TOO_LARGE`. Unparseable JSON → `400 MALFORMED_JSON` (configure
  the JSON content-type parser now, in this task, so the behaviour exists before Task 3 adds the
  POST route that exercises it).
- `errorMapper.ts` — map `DomainError`, Fastify schema-validation failures (into
  `422 VALIDATION_FAILED` with `field_errors` collecting **every** failure in one response, so
  the UI annotates every bad field in one round trip) and any unhandled throw
  (`500 INTERNAL_ERROR`) into the uniform envelope. Strip SQL, stack traces, absolute paths and
  environment values from every message; diagnosis happens through `request_id`. Any unmatched
  `/api/*` path → `404 RESOURCE_NOT_FOUND` in the envelope, never Fastify's default shape.
- An `onResponse` hook (also in `app.ts`) writing `request_log` (method, path, status, actor,
  duration, `error_code`) — routing and outcome metadata only, **no bodies and no field values**
  — trimmed to the most recent 10 000 rows on insert so it cannot become a data sink.
- `spa.ts`, registered **last** so `/api/*` always wins: serve `dist/client` with `index.html`
  fallback when the bundle exists; when it does not, return `200 text/plain` with
  "CargoDemo API is running; client bundle not built" for non-`/api` paths. A blank 200 and a
  500 are both worse than a plain sentence. The literal `dist/client` must appear in this file —
  waves 4 and 5 grep for it.

**6. `src/server/routes/registry.ts` and `src/server/routes/queue.ts`.** Each route module
exports one object per route in exactly this shape, because three separate contract greps and
this wave's route-inventory gate read these literals:

```ts
export const queueListRoute = {
  routeId: 'queue.list',
  method: 'GET' as const,
  url: '/api/queue',          // single-quoted literal, verbatim — contracts grep for it
  schema: { /* querystring + response */ },
  handler: /* … */,
} satisfies RouteDefinition;
```

`registry.ts` exports `ROUTES` as an array of those objects and nothing else — it must contain
**no** `url:` literal of its own, because the end-of-wave inventory gate counts unique
`url: '/api/…'` literals under `src/server/routes/`. At the end of this task `ROUTES` has one
entry; Task 3 appends the other five. Add a startup self-check (called from `buildApp`) that
aborts with a clear message if any registered route lacks a `schema` — a route without one
cannot validate, and TechArch makes this a boot failure rather than a runtime discovery.
Declare full JSON Schemas for path and query params with `additionalProperties: false`; an
unknown query parameter is `422 INVALID_QUERY_PARAM`, because silent absorption is how a filter
quietly stops filtering.

**7. `src/server/app.ts` — `buildApp({ db })`** returns a configured Fastify instance without
listening, so tests can drive it with `app.inject()` and no port. It registers the hooks and
plugins in the order above, then every route in `ROUTES`, then `spa.ts` last.

**8. `src/server/index.ts`** — the startup sequence: load config → `openDb` → `runMigrations` →
`runSchemaSelfCheck` → `runSeed({ mode: 'SEED_IF_EMPTY' })` passing wave 2's
`createEvaluateHook()` as `SeedOptions.evaluate`, so a fresh boot has a populated queue →
`resolveActor` → `buildApp` → `listen({ host: '0.0.0.0', port: 3000 })` → print one readiness
line naming host, port, schema version and seeded counts. The literal `0.0.0.0` must appear in
this file. Any failure before `listen` prints the error code to stderr and exits 1. A port
already in use exits 1 with no automatic fallback: a shifting URL breaks an embedded preview.

**9. `tests/integration/api.boot.test.ts` — the context-boot and iframe-safety test.** The
cheapest, highest-yield test in the wave: it converts a route collision, a missing schema
declaration, a bad plugin order, a broken startup sequence or a reintroduced framing header into
a red test minutes after the code is written, instead of a dead app at human verify. Against a
temp SQLite database migrated and seeded with wave 2's hook:

- `buildApp` builds and `app.ready()` resolves without throwing.
- **Route assertions are inclusion-shaped and universal, never an exact count** — Task 3 adds
  five more routes and this file must still pass then. Assert: `ROUTES` contains
  `{ method: 'GET', url: '/api/queue' }`; **every** entry in `ROUTES` has a non-empty `schema`
  and a unique `(method, url)` pair; every `url` starts with `/api/`. The exact six-route
  inventory is asserted in Task 3, once the remaining route modules exist.
- `GET /api/nope` returns `404` with `error.code === 'RESOURCE_NOT_FOUND'` and a `request_id`
  matching the `X-Request-Id` header.
- A non-`/api` path returns `200` (the SPA fallback notice), not a 404 and not a 500.
- **Iframe safety (a named `describe` block — this is a known, easy-to-reintroduce regression
  that fails the demo silently).** For `GET /api/queue`, the `404` above, and the SPA fallback:
  no response carries a framing header — assert the header is **absent**, not merely permissive;
  the CSP header is present, restricts `default-src`, `script-src` and `connect-src` to
  `'self'`, and contains no framing directive at all; `/api/*` responses carry
  `Cache-Control: no-store`; no response carries `Strict-Transport-Security` or any
  `Access-Control-Allow-*` header. This test file lives under `tests/`, which no contract greps,
  so it may name the forbidden header and directive literally — and it should, so the assertion
  is readable.

**10. `tests/integration/api.queue.test.ts`** — Fastify `inject` against a temp database
migrated and seeded with wave 2's hook, so the rows under test are the rows the demo shows:

- `GET /api/queue` → `200`; `data` excludes the clean shipment `SHP-2026-0011` and the seeded
  `CLEARED` shipment by default; `include_clean=true` and `include_cleared=true` each bring
  their rows back; the `page` totals are consistent.
- The canonical row for `SHP-2026-0007` has `open_exception_count: 3`, three entries in
  `exception_types` covering all three types, a non-empty `exception_summary`,
  `shipment_value_usd === "85000.00"` **as a string**, and a non-empty `priority_basis_summary`.
- **Priority ordering:** `sort=priority:desc` returns `CRITICAL` before `HIGH` before `MEDIUM`
  before `LOW`. Assert the full returned sequence, not just the first row — this is the test
  that fails if anyone string-sorts the enum.
- `status=NEW&status=IN_REVIEW` returns only those statuses; `exception_type=INVALID_HTS_CODE`
  returns only cases having such an OPEN exception; `priority=CRITICAL` filters correctly.
- `sort=bogus:desc`, `status=NOPE` and `page_size=101` each return `422 INVALID_QUERY_PARAM`
  (not a clamp, not an ignore), and an unknown query parameter returns `422`.
- Every response carries `Content-Type: application/json; charset=utf-8` and an `X-Request-Id`.
  </action>

  <verify>
npm install 2>&1 | tail -3 && npm run typecheck && npx vitest run tests/integration/api.boot.test.ts tests/integration/api.queue.test.ts --reporter=list 2>&1 | tail -30 && ! grep -rqiE 'x-frame-options|frame-ancestors|helmet' src/server/ && ! grep -qiE 'helmet' package.json && grep -q '0.0.0.0' src/server/index.ts && grep -q '3000' src/server/config.ts && grep -q "'/api/queue'" src/server/routes/queue.ts && grep -q 'dist/client' src/server/plugins/spa.ts && node -e "const s=require('./package.json').scripts; if(!s.start) process.exit(1)" && echo TASK2_OK
  </verify>

  <done>
- `npm run typecheck` exits 0 and both integration test files pass with 0 failing, 0 skipped.
- `buildApp` boots against a real SQLite database, the route-schema self-check passes, and
  `GET /api/queue` is registered with `url: '/api/queue'` as a single-quoted literal.
- `GET /api/queue` filters by status, exception type and priority, sorts by priority using
  wave 2's `SEVERITY_RANK` (asserted over the full returned sequence), paginates, and rejects
  unknown sort fields, unknown filter values, unknown query params and `page_size > 100` with
  `422 INVALID_QUERY_PARAM` rather than clamping or ignoring.
- `shipment_value_usd` is emitted as the decimal string `"85000.00"` derived from
  `shipment_value_cents`, never as a number.
- Every non-2xx response is the uniform envelope with a `request_id` matching `X-Request-Id`;
  an unmatched `/api/*` path is `404 RESOURCE_NOT_FOUND` in that envelope.
- No response carries a framing header and no CSP contains a framing directive, asserted by the
  iframe block of the boot test as an **absence**; the forbidden literals appear nowhere under
  `src/server/` or in `package.json`, so the wave-4 and wave-5 contract greps pass.
- The server binds `0.0.0.0:3000`, `npm start` exists, the startup sequence runs
  migrate → self-check → seed-if-empty → default-actor check → listen, and exits 1 on any
  failure before listening.
- The boot test's route assertions are inclusion-shaped and universal, so they remain true after
  Task 3 registers the remaining five routes.
- No route exists beyond `GET /api/queue` yet; no compose file was added.
  </done>
</task>

<task type="auto">
  <name>Task 3: Complete the API surface — shipment detail, exceptions with evidence, documents, available actions, and the transactional action write</name>
  <files>
src/app/shipmentService.ts
src/server/routes/shipments.ts
src/infra/db/repositories/workflowRepository.ts
src/infra/db/repositories/idempotencyRepository.ts
src/infra/db/index.ts
src/app/workflowService.ts
src/server/routes/cases.ts
src/server/routes/registry.ts
tests/integration/api.read.test.ts
tests/integration/api.actions.test.ts
  </files>

  <feature_dependencies>
Implements: F9: Exception Case Workflow & User Actions (the five actions, transactional execution, attribution), F3: Backend HTTP API (the three shipment reads, the available-actions read and the action write)
Depends on: F9's state machine and F3's contract types (Task 1 of this plan), F3's transport layer (Task 2 of this plan), F0: Cargo Entry Data Model & Persistence (wave 1), F5: Exception Detection, Evidence Capture & Flagging (wave 2 — the exceptions, evidence and open set these endpoints serve and a clearance must match)
Enables: F18: Shipment Review Screen, F17: Cargo Exception Queue Screen (post-action state)
  </feature_dependencies>

  <action>
This task completes the six-route surface. The five routes it adds — the three shipment reads,
the available-actions read and the action write — are grouped together because the action test
asserts that a state change is **visible on the read surfaces wave 4 renders**, and because
`ShipmentDetail._links` names the two case routes. Splitting the reads from the write would put
a gate in one task on a file created in another, which is exactly the defect this plan was
rewritten to remove.

**1. `src/app/shipmentService.ts`** — three read projections:

- `getShipmentDetail(db, shipmentId)` → `ShipmentDetail`. Joins `cargo_entries`, `cases`, the
  current `evaluations` row, `users` for `assigned_to` / `escalated_to` / `approving_official`,
  and the most recent 20 `case_actions` ascending by `occurred_at` as `action_history` (via
  `workflowRepository.listCaseActions`). `hts_digit_count` is the digit count of
  `hts_code_normalized` (null when the code is null). `case_version` is
  `Date.parse(cases.updated_at)`. `shipment_value_usd` uses the integer-cents conversion from
  `<scope_boundary>`. `_links` carries exactly `exceptions`, `documents`, `available_actions`
  and `actions` — no link to a route that does not exist. Unknown shipment →
  `404 RESOURCE_NOT_FOUND` "Shipment {id} not found".
- `getExceptions(db, shipmentId)` → `ExceptionsResponse`, built on wave 2's
  `exceptionRepository.listByCaseWithEvidence`. `open` holds `status = 'OPEN'` rows in the
  persisted evaluation order (never re-sorted); `resolved` holds `CLEARED_BY_DECISION` and
  `SUPERSEDED_BY_EVALUATION` rows. Evidence arrives ordered by `display_order` and is passed
  through verbatim — raw and normalized values, comparison fields, expected/observed. Do not
  summarize evidence into prose: the whole point is that a reviewer sees
  `country_of_origin = "Malaysia"` beside `manufacturer.address.country = "China"`. A shipment
  with no evaluation returns `evaluation: null` with empty arrays, not a 404.
- `getDocuments(db, shipmentId)` → `DocumentsResponse`. One `DocumentView` per `documents` row,
  plus a synthetic `status: 'NOT_RECEIVED'` row with `id: null` for any document type named in
  an open exception's `missing_information` that has no row at all — the review screen must show
  what is missing as prominently as what is present. `display_name` is the document type Title
  Cased (`CERTIFICATE_OF_ORIGIN` → `Certificate Of Origin`). `required_by_rules` collects
  `required_by_rule` from the open exceptions' `missing_information`. `requested` is derived
  from this case's `REQUEST_INFORMATION` action history — see `<scope_boundary>`; there is no
  document-request record, no upload and no content route, because that lifecycle is deferred.

**2. `src/server/routes/shipments.ts`** — three route objects in the same
`{ routeId, method, url, schema, handler }` shape Task 2 established, with these exact
single-quoted url literals (contract greps depend on the `:shipment_id` parameter name):
`'/api/shipments/:shipment_id'`, `'/api/shipments/:shipment_id/exceptions'`,
`'/api/shipments/:shipment_id/documents'`.

**3. `src/infra/db/repositories/workflowRepository.ts`** — thin named prepared statements with
bound parameters only; no ORM, no template-literal SQL, no caller string concatenated into a
query (TechArch §5.3):

- `loadCaseForUpdate(caseId)` — `SELECT … FROM cases WHERE id = ?`, called inside a
  `BEGIN IMMEDIATE` transaction so the case row is write-locked for the whole use case.
- `buildTransitionContext(caseId)` — assembles the pure `TransitionContext`: the OPEN exception
  ids in evaluation order, the union of their `missing_information` document types, the
  `RECEIVED` non-superseded document types, and the document types requested since the case last
  entered `AWAITING_INFORMATION` (find the most recent `case_actions` row whose `status_after`
  is `AWAITING_INFORMATION` and whose `status_before` is not, then take every
  `REQUEST_INFORMATION` action at or after its `occurred_at`).
- `insertCaseAction(row)` — the durable fact of the decision. `audit_entry_id` is the literal
  `'AUDIT_NOT_IN_SCOPE'`; see `<scope_boundary>`. `evaluation_id` is the case's
  `current_evaluation_id`. `parameters_json` holds the action-specific fields verbatim.
- `applyTransition({ case_id, status, updated_at, last_action_id, …optional columns })` — **the
  only statement in the entire codebase matching `UPDATE cases SET status`.** Write the SQL so
  that `status` is the **first assignment after `SET`**, i.e. the tokens
  `UPDATE cases SET status` appear in that order (any whitespace or newlines between them are
  fine — the gate is whitespace-tolerant, but it does require that token order):

  ```sql
  UPDATE cases
     SET status = @status,
         updated_at = @updated_at,
         last_action_id = @last_action_id,
         assigned_to_user_id = COALESCE(@assigned_to_user_id, assigned_to_user_id),
         …
   WHERE id = @case_id
  ```

  It sets the new status, `updated_at`, `last_action_id`, and whichever of
  `assigned_to_user_id`, `hold_reason`, `hold_reason_detail`, `hold_placed_by_user_id`,
  `hold_placed_at`, `escalation_reason`, `escalated_by_user_id`, `escalated_to_user_id`,
  `escalated_at`, `approving_official_user_id`, `approving_official_name`,
  `approving_official_role`, `cleared_at`, `open_exception_count`, `queued`,
  `exception_type_summary` the action supplies. Do not add a second status-writing statement
  anywhere — not a convenience helper, not a test fixture under `src/`.
- `clearOpenExceptions(caseId, exceptionIds, at)` — sets `status = 'CLEARED_BY_DECISION'` on the
  named rows. Leave `cleared_by_approval_id` NULL: there is no approval row, because the
  approval chain is deferred. Never delete an exception.
- `listCaseActions(caseId, limit)` — the `CaseActionView[]` projection the shipment detail and
  documents panel consume.

**4. `src/infra/db/repositories/idempotencyRepository.ts`** — `find(key, scope)` and
`save({ key, scope, request_hash, response_json, status_code, created_at })` over
`idempotency_keys`, whose primary key is `(key, scope)`. Scope is `case:<case_id>:action`;
`request_hash` is the SHA-256 of the canonically serialized body (sorted keys, no whitespace)
via `node:crypto`. Register both new repositories on `src/infra/db/index.ts`'s
`repositories(db)` factory. Add no repository for a table belonging to a feature excluded from
this build.

**5. `src/app/workflowService.ts` — `executeAction(db, { caseId, command, idempotencyKey, ifMatchCaseVersion }, deps?)`.**
The single uniform mutating skeleton (TechArch §1.5). Everything from step 4 onward runs inside
**one** `db.transaction(...)()`, so a throw anywhere rolls the whole thing back and there is no
state in which a case moved but its action record did not:

1. **Validate the body** against the action's discriminated schema at the transport layer (Task
   2's `errorMapper` turns failures into `422 VALIDATION_FAILED` with `field_errors`). An
   `action` code that is not one of the five — including `APPROVE_CLEARANCE` and
   `REJECT_RECOMMENDATION` — is `422 ACTION_NOT_A_USER_ACTION` "{action} is not one of the five
   user actions".
2. **Validate the justification** via `validateJustification`. Mandatory on every action. A
   decision without a recorded reason is the one thing this product exists to prevent, so this
   runs before anything that could partially succeed.
3. **Idempotency replay:** when `Idempotency-Key` is present, look it up by
   `(key, 'case:<id>:action')`. An identical `request_hash` returns the stored response and
   status verbatim, creating no second action; a different hash is
   `409 IDEMPOTENCY_KEY_REUSED`. A double-click during a live demo must not produce two
   decisions.
4. **Open the transaction** with `BEGIN IMMEDIATE` and `loadCaseForUpdate`. Unknown case →
   `404 RESOURCE_NOT_FOUND` "Case {id} not found".
5. **Case version:** when `If-Match-Case-Version` is supplied and
   `Date.parse(cases.updated_at) !== ifMatchCaseVersion` → `409 CASE_VERSION_CONFLICT` "Case was
   modified by another user; reload and retry".
6. **Resolve the actor** via `resolveActor(db)` — a human with a name and a role, read from the
   database. No path reaches this line without one.
7. **Decide** by calling `evaluateTransition(case.status, command.action, context, command)`
   with the context from `buildTransitionContext`. This is the only decision point and it is
   pure. On `ok: false`, throw the returned `DomainError`: the transaction rolls back, nothing
   is written, and the client receives the envelope with the FRD's code and message.
8. **Apply the action's side effects**, per FRD `F09b` §2-§6, as columns and `parameters_json`
   rather than as rows in a deferred feature's tables:
   - `REQUEST_INFORMATION` → status `AWAITING_INFORMATION`; `parameters_json` carries the
     normalized `document_types`, `requested_from`, `due_by`, `justify_unlisted_document`.
   - `SEND_FOR_SPECIALIST_REVIEW` → status `IN_REVIEW`; sets `assigned_to_user_id` when
     `assign_to_user_id` is supplied and resolves to an active user, else `422 ASSIGNEE_INVALID`.
   - `PLACE_ON_HOLD` → status `ON_HOLD`; sets `hold_reason`, `hold_reason_detail`,
     `hold_placed_by_user_id`, `hold_placed_at`. Outstanding requested types are **retained**,
     not cancelled — a hold does not withdraw a request; the information may still arrive.
   - `ESCALATE_TO_SUPERVISOR` → status `ESCALATED`; sets `escalation_reason`,
     `escalated_by_user_id`, `escalated_at`, and `escalated_to_user_id` when supplied and
     resolving to an active `SUPERVISOR`, else `422 ESCALATION_TARGET_INVALID`.
   - `CLEAR_EXCEPTION` → status `CLEARED`; `clearOpenExceptions` on the exact `exception_ids`;
     sets `approving_official_user_id`, `approving_official_name`, `approving_official_role`
     **from the acting user** and `cleared_at` from the clock — this is what satisfies the
     schema's clearance CHECK, and it is the recorded boundary in `<scope_boundary>`: a genuine
     two-person approval step is deferred. Also sets `open_exception_count = 0`, `queued = 0`
     and `exception_type_summary = ''`, since detection is not re-run and the queue projection
     must reflect the clearance. The literal `approving_official_user_id` must appear in this
     file — the workflow-semantics contract greps for it.
9. **Write the `case_actions` row**, then `applyTransition`, then set `last_action_id`. Exactly
   one action row per transition — never zero, never two.
10. **Persist the idempotency record** when a key was supplied, inside the same transaction, so
    a replay and its original can never disagree.
11. **Return the `ActionResult`**, including `available_actions` recomputed for the **new**
    state so the UI needs no follow-up request, and `case_version` as the new
    `Date.parse(updated_at)`. Set the `X-Case-Version` response header from it.

Also export `getAvailableActions(db, caseId)` for the read route: it builds the same context and
calls `computeAvailableActions`, so the projection and the enforcement path share one decision
function and cannot disagree.

`deps.clock` is injectable for tests; production uses wave 1's `SystemClock`. Timestamps are
ISO-8601 UTC with milliseconds.

**6. `src/server/routes/cases.ts`** — two route objects, appended to `ROUTES` in
`src/server/routes/registry.ts` alongside the three shipment routes. Exact single-quoted url
literals (contract greps depend on the `:case_id` parameter name):

- `'/api/cases/:case_id/available-actions'` → `AvailableActionsResponse`. Unknown case →
  `404 RESOURCE_NOT_FOUND`. Always all five actions.
- `'/api/cases/:case_id/actions'` → `201 Created` with `ActionResult`, `Location` set to the
  case's shipment detail path, and `X-Case-Version`. The body schema is a discriminated union on
  `action` with `additionalProperties: false` on every variant, so a property belonging to a
  different action's schema (`hold_reason` on an escalation, say) is a loud `422` rather than a
  silently ignored field. Optional headers `Idempotency-Key` (≤ 128 chars) and
  `If-Match-Case-Version` (integer).

After this edit `registry.ts` exports exactly six routes and still contains no `url:` literal of
its own.

**7. `tests/integration/api.read.test.ts`** — Fastify `inject` against a temp database migrated
and seeded with wave 2's hook, so the rows under test are the rows the demo shows. This file also
carries the **end-of-wave API-surface assertion**, which belongs here because it is only now that
every route module exists:

- **The complete surface.** `ROUTES` contains exactly six entries and their `(method, url)` set
  equals this literal list, compared as sets: `GET /api/queue`,
  `GET /api/shipments/:shipment_id`, `GET /api/shipments/:shipment_id/exceptions`,
  `GET /api/shipments/:shipment_id/documents`, `GET /api/cases/:case_id/available-actions`,
  `POST /api/cases/:case_id/actions`. Every entry has a non-empty `schema`.
- `GET /api/shipments/SHP-2026-0007` → every `ShipmentDetail` field present and correctly typed;
  `manufacturer.address.country === "China"`, `country_of_origin === "Malaysia"`,
  `hts_code === "8541.40"`, `hts_digit_count === 6`, `shipment_value_usd === "85000.00"` as a
  string, `case.case_version` a positive integer, `case.action_history` an array, and `_links`
  containing exactly the four documented keys.
- `GET /api/shipments/SHP-9999-0000` → `404 RESOURCE_NOT_FOUND` in the envelope.
- `GET /api/shipments/SHP-2026-0007/exceptions` → `open.length === 3`; every exception has at
  least one evidence row; the origin exception carries an `OBSERVED` row
  (`country_of_origin`, `Malaysia`, `MY`) and a `COMPARISON` row
  (`manufacturer.address.country`, `China`, `CN`); the HTS exception's observed row has
  `expected: '10 digits'` and `observed: '6 digits'`; the document exception's
  `missing_information` names `CERTIFICATE_OF_ORIGIN` with a non-empty `requirement` and a
  `policy_reference`; every exception carries `rule.name` and `rule.policy_reference`.
- `GET /api/shipments/SHP-2026-0007/documents` → the three baseline documents `RECEIVED` with
  filenames, `CERTIFICATE_OF_ORIGIN` `NOT_RECEIVED` with `required_by_rules` naming the rule
  that requires it, `display_name` Title Cased, and `requested: null` before any action.
- `GET /api/cases/case-0007/available-actions` → five entries, `actor` populated with
  `usr-cs-001`, `case_version` a positive integer; an unknown case id → `404`.
- Every response carries `Content-Type: application/json; charset=utf-8` and an `X-Request-Id`.

**8. `tests/integration/api.actions.test.ts`** — Fastify `inject` against a temp database
migrated and seeded with wave 2's hook. This file is the permanent regression asset for the
governance claims, so make it thorough:

- **The happy path, per action.** For each of the five actions on an appropriate seeded case:
  `201`, `status.before` / `status.after` as the table says, `acting_user` populated with
  `usr-cs-001` and its role, `justification` echoed verbatim, exactly one new `case_actions`
  row, and `cases.status` in the database equal to `status.after`. Re-reading
  `GET /api/shipments/{id}` shows the new status and the action in `case.action_history` — the
  state change is visible on the same surfaces wave 4 renders.
- **Mandatory justification.** For all five actions: a missing `justification`, an empty string,
  a whitespace-only string and a 9-character string each return `422` with
  `JUSTIFICATION_REQUIRED` or `VALIDATION_FAILED`, and — asserted explicitly — the case's status
  and `case_actions` count are **unchanged**. A rejected action leaves no trace but the log.
- **Illegal transitions.** `PLACE_ON_HOLD` on an `ON_HOLD` case → `409 TRANSITION_REDUNDANT`;
  `SEND_FOR_SPECIALIST_REVIEW` on an `IN_REVIEW` case → `409 TRANSITION_REDUNDANT`;
  `ESCALATE_TO_SUPERVISOR` on an `ESCALATED` case → `409 TRANSITION_REDUNDANT`. Each returns the
  envelope with `error.code`, a message naming the status, and a `request_id`; each leaves the
  database untouched.
- **Terminal immutability.** Every one of the five actions against the seeded `CLEARED` shipment
  → `409 CASE_TERMINAL`, with its row count and status unchanged.
- **Malformed body handling** (moved here from the boot test, because the POST route this
  exercises is created in this task): a body of `{"action":` with
  `Content-Type: application/json` → `400 MALFORMED_JSON` in the envelope with a `request_id`;
  a body exceeding 1 MB → `413 PAYLOAD_TOO_LARGE`.
- **Clearance, end to end.** `CLEAR_EXCEPTION` on the canonical `SHP-2026-0007` with the exact
  three open exception ids and a ≥ 40-character justification with `resolution_basis: 'MIXED'`
  → `201`; `cases.status = 'CLEARED'`; `approving_official_user_id = 'usr-cs-001'` and
  `cleared_at` non-null, so the schema CHECK is satisfied honestly rather than bypassed; all
  three exceptions now `CLEARED_BY_DECISION`; `queued = 0`; the shipment disappears from the
  default `GET /api/queue` and reappears under `include_cleared=true`.
- **G-REC.** The same call with two of the three ids, with a made-up id, or with an extra id →
  `409 EXCEPTION_SET_STALE` with `details.expected` and `details.actual`, and nothing written.
- **The 40-character floor.** `resolution_basis: 'EXCEPTIONS_ACCEPTED'` with a 39-character
  justification → `422`; the same with 40 characters → `201`.
- **G-DOC and G-DUP.** `REQUEST_INFORMATION` for `CERTIFICATE_OF_ORIGIN` on the canonical
  shipment → `201` and the case moves to `AWAITING_INFORMATION`; an unlisted type →
  `422 DOCUMENT_TYPE_NOT_REQUIRED`; the same unlisted type with
  `justify_unlisted_document: true` and a 25-character justification → `201`; requesting
  `CERTIFICATE_OF_ORIGIN` again from `AWAITING_INFORMATION` → `409 DUPLICATE_DOCUMENT_REQUEST`;
  requesting a type already `RECEIVED` → `409 DOCUMENT_ALREADY_RECEIVED`. After the successful
  request, `GET /api/shipments/{id}/documents` shows `requested` populated on the certificate
  row.
- **G-ACK.** Clearing from `AWAITING_INFORMATION` with an outstanding requested type and no
  acknowledgement → `422 OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED`; with
  `acknowledge_outstanding_requests: true` → `201`.
- **Wrong-shape bodies.** `action: 'APPROVE_CLEARANCE'` → `422 ACTION_NOT_A_USER_ACTION`;
  `hold_reason` supplied on an `ESCALATE_TO_SUPERVISOR` body → `422 VALIDATION_FAILED` with a
  `field_errors` entry; an unknown top-level property → `422`.
- **Concurrency and replay.** A stale `If-Match-Case-Version` → `409 CASE_VERSION_CONFLICT` with
  nothing written. The same `Idempotency-Key` replayed with an identical body returns the
  original `201` body and creates no second `case_actions` row; replayed with a different body
  → `409 IDEMPOTENCY_KEY_REUSED`.
- **Available actions track state.** `GET /api/cases/{id}/available-actions` before and after an
  action returns five entries both times, with availability matching the new status, and every
  unavailable entry carrying a `reason` and `reason_text`. On the cleared case, all five are
  unavailable with `CASE_TERMINAL`.
- **Human authority, asserted structurally.** Walk every `.ts` file under `src/` in the test,
  match each file's contents against `/UPDATE\s+cases\s+SET\s+status/gi` (whitespace- and
  newline-tolerant, so the idiomatic multi-line SQL matches), and assert the total match count
  across the tree is exactly **1** and that the file containing it is
  `src/infra/db/repositories/workflowRepository.ts`. "The server never transitions a case on its
  own" is the product's central claim and deserves a check that survives refactoring.
- **Scope check.** After the full action suite, `audit_entries`, `notifications`, `approvals`,
  `recommendations`, `document_requests`, `ai_outputs` and `sessions` all still have **0** rows.
  </action>

  <verify>
npm run typecheck && npx vitest run --reporter=list 2>&1 | tail -40 && test "$(find src -name '*.ts' -print0 | xargs -0 cat | tr '\n' ' ' | grep -oP 'UPDATE\s+cases\s+SET\s+status' | wc -l)" -eq 1 && test "$(grep -rhoP "url:\s*'/api/[^']+'" src/server/routes/ | sort -u | wc -l)" -eq 6 && grep -q 'shipment_id/exceptions' src/server/routes/shipments.ts && grep -q 'shipment_id/documents' src/server/routes/shipments.ts && grep -q 'available-actions' src/server/routes/cases.ts && grep -q "case_id/actions" src/server/routes/cases.ts && grep -q 'approving_official_user_id' src/app/workflowService.ts && grep -q 'executeAction' src/server/routes/cases.ts && echo TASK3_OK
  </verify>

  <done>
- `npm run typecheck` exits 0 and the full suite (waves 1-2's nine files plus this wave's six)
  passes with 0 failing, 0 skipped.
- Exactly six unique `/api` url literals exist under `src/server/routes/`, and the read test
  asserts `ROUTES` equals the six documented `(method, url)` pairs as a set.
- Shipment detail, exceptions-with-evidence, documents and available-actions return the exact
  contract shapes, and the canonical shipment's three exceptions carry their field-level
  evidence and structured missing information.
- All five actions execute over HTTP with the exact status transitions the table declares, each
  producing exactly one `case_actions` row carrying the actor, the role, the before/after status
  and the verbatim justification.
- Justification is mandatory and enforced on every action, with the 40-character floor for
  accepted or mixed clearance; a rejected action provably leaves the case and the action count
  unchanged.
- Illegal and redundant transitions are rejected with the spec's error envelope and codes
  (`INVALID_TRANSITION`, `TRANSITION_REDUNDANT`, `CASE_TERMINAL`), never absorbed; malformed
  JSON on the action route is `400 MALFORMED_JSON` in the envelope.
- `CLEAR_EXCEPTION` clears the canonical shipment, sets the acting user as the approving
  official and `cleared_at`, marks the three exceptions `CLEARED_BY_DECISION`, and drops the
  shipment off the default queue — with the schema's clearance CHECK satisfied, not weakened.
- Guards G-DOC, G-DUP, G-REC and G-ACK each reject and each pass under integration test with
  their exact FRD codes.
- Idempotent replay returns the original response and creates no second action; a stale case
  version is `409 CASE_VERSION_CONFLICT`.
- Exactly one statement across `src/` matches `UPDATE cases SET status`, it lives in
  `workflowRepository.applyTransition`, and it is reachable only from `executeAction` — asserted
  both by the whitespace-tolerant shell gate and by the source walk in the actions test.
- Zero rows were written to any table belonging to a feature excluded from this build.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API | Untrusted request bodies, query strings, path params and headers crossing into route handlers and SQL |
| client→state machine | Client-chosen action codes and identifiers crossing into a transition that changes durable case state |
| client→actor attribution | A request attempting to name the actor or role written onto the permanent decision record |
| server→browser | Response headers and the SPA fallback crossing into the embedded preview iframe |
| db→render | Stored shipment, evidence and justification strings reflected back to the client |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Spoofing | `src/app/actorService.ts` — a request naming its own actor or role | mitigate | `resolveActor(db)` reads the acting identity from the `users` table using a server-side configured id; no handler reads an actor, user id or role from a body, query param or header. Every request schema is `additionalProperties: false`, so an injected `role` or `actor_user_id` property is a `422`, not an ignored field. `case_actions.actor_name` / `actor_role` are written from the database row, never from the request. |
| T-03-02 | Tampering | `src/app/workflowService.ts` and `workflowRepository.applyTransition` — arbitrary status changes | mitigate | The only statement in the codebase matching `UPDATE cases SET status` lives in `workflowRepository.applyTransition`, called from exactly one place (`executeAction`), and the target status comes from the pure `evaluateTransition` decision, never from the request. The client chooses an action code, never a destination status. Asserted by the whitespace-tolerant shell gate in Task 3's `<verify>` and by the source walk in `tests/integration/api.actions.test.ts`. |
| T-03-03 | Tampering | All route handlers and repositories reaching SQLite | mitigate | Every query in `workflowRepository`, `idempotencyRepository`, `queueService` and `shipmentService` is a named prepared statement with bound parameters. The one dynamically composed fragment is the queue `ORDER BY`, generated from a closed allow-list of sort fields plus wave 2's `SEVERITY_RANK` map — never from the raw query string; an unknown sort field is `422 INVALID_QUERY_PARAM` before any SQL is built. |
| T-03-04 | Elevation of privilege | `POST /api/cases/:case_id/actions` — reaching `CLEARED` without a human decision | mitigate | Six transition rows target `CLEARED` and every one is the `CLEAR_EXCEPTION` action with a mandatory justification and a resolved human actor; the count is asserted from `TRANSITIONS` in `tests/unit/workflow.stateMachine.test.ts`. The schema's `CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL))` is the database backstop and is satisfied by populating the acting user as the official — never by weakening or dropping the constraint. The two-person approval step remains deferred and is recorded as such. |
| T-03-05 | Repudiation | `case_actions` — a decision without a recorded reason | mitigate | `validateJustification` runs before any write on all five actions (10-2000 chars, 40 for accepted/mixed clearance), backed by the schema `CHECK (length(trim(justification)) >= 10)` on `case_actions`. The whole use case is one `BEGIN IMMEDIATE` transaction, so a status change without its action row is structurally impossible. Residual gap: rejected attempts are not persisted as denial records because the audit-record feature is deferred; they are captured in `request_log` with their `error_code`. |
| T-03-06 | Information disclosure | `src/server/plugins/errorMapper.ts` and the `request_log` `onResponse` hook in `src/server/app.ts` | mitigate | The error mapper emits only `{ code, message, details?, field_errors?, request_id }` and strips SQL, stack traces, absolute paths and environment values; diagnosis is by `request_id` correlation. `request_log` records method, path, status, actor id, duration and error code only — no bodies, no field values — and is trimmed to 10 000 rows so it cannot become a data sink. |
| T-03-07 | Denial of service | `src/server/app.ts` — unbounded requests and result sets | mitigate | 1 MB JSON body limit (`413 PAYLOAD_TOO_LARGE`, asserted in the actions test); `page_size` capped at 100 with `101` rejected rather than clamped; `action_history` capped at the most recent 20 rows; `justification` capped at 2000 characters by schema. Rate limiting is out of scope: this is a single-tenant, single-session sandboxed demo (TechArch §4.1). |
| T-03-08 | Tampering | Concurrent or duplicated actions on one case | mitigate | `BEGIN IMMEDIATE` plus `loadCaseForUpdate` serializes writers for the whole use case; `If-Match-Case-Version` returns `409 CASE_VERSION_CONFLICT` on a stale write; `Idempotency-Key` scoped to `case:<id>:action` with a request hash replays the original response, and the partial unique index `(case_id, idempotency_key)` is the database backstop. A demo double-click cannot produce two decisions. |
| T-03-09 | Denial of service | `src/server/plugins/headers.ts` — a framing header blanking the preview | mitigate | No framing header is ever sent and the CSP contains no framing directive; no security-header middleware is installed, since its defaults reintroduce the framing header. Asserted by the iframe block of `tests/integration/api.boot.test.ts`, which requires the header to be **absent**, and by the case-insensitive grep in Task 2's `<verify>` over `src/server/` and `package.json`. |
| T-03-10 | Information disclosure | `db→render` — evidence values and justifications reflected to the client | accept | Evidence must be returned verbatim to be defensible, and the justification must be the human's own words. The dataset is entirely synthetic and wave 1's seed-time PII deny-list gates what can enter the database; user-authored justifications are stored and returned as plain JSON strings and are never interpolated into HTML by the server (the SPA fallback serves a static bundle). Residual escaping responsibility sits with wave 4's React rendering, which escapes by default. Owner: the synthetic-data-only constraint in PROJECT.md. |
</threat_model>

<verification>
Run from the repository root on a clean checkout. Every command below is whitespace-tolerant and
over-matching-proof: none of them can fail on correct code.

1. `npm install && npm run typecheck` — exits 0.
2. `npx vitest run --reporter=list` — all fifteen test files green (waves 1-2's nine plus this
   wave's six), 0 failing, 0 skipped.
3. `rm -rf data && npm run migrate && npm run seed` — exits 0 with a populated exception queue.
4. Boot and probe the real server (explicit PID, no job control):
   `npm start > /tmp/cargodemo.log 2>&1 & SRV=$!; sleep 6; curl -sS -D /tmp/h.txt -o /tmp/q.json http://127.0.0.1:3000/api/queue; head -1 /tmp/h.txt | grep -q ' 200' && grep -qi 'x-request-id' /tmp/h.txt && grep -qi 'cache-control: no-store' /tmp/h.txt && ! grep -qi 'x-frame-options' /tmp/h.txt && grep -q 'SHP-2026-0007' /tmp/q.json && echo PREVIEW_OK; kill $SRV`
5. Endpoint count — exactly six `/api` routes and nothing else. Counted from the route modules'
   url literals and de-duplicated, so `registry.ts` living in the same directory cannot inflate
   it: `test "$(grep -rhoP "url:\s*'/api/[^']+'" src/server/routes/ | sort -u | wc -l)" -eq 6 && echo ROUTES_OK`
6. Human-authority check — exactly one status write across the tree, matched across newlines so
   the idiomatic multi-line `UPDATE cases\n SET status = …` form counts:
   `test "$(find src -name '*.ts' -print0 | xargs -0 cat | tr '\n' ' ' | grep -oP 'UPDATE\s+cases\s+SET\s+status' | wc -l)" -eq 1 && echo AUTHORITY_OK`
7. Iframe check — this must find nothing:
   `! grep -rniE 'x-frame-options|frame-ancestors|helmet' src/server/ package.json && echo IFRAME_OK`
8. Layer-boundary check — the domain stays pure. Import-scoped, so an explanatory comment
   naming a forbidden module cannot fail the gate:
   `! grep -rqE "^import .*(better-sqlite3|node:fs|fastify|'fs')" src/domain/ && echo LAYERS_OK`
9. Scope check — these tables must all be empty:
   `node -e "const D=require('better-sqlite3');const d=new D(process.env.CARGODEMO_DB_PATH||'./data/cargodemo.db');for(const t of ['audit_entries','notifications','approvals','recommendations','document_requests','ai_outputs','sessions']){const c=d.prepare('select count(*) c from '+t).get().c;if(c!==0){console.error(t,c);process.exit(1)}}" && echo SCOPE_OK`
10. Contract spot-checks: every `verify` one-liner in `integration_contracts.requires` and
    `integration_contracts.provides` prints `CONTRACT_OK`.
11. No compose file was added: `test ! -f docker-compose.yml && echo NO_COMPOSE_OK`.
</verification>

<success_criteria>
- The exception queue is readable over HTTP with filtering by status, exception type and
  priority and sorting by priority and age, with priority ordered by `SEVERITY_RANK` and never
  by raw string sort — asserted over a full returned sequence, not a single row.
- One shipment's full detail is readable: entry fields with `shipment_value_usd` as a decimal
  string derived from `shipment_value_cents`, its case state and history, its documents
  including what is missing, and its exceptions with field-level evidence and structured missing
  information.
- All five actions — request additional information, send for specialist review, clear the
  exception, place on hold, escalate to supervisor — execute over HTTP with validated
  transitions, and each produces exactly one attributed action record.
- Justification is mandatory on every action and enforced before any write; a decision without a
  recorded reason cannot be created through any path.
- Illegal, redundant and post-clearance transitions are rejected with the spec's error envelope
  and codes; a rejected action leaves the case and the action count provably unchanged.
- The API never transitions a case autonomously: exactly one statement in the codebase writes
  `cases.status`, it is reachable only from the action endpoint, and its destination comes from
  the pure state machine rather than from the request.
- The clearance path satisfies the schema's approving-official CHECK by recording the acting
  user as the official on their own decision; the constraint is not weakened, and the real
  two-person approval step is recorded as deferred rather than faked.
- Every non-2xx response is the uniform `{ error: { code, message, details?, field_errors?,
  request_id } }` envelope, and every response carries `X-Request-Id`.
- The server binds `0.0.0.0:3000` and sends no framing header and no framing CSP directive, so
  the Pivota Preview iframe renders rather than blanking.
- Exactly six `/api` routes exist; no endpoint was added for a feature excluded from this build,
  and no rows were written to any excluded feature's tables.
- Wave 4 can build the two screens against `src/shared/api` alone, with every response field
  name declared verbatim in this plan's `integration_contracts.provides`.
- Every task gate passes at that task's completion using only the files that task and its
  predecessors created, and still passes at the end of the wave.
</success_criteria>

<output>
After completion, create
`.planning/express/cargodemo-cbp-cargo-exception-review-app/03-SUMMARY.md` recording:
the six endpoint signatures with one real captured response body each (the canonical
`SHP-2026-0007` is the most useful subject); the final transition table as implemented, with
each deviation from FRD `F09a` §2 called out individually; the clearance boundary — that
`CLEAR_EXCEPTION` reaches `CLEARED` directly and records the acting user as the approving
official, and that a two-person approval step is deferred; the exact `ActionCommand` bodies for
all five actions as accepted by the running server; the error envelope with the codes actually
reachable; the `exception_summary` and `display_name` label rules wave 4 will render; the
`shipment_value_usd` conversion; and the bind host, port and header set, with a note that the
framing header must never be reintroduced (and that its literal name must stay out of
`src/server/` and `package.json`, because three contract greps assert its absence).
</output>
