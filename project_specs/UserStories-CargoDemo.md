# User Stories
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related PRD** | PRD-CargoDemo.md |
| **Related FRD** | FRD-CargoDemo.md (chunks in `project_specs/FRD/`) |
| **Related Personas** | PERSONAS-CargoDemo.md |
| **Source of Truth** | `.planning/PROJECT.md` |

---

## Story Format

Each story follows: **As a [persona], I want to [action], so that [outcome].**

Acceptance criteria are listed beneath each story as testable checkboxes. Stories are grouped by epic, each epic is anchored to a PRD feature, and every story carries an explicit **Feature Ref** back to PRD §5.

## Personas Used

| Persona ID | Named persona | System role |
|---|---|---|
| PER-01 | **Marisol Reyes** | Cargo Specialist |
| PER-02 | **Dwayne Okafor** | Supervisor |
| PER-03 | **Priya Raghavan** | System Administrator |
| PER-04 | **Angela Pruitt** | CBP Evaluating Stakeholder *(observer — no system account)* |

Persona names are used verbatim from PERSONAS-CargoDemo.md, and the FRD's seed data uses the same identities: `usr-cs-001` is Marisol Reyes, `usr-sup-001` is Dwayne Okafor, `usr-adm-001` is Priya Raghavan (FRD F2 §Seeded users). Two additional seeded users — `usr-cs-002` Marcus Hale and `usr-sup-002` Ronald Pike — exist only to make hand-off and supervisor-authored-recommendation paths demonstrable and have no persona of their own.

## Index of Epics

| Epic | Name | Anchor feature | Features covered |
|---|---|---|---|
| Epic 0 | Platform & Data Foundation | F0 | F0, F1, F2, F3 |
| Epic 1 | Rules, Exception Detection & Revalidation | F4 | F4, F5, F6 |
| Epic 2 | AI Assistance — Explain and Recommend | F7 | F7, F8 |
| Epic 3 | Exception Case Workflow & The Five Actions | F9 | F9 |
| Epic 4 | Document Request & Simulated Upload | F10 | F10, F6 |
| Epic 5 | Specialist → Supervisor Approval Chain | F11 | F11 |
| Epic 6 | Decision & Audit Record | F12 | F12 |
| Epic 7 | Notification Generation | F13 | F13 |
| Epic 8 | Access Control & Rule Administration | F14 | F14, F15 |
| Epic 9 | The Four Primary Screens & Application Shell | F17 | F16, F17, F18, F19, F20 |
| Epic 10 | Quality, Tests & Demo Readiness | F21 | F21, F22 |
| Epic 11 | The 10-Step Demo Walkthrough (End-to-End Trace) | F17 | F2, F5–F14, F17–F22 |
| Epic 12 | Governance Guardrails (Negative & Constraint Stories) | F11 | F9, F11, F12, F14 |

**Coverage:** all 23 PRD features (F0–F22) have at least one story. Epic 11 traces the PRD §3.2 walkthrough step by step. Epic 12 states the things the system must *refuse* to do.

---

## Epic 0: Platform & Data Foundation (F0)

The canonical domain model, the simulated ingestion path, the deterministic seed dataset, and the HTTP contract that the four screens are built on. Nothing in the walkthrough is demonstrable without this epic.

### US-0.1: Persist the Full Cargo Exception Domain
**As a** Priya Raghavan (System Administrator), **I want to** have every cargo entry, document, rule, exception, evidence row, case state, decision, approval, notification and audit record persisted in one migrated schema, **so that** the application starts clean in a fresh sandbox and every screen reads from the same source of truth.

**Acceptance Criteria:**
- [ ] A cargo entry row stores shipment ID, importer, carrier, product description, HTS code, country of origin, manufacturer name, manufacturer address, shipment value and priority
- [ ] Document rows store type, required/received state, filename, provenance (`SEEDED` / `INGESTED` / `SIMULATED_UPLOAD`) and received timestamp
- [ ] Exception rows link a shipment to the rule that fired, the exception type, severity and captured evidence rows
- [ ] Case rows carry exactly one of the seven canonical statuses (`NEW`, `IN_REVIEW`, `AWAITING_INFORMATION`, `ON_HOLD`, `ESCALATED`, `PENDING_APPROVAL`, `CLEARED`) at all times — never null or intermediate
- [ ] Decision, recommendation, approval, notification and audit-record rows all carry actor attribution (user ID, name, role) and a server-generated timestamp
- [ ] Running migrations against an empty database produces the full schema with no manual step
- [ ] Re-running migrations is idempotent and produces an identical schema fingerprint

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Ingest Simulated Cargo Entries from a JSON File
**As a** Priya Raghavan (System Administrator), **I want to** load cargo entries from a versioned cargo-entry JSON file at a known path, **so that** the demo has realistic data without any ACE integration.

**Acceptance Criteria:**
- [ ] Ingestion reads the cargo-entry JSON file from the configured path and creates or updates one cargo entry per record
- [ ] Ingestion is idempotent on shipment ID — re-ingesting the same entry updates it and never creates a duplicate
- [ ] Payloads are validated against the cargo-entry schema before persistence
- [ ] A malformed or incomplete entry is reported with its index and the failing field, and the remaining entries in the batch still ingest
- [ ] Every successfully ingested entry automatically triggers rule validation (F4)
- [ ] An `ENTRY_INGESTED` (or `ENTRY_REINGESTED`) audit entry is written for each entry with `actor_kind = SYSTEM`
- [ ] No ACE endpoint, credential or client library exists anywhere in the codebase

**Priority:** P0 | **Feature Ref:** F1

---

### US-0.3: Post Cargo Entries to a Local Ingestion Endpoint
**As a** Priya Raghavan (System Administrator), **I want to** post cargo entries to a lightweight local API endpoint using the same schema as the file, **so that** I can refresh or add entries mid-session without restarting the application.

**Acceptance Criteria:**
- [ ] The ingestion endpoint accepts a single entry or a batch using the identical cargo-entry schema as the file loader
- [ ] The endpoint returns a per-entry result of accepted / updated / rejected with the rejection reason
- [ ] Rejections use the consistent error contract and do not abort the accepted entries in the batch
- [ ] Ingestion via the endpoint triggers the same validation and audit behaviour as file ingestion
- [ ] The endpoint is restricted to the System Administrator role and rejects Cargo Specialist and Supervisor with `FORBIDDEN_ROLE`
- [ ] Re-ingesting an entry whose case is `CLEARED` is rejected with `CASE_TERMINAL` rather than mutating a closed case

**Priority:** P0 | **Feature Ref:** F1, F14

---

### US-0.4: Start with a Seeded, Deterministic Demo Dataset
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** see the application already populated with realistic flagged shipments when the walkthrough begins, **so that** no step depends on someone typing data in front of me.

**Acceptance Criteria:**
- [ ] The database seeds 10–15 synthetic shipments on first start and on explicit reset
- [ ] All three exception types (missing required document, invalid/incomplete HTS code, conflicting country-of-origin) are represented in the seed data
- [ ] At least one shipment carries multiple simultaneous exceptions
- [ ] All seven queue statuses are represented, including at least one already-`CLEARED` shipment with a complete historical audit record of at least 8 entries and a named approving official
- [ ] At least one clean shipment exists with zero exceptions and does not appear on the default queue
- [ ] The canonical scenario is present verbatim: solar panels, country of origin Malaysia, manufacturer address in China, incomplete HTS code, $85,000 invoice value, required certificate missing
- [ ] Synthetic document fixtures exist for both pre-attached documents and the step-6 simulated upload
- [ ] The seed script is safe to re-run and produces identical IDs, identical timestamps and identical row counts every time
- [ ] Seed data contains no real importer/carrier names and no PII — verified by an automated deny-list scan over seed data, fixtures and prompts

**Priority:** P0 | **Feature Ref:** F2

---

### US-0.5: Consume One Consistent Backend API from the UI
**As a** Marisol Reyes (Cargo Specialist), **I want to** every screen I use to be backed by a predictable HTTP contract with server-side authorisation, **so that** the interface never shows me an action the server would refuse and never hides one it would allow.

**Acceptance Criteria:**
- [ ] Read endpoints exist for the exception queue (filter and sort by status, exception type and priority) and for full shipment detail
- [ ] Action endpoints exist for the five user actions, document request, document upload, revalidation and approval decisions
- [ ] Endpoints exist to retrieve the AI summary and the AI recommended resolution
- [ ] Rule CRUD endpoints exist and are restricted to the System Administrator role
- [ ] Audit and notification read endpoints exist and are readable by all three roles (cross-case audit search is restricted to Supervisor and Administrator)
- [ ] Every mutating endpoint enforces role authorisation server-side, independently of any UI state
- [ ] Every error response uses the consistent error contract with an error code, human-readable message and `request_id`
- [ ] Request bodies are schema-validated and unknown properties are rejected rather than ignored
- [ ] Mutating action and approval endpoints honour `Idempotency-Key` replay by returning the original result without producing a second write

**Priority:** P0 | **Feature Ref:** F3, F14

---

## Epic 1: Rules, Exception Detection & Revalidation (F4)

Validation as configuration, exceptions as reviewable work with field-level evidence, and revalidation that reconciles before against after without losing history.

### US-1.1: Detect a Missing Required Document
**As a** Marisol Reyes (Cargo Specialist), **I want to** shipments to be flagged when a document required by policy has not been received, **so that** I am told what is absent instead of having to notice the absence myself.

**Acceptance Criteria:**
- [ ] The missing-required-document rule reads a parameterised list of required document types from persisted configuration
- [ ] The rule evaluates the required list against the documents actually received on the shipment
- [ ] The rule can be conditioned on shipment attributes such as a value threshold or commodity, and does not fire when the condition does not apply
- [ ] A firing rule produces an exception whose `missing_information` names each specific document type still outstanding
- [ ] The canonical solar-panel shipment ($85,000, certificate missing) fires this rule on first ingestion
- [ ] Changing the required-document list in configuration changes the outcome with no code change and no redeploy

**Priority:** P0 | **Feature Ref:** F4, F5

---

### US-1.2: Detect an Invalid or Incomplete HTS Code
**As a** Marisol Reyes (Cargo Specialist), **I want to** shipments with a malformed or incomplete HTS classification to be flagged with the expected format stated, **so that** I can see exactly how the declared code falls short.

**Acceptance Criteria:**
- [ ] The HTS rule validates format, length and completeness against a configurable expected digit count
- [ ] The rule performs a known-code check against the configured code list
- [ ] The exception evidence states both the observed value (e.g. the declared code and its normalised digit count) and the expected value (the configured digit count/format)
- [ ] The canonical solar-panel shipment's incomplete HTS code fires this rule on first ingestion
- [ ] A shipment with a complete, well-formed, known HTS code does not fire the rule
- [ ] Changing the expected digit count in configuration changes which shipments fire, with no code change

**Priority:** P0 | **Feature Ref:** F4, F5

---

### US-1.3: Detect a Conflicting Country of Origin
**As a** Marisol Reyes (Cargo Specialist), **I want to** a declared country of origin that conflicts with the manufacturer's address country to be flagged, **so that** origin inconsistency is surfaced as a finding rather than something I have to spot by reading two fields.

**Acceptance Criteria:**
- [ ] The origin rule compares the declared `country_of_origin` against `manufacturer.address.country` and any other configured origin-bearing fields
- [ ] The origin-comparison field set is configurable
- [ ] A mismatch produces an exception whose evidence names both field paths and both values, e.g. `country_of_origin = "Malaysia"` versus `manufacturer.address.country = "China"`
- [ ] Matching origin values do not fire the rule
- [ ] The canonical solar-panel shipment (Malaysia declared, China manufacturer address) fires this rule on first ingestion

**Priority:** P0 | **Feature Ref:** F4, F5

---

### US-1.4: Trust That Validation Is Deterministic and Never Suppressed
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the same shipment plus the same rule set to always produce the same exceptions, with every firing rule retained, **so that** what I saw in one walkthrough is what the next walkthrough will show.

**Acceptance Criteria:**
- [ ] Evaluating the same cargo entry twice against the same rule set produces an identical exception set in an identical order
- [ ] When multiple rules fire on one shipment, all of them produce exceptions — none is suppressed, deduplicated or collapsed into a headline
- [ ] The canonical solar-panel shipment produces exactly three exceptions: origin conflict, incomplete HTS, missing document
- [ ] Each evaluation records a rule-set fingerprint so the rule configuration in force at that moment is recoverable
- [ ] Only the three supported exception types exist; there is no fourth type and no extension point that introduces one
- [ ] Single-shipment rule evaluation completes in under 500 ms with the seeded dataset

