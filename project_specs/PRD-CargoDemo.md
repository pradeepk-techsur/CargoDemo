# Product Requirements Document (PRD)
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Author** | Pivota Spec Framework (PRD Generator) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | FRD-CargoDemo, TechArch-CargoDemo, UserStories-CargoDemo |

---

## 1. Executive Summary

CargoDemo is a governed cargo exception-handling web application for U.S. Customs and Border Protection (CBP) cargo specialists. It ingests simulated cargo entries, validates each entry against configurable business rules, routes failures into a review queue, explains every exception in plain language with an AI-generated summary, recommends a resolution with an explicit confidence level, requires a named human to decide, and records a permanently traceable audit record of that decision.

The product is a demonstration artifact with a real working spine. Its purpose is to prove that Pivota can generate a complete, governed mission capability — data model, user interface, validation workflow, configurable rules, AI assistance, role-based access control, an approval chain, notifications, audit logging, and automated tests — from a short mission requirement statement. The demo narrative carries as much weight as the code: the application must survive a live, unscripted 10-step walkthrough in front of CBP stakeholders.

Deployment is web-first and sandbox-friendly. The application runs as a single web app in a sandboxed preview environment, with a dev server bound to `0.0.0.0` on a deterministic port, seeded with 10–15 synthetic shipments so every screen and workflow step is demonstrable without manual data entry. There is no ACE integration, no real importer data, and no autonomous clearance.

**Key Capabilities:**
- Ingest simulated cargo entries from a cargo-entry JSON file or lightweight local API (no ACE integration).
- Validate entries against configurable rules covering exactly three exception types: missing required document, invalid/incomplete HTS code, conflicting country-of-origin.
- Present four primary screens — Cargo Exception Queue, Shipment Review, Recommended Resolution, Decision & Audit Record — used directly by human cargo specialists and supervisors.
- Generate an AI plain-language summary and a recommended resolution with confidence level, always attributable and explainable.
- Enforce human-in-the-loop authority through five user actions and a specialist → supervisor approval chain.
- Support document request, simulated document upload, and shipment revalidation.
- Enforce role-based access control across three roles (Cargo Specialist, Supervisor, System Administrator) and let the administrator manage rules as configuration.
- Record a complete, defensible audit trail and generate (but not transmit) notifications on every decision and state change.

### 1.1 Core Value

A cargo specialist can open a flagged shipment, immediately understand *why* it was flagged and what evidence triggered it, and resolve it through a human-authored decision that is permanently traceable.

---

## 2. Problem Statement

Cargo exception handling today is a high-volume, high-consequence judgment task performed under time pressure. A specialist must reconstruct, from scattered entry data and attached documents, what is wrong with a shipment, which policy it violates, what evidence supports that conclusion, and what should be done about it. The reconstruction work — not the decision itself — consumes most of the time. When the decision is later challenged, the reasoning behind it is frequently unrecoverable because only the outcome was recorded, not the evidence reviewed or the basis for the call.

Automation is an obvious lever, but it introduces a second problem. Systems that act autonomously on cargo decisions are not acceptable in a customs enforcement context: authority must remain with a named official, and any machine-produced conclusion must be explainable and attributable. The result is an impasse — manual work is too slow, and unaccountable automation is unusable. CargoDemo exists to show a third path: AI that explains and recommends, and a human who decides, with the whole chain captured in an audit record strong enough to defend the decision after the fact.

### 2.1 Current Pain Points

1. **Reconstruction burden before judgment**: The specialist spends the bulk of their effort assembling context — importer, carrier, HTS classification, origin, manufacturer, documents received — before they can even begin to assess the exception.
2. **Opaque flagging**: A shipment arrives flagged, but *which* rule fired and *what evidence* triggered it is not surfaced alongside the shipment, forcing manual cross-referencing against policy.
3. **Undefendable decisions**: Outcomes are recorded without the evidence reviewed, the recommendation considered, the justification given, or the approving official — so a decision cannot be reconstructed or defended later.
4. **Unusable automation**: Tools that clear or hold cargo without human authority are non-starters in an enforcement context; anything that removes the human from the loop is rejected regardless of accuracy.
5. **Rigid rule logic**: Validation rules embedded in code cannot be adjusted by the people who own the policy, so the system drifts from the policy it is supposed to enforce.
6. **No separation of duties**: Without an explicit approval chain, a single actor can both recommend and finalize a clearance, eliminating the traceability that oversight depends on.

### 2.2 Target Users

| Persona | Description |
|---------|-------------|
| **Cargo Specialist** | Front-line reviewer. Works the exception queue, opens flagged shipments, reads the AI summary and evidence, requests missing documents, triggers revalidation, and recommends a resolution. Cannot finalize a clearance alone. |
| **Supervisor** | Approving official. Reviews specialist recommendations, approves or rejects clearance, and is recorded by name on the audit record. Has full visibility across the queue and can escalate or override. |
| **System Administrator** | Rule and configuration owner. Manages the configurable business rules (thresholds, required documents, severity, enable/disable), manages roles, and reseeds demo data. Does not adjudicate shipments. |
| **CBP Evaluating Stakeholder** *(observer, not a system role)* | Watches the live walkthrough and judges whether a governed mission application can be generated rapidly and defended. Their acceptance criterion is the 10-step narrative in §3.2. |

