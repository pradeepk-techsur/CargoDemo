
## Epic 5: Specialist → Supervisor Approval Chain (F11)

Separation of duties made structural: a specialist recommends, a distinct supervisor approves, and no clearance exists without a named approving official.

### US-5.1: Recommend Clearance and Route It to a Supervisor
**As a** Marisol Reyes (Cargo Specialist), **I want to** submit a clearance recommendation with my justification and the exceptions I am proposing to close, **so that** my judgement is captured and routed to an approving official rather than acted on by me alone.

**Acceptance Criteria:**
- [ ] The submit control is labelled "Recommend clearance" with an explicit note that supervisor approval is required
- [ ] A confirmation step restates the exceptions proposed for clearance, that this creates a recommendation and not a clearance, and that a supervisor distinct from the submitter must approve
- [ ] `exception_ids` must exactly equal the case's current open exception set; a subset is rejected with `EXCEPTION_SET_STALE`
- [ ] A `resolution_basis` of `EXCEPTIONS_RESOLVED`, `EXCEPTIONS_ACCEPTED` or `MIXED` is mandatory
- [ ] The justification minimum rises from 10 to 40 characters when the basis is `EXCEPTIONS_ACCEPTED` or `MIXED`
- [ ] Submitting from `AWAITING_INFORMATION` requires acknowledging outstanding requests, otherwise `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED`; acknowledged requests are cancelled with the justification recorded
- [ ] A recommendation row is created with `PENDING` status, the recommender's identity and role, the exception set, the justification, the AI recommendation snapshot and the concurrence verdict
- [ ] The recommendation is bound to the evaluation version it was made against
- [ ] The case moves to `PENDING_APPROVAL` — never directly to `CLEARED`
- [ ] A second recommendation while one is pending is rejected with `RECOMMENDATION_ALREADY_PENDING`
- [ ] A notification addressed to the Supervisor role names the recommender, the shipment, the exceptions and the justification

**Priority:** P0 | **Feature Ref:** F11, F9

---

### US-5.2: Find Pending-Approval Work Without Hunting for It
**As a** Dwayne Okafor (Supervisor), **I want to** pending-approval cases to be visually distinct in the queue and reachable by a single filter, **so that** an approval never sits unnoticed while a shipment ages.

**Acceptance Criteria:**
- [ ] `PENDING_APPROVAL` rows carry a persistent "Awaiting your approval" marker for Supervisors and "Awaiting supervisor" for Cargo Specialists
- [ ] A `Pending approval only` filter is prominent for Supervisors and available to specialists
- [ ] A `PENDING_APPROVAL` case appears on the queue even when all its exceptions are proposed for clearance, because it is the supervisor's work item
- [ ] The row shows the recommender's name and the recommendation timestamp
- [ ] The marker is conveyed by text label, not colour alone

**Priority:** P0 | **Feature Ref:** F11, F17

---

### US-5.3: Approve a Clearance as the Named Approving Official
**As a** Dwayne Okafor (Supervisor), **I want to** approve a clearance recommendation with the full evidence and advisory chain in front of me, **so that** my name stands behind a decision I have actually verified.

**Acceptance Criteria:**
- [ ] The pending recommendation panel shows the recommender's name and role, submission timestamp, resolution basis, the enumerated exceptions with their evidence, the specialist's justification verbatim, and the AI recommendation with its concurrence
- [ ] The approval request must name the case's current `PENDING` recommendation, otherwise `RECOMMENDATION_NOT_PENDING`
- [ ] Approval requires a justification of at least 10 characters, authored by the approver
- [ ] On approval the recommendation becomes `APPROVED`, an approval row records the approving official, and each listed open exception is closed as `CLEARED_BY_DECISION`
- [ ] The case moves to `CLEARED` and records `cleared_at`, the approving official's user ID, name and role
- [ ] An exception resolved by an intervening revalidation is recorded as `RESOLVED_BY_REVALIDATION` and is not re-closed; the approval records which recommended exceptions were still open at decision time
- [ ] A notification addressed to the recommender and the specialist role is generated with the subject naming the approving official
- [ ] The response returns the audit entry ID so the Decision & Audit Record screen can be opened directly on the finalising entry
- [ ] `Idempotency-Key` replay returns the original approval result without producing a second approval

**Priority:** P0 | **Feature Ref:** F11, F12, F13

---

### US-5.4: Reject or Return a Recommendation with a Reason
**As a** Dwayne Okafor (Supervisor), **I want to** reject a recommendation with a reason code, or return it asking for more information, **so that** work goes back to its author with a usable explanation instead of stalling.

**Acceptance Criteria:**
- [ ] Rejection requires a reason code from `INSUFFICIENT_JUSTIFICATION`, `EVIDENCE_INCOMPLETE`, `EXCEPTION_NOT_RESOLVED`, `POLICY_DISAGREEMENT`, `OTHER`, otherwise `VALIDATION_FAILED`
- [ ] Rejection requires a justification of at least 40 characters, otherwise `JUSTIFICATION_REQUIRED`
- [ ] On rejection the recommendation becomes `REJECTED` with the reason, exceptions remain `OPEN`, the case returns to `IN_REVIEW`, and assignment returns to the recommender
- [ ] On return-for-information the recommendation becomes `RETURNED_FOR_INFORMATION`, a document request is created per requested type, and the case moves to `AWAITING_INFORMATION`
- [ ] An approval row is written for every disposition, so a rejected-then-resubmitted case has two recommendations and two approvals, both permanently readable
- [ ] Each disposition writes an audit entry and generates a notification naming the reason
- [ ] An approval disposes of exactly one pending recommendation on one case; no bulk-approve endpoint exists

**Priority:** P0 | **Feature Ref:** F11, F13

---

### US-5.5: Be Warned When the Evidence Changed Since the Recommendation
**As a** Dwayne Okafor (Supervisor), **I want to** be warned when the case has been revalidated since the recommendation was made, **so that** I never approve on evidence the specialist never saw.

**Acceptance Criteria:**
- [ ] The warning is raised whenever the recommendation's evaluation version differs from the case's current evaluation version
- [ ] The warning names both versions and links to the evaluation diff
- [ ] The submit control stays disabled until the acknowledgement checkbox is set
- [ ] Submitting without acknowledgement is rejected server-side with `EVIDENCE_CHANGED_UNACKNOWLEDGED`
- [ ] The warning and the acknowledgement are recorded on the approval row and on the audit entry
- [ ] A revalidation that occurs while a recommendation is pending leaves the recommendation pending and records that the evidence changed during an outstanding approval

**Priority:** P0 | **Feature Ref:** F11, F6

---