**Priority:** P0 | **Feature Ref:** F4

---

### US-1.5: See Field-Level Evidence for Every Exception
**As a** Marisol Reyes (Cargo Specialist), **I want to** every exception to carry the concrete field references and values that triggered it, **so that** I can verify the finding myself instead of taking a narrative on faith.

**Acceptance Criteria:**
- [ ] One exception record is created per firing rule, linked to both the shipment and the rule definition
- [ ] Evidence is stored as structured field references and values (field path, raw value, normalised value, expected, observed, assertion) — not as prose
- [ ] Exceptions that depend on absent evidence record what information is missing, listing the specific document types or fields
- [ ] Each exception carries its severity and its triggering rule's policy/authority reference
- [ ] Shipment priority is derived from rule severity and shipment attributes, and the derivation basis is retrievable for display
- [ ] Every flagged shipment is placed on the exception queue; shipments with zero exceptions stay off it
- [ ] Evaluation history is preserved so both pre- and post-revalidation exception sets remain inspectable

**Priority:** P0 | **Feature Ref:** F5

---

### US-1.6: Revalidate a Shipment After Its Evidence Changes
**As a** Marisol Reyes (Cargo Specialist), **I want to** re-run the rules against a shipment and see exactly which exceptions cleared and which remain, **so that** I can confirm the effect of new evidence rather than guessing at it.

**Acceptance Criteria:**
- [ ] Revalidation can be triggered manually from the Shipment Review screen by a Cargo Specialist or Supervisor
- [ ] Revalidation is triggered automatically on evidence-changing events: simulated document upload, entry re-ingestion, and an administrator rule change with `revalidate_affected = true`
- [ ] Revalidation always creates a new evaluation version, even when nothing changes, and records the no-op as auditable information
- [ ] Reconciliation classifies every rule into exactly one of `resolved`, `retained`, `new` — never two
- [ ] Exceptions that no longer fire are marked `RESOLVED_BY_REVALIDATION` with a resolution reason, and are never deleted
- [ ] A resolved exception's original evidence rows are left unmodified
- [ ] Retained exceptions inherit `opened_at` and `first_detected_evaluation_id`, so age survives revalidation
- [ ] A partially satisfied missing-document exception is retained (not resolved) with a shortened `missing_information` list
- [ ] Newly firing exceptions are surfaced with the current evaluation as their first detection
- [ ] Queue status and priority are recomputed against the post-revalidation open set
- [ ] The revalidation round-trip completes in under 2 seconds with the seeded dataset, excluding AI regeneration

**Priority:** P0 | **Feature Ref:** F6

---

### US-1.7: Have Revalidation Recorded and the AI Refreshed
**As a** Dwayne Okafor (Supervisor), **I want to** each revalidation to write a before/after audit entry and refresh the AI outputs, **so that** I can see what the evidence looked like before and after, and never read a stale summary.

**Acceptance Criteria:**
- [ ] A `REVALIDATED` audit entry records the complete before and after exception sets, the per-rule reconciliation classification, prior/new priority with basis, prior/new status, the trigger, the actor and the rule-set fingerprint
- [ ] A notification is generated describing the change in plain language, e.g. "1 exception resolved, 2 remain open"
- [ ] The AI summary and recommendation are invalidated and regenerated against the new evaluation version, resolving via fallback if the provider is unavailable
- [ ] Revalidation never transitions a case to `CLEARED` or `PENDING_APPROVAL` under any circumstances
- [ ] Revalidating a `CLEARED` case is rejected with `CASE_TERMINAL`
- [ ] Revalidation leaves `recommendations` and `approvals` rows untouched; a pending recommendation stays pending and the evidence change is recorded for the supervisor's warning
- [ ] `ON_HOLD` and `ESCALATED` cases are not released by revalidation
- [ ] Total `exceptions` and `evidence` row counts are monotonically non-decreasing across a revalidation

**Priority:** P0 | **Feature Ref:** F6, F12, F13

---

## Epic 2: AI Assistance — Explain and Recommend (F7)

AI that reduces reconstruction time, grounded in captured evidence, always labelled and attributable, and structurally incapable of taking an action.

### US-2.1: Read a Plain-Language Summary of Why a Shipment Was Flagged
**As a** Marisol Reyes (Cargo Specialist), **I want to** read a plain-language explanation of what the shipment is and why it was flagged, **so that** I understand the case in seconds instead of reconstructing it from raw entry data.

**Acceptance Criteria:**
- [ ] The summary describes the shipment (commodity, importer, carrier, value, origin) and each detected exception in non-technical language
- [ ] Every claim in the summary references the specific fields or documents involved, drawn from the captured evidence
- [ ] The summary is generated at request time from current shipment state; no in-app model training exists
- [ ] The summary is cached against the shipment's evaluation version and regenerated on revalidation
- [ ] A first-time specialist can identify why the shipment was flagged in under 30 seconds without leaving the Shipment Review screen
- [ ] The summary panel never blocks the screen: the shipment, documents and validation panels render independently of it

**Priority:** P0 | **Feature Ref:** F7, F18

---

### US-2.2: See Every AI Output Labelled and Attributed
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** every machine-generated statement to be visibly labelled as AI-generated and to carry its provenance, **so that** I can always tell what a model said from what an official decided.

**Acceptance Criteria:**
- [ ] Every AI output displays its provider/model identifier, generation timestamp and generation mode
- [ ] Every AI output displays the rule and evidence inputs it was grounded in
- [ ] AI content is rendered inside an explicit AI-content label wherever it appears, and never inside a human-decision container
- [ ] AI-generated content is distinguishable from human-authored content on the Shipment Review, Recommended Resolution and Decision & Audit Record screens
- [ ] The distinction is conveyed by text label and icon, not by colour alone
- [ ] AI output is never presented as a finding — the validation results panel is populated from the exception API, not from the AI response

**Priority:** P0 | **Feature Ref:** F7, F8, F18, F19, F20

---

### US-2.3: Continue the Walkthrough When the AI Provider Is Unavailable
**As a** Priya Raghavan (System Administrator), **I want to** a deterministic offline fallback to serve the summary and recommendation when the provider is unavailable or slow, **so that** the demo never depends on network availability.

**Acceptance Criteria:**
- [ ] AI summary and recommendation return within 5 seconds at p95
- [ ] If the provider has not responded within 10 seconds, the deterministic fallback is served automatically
- [ ] The fallback summary and fallback recommendation are clearly labelled as offline fallback output
- [ ] The fallback recommendation is derived deterministically from rule severity and produces the same recommended action as the online path
- [ ] A graceful-degradation banner is visible in the application shell while fallback mode is active
- [ ] The pre-demo health check reports AI-assist availability including fallback status
- [ ] The full 10-step walkthrough completes successfully with the AI provider disabled

**Priority:** P0 | **Feature Ref:** F7, F8, F22

---

### US-2.4: See a Recommended Resolution with an Explicit Confidence Level
**As a** Marisol Reyes (Cargo Specialist), **I want to** see which of the five actions the AI suggests, with its confidence level, basis and rationale, **so that** I have advice I can weigh rather than an instruction I must follow.

**Acceptance Criteria:**
- [ ] The recommendation names exactly one of the five user actions as the suggested next step
- [ ] The recommendation is presented alongside the exception detected, the triggering rule/policy with its reference, the supporting evidence and the missing information
- [ ] A confidence level (High / Medium / Low) is always displayed together with a stated basis; a confidence badge without a basis is a defect
- [ ] The rationale is in plain language and traceable to specific evidence
- [ ] The recommendation is rendered as a statement (e.g. "AI suggests: Escalate to supervisor"), never as a pre-selected control
- [ ] The recommendation is inert: no action executes until a human selects one and submits it
- [ ] The recommendation and its confidence are snapshotted onto the case so the audit record shows what the human was advised

**Priority:** P0 | **Feature Ref:** F8, F19

---

### US-2.5: Have Agreement or Divergence with the AI Recorded
**As a** Dwayne Okafor (Supervisor), **I want to** the record to state whether the human decision agreed with or diverged from the AI recommendation, **so that** I can tell whether the specialist exercised independent judgement.

**Acceptance Criteria:**
- [ ] Every submitted action snapshots the current AI recommendation and computes a concurrence verdict
- [ ] When no recommendation had been generated, the snapshot records `{ present: false, reason: "NOT_GENERATED" }` rather than being left null
- [ ] The concurrence verdict is displayed on the post-submission confirmation
- [ ] The concurrence verdict is displayed on the audit timeline entry as "the decision agreed with / diverged from the AI recommendation"
- [ ] A justification that exactly matches the AI rationale string is rejected with `JUSTIFICATION_NOT_AUTHORED`

**Priority:** P0 | **Feature Ref:** F8, F12

---

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

## Epic 4: Document Request & Simulated Upload (F10)

The request → upload → revalidate loop, tracked with full attribution and visible provenance, restricted to synthetic files.

### US-4.1: Track the Lifecycle of a Document Request
**As a** Marisol Reyes (Cargo Specialist), **I want to** every document request to be tracked from requested to fulfilled or cancelled with who did what and when, **so that** I never lose track of what is outstanding on a shipment.

**Acceptance Criteria:**
- [ ] A request row carries document type, status, requester identity and timestamp, linked exception, linked rule and the descriptive addressee label
- [ ] Statuses are `OUTSTANDING`, `FULFILLED` and `CANCELLED`; terminal states are never reopened and a renewed need creates a new request
- [ ] Fulfilment records the fulfilling user, the fulfilment timestamp and the fulfilling document ID
- [ ] Cancellation is permitted only from `OUTSTANDING`, requires a reason of 10–500 characters, and does not by itself change the case status
- [ ] The Shipment Review screen lists request history with lifecycle state and full attribution
- [ ] A request whose document type becomes satisfied by revalidation is marked `FULFILLED` automatically

**Priority:** P0 | **Feature Ref:** F10

---

### US-4.2: Upload a Simulated Document Against an Open Request
**As a** Marisol Reyes (Cargo Specialist), **I want to** attach a synthetic document to the open request from within the Shipment Review screen, **so that** the requested evidence reaches the shipment record without any real importer correspondence.

**Acceptance Criteria:**
- [ ] The upload control appears only on rows whose request is `OUTSTANDING`, and only for Cargo Specialist and Supervisor
- [ ] The UI offers the seeded upload-ready fixtures for that shipment, so nothing needs sourcing from the presenter's machine
- [ ] An arbitrary file may still be chosen and is subject to identical validation
- [ ] The stored document's type is copied from the request row and is never read from client input
- [ ] A `documents` row is created with `status = RECEIVED`, `provenance = SIMULATED_UPLOAD`, filename, content hash, size, MIME type, uploading user and received timestamp
- [ ] The request transitions to `FULFILLED`
- [ ] Uploading to a `FULFILLED` or `CANCELLED` request is rejected with `REQUEST_NOT_OUTSTANDING`
- [ ] Uploading against a `CLEARED` case is rejected with `CASE_TERMINAL`
- [ ] A System Administrator attempting an upload is rejected with `FORBIDDEN_ROLE`
- [ ] Re-uploading identical content for the same shipment and type is accepted but flagged as a duplicate rather than silently overwriting

**Priority:** P0 | **Feature Ref:** F10, F14

---

### US-4.3: Be Prevented from Uploading Anything Other Than a Synthetic Document
**As a** Priya Raghavan (System Administrator), **I want to** uploads restricted to synthetic, safe content by type, size and inspection, **so that** the demo stays publicly presentable and no real or executable content can enter it.

**Acceptance Criteria:**
- [ ] File size must be between 1 byte and 5 MB; empty files reject with `FILE_EMPTY` and oversize with `413 PAYLOAD_TOO_LARGE`
- [ ] MIME type must be in the allow-list `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`; anything else rejects with `415 UNSUPPORTED_MEDIA_TYPE`
- [ ] The file extension must match the declared MIME type, otherwise `FILE_EXTENSION_MISMATCH`
- [ ] Magic bytes must be consistent with the declared type, otherwise `FILE_CONTENT_MISMATCH` — an archive or executable cannot be smuggled in under a permitted extension
- [ ] Text and CSV content is screened against the PII deny-list (email, US phone, SSN-shaped digits) and rejected with `PII_SUSPECTED` on a match
- [ ] Filenames are sanitised: path separators, `..`, control characters and leading dots are stripped
- [ ] A computed storage path that escapes the configured storage directory aborts with `STORAGE_PATH_INVALID`
- [ ] Every rejection happens before anything is written to disk

