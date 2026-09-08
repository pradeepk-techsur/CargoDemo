---

# 3c. API — Session, AI, Rules, Ingestion & Demo Operations

## 3c.1 Session and Roles

```ts
// GET /api/users   — OPEN (no session required, so the role selector can render first)
export type UsersResponse = Array<{ id: string; name: string; role: Role; active: boolean }>;

// POST /api/session   — OPEN · 201
export interface CreateSessionCommand { user_id: string; }
export interface SessionResponse {
  session_token: string;                  // opaque, random ≥ 256 bits; the server stores only its SHA-256
  user: UserRef;
  permissions_summary: {
    can_adjudicate: boolean;
    can_approve: boolean;
    can_edit_rules: boolean;
    can_reset: boolean;
  };
}
// Errors: 404 RESOURCE_NOT_FOUND, 403 USER_INACTIVE.
// An existing session is implicitly ended and a ROLE_SWITCHED system audit entry is written —
// a demo role switch is itself part of the record.

// GET    /api/session   (CS, SUP, ADM) → SessionResponse['user'] | 401 UNAUTHENTICATED
// DELETE /api/session   (CS, SUP, ADM) → 204

// GET /api/rbac/matrix   (CS, SUP, ADM)
export interface RbacMatrixRow {
  route_id: string;                       // 'cases.actions.create'
  method: string;
  path: string;
  allowed_roles: Role[];
  predicates: string[];                   // 'state_machine' | 'escalation_authority' | 'sod_2' | …
}
export type RbacMatrixResponse = RbacMatrixRow[];

// POST  /api/users        (ADM · 201) — { name, role, active }
// PATCH /api/users/{id}   (ADM · 200) — { name?, role?, active? }
export interface CreateUserCommand { name: string; role: Role; active?: boolean; }
export interface UpdateUserCommand { name?: string; role?: Role; active?: boolean; }
// Errors: 422 INVALID_ENUM_VALUE, 403 SELF_ROLE_CHANGE_BLOCKED.
```

`permissions_summary` is a **convenience for rendering**, never an authority. The client uses it to decide which navigation items to show; the server re-derives authority from the `users` row on every single request. `GET /api/rbac/matrix` is **generated from the enforcement declarations**, not hand-maintained — the specification, the middleware, and test AC-01 all read the same data, so the matrix cannot drift from what is enforced.

## 3c.2 AI Assistance

```ts
// GET /api/shipments/{id}/ai/summary   (CS, SUP, ADM) · ALWAYS 200
export interface AiSummaryQuery { regenerate?: boolean; }
export interface AiSummaryResponse {
  kind: 'SUMMARY';
  shipment_id: string;
  evaluation_version: number;
  /** Plain-language narrative, grounded in the captured evidence. */
  summary: string;
  exception_narratives: Array<{
    exception_id: string;
    exception_type: ExceptionType;
    sub_reason: string;
    narrative: string;
    grounded_in: string[];                // field paths the narrative references
  }>;
  provenance: AiProvenance;
  cached: boolean;
}

// POST /api/shipments/{id}/ai/summary/regenerate   (CS, SUP — ADM denied) · 200
//   Same shape with cached:false and regenerated_by_user_id recorded.

// GET /api/shipments/{id}/ai/recommendation   (CS, SUP, ADM) · ALWAYS 200
export interface AiRecommendationResponse {
  kind: 'RECOMMENDATION';
  shipment_id: string;
  evaluation_version: number;

  /** Deterministic. Identical with the provider enabled or disabled. Never an approval code. */
  recommended_action: UserAction;
  confidence: {
    level: ConfidenceLevel;
    score: number;                        // [0,1]
    basis: string;                        // names the factors that moved the score — never empty
    factors: Array<{ factor: string; adjustment: number }>;
  };
  /** LLM-authored prose when a provider is enabled; deterministic template otherwise. */
  rationale: string;

  available_to_current_role: boolean;
  unavailable_reason: UnavailableReason | null;

  presentation: {
    exceptions: Array<{
      exception_id: string; exception_type: ExceptionType; sub_reason: string; severity: Severity;
      rule: RuleRef;                      // MUST include policy_reference — never a recommendation
      evidence: EvidenceRow[];            //   without its authority
      missing_information: MissingInformation[];
    }>;
  };

  governance_notice: 'This is an AI-generated recommendation. It has not been acted on. A named official must decide.';
  provenance: AiProvenance & { action_source: 'DETERMINISTIC'; rationale_source: 'LLM' | 'FALLBACK' };
  cached: boolean;
}

// POST /api/shipments/{id}/ai/recommendation/regenerate   (CS, SUP — ADM denied) · 200

// GET /api/shipments/{id}/ai/outputs   (CS, SUP, ADM)
export interface AiOutputHistoryItem {
  id: string; kind: 'SUMMARY' | 'RECOMMENDATION';
  evaluation_version: number; generation_mode: GenerationMode;
  generated_at: string; superseded_by: string | null;
  provenance: AiProvenance; content_summary: string;
}
```

