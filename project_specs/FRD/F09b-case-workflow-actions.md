---

## F9 (Part 2 of 2): The Five User Actions

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 8

**Description:** This chunk specifies each of the five human-initiated actions in detail: its purpose, request payload, action-specific validation, side effects beyond the status transition, the audit and notification it produces, and its error states. All five share a single endpoint shape and a single execution pipeline, described in §Common execution pipeline. The transition table and guards they must satisfy are in `F09a-case-workflow-state-machine.md`.

**Terminology:**
- **Action request:** The body posted to `POST /api/cases/{case_id}/actions`. Discriminated by `action`.
- **Justification:** Mandatory free-text authored by the acting human, 10–2 000 characters. It is the human's stated reasoning and is stored verbatim; it is never generated, prefilled, or defaulted by the AI or the UI.
- **Action record:** A `case_actions` row — the durable fact that a named human took a named action from a named state at a named time.
- **Side effect:** A domain write beyond the status change, e.g. creating a document request or a clearance recommendation.

**Sub-features:**
- `REQUEST_INFORMATION`
- `SEND_FOR_SPECIALIST_REVIEW`
- `CLEAR_EXCEPTION`
- `PLACE_ON_HOLD`
- `ESCALATE_TO_SUPERVISOR`
- Common execution pipeline with transactional audit + notification coupling

### §1 Common execution pipeline

1. **Authenticate** — resolve the acting user from the session; `401 UNAUTHENTICATED` if absent (F3).
2. **Validate the body** against the action's discriminated schema; `422 VALIDATION_FAILED` with `field_errors`.
3. **Load and lock** the case row inside a transaction; `404` if absent; check `If-Match-Case-Version`; `409 CASE_VERSION_CONFLICT` on mismatch.
4. **Terminal check** — `409 CASE_TERMINAL` if `status = CLEARED`.
5. **Role check** — is the action permitted to `acting_role` at all (F14)? `403 FORBIDDEN_ROLE`.
6. **Transition lookup** — is `(status, action, role)` in the table (F09a §2)? `409 INVALID_TRANSITION` / `409 TRANSITION_REDUNDANT` / `403 ESCALATED_REQUIRES_SUPERVISOR`.
7. **Guards** — evaluate the guards attached to the matched row; each failure returns its own code (F09a §3).
8. **Snapshot the AI recommendation** — read the current `ai_outputs` recommendation for the case's current evaluation and compute `concurrence` (F8 §Process step 11). If none exists, snapshot `{ present: false, reason: "NOT_GENERATED" }`.
9. **Snapshot the evidence reviewed** — the full open exception set with all evidence rows at the moment of decision. This snapshot is stored on the audit entry, not merely referenced, so the audit record remains complete even after later revalidations change the live exception set.
10. **Apply side effects** for the specific action (§2–§6).
11. **Write the `case_actions` row** and update `cases.status`, `cases.updated_at`, and `cases.last_action_id`.
12. **Write the audit entry** with all eight required fields; the completeness guard runs before commit (F12) and aborts with `500 AUDIT_INCOMPLETE` if any field is absent.
13. **Generate the notification** (F13) and link it to the audit entry, populating the audit entry's `generated_notification` field.
14. **Commit.** All of steps 10–13 are in one transaction — a state change without its audit entry and notification is structurally impossible.
15. **Respond** with the `ActionResult`, including the new status, the available actions from the new state, and the created side-effect resources.

Steps 12–13 have a mutual dependency (the audit entry references the notification and the notification references the audit entry). It is resolved by inserting the audit entry with a null `notification_id`, inserting the notification with the audit entry's ID, then performing the single permitted `UPDATE` on `audit_entries` — a `notification_id`-only update, allowed by the append-only trigger's `WHEN` clause, which permits exactly this one column to transition from null to non-null once and rejects every other update (see `Y0b` §Audit).

### §2 `REQUEST_INFORMATION` — Request additional information

**Purpose:** Ask for one or more specific missing documents. Walkthrough step 5.

