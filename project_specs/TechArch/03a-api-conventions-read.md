---

# 3. API Design

All interfaces in chunks `03a`–`03c` live in `src/shared/api/` and are imported by both the Fastify route definitions and the React data layer, so a response shape cannot drift between server and client (`01-components` §1.1). Each interface is paired with a JSON Schema used for runtime validation and for generating `GET /api/openapi.json`.

## 3.1 Conventions

| Concern | Rule |
|---|---|
| Base path | `/api`; every other path serves the SPA with `index.html` fallback |
| Origin | Same-origin only. **No CORS configuration exists**, removing an entire class of demo-day failure (`Y3` §8) |
| Auth | `X-CargoDemo-Session` header, or the `cargodemo_session` `HttpOnly` cookie for the embedded-preview case where header injection is inconvenient |
| Content type | `application/json` everywhere except the upload route (`multipart/form-data`) |
| Lists | Wrapped: `{ data, page, applied }` |
| Single resources | Unwrapped, with `_links` for related collections |
| Timestamps | ISO-8601 UTC with milliseconds, as strings |
| Money | Decimal **strings** (`"85000.00"`), never JS numbers |
| Enums | Canonical codes verbatim from FRD `00-header` §0.4 |
| Unknown fields | Rejected — every schema is `additionalProperties: false`, so a typo is a loud `422` rather than a silently ignored parameter |
| Unknown query params | Rejected with `422 INVALID_QUERY_PARAM`. Silent absorption is how a filter quietly stops filtering |
| Errors | The uniform `ErrorEnvelope` of §3c.7. Clients branch on `code`, never on `message` |

## 3.2 Shared Types

```ts
// ─── Canonical vocabularies (FRD 00-header §0.4) ───────────────────────────
export type Role          = 'CARGO_SPECIALIST' | 'SUPERVISOR' | 'SYSTEM_ADMINISTRATOR';
export type CaseStatus    = 'NEW' | 'IN_REVIEW' | 'AWAITING_INFORMATION' | 'ON_HOLD'
                          | 'ESCALATED' | 'PENDING_APPROVAL' | 'CLEARED';
export type UserAction    = 'REQUEST_INFORMATION' | 'SEND_FOR_SPECIALIST_REVIEW'
                          | 'CLEAR_EXCEPTION' | 'PLACE_ON_HOLD' | 'ESCALATE_TO_SUPERVISOR';
export type ExceptionType = 'MISSING_REQUIRED_DOCUMENT' | 'INVALID_HTS_CODE'
                          | 'CONFLICTING_COUNTRY_OF_ORIGIN';
export type ExceptionStatus = 'OPEN' | 'RESOLVED_BY_REVALIDATION'
                            | 'CLEARED_BY_DECISION' | 'SUPERSEDED_BY_EVALUATION';
export type Severity      = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Priority      = Severity;
export type ActorKind     = 'HUMAN' | 'SYSTEM' | 'AI';
export type EntryClass    = 'SYSTEM_EVENT' | 'AI_OUTPUT' | 'HUMAN_ACTION'
                          | 'APPROVAL_DECISION' | 'ACCESS_DENIED';
export type EvaluationTrigger = 'INGESTION' | 'MANUAL_REVALIDATION' | 'DOCUMENT_UPLOAD'
                              | 'RULE_CHANGE' | 'SEED';
export type GenerationMode = 'LLM' | 'FALLBACK_PROVIDER_DISABLED' | 'FALLBACK_PROVIDER_ERROR'
                           | 'FALLBACK_TIMEOUT' | 'FALLBACK_VALIDATION_FAILED';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Concurrence   = 'AGREED' | 'DIVERGED' | 'NO_RECOMMENDATION_PRESENT' | 'NOT_APPLICABLE';
export type EvidenceKind  = 'OBSERVED' | 'COMPARISON' | 'MISSING' | 'CONTEXT';
export type DocumentStatus = 'RECEIVED' | 'NOT_RECEIVED';
export type Provenance    = 'SEEDED' | 'INGESTED' | 'SIMULATED_UPLOAD';
export type RequestStatus = 'OUTSTANDING' | 'FULFILLED' | 'CANCELLED' | 'CANCELLED_BY_CLEARANCE';

/** Epoch-millis form of cases.updated_at, used for optimistic concurrency. */
export type CaseVersion = number;

export interface ActorRef  { kind: ActorKind; user_id: string | null; name: string | null; role: Role | null; }
export interface UserRef   { id: string; name: string; role: Role; }
export interface PageInfo  { page: number; page_size: number; total: number; total_pages: number; }
export interface ListResponse<T, TApplied = Record<string, unknown>> {
  data: T[]; page: PageInfo; applied?: TApplied;
}

export interface EvidenceRow {
  kind: EvidenceKind;
  field_path: string;
  raw_value: string | null;
  normalized_value: string | null;
  comparison_field_path?: string | null;
  comparison_raw_value?: string | null;
  comparison_normalized_value?: string | null;
  expected?: string | null;
  observed?: string | null;
  assertion?: string | null;
  truncated?: boolean;
  display_order: number;
}

export type MissingInformation =
  | { document_type: string; requirement: string; required_by_rule: string; policy_reference: string }
  | { field_path: string; requirement: string; observed_digits?: number; missing_digits?: number };

export interface RuleRef {
  id: string; name: string; version: number;
  description: string; policy_reference: string; severity: Severity;
}

export interface ExceptionView {
  exception_id: string;
  exception_type: ExceptionType;
  sub_reason: string;
  severity: Severity;
  status: ExceptionStatus;
  assertion: string;
  opened_at: string;
  resolved_at?: string | null;
  resolution_reason?: string | null;
  rule: RuleRef;
  evidence: EvidenceRow[];
  missing_information: MissingInformation[];
}

export interface AiProvenance {
  provider: string;                 // 'deterministic-fallback' when in fallback
  model: string;                    // e.g. 'cargodemo-fallback-recommendation@1'
  generation_mode: GenerationMode;
  generated_at: string;
  grounding_fingerprint: string;    // 'sha256:…'
  /** ALWAYS 'DETERMINISTIC'. The provider never chooses the action. */
  action_source?: 'DETERMINISTIC';
  rationale_source?: 'LLM' | 'FALLBACK';
  is_ai_generated: true;
}

/** Snapshot embedded in every human-action audit entry (F12 field 3). Never null. */
export type AiRecommendationSnapshot =
  | { present: false; reason: 'NOT_GENERATED' }
  | {
      present: true;
      recommended_action: UserAction;
      confidence_level: ConfidenceLevel;
      confidence_basis: string;
      rationale: string;
      provenance: AiProvenance;
      concurrence: Concurrence;
    };
```

