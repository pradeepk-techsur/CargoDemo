
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