---

## 3. Product Vision

**Vision:** Every cargo exception is explained before it is decided, decided by a named human, and permanently defensible.

### 3.1 Strategic Goals

1. **Prove governed AI assistance**: Demonstrate that AI can materially reduce reconstruction time — plain-language summaries, triggering rule, evidence, recommended action, confidence level — while never taking a final action.
2. **Prove human authority and separation of duties**: Make the specialist → supervisor approval chain visible and enforced, so no clearance exists without a named approving official.
3. **Prove auditability**: Ensure every state change produces an audit record containing exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, approving official, and generated notification.
4. **Prove adaptability**: Keep business rules as configuration owned by the System Administrator, showing that a generated application remains changeable without regeneration.
5. **Prove demonstrability**: Ship seeded synthetic data and a deterministic environment so the full 10-step walkthrough runs end-to-end, live, without manual setup.
6. **Prove disciplined scope**: Deliver exactly three exception types and four primary screens, with every exclusion recorded as a decision rather than an omission.

### 3.2 Primary Acceptance Narrative — the 10-Step Walkthrough

This walkthrough is the product's primary acceptance criterion. Every step must run end-to-end in the deployed preview environment against seeded data, with no manual data entry and no developer intervention.

1. **Show the exception queue** — flagged shipments listed with shipment ID, importer, exception, priority, status.
2. **Open a flagged shipment** — full Shipment Review detail loads for the selected row.
3. **Show the AI-generated summary** — plain-language explanation of the detected exception(s).
4. **Display the triggering rule and evidence** — the specific rule/policy that fired plus the supporting field-level evidence.
5. **Request a missing document** — specialist issues a document request; shipment state and audit record update.
6. **Upload the simulated document** — the requested document is attached via simulated upload.
7. **Revalidate the shipment** — rules re-run against the updated evidence; the resolved exception clears, remaining exceptions persist.
8. **Specialist recommends clearance** — recommendation captured with justification; routed to supervisor.
9. **Supervisor approves** — named approving official finalizes the clearance; notification generated.
10. **Show the complete audit trail** — the Decision & Audit Record screen replays every step above, attributed and timestamped.

**Canonical demo scenario** (must exist in seed data): solar panels, country of origin Malaysia, manufacturer address in China, incomplete HTS code, invoice value $85,000, required certificate missing. The application must detect origin inconsistency, incomplete HTS classification, and a missing supporting document, and flag the shipment for manual review.

**Step-to-feature traceability:**

| Step | Delivered by |
|------|--------------|
| 1 | F17 (queue screen), F5 (exception detection), F2 (seed data) |
| 2 | F18 (review screen), F0 (data model), F3 (API) |
| 3 | F7 (AI summary), F18 |
| 4 | F5 (evidence capture), F4 (rule engine), F19 (resolution screen) |
| 5 | F10 (document request), F9 (case workflow), F13 (notification) |
| 6 | F10 (simulated upload) |
| 7 | F6 (revalidation), F4 |
| 8 | F9 (five actions), F8 (AI recommendation), F11 (approval chain) |
| 9 | F11 (supervisor approval), F14 (RBAC), F13 (notification) |
| 10 | F12 (audit record), F20 (audit screen) |

---

## 4. Technical Architecture

Technology selections below are the PRD's working assumption for a sandboxed, self-contained web demo. The authoritative decision record is TechArch-CargoDemo; deviations must be recorded there.

### 4.1 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript (Vite), client-side routing across the four primary screens plus admin surfaces |
| **Backend** | Node.js + TypeScript HTTP API (Express or Fastify), serving cargo entries, rules, workflow, and audit endpoints |
| **Rule Engine** | In-process, configuration-driven evaluator reading rule definitions from persisted JSON/DB configuration (no hardcoded rule logic) |
| **AI Assistance** | Request-time LLM call for summary and recommendation, with a deterministic offline fallback generator so the demo never depends on network availability |
| **Database** | SQLite (file-backed) for shipments, documents, rules, decisions, audit records, and notifications |
| **Document Storage** | Local filesystem or DB blob for simulated document uploads; synthetic files only |
| **Authentication** | Simulated login / role selection (no PIV/CAC, no SSO) with server-side role enforcement |
| **Testing** | Unit + integration tests (Vitest/Jest) for rules, workflow transitions, RBAC, and audit completeness; end-to-end test covering the 10-step walkthrough |
| **Deployment** | Single web app in a sandboxed preview environment; dev server bound to `0.0.0.0` on a deterministic port |

### 4.2 Deployment Model

| Model | Description |
|-------|-------------|
| **Sandboxed preview (primary)** | Single-command start; frontend and API served in one preview session, bound to `0.0.0.0` on a deterministic port so the preview URL is embeddable and stable across restarts. |
| **Local developer run** | Same command set on a workstation; SQLite file plus seed script means no external services are required. |
| **Seeded-by-default state** | On first start (and on explicit reset) the database is seeded with 10–15 synthetic shipments spanning all three exception types and all queue statuses, so the walkthrough is immediately runnable. |

