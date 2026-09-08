
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
