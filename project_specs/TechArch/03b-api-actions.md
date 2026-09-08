---

# 3b. API — Mutating & Workflow Endpoints

Every endpoint in this chunk requires `X-CargoDemo-Session`; performs the server-side role check **before any write**; accepts `Idempotency-Key` and `If-Match-Case-Version`; executes its domain write, audit entry, and notification in **one transaction**; and returns `X-Case-Version` on success.

## 3b.1 Shared Request and Response Headers

```ts
export interface MutatingRequestHeaders {
  'x-cargodemo-session': string;          // required — 401 UNAUTHENTICATED if absent or invalid
  'idempotency-key'?: string;             // recommended; the UI always sends it
  'if-match-case-version'?: string;       // recommended; stale value → 409 CASE_VERSION_CONFLICT
  'content-type': 'application/json' | 'multipart/form-data';
}

export interface MutatingResponseHeaders {
  'x-request-id': string;                 // correlates with request_log and error bodies
  'x-case-version': string;               // the case's new version for the next If-Match
  location?: string;                      // on 201 responses
}
```

Replaying a request with the **same** `Idempotency-Key` and an identical payload returns the original response and creates no second row (WF-12). Replaying the same key with a *different* payload returns `409 IDEMPOTENCY_KEY_REUSED` rather than silently applying the second payload.

## 3b.2 Workflow Actions — `POST /api/cases/{case_id}/actions` (CS, SUP · `201 Created`)

A discriminated union on `action`. `justification` is required on all five variants: 10–2 000 characters, and **40 minimum** for `CLEAR_EXCEPTION` with `resolution_basis` of `EXCEPTIONS_ACCEPTED` or `MIXED` — accepting a still-firing exception demands more than a sentence.

```ts
interface ActionBase {
  justification: string;                  // 10–2000 chars (40 min for accepted/mixed clearance)
}

export interface RequestInformationCommand extends ActionBase {
  action: 'REQUEST_INFORMATION';
  document_types: string[];               // 1–10 items; guard G-DOC
  requested_from?: string | null;
  due_by?: string | null;                 // YYYY-MM-DD
  justify_unlisted_document?: boolean;    // true ⇒ justification ≥ 20 chars for an unlisted type
}

export interface SendForSpecialistReviewCommand extends ActionBase {
  action: 'SEND_FOR_SPECIALIST_REVIEW';
  assign_to_user_id?: string | null;      // ASSIGNEE_INVALID if not an active user of the right role
  cancel_outstanding_requests?: boolean;  // guard G-CANCEL
}

export interface ClearExceptionCommand extends ActionBase {
  action: 'CLEAR_EXCEPTION';
  exception_ids: string[];                // must match the current open set — else EXCEPTION_SET_STALE
  resolution_basis: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';
  acknowledge_outstanding_requests?: boolean;   // guard G-ACK, required from AWAITING_INFORMATION
}

export interface PlaceOnHoldCommand extends ActionBase {
  action: 'PLACE_ON_HOLD';
  hold_reason: 'AWAITING_EXTERNAL_INPUT' | 'PENDING_POLICY_GUIDANCE'
             | 'RESOURCE_CONSTRAINT' | 'OTHER';
  hold_reason_detail?: string | null;
  review_by?: string | null;
}

export interface EscalateToSupervisorCommand extends ActionBase {
  action: 'ESCALATE_TO_SUPERVISOR';
  escalation_reason: string;
  escalation_reason_detail?: string | null;
  escalate_to_user_id?: string | null;    // ESCALATION_TARGET_INVALID if not an active SUPERVISOR
}

export type ActionCommand =
  | RequestInformationCommand | SendForSpecialistReviewCommand | ClearExceptionCommand
  | PlaceOnHoldCommand | EscalateToSupervisorCommand;
```

**Response — `ActionResult` (F09b §7):**

```ts
export interface ActionResult {
  action_id: string;
  action: UserAction;
  status: { before: CaseStatus; after: CaseStatus };
  acting_user: UserRef;
  justification: string;
  occurred_at: string;

  /** What the human was advised, and whether they agreed. Divergence is not an error. */
  ai_recommendation: AiRecommendationSnapshot;

  side_effects: {
    document_requests_created: string[];
    document_requests_cancelled: string[];
    recommendation_created: string | null;
    recommendation_closed: string | null;
    case_assigned_to: UserRef | null;
    escalated_to: UserRef | null;
  };

  audit_entry_id: string;                 // exactly one — invariant I4
  notification_id: string;                // exactly one — invariant I4
  available_actions: AvailableAction[];   // refreshed for the new state, so the UI needs no refetch
  case_version: CaseVersion;
}
```