---

## 5. Feature Requirements

Priority scale: **P0** = demo-critical, the walkthrough fails without it. **P1** = required for a complete, credible product but not on the critical path of a single walkthrough step. **P2** = valuable polish. **P3** = optional.

### 5.1 Platform & Data Foundation

#### F0: Cargo Entry Data Model & Persistence
- **Description**: The canonical domain model backing every screen and workflow step — shipments/cargo entries, documents, rule definitions, detected exceptions, evidence, decisions, approvals, notifications, users, and audit records — with schema and migrations.
- **Capabilities**:
  - Cargo entry entity carrying shipment ID, importer, carrier, product description, HTS code, country of origin, manufacturer (name and address), shipment value, and priority.
  - Document entity with type, required/received state, filename, upload source (seeded vs. simulated upload), and timestamp.
  - Exception entity linking a shipment to the rule that fired, the exception type, severity, and captured evidence.
  - Case state entity tracking queue status (e.g. New, Under Review, Info Requested, Pending Approval, Cleared, On Hold, Escalated).
  - Decision, approval, notification, and immutable audit-record entities with actor attribution and timestamps.
  - Migrations and a deterministic schema so the app starts clean in a fresh sandbox.
- **Priority**: P0

#### F1: Cargo Entry Ingestion
- **Description**: Loads simulated cargo entries into the system from a cargo-entry JSON file or a lightweight local API endpoint, with schema validation and rejection reporting. Explicitly not an ACE integration.
- **Capabilities**:
  - Import cargo entries from a versioned cargo-entry JSON file at a known path.
  - Accept cargo entries posted to a local ingestion API endpoint using the same schema.
  - Validate incoming payloads against the cargo-entry schema; report malformed or incomplete entries without aborting the whole batch.
  - Idempotent ingestion keyed on shipment ID (re-ingesting the same entry updates rather than duplicates).
  - Automatically trigger rule validation (F4) on every successfully ingested entry.
- **Priority**: P0

#### F2: Synthetic Seed Dataset
- **Description**: A curated dataset of 10–15 synthetic shipments that makes every screen, exception type, and queue status demonstrable without manual data entry.
- **Capabilities**:
  - 10–15 shipments, synthetic only, containing no real importer/carrier data and no PII.
  - Coverage of all three exception types, including at least one shipment carrying multiple simultaneous exceptions.
  - Coverage of all queue statuses, including at least one already-cleared shipment with a complete historical audit record for step 10.
  - The canonical scenario present verbatim: solar panels, origin Malaysia, manufacturer address in China, incomplete HTS code, $85,000 invoice value, required certificate missing.
  - Accompanying synthetic document fixtures for both pre-attached documents and the simulated upload in walkthrough step 6.
  - Seed script that is safe to re-run and produces identical data every time (deterministic IDs and timestamps).
- **Priority**: P0

#### F3: Backend HTTP API
- **Description**: The programmatic contract between the web UI and the domain services — shipments, exceptions, rules, AI assistance, workflow actions, documents, approvals, notifications, and audit records.
- **Capabilities**:
  - Read endpoints for the exception queue (with filter/sort by status, exception type, priority) and for full shipment detail.
  - Action endpoints for the five user actions, document request, document upload, revalidation, and approval decisions.
  - Endpoints for AI summary and recommended resolution retrieval.
  - Rule CRUD endpoints restricted to the System Administrator role.
  - Audit and notification read endpoints.
  - Consistent error contract, request validation, and server-side role enforcement on every mutating endpoint (see F14).
- **Priority**: P0

### 5.2 Rules & Validation

#### F4: Configurable Business Rule Engine
- **Description**: A configuration-driven evaluator that validates each cargo entry against stored rule definitions covering exactly three exception types. Rule logic is data, not code, so the System Administrator can change behavior without a rebuild.
- **Capabilities**:
  - Rule definitions persisted as configuration with ID, name, exception type, description, policy/authority reference, parameters, severity, priority mapping, and enabled flag.
  - **Missing required document** rule type: parameterized list of required document types, evaluated against documents received; optionally conditioned on shipment attributes (e.g. value threshold, commodity).
  - **Invalid/incomplete HTS code** rule type: format, length, and completeness validation with a configurable expected digit count and known-code check.
  - **Conflicting country-of-origin** rule type: compares declared country of origin against manufacturer address country (and other origin-bearing fields) and flags inconsistency.
  - Deterministic evaluation: same entry plus same rule set always yields the same exceptions.
  - Multiple rules may fire on one shipment; all firing rules are retained, none suppressed.
  - Exactly three exception types supported — adding a fourth type is out of scope (§5.8).
- **Priority**: P0

#### F5: Exception Detection, Evidence Capture & Flagging
- **Description**: Turns rule evaluation output into reviewable work: creates exceptions, captures the field-level evidence that triggered each one, assigns priority and status, and places the shipment on the exception queue.
- **Capabilities**:
  - Create an exception record per firing rule, linked to the shipment and to the rule definition.
  - Capture supporting evidence as concrete field references and values (e.g. `country_of_origin = "Malaysia"` vs. `manufacturer.address.country = "China"`), not prose.
  - Record what information is missing for exceptions that depend on absent evidence.
  - Derive shipment priority from rule severity and shipment attributes; set initial queue status.
  - Place every flagged shipment on the exception queue; leave clean shipments off it.
  - Preserve a full evaluation history so pre- and post-revalidation states are both inspectable.
