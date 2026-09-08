### Governance Negatives — What the System Must Refuse

*These lanes are R1 by rule: a governance claim that is not enforced in the demo release is a claim PER-04
will disprove in the session. Every row here is something the system must refuse **and record refusing**.*

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Reject invalid state transitions server-side with a stated reason instead of accepting and dropping them | PER-01 | Epic 3 (F9, F12) | US-3.6 | JTBD-01.5: invalid transitions are refused with an explanatory reason, and the refusal is written to the audit trail | R1 |
| Enforce authorisation server-side on every mutating operation, and log every unauthorised attempt | PER-04 | Epic 8 (F14, F21) | US-8.4 | JTBD-02.4: 100% of protected operations reject unauthorised roles server-side; UI hiding alone never satisfies the check | R1 |
| Prevent the AI from clearing, holding or escalating anything on its own | PER-04 | Epic 12 (F8, F9, F12) | US-12.1 | JTBD-04.2: **0 AI-initiated actions** across the session; the recommendation is inert until a human selects an action; no scheduler, queue or webhook acts on cases | R1 |
| Prevent a specialist from approving their own recommendation | PER-02 | Epic 12 (F11, F14, F12) | US-12.2 | JTBD-02.4: the attempt returns `403 SELF_APPROVAL_BLOCKED`, the case never leaves `PENDING_APPROVAL`, and the refused attempt appears in the audit trail | R1 |
| Prevent any path to Cleared without a named approving official | PER-04 | Epic 12 (F11, F9, F6) | US-12.3 | JTBD-04.2: **0 clearances without a recorded approving official**; revalidation, ingestion and re-seeding can never produce `CLEARED` | R1 |
| Prevent audit records from being edited or deleted | PER-04 | Epic 12 (F12, F22) | US-12.4 | JTBD-01.6: no application path mutates or removes an audit entry; append-only is enforced at the storage boundary, not by convention | R1 |
| Prevent a decision without a human-authored justification | PER-02 | Epic 12 (F9, F11, F12) | US-12.5 | JTBD-01.5: every action and every approval requires a justification; no decision is finalisable with the field missing | R1 |
| Prevent role boundaries from being crossed — including the administrator's own inability to adjudicate | PER-03 | Epic 12 (F14, F9, F15) | US-12.6 | JTBD-03.5: administrator adjudication returns `403 FORBIDDEN_ROLE` and is logged; non-administrators are blocked from the rule endpoints the same way | R1 |
| Prevent excluded capabilities from reappearing — no ACE client, no fourth exception type, no real data, no outbound transport | PER-04 | Epic 12 (F1, F4, F2, F14, F13, F7, F16) | US-12.7 | JTBD-04.5: every PRD §5.8 exclusion is asserted absent by test, so scope discipline is a recorded decision rather than a narration | R1 |

### Proof by Test — Claims Held by Something Other Than Narration

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Cover rule evaluation and revalidation by test — three types, positive, negative, multi-exception, parameter change | PER-03 | Epic 10 (F21, F4, F6) | US-10.1 | JTBD-04.5: rule tests cover all three exception types in both directions plus the resolve-one/retain-two revalidation case | R1 |
| Cover workflow transitions, RBAC and audit completeness by test | PER-04 | Epic 10 (F21, F9, F11, F12, F14) | US-10.2 | JTBD-04.5: every valid and invalid transition, each role against each protected operation, blocked self-approval, blocked rule editing, and append-only enforcement are asserted | R1 |
| Cover all ten walkthrough steps end-to-end in one test against seeded data | PER-03 | Epic 10 (F21, F22) | US-10.3 | JTBD-04.1: one test executes steps 1–10 and fails if any step stops working — the walkthrough is regression-protected, not rehearsed | R1 |

### Off-Script Resilience — Out of Order, Provider Off, Reset Live

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Survive out-of-sequence navigation, stakeholder-chosen cases, mid-session AI disablement and mid-session reset | PER-04 | Epic 11 (F22, F2, F17) | US-11.11 | JTBD-04.1: any of the four screens opens directly by URL and renders correctly; every off-script request is served by the running system; no step leaves the application broken | R1 |
| Continue the walkthrough with the AI provider unavailable, on a labelled deterministic fallback | PER-03 | Epic 2 (F7, F8, F22) | US-2.3 | JTBD-03.3: fallback summary and recommendation are served and **clearly labelled as fallback** with a degradation banner; the full walkthrough completes with the provider disabled | R1 |

