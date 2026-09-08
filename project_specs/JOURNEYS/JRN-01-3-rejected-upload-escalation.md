
### JRN-01.3: When It Goes Wrong — A Rejected Upload, an Unsatisfying Certificate, and an Escalation

**Persona:** PER-01 (Marisol Reyes)
**Scenario:** A second run of the canonical case after a demo-environment reset, taken down the branch the happy path does not show. `SHP-2026-0007` is back at evaluation v1 with its three exceptions. Marisol requests the certificate of origin as before, but this time the first file she is handed is not what it claims to be and the system refuses it. The second file is accepted — and makes things worse: the certificate itself asserts China as the country of origin, which satisfies the *document* requirement while hardening the *origin* exception rather than easing it. Marisol is now looking at a shipment where the paperwork is complete and the story still does not hold together. Recommending clearance would be indefensible, so she escalates to a supervisor instead — and immediately discovers that escalation is not a label but a transfer of authority: she can no longer act on the case at all.
**Related Jobs:** JTBD-01.4, JTBD-01.5, JTBD-01.3

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Re-open | Opens `SHP-2026-0007` from the queue on a freshly reset environment | Cargo Exception Queue (F17) → Shipment Review (F18) | "Same shipment, clean slate. Let's see whether it behaves identically." | Neutral, testing | A demo that only survives one rehearsed run is a demo, not a system | Deterministic seeding means the case presents identically to the previous run, so a second pass is a real second pass | Three open exceptions at evaluation v1 with identical evidence, identical priority and identical status to the prior run |
| Request | Requests `CERTIFICATE_OF_ORIGIN` with a justification | Recommended Resolution (F19) → action panel (F10) | "Same request as last time. The gap is the same gap." | Routine | — (this step is unremarkable, which is the point) | The request is bound to the exception and the rule, so the reason it exists survives her going off shift | Request `OUTSTANDING`; case `NEW → AWAITING_INFORMATION`; audit entry and notification written |
| Rejected upload | Selects a file that is not the fixture — an archive renamed with a `.pdf` extension — and attempts to attach it | Shipment Review (F18) → documents panel (F10) | "If it takes that, then nothing here means anything." | Testing, braced | A permissive upload would let any file close any requirement, which would quietly void the whole evidence chain | Magic-byte validation catches the mismatch before anything is written to disk or to the database | Upload rejected with `422 FILE_CONTENT_MISMATCH` — "File content does not match its declared type"; **nothing is written**: no document row, no revalidation, request stays `OUTSTANDING`, case stays `AWAITING_INFORMATION`; the rejection is surfaced inline rather than as a generic failure |
| Accepted but unhelpful upload | Uploads the correct certificate fixture, recording that the certificate asserts China as the stated country | Shipment Review (F18) → documents panel (F10) | "The document arrived. It just says the opposite of the entry." | Uneasy | The old trap: paperwork complete is read as problem solved, and the shipment is waved through | The document's stated origin is captured as a field the rules can read, so the certificate becomes evidence rather than a checkbox | Document attached with `provenance = SIMULATED_UPLOAD`; request `FULFILLED`; revalidation runs automatically at v2 |
| Revalidate | Reads the revalidation outcome | Shipment Review (F18) → validation results (F6) | "One resolved, two retained — and the origin evidence is now *worse*, not better." | Concerned, alert | Being told a shipment is clear when a rule is still firing | Resolved exceptions are marked resolved-by-revalidation rather than deleted, and the retained origin exception shows its new supporting evidence alongside the original | Missing-document exception → `RESOLVED_BY_REVALIDATION`; **origin-conflict and incomplete-HTS exceptions retained**; the origin exception's evidence set now also carries the certificate's stated country; case `AWAITING_INFORMATION → IN_REVIEW`; AI summary and recommendation regenerate at v2 |
| Weigh and reject the recommendation | Opens the action panel, reads the AI recommendation, and decides against clearance | Recommended Resolution (F19) → action panel (F8, F9) | "The model is advising a path I can't defend on this evidence. It advises; I decide." | Resolute | A tool that pre-selects or nudges toward the machine's answer would make her disagreement feel like deviation | No action is pre-selected or auto-submitted, and the screen states plainly that the AI recommends and the human decides | The five actions are presented with availability and reasons; the AI recommendation is displayed with its confidence level and rationale, inert until she selects something |
| Escalate | Selects **Escalate to supervisor**, writes a justification naming the origin conflict and the certificate's contradiction, and submits — then tries to add a document request and is refused | Recommended Resolution (F19) → action panel (F9) | "This needs someone with more authority than me. And now it's genuinely out of my hands — good." | Relieved, slightly disarmed | Escalation that is only a status label leaves the case ambiguous about who owns it | Escalation transfers authority structurally: her subsequent attempt is refused with a stated reason rather than silently failing | `ESCALATE_TO_SUPERVISOR` executes; case `IN_REVIEW → ESCALATED`; audit entry and Supervisor-addressed notification written. Her follow-up attempt returns `403 ESCALATED_REQUIRES_SUPERVISOR` — "This case has been escalated; only a Supervisor can act on it" — and **the denial itself is written to the audit trail** |

#### Key Moments

- **Decision Point — Weigh and reject the recommendation:** the single most important moment in the demo's governance story. The human diverges from the machine and the system treats that as normal rather than exceptional.
- **Trust-Building Moment — Rejected upload:** a refusal that names its reason and leaves no partial state is worth more to Marisol's confidence than a dozen successful happy-path steps.
- **Risk of Abandonment — Accepted but unhelpful upload:** if the system had marked the case clean because a document arrived, Marisol would never again trust a revalidation result, and the product's central claim would be dead in her hands.
- **Delight Opportunity — Escalate:** discovering that escalation actually removes her ability to act tells her that the role boundaries elsewhere are probably real too.

#### Success Outcome

Every failure in this journey is **visible, explained, and non-destructive**: the rejected upload leaves no partial state, the accepted upload resolves exactly the exception it addresses and retains the two that still fire (JTBD-01.4), every action carries a mandatory justification and produces an audit entry, and every unavailable action states why it is unavailable (JTBD-01.5, PRD §6 Usability). The denied post-escalation attempt is itself recorded, satisfying the invariant that rejected actions are governance-relevant information rather than silent no-ops.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Re-open | F17, F18, F2, F22 |
| Request | F19, F10, F9, F12 |
| Rejected upload | F18, F10 |
| Accepted but unhelpful upload | F18, F10 |
| Revalidate | F18, F6, F5, F7, F8 |
| Weigh and reject the recommendation | F19, F8, F9 |
| Escalate | F19, F9, F14, F12, F13 |

---