- **Priority**: P0

#### F6: Shipment Revalidation
- **Description**: Re-runs the rule engine against a shipment after its evidence changes — most importantly after a simulated document upload — and updates exceptions, status, and audit trail accordingly. This is walkthrough step 7.
- **Capabilities**:
  - Manual revalidation triggered from the Shipment Review screen by an authorized user.
  - Automatic revalidation on evidence-changing events (document upload, entry re-ingestion).
  - Resolve exceptions that no longer fire, marking them resolved-by-revalidation rather than deleting them.
  - Retain exceptions that still fire and surface any newly triggered exceptions.
  - Update queue status and priority based on the post-revalidation exception set.
  - Write a revalidation entry to the audit trail with before/after exception sets, actor, and timestamp.
  - Regenerate the AI summary and recommendation to reflect the new state (F7, F8).
- **Priority**: P0

### 5.3 AI Assistance (Explain and Recommend — Never Decide)

#### F7: AI Plain-Language Shipment Summary
- **Description**: A request-time, AI-generated narrative that explains in plain language what the shipment is and why it was flagged, so the specialist understands the case without reconstructing it. This is walkthrough step 3.
- **Capabilities**:
  - Summarize the shipment (commodity, importer, carrier, value, origin) and each detected exception in non-technical language.
  - Ground every claim in the captured evidence; reference the specific fields and documents involved.
  - Generate at request time from current shipment state — no in-app model training.
  - Attribution metadata on every summary: model/provider identifier, generation timestamp, and the rule/evidence inputs used.
  - Cache the generated summary against the shipment's evaluation version; regenerate on revalidation.
  - Deterministic offline fallback summary when the AI provider is unavailable, clearly labeled as such, so the demo never breaks.
  - Visibly labeled as AI-generated wherever it is displayed.
- **Priority**: P0

#### F8: AI Recommended Resolution with Confidence Level
- **Description**: An AI-produced recommendation for how to resolve the exception, presented with the triggering rule, evidence, missing information, and an explicit confidence level. The recommendation is advisory only. This backs walkthrough step 4 and informs step 8.
- **Capabilities**:
  - Recommend one of the five available user actions (F9) as the suggested next step.
  - Present the exception detected, the triggering rule/policy, the supporting evidence, and the missing information alongside the recommendation.
  - Express a confidence level (e.g. High / Medium / Low with a stated basis) for each recommendation.
  - Provide the rationale for the recommendation in plain language, traceable to evidence.
  - Never execute an action; the recommendation is inert until a human selects an action.
  - Record the recommendation (and its confidence) on the case so the audit record can show what the human was advised (F12).
  - Deterministic offline fallback recommendation derived from rule severity when the AI provider is unavailable.
- **Priority**: P0

### 5.4 Workflow, Approvals & Governance

#### F9: Exception Case Workflow & User Actions
- **Description**: The state machine governing a flagged shipment from queue entry to final disposition, exposing exactly five user actions with role-gated availability and mandatory justification.
- **Capabilities**:
  - Five actions: **request additional information**, **send for specialist review**, **clear exception**, **place on hold**, **escalate to supervisor**.
  - Explicit, validated state transitions; invalid transitions rejected server-side with a clear reason.
  - Mandatory free-text justification captured on every action.
  - Human-in-the-loop enforcement: no action can be initiated by the AI or by an automated process; clearance always requires supervisor approval (F11).
  - Action availability filtered by the acting user's role (F14) and current case state.
  - Every action emits an audit record (F12) and a notification (F13).
- **Priority**: P0

#### F10: Document Request & Simulated Upload
- **Description**: Lets a specialist request a specific missing document, then accept a simulated upload of that document against the request, triggering revalidation. This is walkthrough steps 5 and 6.
- **Capabilities**:
  - Request a named document type tied to the missing-document exception and the rule that requires it.
  - Move the case to an "information requested" state and record the request in the audit trail.
  - Simulated upload flow that attaches a synthetic document file to the open request (no real importer correspondence).
  - Track request lifecycle: requested → fulfilled (or outstanding), with requester, fulfiller, and timestamps.
  - Attach the uploaded document to the shipment's document set so the missing-document rule can re-evaluate.
  - Automatically trigger revalidation (F6) on successful upload.
  - Display document provenance (seeded vs. uploaded during the session) on the Shipment Review screen.
- **Priority**: P0

#### F11: Specialist → Supervisor Approval Chain
- **Description**: The separation-of-duties mechanism. A Cargo Specialist may recommend clearance; only a Supervisor may approve it, and the approving official is recorded by name. This is walkthrough steps 8 and 9.
- **Capabilities**:
  - Specialist submits a clearance recommendation with justification; case moves to Pending Approval.
  - Pending-approval work is visible to Supervisors in the queue with a distinct status.
  - Supervisor may approve, reject (returning the case with a reason), or request more information.
  - A specialist cannot approve their own recommendation; self-approval is blocked server-side.
  - Final clearance is only reachable through supervisor approval — there is no path to Cleared without a named approving official.
  - Approval identity, decision, justification, and timestamp are written to the audit record (F12) and drive a notification (F13).
