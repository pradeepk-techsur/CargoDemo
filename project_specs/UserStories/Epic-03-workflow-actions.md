
## Epic 3: Exception Case Workflow & The Five Actions (F9)

The state machine, exactly five human actions, mandatory justification on every one, and role-aware availability with a stated reason for anything unavailable.

### US-3.1: Take One of Exactly Five Actions on a Case
**As a** Marisol Reyes (Cargo Specialist), **I want to** dispose of a flagged shipment using one of five named actions, **so that** my options are unambiguous and every one of them is recorded.

**Acceptance Criteria:**
- [ ] Exactly five user actions exist: request additional information, send for specialist review, clear exception, place on hold, escalate to supervisor
- [ ] All five are presented on the Recommended Resolution screen on every render, for every role
- [ ] No action is pre-selected and no form auto-submits
- [ ] A free-text justification of at least 10 characters (trimmed, not whitespace-only) is mandatory on every action; the submit control stays disabled until it is met
- [ ] Submitting an action returns the new case status and the recalculated available actions from that status
- [ ] Each action produces exactly one action record, exactly one audit entry and exactly one notification — never zero and never two
- [ ] Approval codes (`APPROVE_CLEARANCE`, `REJECT_RECOMMENDATION`) posted to the action endpoint are rejected with `ACTION_NOT_A_USER_ACTION` and a pointer to the approval endpoint

**Priority:** P0 | **Feature Ref:** F9

---

### US-3.2: Request Additional Information
**As a** Marisol Reyes (Cargo Specialist), **I want to** request one or more specific missing document types with a justification, **so that** the outstanding requirement lives on the shipment record instead of in my email.

**Acceptance Criteria:**
- [ ] The action accepts 1–10 document types, each normalised to upper snake case
- [ ] A requested type must be named in some open exception's missing information, or be accompanied by `justify_unlisted_document = true` with a justification of at least 20 characters — otherwise `DOCUMENT_TYPE_NOT_REQUIRED`
- [ ] Requesting a document type already `RECEIVED` on the shipment is rejected with `DOCUMENT_ALREADY_RECEIVED`
- [ ] A second outstanding request for the same document type is rejected with `DUPLICATE_DOCUMENT_REQUEST`
- [ ] A second request for a *different* document type while already awaiting information is permitted (the only allowed self-loop)
- [ ] One document request row is created per type with `OUTSTANDING` status, requester identity, timestamp, linked exception and linked rule
- [ ] The case moves to `AWAITING_INFORMATION`
- [ ] An optional `requested_from` addressee label and `due_by` date are recorded as descriptive only — nothing is transmitted and no scheduler exists

**Priority:** P0 | **Feature Ref:** F9, F10

---

### US-3.3: Send a Case for Specialist Review
**As a** Dwayne Okafor (Supervisor), **I want to** put a case into active review — taking it up, releasing a hold, de-escalating, or returning from information gathering, **so that** the queue reflects what is actually being worked.

**Acceptance Criteria:**
- [ ] The action moves the case to `IN_REVIEW` from `NEW`, `AWAITING_INFORMATION`, `ON_HOLD` or `ESCALATED`
- [ ] The action is rejected from `IN_REVIEW` with `TRANSITION_REDUNDANT` and from `PENDING_APPROVAL` with `APPROVAL_PENDING`
- [ ] An optional assignee must resolve to an active user with the Cargo Specialist role, otherwise `ASSIGNEE_INVALID`
- [ ] A Supervisor may assign to any specialist; a specialist may assign only to themselves, otherwise `ASSIGNMENT_NOT_PERMITTED`
- [ ] When transitioning from `AWAITING_INFORMATION`, outstanding document requests are cancelled with the justification recorded as the cancellation reason
- [ ] Only a Supervisor may take this action on an `ESCALATED` case

**Priority:** P0 | **Feature Ref:** F9

---

### US-3.4: Place a Case on Hold with a Stated Reason
**As a** Marisol Reyes (Cargo Specialist), **I want to** park a case deliberately with a reason, **so that** it is visibly not being worked rather than silently ageing.