### Unhappy Path — Refused Upload, Hold and Escalation (JRN-01.3)

*The five actions are a first-class R1 deliverable (US-3.1): a five-action panel where three actions do
nothing would be a governance claim the panel itself contradicts. The behaviours below therefore ship in R1.*

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Refuse anything other than a synthetic document fixture, before anything is written | PER-03 | Epic 4 (F10) | US-4.3 | JTBD-01.4: a renamed archive is refused with `422 FILE_CONTENT_MISMATCH`; **no document row, no revalidation, no partial state** — the request stays outstanding | R1 |
| Place a case on hold with a stated reason | PER-01 | Epic 3 (F9) | US-3.4 | JTBD-01.5: the hold action requires a justification and produces an audit entry and a notification like any other action | R1 |
| Escalate to a supervisor and have authority actually transfer | PER-01 | Epic 3 (F9) | US-3.5 | JTBD-01.5: after escalation her own follow-up returns `403 ESCALATED_REQUIRES_SUPERVISOR` with a stated reason, and the denial is itself an audit entry | R1 |
| Send a case back for specialist review | PER-02 | Epic 3 (F9) | US-3.3 | JTBD-02.2: the action returns the case to a specialist with the reason attached rather than closing it | R1 |

### Shift Start — Ordering the Work Before Touching It (JRN-01.2)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Filter by status, exception type and priority and sort by priority and age, deterministically | PER-02 | Epic 9 (F17) | US-9.3 | JTBD-01.1: the next case is chosen in <15s with no speculative opens; identical filters yield identical order on every run; status and priority are conveyed by label, not colour alone | R1 |

*JRN-01.2's remaining stages are served by stories already placed on the backbone: Arrive by US-8.1 and
US-9.1 (Step 0), Survey by US-9.2 and US-9.4 (Step 1), Choose by US-11.2 (Step 2), and Re-enter by US-9.2's
post-action queue refresh (Step 1).*

### Adjudication Depth — Return, Re-Weigh, Re-Read (JRN-02.1)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Reject or return a recommendation with a reason code and a fuller justification | PER-02 | Epic 5 (F11, F13) | US-5.4 | JTBD-02.2: rejection requires a reason code plus a ≥40-character justification, returns the case to its author with the reason attached, and leaves the exceptions `OPEN` | R2 |
| Be warned, and required to acknowledge, when the evidence changed since the recommendation was made | PER-02 | Epic 5 (F11, F6) | US-5.5 | JTBD-02.2: approval is refused with `EVIDENCE_CHANGED_UNACKNOWLEDGED` until the version diff is acknowledged, and the acknowledgement is recorded on the approval | R2 |

### Rule Administration as Configuration (JRN-03.1, JRN-04.2)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| List, create, edit, enable and disable rules and their parameters from an administrative surface | PER-03 | Epic 8 (F15, F14) | US-8.5 | JTBD-03.1: a rule parameter is changed and validation results reflect it with **0 code changes and 0 redeploys**; malformed configuration is rejected on save with a message naming what was invalid, and the prior rule set stays in effect | R2 |
| Preview the impact of a rule change, confirm it by revalidation, and have the change attributed | PER-03 | Epic 8 (F15, F12, F6) | US-8.6 | JTBD-03.2 / JTBD-04.4: affected shipments are indicated before the change is trusted, before/after exception sets are recorded, and 100% of rule changes appear in the audit trail under the administrator's name and timestamp | R2 |

### Demo Operations — Start, Reset, Pre-Flight (JRN-03.2)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Start and reset a demo-ready environment in one command / one action | PER-03 | Epic 10 (F22, F2) | US-10.4 | JTBD-03.4: single-command start on a deterministic port; one-action reset to pristine seeded state with no manual database intervention; **3 consecutive post-reset walkthroughs produce identical results** | R1 |
| Confirm database, seed data and AI-assist status in a single pre-flight check before presenting | PER-03 | Epic 10 (F22) | US-10.5 | JTBD-03.3: one health check reports database availability, seed presence and AI-assist status including fallback mode, before the audience is in the room | R2 |
| Accept cargo entries posted to a local ingestion endpoint under the same schema | PER-03 | Epic 0 (F1, F14) | US-0.3 | JTBD-03.4: posting an existing shipment ID updates rather than duplicates, and ingestion triggers validation automatically | R2 |

---