- **Priority**: P0

#### F12: Decision & Audit Record
- **Description**: The immutable, complete, append-only record of everything that happened to a case — sufficient to defend the decision after the fact. This is walkthrough step 10.
- **Capabilities**:
  - Every audit entry captures: exception(s) involved, evidence reviewed, AI recommendation and confidence, human decision/action, justification, timestamp, acting user and role, and the approving official where applicable.
  - Record the generated notification associated with each decision or state change.
  - Append-only semantics: entries cannot be edited or deleted through the application.
  - Chronological, human-readable case timeline spanning ingestion, flagging, AI outputs, document request/upload, revalidation, recommendation, and approval.
  - Distinguish AI-authored content from human-authored content in the record.
  - Export the full audit record for a case (e.g. JSON download / printable view) for offline review.
  - Completeness enforcement: a decision cannot be finalized if any required audit field is absent.
- **Priority**: P0

#### F13: Notification Generation
- **Description**: Generates and records notifications on decisions and state changes, and surfaces them in-app. Notifications are recorded, never transmitted — no real email or SMS leaves the system.
- **Capabilities**:
  - Generate a notification on every case state change and every decision (request, upload, revalidation, recommendation, approval, rejection, hold, escalation).
  - Notification content includes recipient role, subject, plain-language body, related shipment/case, and generation timestamp.
  - Persist notifications and link them to the originating audit entry.
  - In-app notification center / per-case notification list with read state.
  - Explicit "generated, not transmitted" labeling so the demo makes the simulation boundary obvious.
- **Priority**: P1

### 5.5 Access Control & Administration

#### F14: Role Simulation & Role-Based Access Control
- **Description**: Three roles with enforced permissions, entered through a simulated login / role selector rather than production authentication. Every mutating operation is authorized server-side.
- **Capabilities**:
  - Exactly three roles: **Cargo Specialist**, **Supervisor**, **System Administrator**.
  - Simulated login / role switcher that establishes a named acting user (identity is recorded on every action).
  - Cargo Specialist: work the queue, review shipments, request documents, upload simulated documents, revalidate, take the five actions, recommend clearance. Cannot approve clearance or edit rules.
  - Supervisor: everything a specialist can do, plus approve/reject clearance recommendations and view all cases. Cannot edit rules.
  - System Administrator: manage rules and configuration, manage users/roles, reseed demo data. Cannot adjudicate or approve shipments.
  - Server-side enforcement on every endpoint (UI hiding alone is not sufficient); unauthorized attempts are rejected and logged.
  - The acting user's name and role are stamped on every audit entry.
- **Priority**: P0

#### F15: Rule Administration
- **Description**: The System Administrator surface for managing business rules as configuration — proving the generated application remains adaptable without regeneration. Exists to support the four primary screens, not to expand the demo.
- **Capabilities**:
  - List all rules with type, severity, enabled state, and policy reference.
  - Create, edit, enable, and disable rules within the three supported exception types.
  - Edit rule parameters: required document types, HTS expected digit count/format, origin-comparison fields, value thresholds, severity, and priority mapping.
  - Validate rule definitions on save; reject malformed configuration with a clear message.
  - Show the effect of a rule change (e.g. revalidate affected shipments or indicate which shipments would change).
  - Record rule changes in the audit trail with the administrator's identity and timestamp.
- **Priority**: P1

### 5.6 User Interface — Four Primary Screens (Required Surface)

The application is operated directly by humans. The screens below are first-class features in their own right; the backend API (F3) does **not** satisfy this surface.

#### F16: Application Shell, Navigation & Role Switcher
- **Description**: The frame every screen lives in: layout, navigation between the four primary screens and the admin surfaces, active-role display and switching, notification indicator, and consistent status/priority visual language.
- **Capabilities**:
  - Persistent navigation across Exception Queue, Shipment Review, Recommended Resolution, and Decision & Audit Record.
  - Simulated login / role selector with the current user and role always visible.
  - Role-aware navigation: administrator-only surfaces hidden from specialists and supervisors.
  - Shared components for status badges, priority indicators, exception-type chips, AI-generated content labeling, and evidence display.
  - Notification indicator with access to the in-app notification list (F13).
  - Loading, empty, and error states on every data-backed view; responsive web layout suitable for embedded preview.
- **Priority**: P0

#### F17: Cargo Exception Queue Screen
- **Description**: The landing screen and walkthrough step 1 — the list of flagged shipments a specialist works from.
- **Capabilities**:
  - Tabular list showing shipment ID, importer, exception (type/summary), priority, and status.
  - Selectable rows that open the corresponding Shipment Review screen (walkthrough step 2).
  - Filter by status, exception type, and priority; sort by priority and by age.
  - Visual distinction for items pending supervisor approval (visible to Supervisors).
  - Multi-exception shipments clearly indicated rather than collapsed to a single exception.
  - Live reflection of state changes made elsewhere in the workflow (post-action, post-revalidation).
