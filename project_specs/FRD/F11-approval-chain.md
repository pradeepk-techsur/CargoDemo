---

## F11: Specialist → Supervisor Approval Chain

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 8, 9

**Description:** F11 is the separation-of-duties mechanism and the central governance claim of the demo. A Cargo Specialist may recommend clearance; only a Supervisor may approve it; the approving official is recorded by name; and no path to `CLEARED` exists that does not pass through an approval by a human distinct from the one who recommended. Supervisors may approve, reject (returning the case with a reason), or request more information. Every disposition writes the approving identity, decision, justification, and timestamp to the audit record and generates a notification.

**Terminology:**
- **Recommendation:** A `recommendations` row created by the `CLEAR_EXCEPTION` action (F09b §4). Statuses: `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`, `RETURNED_FOR_INFORMATION`.
- **Approval:** An `approvals` row recording a supervisor's disposition of a recommendation. One approval row per disposition; a rejected-then-resubmitted case has two recommendations and two approvals, both permanently readable.
- **Approving official:** The supervisor whose `APPROVE_CLEARANCE` moved the case to `CLEARED`. Stored as `approving_official_user_id` plus denormalized `approving_official_name` and `approving_official_role`.
- **Separation of duties (SoD):** The two enforced constraints, SoD-1 and SoD-2 (§1). Together they guarantee that a clearance always has an approving official distinct from the recommender.
- **Evidence-changed warning:** The flag raised when the case's current evaluation version differs from the evaluation version the recommendation was made against, meaning the supervisor is deciding on different evidence than the specialist saw.

**Sub-features:**
- Recommendation submission (delegated to F09b §4)
- Pending-approval visibility for supervisors
- Approve / reject / request-more-information dispositions
- SoD-1 and SoD-2 enforcement, server-side
- Approving-official recording and audit completeness gate
- Evidence-changed detection

### §1 The separation-of-duties constraints

**SoD-1 — Role constraint.** `CLEARED` is reachable only through `APPROVE_CLEARANCE`, and `APPROVE_CLEARANCE` requires `acting_role = SUPERVISOR`. A Cargo Specialist calling the approval endpoint receives `403 FORBIDDEN_ROLE`. A System Administrator receives `403 FORBIDDEN_ROLE`. There is exactly one transition row in the state machine targeting `CLEARED` (F09a T31), which makes this constraint auditable by inspection of the transition table rather than by trusting the handler.

**SoD-2 — Identity constraint.** `approvals.approver_user_id` MUST NOT equal `recommendations.recommended_by_user_id`. This is enforced in three places:
1. In the handler before any write.
2. By a database `CHECK`-equivalent trigger on `approvals` that raises when the two IDs match.
3. By the UI, which disables the approve/reject controls for the recommender — belt-and-braces, but never the only enforcement (PRD §6 Security: "role checks are never client-only").

Together SoD-1 and SoD-2 mean:
- **Specialist recommends → Supervisor approves.** The roles differ, so the officials necessarily differ. This is the walkthrough path (Marisol Reyes recommends; Dwayne Okafor approves).
- **Supervisor recommends → a *different* Supervisor approves.** When a supervisor uses `CLEAR_EXCEPTION` themselves, the case still enters `PENDING_APPROVAL` and SoD-2 forbids them from approving their own recommendation. The seed data contains two supervisors (`usr-sup-001`, `usr-sup-002`) precisely so this path is demonstrable rather than deadlocked (F2 §Seeded users).
- **No self-clearance exists at all.** There is no configuration flag, no administrator override, and no "single-approver mode". An implementation that adds one contradicts the demo's central claim.

**SoD-3 — Approval scope.** An approval disposes of exactly one `PENDING` recommendation on one case. There is no bulk-approve endpoint and no multi-case operation, because a single justification cannot honestly cover multiple independent decisions.

### §2 Process — recommendation submission (walkthrough step 8)

1. A specialist on F19 selects "Recommend clearance", enters a justification, and confirms the enumerated exception set.
2. The `CLEAR_EXCEPTION` action executes through the F09b pipeline: G-REC and (from `AWAITING_INFORMATION`) G-ACK are evaluated, the AI recommendation is snapshotted with `concurrence`, and the evidence set is snapshotted onto the audit entry.
3. A `recommendations` row is created with `status = 'PENDING'`, bound to the case's current `evaluation_id`.
4. The case moves to `PENDING_APPROVAL`. It remains visible in the queue with a distinct status badge and is surfaced to supervisors by the `pending_approval_only=true` queue filter (F17).
5. A notification addressed to the `SUPERVISOR` role is generated, naming the recommender, the shipment, the exceptions, and the justification.

### §3 Process — supervisor disposition (walkthrough step 9)