## 3.3 Queue — `GET /api/queue` (CS, SUP, ADM)

```ts
export interface QueueQuery {
  status?: CaseStatus[];
  exception_type?: ExceptionType[];
  priority?: Priority[];
  assignment?: 'any' | 'me' | 'unassigned';
  pending_approval_only?: boolean;
  include_clean?: boolean;          // default false — zero-exception cases are off the queue
  include_cleared?: boolean;        // default false
  sort?: string;                    // default 'priority:desc,age:desc'
  page?: number;
  page_size?: number;
}

export interface QueueRow {
  shipment_id: string;
  case_id: string;
  importer_name: string;
  carrier_name: string;
  priority: Priority;
  priority_basis_summary: string;
  status: CaseStatus;
  open_exception_count: number;
  exception_types: Array<{ type: ExceptionType; count: number }>;
  exception_summary: string;
  oldest_exception_opened_at: string | null;
  age_days: number;
  assigned_to: UserRef | null;
  pending_approval: { recommendation_id: string; recommended_by: UserRef; recommended_at: string } | null;
  shipment_value_usd: string;
  updated_at: string;
}

export type QueueResponse = ListResponse<QueueRow, {
  filters: Record<string, unknown>;
  sort: string;
}>;
```

`exception_types` is an array rather than a single value so multi-exception shipments are **clearly indicated rather than collapsed** (F17). Default exclusions: zero-exception cases and `CLEARED` cases.

## 3.4 Shipment Detail — `GET /api/shipments/{shipment_id}` (CS, SUP, ADM)

```ts
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
  shipment_value_usd: string;
  entry_date: string;
  case: {
    status: CaseStatus;
    priority: Priority;
    priority_basis: Array<{ factor: string; detail: string; from: Priority | null; to: Priority }>;
    open_exception_count: number;
    current_evaluation: {
      id: string; version: number; evaluated_at: string;
      trigger: EvaluationTrigger; rule_set_fingerprint: string;
    } | null;
    assigned_to: UserRef | null;
    hold_reason: string | null;
    escalated_to: UserRef | null;
    approving_official: UserRef | null;
    cleared_at: string | null;
    case_version: CaseVersion;
  };
  ingestion: { source: string; batch_id: string | null };
  _links: {
    exceptions: string; documents: string; ai_summary: string;
    ai_recommendation: string; audit: string; available_actions: string;
  };
}
```