**Errors** — `401 UNAUTHENTICATED`; `403 FORBIDDEN_ROLE | ESCALATED_REQUIRES_SUPERVISOR | HOLD_REQUIRES_RELEASE | ASSIGNMENT_NOT_PERMITTED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | TRANSITION_REDUNDANT | CASE_TERMINAL | CASE_VERSION_CONFLICT | RECOMMENDATION_ALREADY_PENDING | EXCEPTION_SET_STALE | DUPLICATE_DOCUMENT_REQUEST | DOCUMENT_ALREADY_RECEIVED | IDEMPOTENCY_KEY_REUSED`; `422 VALIDATION_FAILED | ACTION_NOT_A_USER_ACTION | JUSTIFICATION_REQUIRED | JUSTIFICATION_NOT_AUTHORED | DOCUMENT_TYPE_NOT_REQUIRED | OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED | ASSIGNEE_INVALID | ESCALATION_TARGET_INVALID`; `500 AUDIT_INCOMPLETE | NOTIFICATION_GENERATION_FAILED`.

Two error codes deserve architectural note:

- **`JUSTIFICATION_NOT_AUTHORED`** rejects a justification that is an exact copy of the AI rationale. The human must author their reasoning, not paste the machine's. This is a small check with a large governance meaning.
- **`403` vs `409` is a deliberate distinction** (`Y2` §9.1): `403` means "you may not", `409` means "not from here". A specialist acting on an escalated case gets `403 ESCALATED_REQUIRES_SUPERVISOR` — an authority problem, not a state problem — because the two demand different operator responses.

## 3b.3 Approvals — `POST /api/cases/{case_id}/approval` (SUP only · `200 OK`)

```ts
export interface ApprovalCommand {
  recommendation_id: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  justification: string;                  // ≥ 10 chars; ≥ 40 when decision is REJECT
  acknowledge_evidence_changed?: boolean; // required true when evidence changed since the recommendation
  rejection_reason?: 'INSUFFICIENT_JUSTIFICATION' | 'EVIDENCE_INCOMPLETE'
                   | 'EXCEPTION_NOT_RESOLVED' | 'POLICY_DISAGREEMENT' | 'OTHER' | null;
  document_types?: string[] | null;       // 1–10 items, required when decision is REQUEST_INFO
}

export interface ApprovalResult {
  approval: ApprovalView;
  recommendation: RecommendationView;
  case: {
    status: CaseStatus;                   // 'CLEARED' only on APPROVE
    approving_official: UserRef | null;   // non-null whenever status === 'CLEARED'
    cleared_at: string | null;
  };
  exceptions_closed: Array<{ exception_id: string; status: 'CLEARED_BY_DECISION' }>;
  audit_entry_id: string;
  notification_id: string;
  case_version: CaseVersion;
}
```

**Errors** — `403 FORBIDDEN_ROLE | SELF_APPROVAL_BLOCKED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | CASE_TERMINAL | RECOMMENDATION_NOT_PENDING | EVIDENCE_CHANGED_UNACKNOWLEDGED | CASE_VERSION_CONFLICT`; `422 VALIDATION_FAILED | JUSTIFICATION_REQUIRED`; `500 AUDIT_INCOMPLETE`.

**The two surfaces are disjoint by design.** `POST /api/cases/{id}/actions` MUST reject `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` with `422 ACTION_NOT_A_USER_ACTION`, and this endpoint MUST reject any of the five user action codes with the same error. Approval is not a sixth user action; it is a different kind of authority, and the API says so structurally.

**This is the only endpoint in the entire API that can produce `CLEARED`**, and only under `decision: 'APPROVE'` by a supervisor who is not the recommender. That is the API-surface expression of invariant I1, backed by transition row T31, guards G-SOD and G-AUDIT, and the `cases`/`approvals` `CHECK` constraints of `02b`.

## 3b.4 Revalidation — `POST /api/shipments/{shipment_id}/revalidate` (CS, SUP · `200 OK`)

```ts
export interface RevalidateCommand {
  note?: string | null;                   // 0–1000 chars, optional
}
```

Revalidation requires **no justification** because it asserts nothing — it re-runs deterministic rules against current evidence (F6 §Inputs). `trigger` is server-determined and is never accepted from the client, so a caller cannot mislabel the provenance of an evaluation.

```ts
export interface RevalidationResult {
  evaluation: {
    id: string; version: number; evaluated_at: string;
    trigger: EvaluationTrigger; rule_set_fingerprint: string;
  };
  resolved: ResolvedExceptionDelta[];     // no longer firing — retained, never deleted
  retained: RetainedExceptionDelta[];     // still firing; opened_at carried forward
  new: ExceptionView[];                   // newly triggered
  priority: { before: Priority; after: Priority; basis: string[] };
  status:   { before: CaseStatus; after: CaseStatus };
  open_exception_count: { before: number; after: number };
  document_requests_fulfilled: string[];
  ai_regeneration: {
    summary_status: 'LLM' | 'FALLBACK' | 'SKIPPED';
    recommendation_status: 'LLM' | 'FALLBACK' | 'SKIPPED';
  };
  audit_entry_id: string;
  notification_id: string;
  case_version: CaseVersion;
}
```

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 CASE_TERMINAL | CASE_VERSION_CONFLICT | EVALUATION_VERSION_CONFLICT`; `500 EVALUATION_FAILED | RECONCILIATION_INCONSISTENT | AUDIT_INCOMPLETE`.

**`RevalidationResult` is the walkthrough step 7 contract.** The screen renders `resolved` / `retained` / `new` verbatim — "1 resolved, 2 retained" is a server fact, not a client computation. The canonical scenario is engineered so this is exactly what happens: the certificate of origin resolves the missing-document exception, while the HTS exception (untouched by document evidence) and the origin exception (whose default rule compares only `manufacturer.address.country`) both persist. Revalidation **never** produces `CLEARED` or `PENDING_APPROVAL` (invariant I9, test RV-05).

## 3b.5 Document Upload — `POST /api/document-requests/{request_id}/upload` (CS, SUP · `201 Created`)

`Content-Type: multipart/form-data` with exactly two parts:

```ts
/** Part `file` — binary. 1 byte – 5 MB. */
export type UploadAllowedMime =
  | 'application/pdf' | 'image/png' | 'image/jpeg' | 'text/plain' | 'text/csv';

