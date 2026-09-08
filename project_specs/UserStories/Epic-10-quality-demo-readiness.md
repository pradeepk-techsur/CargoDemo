
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