`priority_basis` is returned as structured factors rather than a sentence so the screen can show *why* a shipment is `CRITICAL` — derived, never hand-set.

## 3.5 Exceptions and Evaluations

```ts
// GET /api/shipments/{id}/exceptions   (CS, SUP, ADM)
export interface ExceptionsQuery {
  include_resolved?: boolean;       // default true
  evaluation_version?: number;      // default = current
}

export interface ExceptionsResponse {
  evaluation: {
    id: string; version: number; trigger: EvaluationTrigger;
    evaluated_at: string; rule_set_fingerprint: string;
  };
  open: ExceptionView[];
  resolved: ExceptionView[];
  counts: { open: number; resolved_by_revalidation: number; cleared_by_decision: number };
}

// GET /api/shipments/{id}/evaluations   (CS, SUP, ADM)  — newest first
export interface EvaluationSummary {
  id: string; version: number; trigger: EvaluationTrigger; evaluated_at: string;
  actor: ActorRef; finding_count: number; rule_set_fingerprint: string; exception_summary: string;
}
export type EvaluationListResponse = EvaluationSummary[];

// GET /api/shipments/{id}/evaluations/{version}  →  ExceptionsResponse (historical)

// GET /api/shipments/{id}/evaluations/{a}/diff/{b}   (CS, SUP, ADM)
export interface ResolvedExceptionDelta {
  exception_id: string; rule_id: string; exception_type: ExceptionType;
  resolution_reason: string; was_open_since: string;
}
export interface RetainedExceptionDelta {
  exception_id: string; prior_exception_id: string; rule_id: string;
  exception_type?: ExceptionType; open_since: string;
  missing_information_before: MissingInformation[];
  missing_information_after: MissingInformation[];
  evidence_changed: boolean;
}
export interface EvaluationDiff {
  from: { version: number }; to: { version: number };
  resolved: ResolvedExceptionDelta[];
  retained: RetainedExceptionDelta[];
  new: ExceptionView[];
  priority: { before: Priority; after: Priority };
  status: { before: CaseStatus; after: CaseStatus };
  open_exception_count: { before: number; after: number };
}
```

Exception order in every response is the deterministic evaluation order from F4 §Process step 3 — `(exception_type ASC, severity DESC, rule_id ASC)`. It never varies between runs, so a screenshot from one demo matches the next.

## 3.6 Documents

```ts
// GET /api/shipments/{id}/documents   (CS, SUP, ADM)
export interface DocumentView {
  id?: string;                      // absent for a not-yet-received required type
  document_type: string;
  display_name: string;
  status: DocumentStatus;
  provenance: Provenance | null;
  filename?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  content_hash?: string | null;
  received_at?: string | null;
  uploaded_by?: UserRef | null;
  source_request_id?: string | null;
  required_by_rules: string[];
  outstanding_request?: { id: string; requested_by: string; requested_at: string } | null;
  _links?: { content: string };
}
export type DocumentsResponse = { data: DocumentView[] };

// GET /api/shipments/{id}/document-requests   (CS, SUP, ADM)
export interface DocumentRequestView {
  id: string;
  document_type: string;
  status: RequestStatus;
  requested_by: UserRef;
  requested_at: string;
  requested_from: string | null;
  due_by: string | null;
  fulfilled_by: UserRef | null;
  fulfilled_at: string | null;
  fulfilling_document_id: string | null;
  cancellation_reason: string | null;
  cancelled_by: UserRef | null;
  cancelled_at: string | null;
  linked_exception_id: string | null;
  linked_rule_id: string | null;
}

// GET /api/documents/{id}/content  (CS, SUP, ADM)
//   Streams the stored synthetic file.
//   Content-Type from mime_type; Content-Disposition: attachment.

// GET /api/shipments/{id}/upload-fixtures   (CS, SUP — ADM denied)
export interface UploadFixture {
  fixture_id: string; document_type: string; filename: string;
  mime_type: string; size_bytes: number; description: string;
}
export type UploadFixturesResponse = UploadFixture[];
```