1. A supervisor opens the case. F19 renders the pending recommendation panel: recommender name and role, submission timestamp, `resolution_basis`, the enumerated exceptions with evidence, the specialist's justification, and the AI recommendation with its concurrence.
2. If `recommendations.evaluation_id != cases.current_evaluation_id`, the panel shows an **evidence-changed warning** naming both versions and linking to the evaluation diff (F6 API). The supervisor may still approve, but the warning and the acknowledgement are recorded on the approval.
3. The supervisor posts `POST /api/cases/{id}/approval` with `decision`, `justification`, and (when the warning is present) `acknowledge_evidence_changed: true`.
4. The server runs the F09b common pipeline steps 1–9, then applies the disposition:
   - **`APPROVE`** → recommendation `APPROVED`; an `approvals` row is written with the approving official; every exception in the recommendation's `exception_ids` is set to `CLEARED_BY_DECISION` with `cleared_by_approval_id`; the case moves to `CLEARED`; `cases.cleared_at`, `cases.approving_official_user_id`, and `cases.approving_official_name` are set.
   - **`REJECT`** → recommendation `REJECTED` with `rejection_reason`; an `approvals` row is written; exceptions remain `OPEN`; the case returns to `IN_REVIEW`; `cases.assigned_to_user_id` is set back to the recommender so the work returns to its author.
   - **`REQUEST_INFO`** → recommendation `RETURNED_FOR_INFORMATION`; an `approvals` row is written; a `document_requests` row is created per requested type; the case moves to `AWAITING_INFORMATION`. This is the supervisor exercising T26.
5. The audit-completeness gate (G-AUDIT) runs before commit. For an `APPROVE`, `approving_official` MUST be non-null and all eight F12 fields MUST be present; otherwise the transaction aborts with `AUDIT_INCOMPLETE` and the case does not clear.
6. A notification is generated: on approval, addressed to the recommender and the specialist role, subject *"Clearance approved for {shipment_id} by {approving_official_name}"*; on rejection, subject *"Clearance recommendation returned — {shipment_id}"* with the reason.
7. The response returns the case's new status, the approval record, and the audit entry ID so F20 can be opened directly on the finalizing entry (walkthrough step 10).

**Inputs:**