**Acceptance Criteria:**
- [ ] A hold reason is mandatory from the enumerated set (`AWAITING_EXTERNAL_INPUT`, `PENDING_POLICY_GUIDANCE`, `RESOURCE_CONSTRAINT`, `OTHER`)
- [ ] `hold_reason_detail` of 10–500 characters is required when the reason is `OTHER`
- [ ] The case moves to `ON_HOLD` and records who placed the hold and when
- [ ] Placing an already-held case on hold is rejected with `TRANSITION_REDUNDANT` rather than silently succeeding
- [ ] Outstanding document requests are retained as `OUTSTANDING` — a hold does not cancel a request
- [ ] Revalidation does not release a hold
- [ ] From `PENDING_APPROVAL` only a Supervisor may place the case on hold, and doing so withdraws the pending recommendation with a recorded withdrawal reason

**Priority:** P0 | **Feature Ref:** F9

---

### US-3.5: Escalate a Case and Transfer Authority Upward
**As a** Marisol Reyes (Cargo Specialist), **I want to** escalate a case to a supervisor with a reason, **so that** a decision beyond my authority is handed over explicitly rather than left to stall.

**Acceptance Criteria:**
- [ ] An escalation reason is mandatory from the enumerated set (`POLICY_AMBIGUITY`, `HIGH_VALUE`, `REPEAT_OFFENDER_PATTERN`, `CONFLICTING_EVIDENCE`, `OTHER`), with detail required for `OTHER`
- [ ] An optional escalation target must resolve to an active Supervisor, otherwise `ESCALATION_TARGET_INVALID`; when omitted the case is escalated to the supervisor pool
- [ ] The case moves to `ESCALATED` and records the escalating user, the target and the timestamp
- [ ] After escalation, every Cargo Specialist action on that case is rejected with `403 ESCALATED_REQUIRES_SUPERVISOR`
- [ ] Escalating an already-escalated case is rejected with `TRANSITION_REDUNDANT`
- [ ] Escalating from `PENDING_APPROVAL` is rejected — the case is already at supervisor authority
- [ ] Outstanding document requests are retained through escalation
- [ ] A notification addressed to the Supervisor role (or the specific target) names the escalating specialist, the reason and the open exceptions

**Priority:** P0 | **Feature Ref:** F9

---

### US-3.6: Have Invalid Transitions Rejected with a Clear Reason
**As a** Marisol Reyes (Cargo Specialist), **I want to** the server to refuse an action that is not valid from the current state and tell me why, **so that** I never create a meaningless entry in the record.

**Acceptance Criteria:**
- [ ] Any `(status, action, role)` triple absent from the transition table is rejected with `409 INVALID_TRANSITION` naming both the current status and the attempted action
- [ ] A redundant transition is rejected with `409 TRANSITION_REDUNDANT`, so the audit trail never contains a no-op decision
- [ ] A specialist acting on an escalated case receives `403 ESCALATED_REQUIRES_SUPERVISOR` — an authority error, not a state error
- [ ] Any action on a `CLEARED` case is rejected with `409 CASE_TERMINAL`
- [ ] A concurrent transition on the same case is rejected with `409 CASE_VERSION_CONFLICT` and the UI refetches rather than retrying silently
- [ ] Every rejected attempt writes an `ACCESS_DENIED` or `TRANSITION_REJECTED` audit entry with the acting user, attempted action, current status and reason
- [ ] Rejection leaves the operator's entered justification intact in the form

**Priority:** P0 | **Feature Ref:** F9, F12

---

### US-3.7: See Why an Action Is Unavailable to Me
**As a** Marisol Reyes (Cargo Specialist), **I want to** every action I cannot take to be visibly disabled with a stated reason, **so that** I learn the rule instead of hunting for a missing button.

**Acceptance Criteria:**
- [ ] An available-actions endpoint returns all five actions with `available: boolean` and, when false, a reason code
- [ ] Reason text is rendered from the fixed reason set, including "Your role (Cargo Specialist) cannot take this action", "This case has been escalated; only a Supervisor can act on it", "The case is already in this state", "A clearance recommendation is awaiting supervisor decision", "You submitted this recommendation and cannot decide on it", "This shipment has been cleared and can no longer be changed", "Release the case from hold before recommending clearance", and "There are no outstanding document requirements to request"
- [ ] The disabled list is never shortened — all five actions remain visible
- [ ] Every disabled control is keyboard-focusable so its reason is reachable without a mouse
- [ ] The reason shown by the UI is the reason the server would return for the same attempt

**Priority:** P0 | **Feature Ref:** F9, F19

---
