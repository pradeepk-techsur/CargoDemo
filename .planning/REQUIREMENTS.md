# Requirements: CargoDemo

**Defined:** 2026-09-08
**Core Value:** A cargo specialist can open a flagged shipment, immediately understand *why* it was flagged and what evidence triggered it, and resolve it through a human-authored decision that is permanently traceable.

**Source:** Requirement IDs are preserved verbatim from `project_specs/PRD-CargoDemo.md` §9 (Feature Index). Downstream traceability to FRD sections, TechArch specs, user stories and test IDs lives in `project_specs/RTM-CargoDemo.md`.

**Acceptance narrative:** the 10-step demo walkthrough (PRD §3.2, JOURNEYS `JRN-01.1`) is the primary acceptance criterion for v1. A requirement is not done if the walkthrough cannot pass through it.

## v1 Requirements

All 23 features are committed v1 scope. The project was routed to phase planning specifically so the full walkthrough — including AI explanation, human approval and the audit trail — ships in v1 rather than being deferred.

### Platform & Data Foundation

- [ ] **F0**: Cargo entries, exceptions, cases, documents, decisions and audit entries persist in a defined schema with append-only audit constraints and a separation-of-duties constraint on clearance
- [ ] **F1**: System ingests simulated cargo entries from a cargo-entry JSON file or lightweight local API, with no ACE connection
- [ ] **F2**: A synthetic seed dataset of 10–15 shipments loads on boot, covering all three exception types, all queue statuses, and the canonical solar-panel scenario
- [ ] **F3**: A backend HTTP API exposes shipments, rules, workflow actions, documents, AI assistance, audit and notifications

### Rules & Validation

- [ ] **F4**: A configurable business rule engine evaluates cargo entries against stored rules covering exactly three exception types — missing required document, invalid/incomplete HTS code, conflicting country-of-origin — with no code change required to alter rule configuration
- [ ] **F5**: The engine detects exceptions, captures field-level supporting evidence and the triggering rule, assigns severity and priority, and flags the shipment for manual review
- [ ] **F6**: A user can revalidate a shipment after new information arrives; satisfied exceptions close, unsatisfied exceptions are retained, and the revalidation is recorded

### AI Assistance (explain and recommend — never decide)

- [ ] **F7**: A cargo specialist sees a plain-language AI summary explaining the detected exceptions, visually distinguishable from human-authored and deterministic system content, and never presented as an official finding
- [ ] **F8**: A cargo specialist sees a recommended resolution action with a confidence level and its basis; the recommended action is always computed deterministically and the whole walkthrough completes with the AI provider disabled

### Workflow, Approvals & Governance

- [ ] **F9**: A user can take the five workflow actions — request additional information, send for specialist review, clear exception, place on hold, escalate to supervisor — governed by a state machine that permits each action only from valid states for the user's role
- [ ] **F10**: A cargo specialist can request a missing document and upload a simulated document against that request, with the upload validated before acceptance
- [ ] **F11**: A cargo specialist recommends clearance and a supervisor approves it; clearance is unreachable without an approving official distinct from the recommending specialist
- [ ] **F12**: Every decision writes an append-only audit record capturing exception, evidence reviewed, AI recommendation, user decision, decision justification, timestamp, approving official and generated notification
- [ ] **F13**: The system generates and records a notification on each decision and state change, without transmitting real email or SMS

### Access Control & Administration

- [ ] **F14**: A user selects one of exactly three roles — Cargo Specialist, Supervisor, System Administrator — and every action is enforced server-side against that role
- [ ] **F15**: A System Administrator can view and change business rule configuration, and see the impact of a change, without a code change or redeploy

### User Interface — four primary screens (required surface)

- [ ] **F16**: An application shell provides navigation between the four screens and a role switcher; every nav item resolves to a route the app actually serves
- [ ] **F17**: The Cargo Exception Queue screen lists flagged shipments with shipment ID, importer, exception, priority and status, and opens the selected shipment for review
- [ ] **F18**: The Shipment Review screen shows importer, carrier, product description, HTS code, country of origin, manufacturer, shipment value, documents received, validation results and the AI summary
- [ ] **F19**: The Recommended Resolution screen shows the exception detected, the triggering rule or policy, supporting evidence, missing information, the recommended action and confidence level, with the five actions available and unavailable ones visibly unavailable with a stated reason
- [ ] **F20**: The Decision & Audit Record screen shows the complete, read-only audit trail for a shipment with no edit or delete affordance anywhere

