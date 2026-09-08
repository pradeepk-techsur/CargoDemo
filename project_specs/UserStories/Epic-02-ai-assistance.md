
## Epic 2: AI Assistance — Explain and Recommend (F7)

AI that reduces reconstruction time, grounded in captured evidence, always labelled and attributable, and structurally incapable of taking an action.

### US-2.1: Read a Plain-Language Summary of Why a Shipment Was Flagged
**As a** Marisol Reyes (Cargo Specialist), **I want to** read a plain-language explanation of what the shipment is and why it was flagged, **so that** I understand the case in seconds instead of reconstructing it from raw entry data.

**Acceptance Criteria:**
- [ ] The summary describes the shipment (commodity, importer, carrier, value, origin) and each detected exception in non-technical language
- [ ] Every claim in the summary references the specific fields or documents involved, drawn from the captured evidence
- [ ] The summary is generated at request time from current shipment state; no in-app model training exists
- [ ] The summary is cached against the shipment's evaluation version and regenerated on revalidation
- [ ] A first-time specialist can identify why the shipment was flagged in under 30 seconds without leaving the Shipment Review screen
- [ ] The summary panel never blocks the screen: the shipment, documents and validation panels render independently of it

**Priority:** P0 | **Feature Ref:** F7, F18

---

### US-2.2: See Every AI Output Labelled and Attributed
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** every machine-generated statement to be visibly labelled as AI-generated and to carry its provenance, **so that** I can always tell what a model said from what an official decided.

**Acceptance Criteria:**
- [ ] Every AI output displays its provider/model identifier, generation timestamp and generation mode
- [ ] Every AI output displays the rule and evidence inputs it was grounded in
- [ ] AI content is rendered inside an explicit AI-content label wherever it appears, and never inside a human-decision container
- [ ] AI-generated content is distinguishable from human-authored content on the Shipment Review, Recommended Resolution and Decision & Audit Record screens
- [ ] The distinction is conveyed by text label and icon, not by colour alone
- [ ] AI output is never presented as a finding — the validation results panel is populated from the exception API, not from the AI response

**Priority:** P0 | **Feature Ref:** F7, F8, F18, F19, F20

---

### US-2.3: Continue the Walkthrough When the AI Provider Is Unavailable
**As a** Priya Raghavan (System Administrator), **I want to** a deterministic offline fallback to serve the summary and recommendation when the provider is unavailable or slow, **so that** the demo never depends on network availability.

**Acceptance Criteria:**
- [ ] AI summary and recommendation return within 5 seconds at p95
- [ ] If the provider has not responded within 10 seconds, the deterministic fallback is served automatically
- [ ] The fallback summary and fallback recommendation are clearly labelled as offline fallback output
- [ ] The fallback recommendation is derived deterministically from rule severity and produces the same recommended action as the online path
- [ ] A graceful-degradation banner is visible in the application shell while fallback mode is active
- [ ] The pre-demo health check reports AI-assist availability including fallback status
- [ ] The full 10-step walkthrough completes successfully with the AI provider disabled

**Priority:** P0 | **Feature Ref:** F7, F8, F22

---

### US-2.4: See a Recommended Resolution with an Explicit Confidence Level
**As a** Marisol Reyes (Cargo Specialist), **I want to** see which of the five actions the AI suggests, with its confidence level, basis and rationale, **so that** I have advice I can weigh rather than an instruction I must follow.

**Acceptance Criteria:**
- [ ] The recommendation names exactly one of the five user actions as the suggested next step
- [ ] The recommendation is presented alongside the exception detected, the triggering rule/policy with its reference, the supporting evidence and the missing information
- [ ] A confidence level (High / Medium / Low) is always displayed together with a stated basis; a confidence badge without a basis is a defect
- [ ] The rationale is in plain language and traceable to specific evidence
- [ ] The recommendation is rendered as a statement (e.g. "AI suggests: Escalate to supervisor"), never as a pre-selected control
- [ ] The recommendation is inert: no action executes until a human selects one and submits it
- [ ] The recommendation and its confidence are snapshotted onto the case so the audit record shows what the human was advised

**Priority:** P0 | **Feature Ref:** F8, F19

---

### US-2.5: Have Agreement or Divergence with the AI Recorded
**As a** Dwayne Okafor (Supervisor), **I want to** the record to state whether the human decision agreed with or diverged from the AI recommendation, **so that** I can tell whether the specialist exercised independent judgement.

**Acceptance Criteria:**
- [ ] Every submitted action snapshots the current AI recommendation and computes a concurrence verdict
- [ ] When no recommendation had been generated, the snapshot records `{ present: false, reason: "NOT_GENERATED" }` rather than being left null
- [ ] The concurrence verdict is displayed on the post-submission confirmation
- [ ] The concurrence verdict is displayed on the audit timeline entry as "the decision agreed with / diverged from the AI recommendation"
- [ ] A justification that exactly matches the AI rationale string is rejected with `JUSTIFICATION_NOT_AUTHORED`

**Priority:** P0 | **Feature Ref:** F8, F12

---
