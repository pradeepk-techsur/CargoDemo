# Jobs to Be Done
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related Personas** | PERSONAS-CargoDemo.md (PER-01 … PER-04) |
| **Related PRD** | PRD-CargoDemo.md (§2.1 Pain Points, §3.2 Walkthrough, §5 Features, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | JOURNEYS-CargoDemo, STORY-MAP-CargoDemo, UserStories-CargoDemo |

**Scope note:** Jobs are scoped to the four personas. PER-01 through PER-03 are the three system roles (PRD §5.8, PROJECT.md Constraints). PER-04 is an **observer with no system account** — her jobs are evaluation jobs performed by watching the four primary screens, not by operating them. Every job below is expressed as an outcome the persona is trying to achieve, not as a screen or control they want to use.

---

## JTBD Summary

| ID | Persona | Job Statement | Priority |
|----|---------|--------------|----------|
| JTBD-01.1 | PER-01 | When I start a shift with 20–40 flagged entries waiting, I want to see which shipments deserve my attention first, so I can spend my judgment on the highest-consequence cases instead of on ordering my own work. | P0 |
| JTBD-01.2 | PER-01 | When I open a shipment I have never seen before, I want the reason it was flagged handed to me in plain language, so I can begin assessing it instead of reconstructing it. | P0 |
| JTBD-01.3 | PER-01 | When a machine tells me what is wrong with a shipment, I want the underlying field values in front of me at the same time, so I can confirm the conclusion myself before I stake my name on it. | P0 |
| JTBD-01.4 | PER-01 | When a shipment is held only because a required document never arrived, I want to request it, receive it, and re-test the shipment in one place, so I can close the gap without tracking it in a side channel. | P0 |
| JTBD-01.5 | PER-01 | When I have reached a conclusion on a shipment, I want to commit to a recommendation with my reasoning attached and know it reached my supervisor, so I can hand the case off without it stalling in an inbox. | P0 |
| JTBD-01.6 | PER-01 | When a decision I made months ago is questioned, I want to see exactly what I was looking at when I made it, so I can defend the call rather than re-argue it from memory. | P1 |
| JTBD-02.1 | PER-02 | When I check in on my team's workload, I want the work that is waiting on my signature separated from everything else, so I can clear approvals before shipments age instead of discovering the backlog. | P0 |
| JTBD-02.2 | PER-02 | When a specialist routes me a clearance recommendation, I want the exception, evidence, AI advice with its confidence, and their justification in one place, so I can decide on the record rather than on trust. | P0 |
| JTBD-02.3 | PER-02 | When I am reading a case record, I want to tell instantly which statements a human made and which a model generated, so I can weigh each one appropriately before approving. | P0 |
| JTBD-02.4 | PER-02 | When separation of duties is what my accountability rests on, I want self-approval and clearance-without-an-approver to be impossible rather than discouraged, so oversight holds even when procedure is not followed. | P0 |
| JTBD-02.5 | PER-02 | When a clearance I approved is challenged after the fact, I want a complete attributed case history I can hand over in one action, so I can answer the challenge without assembling a record by hand. | P1 |
| JTBD-03.1 | PER-03 | When policy changes what should be flagged, I want to change validation behavior myself through configuration, so I can keep the system aligned with policy without queueing behind an engineering release. | P1 |
| JTBD-03.2 | PER-03 | When I am about to change a rule that drives everyone's queue, I want malformed configuration rejected and the effect visible before I trust it, so I can adjust behavior without breaking validation for the team. | P1 |
| JTBD-03.3 | PER-03 | When a walkthrough is about to run in front of stakeholders, I want one pre-flight signal covering database, seed data, and AI availability, so I can find problems before the audience does. | P1 |
| JTBD-03.4 | PER-03 | When a walkthrough has just finished and another is starting, I want to return the environment to a known pristine state in one action, so the next run is identical to the last without hand-editing data. | P1 |
| JTBD-03.5 | PER-03 | When I hold the keys to the configuration, I want my own inability to adjudicate enforced by the system and every change I make attributed to me, so my access does not become the weak point in the governance story. | P0 |
| JTBD-04.1 | PER-04 | When I am evaluating whether a governed capability was really built, I want to watch the whole thing run live against real seeded data, so I can judge a working system rather than a rehearsed demonstration. | P0 |
| JTBD-04.2 | PER-04 | When I am deciding whether this is acceptable in an enforcement context, I want to establish that the machine never took an action a human should have taken, so I can consider adoption at all. | P0 |
| JTBD-04.3 | PER-04 | When I have just watched a decision being made, I want to read its record immediately and find the whole basis for it there, so I can judge whether decisions here would be defensible six months later. | P0 |
| JTBD-04.4 | PER-04 | When I assess whether we could live with this system, I want to see a policy change made in front of me without a developer, so I can judge whether we would own the rules or the vendor would. | P1 |
| JTBD-04.5 | PER-04 | When claims are made about governance, I want them held true by tests and the simulation boundary stated plainly, so I can trust the narration and never mistake the demo for production. | P1 |

---

## PER-01: Marisol Reyes — Jobs

### JTBD-01.1: Order the Shift's Work Before Touching It

**Job Statement:**
When I start a shift with 20–40 flagged entries waiting and no sense of which are urgent, I want to see which shipments deserve my attention first, so I can spend my judgment on the highest-consequence cases instead of on ordering my own work.

**Current Alternatives:**
- Works down the list in arrival order, discovering severity only after opening each entry
- Cross-references three spreadsheets to estimate which shipments are aging or high-value
- Relies on email escalations, which arrive late and only for cases someone else already noticed

**Hiring Criteria:**
- Every flagged shipment appears in one list with shipment ID, importer, exception type, priority, and status visible without opening it
- Shipments carrying more than one exception are shown as multi-exception, never collapsed to a single headline problem
- Filtering by status, exception type, and priority and sorting by priority and age are available directly on the list
- The list reflects state changes made elsewhere in the workflow without a manual refresh cycle
- The list loads in under 1 second against the seeded dataset

**Success Measure:** Marisol selects her next case from the queue in under 15 seconds without opening any shipment she does not intend to work, and no multi-exception shipment is ever presented to her as a single-exception case.

**Related Features:** F17, F5, F16, F2
**Priority:** P0

---

### JTBD-01.2: Understand a Case Without Rebuilding It

**Job Statement:**
When I open a shipment I have never seen before and the entry data is scattered across commodity, classification, origin, manufacturer, and document fields, I want the reason it was flagged handed to me in plain language, so I can begin assessing it instead of reconstructing it.

**Current Alternatives:**
- Assembles importer, carrier, HTS, origin, manufacturer, and documents-received by hand before forming any view of the case
- Keeps policy references open in a second tab and cross-references classification and document requirements manually
- Accepts that the reconstruction, not the judgment, consumes most of the shift (PRD §2.1.1)

**Hiring Criteria:**
- Shipment identity, classification, origin, manufacturer, value, and documents-received state are all present on one screen with no navigation away from it
- A plain-language explanation of what the shipment is and why it was flagged is available on that same screen
- The explanation names the specific fields and documents involved rather than describing the problem abstractly
- The explanation is visibly labeled as machine-generated and carries its provider/model identifier and generation timestamp
- Shipment detail returns in under 1 second; the explanation returns within 5 seconds at p95, and a clearly labeled deterministic fallback is served rather than a blank screen if the provider does not answer within 10 seconds

**Success Measure:** Marisol states why the shipment was flagged in under 30 seconds of opening it, without leaving the Shipment Review screen and without consulting an external policy reference (PRD §7 Time to comprehension).

**Related Features:** F18, F7, F0, F3
**Priority:** P0

---

### JTBD-01.3: Verify the Machine's Account Against the Facts

**Job Statement:**
When a machine tells me what is wrong with a shipment and I am the one who will be asked to justify the call, I want the underlying field values in front of me at the same time, so I can confirm the conclusion myself before I stake my name on it.

**Current Alternatives:**
- Distrusts and ignores any summary she cannot check, falling back to reading raw entry data
- Opens the policy manual to establish which rule the flag corresponds to, because the flag does not say (PRD §2.1.2)
- Treats machine-produced conclusions as unverifiable and therefore unusable in a defensible recommendation

**Hiring Criteria:**
- Each exception names the rule that fired and its policy/authority reference
- Supporting evidence is shown as concrete field references and values — for example `country_of_origin = "Malaysia"` against `manufacturer.address.country = "China"` — not as prose
- For exceptions that depend on absent evidence, what is missing is stated explicitly
- Evidence and the triggering rule are displayed independently of the machine-generated narrative, so the narrative can be checked against them rather than taken on faith
- The advisory recommendation carries an explicit confidence level with a stated basis and a rationale traceable to the displayed evidence
- Every firing rule is retained and shown; none is suppressed in favour of a single headline exception

**Success Measure:** For 100% of exceptions Marisol reviews, both the triggering rule and at least one concrete field-level evidence value are displayed on screen, and she can point to the field that supports each claim in the machine-generated summary.

**Related Features:** F5, F19, F8
**Priority:** P0

---

### JTBD-01.4: Close a Documentation Gap Inside the Case

**Job Statement:**
When a shipment is held only because a required document never arrived, I want to request it, receive it, and re-test the shipment in one place, so I can close the gap without tracking the request in a side channel and losing sight of what is outstanding.

**Current Alternatives:**
- Requests the document by email and tracks the outstanding request in a personal spreadsheet disconnected from the shipment record
- Loses track of which requests are still open, so shipments sit in an unclear state
- Fixes the documentation issue and is then surprised the shipment is still held because other exceptions were never surfaced

**Hiring Criteria:**
- The request names a specific document type and is tied to the missing-document exception and the rule that requires it
- Requesting the document moves the case to an explicit information-requested state and records the request with requester and timestamp
- The received document attaches to the shipment's document set against the open request, with its provenance visible
- Re-testing the shipment happens automatically on receipt and can also be triggered manually from the review screen
- Resolved exceptions are marked resolved-by-revalidation rather than deleted, and every exception that still fires is retained and still visible
- The revalidation round-trip completes in under 2 seconds, and what changed is indicated inline

**Success Measure:** After the document is received, the missing-document exception resolves and 100% of still-firing exceptions are retained on the shipment — Marisol is never told a shipment is clear when another rule is still firing (PRD §7 Revalidation correctness).

**Related Features:** F10, F6, F13
**Priority:** P0

---

### JTBD-01.5: Commit to a Recommendation and Hand It Off Cleanly

**Job Statement:**
When I have reached a conclusion on a shipment but cannot clear it on my own authority, I want to commit to a recommendation with my reasoning attached and know it reached my supervisor, so I can hand the case off without wondering where it went.

**Current Alternatives:**
- Writes a recommendation in an email and hopes it is read before the shipment ages
- Discovers which actions she is not permitted to take only when an action silently fails or is greyed out with no explanation
- Records the outcome of her decision while her reasoning stays in her head (PRD §2.1.3)

**Hiring Criteria:**
- All five permitted actions are presented together — request additional information, send for specialist review, clear exception, place on hold, escalate to supervisor
- Actions unavailable to her role or to the current case state are visibly disabled **and state why**, rather than simply appearing inert
- A free-text justification is mandatory before any action can be submitted, and no action is pre-selected or auto-submitted
- Submitting a clearance recommendation moves the case to Pending Approval and makes it visibly distinct in the supervisor's queue
- A notification is generated and recorded against the action, so she can see the hand-off occurred
- Invalid transitions are rejected server-side with a clear reason rather than accepted and silently dropped

**Success Measure:** Every action Marisol submits carries a justification and produces an audit entry; she is never able to finalize a step with a required field missing, and every disabled action she encounters explains its own unavailability (PRD §6 Usability, §7 Audit completeness).

**Related Features:** F9, F11, F19, F12
**Priority:** P0

---

### JTBD-01.6: Defend a Decision I Made Months Ago

**Job Statement:**
When a decision I made months ago is questioned and I no longer remember the shipment, I want to see exactly what I was looking at when I made it, so I can defend the call rather than re-argue it from memory.

**Current Alternatives:**
- Reads a record that captured only the outcome, leaving the basis for the call unrecoverable (PRD §2.1.3)
- Searches old email threads and spreadsheets for context that was never attached to the case
- Reconstructs her reasoning after the fact, which reads as justification rather than record

**Hiring Criteria:**
- Every step she took is recorded automatically as she takes it, with no separate documentation task
- Each entry shows the exceptions involved, the evidence she reviewed, the advisory recommendation and its confidence, her decision, her justification, the timestamp, and her name and role
- The case history is chronological and human-readable, spanning ingestion, flagging, machine outputs, document request and receipt, revalidation, recommendation, and approval
- Entries are append-only — nothing she or anyone else did can be edited or removed after the fact
- The record is read-only by construction, with no edit or delete affordance anywhere on it

**Success Measure:** For any case Marisol previously touched, she can reconstruct what she reviewed and what she wrote without consulting any source outside the system, and 100% of her finalized decisions carry all 8 required audit fields.

**Related Features:** F20, F12, F14
**Priority:** P1

---

## PER-02: Dwayne Okafor — Jobs

### JTBD-02.1: Know What Is Waiting on My Signature

**Job Statement:**
When I check in on my team's workload several times a day, I want the work that is waiting on my signature separated from everything else, so I can clear approvals before shipments age instead of discovering the backlog after the fact.

**Current Alternatives:**
- Receives approval requests through informal channels, so a recommendation can sit unnoticed while the shipment ages
- Has no reliable read on team workload or which shipments are aging in which status, making escalation reactive
- Scans the whole queue manually to find items that need him

**Hiring Criteria:**
- Pending-approval items are visually distinct in the queue and never require hunting
- He sees the full queue across the whole team and every status, not only his own work
- Sorting by age and filtering by status, exception type, and priority are available so aging cases surface without manual comparison
- The queue reflects state changes made by specialists without requiring him to reload and re-filter
- His view is scoped by role server-side, so what he sees matches what he is authorized to act on

**Success Measure:** Dwayne locates every case awaiting his approval in a single filtered view in under 15 seconds, and no clearance recommendation reaches an aged state because he did not know it existed.

**Related Features:** F17, F11, F14
**Priority:** P0

---

### JTBD-02.2: Decide on the Record, Not on Trust

**Job Statement:**
When a specialist routes me a clearance recommendation and my name will be the one on the record, I want the exception, the evidence, the AI advice with its confidence, and the specialist's justification in one place, so I can decide on the record rather than on the strength of a summary.

**Current Alternatives:**
- Approves on the strength of a specialist's summary because the underlying evidence is not assembled at the point of decision
- Requests the backing material separately, delaying the decision and aging the shipment
- Cannot tell whether a machine-produced conclusion in the record was verified by the specialist or simply accepted (PRD §2.1.2, §2.1.4)

**Hiring Criteria:**
- The exception, the triggering rule with its policy reference, and the supporting field-level evidence are displayed at the point of decision
- The advisory recommendation, its confidence level with a stated basis, and its rationale are shown alongside — clearly advisory, never pre-selected
- The specialist's justification is present and attributable to them by name and role
- Approve, reject with a reason, and request-more-information are all available to him on a pending recommendation
- Rejecting returns the case to the specialist with the reason attached rather than closing it
- His decision, justification, identity, and timestamp are written to the record and generate a notification

**Success Measure:** For 100% of recommendations Dwayne adjudicates, the exception, evidence, advisory recommendation with confidence, and specialist justification are all visible on the decision screen without navigating away, and every rejection carries a recorded reason.

**Related Features:** F19, F11, F8, F12
**Priority:** P0

---

### JTBD-02.3: Tell Human Authorship from Machine Authorship Instantly

**Job Statement:**
When I am reading a case record and weighing whether to attach my name to a clearance, I want to tell instantly which statements a human made and which a model generated, so I can weigh each one appropriately instead of treating them as equivalent.

**Current Alternatives:**
- Treats all text in a case record as equally authoritative because authorship is not marked
- Assumes machine-produced conclusions were checked, with no way to confirm it
- Discounts the entire record when he cannot establish who wrote what

**Hiring Criteria:**
- Machine-generated content is visually labeled as such everywhere it appears, including inside the case history
- Every machine output displays its provider/model identifier, generation timestamp, and the evidence inputs it used
- The case history visually separates machine-authored content from human-authored decisions rather than interleaving them undifferentiated
- The advisory recommendation recorded on the case shows what the human was advised at the time they decided
- Labeling is consistent across every screen through shared components, not applied per screen

**Success Measure:** Every AI output Dwayne sees displays its provider/model identifier, generation timestamp, and evidence inputs and is visually labeled as AI-generated — he never has to ask who authored a statement in a case record (PRD §6 Explainability).

**Related Features:** F20, F12, F7, F16
**Priority:** P0

---

### JTBD-02.4: Rely on Structure Rather Than Procedure

**Job Statement:**
When separation of duties is the thing my accountability actually rests on, I want self-approval and any path to clearance without an approving official to be impossible rather than discouraged, so oversight holds even when procedure is not followed.

**Current Alternatives:**
- Relies on a procedural agreement that a specialist will not finalize their own recommendation, with nothing preventing it (PRD §2.1.6)
- Discovers a broken approval chain only during a later review, when the traceability is already gone
- Trusts interface behaviour that hides controls, without knowing whether the underlying operation is actually blocked

**Hiring Criteria:**
- Cleared status is reachable only through supervisor approval — there is no path to Cleared without a named approving official
- A specialist cannot approve their own recommendation, and the attempt is rejected server-side, not merely hidden in the interface
- Authorization is enforced server-side on every mutating operation; role checks are never client-only
- Unauthorized attempts are rejected and logged rather than silently ignored
- The rule-editing boundary holds too: he cannot edit rules, and the block is enforced the same way
- These constraints are asserted by automated tests covering each role against each protected operation

**Success Measure:** 0 shipments reach Cleared status without a recorded supervisor approving official, and self-approval is rejected server-side and verified by test — 100% of protected operations reject unauthorized roles (PRD §7 Human authority, RBAC enforcement).

**Related Features:** F11, F14, F21
**Priority:** P0

---

### JTBD-02.5: Answer a Challenge in One Action

**Job Statement:**
When a clearance I approved is challenged weeks later, I want a complete attributed case history I can hand over in one action, so I can answer the challenge without assembling a record by hand from scattered sources.

**Current Alternatives:**
- Assembles exports and printouts of a case history manually when a decision is challenged
- Cannot reconstruct the decision because the record captured the outcome but not the evidence, the recommendation considered, or the justification (PRD §2.1.3)
- Produces a partial record and accepts that the gaps weaken his position

**Hiring Criteria:**
- The full case history — ingestion, flagging, machine outputs, document request and receipt, revalidation, recommendation, approval, notifications — is retrievable as one chronological, attributed, timestamped record
- Every entry carries all eight required fields: exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, approving official, and generated notification
- A decision cannot be finalized at all if a required field is absent, so no historical record is incomplete
- The record exports or prints in a single action for offline review and escalation
- Generated notifications are shown alongside the decisions that produced them, with explicit generated-not-transmitted labeling

**Success Measure:** Dwayne produces a complete, chronological, attributed case history for any shipment in a single action, and 100% of finalized decisions in it contain all 8 required audit fields (PRD §7 Audit completeness).

**Related Features:** F20, F12, F13
**Priority:** P1

---

## PER-03: Priya Raghavan — Jobs

### JTBD-03.1: Change What Gets Flagged Without a Release

**Job Statement:**
When policy changes what should be flagged and I own the policy, I want to change validation behavior myself through configuration, so I can keep the system aligned with policy without queueing behind engineering priorities.

**Current Alternatives:**
- Files a change request and waits for a developer and a release, so policy changes queue behind engineering work
- Watches the system drift from the policy it is supposed to enforce because the rules live in code (PRD §2.1.5)
- Documents the intended behaviour in a side artifact that the running system does not read

**Hiring Criteria:**
- Rule definitions are persisted configuration carrying ID, name, exception type, description, policy reference, parameters, severity, priority mapping, and an enabled flag
- She can list, create, edit, enable, and disable rules within the three supported exception types from an administrative surface
- Editable parameters cover required document types, HTS expected digit count and format, origin-comparison fields, value thresholds, severity, and priority mapping
- No rule change requires editing source, rebuilding, or redeploying the application
- Evaluation stays deterministic: the same entry plus the same rule set always yields the same exceptions

**Success Measure:** Priya changes a rule parameter and sees the effect on validation results with **0 code changes and 0 redeploys** (PRD §7 Rule configurability).

**Related Features:** F15, F4
**Priority:** P1

---

### JTBD-03.2: Know a Rule Change Is Safe Before It Lands

**Job Statement:**
When I am about to change a rule that drives everyone's queue, I want malformed configuration rejected outright and the effect of the change visible before I trust it, so I can adjust behavior without breaking validation for the whole team.

**Current Alternatives:**
- Makes the change and finds out it was wrong when the queue behaves strangely or empties
- Has no way to see the impact of a configuration change before it lands on live validation results
- Avoids making changes at all, which is how the drift started

**Hiring Criteria:**
- Rule definitions are validated on save and malformed configuration is rejected with a message that states what was wrong
- Rejected configuration never reaches validation — there is no partially-applied state
- The effect of a change is previewable: either the shipments that would change are indicated, or the affected shipments can be revalidated on demand
- Revalidating after a change resolves exceptions that no longer fire, retains those that do, and surfaces newly triggered ones
- Before-and-after exception sets are written to the record so the effect of the change is inspectable afterwards

**Success Measure:** 100% of malformed rule configurations are rejected on save with a clear message and never reach validation, and Priya confirms the effect of every rule change through impact preview or revalidation before relying on it.

**Related Features:** F15, F6, F4
**Priority:** P1

---

### JTBD-03.3: Establish the Environment Is Demo-Ready Before Anyone Watches

**Job Statement:**
When a walkthrough is about to run in front of stakeholders and the environment being clean is my problem, I want one pre-flight signal covering database, seed data, and AI availability, so I can find problems before the audience does.

**Current Alternatives:**
- Clicks through the application manually before a demo to spot-check that data is present
- Finds out mid-demonstration that AI assistance is degraded or offline, with no prior signal
- Accepts that a repeat walkthrough is never quite identical to the first because setup is manual

**Hiring Criteria:**
- A single health check confirms database availability, seed data presence, and AI-assist availability including offline-fallback status
- The application starts with a single command, bound to a deterministic port so the preview URL is stable across restarts
- Seed output is deterministic, and the canonical solar-panel scenario appears identically on every run
- When AI assistance is running in offline-fallback mode, a degradation banner states so before and during the run
- The walkthrough completes end-to-end with the AI provider disabled, with the fallback clearly labeled

**Success Measure:** Priya confirms database, seed data, and AI-assist status in a single pre-demo check, and the full walkthrough completes successfully with the AI provider disabled and the fallback clearly labeled (PRD §7 AI availability resilience).

**Related Features:** F22, F2, F7
**Priority:** P1

---

### JTBD-03.4: Return to a Known State Between Runs

**Job Statement:**
When one walkthrough has just finished and another is starting, I want to return the environment to a known pristine state in one action, so the next run is identical to the last without hand-editing the database.

**Current Alternatives:**
- Cleans up demo state manually, or edits the database directly between runs
- Re-runs setup scripts and hopes the resulting data matches what the last run showed
- Accepts drift between runs, so a second walkthrough cannot be compared to the first

**Hiring Criteria:**
- One action resets the environment to pristine seeded state from an administrative surface, with no manual database intervention
- The seed script is safe to re-run and produces identical data every time, with deterministic IDs and timestamps
- The seeded set covers all three exception types, all queue statuses, at least one multi-exception shipment, and at least one already-cleared shipment with a complete historical record
- The canonical scenario is present verbatim: solar panels, origin Malaysia, manufacturer address in China, incomplete HTS code, $85,000 invoice value, required certificate missing
- Re-ingesting cargo entries is idempotent on shipment ID, so a refresh updates rather than duplicates
- Seed data, fixtures, logs, and prompts contain no real or personally identifiable data

**Success Measure:** **3 consecutive full walkthroughs after reset produce identical results**, with the canonical solar-panel shipment flagging all 3 expected exceptions on first ingestion and **0 instances of real or personally identifiable data** anywhere in the seeded environment (PRD §7 Walkthrough repeatability, Data safety).

**Related Features:** F22, F2, F1, F0
**Priority:** P1

---

### JTBD-03.5: Keep My Own Access from Becoming the Weak Point

**Job Statement:**
When I hold the keys to the configuration and the whole governance claim depends on role boundaries being real, I want my own inability to adjudicate enforced by the system and every change I make attributed to me, so my access does not become the hole in the story.

**Current Alternatives:**
- Relies on an understanding that administrators do not adjudicate, with nothing enforcing it
- Cannot say who changed a threshold or when, because configuration changes are untraceable
- Manages users and roles in a way that leaves acting identity ambiguous on the resulting records

**Hiring Criteria:**
- Her role cannot adjudicate or approve shipments, and attempts are rejected server-side and logged rather than hidden in the interface
- Authorization is enforced server-side on every mutating endpoint, including the rule endpoints restricted to her role
- She can manage users and roles so every acting user is named and correctly scoped
- Every rule change is recorded in the audit trail under her identity with a timestamp
- The acting user's name and role are stamped on every audit entry across all three roles

**Success Measure:** 100% of Priya's attempts to adjudicate or approve a shipment are rejected server-side and logged, and 100% of her rule changes appear in the audit trail attributed to her with a timestamp (PRD §7 RBAC enforcement, Governance).

**Related Features:** F14, F15, F12, F3
**Priority:** P0

---

## PER-04: Angela Pruitt — Jobs *(observer — no system account)*

### JTBD-04.1: Judge a Working System, Not a Rehearsal

**Job Statement:**
When I am evaluating whether a governed mission capability was really built rather than staged, I want to watch the whole thing run live against seeded data and probe it off-script, so I can judge a working system rather than a rehearsed click-path.

**Current Alternatives:**
- Watches demonstrations that follow a rehearsed happy path and collapse when a step is taken out of order
- Is shown working APIs presented as finished products, with no usable surface for the humans who would do the work (PRD §8)
- Discounts the demonstration entirely and asks for a pilot instead, delaying any decision by months

**Hiring Criteria:**
- All 10 walkthrough steps run end-to-end in the deployed preview environment with no manual data entry and no developer intervention
- The four primary screens are the surface she evaluates — queue, review, resolution, audit record — navigable in any order, not only the demo sequence
- Off-script cases are available in the seeded data, including a multi-exception shipment and an already-cleared shipment with a complete historical record
- Steps can be taken out of sequence without breaking the application state
- Every data-backed view has defined loading, empty, and error states, so an unexpected path degrades visibly rather than silently
- The environment can be reset and re-run in front of her

**Success Measure:** **10 of 10 walkthrough steps complete end-to-end** in the preview environment with zero manual data entry and zero developer intervention, and every out-of-sequence or off-script request Angela makes is served by the running system (PRD §7 Walkthrough completion).

**Related Features:** F16, F17, F18, F19, F20, F22
**Priority:** P0

---

### JTBD-04.2: Establish That the Machine Never Acted

**Job Statement:**
When I am deciding whether this is acceptable in a customs enforcement context, I want to establish that the machine never took an action a human should have taken, so I can consider adoption at all rather than rejecting it on principle.

**Current Alternatives:**
- Rejects automation in an enforcement context regardless of accuracy, because there is no way to accept a system that can act autonomously (PRD §2.1.4)
- Asks the vendor what the system can do unattended and receives a narrated assurance with nothing behind it
- Requires a manual parallel process alongside any tool, eliminating the benefit

**Hiring Criteria:**
- The machine's recommendation is inert until a human selects an action — it recommends one of the five actions and never executes one
- No action can be initiated by the AI or by any automated process; there are no schedulers, queues, or webhooks acting on cases
- Clearance always requires supervisor approval, and Cleared is unreachable without a named approving official
- The screens state explicitly that the AI recommends and the human decides, with no action pre-selected or auto-submitted
- These constraints are asserted by automated tests, not only by design intent

**Success Measure:** **0 AI-initiated actions** and **0 clearances without a recorded approving official** across the entire evaluation session, including on cases Angela selects herself (PRD §7 Human authority).

**Related Features:** F8, F9, F11, F21
**Priority:** P0

---

### JTBD-04.3: Test Whether a Decision Would Survive Scrutiny

**Job Statement:**
When I have just watched a decision being made in front of me, I want to read its record immediately and find the whole basis for it there, so I can judge whether decisions made in this system would be defensible six months from now.

**Current Alternatives:**
- Reviews historical decisions that recorded only the outcome, leaving the reasoning unrecoverable and the decision indefensible (PRD §2.1.3)
- Accepts machine-generated text she cannot trace to a specific field or document, and therefore cannot sign off on it
- Requires a separate manual documentation process to produce a defensible record

**Hiring Criteria:**
- The record for a decision she just watched is available immediately, chronological and human-readable
- Each entry shows the exceptions involved, the evidence reviewed, the AI recommendation and its confidence, the human decision, the justification, the timestamp, the acting user and role, and the approving official
- Every machine-generated claim in the record traces to a specific field value or document, not to prose
- Entries are append-only and read-only by construction, with no edit or delete affordance anywhere
- Generated notifications appear alongside the decisions that produced them
- A decision cannot be finalized at all with a required field absent, so incompleteness is impossible rather than unlikely

**Success Measure:** **100% of finalized decisions carry all 8 required audit fields**, demonstrated on a case Angela selects herself, and every machine-generated statement in that record is traceable to a displayed field value or document (PRD §7 Audit completeness).

**Related Features:** F12, F20, F13
**Priority:** P0

---

### JTBD-04.4: Establish Who Would Own the Policy Afterwards

**Job Statement:**
When I am assessing whether we could actually live with this system, I want to see a policy change made in front of me without a developer, so I can judge whether we would own the rules or be dependent on the vendor to rebuild.

**Current Alternatives:**
- Expects to be told that any policy change requires the vendor to rebuild, and prices that dependency into the decision
- Rejects rapidly built systems as rigid on the assumption that speed was bought with hardcoded logic
- Commissions a separate configurability assessment before committing

**Hiring Criteria:**
- Rule definitions are visibly configuration — type, severity, enabled state, policy reference, and editable parameters — not code
- A rule parameter is changed live in front of her by the administrator role, with no code change and no redeploy
- The effect of the change on validation results is visible immediately, through impact preview or revalidation of affected shipments
- The change is recorded in the audit trail under the administrator's identity with a timestamp, so configuration drift stays traceable
- Adding a fourth exception type is stated as an explicit scope decision rather than presented as a limitation

**Success Measure:** A rule parameter is changed in front of Angela and the effect on validation is visible with **0 code changes and 0 redeploys**, with the change attributed to a named administrator in the audit trail (PRD §7 Rule configurability).

**Related Features:** F15, F4, F2
**Priority:** P1

---

### JTBD-04.5: Confirm the Claims Are Held by Something Other Than Narration

**Job Statement:**
When strong governance claims are being made to me during a demonstration, I want them held true by tests and the simulation boundary stated plainly, so I can trust what I am being told and never mistake a demo for production.

**Current Alternatives:**
- Weighs demonstration narration against her own experience and discounts most of it
- Discovers after procurement that a demonstrated behaviour was staged rather than implemented
- Treats every simulated element as a potential misrepresentation because the boundary was never stated

**Hiring Criteria:**
- A green test suite demonstrably covers the rule, workflow-transition, RBAC, and audit-completeness claims, including blocked self-approval and blocked rule editing by non-administrators
- Rule tests cover each of the three exception types positive and negative, multi-exception shipments, and configuration-driven parameter changes
- An end-to-end test executes all ten walkthrough steps against seeded data
- Notifications are labeled generated-not-transmitted, login is labeled simulated, and a demo-mode indicator is visible
- Scope discipline is recorded as decisions: exactly three exception types, four primary screens, exclusions stated rather than omitted

**Success Measure:** The test suite is green and covers 100% of the specified rule, workflow-transition, RBAC, and audit-completeness behaviors, and Angela never mistakes a simulated element for a production one — the simulation boundary is labeled at every point she encounters it (PRD §7 Automated test coverage, §8).

**Related Features:** F21, F13, F14, F16
**Priority:** P1

---

## Outcome-to-Feature Traceability

| JTBD ID | Feature | Expected Outcome |
|---------|---------|-----------------|
| JTBD-01.1 | F17, F5, F16, F2 | Next case selected from a prioritized queue in <15s; multi-exception shipments never collapsed to one |
| JTBD-01.2 | F18, F7, F0, F3 | Flagging reason understood in <30s on one screen, without external policy reference |
| JTBD-01.3 | F5, F19, F8 | Triggering rule + concrete field-level evidence shown for 100% of exceptions, independent of AI narrative |
| JTBD-01.4 | F10, F6, F13 | Missing-document exception resolves on receipt; 100% of still-firing exceptions retained |
| JTBD-01.5 | F9, F11, F19, F12 | Every action carries a justification and an audit entry; every disabled action explains itself |
| JTBD-01.6 | F20, F12, F14 | Past decision fully reconstructable from the system alone; all 8 audit fields present |
| JTBD-02.1 | F17, F11, F14 | Pending-approval work visually distinct and locatable in <15s across the whole team |
| JTBD-02.2 | F19, F11, F8, F12 | Exception, evidence, AI advice + confidence, and specialist justification all present at decision point |
| JTBD-02.3 | F20, F12, F7, F16 | 100% of AI outputs labeled with provider/model, timestamp, and evidence inputs |
| JTBD-02.4 | F11, F14, F21 | 0 clearances without an approving official; self-approval rejected server-side and asserted by test |
| JTBD-02.5 | F20, F12, F13 | Complete attributed case history exported in a single action |
| JTBD-03.1 | F15, F4 | Rule parameter changed with 0 code changes and 0 redeploys |
| JTBD-03.2 | F15, F6, F4 | Malformed configuration rejected on save; change effect visible before it is trusted |
| JTBD-03.3 | F22, F2, F7 | Single pre-flight check covers DB, seed, and AI status; walkthrough completes with AI disabled |
| JTBD-03.4 | F22, F2, F1, F0 | 3 consecutive post-reset walkthroughs identical; 0 real or PII data present |
| JTBD-03.5 | F14, F15, F12, F3 | Administrator adjudication rejected server-side and logged; 100% of rule changes attributed |
| JTBD-04.1 | F16, F17, F18, F19, F20, F22 | 10 of 10 steps complete live with zero manual entry and zero developer intervention |
| JTBD-04.2 | F8, F9, F11, F21 | 0 AI-initiated actions; 0 clearances without a named approving official |
| JTBD-04.3 | F12, F20, F13 | 100% of finalized decisions carry all 8 audit fields on a stakeholder-selected case |
| JTBD-04.4 | F15, F4, F2 | Live policy change demonstrated with 0 code changes, attributed in the audit trail |
| JTBD-04.5 | F21, F13, F14, F16 | Test suite green across rule, workflow, RBAC, audit claims; simulation boundary labeled throughout |

**Coverage check:** all 23 PRD features (F0–F22) appear in at least one job. Every persona has at least two jobs — PER-01 has 6, PER-02 has 5, PER-03 has 5, PER-04 has 5. No job is duplicated across personas: PER-01's jobs end at recommendation, PER-02's begin at adjudication, PER-03's are configuration and environment only, and PER-04's are evaluation jobs performed without a system account.

---

## NaC Preview

Candidate Natural Acceptance Criteria derived from each job's success measure. These are refined into acceptance criteria in STORY-MAP-CargoDemo.

| JTBD ID | Outcome | Candidate NaC |
|---------|---------|--------------|
| JTBD-01.1 | Prioritized work selection | Given the seeded dataset, when a specialist opens the exception queue, then every flagged shipment shows ID, importer, exception type, priority, and status, multi-exception shipments are marked as such, and the list renders in under 1 second |
| JTBD-01.2 | Comprehension without reconstruction | Given a flagged shipment, when a specialist opens Shipment Review, then shipment data, documents-received state, validation results, and a labeled plain-language summary are all present on that screen with no navigation, and detail loads in under 1 second |
| JTBD-01.3 | Verifiable evidence | Given any detected exception, when it is displayed, then its triggering rule with policy reference and at least one concrete field reference and value are shown independently of the AI narrative |
| JTBD-01.4 | Correct revalidation | Given a shipment with a missing-document exception and other firing exceptions, when the requested document is uploaded, then the missing-document exception is marked resolved-by-revalidation, all other still-firing exceptions are retained, and the round-trip completes in under 2 seconds |
| JTBD-01.5 | Justified, routed action | Given the Recommended Resolution screen, when a specialist attempts to submit any action without a justification, then submission is rejected; and every disabled action displays the reason it is unavailable |
| JTBD-01.6 | Reconstructable reasoning | Given a case the specialist previously acted on, when she opens its audit record, then every step shows exceptions, evidence reviewed, AI recommendation and confidence, decision, justification, timestamp, and acting user and role, with no edit or delete affordance |
| JTBD-02.1 | Visible approval backlog | Given cases in Pending Approval, when a supervisor opens the queue, then those items are visually distinct from all other statuses and filterable in one step, across all specialists |
| JTBD-02.2 | Decision on the record | Given a pending specialist recommendation, when a supervisor opens it, then exception, triggering rule, evidence, AI recommendation with confidence and rationale, and the specialist's named justification are all displayed, and approve / reject-with-reason / request-info are all available |
| JTBD-02.3 | Authorship distinguishable | Given any AI-generated output anywhere in the application, when it is displayed, then it is visually labeled as AI-generated and shows provider/model identifier, generation timestamp, and evidence inputs used |
| JTBD-02.4 | Structural separation of duties | Given a specialist who submitted a recommendation, when that same user attempts to approve it, then the request is rejected server-side and logged; and no state transition reaches Cleared without a recorded approving official |
| JTBD-02.5 | One-action defensible export | Given any case with a finalized decision, when a supervisor exports the audit record, then the export contains the complete chronological history with all 8 required fields per finalized decision and its generated notifications |
| JTBD-03.1 | Configuration-owned rules | Given an administrator, when a rule parameter is changed and affected shipments are revalidated, then validation results reflect the change with no code change and no application restart |
| JTBD-03.2 | Safe rule change | Given a malformed rule definition, when it is saved, then it is rejected with a message identifying what is invalid, and the prior rule set remains in effect for validation |
| JTBD-03.3 | Pre-flight readiness | Given the deployed environment, when the health check runs, then it reports database availability, seed data presence, and AI-assist availability including fallback status; and with the AI provider disabled the full walkthrough still completes with the fallback labeled |
| JTBD-03.4 | Deterministic reset | Given a used environment, when the administrator resets to seeded state, then the canonical solar-panel shipment appears identically with all 3 expected exceptions, and 3 consecutive walkthroughs after reset produce identical results with no real or PII data anywhere |
| JTBD-03.5 | Administrator boundary enforced | Given an administrator, when an approve or adjudicate operation is attempted, then it is rejected server-side and logged; and every rule change is written to the audit trail with the administrator's identity and timestamp |
| JTBD-04.1 | Live end-to-end capability | Given the seeded preview environment, when the 10 walkthrough steps are executed in order and then out of order, then all steps complete without manual data entry or developer intervention and no step leaves the application in a broken state |
| JTBD-04.2 | No autonomous action | Given a full evaluation session, when the audit records for all touched cases are examined, then 0 entries show an AI-initiated action and 0 shipments show Cleared status without a recorded approving official |
| JTBD-04.3 | Immediate defensibility | Given a decision just finalized during the session, when its audit record is opened, then all 8 required fields are present and every AI-generated claim references a displayed field value or document |
| JTBD-04.4 | Customer-owned policy | Given a stakeholder observing, when a rule parameter is changed live and its effect shown, then validation results change with 0 code changes and 0 redeploys and the change is attributed to a named administrator with a timestamp |
| JTBD-04.5 | Claims held by tests | Given the repository, when the test suite runs, then it passes and includes rule tests for all three exception types (positive, negative, multi-exception, parameter-change), all valid and invalid workflow transitions, each role against each protected operation, audit-completeness and append-only enforcement, and an end-to-end run of all ten walkthrough steps |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