**The AI routes are fallback-first and never return `503`.** Provider unavailability is not an error condition — it is the default configuration. `AI_UNAVAILABLE` is a reserved code that `/ai/summary` and `/ai/recommendation` never return. The only genuine errors on these routes are `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `409 NO_EVALUATION`, and `403 FORBIDDEN_ROLE` (regenerate only, ADM denied).

`available_to_current_role` is the one place role affects the response — and only as *annotation*. If the derived action is unavailable to the viewer, the recommendation is still returned with the derived action and the reason; **it is never silently rewritten to suit the viewer**. A recommendation that changes depending on who is looking at it is not evidence of anything.

## 3c.3 Rules

```ts
// GET /api/rules   (CS, SUP, ADM — read-only for CS/SUP: a rule must be visible to be defensible)
export interface RulesQuery {
  exception_type?: ExceptionType; enabled?: boolean; severity?: Severity;
  page?: number; page_size?: number;
}
export interface RuleListItem {
  id: string; name: string; exception_type: ExceptionType; severity: Severity;
  enabled: boolean; policy_reference: string; description: string;
  version: number; updated_at: string; updated_by_name: string | null;
  open_exception_count: number; affected_shipment_count: number;
}
export type RulesResponse = ListResponse<RuleListItem>;

// GET /api/rules/{id}   (CS, SUP, ADM)
export interface RuleDetail extends RuleListItem {
  conditions: RuleConditions;
  params_json: RuleParams;
  /** The JSON Schema for this exception_type, so the admin form renders generically. */
  params_schema: Record<string, unknown>;
  priority_mapping: Record<Severity, Severity> | null;
}

// ─── Rule configuration payloads (see 06a §2 for semantics) ────────────────
export interface RuleConditions {
  min_shipment_value_usd?: number;
  max_shipment_value_usd?: number;
  commodity_keywords?: string[];
  hts_prefixes?: string[];
  country_of_origin_in?: string[];
  country_of_origin_not_in?: string[];
}

export interface MissingDocumentParams {
  required_document_types: string[];      // 1–20 items, required
  match_mode?: 'ALL' | 'ANY_ONE_OF';      // default 'ALL'
  accept_statuses?: DocumentStatus[];     // default ['RECEIVED']
  require_file_present?: boolean;         // default true
  ignore_superseded?: boolean;            // default true
}

export interface HtsCodeParams {
  expected_digit_count?: number;          // 6–12, default 10
  min_digit_count?: number;               // 4–12, default 6
  allowed_separators?: string[];          // default ['.', '-', ' ']
  allow_partial?: boolean;                // default false
  treat_missing_as_exception?: boolean;   // default true
  check_known_codes?: boolean;            // default false
  known_code_prefix_length?: number;      // 4–10, default 6
  known_codes?: string[];                 // must be non-empty when check_known_codes is true
  placeholder_characters?: string[];      // default ['X','x','*','?','#']
}

export interface CountryOfOriginParams {
  declared_field?: string;                // default 'country_of_origin'
  comparison_fields?: string[];           // default ['manufacturer.address.country']
  treat_missing_declared_as_conflict?: boolean;    // default true
  treat_missing_comparison_as_conflict?: boolean;  // default false
  allowed_pairs?: Array<{ declared: string; comparison: string }>;
  case_sensitive?: boolean;               // default false
}

/** Discriminated by the rule's exception_type; validated by Ajv, additionalProperties:false. */
export type RuleParams = MissingDocumentParams | HtsCodeParams | CountryOfOriginParams;

