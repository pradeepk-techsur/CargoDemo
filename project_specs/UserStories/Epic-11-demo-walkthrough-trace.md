
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