`POST /api/cases/{case_id}/approval`, headers `X-CargoDemo-Session`, `Idempotency-Key`, `If-Match-Case-Version`:
- `recommendation_id` (string, required): MUST be the case's `PENDING` recommendation. Requiring it explicitly prevents a supervisor from approving a recommendation that was replaced between page load and submit.
- `decision` (enum, required): `APPROVE` | `REJECT` | `REQUEST_INFO`
- `justification` (string, required, 10–2 000 chars; minimum 40 chars when `decision = REJECT`, because returning a colleague's work demands a fuller reason)
- `acknowledge_evidence_changed` (boolean, conditionally required `true` when the recommendation's evaluation version differs from the current one)
- `rejection_reason` (enum, required when `REJECT`): `INSUFFICIENT_JUSTIFICATION` | `EVIDENCE_INCOMPLETE` | `EXCEPTION_NOT_RESOLVED` | `POLICY_DISAGREEMENT` | `OTHER`
- `document_types` (string[], required when `REQUEST_INFO`, 1–10 items): same validation as F09b §2 G-DOC

**Outputs:**
- `ApprovalResult`:
  - `approval`: `{ id, recommendation_id, decision, rejection_reason, justification, approver: { id, name, role }, decided_at, evidence_changed: boolean, acknowledged_evidence_changed: boolean, recommendation_evaluation_version, current_evaluation_version }`
  - `recommendation`: `{ id, status, recommended_by: { id, name, role }, recommended_at, resolution_basis, exception_ids, justification }`
  - `case`: `{ id, shipment_id, status, cleared_at, approving_official: { id, name, role } | null }`
  - `exceptions_closed[]` (on approve): `{ exception_id, exception_type, status: "CLEARED_BY_DECISION" }`
  - `audit_entry_id`, `notification_id`, `case_version`
- Persisted `approvals`, `recommendations`, `exceptions`, `cases`, `audit_entries`, `notifications`, and (on `REQUEST_INFO`) `document_requests` rows

**Validation:**
- `acting_role` MUST be `SUPERVISOR` (SoD-1). CS and ADM receive `403 FORBIDDEN_ROLE`.
- `acting_user_id != recommendation.recommended_by_user_id` (SoD-2). Violation returns `403 SELF_APPROVAL_BLOCKED` and writes an `ACCESS_DENIED` audit entry — an attempted self-approval is itself governance-relevant and is recorded.
- The case MUST be `PENDING_APPROVAL`; any other status returns `409 INVALID_TRANSITION` (or `409 CASE_TERMINAL` when already cleared).
- `recommendation_id` MUST identify the case's current `PENDING` recommendation; otherwise `409 RECOMMENDATION_NOT_PENDING`.
- When the evidence-changed condition holds and `acknowledge_evidence_changed` is not `true`, reject with `409 EVIDENCE_CHANGED_UNACKNOWLEDGED`.
- On `APPROVE`, every exception in `exception_ids` MUST still exist; exceptions resolved by an intervening revalidation are recorded as `RESOLVED_BY_REVALIDATION` and are not re-closed, and the approval records which of the recommended exceptions were still open at decision time.
- On `APPROVE`, the eight-field audit completeness check MUST pass with a non-null `approving_official`; failure aborts the transaction (`AUDIT_INCOMPLETE`) and the case does **not** clear. This is the enforcement behind PRD §7's "0 decisions finalizable with a missing field".
- The approval endpoint MUST NOT accept any of the five user action codes, and `POST /api/cases/{id}/actions` MUST NOT accept `APPROVE_CLEARANCE`; the two surfaces are deliberately disjoint.
- Idempotency-Key replay returns the original `ApprovalResult` without producing a second approval.
- After `CLEARED`, `recommendations`, `approvals`, and the case's status/priority are immutable; every mutating route returns `CASE_TERMINAL`.

**State transitions caused:**

| From | Decision | To | Recommendation status | Exception effect |
|---|---|---|---|---|
| `PENDING_APPROVAL` | `APPROVE` | `CLEARED` | `APPROVED` | Listed open exceptions → `CLEARED_BY_DECISION` |
| `PENDING_APPROVAL` | `REJECT` | `IN_REVIEW` | `REJECTED` | Unchanged (remain `OPEN`) |
| `PENDING_APPROVAL` | `REQUEST_INFO` | `AWAITING_INFORMATION` | `RETURNED_FOR_INFORMATION` | Unchanged; new document requests created |
| `PENDING_APPROVAL` | `PLACE_ON_HOLD` (F09b §5, T29) | `ON_HOLD` | `WITHDRAWN` | Unchanged |

**Walkthrough steps 8–9, worked:** Marisol Reyes (`usr-cs-001`, CS) submits `CLEAR_EXCEPTION` on `SHP-2026-0007` at evaluation v2 with `resolution_basis = MIXED` (the document exception resolved; the HTS and origin exceptions are accepted with a 40+ character justification). The case moves to `PENDING_APPROVAL` and appears under the supervisor's pending filter. Dwayne Okafor (`usr-sup-001`, SUP) opens it, sees the recommendation, the evidence, the AI recommendation with `concurrence: DIVERGED`, and approves with his own justification. SoD-1 passes (he is a supervisor), SoD-2 passes (`usr-sup-001 != usr-cs-001`), the audit gate passes with `approving_official = Dwayne Okafor`, the two remaining exceptions close as `CLEARED_BY_DECISION`, the case becomes `CLEARED`, and the approval notification is generated. Had Marisol attempted the approval herself, she would have received `403 SELF_APPROVAL_BLOCKED` and the attempt would appear in the audit trail.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Specialist attempts approval | 403 | `FORBIDDEN_ROLE` | "Only a Supervisor may approve a clearance" |
| Administrator attempts approval | 403 | `FORBIDDEN_ROLE` | "System Administrators do not approve shipments" |
| Recommender attempts to approve own recommendation | 403 | `SELF_APPROVAL_BLOCKED` | "You submitted this recommendation and cannot decide on it" |
| Case not in `PENDING_APPROVAL` | 409 | `INVALID_TRANSITION` | "No clearance recommendation is awaiting decision" |
| Case already cleared | 409 | `CASE_TERMINAL` | "Shipment {id} is already Cleared" |
| `recommendation_id` stale or not pending | 409 | `RECOMMENDATION_NOT_PENDING` | "That recommendation is no longer pending" |
| Evidence changed and not acknowledged | 409 | `EVIDENCE_CHANGED_UNACKNOWLEDGED` | "Evidence changed since the recommendation (v{a} → v{b}); review and acknowledge before deciding" |
| Rejection without a reason code | 422 | `VALIDATION_FAILED` | "rejection_reason is required when rejecting" |
| Rejection justification under 40 chars | 422 | `JUSTIFICATION_REQUIRED` | "A rejection requires a justification of at least 40 characters" |
| Approval would produce an incomplete audit record | 500 | `AUDIT_INCOMPLETE` | "Clearance blocked: the audit record would be missing {field}" |
| Concurrent decision on the same recommendation | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/cases/{id}/approval` | SUP | Approve, reject, or return a pending recommendation |
| GET | `/api/cases/{id}/recommendations` | CS, SUP, ADM | All recommendations for the case with status and attribution |
| GET | `/api/cases/{id}/approvals` | CS, SUP, ADM | All approval dispositions for the case |
| GET | `/api/queue?pending_approval_only=true` | SUP | Supervisor's approval work list |

Full schemas: `Y1b-api-actions.md` §Approvals.

**Schema Surface (this feature):** writes `recommendations`, `approvals`, `exceptions` (status only), `cases` (`status`, `cleared_at`, `approving_official_*`), `document_requests`, `audit_entries`, `notifications`. See `Y0b-schema-workflow-audit.md` §Recommendations and §Approvals.