/** Part `metadata` — JSON. */
export interface UploadMetadata {
  original_filename: string;
  note?: string | null;
  stated_country?: string | null;         // feeds documents.stated_country for origin rules
}
```

**`document_type` is not accepted from the client.** It is copied from the `document_requests` row (F10 §Process step 7), so an upload cannot be retargeted to satisfy a requirement it was not requested for.

```ts
export interface UploadResult {
  document: DocumentView;                 // provenance: 'SIMULATED_UPLOAD'
  request: DocumentRequestView;           // status: 'FULFILLED'
  /** Revalidation is automatic on successful upload and shares the same transaction. */
  revalidation: RevalidationResult;
  audit_entry_id: string;
  notification_id: string;
  case_version: CaseVersion;
}
```

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 REQUEST_NOT_OUTSTANDING | CASE_TERMINAL | CASE_VERSION_CONFLICT`; `413 PAYLOAD_TOO_LARGE`; `415 UNSUPPORTED_MEDIA_TYPE`; `422 FILE_REQUIRED | FILE_EMPTY | FILE_EXTENSION_MISMATCH | FILE_CONTENT_MISMATCH | PII_SUSPECTED`; `500 STORAGE_PATH_INVALID | STORAGE_WRITE_FAILED | EVALUATION_FAILED`.

**Upload and revalidation are one transaction**, which is what makes walkthrough steps 6 and 7 a single atomic advance rather than two states a demo could get stuck between. A filesystem write failure rolls back the document row, the request status change, and the triggered revalidation, and removes any partially written file — storage and database never diverge. The full upload security path is specified in `04-security` §6.

## 3b.6 Cancel a Document Request — `POST /api/document-requests/{request_id}/cancel` (CS, SUP · `200 OK`)

```ts
export interface CancelRequestCommand { reason: string; }
export type CancelRequestResult = { request: DocumentRequestView };  // status: 'CANCELLED'
```

Errors: `403 FORBIDDEN_ROLE`; `409 REQUEST_NOT_OUTSTANDING`; `422 VALIDATION_FAILED`.

## 3b.7 Endpoint-to-Transition Map

| Endpoint | Transitions it can cause | Never causes |
|---|---|---|
| `POST /api/cases/{id}/actions` | T01–T06, T08–T18, T20–T24, T26, T29 | **`CLEARED`** |
| `POST /api/cases/{id}/approval` | T31 (`CLEARED`), T32 (`IN_REVIEW`), T26 (`AWAITING_INFORMATION`) | any of the five user actions |
| `POST /api/shipments/{id}/revalidate` | `NEW→IN_REVIEW`, `AWAITING_INFORMATION→IN_REVIEW` | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/upload` | indirectly, via revalidation | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/cancel` | none | any |

The `CLEAR_EXCEPTION` action is named for what a specialist *intends*, but it never produces `CLEARED` — it produces `PENDING_APPROVAL` and a `PENDING` recommendation (test WF-11). The gap between the action's name and its effect is the separation of duties, made visible.

## 3b.8 Concurrency and Idempotency Model

```ts
/** Read from GET responses; echoed on the next mutation. */
export type IfMatchCaseVersion = CaseVersion;
```

| Mechanism | Scope | Failure mode |
|---|---|---|
| `BEGIN IMMEDIATE` + case-row load-for-update | Whole use case | Serializes writers; second writer waits up to `busy_timeout` |
| `If-Match-Case-Version` | Per case | `409 CASE_VERSION_CONFLICT` — "Case was modified by another user; reload and retry" |
| `Idempotency-Key` + scope + `request_hash` | Per (case, key) | Identical replay → original response; different payload → `409 IDEMPOTENCY_KEY_REUSED` |
| `UNIQUE (case_id, sequence_no)` on `audit_entries` | Audit chain | `409 AUDIT_SEQUENCE_CONFLICT` — retry |
| `UNIQUE (cargo_entry_id, version)` on `evaluations` | Evaluation history | `409 EVALUATION_VERSION_CONFLICT` — retry |

Two simultaneous actions on one case produce **one success and one `CASE_VERSION_CONFLICT`** (test WF-13), never a lost update and never two audit entries for one decision. The UI always sends both headers, so a double-click during a live demo is a no-op rather than a duplicated action — a small robustness property with an outsized effect on a walkthrough performed on camera.