**Priority:** P0 | **Feature Ref:** F10

---

### US-4.4: Have an Upload Trigger Revalidation Atomically
**As a** Marisol Reyes (Cargo Specialist), **I want to** an upload to immediately re-run the rules and show me what changed, **so that** the exception set can never be stale after evidence arrives.

**Acceptance Criteria:**
- [ ] A successful upload triggers exactly one revalidation, in the same transaction as the attachment
- [ ] The upload response embeds the full revalidation result, so the UI renders "what changed" without a second round trip
- [ ] A `DOCUMENT_UPLOADED` audit entry is written, distinct from the `REVALIDATED` entry, plus a notification
- [ ] If revalidation fails, the document row, the request status change and the stored file are all rolled back together — storage never diverges from the database
- [ ] `Idempotency-Key` replay returns the original result without creating a second document, revalidation or audit entry
- [ ] Two concurrent uploads on the same case serialise on the case row, and the second produces its own subsequent evaluation version
- [ ] When all outstanding requests are fulfilled, the case moves from `AWAITING_INFORMATION` to `IN_REVIEW`; when others remain outstanding it stays `AWAITING_INFORMATION`
- [ ] An upload on an `ON_HOLD`, `ESCALATED` or `PENDING_APPROVAL` case leaves the status unchanged but still runs and records the revalidation

**Priority:** P0 | **Feature Ref:** F10, F6

---

### US-4.5: See Where Every Document Came From
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** each document to declare whether it was seeded, ingested or uploaded during this session, **so that** I can tell live activity from pre-existing data.

**Acceptance Criteria:**
- [ ] Every document row displays provenance as `Seeded`, `Ingested` or `Uploaded this session`
- [ ] Documents uploaded during the session are visually marked as such on the Shipment Review screen
- [ ] The documents panel shows missing documents explicitly as an absence, not by omission
- [ ] Each row shows type, state (`Received` / `Missing` / `Requested`), filename with download link, received timestamp, and for requested items the requester and request time
- [ ] There is no free-floating "attach a document" affordance — every document has either a seeded provenance or a requested one

**Priority:** P0 | **Feature Ref:** F10, F18

---

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

## Epic 6: Decision & Audit Record (F12)

Eight required fields on every decision, snapshots rather than references, append-only storage, and completeness enforced at write time.

### US-6.1: Have Every Decision Recorded with All Eight Required Fields
**As a** Dwayne Okafor (Supervisor), **I want to** every decision to record the exception, the evidence reviewed, the AI recommendation, the human decision, the justification, the timestamp, the approving official and the generated notification, **so that** a decision I approved can be defended months later.

**Acceptance Criteria:**
- [ ] Field 1 — **Exception**: a snapshot of every exception in scope with type, sub-reason, severity, status, rule ID, rule name, rule version, policy reference and opened-at; never null (an empty case records `[]` with a zero count)
- [ ] Field 2 — **Evidence reviewed**: a snapshot of every evidence row on the in-scope exceptions plus the documents present and documents missing at that instant
- [ ] Field 3 — **AI recommendation**: recommended action, confidence level and basis, rationale, provenance and concurrence — or the explicit `{ present: false, reason: "NOT_GENERATED" }`; never null
- [ ] Field 4 — **User decision**: the action or disposition code plus its action-specific parameters
- [ ] Field 5 — **Decision justification**: the human's free text stored verbatim, never generated, prefilled or defaulted
- [ ] Field 6 — **Timestamp**: server-generated, never client-supplied, and monotonic per case
- [ ] Field 7 — **Approving official**: user ID, name and role, non-null on every approval decision and on any entry transitioning the case to `CLEARED`; on other entries present as an explicit null with an "not applicable" marker
- [ ] Field 8 — **Generated notification**: the notification's ID and a snapshot of its recipient, subject, body, generation timestamp and `transmitted: false`
- [ ] Every entry additionally carries case, shipment, sequence number, entry class, event type, actor kind, actor name and role, status before and after, evaluation version and rule-set fingerprint

**Priority:** P0 | **Feature Ref:** F12

---

### US-6.2: Be Blocked from Finalising an Incomplete Decision
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** a clearance to be impossible when any required audit field would be missing, **so that** an undefendable decision cannot exist in the system.

**Acceptance Criteria:**
- [ ] Completeness rules are applied per entry class before commit, inside the caller's transaction
- [ ] An approval-decision entry requires all eight fields non-null, including a named approving official
- [ ] A human-action entry requires fields 1, 2, 3, 4, 5, 6 and 8
- [ ] A missing required field aborts the enclosing transaction with `AUDIT_INCOMPLETE`, naming the field
- [ ] When an approval is blocked by the completeness gate, the case does **not** move to `CLEARED`
- [ ] The Recommended Resolution screen surfaces the block prominently as "Clearance blocked: the audit record would be incomplete ({field})"
- [ ] There is no path that writes an audit entry in a separate transaction from the state change it records
- [ ] An automated test enumerates every approval entry in seeded and test-generated data and asserts all eight fields are present

**Priority:** P0 | **Feature Ref:** F12, F21

---

### US-6.3: Rely on the Record Being Append-Only
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** audit entries to be impossible to edit or delete through the application, **so that** the record cannot be quietly improved after the fact.

**Acceptance Criteria:**
- [ ] No `PATCH`, `PUT` or `DELETE` route exists for audit entries or notifications — the routes are not defined at all
- [ ] The audit repository exposes only append and read methods; no update or delete method exists to call
- [ ] Database triggers on update and delete raise `AUDIT_IMMUTABLE`
- [ ] The single permitted update is a null-to-non-null write of the notification linkage, within the inserting transaction, once; every other update including a second attempt is rejected
- [ ] Entries form a hash chain in which each entry hashes its own canonical content plus its predecessor's hash
- [ ] A verification endpoint recomputes the chain and reports validity, entries checked and the first invalid sequence number
- [ ] A test that tampers with a row via direct SQL causes verification to fail
- [ ] Sequence numbers are gap-free per case; a gap is reported as a verification failure
- [ ] The only removal path is the administrator-gated full environment reset, which truncates and reseeds everything and writes a `DEMO_RESET` entry as the first row of the new chain
- [ ] Selective deletion of a single entry or a single case's history is not expressible through any surface

**Priority:** P0 | **Feature Ref:** F12, F22

---

### US-6.4: Read the Complete Case Timeline in Chronological Order
**As a** Dwayne Okafor (Supervisor), **I want to** replay the whole history of a case from ingestion to disposition in one view, **so that** I can reconstruct what happened without assembling it by hand.

**Acceptance Criteria:**
- [ ] The timeline spans ingestion, flagging, AI summary and recommendation generation, document request, upload, revalidation, recommendation, approval and every generated notification
- [ ] Entries are ordered by ascending sequence number and the ordering is identical on every load
- [ ] Each entry is returned with a presentation block carrying headline, actor label, authorship (`HUMAN` / `AI` / `SYSTEM`), status change, decision label, justification, exception summary, evidence rows, AI block, approving-official label and notification block
- [ ] Authorship drives visual separation: AI content is never rendered inside a human-decision container
- [ ] The response includes a completeness block reporting total entries, decision entries, decision entries complete and any missing fields
- [ ] Justifications are returned and rendered verbatim and in full, never truncated or paraphrased
- [ ] Access denials and rejected transitions appear in the timeline as their own entry class
- [ ] Audit reads are permitted to all three roles; there is no client-initiated audit write endpoint

**Priority:** P0 | **Feature Ref:** F12, F20

---

### US-6.5: Export a Case Record for Offline Review
**As a** Dwayne Okafor (Supervisor), **I want to** download or print the full audit record for a case in one action, **so that** I can defend a decision in a setting where I do not have the application in front of me.

**Acceptance Criteria:**
- [ ] A JSON export returns every field of every entry plus the hash chain and a verification block
- [ ] The export file is named for the shipment (e.g. `audit-SHP-2026-0007.json`)
- [ ] A printable export returns server-rendered HTML with the same content, suitable for the browser print dialog
- [ ] No PDF toolchain is required or used
- [ ] An export that omits the AI recommendation or the evidence snapshot is a defect
- [ ] An unknown export format is rejected with `INVALID_QUERY_PARAM`
- [ ] An export failure surfaces as a retryable toast and leaves the timeline unaffected

**Priority:** P0 | **Feature Ref:** F12, F20

---

### US-6.6: Read the Evidence as It Was at Decision Time
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** each entry to show the evidence and AI advice as they stood when the decision was made, **so that** later revalidations cannot rewrite what the decider was looking at.

**Acceptance Criteria:**
- [ ] Evidence and AI recommendation are stored as JSON copies on the audit entry, not as foreign keys
- [ ] Revalidating a case after a decision leaves the earlier entry's evidence snapshot byte-identical
- [ ] An implementation that stores only references fails the corresponding automated test
- [ ] The entry records the evaluation version and rule-set fingerprint in force at that moment
- [ ] No entry may carry an AI actor together with a non-null human decision

**Priority:** P0 | **Feature Ref:** F12, F21

---

## Epic 7: Notification Generation (F13)

Notifications recorded and surfaced in-app on every decision and state change — and visibly never transmitted.

### US-7.1: Have a Notification Generated on Every Decision and State Change
**As a** Dwayne Okafor (Supervisor), **I want to** a notification to be generated and recorded for every case state change and every decision, **so that** a recommendation can never sit unnoticed and every decision has a communication record attached to it.

**Acceptance Criteria:**
- [ ] A notification is generated on document request, document upload, revalidation, recommendation, approval, rejection, return-for-information, hold and escalation
- [ ] Each notification records recipient role, optional recipient user, subject, plain-language body, related shipment and case, and a generation timestamp
- [ ] Each notification is persisted and linked to the audit entry that produced it, in the same transaction
- [ ] The audit entry's generated-notification field is populated from that link
- [ ] Exactly one notification is produced per case action — never zero, never two
- [ ] A state change without its notification is structurally impossible because both are written in one transaction

**Priority:** P1 | **Feature Ref:** F13, F12

---

### US-7.2: See Notifications In-App and Know They Were Never Sent
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** notifications to be visible in the application and explicitly labelled as generated rather than transmitted, **so that** I am never misled into thinking real correspondence left the system.

**Acceptance Criteria:**
- [ ] A notification indicator in the application shell gives access to an in-app notification list
- [ ] A per-case notification list is available and each notification carries a read state
- [ ] Every notification displays the fixed label "Generated, not transmitted"
- [ ] Notifications are shown on the Decision & Audit Record screen alongside the decisions that produced them
- [ ] Every notification record carries `transmitted: false`
- [ ] No email, SMS or other outbound transport client exists anywhere in the codebase, and no network egress occurs on notification generation

**Priority:** P1 | **Feature Ref:** F13, F16, F20

---

## Epic 8: Access Control & Rule Administration (F14)

Three roles, a simulated login that still produces a named acting user, server-side enforcement everywhere, and rules that the policy owner can change without a developer.

### US-8.1: Enter the Application as a Named Acting User
**As a** Priya Raghavan (System Administrator), **I want to** a simulated login and role selector that establishes a named acting user, **so that** every action is attributable even though production authentication is out of scope.

**Acceptance Criteria:**
- [ ] Exactly three roles exist: Cargo Specialist, Supervisor, System Administrator
- [ ] The role selector establishes a named user and role for the session, drawn from seeded users
- [ ] The current user name and role are always visible in the application shell
- [ ] The acting user's name and role are stamped on every audit entry
- [ ] The login surface is visibly labelled as simulated, and a demo-mode indicator is present
- [ ] No PIV/CAC, SSO or external identity provider integration exists
- [ ] Seed data contains at least two Supervisors, so the supervisor-recommends path is demonstrable rather than deadlocked
- [ ] An expired or invalid session gates the UI behind the role selector and returns `SESSION_INVALID` from the API

**Priority:** P0 | **Feature Ref:** F14