- **Priority**: P0

#### F18: Shipment Review Screen
- **Description**: The full case detail view — walkthrough step 2 — presenting shipment data, documents, validation results, and the AI-generated summary.
- **Capabilities**:
  - Display importer, carrier, product description, HTS code, country of origin, manufacturer (name and address), and shipment value.
  - Documents-received panel showing each required document, its received/missing state, and provenance.
  - Validation results panel listing every detected exception with its rule and severity.
  - AI-generated plain-language summary (F7), clearly labeled as AI-generated with attribution.
  - Actions available from this screen: request additional information, upload simulated document, revalidate, and navigate to Recommended Resolution.
  - Inline indication of what changed after a revalidation.
- **Priority**: P0

#### F19: Recommended Resolution Screen
- **Description**: The decision-support view — walkthrough step 4 and the launch point for step 8 — showing why the shipment was flagged, what the AI advises, and the five actions the human may take.
- **Capabilities**:
  - Display the exception detected, the triggering rule/policy (with its reference), and the supporting evidence.
  - Display the missing information required to resolve the exception.
  - Display the AI-recommended action and its confidence level, with rationale (F8).
  - Present all five user actions, with actions unavailable to the current role or state visibly disabled and explained.
  - Mandatory justification capture before any action is submitted.
  - Explicit statement that the AI recommends and the human decides; no action is pre-selected or auto-submitted.
  - For Supervisors, present approve/reject controls for a pending specialist recommendation (walkthrough step 9).
- **Priority**: P0

#### F20: Decision & Audit Record Screen
- **Description**: The accountability view — walkthrough step 10 — replaying the complete, attributed history of a case.
- **Capabilities**:
  - Chronological timeline of every event: ingestion, flagging, AI summary and recommendation, document request, upload, revalidation, recommendation, approval, notification.
  - Per-entry display of exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, acting user/role, and approving official.
  - Clear visual separation of AI-generated content from human-authored decisions.
  - Generated notifications shown alongside the decisions that produced them.
  - Export/print of the full audit record for a case.
  - Read-only by construction — no edit or delete affordances anywhere on the screen.
- **Priority**: P0

### 5.7 Quality & Demo Readiness

#### F21: Automated Test Suite
- **Description**: Tests that hold the governance claims true — validation rules, workflow transitions, RBAC, and audit-record completeness — plus an end-to-end run of the walkthrough.
- **Capabilities**:
  - Rule engine tests: each of the three exception types, positive and negative cases, multi-exception shipments, and configuration-driven parameter changes.
  - Workflow tests: every valid transition, rejection of invalid transitions, and the five user actions.
  - RBAC tests: each role against each protected operation, including blocked self-approval and blocked rule editing by non-administrators.
  - Audit completeness tests: every required field present on every decision; append-only enforcement.
  - Revalidation tests: exception resolution after document upload, retention of still-firing exceptions.
  - End-to-end test executing all ten walkthrough steps against seeded data.
- **Priority**: P0

#### F22: Demo Environment & Reset
- **Description**: The operational guarantees that let the walkthrough be run repeatedly, live, without cleanup between runs.
- **Capabilities**:
  - Single-command start; dev server bound to `0.0.0.0` on a deterministic port for embeddable preview.
  - One-click / one-command reset to pristine seeded state (System Administrator surface).
  - Health check confirming database, seed data, and AI-assist availability (including fallback status) before a demo.
  - Deterministic seed output so the canonical scenario appears identically on every run.
  - Graceful degradation banner when AI assistance is running in offline-fallback mode.
- **Priority**: P1

### 5.8 Out of Scope (Explicit Exclusions)

Every item below is a recorded decision, not an omission. Nothing here may be silently reintroduced during build; nothing here may be treated as implied.

| Excluded capability | Reason (from PROJECT.md) |
|---------------------|--------------------------|
| **Live ACE (Automated Commercial Environment) integration** | EXCLUDED: simulated via cargo-entry JSON file / lightweight local API (F1) to keep the demo focused on mission capability rather than integration complexity. |
| **Exception types beyond the three named** (valuation fraud, sanctions screening, tariff engineering, etc.) | EXCLUDED: the first demo is deliberately narrow; breadth adds rule surface without adding narrative value. |
| **Real importer/carrier data or any PII** | EXCLUDED: synthetic data only (F2), enabling safe public demonstration. |
| **Production authentication (PIV/CAC, SSO)** | EXCLUDED: simulated login / role selection (F14) is sufficient for the demo. |
| **Real outbound email/SMS delivery** | EXCLUDED: notifications are generated and recorded (F13), not transmitted. |
| **Machine-learning model training** | EXCLUDED: AI summaries and recommendations are generated at request time (F7, F8), not trained in-app. |
| **Mobile-native applications** | EXCLUDED: web-first; the web UI is responsive but there is no native app. |
| **Multi-port / multi-tenant configuration** | EXCLUDED: single-tenant, single-port demo deployment. |
| **Screens beyond the four primary screens** | EXCLUDED by constraint: rule administration (F15) and role switching (F16) exist only to support the four, not to expand the demo. |
| **Autonomous clearance or any AI-initiated action** | EXCLUDED by governance constraint: the AI recommends, the human decides — this is the central claim of the demo. |