export interface RuleDefinition {
  id: string;                             // ^rule-[a-z0-9-]{3,40}$, immutable after creation
  name: string;                           // 3–120 chars, unique (case-insensitive)
  exception_type: ExceptionType;          // immutable after creation
  description: string;                    // 10–500 chars
  policy_reference: string;               // 3–120 chars, e.g. '19 CFR 141.86'
  severity: Severity;
  conditions?: RuleConditions;
  params_json: RuleParams;
  priority_mapping?: Record<Severity, Severity> | null;
}

// POST  /api/rules        (ADM · 201)
// PATCH /api/rules/{id}   (ADM · 200) — exception_type MUST NOT change → 422 RULE_TYPE_IMMUTABLE
export interface SaveRuleCommand {
  definition: RuleDefinition;
  change_note: string;                    // required → 422 CHANGE_NOTE_REQUIRED
  revalidate_affected?: boolean;
}

// POST /api/rules/{id}/enable | /disable   (ADM · 200)
export interface ToggleRuleCommand { change_note: string; revalidate_affected?: boolean; }

export interface RuleSaveResult {
  rule: RuleDetail;
  previous_version: number;
  diff: Array<{ path: string; before: unknown; after: unknown }>;
  revalidation: {
    shipments_revalidated: number;
    exceptions_added: number;
    exceptions_resolved: number;
    priorities_changed: number;
    failures: Array<{ shipment_id: string; error_code: string }>;
  };
  audit_entry_id: string;
}

// POST /api/rules/{id}/preview-impact   (ADM · 200) — performs ZERO writes
export interface PreviewImpactCommand { definition: RuleDefinition; }
export interface PreviewImpactResult {
  valid: boolean;
  evaluated_shipments: number;
  would_add: Array<{ shipment_id: string; exception_type: ExceptionType; severity: Severity }>;
  would_remove: Array<{ shipment_id: string; exception_id: string; exception_type: ExceptionType }>;
  would_change_severity: Array<{ shipment_id: string; exception_id: string; from: Severity; to: Severity }>;
  would_change_priority: Array<{ shipment_id: string; from: Priority; to: Priority }>;
  summary: { added: number; removed: number; unchanged: number; priority_changes: number };
  skipped_cleared: string[];              // terminal cases are never touched, even in preview
  truncated: boolean;
}

// GET /api/rules/{id}/history   (CS, SUP, ADM)
export interface RuleHistoryItem {
  audit_entry_id: string; event_type: string; occurred_at: string;
  actor: ActorRef; change_note: string;
  before: RuleDefinition | null; after: RuleDefinition;
  diff: Array<{ path: string; before: unknown; after: unknown }>;
}
```

Errors: `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; **`405 RULE_DELETE_NOT_SUPPORTED`** — rules are disabled, never deleted, so a disabled rule remains referenceable by the historical exceptions it produced; `409 RULE_NAME_CONFLICT | TRANSITION_REDUNDANT`; `422 RULE_TYPE_IMMUTABLE | RULE_CONFIG_INVALID | RULE_PARAM_PATH_UNKNOWN | CHANGE_NOTE_REQUIRED | PREVIEW_TOO_LARGE | VALIDATION_FAILED`; `207 PARTIAL_REVALIDATION_FAILURE`.

`preview-impact` performing **zero writes** is asserted by a test, not merely intended: it is the surface that lets an administrator answer "what would this change do?" before committing, which is the difference between configurable rules and dangerous ones.

## 3c.4 Ingestion

```ts
// POST /api/ingest/cargo-entries   (ADM · 201 | 207 Multi-Status)
export interface CargoEntryInput {
  shipment_id: string;
  importer_name: string;
  carrier_name: string;
  product_description: string;
  hts_code: string | null;
  country_of_origin: string;
  manufacturer: {
    name: string;
    address: {
      line1: string; city?: string | null; region?: string | null;
      postal_code?: string | null; country: string;
    };
  };
  shipment_value_usd: number;
  entry_date: string;                     // YYYY-MM-DD
  documents?: Array<{
    document_type: string; status: DocumentStatus;
    filename?: string | null; received_at?: string | null; stated_country?: string | null;
  }>;
}

export interface IngestCommand {
  schema_version: '1.0';                  // anything else rejects the whole batch
  source: string;
  entries: CargoEntryInput[];             // 1–500
}

export interface IngestionReport {
  batch_id: string;
  schema_version: string;
  source: string;
  received_count: number;
  created_count: number;
  updated_count: number;
  rejected_count: number;
  results: Array<
    | { shipment_id: string; outcome: 'CREATED' | 'UPDATED'; evaluation_version: number; exception_count: number }
    | { shipment_id: string | null; outcome: 'REJECTED'; error_code: string; pointer: string; reason: string }
  >;
  created_at: string;
}

// GET /api/ingest/reports/{batch_id}   (ADM · 200) → IngestionReport
```