---

### US-8.2: Work Within My Role as a Cargo Specialist
**As a** Marisol Reyes (Cargo Specialist), **I want to** be able to do everything my role permits and nothing it does not, **so that** the boundary of my authority is real rather than procedural.

**Acceptance Criteria:**
- [ ] A Cargo Specialist can work the queue, review shipments, request documents, upload simulated documents, revalidate, take the five actions and recommend clearance
- [ ] A Cargo Specialist cannot approve a clearance: the approval endpoint returns `403 FORBIDDEN_ROLE`
- [ ] A Cargo Specialist cannot create, edit, enable or disable a rule: the rule endpoints return `403 FORBIDDEN_ROLE`
- [ ] A Cargo Specialist cannot reset the environment or reseed data
- [ ] Administrator-only surfaces are hidden from the specialist's navigation
- [ ] Cross-case audit search is not offered to a specialist and is denied by the server
- [ ] Every denial writes an `ACCESS_DENIED` audit entry naming the user, the role, the attempted operation and the reason

**Priority:** P0 | **Feature Ref:** F14

---

### US-8.3: Work Within My Role as a Supervisor
**As a** Dwayne Okafor (Supervisor), **I want to** everything a specialist can do plus approval authority and full queue visibility, **so that** I can oversee the team and adjudicate their recommendations.

**Acceptance Criteria:**
- [ ] A Supervisor can take all five user actions and can approve, reject or return a pending recommendation
- [ ] A Supervisor can view all cases regardless of assignment, and can filter the queue across the whole team
- [ ] A Supervisor can act on an `ESCALATED` case, which specialists cannot
- [ ] A Supervisor cannot create, edit, enable or disable a rule: the rule endpoints return `403 FORBIDDEN_ROLE`
- [ ] A Supervisor cannot reset the environment or reseed data
- [ ] A Supervisor can read cross-case audit history filtered by actor, event type and date range

**Priority:** P0 | **Feature Ref:** F14

---

### US-8.4: Have Authorisation Enforced Server-Side on Every Mutating Operation
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** role checks to be enforced by the server and not merely by hidden buttons, **so that** the governance claim survives someone calling the API directly.

**Acceptance Criteria:**
- [ ] Every mutating endpoint authorises the acting role server-side, independently of any client state
- [ ] Hiding or disabling a control in the UI is never the only enforcement for any operation
- [ ] Unauthorised attempts are rejected with `403 FORBIDDEN_ROLE` and logged as an audit entry
- [ ] A System Administrator attempting any workflow action, approval, upload or revalidation (other than via the rule-change path) is rejected with `FORBIDDEN_ROLE`
- [ ] An automated test exercises each of the three roles against each protected operation and asserts the expected allow/deny outcome
- [ ] 100% of protected operations reject unauthorised roles server-side, verified by test

**Priority:** P0 | **Feature Ref:** F14, F21

---

### US-8.5: Manage Business Rules as Configuration
**As a** Priya Raghavan (System Administrator), **I want to** list, create, edit, enable and disable rules and edit their parameters through the application, **so that** I can change what the system flags with no code change and no redeploy.

**Acceptance Criteria:**
- [ ] The rule list shows every rule with its exception type, severity, enabled state and policy reference
- [ ] Rules can be created, edited, enabled and disabled within the three supported exception types only; a fourth type cannot be created
- [ ] Editable parameters include required document types, HTS expected digit count and format, origin-comparison fields, value thresholds, severity and priority mapping
- [ ] Rule definitions are validated on save and malformed configuration is rejected with a clear message naming the failing field, and never reaches validation
- [ ] Changing a rule parameter changes validation results with zero code changes and zero redeploys
- [ ] Rule CRUD is restricted to the System Administrator role and denied to Cargo Specialist and Supervisor server-side
- [ ] A System Administrator cannot adjudicate or approve a shipment; such attempts are rejected server-side and logged

**Priority:** P1 | **Feature Ref:** F15, F14

---

### US-8.6: Preview and Audit the Effect of a Rule Change
**As a** Priya Raghavan (System Administrator), **I want to** see which shipments a rule change would affect and have the change recorded under my name, **so that** configuration drift is both predictable and traceable.

**Acceptance Criteria:**
- [ ] Saving a rule change offers either an impact preview naming the shipments whose validation results would change, or the option to revalidate affected shipments
- [ ] Revalidating affected shipments runs through the standard revalidation path with `trigger = RULE_CHANGE`
- [ ] Exceptions resolved by a rule change record a resolution reason of `RULE_DISABLED` or `RULE_PARAMS_CHANGED`
- [ ] Every rule create, update, enable and disable writes an audit entry attributed to the administrator with a timestamp
- [ ] The rule version and rule-set fingerprint change on every saved edit, so the configuration in force at any past evaluation is recoverable
- [ ] A rule change never modifies a `CLEARED` case

**Priority:** P1 | **Feature Ref:** F15, F12, F6

---

## Epic 9: The Four Primary Screens & Application Shell (F17)

The human surface. The API does not satisfy this epic — an API-only build fails acceptance.

### US-9.1: Navigate the Application with My Role Always Visible
**As a** Marisol Reyes (Cargo Specialist), **I want to** a consistent shell with navigation across the four screens and my acting role always on screen, **so that** I always know where I am and who I am acting as.

**Acceptance Criteria:**
- [ ] Persistent navigation exists across Exception Queue, Shipment Review, Recommended Resolution and Decision & Audit Record
- [ ] The simulated login / role selector is reachable at all times and the current user and role are always displayed
- [ ] Administrator-only surfaces are hidden from Cargo Specialist and Supervisor navigation
- [ ] Shared components provide status badges, priority indicators, exception-type chips, AI-content labelling and evidence rows, used consistently on every screen
- [ ] A notification indicator gives access to the in-app notification list
- [ ] Every data-backed view has a loading state, an empty state and an error state with retry and a `request_id`
- [ ] A graceful-degradation banner is shown while AI assistance is in offline-fallback mode
- [ ] The layout is responsive and usable inside an embedded preview frame
- [ ] All four screens are keyboard navigable, use semantic headings and table markup, convey status and priority by text label rather than colour alone, and meet WCAG 2.1 AA contrast

**Priority:** P0 | **Feature Ref:** F16

---

### US-9.2: Work a Queue of Flagged Shipments
**As a** Marisol Reyes (Cargo Specialist), **I want to** see flagged shipments in a table with shipment ID, importer, exception, priority and status, **so that** I can pick the next case to work without opening each one.

**Acceptance Criteria:**
- [ ] The table renders shipment ID, importer, exception(s), priority and status, plus age and assignee
- [ ] A shipment appears when it has at least one open exception, or its case is `PENDING_APPROVAL`
- [ ] The default view excludes shipments with zero open exceptions and excludes `CLEARED` cases; both are reachable through explicit filters
- [ ] The seeded clean shipment does not appear by default, demonstrating that clean entries stay off the queue
- [ ] Age is measured from the oldest open exception's opened-at, not from case creation
- [ ] Rows are selectable by mouse and by keyboard (`Tab` to the row, `Enter`/`Space` to open) with a visible focus ring, and open the corresponding Shipment Review screen
- [ ] The queue exposes no action controls — every disposition happens on Review or Recommended Resolution, so a shipment can never be dispositioned without its evidence being read
- [ ] The queue loads in under 1 second with the seeded dataset

**Priority:** P0 | **Feature Ref:** F17

---

### US-9.3: Filter and Sort the Queue Deterministically
**As a** Dwayne Okafor (Supervisor), **I want to** filter by status, exception type, priority, assignment and pending-approval, and sort by priority and age, **so that** I can find aging and blocked work across the whole team.

**Acceptance Criteria:**
- [ ] Status filtering is a multi-select over the seven statuses; exception-type filtering over the three types; priority filtering over the four levels
- [ ] Assignment filtering offers `any`, `me` and `unassigned`
- [ ] A `Pending approval only` toggle is available and prominent for Supervisors
- [ ] Sorting is server-side, defaults to priority descending then age descending, and breaks ties on shipment ID ascending so ordering is stable across reloads and across demo runs
- [ ] Applied filters render as removable chips built from the server's interpretation, not from optimistic client state
- [ ] A filter value outside the canonical enums is rejected by the server with `INVALID_QUERY_PARAM` and the rejection is surfaced rather than silently showing unfiltered data
- [ ] Empty states distinguish "no shipments are currently flagged" from "no shipments match these filters" (with a clear-filters control) from a data-load failure

**Priority:** P0 | **Feature Ref:** F17

---

### US-9.4: See Multi-Exception Shipments Without Collapsing
**As a** Marisol Reyes (Cargo Specialist), **I want to** every distinct exception type on a shipment shown separately in the queue, **so that** I do not fix one problem and get surprised that the shipment is still held.

**Acceptance Criteria:**
- [ ] One exception-type chip renders per distinct open exception type, with a count when a type occurs more than once
- [ ] A three-exception shipment shows three chips and never the text "3 exceptions"
- [ ] The canonical solar-panel shipment shows three distinct chips
- [ ] The open exception count is displayed alongside the chips
- [ ] Priority displays its derivation basis in a tooltip

**Priority:** P0 | **Feature Ref:** F17, F5

---

### US-9.5: See the Whole Case on One Review Screen
**As a** Marisol Reyes (Cargo Specialist), **I want to** shipment data, documents, validation results and the AI summary on one screen, **so that** I can understand why the shipment was flagged in under 30 seconds without leaving it.

**Acceptance Criteria:**
- [ ] The shipment panel displays importer, carrier, product description, HTS code, country of origin, manufacturer name, manufacturer address (with country emphasised) and shipment value formatted as USD, plus entry date, status and priority with basis
- [ ] The HTS code shows its normalised digit count annotated when an HTS exception exists
- [ ] The documents panel shows every document type known to the case with state, provenance, filename, timestamps and requester detail
- [ ] The validation results panel renders one card per open exception in deterministic evaluation order with type chip, severity, rule name and description, policy reference, the assertion sentence, the evidence rows and the missing-information list
- [ ] Resolved exceptions from current and prior evaluations are available behind a "Resolved (n)" disclosure
- [ ] The validation results panel renders independently of the AI summary and remains fully usable when the summary is absent, loading or in fallback
- [ ] Actions available from this screen are request additional information, upload simulated document, revalidate, and navigate to Recommended Resolution
- [ ] Every action control is either enabled or disabled with a visible reason — there is no hidden-without-explanation state
- [ ] Shipment detail loads in under 1 second with the seeded dataset, measured on the non-AI calls
- [ ] A shipment that has never been evaluated shows "Not yet evaluated" with a revalidate control rather than an empty panel
- [ ] The screen is fully keyboard operable including the upload dialog, and announces post-action results via `aria-live`

**Priority:** P0 | **Feature Ref:** F18

---

### US-9.6: See What Changed After a Revalidation
**As a** Marisol Reyes (Cargo Specialist), **I want to** an inline indication of what resolved, what was retained and what is new after a revalidation, **so that** the effect of the new evidence is reconciled on screen rather than inferred.

**Acceptance Criteria:**
- [ ] A banner reads "Revalidated: {n} exception(s) resolved, {m} retained, {k} new"
- [ ] Each resolved exception is marked "Resolved by revalidation" as it moves into the Resolved disclosure
- [ ] Retained exceptions whose missing-information list shrank are marked "Updated"
- [ ] Newly firing exceptions are marked as new
- [ ] A silent refresh with no change indication is a defect
- [ ] The indication appears identically whether revalidation was triggered by the explicit Revalidate control or automatically by an upload
- [ ] The evaluation history and version diff are reachable from the screen

**Priority:** P0 | **Feature Ref:** F18, F6

---

### US-9.7: Decide from a Screen That States the AI Recommends and I Decide
**As a** Marisol Reyes (Cargo Specialist), **I want to** the exception, triggering rule, evidence, missing information and AI advice presented next to all five actions with a mandatory justification, **so that** I make an informed decision that is unambiguously mine.