### 5.9 Capability Surface Coverage Matrix

| Capability surface | Covered by | Status |
|---|---|---|
| **User-facing UI** — exception queue, shipment review, recommended resolution, audit record, navigation, role switching | F16, F17, F18, F19, F20 | ✅ features |
| **User-facing UI (admin)** — rule administration, demo reset | F15, F22 | ✅ features |
| **Programmatic API** — shipments, rules, workflow, documents, AI, audit, notifications | F3 | ✅ feature |
| **Ingestion interface** — cargo-entry JSON file / local API | F1 | ✅ feature |
| **Rules & validation logic** | F4, F5, F6 | ✅ features |
| **AI assistance** — summary, recommendation, confidence, attribution | F7, F8 | ✅ features |
| **Workflow & approvals** — five actions, document request/upload, approval chain | F9, F10, F11 | ✅ features |
| **Audit & notifications** | F12, F13 | ✅ features |
| **Access control** — three roles, simulated login, server-side enforcement | F14 | ✅ feature |
| **Data** — schema, migrations, persistence | F0 | ✅ feature |
| **Content / assets** — synthetic shipments, document fixtures, canonical scenario | F2 | ✅ feature |
| **Background / async jobs** | — | ⛔ EXCLUDED: all processing is request-time; no schedulers, queues, or webhooks in a single-session demo. |
| **External integrations (ACE, email/SMS, IdP)** | — | ⛔ EXCLUDED: PRD §5.8 (simulated ingestion, recorded-not-transmitted notifications, simulated login). |
| **Mobile-native surface** | — | ⛔ EXCLUDED: PRD §5.8 (web-first). |
| **Quality / verification** | F21, F22 | ✅ features |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Exception queue loads in < 1s and shipment detail in < 1s with the seeded dataset; rule evaluation for a single shipment completes in < 500ms; revalidation round-trip completes in < 2s. |
| **AI responsiveness** | AI summary and recommendation return within 5s (p95); if the provider does not respond within 10s, the deterministic fallback is served automatically and labeled as such — the UI never blocks the walkthrough. |
| **Governance** | 100% of state changes are attributable to a named acting user and role; 0 clearances reachable without supervisor approval; 0 actions initiated by AI. |
| **Auditability** | Every finalized decision carries all eight required fields (exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, approving official, generated notification); audit entries are append-only and cannot be edited or deleted through the application. |
| **Explainability** | Every AI output displays its provider/model identifier, generation timestamp, and the evidence inputs it used, and is visually labeled as AI-generated. |
| **Security** | Authorization enforced server-side on every mutating endpoint; role checks are never client-only; uploaded documents are restricted to synthetic fixtures with type and size validation; no secrets committed to the repository. |
| **Privacy** | No real or personally identifiable data anywhere in the system, including seed data, fixtures, logs, and AI prompts. |
| **Reliability** | The application starts clean in a fresh sandbox with a single command and seeded data; a full walkthrough can be run repeatedly after reset without manual database intervention. |
| **Determinism** | Identical seed data on every run; identical rule evaluation results for identical inputs; deterministic port binding for a stable preview URL. |
| **Usability** | A cargo specialist can understand why a shipment was flagged within 30 seconds of opening it, without leaving the Shipment Review screen; every disabled action states why it is unavailable. |
| **Accessibility** | Keyboard-navigable across all four primary screens; semantic headings and table markup; status and priority conveyed by text/label, not color alone; WCAG 2.1 AA color contrast. |
| **Portability** | Runs in a sandboxed preview environment with no external service dependencies beyond the optional AI provider; file-backed database requires no separate server. |
| **Maintainability** | Business rules are configuration, not code; adding or changing a rule within the three supported types requires no code change or redeploy. |
| **Testability** | Rules, workflow transitions, RBAC, and audit completeness are covered by automated tests; the 10-step walkthrough is covered end-to-end. |

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Walkthrough completion | 10 of 10 steps complete end-to-end in the preview environment with zero manual data entry and zero developer intervention |
| Walkthrough repeatability | 3 consecutive full walkthroughs after reset with identical results |
| Canonical scenario detection | The solar-panel shipment flags all 3 expected exceptions (origin inconsistency, incomplete HTS, missing document) on first ingestion |
| Exception type coverage in seed data | All 3 exception types and all queue statuses represented across 10–15 shipments |
| Audit completeness | 100% of finalized decisions contain all 8 required audit fields; 0 decisions finalizable with a missing field |
| Human authority | 0 shipments reach Cleared status without a recorded supervisor approving official; 0 AI-initiated actions |
| RBAC enforcement | 100% of protected operations reject unauthorized roles server-side (verified by test) |
| Revalidation correctness | After the simulated upload, the missing-document exception resolves and all other still-firing exceptions are retained — 100% of the time |
| Rule configurability | A System Administrator can change a rule parameter and see the effect on validation results with 0 code changes and 0 redeploys |
| Automated test coverage | 100% of the specified rule, workflow-transition, RBAC, and audit-completeness behaviors covered; test suite green |
| Time to comprehension | A first-time specialist identifies why a shipment was flagged in < 30 seconds on the Shipment Review screen |
| AI availability resilience | Walkthrough completes successfully with the AI provider disabled (fallback path), with fallback clearly labeled |
| Data safety | 0 instances of real or personally identifiable data in seed data, fixtures, logs, or prompts |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI provider unavailable or slow during the live demo | High | Deterministic offline fallback for both summary (F7) and recommendation (F8), 10s timeout, pre-demo health check (F22), and cached summaries per evaluation version. |
| AI output is vague, hallucinated, or not grounded in evidence | High | Prompt constrained to the captured evidence and rule definitions; evidence and triggering rule displayed independently of the AI text (F5, F19) so the human can verify; AI content visibly labeled and attributable. |
| Scope creep beyond three exception types or four screens | High | Exclusions recorded in §5.8 as decisions; the rule engine supports exactly three types; any additional surface must be justified as supporting the four screens. |
| UI treated as an afterthought behind a working API | High | The four screens are first-class P0 features (F17–F20) with an explicit coverage matrix (§5.9); an API-only build fails acceptance. |
| Audit record incomplete, making a decision undefendable | High | Completeness enforced at write time (F12), append-only storage, and dedicated audit-completeness tests (F21). |
| Governance claim undermined by an autonomous path to clearance | High | Server-side enforcement that Cleared is reachable only through supervisor approval (F11); self-approval blocked; RBAC tests assert it. |
| Seed data does not exercise every screen or status | Medium | Seed dataset explicitly requires all three exception types, all queue statuses, a multi-exception shipment, and a pre-cleared shipment with historical audit trail (F2). |
| Revalidation produces inconsistent state (stale exceptions or lost history) | Medium | Evaluation-versioned exception history, resolved-not-deleted semantics, and revalidation tests (F6, F21). |
| Rule configuration made invalid by an administrator, breaking validation | Medium | Schema validation on rule save with clear rejection messages, plus change auditing and impact preview (F15). |
| Preview environment port/binding issues break the embedded demo | Medium | Deterministic port, bind to `0.0.0.0`, single-command start, and health check (F22). |
| Simulated document upload accepts unexpected files | Low | Restricted to synthetic fixtures with type/size validation; no real correspondence path exists (F10). |
| Stakeholders read the demo as production-ready | Low | Explicit "generated, not transmitted" notification labeling, simulated-login labeling, and a visible demo-mode indicator (F13, F14, F16). |

