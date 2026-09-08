
## PER-03: Priya Raghavan

### JRN-03.1: Changing What Gets Flagged — Configuration, Not a Release

**Persona:** PER-03 (Priya Raghavan)
**Scenario:** Policy has moved: the HTS completeness rule needs a different expected digit count, and the certificate-of-origin requirement needs to apply at a lower value threshold than it currently does. In every prior system this would be a change request, a developer, and a release — which is how the system drifted away from the policy in the first place. Here Priya makes the change herself as configuration. She fat-fingers the first attempt and is told exactly why it was refused, corrects it, previews which shipments the change would move, revalidates the affected ones to confirm, and then — out of habit and to satisfy a watching stakeholder — tries to act on a shipment herself and is refused. Her change is in the audit trail under her name before she leaves the screen.
**Related Jobs:** JTBD-03.1, JTBD-03.2, JTBD-03.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Inspect the rule set | Signs in as System Administrator and lists the configured rules | Shell (F16) → Rule Administration (F15) | "Show me the rules as data. If this is a code listing dressed up as a screen, I'll know in five seconds." | Skeptical | Rules embedded in code, invisible to the person who owns the policy | Every rule is listed with type, severity, enabled state and policy reference — it reads as configuration because it is configuration | Rule list renders across the three supported exception types with ID, name, type, severity, enabled flag, policy reference and parameters; adjudication surfaces are absent from her navigation entirely |
| Attempt a malformed edit | Edits the HTS rule and sets the expected digit count to a non-numeric value, then saves | Rule Administration (F15) → rule editor | "What happens if I get this wrong at 9am on a demo day?" | Testing, braced | Discovering a bad configuration through a broken or empty queue an hour later | Definitions are validated on save, and the message names what was wrong rather than failing generically | Save rejected with a validation message identifying the invalid parameter; **the prior rule set remains in effect** — there is no partially-applied state and validation behavior is unchanged |
| Make the real change | Corrects the digit count, then edits the missing-document rule's value threshold so the certificate requirement applies to more shipments, and saves | Rule Administration (F15) → rule editor | "No ticket, no developer, no restart. This is the part they won't believe." | Purposeful | Policy changes queueing behind engineering priorities for weeks | Required document types, HTS digit count and format, origin-comparison fields, value thresholds, severity and priority mapping are all editable parameters | Both rules save; **0 code changes, 0 redeploys, no restart**; each change is written to the audit trail with her identity and a timestamp |
| Preview the impact | Views which shipments the change would move before trusting it | Rule Administration (F15) → impact preview (F15, F6) | "Which cases does this actually touch? I'm not finding out through someone else's queue." | Cautious | No way to see the effect of a configuration change before it lands on live results | The effect is inspectable in advance rather than discovered downstream | Impact preview indicates the affected shipments and how their exception sets would change under the new parameters |
| Confirm by revalidation | Revalidates the affected shipments and reads the before/after exception sets | Rule Administration (F15) → revalidation (F6) | "Same entry, same rules, same answer — every time, or none of this is trustworthy." | Satisfied | Non-deterministic evaluation, where the same shipment yields different results on different runs | Evaluation is deterministic, and before/after sets are written to the record so the effect stays inspectable afterwards | Revalidation resolves exceptions that no longer fire, retains those that still do, surfaces newly triggered ones, and writes a revalidation entry with before/after exception sets, actor and timestamp |
| Hit her own boundary | Opens a flagged shipment out of curiosity and attempts an adjudication action | Cargo Exception Queue (F17) → Recommended Resolution (F19) | "If I can approve a shipment, the whole separation-of-duties story is decoration." | Deliberately provocative, then reassured | Role boundaries that are an understanding rather than an enforcement | Her inability to adjudicate is enforced server-side, exactly like the specialist's inability to approve | `403 FORBIDDEN_ROLE` — "System Administrators do not adjudicate shipments"; the denial is written to the audit trail with her identity, the attempted action and the reason |
| Verify attribution | Opens the audit view and confirms both rule changes and the denied attempt appear under her name | Decision & Audit Record (F20) → audit entries (F12) | "Configuration drift is only traceable if somebody's name is on it. Mine is." | Accountable, settled | Nobody being able to say who changed a threshold or when | Rule changes are audit events like any other, in the same timeline and the same format | Audit entries for both rule changes and the denied adjudication attempt, each attributed to her with role and timestamp |

#### Key Moments

- **Decision Point — Attempt a malformed edit:** Priya's trust in the configuration surface is decided by how it fails, not by how it succeeds. A generic error here means she never edits a rule during a live demo again.
- **Delight Opportunity — Make the real change:** zero code changes and zero redeploys is the single claim that converts a rapidly built demo from impressive to survivable.
- **Critical Governance Moment — Hit her own boundary:** the administrator who owns the configuration being unable to adjudicate is what stops her access from becoming the hole in the story.
- **Risk of Abandonment — Preview the impact:** without a way to see the blast radius, she will avoid changing rules at all, which is precisely how the drift she is trying to fix began.

#### Success Outcome

Priya changes a rule parameter and sees the effect on validation results with **0 code changes and 0 redeploys** (JTBD-03.1, PRD §7 Rule configurability). **100% of malformed rule configurations are rejected on save with a clear message and never reach validation** (JTBD-03.2). **100% of her attempts to adjudicate are rejected server-side and logged, and 100% of her rule changes appear in the audit trail attributed to her with a timestamp** (JTBD-03.5, PRD §7 RBAC enforcement).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Inspect the rule set | F16, F15, F4, F14 |
| Attempt a malformed edit | F15, F4 |
| Make the real change | F15, F4, F12 |
| Preview the impact | F15, F6 |
| Confirm by revalidation | F6, F5, F4 |
| Hit her own boundary | F17, F19, F14, F12 |
| Verify attribution | F20, F12 |

---