**Additional inputs:**
- `document_types` (string[], required, 1–10 items): each `^[A-Z0-9_]{3,60}$`
- `requested_from` (string, optional, ≤ 200 chars): a synthetic addressee label such as `"Importer of record"`. Purely descriptive; nothing is transmitted (F13).
- `due_by` (ISO date, optional): informational only; no scheduler exists (PRD §5.9 excludes background jobs).
- `justify_unlisted_document` (boolean, optional, default `false`): required `true` when a requested type is not named in any open exception's `missing_information`.
- `acknowledge_outstanding_requests` — not used by this action.

**Validation:** G-DOC and G-DUP (F09a §3). Each `document_type` is normalized to upper snake case before comparison and storage. Requesting a document type that is already `RECEIVED` on the shipment is rejected with `DOCUMENT_ALREADY_RECEIVED`.

**Side effects:** creates one `document_requests` row per document type with `status = 'OUTSTANDING'`, `requested_by_user_id`, `requested_at`, `linked_exception_id` (the open exception whose `missing_information` names the type, when determinable), and `linked_rule_id`.

**Transition:** → `AWAITING_INFORMATION` (T01, T06, T11, T16, T21, T26).

**Notification:** recipient role `CARGO_SPECIALIST` (and `SUPERVISOR` when the case is escalated or pending approval), subject *"Document requested for {shipment_id}"*.

### §3 `SEND_FOR_SPECIALIST_REVIEW` — Send for specialist review

**Purpose:** Put the case into active review — taking up a new case, releasing a hold, de-escalating, or returning from information-gathering.

**Additional inputs:**
- `assign_to_user_id` (string, optional): a user with role `CARGO_SPECIALIST`. When omitted, the case is unassigned and appears in the general queue.
- `cancel_outstanding_requests` (boolean, optional, default `true` when transitioning from `AWAITING_INFORMATION`): outstanding requests are marked `CANCELLED` with the justification as the cancellation reason.

**Validation:** `assign_to_user_id`, if present, MUST resolve to an active user with role `CARGO_SPECIALIST`; otherwise `ASSIGNEE_INVALID`. A supervisor may assign; a specialist may assign only to themselves (`ASSIGNMENT_NOT_PERMITTED` otherwise) — a specialist can pick up work but cannot push it onto a colleague.

**Side effects:** sets `cases.assigned_to_user_id`; cancels outstanding document requests when applicable.

**Transition:** → `IN_REVIEW` (T02, T12, T17, T22). Invalid from `IN_REVIEW` (T07), `PENDING_APPROVAL` (T27).

**Notification:** recipient role `CARGO_SPECIALIST`, subject *"{shipment_id} assigned for specialist review"*.

### §4 `CLEAR_EXCEPTION` — Clear exception (recommend clearance)

**Purpose:** Propose that the shipment be cleared. Walkthrough step 8. **This action never clears anything by itself.** It creates a clearance recommendation and moves the case to `PENDING_APPROVAL`, where a distinct supervisor must approve (F11). The action is named "clear exception" because that is the operator-facing vocabulary mandated by the requirements; its effect is a recommendation, and the UI labels the submit control "Recommend clearance" with an explicit note that supervisor approval is required.

**Additional inputs:**
- `exception_ids` (string[], required, 0–20 items): the open exceptions being proposed for clearance. MUST equal the case's current open exception set exactly — a subset is rejected, because a partial clearance is not a supported disposition and silently clearing unlisted exceptions would break the audit claim. An empty array is valid only when the open set is empty.
- `resolution_basis` (enum, required): `EXCEPTIONS_RESOLVED` (evidence now satisfies the rules), `EXCEPTIONS_ACCEPTED` (still firing, but the reviewer judges them non-actionable), or `MIXED`.
- `acknowledge_outstanding_requests` (boolean, conditionally required): `true` when transitioning from `AWAITING_INFORMATION` (G-ACK).
- `justification` (inherited, required): when `resolution_basis` is `EXCEPTIONS_ACCEPTED` or `MIXED`, the minimum length is raised to 40 characters — accepting a still-firing exception demands a fuller stated reason than confirming a resolved one.

**Validation:** G-REC, G-ACK. `exception_ids` MUST match the current open set (`EXCEPTION_SET_STALE` otherwise, which is also what a concurrent revalidation produces). No `PENDING` recommendation may exist. From `ON_HOLD`, specialists are denied (T18) with reason `HOLD_REQUIRES_RELEASE`.