`DocumentView` intentionally represents a *required but not received* document type as a row with `status: 'NOT_RECEIVED'` and no `id`. The Shipment Review screen must show what is missing as prominently as what is present — that is the whole point of walkthrough step 5.

## 3.7 Audit — `GET /api/cases/{id}/audit` (CS, SUP, ADM)

```ts
export interface AuditQuery {
  entry_class?: EntryClass;
  since_sequence_no?: number;
  page?: number;
  page_size?: number;               // 1–500, default 100 — a timeline is meant to be read whole
}

/** The eight required fields (F12 §1) are fields 1–8 below, each explicitly present. */
export interface AuditEntryView {
  id: string;
  sequence_no: number;
  entry_class: EntryClass;
  event_type: string;
  occurred_at: string;                                  // 6 — server clock, monotonic per case
  actor: ActorRef;
  status_change: { before: CaseStatus | null; after: CaseStatus | null };

  exceptions: Array<{                                   // 1
    exception_id: string; exception_type: ExceptionType; severity: Severity;
    status: ExceptionStatus; rule_id: string; rule_name?: string;
    rule_version?: number; policy_reference: string; opened_at?: string;
  }>;
  evidence_reviewed: Array<EvidenceRow & { exception_id: string }>;   // 2 — snapshot, not a reference
  ai_recommendation: AiRecommendationSnapshot;          // 3 — never null
  user_decision: string | null;                         // 4
  user_decision_detail: Record<string, unknown> | null; // 4
  justification: string | null;                         // 5 — human-authored, verbatim
  approving_official: UserRef | null;                   // 7 — non-null on APPROVAL_DECISION
  approving_official_applicable?: boolean;              // 7 — false records deliberate absence
  notification: {                                       // 8
    id: string; recipient_role: Role; subject: string;
    body: string; generated_at: string; transmitted: false;
  } | null;

  evaluation_version: number | null;
  rule_set_fingerprint: string | null;
  prev_hash: string;
  entry_hash: string;

  /** Rendered directly by F20; `authorship` drives the AI/human visual separation. */
  presentation: {
    headline: string;
    authorship: 'HUMAN' | 'AI' | 'SYSTEM';
    actor_label: string;
    decision_label: string | null;
  };
}

export interface AuditResponse {
  case: {
    id: string; shipment_id: string; status: CaseStatus;
    approving_official: UserRef | null; cleared_at: string | null;
  };
  /** Lets the screen assert on camera that the record is complete. */
  completeness: {
    total_entries: number; decision_entries: number;
    decision_entries_complete: number; missing_fields: string[];
  };
  data: AuditEntryView[];
  page: PageInfo;
}

// GET /api/cases/{id}/audit/{sequence_no}  →  AuditEntryView
// GET /api/cases/{id}/audit/verify         (CS, SUP, ADM)
export interface AuditVerifyResponse {
  valid: boolean;
  entries_checked: number;
  first_invalid_sequence_no: number | null;
  verified_at: string;
}

// GET /api/cases/{id}/audit/export?format=json|printable   (CS, SUP, ADM)
//   json      → full record + hash chain + `verification` block,
//               Content-Disposition: attachment; filename="audit-SHP-2026-0007.json"
//   printable → server-rendered HTML for the browser's print dialog.
//               No PDF toolchain is required or used.

// GET /api/audit   (SUP, ADM only — cross-case search)
export interface CrossCaseAuditQuery {
  actor_user_id?: string; event_type?: string; entry_class?: EntryClass;
  shipment_id?: string; from?: string; to?: string; page?: number; page_size?: number;
}
```

Three properties of `AuditEntryView` are load-bearing for the governance claim and are worth stating explicitly:

1. **`ai_recommendation` is never `null`.** When no recommendation existed at action time it is the explicit object `{ present: false, reason: 'NOT_GENERATED' }`. Absence is recorded, so the eight-field completeness rule is satisfiable rather than vacuous.
2. **`evidence_reviewed` is a snapshot.** After a later revalidation, this array is unchanged (AU-08). An implementation that stored foreign keys and re-joined at read time would show the reviewer evidence the decider never saw.
3. **`presentation.authorship`** drives the visual separation required by F12 §5.3 and F20: AI content is never rendered inside a human-decision container, and every AI block carries its provenance.

## 3.8 Notifications