### Quality & Demo Readiness

- [ ] **F21**: An automated test suite covers the validation rules, workflow transitions, RBAC, separation of duties, audit-record completeness and the end-to-end walkthrough
- [ ] **F22**: The demo environment boots seeded and reachable in the sandboxed preview, and can be reset to a known state deterministically

## v2 Requirements

(None — the full v1 feature set was deliberately retained. Items considered for deferral during the express scope audit were pulled back into v1 because each is load-bearing for the acceptance narrative or for one of the three governance claims.)

## Out of Scope

Recorded decisions from PRD §5.8, not omissions. Nothing here may be silently reintroduced during build.

| Feature | Reason |
|---------|--------|
| Live ACE integration | Simulated via cargo-entry JSON / local API (F1) to keep the demo focused on mission capability rather than integration complexity |
| Exception types beyond the three named (valuation fraud, sanctions screening, tariff engineering) | The first demo is deliberately narrow; breadth adds rule surface without adding narrative value |
| Real importer/carrier data or any PII | Synthetic data only (F2), enabling safe public demonstration |
| Production authentication (PIV/CAC, SSO) | Simulated login / role selection (F14) is sufficient for the demo |
| Real outbound email/SMS delivery | Notifications are generated and recorded (F13), not transmitted |
| Machine-learning model training | AI summaries and recommendations are generated at request time (F7, F8), not trained in-app |
| Mobile-native applications | Web-first; the web UI is responsive but there is no native app |
| Multi-port / multi-tenant configuration | Single-tenant, single-port demo deployment |
| Screens beyond the four primary screens | Rule administration (F15) and role switching (F16) exist only to support the four, not to expand the demo |
| Autonomous clearance or any AI-initiated action | Governance constraint: the AI recommends, the human decides — the central claim of the demo |
| Background/async jobs, schedulers, queues, webhooks | All processing is request-time in a single-session demo |

## Traceability

Populated during roadmap creation (2026-09-08). Phase definitions live in `.planning/ROADMAP.md`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| F0 | Phase 1 | Pending |
| F1 | Phase 1 | Pending |
| F2 | Phase 1 | Pending |
| F3 | Phase 1 | Pending |
| F4 | Phase 2 | Pending |
| F5 | Phase 2 | Pending |
| F6 | Phase 4 | Pending |
| F7 | Phase 2 | Pending |
| F8 | Phase 3 | Pending |
| F9 | Phase 3 | Pending |
| F10 | Phase 4 | Pending |
| F11 | Phase 5 | Pending |
| F12 | Phase 3 | Pending |
| F13 | Phase 3 | Pending |
| F14 | Phase 1 | Pending |
| F15 | Phase 6 | Pending |
| F16 | Phase 2 | Pending |
| F17 | Phase 2 | Pending |
| F18 | Phase 2 | Pending |
| F19 | Phase 3 | Pending |
| F20 | Phase 4 | Pending |
| F21 | Phase 5 | Pending |
| F22 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23 ✓
- Unmapped: 0
- Duplicates (mapped to more than one phase): 0

**By phase:**

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1. Seeded, Governed, Servable Foundation | F0, F1, F2, F3, F14, F22 | 6 |
| 2. The Flagged Shipment, Explained | F4, F5, F7, F16, F17, F18 | 6 |
| 3. The Decision Point | F8, F9, F12, F13, F19 | 5 |
| 4. Close the Gap and Show the Record | F6, F10, F20 | 3 |
| 5. Named Authority, Proven | F11, F21 | 2 |
| 6. The Policy Is Yours | F15 | 1 |

---
*Requirements defined: 2026-09-08*
*Last updated: 2026-09-08 after roadmap creation (traceability populated, 23/23 mapped)*
