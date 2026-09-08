
### JRN-04.2: Going Off Script — Out of Order, Provider Off, Rule Changed, Tests Run

**Persona:** PER-04 (Angela Pruitt)
**Scenario:** The scripted walkthrough finished cleanly, which tells Angela almost nothing — every demonstration she has been shown finished cleanly. The half hour that follows is the part that decides her assessment. She asks for steps out of sequence, picks cases nobody prepared, has the AI provider switched off mid-session, watches a rule parameter changed live by an administrator she has not seen operate before, and asks to see the test suite that supposedly holds the governance claims true. She still touches nothing herself; she directs, and she watches the four screens answer.
**Related Jobs:** JTBD-04.1, JTBD-04.2, JTBD-04.4, JTBD-04.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Break the sequence | Asks them to open the audit record first, then jump back to the queue, then into a review screen for an unrelated shipment | Observed: Decision & Audit Record (F20) → Cargo Exception Queue (F17) → Shipment Review (F18) | "The demo runs in one order. Does the application?" | Testing | Rehearsed click-paths that break the moment the sequence changes | The four screens are navigable in any order rather than only in walkthrough order, and each has defined loading, empty and error states | Every screen loads directly and independently; no step leaves the application in a broken state; nothing depends on having arrived from the previous screen |
| Pick her own cases | Chooses two cases nobody offered her: a multi-exception shipment and an already-cleared one with a historical record | Observed: Cargo Exception Queue (F17) → Shipment Review (F18) → Decision & Audit Record (F20) | "Not the shipment you rehearsed. These two." | Deliberate | Seed data that only exercises the demonstrated path, leaving everything else empty | The seeded set covers all three exception types and all queue statuses, including a multi-exception case and a pre-cleared case with a complete historical record | Both cases render fully; the cleared one replays a complete attributed history including its approving official; the multi-exception one shows every firing rule, none suppressed |
| Cut the AI off | Asks what happens when the AI provider is unavailable, and has it disabled while she watches | Observed: Shipment Review (F18) → AI summary panel, degradation banner (F7, F8, F22) | "Every AI demo I've seen has a network dependency it doesn't mention. Where's yours?" | Sharp, expectant | Demonstrations that collapse when a dependency is unavailable, having never disclosed the dependency | A deterministic offline fallback is served and labeled as such, so degradation is a stated mode rather than a failure | Fallback summary and fallback recommendation are served and **clearly labeled as fallback**; a degradation banner is displayed; the walkthrough continues to completion with the provider disabled |
| Watch a policy change | Asks whether a policy change needs the vendor; watches Priya change a rule parameter live and revalidate the affected shipments | Observed: Rule Administration (F15) → Shipment Review (F18) validation results (F6) | "Who owns the rules after you leave? That's the whole procurement question." | Genuinely surprised | Rapidly built systems that are rigid, where any policy change means the vendor rebuilds | Rules are visible as configuration — type, severity, enabled state, policy reference, editable parameters — and the change lands without a developer | Parameter changed and validation results updated with **0 code changes and 0 redeploys**; the change is recorded in the audit trail attributed to a named administrator with a timestamp |
| Ask for the proof | Asks to see the tests behind the claims: self-approval blocked, non-administrators blocked from editing rules, audit completeness, all ten steps | Observed: test suite output (F21) | "Narration is not evidence. Show me the thing that fails if this stops being true." | Rigorous | Governance claims held true by a presenter's assurance and nothing else | The claims she cares about are asserted by tests she can watch run, including an end-to-end execution of all ten steps | Test suite runs green, covering the three exception types (positive, negative, multi-exception, parameter change), all valid and invalid workflow transitions, each role against each protected operation, audit completeness and append-only enforcement, and the full ten-step walkthrough |
| Check the boundary | Confirms the simulation boundary is stated wherever she encounters it — login, notifications, demo mode, ingestion source | Observed: shell (F16), notifications (F13), Shipment Review documents panel (F10) | "I need to be certain that nobody in this room walks out thinking this is in production." | Settled | Simulated elements presented ambiguously, so a demo gets read as a deployed system | The boundary is labeled at every point she meets it, and the exclusions are recorded as decisions rather than omitted | Simulated-login labeling, "generated, not transmitted" on every notification, a visible demo-mode indicator, and document provenance shown as seeded or simulated-upload on every document |

#### Key Moments

- **Decision Point — Watch a policy change:** this is the moment her assessment turns from "impressive build" to "system we could own", or does not. Everything before it was about whether the demo works; this is about what happens after the vendor leaves.
- **Decision Point — Ask for the proof:** a green suite covering the specific claims converts narration into evidence; an absent or unrelated suite retroactively devalues everything she has been told.
- **Delight Opportunity — Cut the AI off:** a labeled fallback that keeps the walkthrough running answers a question she expected to end the meeting on.
- **Risk of Abandonment — Break the sequence:** a single broken screen outside the rehearsed order confirms her prior that this is a script, and nothing after it recovers her attention.

#### Success Outcome

Every out-of-sequence and off-script request Angela makes **is served by the running system** (JTBD-04.1). A rule parameter is changed in front of her and the effect on validation is visible with **0 code changes and 0 redeploys**, attributed to a named administrator (JTBD-04.4, PRD §7 Rule configurability). The walkthrough **completes with the AI provider disabled and the fallback clearly labeled** (PRD §7 AI availability resilience). The test suite is green across **100% of the specified rule, workflow-transition, RBAC and audit-completeness behaviors**, and Angela never mistakes a simulated element for a production one (JTBD-04.5).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Break the sequence | F16, F17, F18, F20 |
| Pick her own cases | F17, F18, F20, F2 |
| Cut the AI off | F18, F7, F8, F22 |
| Watch a policy change | F15, F4, F6, F12 |
| Ask for the proof | F21 |
| Check the boundary | F16, F13, F14, F10 |

---