Errors: `400 INGEST_MALFORMED_JSON`; `403 FORBIDDEN_ROLE`; `422 INGEST_SCHEMA_VERSION_UNSUPPORTED | INGEST_BATCH_SIZE_INVALID | INGEST_ENTRY_INVALID | INGEST_DOCUMENT_FILENAME_REQUIRED`; `409 CASE_TERMINAL | INGEST_DUPLICATE_IN_BATCH`.

**A malformed envelope rejects the batch atomically; a malformed entry rejects only itself** and is reported with a JSON pointer and a reason, so a bad row cannot take down an import. Ingestion is idempotent on `shipment_id` — re-ingesting updates rather than duplicates, and creates a new evaluation version. **Re-ingesting a `CLEARED` shipment is refused with `CASE_TERMINAL`** (test IN-03), so an external feed cannot silently reopen a finalized decision. A `SIMULATED_UPLOAD` document is never downgraded by a re-ingestion declaring it not received (IN-04).

## 3c.5 Demo Operations

```ts
// GET /api/health   — OPEN · 200
export type SubsystemStatus = 'ok' | 'degraded' | 'failed';
export interface HealthResponse {
  status: SubsystemStatus;
  version: string;
  uptime_s: number;
  subsystems: {
    database:  { status: SubsystemStatus; schema_version: number; foreign_keys: boolean;
                 append_only_triggers: boolean; path_writable: boolean };
    seed:      { status: SubsystemStatus; seeded: boolean; entry_count: number;
                 canonical_scenario_present: boolean; exception_types_covered: number;
                 statuses_covered: number; precleared_case: string | null };
    rules:     { status: SubsystemStatus; total: number; enabled: number; invalid: number };
    documents: { status: SubsystemStatus; storage_dir_writable: boolean;
                 fixtures_present: number; upload_ready_fixtures: number };
    ai:        { status: SubsystemStatus; provider: string; model: string | null;
                 mode: GenerationMode; fallback_available: true; last_probe_at: string | null };
    workflow:  { status: SubsystemStatus; transitions_registered: number;
                 /** MUST equal 1 — the governance invariant, surfaced without opening code. */
                 clearance_paths: number };
    rbac:      { status: SubsystemStatus; routes_registered: number;
                 /** MUST equal 0. */
                 routes_without_permission: number };
  };
  demo: { port: number; host: string; preview_url: string; reset_endpoint: string };
}

// POST /api/admin/reset   (ADM · 200)
export interface ResetCommand { confirm: true; }                    // 422 CONFIRMATION_REQUIRED otherwise
export interface ResetResult extends SeedReport { reset_at: string; duration_ms: number; }

// GET /api/admin/seed-report   (ADM · 200) → SeedReport
export interface SeedReport {
  entry_count: number;
  canonical_scenario_present: boolean;
  coverage: {
    exception_types: ExceptionType[];
    statuses: CaseStatus[];
    multi_exception_shipments: string[];
    precleared_case: string | null;
    clean_shipments: string[];
  };
  rules_seeded: number;
  documents_seeded: number;
  upload_ready_fixtures: number;
  seeded_at: string;
}

// GET /api/openapi.json   — OPEN · 200
//   OpenAPI 3.1, generated from the same schemas the middleware validates against,
//   so specification drift is structurally impossible.
```

`health` **never exposes the AI API key, database credentials, or absolute paths outside the project**. `clearance_paths: 1` and `routes_without_permission: 0` are the two numbers a presenter can point at to demonstrate the governance invariants without opening an editor.