**Acceptance Criteria:**
- [ ] One card renders per open exception with its type chip, severity, the triggering rule's name, description and policy reference as the stated authority, the evidence rows and the missing-information list
- [ ] The exception block is populated from the exception API, not from the AI response
- [ ] The AI recommendation block renders inside the AI-content label with the recommended action as a statement, the confidence badge, the confidence basis, the contributing factors, the rationale and full provenance
- [ ] The governance notice "The AI recommends. A named official decides. No action has been taken." renders above the decision panel on every render for every role
- [ ] All five actions render as selectable cards with none selected initially; unavailable ones are disabled with their reason
- [ ] Selecting an action reveals only that action's specific fields
- [ ] The justification input is always required, with the minimum raised to 40 characters for a clearance recommendation with basis `EXCEPTIONS_ACCEPTED` or `MIXED`
- [ ] The submit control stays disabled until every required field is valid
- [ ] A rejected submission preserves the entered justification
- [ ] After submission a confirmation summarises the recorded decision, the resulting status, the concurrence with the AI recommendation and a link to the Decision & Audit Record screen
- [ ] The screen is fully keyboard operable including arrow-key selection within the action group, with `aria-live` announcements on submission results

**Priority:** P0 | **Feature Ref:** F19

---

### US-9.8: Adjudicate a Recommendation from the Resolution Screen
**As a** Dwayne Okafor (Supervisor), **I want to** approve, reject or return a pending recommendation from the same screen that shows the evidence and advice, **so that** I decide with the full chain in front of me.

**Acceptance Criteria:**
- [ ] For a `PENDING_APPROVAL` case, the pending recommendation panel renders above the decision panel
- [ ] Approve, Reject and Request-more-information controls each require their own justification, with a 40-character minimum and a reason code for Reject
- [ ] Approve/reject controls are not rendered at all for Cargo Specialists
- [ ] When the acting user is the recommender, the controls render disabled with "You submitted this recommendation and cannot decide on it"
- [ ] The evidence-changed acknowledgement checkbox is required when versions differ, and the submit control stays disabled until it is checked
- [ ] The server rejects a disallowed disposition regardless of what the UI rendered
- [ ] Once the case is `CLEARED`, the whole panel is replaced by a read-only disposition summary with an audit link

**Priority:** P0 | **Feature Ref:** F19, F11

---

### US-9.9: Replay the Complete Audit Trail on a Read-Only Screen
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** a screen that replays every event on a case with all eight fields, attributed and timestamped, and offers no way to change anything, **so that** I can judge defensibility directly rather than being told about it.

**Acceptance Criteria:**
- [ ] The case header shows shipment ID, importer, current status and priority, and — when cleared — a disposition block naming the approving official, the clearance timestamp and the recommender
- [ ] A completeness block states the record's status in plain language, e.g. "12 events recorded. 5 decisions, all 5 complete against the 8 required fields."
- [ ] A non-empty missing-fields list renders as a prominent failure naming the entry and the field
- [ ] Each timeline card shows sequence number, event type as human copy, absolute UTC and relative timestamp, the authorship band label and the actor as "{name} ({role})" or "System" / "AI assistance"
- [ ] Status change renders as `{before} → {after}` with a badge on each side, omitted when there is no change
- [ ] All eight fields render on every decision entry; a non-applicable field renders an explicit "Not applicable" rather than a blank
- [ ] Evidence beyond three rows is collapsed behind a "Show all evidence" disclosure — collapsed, never omitted
- [ ] An absent AI recommendation renders "No AI recommendation had been generated at this point"
- [ ] Approval entries render "Approved by {name} ({role})" prominently
- [ ] Generated notifications render in a distinct sub-block with the fixed label "Generated, not transmitted"
- [ ] An entry-class filter bar offers all / decisions only / AI outputs / system events / access denials, and filtering is presentational only
- [ ] A Verify-chain control reports "Audit chain verified: n of n entries intact" or names the first invalid sequence number in a prominent banner while still rendering the timeline
- [ ] Export offers JSON download and a printable view opened in a new tab
- [ ] The screen registers no mutating handlers: no edit control, no delete control, no inline editing, no context menu
- [ ] An automated test asserts that no `POST`/`PATCH`/`PUT`/`DELETE` request originates from this route during a full render and interaction pass
- [ ] The timeline uses a semantic list structure with a heading per entry and is keyboard navigable

**Priority:** P0 | **Feature Ref:** F20, F12

---

## Epic 10: Quality, Tests & Demo Readiness (F21)

The governance claims held true by tests rather than by narration, and an environment that can be demonstrated repeatedly without cleanup.

### US-10.1: Have the Rule and Revalidation Behaviour Covered by Tests
**As a** Priya Raghavan (System Administrator), **I want to** automated tests covering every rule type and the revalidation reconciliation, **so that** a configuration change cannot silently break validation.

**Acceptance Criteria:**
- [ ] Each of the three exception types has positive and negative test cases
- [ ] A multi-exception shipment test asserts that all firing rules produce exceptions and none is suppressed
- [ ] Configuration-driven parameter changes are tested: changing the required-document list, the HTS digit count and the origin-comparison fields each change the outcome
- [ ] A determinism test asserts identical exception sets and ordering across repeated evaluations of the same input
- [ ] A revalidation test asserts the missing-document exception resolves after upload and every still-firing exception is retained
- [ ] A test asserts that `exceptions` and `evidence` row counts never decrease across a revalidation
- [ ] A test asserts age continuity: a retained exception preserves its original opened-at across revalidation
- [ ] The canonical solar-panel shipment test asserts all three expected exceptions on first ingestion

**Priority:** P0 | **Feature Ref:** F21, F4, F6

---

### US-10.2: Have the Workflow, RBAC and Audit Claims Covered by Tests
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the governance claims asserted by a green test suite, **so that** I am not relying on the presenter's word for them.

**Acceptance Criteria:**
- [ ] Every valid transition in the transition table is exercised and asserted
- [ ] Invalid transitions, redundant transitions and terminal-case mutations are asserted to be rejected with the correct code
- [ ] A test enumerates the transition table and asserts that exactly one row targets `CLEARED`, that it requires the Supervisor role, and that it requires an approving official distinct from the recommender
- [ ] A test asserts that no transition can execute with an AI or system actor
- [ ] A test asserts mandatory justification on all five actions with no bypass path
- [ ] RBAC tests exercise each of the three roles against each protected operation, including blocked self-approval and blocked rule editing by non-administrators
- [ ] Audit-completeness tests assert every required field on every decision entry, and that a decision with a missing field cannot be finalised
- [ ] Append-only tests attempt an update and a delete on an audit entry and assert both fail
- [ ] A tampering test modifies a row via direct SQL and asserts hash-chain verification fails
- [ ] The test suite is green and its coverage of the rule, workflow-transition, RBAC and audit-completeness behaviours is demonstrable on screen

**Priority:** P0 | **Feature Ref:** F21, F9, F11, F12, F14

---

### US-10.3: Have the Whole Walkthrough Covered End-to-End by One Test
**As a** Priya Raghavan (System Administrator), **I want to** a single end-to-end test that executes all ten walkthrough steps against seeded data, **so that** a regression in the demo narrative is caught before a stakeholder sees it.

**Acceptance Criteria:**
- [ ] One end-to-end test executes steps 1 through 10 in order against the seeded database
- [ ] The test asserts the observable outcome of each step, not merely that the request succeeded
- [ ] The test runs with the AI provider disabled and passes via the labelled fallback path
- [ ] The test performs a reset and then re-runs, asserting identical results
- [ ] The test fails if any step requires manual data entry or developer intervention
- [ ] The test asserts the finalised case has a named approving official and a complete eight-field audit record

**Priority:** P0 | **Feature Ref:** F21, F22

---

### US-10.4: Start and Reset a Demo-Ready Environment in One Command
**As a** Priya Raghavan (System Administrator), **I want to** a single-command start and a one-action reset to pristine seeded state, **so that** I can run the walkthrough repeatedly without touching the database by hand.

**Acceptance Criteria:**
- [ ] A single command starts the application with the dev server bound to `0.0.0.0` on a deterministic port, producing a stable embeddable preview URL across restarts
- [ ] The database seeds automatically on first start
- [ ] A reset control on the System Administrator surface truncates and reseeds the entire database in one action, and is denied to Cargo Specialist and Supervisor
- [ ] Reset writes a `DEMO_RESET` audit entry as the first row of the new chain
- [ ] Seed output is byte-deterministic: identical IDs, timestamps and row counts on every run
- [ ] Three consecutive full walkthroughs after reset produce identical results
- [ ] The application requires no external service beyond the optional AI provider, and the file-backed database needs no separate server
- [ ] No secrets are committed to the repository

**Priority:** P1 | **Feature Ref:** F22, F2

---

### US-10.5: Confirm the Environment Is Demo-Ready Before Presenting
**As a** Priya Raghavan (System Administrator), **I want to** a pre-demo health check covering database, seed data and AI availability, **so that** I never discover a degraded dependency mid-walkthrough.

**Acceptance Criteria:**
- [ ] A health check reports database connectivity and migration state
- [ ] The health check reports seed presence including the shipment count and the presence of the canonical solar-panel scenario
- [ ] The health check reports AI-assist availability and explicitly states whether the offline fallback is active
- [ ] The health check result is readable from the administrator surface without a command line
- [ ] When fallback mode is active, the shell shows the graceful-degradation banner on every screen
- [ ] The health check completes without mutating any data

**Priority:** P1 | **Feature Ref:** F22

---

## Epic 11: The 10-Step Demo Walkthrough (End-to-End Trace) (F17)

The PRD §3.2 acceptance narrative, one story per step, in order, on the canonical solar-panel shipment. Every step must run live in the preview environment against seeded data with no manual data entry and no developer intervention. These stories are integration stories: they assert the *observable* outcome of each step, and they depend on the capability stories in Epics 0–10.

### US-11.1: Step 1 — Show the Exception Queue
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the walkthrough to open on a populated queue of flagged shipments, **so that** I can see the work list a specialist actually starts from.

**Acceptance Criteria:**
- [ ] The Exception Queue screen is the landing screen after role selection as a Cargo Specialist
- [ ] Between 10 and 15 seeded shipments exist, and every flagged one is listed
- [ ] Each row shows shipment ID, importer, exception(s), priority and status
- [ ] All three exception types are visible across the listed rows
- [ ] The canonical solar-panel shipment is present and shows three distinct exception-type chips
- [ ] The clean seeded shipment is not listed by default
- [ ] The queue renders in under 1 second with no manual data entry
- [ ] Row order is identical to the previous walkthrough run

**Priority:** P0 | **Feature Ref:** F17, F5, F2

---

### US-11.2: Step 2 — Open a Flagged Shipment
**As a** Marisol Reyes (Cargo Specialist), **I want to** select the canonical flagged row and land on its full review detail, **so that** the walkthrough moves from list to case in one click.

**Acceptance Criteria:**
- [ ] Activating the row by click or by keyboard navigates to that shipment's Shipment Review screen
- [ ] All eight required attributes render: importer, carrier, product description, HTS code, country of origin, manufacturer name, manufacturer address, shipment value
- [ ] The canonical values are visible: solar panels, origin Malaysia, manufacturer address in China, incomplete HTS code, $85,000 value
- [ ] The documents panel shows the required certificate explicitly as Missing
- [ ] The validation results panel lists all three exceptions with their rule and severity
- [ ] Detail renders in under 1 second on the non-AI calls
- [ ] Navigating back returns to the queue with filters and scroll position intact

**Priority:** P0 | **Feature Ref:** F18, F0, F3

---

### US-11.3: Step 3 — Show the AI-Generated Summary
**As a** Marisol Reyes (Cargo Specialist), **I want to** read the AI plain-language summary of the detected exceptions on the review screen, **so that** I understand the case without reconstructing it.

**Acceptance Criteria:**
- [ ] The AI summary panel renders on the Shipment Review screen without a separate navigation step
- [ ] The summary names the commodity, importer, carrier, value and origin, and explains each of the three detected exceptions in non-technical language
- [ ] Every claim in the summary maps to a field or document visible elsewhere on the screen
- [ ] The panel is inside the AI-content label with provider, model, generation mode and generation timestamp
- [ ] If the provider is unavailable, the labelled deterministic fallback summary renders instead and the shell banner is active
- [ ] The summary never delays the shipment, documents or validation panels

**Priority:** P0 | **Feature Ref:** F7, F18

---

### US-11.4: Step 4 — Display the Triggering Rule and Evidence
**As a** Marisol Reyes (Cargo Specialist), **I want to** see the specific rule that fired and the field-level evidence behind it, **so that** I can verify the machine's finding myself.

