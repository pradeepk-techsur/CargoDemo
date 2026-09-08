---

# Y1b: API — Mutating & Workflow Endpoints

Every endpoint in this chunk: requires `X-CargoDemo-Session`; performs a server-side role check before any write; accepts `Idempotency-Key` and `If-Match-Case-Version`; executes its domain write, audit entry, and notification in one transaction; and returns `X-Case-Version` on success.

## §1 Workflow actions

### `POST /api/cases/{case_id}/actions` — CS, SUP · `201 Created`

Discriminated on `action`. Common fields: `action` (required), `justification` (required, 10–2 000 chars; 40 minimum for `CLEAR_EXCEPTION` with `EXCEPTIONS_ACCEPTED`/`MIXED`).

**`REQUEST_INFORMATION`**
```jsonc
{ "action": "REQUEST_INFORMATION",
  "justification": "Certificate of origin is required to substantiate the declared Malaysian origin given the Chinese manufacturer address.",
  "document_types": ["CERTIFICATE_OF_ORIGIN"],
  "requested_from": "Importer of record",
  "due_by": "2026-09-15",
  "justify_unlisted_document": false }
```

**`SEND_FOR_SPECIALIST_REVIEW`**
```jsonc
{ "action": "SEND_FOR_SPECIALIST_REVIEW",
  "justification": "Taking this case up for review.",
  "assign_to_user_id": "usr-cs-001",
  "cancel_outstanding_requests": true }
```

**`CLEAR_EXCEPTION`**
```jsonc
{ "action": "CLEAR_EXCEPTION",
  "justification": "Certificate of origin received and consistent with the declared origin. Residual HTS and origin findings reviewed and accepted with an annotation for the classification unit.",
  "exception_ids": ["exc-0007-hts-v2", "exc-0007-origin-v2"],
  "resolution_basis": "MIXED",
  "acknowledge_outstanding_requests": false }
```

**`PLACE_ON_HOLD`**
```jsonc
{ "action": "PLACE_ON_HOLD",
  "justification": "Holding pending classification guidance from the commodity team.",
  "hold_reason": "PENDING_POLICY_GUIDANCE",
  "hold_reason_detail": null,
  "review_by": "2026-09-20" }
```

**`ESCALATE_TO_SUPERVISOR`**
```jsonc
{ "action": "ESCALATE_TO_SUPERVISOR",
  "justification": "Origin conflict on a high-value consignment warrants supervisor authority.",
  "escalation_reason": "CONFLICTING_EVIDENCE",
  "escalation_reason_detail": null,
  "escalate_to_user_id": "usr-sup-001" }
```

**Response** — the `ActionResult` of F09b §7, containing `action_id`, `status.before/after`, `acting_user`, `justification`, `occurred_at`, `ai_recommendation` with `concurrence`, `side_effects`, `audit_entry_id`, `notification_id`, `available_actions`, `case_version`.

**Errors** — `401 UNAUTHENTICATED`; `403 FORBIDDEN_ROLE | ESCALATED_REQUIRES_SUPERVISOR | HOLD_REQUIRES_RELEASE | ASSIGNMENT_NOT_PERMITTED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | TRANSITION_REDUNDANT | CASE_TERMINAL | CASE_VERSION_CONFLICT | RECOMMENDATION_ALREADY_PENDING | EXCEPTION_SET_STALE | DUPLICATE_DOCUMENT_REQUEST | DOCUMENT_ALREADY_RECEIVED | IDEMPOTENCY_KEY_REUSED`; `422 VALIDATION_FAILED | ACTION_NOT_A_USER_ACTION | JUSTIFICATION_REQUIRED | JUSTIFICATION_NOT_AUTHORED | DOCUMENT_TYPE_NOT_REQUIRED | OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED | ASSIGNEE_INVALID | ESCALATION_TARGET_INVALID`; `500 AUDIT_INCOMPLETE | NOTIFICATION_GENERATION_FAILED`.

## §2 Approvals

### `POST /api/cases/{case_id}/approval` — SUP only · `200 OK`

```jsonc
{ "recommendation_id": "rec-0007-1",
  "decision": "APPROVE",
  "justification": "Evidence reviewed. The certificate substantiates the declared origin; the residual findings are annotated and accepted. Clearance approved.",
  "acknowledge_evidence_changed": false,
  "rejection_reason": null,
  "document_types": null }
```

`decision: "REJECT"` requires `rejection_reason` and a justification of ≥ 40 chars. `decision: "REQUEST_INFO"` requires `document_types` (1–10 items).

**Response** — the `ApprovalResult` of F11 §Outputs: `approval`, `recommendation`, `case` (with `approving_official` and `cleared_at` on approve), `exceptions_closed[]`, `audit_entry_id`, `notification_id`, `case_version`.

**Errors** — `403 FORBIDDEN_ROLE | SELF_APPROVAL_BLOCKED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | CASE_TERMINAL | RECOMMENDATION_NOT_PENDING | EVIDENCE_CHANGED_UNACKNOWLEDGED | CASE_VERSION_CONFLICT`; `422 VALIDATION_FAILED | JUSTIFICATION_REQUIRED`; `500 AUDIT_INCOMPLETE`.

`POST /api/cases/{id}/actions` MUST reject `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` with `422 ACTION_NOT_A_USER_ACTION`, and this endpoint MUST reject any of the five user action codes with the same error. The two surfaces are disjoint by design (F11 §Validation).

## §3 Revalidation

### `POST /api/shipments/{shipment_id}/revalidate` — CS, SUP · `200 OK`

