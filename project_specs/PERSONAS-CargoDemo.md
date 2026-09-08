# Personas
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related PRD** | PRD-CargoDemo.md (§2.2 Target Users, §2.1 Pain Points, §5 Features, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | JTBD-CargoDemo, JOURNEYS-CargoDemo, UserStories-CargoDemo |

**Scope note:** CargoDemo has **exactly three system roles** (PRD §5.8, PROJECT.md Constraints): Cargo Specialist, Supervisor, System Administrator. PER-01 through PER-03 map one-to-one to those roles. PER-04 is an **observer persona with no system account** — included because the walkthrough's acceptance criterion is judged by them, not because they log in.

---

## Persona Summary

| ID | Name | Role | Primary Goal |
|----|------|------|-------------|
| PER-01 | Marisol Reyes | Cargo Specialist (front-line reviewer, system role) | Understand why a shipment was flagged in under 30 seconds and move it to a defensible recommendation without leaving the review screen |
| PER-02 | Dwayne Okafor | Supervisor (approving official, system role) | Approve or reject clearance recommendations with the full evidence and AI advisory chain in front of him, and have his name stand behind every cleared shipment |
| PER-03 | Priya Raghavan | System Administrator (rule & configuration owner, system role) | Change validation behavior through configuration — never code — and have the demo start clean and seeded on every run |
| PER-04 | Angela Pruitt *(observer — not a system role)* | CBP Evaluating Stakeholder | Watch an unscripted 10-step walkthrough and judge whether a governed mission capability can be generated rapidly and defended afterward |

---

## PER-01: Marisol Reyes

**Role & Context:**
Marisol is a cargo specialist working the exception queue at a port of entry. She is the front line: flagged shipments arrive in her queue and she is the first human to look at them. On a normal shift she works through 20–40 flagged entries, each requiring her to establish what the commodity is, who the importer and carrier are, how it was classified, where it came from, which documents arrived, and which of those facts conflict. The judgment itself is usually quick once she has the picture; assembling the picture is what eats the shift. She works from a desk browser, keyboard-first, with policy references open in another tab. She reports to a supervisor and does not have authority to clear a shipment on her own — her output is a recommendation with a justification, routed upward.

Her defining constraint is accountability. Anything she recommends may be revisited weeks later, and she needs the record to show not just what she decided but what she was looking at when she decided it. She is skeptical of tools that assert conclusions without showing the underlying field values, and she will not trust a summary she cannot check against the evidence beside it.

**Goals:**
- Open a flagged shipment and see the triggering rule and the field-level evidence that fired it, side by side, without cross-referencing policy manually (F5, F18, F19)
- Read a plain-language explanation of *why* this shipment is flagged rather than reconstructing it from raw entry data (F7)
- Resolve missing-document exceptions inside the tool — request the document, accept the upload, revalidate — instead of tracking the request in a side channel (F10, F6)
- Take one of the five permitted actions with a captured justification, and see clearly which actions her role cannot take and why (F9, F19)
- Route a clearance recommendation to a supervisor and know it has been received rather than wondering where it went (F11, F13)
- Have every step she took recorded automatically, so a decision she made is still defensible months later (F12, F20)

**Pain Points:**
- Reconstruction consumes most of her effort: importer, carrier, HTS, origin, manufacturer, and documents received all have to be assembled before she can begin to assess anything (PRD §2.1.1)
- A shipment arrives flagged but *which* rule fired and *what evidence* triggered it is not surfaced with the shipment, forcing manual policy cross-referencing (PRD §2.1.2)
- Only the outcome of her decision gets recorded — not the evidence she reviewed or the basis for the call — so she cannot reconstruct her own reasoning when challenged (PRD §2.1.3)
- Multi-exception shipments get collapsed to a single headline problem, so she fixes one issue and is surprised when the shipment is still held
- Document requests live in email and spreadsheets, disconnected from the shipment record, so she loses track of what is outstanding
- Tools that act on cargo without her are unusable to her regardless of accuracy — she needs the authority to stay with her, and the machine's role to be advisory and labeled (PRD §2.1.4)

**Technical Expertise:** Intermediate — fluent in web-based case tools, filters, and tabular queues; keyboard-driven; comfortable reading structured field data and document metadata. Does not use a command line, does not write queries, and will not edit configuration files.

**Top Tasks:**
1. Work the exception queue — scan flagged shipments by priority, status, and exception type, and open the next one to review (many times per shift, critical) — F17
2. Review a flagged shipment — read the AI summary, verify it against the field-level evidence and the documents-received panel, and confirm which rules fired (per shipment, critical) — F18, F7, F5
3. Request a missing document and accept the simulated upload, then revalidate the shipment to see which exceptions clear and which persist (frequent, critical) — F10, F6
4. Recommend a resolution — select one of the five actions, enter the mandatory justification, and route clearance recommendations to a supervisor (per shipment, critical) — F9, F11, F19
5. Re-open the audit record for a case she previously touched to confirm what she reviewed and what she wrote (occasional, high) — F20, F12

**Success Criteria:**
- Identifies why a shipment was flagged in **under 30 seconds** on the Shipment Review screen, without leaving that screen (PRD §6 Usability, §7 Time to comprehension)
- Every exception she reviews shows its triggering rule and concrete field-level evidence (e.g. `country_of_origin = "Malaysia"` vs. `manufacturer.address.country = "China"`), not prose
- After a simulated document upload, the missing-document exception resolves and every still-firing exception is retained — **100% of the time** (PRD §7 Revalidation correctness)
- Zero actions she did not initiate appear on her cases: **0 AI-initiated actions** on the audit record (PRD §7 Human authority)
- Every action she submits carries a justification and produces an audit entry — she is never able to finalize a step with a required field missing (PRD §7 Audit completeness)
- Every disabled action tells her why it is unavailable rather than simply being greyed out (PRD §6 Usability)

---

## PER-02: Dwayne Okafor

**Role & Context:**
Dwayne is the supervising official for a team of cargo specialists. He is the approving authority: no shipment reaches Cleared status without his name on it. His day is split between oversight of the queue as a whole — where the backlog is, which shipments are aging, which are stuck awaiting information — and adjudication of the specific recommendations his specialists route to him. He can do everything a specialist can do, plus approve, reject, or send a case back for more information, and he can escalate or override where the situation warrants it.

His exposure is different from Marisol's. When a clearance is questioned, he is the named official on the record, so he cannot approve on the strength of a specialist's summary alone. He needs to see the exception, the evidence, the AI recommendation and its confidence level, and the specialist's justification, and he needs to be able to tell at a glance which parts of that record were written by a human and which were generated by a model. He also needs the separation of duties to be structurally enforced rather than procedurally agreed — a specialist approving their own recommendation must be impossible, not merely discouraged.

**Goals:**
- See all pending-approval work distinguished in the queue so approvals are not buried among new exceptions (F17, F11)
- Approve, reject with a reason, or request more information on a recommendation, with the full evidence and advisory chain visible at the point of decision (F11, F19)
- Confirm that the specialist's justification is grounded in the evidence before his name is attached to a clearance (F12, F5)
- Distinguish AI-authored content from human-authored decisions instantly when reviewing a case (F20, F12)
- Rely on the system to make self-approval and any path to Cleared without an approving official structurally impossible (F11, F14)
- Replay a complete, attributed, timestamped case history — and export it — when a decision is revisited after the fact (F20, F12)
- Know that a notification was generated for every decision and state change, and see it attached to the decision that produced it (F13)

**Pain Points:**
- A decision he approved cannot be reconstructed later because the record captured the outcome but not the evidence reviewed, the recommendation considered, or the justification given (PRD §2.1.3)
- Without an explicit approval chain, a single actor can both recommend and finalize a clearance, destroying the traceability oversight depends on (PRD §2.1.6)
- He has no reliable read on team workload or which shipments are aging in which status, so escalation is reactive
- When a machine-produced conclusion appears in the record, he cannot tell whether it was verified by the specialist or simply accepted (PRD §2.1.2, §2.1.4)
- Approvals arrive through informal channels, so a recommendation can sit unnoticed while the shipment ages
- Exports and printouts of a case history have to be assembled by hand when a decision is challenged

**Technical Expertise:** Intermediate — proficient with dashboards, filtered queues, and approval workflows; reads audit logs and evidence tables comfortably. Not a rule author, not an administrator, and explicitly cannot edit rules in CargoDemo.

**Top Tasks:**
1. Review the queue for pending-approval items and aging cases across the whole team, not just his own work (multiple times daily, critical) — F17, F14
2. Adjudicate a specialist recommendation — read the exception, evidence, AI recommendation and confidence, and the specialist's justification, then approve, reject with a reason, or request more information (per recommendation, critical) — F11, F19
3. Replay the complete audit trail for a case, verifying all required fields are present and AI content is distinguishable from human decisions (per contested case, critical) — F20, F12
4. Export or print a full case audit record for offline review or escalation (occasional, high) — F12
5. Escalate, place on hold, or override a case where the specialist's path is not appropriate (as needed, medium) — F9

**Success Criteria:**
- **0 shipments reach Cleared status without a recorded supervisor approving official** (PRD §7 Human authority)
- Self-approval is rejected server-side and verified by test — a specialist can never approve their own recommendation (PRD §7 RBAC enforcement, F21)
- **100% of finalized decisions contain all 8 required audit fields**; no decision is finalizable with a field missing (PRD §7 Audit completeness)
- Every AI output he sees displays its provider/model identifier, generation timestamp, and evidence inputs, and is visually labeled as AI-generated (PRD §6 Explainability)
- Pending-approval items are visually distinct in the queue and never require him to hunt for them (F17)
- He can produce a complete, chronological, attributed case history for any shipment in a single action (F20)

---

## PER-03: Priya Raghavan

**Role & Context:**
Priya owns the configuration, not the caseload. She is the System Administrator: she defines and maintains the business rules that decide what gets flagged, sets their parameters and severity, enables and disables them, manages roles and users, and reseeds the demo environment. She never adjudicates a shipment — that authority is deliberately withheld from her role, which is itself part of the separation-of-duties story the product is making.

Her working assumption in every prior system has been that rules live in code and therefore belong to developers, which means the people who own the policy cannot change the system that enforces it. CargoDemo inverts that: rule definitions are persisted configuration with a policy reference, parameters, severity, and an enabled flag, and she can change validation behavior with no code change and no redeploy. She is also the person responsible for the environment being demonstrable — single-command start, deterministic port, seeded data, health check green, and a one-action reset to pristine state before each run. When a walkthrough is about to happen in front of stakeholders, the environment being clean is her problem.

**Goals:**
- Change what the system flags — required document types, HTS expected digit count and format, origin-comparison fields, value thresholds, severity, priority mapping — through configuration alone, with 0 code changes and 0 redeploys (F15, F4)
- Validate a rule definition on save and be told clearly why malformed configuration was rejected, rather than discovering it through a broken queue (F15)
- Preview the effect of a rule change — which shipments would change, or revalidate the affected ones — before trusting it (F15, F6)
- Have every rule change recorded in the audit trail under her identity and timestamp, so configuration drift is traceable (F15, F12)
- Guarantee the environment is demo-ready: single-command start, deterministic port and seed output, health check confirming database, seed data, and AI-assist availability including fallback status (F22)
- Reset to a pristine seeded state between walkthrough runs without touching the database by hand (F22, F2)
- Keep role boundaries enforced server-side so her own inability to adjudicate is as real as the specialist's inability to approve (F14)

**Pain Points:**
- Validation rules embedded in code cannot be adjusted by the people who own the policy, so the system steadily drifts from the policy it is supposed to enforce (PRD §2.1.5)
- Any rule adjustment requires a developer and a release, which means policy changes queue behind engineering priorities
- She has no way to see the impact of a configuration change before it lands on live validation results
- Demo environments require manual setup and manual cleanup, so a repeat walkthrough is never identical to the first
- When AI assistance is degraded or offline she has no pre-flight signal, and finds out mid-demonstration
- Configuration changes are untraceable — nobody can say who changed a threshold or when

**Technical Expertise:** Expert — comfortable with structured configuration, JSON schemas, migrations, seed scripts, health checks, and reading test output. Operates the environment as well as the rule set, but works through the application's administrative surfaces rather than editing source.

**Top Tasks:**
1. Manage the rule set — list, create, edit, enable, and disable rules within the three supported exception types, and edit their parameters (frequent, critical) — F15, F4
2. Reset the environment to pristine seeded state before a walkthrough and confirm the canonical solar-panel scenario appears identically (before every demo, critical) — F22, F2
3. Run the pre-demo health check confirming database, seed data, and AI-assist availability including offline-fallback status (before every demo, critical) — F22
4. Manage users and roles so each acting user is named and correctly scoped (occasional, high) — F14
5. Verify a rule change took effect by inspecting the impact preview or revalidating affected shipments (per change, high) — F15, F6
6. Re-ingest or refresh cargo entries from the cargo-entry JSON file or local ingestion endpoint (occasional, medium) — F1

**Success Criteria:**
- Changes a rule parameter and sees the effect on validation results with **0 code changes and 0 redeploys** (PRD §7 Rule configurability)
- Seed output is deterministic — identical data, identical canonical scenario, on every run (PRD §6 Determinism, §7)
- **3 consecutive full walkthroughs after reset produce identical results** (PRD §7 Walkthrough repeatability)
- The walkthrough completes successfully with the AI provider disabled, with the fallback clearly labeled (PRD §7 AI availability resilience)
- Malformed rule configuration is rejected on save with a clear message and never reaches validation
- Every rule change appears in the audit trail attributed to her with a timestamp
- **0 instances of real or personally identifiable data** in seed data, fixtures, logs, or AI prompts (PRD §7 Data safety)
- Attempts by her role to adjudicate or approve a shipment are rejected server-side and logged

---

## PER-04: Angela Pruitt *(observer — not a system role)*

**Role & Context:**
Angela is a CBP program evaluator attending the live walkthrough. She has **no account and no system role in CargoDemo** — she does not log in, work the queue, or touch configuration. She is included here because her judgment is the product's primary acceptance criterion: the 10-step narrative in PRD §3.2 exists to satisfy her, and every P0 feature is P0 because the walkthrough would fail in front of her without it.

What she is testing is not whether the software works but whether a governed mission capability can be generated rapidly and then *defended*. She has seen demonstrations that were impressive and unusable, and her instinct is to probe the two failure modes she cares about: does the machine ever take an action a human should have taken, and could this decision be defended six months from now if someone asked for the basis of it. She will ask for a step out of order, ask what happens when the AI is unavailable, and ask to see the audit record for a decision she just watched being made. An API-only build, a scripted click-path, or a summary she cannot trace back to a field value all read as failure to her.

**Goals:**
- Watch all 10 walkthrough steps run end-to-end in the deployed preview environment, live, with no manual data entry and no developer intervention (F17–F20, F2, F22)
- Confirm that authority stays with a named human — the AI explains and recommends, and never clears, holds, or escalates on its own (F8, F9, F11)
- Confirm that every AI output is attributable and explainable, labeled as machine-generated, and traceable to the evidence it used (F7, F8)
- Confirm a decision is defensible after the fact by reading a complete, attributed, timestamped audit trail for a case she just watched (F12, F20)
- See that business rules are genuinely configuration owned by the customer, not code owned by a vendor (F15, F4)
- Verify that scope discipline was a recorded decision — exactly three exception types, four primary screens, exclusions stated rather than omitted (PRD §5.8)
- See that the governance claims are held true by tests, not just by narration (F21)

**Pain Points:**
- Automation in a customs enforcement context is rejected regardless of accuracy if it removes the human from the loop — she has no way to accept a system that acts autonomously (PRD §2.1.4)
- Decisions she has had to review in the past recorded only the outcome, leaving the reasoning unrecoverable and the decision indefensible (PRD §2.1.3)
- Demonstrations typically rely on a rehearsed happy path and collapse the moment a step is taken out of order or a dependency is unavailable
- AI-generated text that cannot be traced to a specific field or document reads as unverifiable, and she cannot sign off on unverifiable output
- Working APIs get presented as finished products when the humans who would actually do the work have no usable surface (PRD §8, "UI treated as an afterthought")
- Rapidly built systems are usually rigid — she expects to be told that any policy change requires the vendor to rebuild

**Technical Expertise:** Novice-to-intermediate as a *system* user — she is a policy and oversight expert, not an operator. She reads screens, evidence, and audit records; she does not run commands, edit configuration, or interpret logs. Her evaluation is conducted entirely through what the four primary screens show her.

**Top Tasks:**
1. Follow the 10-step walkthrough end-to-end and confirm each step is delivered live against seeded data (once per evaluation session, critical) — PRD §3.2
2. Interrogate the audit record for a decision she just watched being made, checking that evidence, AI recommendation, justification, and approving official are all present (per session, critical) — F20, F12
3. Probe for autonomous behavior — ask what the system can do without a human and confirm the answer is nothing (per session, critical) — F9, F11
4. Ask for a step out of sequence or an off-script case (multi-exception shipment, already-cleared shipment) to test that the demo is a working system rather than a script (per session, high) — F2, F17
5. Ask what happens when the AI provider is unavailable and observe the labeled fallback path (per session, high) — F7, F8, F22

**Success Criteria:**
- **10 of 10 walkthrough steps complete end-to-end** in the preview environment with zero manual data entry and zero developer intervention (PRD §7 Walkthrough completion)
- The canonical solar-panel shipment flags all **3** expected exceptions — origin inconsistency, incomplete HTS, missing document — on first ingestion (PRD §7)
- **0 AI-initiated actions** and **0 clearances without a recorded approving official** across the entire session (PRD §7 Human authority)
- **100% of finalized decisions carry all 8 required audit fields**, demonstrated on a case she selects (PRD §7 Audit completeness)
- A rule parameter is changed in front of her and the effect on validation is visible with 0 code changes and 0 redeploys (PRD §7 Rule configurability)
- The walkthrough completes with the AI provider disabled and the fallback clearly labeled (PRD §7 AI availability resilience)
- The test suite is green and demonstrably covers the rule, workflow-transition, RBAC, and audit-completeness claims (PRD §7 Automated test coverage)
- She never mistakes the demo for production — simulated login, "generated, not transmitted" notifications, and a visible demo-mode indicator make the simulation boundary explicit (PRD §8)

---

## Persona Relationships

| Persona | Interacts With | Nature of Interaction |
|---------|---------------|----------------------|
| PER-01 Cargo Specialist | PER-02 Supervisor | Routes clearance recommendations upward with a justification; receives approvals, rejections with reasons, and requests for more information. This is the enforced separation of duties (F11) — the specialist cannot close the loop alone. |
| PER-01 Cargo Specialist | PER-03 System Administrator | Consumes the rule set the administrator owns; the exceptions and priorities in her queue are a direct product of Priya's configuration. Raises rule mismatches, but cannot change parameters herself (F14, F15). |
| PER-02 Supervisor | PER-01 Cargo Specialist | Oversees the specialist's caseload across all statuses, adjudicates her recommendations, and can escalate, hold, or override. His name — not hers — is recorded as the approving official on any clearance (F11, F12). |
| PER-02 Supervisor | PER-03 System Administrator | Depends on the administrator's rule configuration for the validation results he adjudicates, and on rule-change auditing to understand why flagging behavior shifted between cases (F15, F12). Cannot edit rules himself. |
| PER-03 System Administrator | PER-01, PER-02 | Sets the rules and role scopes that constrain both adjudicating personas, and reseeds the data they work. Deliberately excluded from adjudication and approval — her authority is configuration only (F14). |
| PER-04 CBP Evaluating Stakeholder *(observer)* | PER-01, PER-02, PER-03 | Has no system relationship with any of them. Observes all three roles being exercised during the walkthrough — specialist review, supervisor approval, administrator rule change — and judges the governance chain from the outside via the four primary screens. |

---

## Feature-Persona Matrix

Legend: **Primary** = the persona is the main user or owner of the feature · **Secondary** = the persona depends on or consumes the feature · **—** = not relevant to this persona.

| Feature | PER-01 Specialist | PER-02 Supervisor | PER-03 Administrator | PER-04 Stakeholder *(observer)* |
|---------|-----------|------------|---------------|-------------|
| F0: Cargo Entry Data Model & Persistence | Secondary | Secondary | Primary | — |
| F1: Cargo Entry Ingestion (JSON / local API) | Secondary | — | Primary | — |
| F2: Synthetic Seed Dataset (10–15 shipments) | Secondary | Secondary | Primary | Secondary |
| F3: Backend HTTP API | Secondary | Secondary | Primary | — |
| F4: Configurable Business Rule Engine | Secondary | Secondary | Primary | Secondary |
| F5: Exception Detection, Evidence Capture & Flagging | Primary | Secondary | Secondary | Secondary |
| F6: Shipment Revalidation | Primary | Secondary | Secondary | Secondary |
| F7: AI Plain-Language Shipment Summary | Primary | Secondary | — | Secondary |
| F8: AI Recommended Resolution with Confidence Level | Primary | Secondary | — | Secondary |
| F9: Exception Case Workflow & User Actions | Primary | Primary | — | Secondary |
| F10: Document Request & Simulated Upload | Primary | Secondary | — | Secondary |
| F11: Specialist → Supervisor Approval Chain | Primary | Primary | — | Primary |
| F12: Decision & Audit Record | Secondary | Primary | Secondary | Primary |
| F13: Notification Generation | Secondary | Primary | Secondary | Secondary |
| F14: Role Simulation & Role-Based Access Control | Secondary | Secondary | Primary | Secondary |
| F15: Rule Administration | — | Secondary | Primary | Secondary |
| F16: Application Shell, Navigation & Role Switcher | Primary | Primary | Primary | Secondary |
| F17: Cargo Exception Queue Screen | Primary | Primary | — | Secondary |
| F18: Shipment Review Screen | Primary | Secondary | — | Secondary |
| F19: Recommended Resolution Screen | Primary | Primary | — | Secondary |
| F20: Decision & Audit Record Screen | Secondary | Primary | — | Primary |
| F21: Automated Test Suite | — | — | Secondary | Primary |
| F22: Demo Environment & Reset | — | — | Primary | Primary |

**Coverage check:** all 23 PRD features (F0–F22) are mapped, and every feature has at least one Primary persona. No feature is orphaned; no persona is a duplicate of another — PER-01 reviews and recommends, PER-02 approves and defends, PER-03 configures and operates, PER-04 evaluates from outside the system.

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