Reset errors: `403 FORBIDDEN_ROLE`; `422 CONFIRMATION_REQUIRED`; `500 SEED_COVERAGE_FAILED | SEED_CANONICAL_SCENARIO_INVALID | SEED_FIXTURE_MISSING | SEED_PII_SUSPECTED | SEED_WORKFLOW_SCRIPT_INVALID`. A failed coverage assertion leaves the transaction rolled back rather than producing a half-seeded demo.

## 3c.6 Route Inventory (60 routes)

| Group | Count | Routes |
|---|---|---|
| Session & users | 7 | `GET/POST/DELETE /api/session`, `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}`, `GET /api/rbac/matrix` |
| Queue & shipments | 6 | `/api/queue`, `/api/shipments/{id}`, `…/exceptions`, `…/evaluations`, `…/evaluations/{v}`, `…/evaluations/{a}/diff/{b}` |
| Documents | 6 | `…/documents`, `…/document-requests`, `…/upload-fixtures`, `/api/documents/{id}/content`, upload, cancel |
| Workflow | 5 | `POST/GET /api/cases/{id}/actions`, `/available-actions`, `/api/workflow/transitions`, `/api/shipments/{id}/revalidate` |
| Approvals | 3 | `POST /api/cases/{id}/approval`, `GET …/recommendations`, `GET …/approvals` |
| AI | 5 | summary, summary/regenerate, recommendation, recommendation/regenerate, outputs |
| Audit | 5 | `/audit`, `/audit/{seq}`, `/audit/verify`, `/audit/export`, `/api/audit` |
| Notifications | 5 | list, unread-count, per-case, read, read-all |
| Rules | 8 | list, detail, create, patch, enable, disable, preview-impact, history |
| Ingestion & demo | 5 | ingest, ingest report, health, reset, seed-report |
| OpenAPI | 1 | `/api/openapi.json` |
| **Total** | **60** | matches the F14 RBAC matrix and the `health.subsystems.rbac.routes_registered` assertion |

**60 is a checked number, not a count in prose.** The startup self-check enumerates the registry, `GET /api/rbac/matrix` serves it, `health.subsystems.rbac.routes_registered` reports it, and test AC-01 iterates all 60 × 3 roles. Adding a route without an RBAC declaration aborts startup; adding one without a matrix expectation fails AC-01.

## 3c.7 Error Envelope

