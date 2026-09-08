
## Cross-Journey Patterns

### Common Pain Points

- **The side channel is the enemy in every journey.** Marisol's document request in email (JRN-01.1, JRN-01.3), Dwayne's approvals arriving informally (JRN-02.1), Priya's rule change queueing behind a release (JRN-03.1), Dwayne's hand-assembled export (JRN-02.2) — four personas, one pathology. Every one of them is solved by binding the artifact to the case record: the request to the exception, the approval to the queue, the rule change to the audit trail, the export to the timeline.
- **"One problem fixed" being read as "shipment clean."** Appears in JRN-01.1 (step 7), JRN-01.3 (revalidate) and JRN-04.1 (watch the document loop). The retained-exception display is the same mechanism serving a specialist's correctness, a supervisor's exposure and an evaluator's scepticism simultaneously.
- **Unlabeled machine text.** Marisol will not act on it (JRN-01.1 step 3), Dwayne cannot weigh it (JRN-02.2), Angela cannot sign off on it (JRN-04.1). Attribution metadata is not a nicety for any of them; it is the precondition for the AI output being used at all.
- **Silent failure.** A greyed-out control with no reason (JRN-01.1 step 8), a rejected upload with a generic error (JRN-01.3), a malformed rule save that fails without saying what was wrong (JRN-03.1), an escalated case that refuses an action without explanation (JRN-01.3). Every persona reads an unexplained refusal as an unreliable system.
- **Records that survive the people who made them.** Marisol months later (JRN-01.4), Dwayne weeks later (JRN-02.2), Angela six months hypothetically (JRN-04.1). The same eight-field completeness rule answers all three time horizons.
- **State that cannot be returned to.** Priya between runs (JRN-03.2) and Angela demanding a live reset (JRN-04.1) are the same requirement viewed from inside and outside the system.

### Shared Opportunities

- **Evidence rendered independently of the AI narrative** (F5 + F19) serves JTBD-01.3, JTBD-02.2 and JTBD-04.3 at once. Build it once, and the specialist can verify, the supervisor can weigh, and the evaluator can audit.
- **Every disabled action stating its own reason** (F09a §5 reason strings) is a single UI contract that satisfies Marisol's usability requirement, Dwayne's confidence in separation of duties, Priya's role boundary, and Angela's autonomy probe.
- **Recording denials as audit entries, not just blocking them,** converts four separate governance claims into observable evidence: blocked self-approval (JRN-02.1, JRN-04.1), blocked administrator adjudication (JRN-03.1), blocked specialist action on an escalated case (JRN-01.3).
- **Deterministic seed plus one-action reset** (F2 + F22) is simultaneously Priya's operational requirement and Angela's credibility test, and it is what makes JRN-01.3 possible as a second pass over the same canonical case.
- **Provenance on every document** (seeded / ingested / simulated upload) closes the simulation boundary for Angela and closes the evidence chain for Marisol with the same field.
- **The queue as the single point of arrival** for both new exceptions and pending approvals removes the informal hand-off from the workflow entirely — the only reason the JRN-01.1 handoff cannot get lost.

### Convergence Points

- **The specialist → supervisor handoff (JRN-01.1 stages 8→9)** is where PER-01, PER-02 and PER-04 all converge on one transition. It is the only point in any journey where authority changes hands, and it is observed by the evaluator while it happens.
- **The Recommended Resolution screen (F19)** is shared by PER-01 taking one of five actions, PER-02 approving or rejecting, PER-03 discovering she may do neither, and PER-04 watching all three. Four personas, one screen, four different sets of available controls — and the differences are the governance story.
- **The Decision & Audit Record screen (F20)** is where every journey terminates: Marisol defending, Dwayne exporting, Priya verifying her own attribution, Angela interrogating. It is read-only for all four, which is why it can be trusted by all four.
- **Priya's rule set is the upstream cause of Marisol's queue.** The exceptions in JRN-01.2 exist because of the configuration in JRN-03.1, and Angela watches the causal link demonstrated live in JRN-04.2.
- **The reset (JRN-03.2) precedes JRN-01.1, JRN-01.3 and JRN-04.1.** Determinism is not a background property; it is a stage in one journey that every other journey depends on.

---