**Side effects:** creates a `recommendations` row `{ case_id, evaluation_id, recommended_by_user_id, recommended_by_name, recommended_by_role, recommended_action: 'CLEAR', resolution_basis, exception_ids_json, justification, ai_recommendation_snapshot_json, concurrence, status: 'PENDING', created_at }`.

**Transition:** → `PENDING_APPROVAL` (T03, T08, T13, T18, T23).

**Notification:** recipient role `SUPERVISOR`, subject *"Clearance recommendation awaiting approval — {shipment_id}"*, body naming the recommender, the exceptions, and the justification.

### §5 `PLACE_ON_HOLD` — Place on hold

**Purpose:** Park the case deliberately, with a stated reason, so it is visibly not being worked rather than silently stale.

**Additional inputs:**
- `hold_reason` (enum, required): `AWAITING_EXTERNAL_INPUT` | `PENDING_POLICY_GUIDANCE` | `RESOURCE_CONSTRAINT` | `OTHER`
- `hold_reason_detail` (string, required when `hold_reason = OTHER`, 10–500 chars)
- `review_by` (ISO date, optional): informational only

**Validation:** rejected from `ON_HOLD` (T19, `TRANSITION_REDUNDANT`). From `PENDING_APPROVAL` (T29) it is supervisor-only, subject to G-SOD, and withdraws the pending recommendation with `status = 'WITHDRAWN'` and `withdrawal_reason` from the justification.

**Side effects:** sets `cases.hold_reason`, `cases.hold_placed_by_user_id`, `cases.hold_placed_at`; withdraws a pending recommendation when applicable. Outstanding document requests are **retained** as `OUTSTANDING` — a hold does not cancel a request; the information may still arrive.

**Transition:** → `ON_HOLD` (T04, T09, T14, T24, T29).

**Notification:** recipient roles `CARGO_SPECIALIST` and `SUPERVISOR`, subject *"{shipment_id} placed on hold"*.

### §6 `ESCALATE_TO_SUPERVISOR` — Escalate to supervisor

**Purpose:** Transfer authority for the case upward. After escalation, specialists may no longer act on it (F09a I7).

**Additional inputs:**
- `escalation_reason` (enum, required): `POLICY_AMBIGUITY` | `HIGH_VALUE` | `REPEAT_OFFENDER_PATTERN` | `CONFLICTING_EVIDENCE` | `OTHER`
- `escalation_reason_detail` (string, required when `OTHER`, 10–500 chars)
- `escalate_to_user_id` (string, optional): a specific supervisor. When omitted, the case is escalated to the supervisor pool and appears for all supervisors.

**Validation:** rejected from `ESCALATED` (T25) and `PENDING_APPROVAL` (T30). `escalate_to_user_id`, if present, MUST resolve to an active `SUPERVISOR` (`ESCALATION_TARGET_INVALID`).

**Side effects:** sets `cases.escalated_to_user_id`, `cases.escalated_by_user_id`, `cases.escalated_at`, `cases.escalation_reason`. Outstanding document requests are retained.

**Transition:** → `ESCALATED` (T05, T10, T15, T20).

**Notification:** recipient role `SUPERVISOR` (or the specific escalation target), subject *"Escalated: {shipment_id}"*, body naming the escalating specialist, the reason, and the open exceptions.

### §7 Request and response shapes

**Request** — `POST /api/cases/{case_id}/actions`, headers `X-CargoDemo-Session`, `Idempotency-Key`, `If-Match-Case-Version`:

```
{
  "action": "REQUEST_INFORMATION",
  "justification": "Certificate of origin is required to substantiate the declared Malaysian origin given the Chinese manufacturer address.",
  "document_types": ["CERTIFICATE_OF_ORIGIN"],
  "requested_from": "Importer of record"
}
```

**Response** — `201 Created`:

```
{
  "action_id": "act-…",
  "case_id": "case-…",
  "shipment_id": "SHP-2026-0007",
  "action": "REQUEST_INFORMATION",
  "status": { "before": "NEW", "after": "AWAITING_INFORMATION" },
  "acting_user": { "id": "usr-cs-001", "name": "Marisol Reyes", "role": "CARGO_SPECIALIST" },
  "justification": "…",
  "occurred_at": "2026-09-08T14:06:22.104Z",
  "ai_recommendation": { "present": true, "recommended_action": "ESCALATE_TO_SUPERVISOR", "confidence": "MEDIUM", "concurrence": "DIVERGED" },
  "side_effects": { "document_requests": [ { "id": "dr-…", "document_type": "CERTIFICATE_OF_ORIGIN", "status": "OUTSTANDING" } ] },
  "audit_entry_id": "aud-…",
  "notification_id": "ntf-…",
  "available_actions": [ { "action": "REQUEST_INFORMATION", "available": true }, { "action": "SEND_FOR_SPECIALIST_REVIEW", "available": true }, … ],
  "case_version": 1757340382104
}
```

**Validation (common to all five):**
- `action` MUST be one of exactly the five codes; `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` posted here are rejected with `ACTION_NOT_A_USER_ACTION` and a pointer to the approval endpoint.
- `justification` is required on every action, 10–2 000 chars after trimming, and MUST NOT be whitespace-only or a copy of the AI rationale — an exact string match against the current AI rationale is rejected with `JUSTIFICATION_NOT_AUTHORED` to prevent the human record being a paste of machine text.
- Unknown properties are rejected; properties belonging to a different action's schema are rejected (e.g. `hold_reason` on `ESCALATE_TO_SUPERVISOR`).
- Actions MUST be idempotent under `Idempotency-Key` replay (F3).
- An action MUST NOT be executable by `SYSTEM_ADMINISTRATOR` under any state (F14).
- Every action MUST produce exactly one `case_actions`, one `audit_entries`, and one `notifications` row — never zero, never two (F09a I4).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Unknown or non-user action code | 422 | `ACTION_NOT_A_USER_ACTION` | "{action} is not one of the five user actions" |
| Justification missing/too short | 422 | `JUSTIFICATION_REQUIRED` | "A justification of at least {min} characters is required" |
| Justification identical to AI rationale | 422 | `JUSTIFICATION_NOT_AUTHORED` | "The justification must be authored by you, not copied from the AI rationale" |
| Requested document type not required by any open exception | 422 | `DOCUMENT_TYPE_NOT_REQUIRED` | "{type} is not required by any open exception; set justify_unlisted_document to request it anyway" |
| Duplicate outstanding request | 409 | `DUPLICATE_DOCUMENT_REQUEST` | "An outstanding request for {type} already exists" |
| Requested document already received | 409 | `DOCUMENT_ALREADY_RECEIVED` | "{type} has already been received" |
| `exception_ids` does not match the open set | 409 | `EXCEPTION_SET_STALE` | "The exception set changed; reload the shipment and resubmit" |
| Recommendation already pending | 409 | `RECOMMENDATION_ALREADY_PENDING` | "A clearance recommendation is already awaiting approval" |
| Outstanding requests not acknowledged | 422 | `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` | "Acknowledge the {n} outstanding document request(s) before recommending clearance" |
| Specialist clearing from hold | 403 | `HOLD_REQUIRES_RELEASE` | "Release the case from hold before recommending clearance" |
| Invalid assignee/escalation target | 422 | `ASSIGNEE_INVALID` / `ESCALATION_TARGET_INVALID` | "{user_id} is not an active {role}" |
| Specialist assigning to another specialist | 403 | `ASSIGNMENT_NOT_PERMITTED` | "Specialists may only assign a case to themselves" |
| Hold reason `OTHER` without detail | 422 | `VALIDATION_FAILED` | "hold_reason_detail is required when hold_reason is OTHER" |
| State-machine rejections | 403/409 | see F09a | see F09a |

**API Surface (this part):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/cases/{id}/actions` | CS, SUP | Execute one of the five actions |
| GET | `/api/cases/{id}/actions` | CS, SUP, ADM | Action history for the case |
| GET | `/api/cases/{id}/available-actions` | CS, SUP, ADM | Availability with reasons (F09a §5) |

Full schemas: `Y1b-api-actions.md` §Workflow actions.

**Schema Surface (this part):** writes `case_actions`, `cases`, `document_requests`, `recommendations`, `audit_entries`, `notifications`; reads `exceptions`, `evidence`, `ai_outputs`, `users`. See `Y0b-schema-workflow-audit.md`.