```ts
export interface FieldError { path: string; code: string; message: string; }

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;                      // clients branch on this, never on `message`
    message: string;                      // user-facing copy
    details?: Record<string, unknown>;    // diagnostic
    field_errors?: FieldError[];          // drives inline form annotation
    request_id: string;                   // correlates with request_log
  };
}

export type ErrorCode =
  // Transport & auth
  | 'UNAUTHENTICATED' | 'SESSION_INVALID' | 'FORBIDDEN_ROLE' | 'SELF_ROLE_CHANGE_BLOCKED'
  | 'USER_INACTIVE' | 'RESOURCE_NOT_FOUND' | 'MALFORMED_JSON' | 'VALIDATION_FAILED'
  | 'INVALID_ENUM_VALUE' | 'INVALID_QUERY_PARAM' | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE' | 'IDEMPOTENCY_KEY_REUSED' | 'CASE_VERSION_CONFLICT' | 'INTERNAL_ERROR'
  // Ingestion & seed
  | 'INGEST_MALFORMED_JSON' | 'INGEST_SCHEMA_VERSION_UNSUPPORTED' | 'INGEST_BATCH_SIZE_INVALID'
  | 'INGEST_ENTRY_INVALID' | 'INGEST_DUPLICATE_IN_BATCH' | 'INGEST_DOCUMENT_FILENAME_REQUIRED'
  | 'INGEST_FILE_NOT_FOUND' | 'SEED_DB_NOT_EMPTY' | 'SEED_COVERAGE_FAILED'
  | 'SEED_CANONICAL_SCENARIO_INVALID' | 'SEED_FIXTURE_MISSING' | 'SEED_PII_SUSPECTED'
  | 'SEED_WORKFLOW_SCRIPT_INVALID'
  // Rules & evaluation
  | 'RULE_CONFIG_INVALID' | 'RULE_PARAM_PATH_UNKNOWN' | 'RULE_TYPE_IMMUTABLE' | 'RULE_NAME_CONFLICT'
  | 'CHANGE_NOTE_REQUIRED' | 'RULE_DELETE_NOT_SUPPORTED' | 'PREVIEW_TOO_LARGE'
  | 'PARTIAL_REVALIDATION_FAILURE' | 'EXCEPTION_TYPE_UNSUPPORTED' | 'EVALUATION_FAILED'
  | 'EVALUATION_TIMEOUT' | 'EVALUATION_VERSION_CONFLICT' | 'EXCEPTION_EVIDENCE_REQUIRED'
  | 'MISSING_INFORMATION_REQUIRED' | 'PRIORITY_DERIVATION_FAILED' | 'EVALUATION_HISTORY_IMMUTABLE'
  | 'NO_EVALUATION'
  // Workflow
  | 'INVALID_TRANSITION' | 'TRANSITION_REDUNDANT' | 'CASE_TERMINAL' | 'ESCALATED_REQUIRES_SUPERVISOR'
  | 'HOLD_REQUIRES_RELEASE' | 'APPROVAL_PENDING' | 'ACTION_NOT_A_USER_ACTION'
  | 'JUSTIFICATION_REQUIRED' | 'JUSTIFICATION_NOT_AUTHORED' | 'DOCUMENT_TYPE_NOT_REQUIRED'
  | 'OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED' | 'ASSIGNEE_INVALID' | 'ESCALATION_TARGET_INVALID'
  | 'ASSIGNMENT_NOT_PERMITTED' | 'EXCEPTION_SET_STALE'
  // Documents
  | 'REQUEST_NOT_OUTSTANDING' | 'DUPLICATE_DOCUMENT_REQUEST' | 'DOCUMENT_ALREADY_RECEIVED'
  | 'FILE_REQUIRED' | 'FILE_EMPTY' | 'FILE_EXTENSION_MISMATCH' | 'FILE_CONTENT_MISMATCH'
  | 'PII_SUSPECTED' | 'STORAGE_PATH_INVALID' | 'STORAGE_WRITE_FAILED'
  // Approvals & governance
  | 'SELF_APPROVAL_BLOCKED' | 'RECOMMENDATION_ALREADY_PENDING' | 'RECOMMENDATION_NOT_PENDING'
  | 'EVIDENCE_CHANGED_UNACKNOWLEDGED' | 'AUDIT_INCOMPLETE' | 'AUDIT_IMMUTABLE'
  | 'AUDIT_TIMESTAMP_NONMONOTONIC' | 'AUDIT_SEQUENCE_CONFLICT' | 'AUDIT_CHAIN_INVALID'
  | 'NOTIFICATION_TEMPLATE_MISSING' | 'NOTIFICATION_GENERATION_FAILED' | 'NOTIFICATION_IMMUTABLE'
  // AI (genuine errors only — provider unavailability is never an error)
  | 'FALLBACK_TEMPLATE_MISSING' | 'RECOMMENDATION_ACTION_INVALID' | 'CONFIDENCE_BASIS_REQUIRED'
  | 'AI_UNAVAILABLE'                      // reserved; never returned by the AI routes
  // Startup (exit code 1, never served)
  | 'DB_UNAVAILABLE' | 'MIGRATION_CHECKSUM_MISMATCH' | 'SCHEMA_INTEGRITY_FAILED'
  | 'ROUTE_SCHEMA_MISSING' | 'ROUTE_PERMISSION_MISSING' | 'PORT_IN_USE' | 'STORAGE_UNAVAILABLE'
  | 'CONFIRMATION_REQUIRED';
```

### Error-handling principles (architectural, from `Y2` §9)

1. **Distinguish authority from state.** `403` = "you may not"; `409` = "not from here". The two demand different operator responses, so they get different codes.
2. **Never silently absorb.** Redundant transitions, unknown filters, and unknown parameters are rejected, not ignored. Silent absorption is how an audit trail acquires a no-op decision or a rule quietly stops checking.
3. **Fail the whole transaction.** Any error during a mutating action rolls back the domain write, the audit entry, and the notification together.
4. **Fall back rather than fail — but only for AI assistance, and only with the fallback labeled.** Nothing else in the system degrades silently.
5. **Record denials.** Every `403` and every rejected transition writes an audit entry (invariant I10). A blocked self-approval attempt is exactly the kind of event an oversight reviewer wants to see.
6. **Never leak.** Error messages contain no API keys, no absolute paths outside the project, no SQL, and no stack traces. Diagnosis happens through `request_id` and the server log.
