
### JRN-02.2: A Clearance Is Challenged — Producing the Record in One Action

**Persona:** PER-02 (Dwayne Okafor)
**Scenario:** Weeks after the fact, a clearance Dwayne approved is questioned by someone who was not in the room. He is the named official on the record, so the question lands on him rather than on the specialist who recommended it. What he needs is not to remember the case — he cannot — but to hand over a complete, chronological, attributed history in one action, with the machine-authored parts distinguishable from the human ones, so the answer is the record rather than his account of it.
**Related Jobs:** JTBD-02.5, JTBD-02.3

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Retrieve | Filters the queue to Cleared, finds the shipment, and opens its audit record | Cargo Exception Queue (F17) → Decision & Audit Record (F20) | "My name is on this one. Show me what my name is attached to." | Tense | Cleared work disappearing from the working surfaces, so the search starts outside the system | Cleared cases remain retrievable and openable, with the approving official shown on the row | Case opens read-only with the full timeline and the approving official displayed |
| Reconstruct | Reads the timeline from ingestion through flagging, AI outputs, document request and upload, revalidation, recommendation and approval | Decision & Audit Record (F20) → timeline (F12) | "Three exceptions, one resolved by the certificate, two accepted on her reasoning. That's what I approved and that's what it says." | Steadying | Records that captured the outcome but not the evidence, the recommendation considered, or the justification | Every entry carries all eight required fields, so there is no gap for the challenge to occupy | Chronological, human-readable, append-only timeline; each finalized decision shows exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, acting user and role, approving official, and the generated notification |
| Separate authorship | Checks which statements in the record were machine-generated | Decision & Audit Record (F20) → AI labeling (F12, F7) | "The confidence level came from the model, not from her. I want that unambiguous before anyone quotes it back at me." | Careful | Treating all text in a case record as equally authoritative because authorship was never marked | AI-authored content is visually separated from human decisions and carries provider/model identifier, generation timestamp and evidence inputs | Every AI entry labeled and attributed; every human entry stamped with acting user and role |
| Check the notifications | Confirms a notification was generated for the approval and reads it beside the decision that produced it | Decision & Audit Record (F20) → notifications (F13) | "Generated, not transmitted — and it says so. Nobody is going to accuse us of having emailed an importer." | Satisfied | Notifications living somewhere other than the decision that caused them | Notifications are shown alongside their originating decision, with explicit generated-not-transmitted labeling | Notification records displayed inline with recipient role, subject, body and generation timestamp |
| Hand it over | Exports the complete record in one action and sends it on | Decision & Audit Record (F20) → export (F12) | "One action, complete record, no assembly. That's the whole difference." | Relieved, in control | Assembling exports and printouts by hand and conceding the gaps that remain | A single export produces the whole chronological attributed history rather than a screenshot set | Full case audit record exported/printable in one action, containing every entry with all eight fields and the associated notifications |

#### Key Moments

- **Decision Point — Reconstruct:** if a single required field is missing anywhere in the history, Dwayne's position collapses and he is defending a decision from memory.
- **Delight Opportunity — Hand it over:** producing the entire record in one action, weeks later, with no preparation, is the moment the audit feature repays its cost.
- **Risk of Abandonment — Separate authorship:** if he cannot tell his own words from the model's, he will start keeping a private parallel file on every approval, which quietly reintroduces the problem the product exists to remove.

#### Success Outcome

Dwayne produces a complete, chronological, attributed case history for any shipment in **a single action**, and **100% of finalized decisions in it contain all 8 required audit fields** (JTBD-02.5 success measure; PRD §7 Audit completeness). Every AI output in the record displays its provider/model identifier, generation timestamp and evidence inputs (JTBD-02.3, PRD §6 Explainability).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Retrieve | F17, F20 |
| Reconstruct | F20, F12 |
| Separate authorship | F20, F12, F7, F16 |
| Check the notifications | F20, F13 |
| Hand it over | F20, F12 |

---
