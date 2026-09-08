# CargoDemo

## What This Is

CargoDemo is a governed cargo exception-handling application for U.S. Customs and Border Protection (CBP) cargo specialists. It receives simulated cargo entries, validates them against configurable business rules, places failures into a review queue, explains each exception in plain language with an AI-generated summary, recommends a resolution action, requires human approval, and maintains a complete audit trail of every decision.

It is a demonstration artifact: it proves that Pivota can generate a working, governed mission capability — data model, UI, validation workflow, rules, AI assistance, RBAC, approvals, notifications, audit logging, and tests — from a short mission requirement statement.

## Core Value

A cargo specialist can open a flagged shipment, immediately understand *why* it was flagged and what evidence triggered it, and resolve it through a human-authored decision that is permanently traceable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Ingest simulated cargo entries from a cargo-entry JSON file (or lightweight local API) — no ACE integration
- [ ] Validate each entry against configurable business rules covering three exception types: missing required document, invalid/incomplete HTS code, conflicting country-of-origin
- [ ] Cargo Exception Queue screen: list of flagged shipments with shipment ID, importer, exception, priority, status; selectable rows
- [ ] Shipment Review screen: importer, carrier, product description, HTS code, country of origin, manufacturer, shipment value, documents received, validation results
- [ ] AI-assisted plain-language shipment summary explaining the detected exception(s)
- [ ] Recommended Resolution screen: exception detected, triggering rule/policy, supporting evidence, missing information, recommended action, confidence level
- [ ] Available user actions: request additional information, send for specialist review, clear exception, place on hold, escalate to supervisor
- [ ] Human-in-the-loop authority — the AI recommends, the user decides; no autonomous clearance
- [ ] Document request + simulated document upload, followed by shipment revalidation
- [ ] Supervisor approval step for specialist-recommended clearance
- [ ] Decision and Audit Record: exception, evidence reviewed, AI recommendation, user decision, justification, timestamp, approving official, generated notification
- [ ] Role-based access control for three roles: Cargo Specialist, Supervisor, System Administrator
- [ ] Notification generation on decision/state change
- [ ] Configurable business rules manageable by the System Administrator
- [ ] Seeded synthetic dataset of 10–15 shipments spanning all three exception types and all queue statuses
- [ ] Automated tests covering validation rules, workflow transitions, RBAC, and audit-record completeness

### Out of Scope

- Live ACE (Automated Commercial Environment) integration — simulated via JSON file/local API to keep the demo focused on mission capability rather than integration complexity
- Exception types beyond the three named (e.g. valuation fraud, sanctions screening, tariff engineering) — first demo is deliberately narrow
- Real importer/carrier data or any PII — synthetic data only
- Production authentication (PIV/CAC, SSO) — role selection/simulated login is sufficient for the demo
- Real outbound email/SMS delivery — notifications are generated and recorded, not transmitted
- Machine-learning model training — AI summaries and recommendations are generated at request time, not trained in-app
- Mobile-native applications — web-first
- Multi-port / multi-tenant configuration

## Context

- **Audience:** CBP stakeholders evaluating whether a governed mission application can be generated rapidly. The demo narrative matters as much as the code — it must survive a live 10-step walkthrough.
- **Demo sequence the app must support end-to-end:** show the exception queue → open a flagged shipment → show the AI summary → display the triggering rule and evidence → request a missing document → upload the simulated document → revalidate → specialist recommends clearance → supervisor approves → show the complete audit trail.
- **Canonical example scenario:** solar panels, country of origin Malaysia, manufacturer address in China, incomplete HTS code, invoice value $85,000, required certificate missing. The app must detect: origin inconsistency, incomplete HTS classification, missing supporting document, and flag for manual review.
- **Governance framing:** every AI output must be attributable and explainable, every state change must be attributable to a named official, and the audit trail must be complete enough to defend a decision after the fact.
- **Four screens only.** Additional surfaces (rule administration, role switching) exist to support the four, not to expand the demo.

## Constraints

- **Integration**: No ACE connection — cargo entries arrive from a JSON file or lightweight local API. Keeps the demo about mission capability, not integration plumbing.
- **Scope**: Exactly three exception types and four primary screens. A narrow first demo is a deliberate decision, not a limitation to be relaxed during build.
- **Data**: 10–15 synthetic shipments, no real or personally identifiable data. Enables safe public demonstration.
- **Governance**: AI never takes a final action. Human approval is required for every resolution — this is the central claim of the demo.
- **Auditability**: Every decision must record evidence reviewed, AI recommendation, human decision, justification, timestamp, and approving official. An unauditable decision is a failed demo.
- **Roles**: Exactly three roles — Cargo Specialist, Supervisor, System Administrator.
- **Deployment**: Must run in a sandboxed preview environment (web app, dev server bound to 0.0.0.0 on a deterministic port).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Simulate ACE via cargo-entry JSON/local API instead of integrating | Integration complexity would dominate the build and obscure the mission capability being demonstrated | — Pending |
| Limit to three exception types (missing document, invalid HTS, origin conflict) | A narrow demo is credible and completable; breadth adds rule surface without adding narrative value | — Pending |
| AI recommends, human decides — no autonomous clearance | Preserving human authority is the core governance claim to CBP | — Pending |
| Three roles with a specialist → supervisor approval chain | Demonstrates separation of duties and approval traceability with minimum role sprawl | — Pending |
| Business rules are configuration, not hardcoded logic | Lets the System Administrator role be meaningful and shows generated apps remain adaptable | — Pending |
| Web application, four primary screens | Matches the demo sequence exactly and keeps the preview embeddable | — Pending |
| Synthetic seed data of 10–15 shipments covering all exception types and statuses | Every screen and workflow step must be demonstrable without manual data entry | — Pending |

---
*Last updated: 2026-09-08 after initialization*