---

## 9. Feature Index

| ID | Feature | Priority | Category |
|----|---------|----------|----------|
| F0 | Cargo Entry Data Model & Persistence | P0 | Platform & Data Foundation |
| F1 | Cargo Entry Ingestion (JSON / local API) | P0 | Platform & Data Foundation |
| F2 | Synthetic Seed Dataset (10–15 shipments) | P0 | Platform & Data Foundation |
| F3 | Backend HTTP API | P0 | Platform & Data Foundation |
| F4 | Configurable Business Rule Engine | P0 | Rules & Validation |
| F5 | Exception Detection, Evidence Capture & Flagging | P0 | Rules & Validation |
| F6 | Shipment Revalidation | P0 | Rules & Validation |
| F7 | AI Plain-Language Shipment Summary | P0 | AI Assistance |
| F8 | AI Recommended Resolution with Confidence Level | P0 | AI Assistance |
| F9 | Exception Case Workflow & User Actions | P0 | Workflow, Approvals & Governance |
| F10 | Document Request & Simulated Upload | P0 | Workflow, Approvals & Governance |
| F11 | Specialist → Supervisor Approval Chain | P0 | Workflow, Approvals & Governance |
| F12 | Decision & Audit Record | P0 | Workflow, Approvals & Governance |
| F13 | Notification Generation | P1 | Workflow, Approvals & Governance |
| F14 | Role Simulation & Role-Based Access Control | P0 | Access Control & Administration |
| F15 | Rule Administration | P1 | Access Control & Administration |
| F16 | Application Shell, Navigation & Role Switcher | P0 | User Interface |
| F17 | Cargo Exception Queue Screen | P0 | User Interface |
| F18 | Shipment Review Screen | P0 | User Interface |
| F19 | Recommended Resolution Screen | P0 | User Interface |
| F20 | Decision & Audit Record Screen | P0 | User Interface |
| F21 | Automated Test Suite | P0 | Quality & Demo Readiness |
| F22 | Demo Environment & Reset | P1 | Quality & Demo Readiness |

### 9.1 Priority Summary

| Priority | Count | Features |
|----------|-------|----------|
| **P0 (Critical — demo-blocking)** | 20 | F0, F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F14, F16, F17, F18, F19, F20, F21 |
| **P1 (High — completeness)** | 3 | F13, F15, F22 |
| **P2 (Medium)** | 0 | — |
| **P3 (Low)** | 0 | — |
| **Total** | 23 | — |

*Note: all 23 features are in scope for the first demo. The absence of P2/P3 work is deliberate — the scope is narrow by decision (see §5.8), not by deferral.*

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
</content>
</invoke>