**Acceptance Criteria:**
- [ ] The Recommended Resolution screen renders one card per open exception
- [ ] Each card names the triggering rule and displays its policy/authority reference
- [ ] The origin exception shows `country_of_origin = "Malaysia"` against `manufacturer.address.country = "China"` as concrete field references and values
- [ ] The HTS exception shows the declared code, its normalised digit count and the configured expected digit count
- [ ] The missing-document exception names the specific required document type as missing information
- [ ] Evidence and missing information are sourced from the exception API, not from the AI response
- [ ] The AI recommended action, confidence level, confidence basis and rationale render alongside, inside the AI-content label
- [ ] The governance notice "The AI recommends. A named official decides. No action has been taken." is visible

**Priority:** P0 | **Feature Ref:** F5, F4, F8, F19

---

### US-11.5: Step 5 — Request a Missing Document
**As a** Marisol Reyes (Cargo Specialist), **I want to** issue a request for the missing certificate with my justification, **so that** the outstanding requirement is recorded on the shipment and the case state reflects that it is blocked.

**Acceptance Criteria:**
- [ ] The request dialog lists the document types named in open exceptions' missing information as selectable options
- [ ] A justification of at least 10 characters is required before submit is enabled
- [ ] Submitting creates one `OUTSTANDING` document request with the requester's name, the timestamp, the linked exception and the linked rule
- [ ] The case transitions from its prior status to `AWAITING_INFORMATION`
- [ ] The Shipment Review screen shows the request as outstanding with an Upload control
- [ ] The queue reflects the new status without a manual reload
- [ ] An audit entry and a notification are both written for the request
- [ ] Nothing is transmitted; the addressee label is descriptive only

**Priority:** P0 | **Feature Ref:** F10, F9, F13

---

### US-11.6: Step 6 — Upload the Simulated Document
**As a** Marisol Reyes (Cargo Specialist), **I want to** attach the simulated certificate to the open request from the review screen, **so that** the requested evidence enters the shipment record live during the demo.

**Acceptance Criteria:**
- [ ] The upload control offers the seeded upload-ready fixture for the canonical shipment, so no file needs sourcing from the presenter's machine
- [ ] The uploaded document's type is taken from the request, not from client input
- [ ] The document attaches with `provenance = SIMULATED_UPLOAD` and is visually marked as uploaded this session
- [ ] The document request transitions to `FULFILLED` with the fulfilling user, timestamp and document recorded
- [ ] The documents panel now shows the certificate as Received
- [ ] A `DOCUMENT_UPLOADED` audit entry and a notification are written
- [ ] No real importer correspondence path exists and nothing leaves the system

**Priority:** P0 | **Feature Ref:** F10

---

### US-11.7: Step 7 — Revalidate the Shipment
**As a** Marisol Reyes (Cargo Specialist), **I want to** the rules re-run against the updated evidence and the outcome reconciled on screen, **so that** I can see the resolved exception clear while the remaining ones persist.

**Acceptance Criteria:**
- [ ] Revalidation runs automatically as part of the upload, in the same transaction, and can also be triggered explicitly from the Revalidate control
- [ ] A new evaluation version is created
- [ ] The missing-document exception is marked `RESOLVED_BY_REVALIDATION` with resolution reason `DOCUMENT_RECEIVED`, and is retained rather than deleted
- [ ] The HTS and origin exceptions are retained with their original opened-at timestamps
- [ ] The open exception count moves from 3 to 2
- [ ] The change indication reads "1 resolved, 2 retained" (0 new)
- [ ] The case moves from `AWAITING_INFORMATION` to `IN_REVIEW` because the only outstanding request is now fulfilled
- [ ] Priority remains driven by the highest-severity remaining exception
- [ ] The AI summary and recommendation are regenerated against the new evaluation version
- [ ] The `REVALIDATED` audit entry records the complete before and after exception sets
- [ ] The case does not become `CLEARED` or `PENDING_APPROVAL` as a result of revalidation
- [ ] The round trip completes in under 2 seconds

**Priority:** P0 | **Feature Ref:** F6, F4

---

### US-11.8: Step 8 — Specialist Recommends Clearance
**As a** Marisol Reyes (Cargo Specialist), **I want to** recommend clearance with a justification and have it routed to a supervisor, **so that** my judgement is captured without my being able to finalise it.

**Acceptance Criteria:**
- [ ] The clear-exception action is selected from the five actions on the Recommended Resolution screen, with nothing pre-selected beforehand
- [ ] The enumerated exception set matches the current open set exactly
- [ ] A resolution basis is chosen; with `MIXED` or `EXCEPTIONS_ACCEPTED` the justification minimum is 40 characters
- [ ] The confirmation step states that this creates a recommendation, not a clearance, and that a supervisor distinct from the submitter must approve
- [ ] A `PENDING` recommendation is created bound to the current evaluation version, recording the recommender's name and role, the exception set, the justification and the AI recommendation snapshot with concurrence
- [ ] The case moves to `PENDING_APPROVAL` — visibly not to `CLEARED`
- [ ] A notification addressed to the Supervisor role is generated
- [ ] The case appears under the supervisor's pending-approval filter with a distinct status marker
- [ ] The specialist's own approve/reject controls are absent or disabled with the self-approval reason

**Priority:** P0 | **Feature Ref:** F9, F8, F11

---

### US-11.9: Step 9 — Supervisor Approves
**As a** Dwayne Okafor (Supervisor), **I want to** approve the recommendation and be recorded by name as the approving official, **so that** the clearance exists only because a named official authorised it.

**Acceptance Criteria:**
- [ ] Switching to the Supervisor role reveals the pending-approval item without hunting
- [ ] The pending recommendation panel shows the recommender's name and role, the submission time, the resolution basis, the enumerated exceptions with evidence, the specialist's justification verbatim, and the AI recommendation with concurrence
- [ ] Approval requires the supervisor's own justification
- [ ] The separation-of-duties checks pass because the approver is a Supervisor and is a different user from the recommender
- [ ] On approval the remaining listed exceptions close as `CLEARED_BY_DECISION` and the case becomes `CLEARED`
- [ ] The case records `cleared_at` and the approving official's user ID, name and role
- [ ] The audit completeness gate passes with a non-null approving official
- [ ] A notification naming the approving official is generated for the recommender and the specialist role
- [ ] The response returns the finalising audit entry ID so the audit screen can be opened directly on it
- [ ] The case is now terminal: every mutating attempt returns `CASE_TERMINAL`

**Priority:** P0 | **Feature Ref:** F11, F14, F13

---

### US-11.10: Step 10 — Show the Complete Audit Trail
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the Decision & Audit Record screen to replay every step I just watched, attributed and timestamped, **so that** I can judge whether this decision is defensible six months from now.

**Acceptance Criteria:**
- [ ] The timeline contains, in order, entries for ingestion, exception detection, AI summary generation, AI recommendation generation, the document request, the document upload, the revalidation with before/after exception sets, the clearance recommendation, and the supervisor approval
- [ ] Each notification appears alongside the decision that produced it, labelled "Generated, not transmitted"
- [ ] Every decision entry displays all eight required fields, with non-applicable fields shown explicitly as "Not applicable"
- [ ] The approval entry names Dwayne Okafor as the approving official and Marisol Reyes as the recommender
- [ ] The completeness block states that every decision entry is complete against the eight required fields
- [ ] AI-authored entries are visually and textually separated from human-authored decisions
- [ ] Justifications render verbatim and in full
- [ ] Chain verification reports all entries intact
- [ ] The record exports as JSON and as a printable view
- [ ] The screen offers no edit or delete affordance anywhere
- [ ] If the live case has not been cleared, the pre-cleared seeded shipment provides the same demonstration with at least 8 entries and a named approving official

**Priority:** P0 | **Feature Ref:** F12, F20

---

### US-11.11: Survive an Unscripted, Out-of-Order Walkthrough
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** ask for steps out of sequence and for off-script cases and still get coherent behaviour, **so that** I can tell a working system from a rehearsed click-path.

**Acceptance Criteria:**
- [ ] Any of the four screens can be opened directly by URL and renders correctly with the case context resolved
- [ ] Opening the audit screen before any decision has been taken shows the ingestion and flagging entries rather than an empty state
- [ ] A multi-exception seeded shipment and an already-cleared seeded shipment can both be opened on request and behave correctly
- [ ] Attempting an action that is invalid from the current state produces an explanatory rejection rather than an error page
- [ ] Disabling the AI provider mid-session moves both AI outputs to the labelled fallback path without breaking any screen
- [ ] A reset can be performed mid-session and the walkthrough restarted from step 1 with identical data
- [ ] No step requires a developer to run a command or edit data

**Priority:** P0 | **Feature Ref:** F22, F2, F17

---

## Epic 12: Governance Guardrails — Negative & Constraint Stories (F11)

What the system must *refuse* to do. These are the claims the demo is making; each one is stated as a behaviour a stakeholder can probe and a test can assert.

### US-12.1: Prevent the AI from Clearing a Shipment Autonomously
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the AI to be structurally incapable of clearing, holding, escalating or otherwise acting on a shipment, **so that** authority stays with a named human regardless of how confident the model is.

**Acceptance Criteria:**
- [ ] No transition in the state machine can execute with an AI or system actor; every transition requires a human actor with a resolvable user ID
- [ ] The AI recommendation is inert data: it names a suggested action and executes nothing
- [ ] The AI recommendation never sets the initial selection on the decision panel and no form auto-submits
- [ ] No scheduler, queue, worker, webhook or background job exists that could execute an action without a human request
- [ ] Ingestion, seeding and revalidation write `SYSTEM` audit entries but execute no workflow transition
- [ ] No audit entry may carry an AI actor together with a non-null human decision
- [ ] Across a full session, the audit trail contains zero AI-initiated actions
- [ ] A test asserts that zero of the transition-table rows permit a non-human actor
- [ ] There is no configuration flag, environment variable or feature toggle that enables autonomous action

**Priority:** P0 | **Feature Ref:** F8, F9, F12

---

### US-12.2: Prevent a Specialist from Approving Their Own Recommendation
**As a** Dwayne Okafor (Supervisor), **I want to** self-approval to be impossible rather than merely discouraged, **so that** the separation of duties oversight depends on is structural.

**Acceptance Criteria:**
- [ ] The approval endpoint rejects a Cargo Specialist with `403 FORBIDDEN_ROLE`
- [ ] The approval endpoint rejects any acting user whose ID equals the recommendation's author with `403 SELF_APPROVAL_BLOCKED`
- [ ] The identity constraint is enforced in the handler before any write **and** by a database trigger on the approval table that raises when the two IDs match
- [ ] The UI additionally disables the approve/reject controls for the recommender, but that is never the only enforcement
- [ ] A Supervisor who uses the clear-exception action themselves still enters `PENDING_APPROVAL` and is blocked from approving their own recommendation; a second seeded Supervisor makes that path demonstrable rather than deadlocked
- [ ] An attempted self-approval writes an `ACCESS_DENIED` audit entry with the acting user, the attempted action and the reason
- [ ] The recommender sees the reason "You submitted this recommendation and cannot decide on it"
- [ ] A test asserts the denial for both the specialist-recommends and the supervisor-recommends paths

**Priority:** P0 | **Feature Ref:** F11, F14, F12

---

### US-12.3: Prevent Any Path to Cleared Without a Named Approving Official
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** exactly one route to a cleared shipment, gated on supervisor approval and a complete audit record, **so that** no clearance can exist that nobody signed.

**Acceptance Criteria:**
- [ ] Exactly one transition in the table targets `CLEARED`, and a test asserts that count by enumerating the table
- [ ] That transition requires the Supervisor role, an approver distinct from the recommender, and a passing audit-completeness gate
- [ ] Revalidation never transitions a case to `CLEARED`, even when every exception resolves
- [ ] Ingestion and re-ingestion never transition a case to `CLEARED`
- [ ] A rule change never transitions a case to `CLEARED`
- [ ] No bulk-approve endpoint and no multi-case disposition operation exists
- [ ] There is no administrator override, no single-approver mode and no configuration that shortens the chain
- [ ] Zero shipments reach `CLEARED` status without a recorded approving official across a full session
- [ ] Every cleared case's audit trail contains an approval entry naming the official, the decision, the justification and the timestamp

**Priority:** P0 | **Feature Ref:** F11, F9, F6

---

