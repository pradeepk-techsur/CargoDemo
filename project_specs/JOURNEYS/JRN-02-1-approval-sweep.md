
## PER-02: Dwayne Okafor

### JRN-02.1: The Approval Sweep — One Returned, One Approved, One Attempt Blocked

**Persona:** PER-02 (Dwayne Okafor)
**Scenario:** Dwayne checks in on the team mid-morning. What he wants first is not the whole queue but the subset of it that is waiting on his signature, because a recommendation nobody told him about is a shipment quietly aging. He works two recommendations back to back. The first he returns to its author — the justification asserts a conclusion the evidence does not carry, and returning it has to attach a reason rather than simply closing the case. The second is `SHP-2026-0007`, the canonical solar-panel case: two exceptions still open, a specialist recommending clearance anyway, and a justification that has to earn his signature. He approves it, becomes the named approving official, and then — because a stakeholder asked — opens the audit trail of a third case where a specialist attempted to approve her own recommendation and was refused.
**Related Jobs:** JTBD-02.1, JTBD-02.2, JTBD-02.3, JTBD-02.4

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Check in | Signs in as Supervisor and looks at the queue across the whole team, all statuses | Shell (F16) → Cargo Exception Queue (F17) | "Where is the backlog and what's aging in it?" | Watchful | No reliable read on team workload, so escalation is always reactive | He sees every specialist's work and every status in one list, scoped server-side to what his role may act on | Full-team queue renders with status, priority, exception type and age; pending-approval rows are visually distinct from everything else |
| Isolate approvals | Applies the pending-approval filter | Cargo Exception Queue (F17) → filter (F11) | "Two waiting on me. Neither of them should have had to wait at all." | Focused | Approvals arriving through informal channels and sitting unnoticed | Pending-approval work is a first-class filter, not something he has to hunt for by reading statuses | Filtered list returns only cases in `PENDING_APPROVAL`, each showing the recommender, submission time, and the exception set |
| Adjudicate #1 — return it | Opens the first recommendation, reads the evidence against the justification, selects **Reject**, chooses `INSUFFICIENT_JUSTIFICATION`, and writes a fuller reason | Recommended Resolution (F19) → approval panel (F11) | "She's right about the conclusion and hasn't shown her working. I'm not signing that, but I'm not killing the case either." | Firm, not punitive | Rejections that close a case instead of returning it, forcing the specialist to start over | Rejection returns the case to its author with the reason attached, and the work goes back to the person who owns it | Rejection requires a reason code and a justification of at least 40 characters; recommendation → `REJECTED`; exceptions remain `OPEN`; case `PENDING_APPROVAL → IN_REVIEW` and is reassigned to the recommender; audit entry plus a notification titled "Clearance recommendation returned" |
| Adjudicate #2 — read the record | Opens `SHP-2026-0007` and reads the exception set, field-level evidence, AI recommendation with its confidence and concurrence, and Marisol's justification, in one view | Recommended Resolution (F19) → approval panel (F11, F8, F12) | "Two exceptions still open and she's recommending clearance. Her reasoning has to carry that, because my name is what goes on it." | Deliberate, exposed | Approving on the strength of a summary because the backing evidence was never assembled at the decision point | Exception, triggering rule with policy reference, evidence, AI advice with confidence, and the named specialist justification are all on the decision screen with no navigation away | Panel renders recommender name and role, submission timestamp, `resolution_basis`, enumerated exceptions with evidence, the specialist justification, and the AI recommendation labeled as machine-generated with provider, timestamp and evidence inputs |
| Adjudicate #2 — approve | Notices an evidence-changed warning (the recommendation was made at evaluation v2; a later revalidation produced v3), reviews the diff, acknowledges it, and approves with his own justification | Recommended Resolution (F19) → approval panel (F11, F6) | "She decided on different evidence than I'm looking at. I need to know what moved before I sign." | Cautious, then decided | Signing off on a case whose evidence shifted underneath the recommendation without anyone noticing | The version mismatch is detected and surfaced rather than left to chance, and his acknowledgement is recorded on the approval | Approval is refused with `EVIDENCE_CHANGED_UNACKNOWLEDGED` until he acknowledges; on submission SoD-1 and SoD-2 both pass, the eight-field audit gate passes with a non-null approving official, remaining exceptions close as `CLEARED_BY_DECISION`, case → `CLEARED` with `approving_official = Dwayne Okafor`, notification generated |
| Confirm the structure holds | Opens a third case's audit trail where a specialist attempted to approve her own recommendation | Decision & Audit Record (F20) → audit timeline (F12, F14) | "It's in the log. The attempt was refused *and* recorded — that's the part that matters." | Reassured | Relying on a procedural agreement that specialists will not finalize their own recommendations, with nothing preventing it | Self-approval is blocked server-side, not merely hidden in the interface, and the refusal is itself an audit entry | Timeline shows an `ACCESS_DENIED` entry with the acting user, the attempted action, the case status and the reason `SELF_APPROVAL_BLOCKED`; the case never left `PENDING_APPROVAL` |

#### Key Moments

- **Decision Point — Adjudicate #2 — approve:** the only transition in the system that reaches `CLEARED`. Everything the product claims about human authority is settled here or not at all.
- **Decision Point — Adjudicate #1:** returning a colleague's work is socially costly; the mandatory 40-character reason makes the cost productive rather than avoided.
- **Critical Governance Moment — Confirm the structure holds:** the difference between a blocked action and a *recorded* blocked action is the difference between a control and evidence of a control.
- **Risk of Abandonment — Isolate approvals:** if pending work is buried among new exceptions, Dwayne reverts to being told about approvals informally, and the chain becomes procedural again.
- **Delight Opportunity — Adjudicate #2 — read the record:** finding the specialist's justification, the evidence and the AI's confidence assembled in one place removes the round-trip that normally ages the shipment by a day.

#### Success Outcome

Dwayne locates every case awaiting his approval in a single filtered view in **under 15 seconds** (JTBD-02.1). For **100% of recommendations he adjudicates**, the exception, evidence, AI advice with confidence and the specialist's named justification are visible without navigating away, and every rejection carries a recorded reason (JTBD-02.2). **0 shipments reach `CLEARED` without a recorded approving official**, and self-approval is rejected server-side and logged (JTBD-02.4, PRD §7 Human authority, RBAC enforcement).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Check in | F16, F17, F14 |
| Isolate approvals | F17, F11 |
| Adjudicate #1 — return it | F19, F11, F12, F13 |
| Adjudicate #2 — read the record | F19, F11, F8, F12, F5 |
| Adjudicate #2 — approve | F19, F11, F6, F12, F13, F14 |
| Confirm the structure holds | F20, F12, F14 |

---