```ts
// GET /api/notifications   (CS, SUP, ADM — scoped to the acting role's addressing)
export interface NotificationsQuery { unread_only?: boolean; case_id?: string; page?: number; page_size?: number; }
export interface NotificationView {
  id: string; case_id: string; shipment_id: string;
  event_type: string; recipient_role: Role;
  subject: string; body: string;
  generated_at: string;
  transmitted: false;               // structurally always false (schema CHECK)
  read: boolean;
  audit_entry_id: string;
}
export interface NotificationsResponse extends ListResponse<NotificationView> { unread_count: number; }

// GET /api/notifications/unread-count  →  { unread_count: number }
// GET /api/cases/{id}/notifications    →  NotificationView[]  (ascending by generated_at)
// POST /api/notifications/{id}/read    (CS ⚠ must be addressed to the acting role, SUP, ADM) → 204
// POST /api/notifications/read-all     (CS, SUP, ADM — scoped to the acting role) → { marked: number }
```

`transmitted` is typed as the literal `false`, not `boolean` — the type system mirrors the `CHECK (transmitted = 0)` constraint, so a client cannot even write code that branches on a transmitted notification.

## 3.9 Workflow Reads

```ts
// GET /api/cases/{id}/available-actions   (CS, SUP, ADM)
export type UnavailableReason =
  | 'ROLE_NOT_PERMITTED' | 'ESCALATED_REQUIRES_SUPERVISOR' | 'TRANSITION_REDUNDANT'
  | 'APPROVAL_PENDING' | 'RECOMMENDATION_ALREADY_PENDING' | 'SELF_APPROVAL_BLOCKED'
  | 'CASE_TERMINAL' | 'HOLD_REQUIRES_RELEASE' | 'NO_MISSING_DOCUMENTS';

export interface AvailableAction {
  action: UserAction;
  available: boolean;
  reason: UnavailableReason | null;      // always populated when available === false
  required_fields?: string[];
  justification_min_length?: number;
}

export interface AvailableActionsResponse {
  case_id: string;
  status: CaseStatus;
  acting_role: Role;
  actions: AvailableAction[];             // always all five, never a filtered subset
  approval: { available: boolean; reason: string | null };
  case_version: CaseVersion;
}

// GET /api/workflow/transitions   (CS, SUP, ADM) — the F09a §2 table as data
export interface TransitionRow {
  id: string;                             // 'T01' … 'T33'
  from: CaseStatus;
  action: UserAction | 'APPROVE_CLEARANCE' | 'REJECT_RECOMMENDATION';
  allowed_roles: Role[];
  to: CaseStatus | null;
  guards: string[];                       // 'G-DOC' | 'G-DUP' | 'G-REC' | 'G-ACK' | …
  invalid_reason: string | null;
}
export type TransitionsResponse = TransitionRow[];

// GET /api/cases/{id}/actions   (CS, SUP, ADM) — action history
export interface CaseActionView {
  action_id: string; action: UserAction;
  status_before: CaseStatus; status_after: CaseStatus;
  justification: string; parameters: Record<string, unknown>;
  actor: ActorRef; occurred_at: string; audit_entry_id: string;
}

// GET /api/cases/{id}/recommendations  →  RecommendationView[]  (ascending by time)
export interface RecommendationView {
  id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'RETURNED_FOR_INFORMATION';
  resolution_basis: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';
  exception_ids: string[];
  justification: string;
  ai_recommendation_snapshot: AiRecommendationSnapshot;
  concurrence: Concurrence;
  recommended_by: UserRef; recommended_at: string;
  evaluation_version: number; closed_at: string | null;
}

// GET /api/cases/{id}/approvals  →  ApprovalView[]  (ascending by time)
export interface ApprovalView {
  id: string; recommendation_id: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  rejection_reason: string | null;
  justification: string;
  approver: UserRef;
  evidence_changed: boolean;
  acknowledged_evidence_changed: boolean;
  decided_at: string;
  audit_entry_id: string;
}
```

**`actions` always contains all five entries.** The server never returns a filtered subset, because PRD §6 Usability requires that *every disabled action states why it is unavailable* — a hidden action explains nothing. `reason` is a closed enum so the UI copy is centralized and testable (WF-14 asserts the outcome for every (status, role) pair).

`TransitionsResponse` exposes the state machine as data. The UI consumes it, and tests WF-01/WF-02 enumerate it — including the assertion that **exactly one row has `to === 'CLEARED'`**. A governance invariant that can be counted from a public endpoint is one a stakeholder can verify without reading code.