### US-12.4: Prevent Audit Records from Being Edited or Deleted
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** audit records to be unchangeable through the application, **so that** the record I read is the record that was written.

**Acceptance Criteria:**
- [ ] No update or delete route exists for audit entries or notifications — the routes are not defined, so no client can express the request
- [ ] The audit repository offers no update or delete method
- [ ] Database update and delete triggers on audit entries raise `AUDIT_IMMUTABLE`, returning `405` at the API boundary
- [ ] The single narrow exemption permits only the notification linkage to move from null to non-null, only once, only inside the inserting transaction; a second attempt is rejected
- [ ] The Decision & Audit Record screen contains zero mutating affordances, verified by a test that asserts no mutating request originates from that route
- [ ] Tampering with a stored row breaks hash-chain verification for that entry and every subsequent one
- [ ] Selective deletion of one entry or one case's history is not implementable through any surface
- [ ] The only removal path is the administrator-gated full reset, which is a whole-environment operation and writes its own audit entry
- [ ] Tests attempt both an update and a delete and assert both fail

**Priority:** P0 | **Feature Ref:** F12, F22

---

### US-12.5: Prevent a Decision Without a Human-Authored Justification
**As a** Dwayne Okafor (Supervisor), **I want to** every decision to carry a justification the human actually wrote, **so that** the reasoning on the record is not a paste of machine text or a blank field.

**Acceptance Criteria:**
- [ ] A justification is mandatory on all five actions and on every approval disposition; there is no transition path that omits it
- [ ] The minimum is 10 characters after trimming, raised to 40 for a rejection and for a clearance recommendation with basis `EXCEPTIONS_ACCEPTED` or `MIXED`
- [ ] Whitespace-only justifications are rejected
- [ ] A justification exactly matching the current AI rationale is rejected with `JUSTIFICATION_NOT_AUTHORED`
- [ ] The justification field is never prefilled from the AI rationale or defaulted by the UI
- [ ] The justification is stored verbatim and rendered in full on the audit timeline, never truncated or paraphrased
- [ ] A test asserts that no action can be committed with a missing or under-length justification

**Priority:** P0 | **Feature Ref:** F9, F11, F12

---

### US-12.6: Prevent Role Boundaries from Being Crossed
**As a** Priya Raghavan (System Administrator), **I want to** my own inability to adjudicate to be as real as a specialist's inability to approve, **so that** the role model is a control rather than a description.

**Acceptance Criteria:**
- [ ] A System Administrator attempting any of the five workflow actions is rejected with `403 FORBIDDEN_ROLE` and the message that administrators do not adjudicate shipments
- [ ] A System Administrator attempting an approval, a document upload or a direct revalidation is rejected with `403 FORBIDDEN_ROLE`
- [ ] A Cargo Specialist or Supervisor attempting rule creation, edit, enable, disable or environment reset is rejected with `403 FORBIDDEN_ROLE`
- [ ] A Cargo Specialist attempting to act on an `ESCALATED` case is rejected with `403 ESCALATED_REQUIRES_SUPERVISOR`
- [ ] A Cargo Specialist attempting to assign a case to another specialist is rejected with `403 ASSIGNMENT_NOT_PERMITTED`
- [ ] Every denial is recorded as an audit entry and is visible in the case timeline under the access-denied entry class
- [ ] Hiding a control in the UI is never the sole enforcement for any of the above
- [ ] A test matrix covers all three roles against every protected operation

**Priority:** P0 | **Feature Ref:** F14, F9, F15

---

### US-12.7: Prevent Excluded Capabilities from Reappearing
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the recorded scope exclusions to hold in the built system, **so that** scope discipline is verifiable rather than asserted.

**Acceptance Criteria:**
- [ ] No ACE client, endpoint or credential exists; cargo entries arrive only from the JSON file or the local ingestion endpoint
- [ ] Exactly three exception types are supported and no fourth type can be created through rule administration
- [ ] No real importer/carrier data and no PII exist in seed data, fixtures, logs or AI prompts, verified by an automated deny-list scan
- [ ] No PIV/CAC or SSO integration exists; authentication is simulated and visibly labelled
- [ ] No email, SMS or other outbound transport exists; every notification carries `transmitted: false`
- [ ] No model training code, training data or training pipeline exists; AI outputs are generated at request time only
- [ ] No mobile-native application exists; the web UI is responsive only
- [ ] Deployment is single-tenant on a single deterministic port
- [ ] Beyond the four primary screens, only the rule-administration and role-switching surfaces exist, and each is justified as supporting the four
- [ ] Every one of the above exclusions is stated in the documentation as a decision rather than an omission

**Priority:** P0 | **Feature Ref:** F1, F4, F2, F14, F13, F7, F16

---

## Summary Table

| Epic | Name | Story Count | P0 | P1 | P2 | P3 |
|------|------|-------------|----|----|----|----|
| Epic 0 | Platform & Data Foundation | 5 | 5 | 0 | 0 | 0 |
| Epic 1 | Rules, Exception Detection & Revalidation | 7 | 7 | 0 | 0 | 0 |
| Epic 2 | AI Assistance — Explain and Recommend | 5 | 5 | 0 | 0 | 0 |
| Epic 3 | Exception Case Workflow & The Five Actions | 7 | 7 | 0 | 0 | 0 |
| Epic 4 | Document Request & Simulated Upload | 5 | 5 | 0 | 0 | 0 |
| Epic 5 | Specialist → Supervisor Approval Chain | 5 | 5 | 0 | 0 | 0 |
| Epic 6 | Decision & Audit Record | 6 | 6 | 0 | 0 | 0 |
| Epic 7 | Notification Generation | 2 | 0 | 2 | 0 | 0 |
| Epic 8 | Access Control & Rule Administration | 6 | 4 | 2 | 0 | 0 |
| Epic 9 | The Four Primary Screens & Application Shell | 9 | 9 | 0 | 0 | 0 |
| Epic 10 | Quality, Tests & Demo Readiness | 5 | 3 | 2 | 0 | 0 |
| Epic 11 | The 10-Step Demo Walkthrough | 11 | 11 | 0 | 0 | 0 |
| Epic 12 | Governance Guardrails | 7 | 7 | 0 | 0 | 0 |
| **Total** | — | **80** | **74** | **6** | **0** | **0** |

---

## Story Index

| Story | Title | Persona | Priority | Feature Ref |
|---|---|---|---|---|
| US-0.1 | Persist the Full Cargo Exception Domain | PER-03 Priya Raghavan | P0 | F0 |
| US-0.2 | Ingest Simulated Cargo Entries from a JSON File | PER-03 Priya Raghavan | P0 | F1 |
| US-0.3 | Post Cargo Entries to a Local Ingestion Endpoint | PER-03 Priya Raghavan | P0 | F1, F14 |
| US-0.4 | Start with a Seeded, Deterministic Demo Dataset | PER-04 Angela Pruitt | P0 | F2 |
| US-0.5 | Consume One Consistent Backend API from the UI | PER-01 Marisol Reyes | P0 | F3, F14 |
| US-1.1 | Detect a Missing Required Document | PER-01 Marisol Reyes | P0 | F4, F5 |
| US-1.2 | Detect an Invalid or Incomplete HTS Code | PER-01 Marisol Reyes | P0 | F4, F5 |
| US-1.3 | Detect a Conflicting Country of Origin | PER-01 Marisol Reyes | P0 | F4, F5 |
| US-1.4 | Trust That Validation Is Deterministic and Never Suppressed | PER-04 Angela Pruitt | P0 | F4 |
| US-1.5 | See Field-Level Evidence for Every Exception | PER-01 Marisol Reyes | P0 | F5 |
| US-1.6 | Revalidate a Shipment After Its Evidence Changes | PER-01 Marisol Reyes | P0 | F6 |
| US-1.7 | Have Revalidation Recorded and the AI Refreshed | PER-02 Dwayne Okafor | P0 | F6, F12, F13 |
| US-2.1 | Read a Plain-Language Summary of Why a Shipment Was Flagged | PER-01 Marisol Reyes | P0 | F7, F18 |
| US-2.2 | See Every AI Output Labelled and Attributed | PER-04 Angela Pruitt | P0 | F7, F8, F18, F19, F20 |
| US-2.3 | Continue the Walkthrough When the AI Provider Is Unavailable | PER-03 Priya Raghavan | P0 | F7, F8, F22 |
| US-2.4 | See a Recommended Resolution with an Explicit Confidence Level | PER-01 Marisol Reyes | P0 | F8, F19 |
| US-2.5 | Have Agreement or Divergence with the AI Recorded | PER-02 Dwayne Okafor | P0 | F8, F12 |
| US-3.1 | Take One of Exactly Five Actions on a Case | PER-01 Marisol Reyes | P0 | F9 |
| US-3.2 | Request Additional Information | PER-01 Marisol Reyes | P0 | F9, F10 |
| US-3.3 | Send a Case for Specialist Review | PER-02 Dwayne Okafor | P0 | F9 |
| US-3.4 | Place a Case on Hold with a Stated Reason | PER-01 Marisol Reyes | P0 | F9 |
| US-3.5 | Escalate a Case and Transfer Authority Upward | PER-01 Marisol Reyes | P0 | F9 |
| US-3.6 | Have Invalid Transitions Rejected with a Clear Reason | PER-01 Marisol Reyes | P0 | F9, F12 |
| US-3.7 | See Why an Action Is Unavailable to Me | PER-01 Marisol Reyes | P0 | F9, F19 |
| US-4.1 | Track the Lifecycle of a Document Request | PER-01 Marisol Reyes | P0 | F10 |
| US-4.2 | Upload a Simulated Document Against an Open Request | PER-01 Marisol Reyes | P0 | F10, F14 |
| US-4.3 | Be Prevented from Uploading Anything Other Than a Synthetic Document | PER-03 Priya Raghavan | P0 | F10 |
| US-4.4 | Have an Upload Trigger Revalidation Atomically | PER-01 Marisol Reyes | P0 | F10, F6 |
| US-4.5 | See Where Every Document Came From | PER-04 Angela Pruitt | P0 | F10, F18 |
| US-5.1 | Recommend Clearance and Route It to a Supervisor | PER-01 Marisol Reyes | P0 | F11, F9 |
| US-5.2 | Find Pending-Approval Work Without Hunting for It | PER-02 Dwayne Okafor | P0 | F11, F17 |
| US-5.3 | Approve a Clearance as the Named Approving Official | PER-02 Dwayne Okafor | P0 | F11, F12, F13 |
| US-5.4 | Reject or Return a Recommendation with a Reason | PER-02 Dwayne Okafor | P0 | F11, F13 |
| US-5.5 | Be Warned When the Evidence Changed Since the Recommendation | PER-02 Dwayne Okafor | P0 | F11, F6 |
| US-6.1 | Have Every Decision Recorded with All Eight Required Fields | PER-02 Dwayne Okafor | P0 | F12 |
| US-6.2 | Be Blocked from Finalising an Incomplete Decision | PER-04 Angela Pruitt | P0 | F12, F21 |
| US-6.3 | Rely on the Record Being Append-Only | PER-04 Angela Pruitt | P0 | F12, F22 |
| US-6.4 | Read the Complete Case Timeline in Chronological Order | PER-02 Dwayne Okafor | P0 | F12, F20 |
| US-6.5 | Export a Case Record for Offline Review | PER-02 Dwayne Okafor | P0 | F12, F20 |
| US-6.6 | Read the Evidence as It Was at Decision Time | PER-04 Angela Pruitt | P0 | F12, F21 |
| US-7.1 | Have a Notification Generated on Every Decision and State Change | PER-02 Dwayne Okafor | P1 | F13, F12 |
| US-7.2 | See Notifications In-App and Know They Were Never Sent | PER-04 Angela Pruitt | P1 | F13, F16, F20 |
| US-8.1 | Enter the Application as a Named Acting User | PER-03 Priya Raghavan | P0 | F14 |
| US-8.2 | Work Within My Role as a Cargo Specialist | PER-01 Marisol Reyes | P0 | F14 |
| US-8.3 | Work Within My Role as a Supervisor | PER-02 Dwayne Okafor | P0 | F14 |
| US-8.4 | Have Authorisation Enforced Server-Side on Every Mutating Operation | PER-04 Angela Pruitt | P0 | F14, F21 |
| US-8.5 | Manage Business Rules as Configuration | PER-03 Priya Raghavan | P1 | F15, F14 |
| US-8.6 | Preview and Audit the Effect of a Rule Change | PER-03 Priya Raghavan | P1 | F15, F12, F6 |
| US-9.1 | Navigate the Application with My Role Always Visible | PER-01 Marisol Reyes | P0 | F16 |
| US-9.2 | Work a Queue of Flagged Shipments | PER-01 Marisol Reyes | P0 | F17 |
| US-9.3 | Filter and Sort the Queue Deterministically | PER-02 Dwayne Okafor | P0 | F17 |
| US-9.4 | See Multi-Exception Shipments Without Collapsing | PER-01 Marisol Reyes | P0 | F17, F5 |
| US-9.5 | See the Whole Case on One Review Screen | PER-01 Marisol Reyes | P0 | F18 |
| US-9.6 | See What Changed After a Revalidation | PER-01 Marisol Reyes | P0 | F18, F6 |
| US-9.7 | Decide from a Screen That States the AI Recommends and I Decide | PER-01 Marisol Reyes | P0 | F19 |
| US-9.8 | Adjudicate a Recommendation from the Resolution Screen | PER-02 Dwayne Okafor | P0 | F19, F11 |
| US-9.9 | Replay the Complete Audit Trail on a Read-Only Screen | PER-04 Angela Pruitt | P0 | F20, F12 |
| US-10.1 | Have the Rule and Revalidation Behaviour Covered by Tests | PER-03 Priya Raghavan | P0 | F21, F4, F6 |
| US-10.2 | Have the Workflow, RBAC and Audit Claims Covered by Tests | PER-04 Angela Pruitt | P0 | F21, F9, F11, F12, F14 |
| US-10.3 | Have the Whole Walkthrough Covered End-to-End by One Test | PER-03 Priya Raghavan | P0 | F21, F22 |
| US-10.4 | Start and Reset a Demo-Ready Environment in One Command | PER-03 Priya Raghavan | P1 | F22, F2 |
| US-10.5 | Confirm the Environment Is Demo-Ready Before Presenting | PER-03 Priya Raghavan | P1 | F22 |
| US-11.1 | Step 1 — Show the Exception Queue | PER-04 Angela Pruitt | P0 | F17, F5, F2 |
| US-11.2 | Step 2 — Open a Flagged Shipment | PER-01 Marisol Reyes | P0 | F18, F0, F3 |
| US-11.3 | Step 3 — Show the AI-Generated Summary | PER-01 Marisol Reyes | P0 | F7, F18 |
| US-11.4 | Step 4 — Display the Triggering Rule and Evidence | PER-01 Marisol Reyes | P0 | F5, F4, F8, F19 |
| US-11.5 | Step 5 — Request a Missing Document | PER-01 Marisol Reyes | P0 | F10, F9, F13 |
| US-11.6 | Step 6 — Upload the Simulated Document | PER-01 Marisol Reyes | P0 | F10 |
| US-11.7 | Step 7 — Revalidate the Shipment | PER-01 Marisol Reyes | P0 | F6, F4 |
| US-11.8 | Step 8 — Specialist Recommends Clearance | PER-01 Marisol Reyes | P0 | F9, F8, F11 |
| US-11.9 | Step 9 — Supervisor Approves | PER-02 Dwayne Okafor | P0 | F11, F14, F13 |
| US-11.10 | Step 10 — Show the Complete Audit Trail | PER-04 Angela Pruitt | P0 | F12, F20 |
| US-11.11 | Survive an Unscripted, Out-of-Order Walkthrough | PER-04 Angela Pruitt | P0 | F22, F2, F17 |
| US-12.1 | Prevent the AI from Clearing a Shipment Autonomously | PER-04 Angela Pruitt | P0 | F8, F9, F12 |
| US-12.2 | Prevent a Specialist from Approving Their Own Recommendation | PER-02 Dwayne Okafor | P0 | F11, F14, F12 |
| US-12.3 | Prevent Any Path to Cleared Without a Named Approving Official | PER-04 Angela Pruitt | P0 | F11, F9, F6 |
| US-12.4 | Prevent Audit Records from Being Edited or Deleted | PER-04 Angela Pruitt | P0 | F12, F22 |
| US-12.5 | Prevent a Decision Without a Human-Authored Justification | PER-02 Dwayne Okafor | P0 | F9, F11, F12 |
| US-12.6 | Prevent Role Boundaries from Being Crossed | PER-03 Priya Raghavan | P0 | F14, F9, F15 |
| US-12.7 | Prevent Excluded Capabilities from Reappearing | PER-04 Angela Pruitt | P0 | F1, F4, F2, F14, F13, F7, F16 |