```jsonc
{ "note": "Re-running rules after the certificate upload." }
```
`note` is optional (0–1 000 chars). Revalidation requires no justification because it asserts nothing (F6 §Inputs). `trigger` is server-determined and is never accepted from the client.

**Response** — the `RevalidationResult` of F6 §Outputs:
```jsonc
{ "evaluation": { "id": "eval-0007-2", "version": 2, "evaluated_at": "…",
                  "trigger": "MANUAL_REVALIDATION", "rule_set_fingerprint": "sha256:…" },
  "resolved": [ { "exception_id": "exc-0007-doc", "rule_id": "rule-doc-highvalue-coo",
                  "exception_type": "MISSING_REQUIRED_DOCUMENT",
                  "resolution_reason": "DOCUMENT_RECEIVED",
                  "was_open_since": "2026-09-01T08:00:00.000Z" } ],
  "retained": [ { "exception_id": "exc-0007-hts-v2", "prior_exception_id": "exc-0007-hts",
                  "rule_id": "rule-hts-completeness", "exception_type": "INVALID_HTS_CODE",
                  "open_since": "2026-09-01T08:00:00.000Z",
                  "missing_information_before": [ "…" ], "missing_information_after": [ "…" ],
                  "evidence_changed": false } ],
  "new": [],
  "priority": { "before": "CRITICAL", "after": "CRITICAL", "basis": [ "…" ] },
  "status":   { "before": "AWAITING_INFORMATION", "after": "IN_REVIEW" },
  "open_exception_count": { "before": 3, "after": 2 },
  "document_requests_fulfilled": ["dr-0007-coo"],
  "ai_regeneration": { "summary_status": "FALLBACK", "recommendation_status": "FALLBACK" },
  "audit_entry_id": "aud-0007-007", "notification_id": "ntf-0007-007",
  "case_version": 1757340501993 }
```

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 CASE_TERMINAL | CASE_VERSION_CONFLICT | EVALUATION_VERSION_CONFLICT`; `500 EVALUATION_FAILED | RECONCILIATION_INCONSISTENT | AUDIT_INCOMPLETE`.

## §4 Documents

### `POST /api/document-requests/{request_id}/upload` — CS, SUP · `201 Created`

`Content-Type: multipart/form-data` with two parts:
- `file` — binary, 1 byte – 5 MB, MIME in `{application/pdf, image/png, image/jpeg, text/plain, text/csv}`
- `metadata` — JSON: `{ "original_filename": "CERTIFICATE_OF_ORIGIN_SHP-2026-0007.pdf", "note": "Synthetic fixture attached during demo", "stated_country": "Malaysia" }`

`document_type` is **not** accepted from the client; it is copied from the request row (F10 §Process step 7).

**Response** — the `UploadResult` of F10 §Outputs, embedding the full `RevalidationResult` from §3.

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 REQUEST_NOT_OUTSTANDING | CASE_TERMINAL | CASE_VERSION_CONFLICT`; `413 PAYLOAD_TOO_LARGE`; `415 UNSUPPORTED_MEDIA_TYPE`; `422 FILE_REQUIRED | FILE_EMPTY | FILE_EXTENSION_MISMATCH | FILE_CONTENT_MISMATCH | PII_SUSPECTED`; `500 STORAGE_PATH_INVALID | STORAGE_WRITE_FAILED | EVALUATION_FAILED`.

### `POST /api/document-requests/{request_id}/cancel` — CS, SUP · `200 OK`
```jsonc
{ "reason": "Superseded by a broader request covering the full document set." }
```
Returns the updated request. Errors: `409 REQUEST_NOT_OUTSTANDING`, `422 VALIDATION_FAILED`, `403 FORBIDDEN_ROLE`.

## §5 Endpoint-to-transition map

| Endpoint | Transitions it can cause | Never causes |
|---|---|---|
| `POST /api/cases/{id}/actions` | T01–T06, T08–T18, T20–T24, T26, T29 | `CLEARED` |
| `POST /api/cases/{id}/approval` | T31 (`CLEARED`), T32 (`IN_REVIEW`), T26 (`AWAITING_INFORMATION`) | any of the five user actions |
| `POST /api/shipments/{id}/revalidate` | `NEW→IN_REVIEW`, `AWAITING_INFORMATION→IN_REVIEW` | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/upload` | indirectly via revalidation | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/cancel` | none | any |

`POST /api/cases/{id}/approval` is the sole endpoint in the entire API that can produce `CLEARED`, and only under `decision: "APPROVE"` by a supervisor who is not the recommender. This is the API-surface expression of F09a invariant I1.

## §6 Shared request headers

| Header | Required | Behavior |
|---|---|---|
| `X-CargoDemo-Session` | yes | Resolves the acting user; `401` if absent or invalid |
| `Idempotency-Key` | recommended (the UI always sends it) | Replay with an identical payload returns the original response; replay with a different payload returns `409 IDEMPOTENCY_KEY_REUSED` |
| `If-Match-Case-Version` | recommended | `409 CASE_VERSION_CONFLICT` when the case changed since that version |
| `Content-Type` | yes | `application/json` except upload, which is `multipart/form-data` |

## §7 Shared response headers

| Header | Present on | Meaning |
|---|---|---|
| `X-Request-Id` | all responses | Correlates with `request_log` and with the `request_id` in error bodies |
| `X-Case-Version` | mutating case routes | The case's new version for the client's next `If-Match-Case-Version` |
| `Location` | `201` responses | The canonical URL of the created resource |
