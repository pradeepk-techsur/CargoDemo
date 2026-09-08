
### JRN-01.4: Defending a Call She No Longer Remembers Making

**Persona:** PER-01 (Marisol Reyes)
**Scenario:** A shipment Marisol recommended for clearance months ago is being revisited. She has no memory of it — it was one of thirty that week. What she needs is not a summary of what was decided but a reconstruction of what she was *looking at* when she decided it: which exceptions were open, what the evidence said, what the machine advised, and what she wrote. If the record only tells her the outcome, she is reduced to re-arguing the case from first principles, which reads as justification rather than record.
**Related Jobs:** JTBD-01.6

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Locate | Filters the queue to Cleared and finds the shipment by ID | Cargo Exception Queue (F17) | "I don't remember this at all. Please tell me the record does." | Anxious | Historically the search starts in old email threads, not in the system | Cleared cases stay in the queue and remain openable rather than disappearing from view | Cleared shipment listed with its status and approving official; row opens the case |
| Replay | Opens the Decision & Audit Record and reads the timeline from ingestion forward | Decision & Audit Record (F20) | "There it is — this is what was on my screen that day." | Relief | Records that captured the outcome and nothing else | Every entry carries the exceptions involved, the evidence reviewed, the AI recommendation and confidence, her decision, her justification, the timestamp, and her name and role | Chronological, human-readable timeline covering ingestion, flagging, AI outputs, document request and upload, revalidation, recommendation and approval, with AI-authored content visually separated from human decisions |
| Verify authorship | Checks which statements were hers and which were the model's | Decision & Audit Record (F20) | "That paragraph wasn't mine — and it's labeled, so nobody can claim it was." | Reassured | Machine text quoted back at her as though she had written it | AI content is labeled everywhere it appears, with provider/model identifier, generation timestamp and evidence inputs | Attribution metadata rendered on every AI entry; human entries carry acting user and role |
| Answer | Reads her own justification back, confirms it is grounded in evidence still displayed beside it, and answers the challenge from the screen | Decision & Audit Record (F20) | "I can defend this from the record without adding a word to it." | Confident | Assembling a partial record by hand and conceding the gaps | The record is read-only and append-only by construction — nothing on it can be alleged to have been tidied afterwards | No edit or delete affordance exists anywhere on the screen; the record can be exported or printed in a single action for whoever asked |

#### Key Moments

- **Decision Point — Replay:** whether Marisol can answer from the system or has to go outside it. The entire audit feature is judged in the first ten seconds of this stage.
- **Delight Opportunity — Verify authorship:** discovering that machine-authored text is permanently distinguishable from her own words removes a category of professional risk she has simply lived with until now.
- **Risk of Abandonment — Locate:** if cleared cases vanish from the working surfaces, she will assume the record is gone too and stop looking.

#### Success Outcome

For any case Marisol previously touched she reconstructs what she reviewed and what she wrote **without consulting any source outside the system**, and **100% of her finalized decisions carry all 8 required audit fields** (JTBD-01.6 success measure; PRD §7 Audit completeness).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Locate | F17, F16 |
| Replay | F20, F12 |
| Verify authorship | F20, F12, F7, F16 |
| Answer | F20, F12, F13 |

---