---

## Feature → Story Coverage

| Feature | Priority | Stories |
|---|---|---|
| F0: Cargo Entry Data Model & Persistence | P0 | US-0.1, US-11.2 |
| F1: Cargo Entry Ingestion (JSON / local API) | P0 | US-0.2, US-0.3, US-12.7 |
| F2: Synthetic Seed Dataset | P0 | US-0.4, US-10.4, US-11.1, US-11.11, US-12.7 |
| F3: Backend HTTP API | P0 | US-0.5, US-11.2 |
| F4: Configurable Business Rule Engine | P0 | US-1.1, US-1.2, US-1.3, US-1.4, US-10.1, US-11.4, US-11.7, US-12.7 |
| F5: Exception Detection, Evidence Capture & Flagging | P0 | US-1.1, US-1.2, US-1.3, US-1.5, US-9.4, US-11.1, US-11.4 |
| F6: Shipment Revalidation | P0 | US-1.6, US-1.7, US-4.4, US-8.6, US-9.6, US-10.1, US-11.7, US-12.3 |
| F7: AI Plain-Language Shipment Summary | P0 | US-2.1, US-2.2, US-2.3, US-11.3, US-12.7 |
| F8: AI Recommended Resolution with Confidence Level | P0 | US-2.2, US-2.3, US-2.4, US-2.5, US-11.4, US-11.8, US-12.1 |
| F9: Exception Case Workflow & User Actions | P0 | US-3.1–US-3.7, US-5.1, US-10.2, US-11.5, US-11.8, US-12.1, US-12.3, US-12.5, US-12.6 |
| F10: Document Request & Simulated Upload | P0 | US-3.2, US-4.1–US-4.5, US-11.5, US-11.6 |
| F11: Specialist → Supervisor Approval Chain | P0 | US-5.1–US-5.5, US-9.8, US-10.2, US-11.8, US-11.9, US-12.2, US-12.3, US-12.5 |
| F12: Decision & Audit Record | P0 | US-1.7, US-2.5, US-3.6, US-6.1–US-6.6, US-7.1, US-8.6, US-10.2, US-11.10, US-12.1, US-12.2, US-12.4, US-12.5 |
| F13: Notification Generation | P1 | US-1.7, US-5.3, US-5.4, US-7.1, US-7.2, US-11.5, US-11.9, US-12.7 |
| F14: Role Simulation & RBAC | P0 | US-0.3, US-0.5, US-4.2, US-8.1–US-8.4, US-10.2, US-11.9, US-12.2, US-12.6, US-12.7 |
| F15: Rule Administration | P1 | US-8.5, US-8.6, US-12.6 |
| F16: Application Shell, Navigation & Role Switcher | P0 | US-7.2, US-9.1, US-12.7 |
| F17: Cargo Exception Queue Screen | P0 | US-5.2, US-9.2, US-9.3, US-9.4, US-11.1, US-11.11 |
| F18: Shipment Review Screen | P0 | US-2.1, US-2.2, US-4.5, US-9.5, US-9.6, US-11.2, US-11.3 |
| F19: Recommended Resolution Screen | P0 | US-2.2, US-2.4, US-3.7, US-9.7, US-9.8, US-11.4 |
| F20: Decision & Audit Record Screen | P0 | US-2.2, US-6.4, US-6.5, US-7.2, US-9.9, US-11.10 |
| F21: Automated Test Suite | P0 | US-6.2, US-6.6, US-8.4, US-10.1, US-10.2, US-10.3 |
| F22: Demo Environment & Reset | P1 | US-2.3, US-6.3, US-10.3, US-10.4, US-10.5, US-11.11, US-12.4 |

**Coverage check:** all 23 PRD features (F0–F22) are referenced by at least one story. All ten walkthrough steps in PRD §3.2 have a dedicated story (US-11.1 – US-11.10). All governance constraints in PROJECT.md are expressed as negative stories in Epic 12.

---

## Priority Definitions

| Priority | Definition | Applied in CargoDemo |
|----------|------------|----------------------|
| **P0** | Critical — demo-blocking. The 10-step walkthrough fails, or a governance claim collapses, without it. | 74 stories |
| **P1** | High — required for a complete, credible product, but not on the critical path of a single walkthrough step. | 6 stories |
| **P2** | Medium — valuable polish. | 0 stories |
| **P3** | Low — optional / future consideration. | 0 stories |

The absence of P2 and P3 stories is deliberate, mirroring PRD §9.1: the scope is narrow by decision (PRD §5.8), not by deferral. Every story in this document is in scope for the first demo.

### P1 Stories and Why They Are Not P0

| Story | Feature | Rationale for P1 |
|---|---|---|
| US-7.1 | F13 | Notification *generation* is required for audit field 8, but the walkthrough survives if the in-app surfacing is thin; the audit entry's notification snapshot is what step 10 depends on. |
| US-7.2 | F13 | The in-app notification centre is a completeness surface; the "generated, not transmitted" label is the demo-critical part and is also enforced on the audit screen (US-9.9). |
| US-8.5 | F15 | Rule administration proves adaptability (PRD §7 Rule configurability) but is not one of the ten walkthrough steps. |
| US-8.6 | F15 | Impact preview and rule-change auditing strengthen the adaptability claim; the walkthrough does not depend on them. |
| US-10.4 | F22 | Single-command start and reset are operational guarantees around the walkthrough rather than steps within it. |
| US-10.5 | F22 | The health check protects the demo but is exercised before it begins, not during it. |

---

## Non-Functional Acceptance Thresholds Referenced by These Stories

| Threshold | Source | Stories asserting it |
|---|---|---|
| Queue loads in < 1 s | PRD §6 Performance | US-9.2, US-11.1 |
| Shipment detail loads in < 1 s | PRD §6 Performance | US-9.5, US-11.2 |
| Single-shipment rule evaluation < 500 ms | PRD §6 Performance | US-1.4 |
| Revalidation round trip < 2 s | PRD §6 Performance | US-1.6, US-11.7 |
| AI summary/recommendation p95 < 5 s, 10 s timeout to fallback | PRD §6 AI responsiveness | US-2.3 |
| Time to comprehension < 30 s | PRD §6 Usability, §7 | US-2.1, US-9.5 |
| 100% of state changes attributable to a named user and role | PRD §6 Governance | US-6.1, US-8.1 |
| 0 clearances without supervisor approval | PRD §6 Governance, §7 | US-12.3 |
| 0 AI-initiated actions | PRD §6 Governance, §7 | US-12.1 |
| All 8 audit fields on every finalized decision | PRD §6 Auditability, §7 | US-6.1, US-6.2 |
| Audit entries append-only | PRD §6 Auditability | US-6.3, US-12.4 |
| Every AI output labelled with provider, model, timestamp, evidence inputs | PRD §6 Explainability | US-2.2 |
| Server-side authorisation on every mutating endpoint | PRD §6 Security | US-8.4, US-12.6 |
| Uploads restricted to synthetic fixtures with type/size validation | PRD §6 Security | US-4.3 |
| No real or personally identifiable data anywhere | PRD §6 Privacy, §7 | US-0.4, US-4.3, US-12.7 |
| Deterministic seed, evaluation and port binding | PRD §6 Determinism | US-0.4, US-1.4, US-9.3, US-10.4 |
| 3 consecutive identical walkthroughs after reset | PRD §7 Walkthrough repeatability | US-10.3, US-10.4 |
| Keyboard navigable, semantic markup, WCAG 2.1 AA contrast, status not by colour alone | PRD §6 Accessibility | US-9.1, US-9.2, US-9.5, US-9.7, US-9.9 |
| Rules changeable with 0 code changes and 0 redeploys | PRD §6 Maintainability, §7 | US-8.5 |
| Walkthrough completes with AI provider disabled | PRD §7 AI availability resilience | US-2.3, US-10.3 |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
