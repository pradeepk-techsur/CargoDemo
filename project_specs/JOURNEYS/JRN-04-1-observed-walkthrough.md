
## PER-04: Angela Pruitt *(observer — no system account)*

### JRN-04.1: Watching the Ten Steps and Judging Them From Outside

**Persona:** PER-04 (Angela Pruitt)
**Scenario:** Angela attends the live walkthrough with no account, no role and no intention of touching a keyboard. She watches `SHP-2026-0007` travel from the exception queue to `CLEARED` over Marisol's shoulder and then Dwayne's, and her evaluation is conducted entirely through what the four primary screens show her and what she can make the operators prove on demand. She is testing two things and only two things: whether the machine ever took an action a human should have taken, and whether the decision she is watching being made would still be defensible in six months. Her touchpoints below are therefore *what she observes* and *what she asks them to demonstrate* — she operates nothing.
**Related Jobs:** JTBD-04.1, JTBD-04.2, JTBD-04.3

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Set the terms | States up front that she will ask for steps out of order and wants the environment reset in front of her before it starts | Observed: Demo Environment reset (F22), shell (F16) | "If this only runs one way, I'll know within three minutes." | Sceptical, professionally polite | Demonstrations built on a rehearsed click-path that collapse the moment the sequence changes | The environment is reset live in front of her and the canonical case appears verbatim, so what follows starts from a state she watched being created | Reset completes in one action; the queue renders the seeded set with the canonical shipment present and all three exceptions flagged |
| Watch the queue and the open *(steps 1–2)* | Watches Marisol scan the queue and open the flagged shipment; asks how she knew that row was the hard one | Observed: Cargo Exception Queue (F17) → Shipment Review (F18) | "Real data, real list, real click — not a slide of a list." | Attentive | Working APIs presented as finished products, with no usable surface for the people who would do the work | The humans who would actually do this work are operating actual screens, which is the thing she came to see | Queue and detail both render in under a second against seeded data with no manual entry; multi-exception shipment marked as such |
| Interrogate the AI summary *(step 3)* | Asks who wrote the summary, when, and from what | Observed: Shipment Review → AI summary panel (F7) | "Machine text I can't trace to a field is text I can't sign off on." | Probing | AI-generated prose that cannot be tied to a specific field or document, and therefore cannot be accepted | The summary is labeled AI-generated and carries provider/model identifier, generation timestamp and the evidence inputs it used | Attribution metadata displayed on the panel; every claim in the summary names the field or document it rests on |
| Check the evidence *(step 4)* | Asks Marisol to show her the raw values behind the origin claim, independent of the summary | Observed: Recommended Resolution (F19) | "`Malaysia` against `China`. Fine — that's a fact, not an assertion." | Satisfied on this point | Conclusions asserted without the underlying field values, forcing acceptance on trust | Evidence and triggering rule are displayed independently of the AI narrative, so the narrative can be checked rather than believed | Each exception shows its rule, policy reference, severity and concrete field-level evidence; the AI recommendation is shown with an explicit confidence level and is visibly advisory |
| Watch the document loop *(steps 5–7)* | Watches the request, the upload and the revalidation; asks pointedly what happened to the *other* two exceptions | Observed: Shipment Review (F18), documents panel and validation results (F10, F6) | "Everyone's demo resolves the one problem. Show me the two you didn't resolve." | Testing | Systems that report a shipment clean because one issue was fixed, hiding the ones still firing | Exactly one exception resolves and two are retained, stated on screen in those terms | Revalidation at v2 completes in under two seconds: missing-document exception marked resolved-by-revalidation, **origin-conflict and incomplete-HTS retained** and still displayed with their evidence |
| Probe for autonomy *(step 8)* | Asks what the system can do without a human, and asks Marisol to attempt to approve her own recommendation | Observed: Recommended Resolution (F19) → action panel (F9, F11) | "This is the question. If anything here can clear cargo on its own, we're finished." | Focused, unblinking | Automation in an enforcement context is rejected regardless of accuracy if it removes the human from the loop | The AI recommendation is inert until a human selects an action, and no action is pre-selected or auto-submitted | Marisol's attempt returns `403 SELF_APPROVAL_BLOCKED` — "You submitted this recommendation and cannot decide on it" — and the refused attempt is written to the audit trail |
| Watch the approval *(step 9)* | Watches Dwayne adjudicate and asks whose name ends up on the clearance | Observed: Recommended Resolution (F19) → approval panel (F11) | "A different human, named, with the evidence in front of him. That is what I needed to see." | Cautiously convinced | Clearance reachable without a named approving official, destroying the traceability oversight depends on | There is exactly one transition to `CLEARED`, it requires a supervisor, and it requires an official distinct from the recommender | Case moves to `CLEARED` with `approving_official` recorded by name; the eight-field audit gate passes before commit; notification generated |
| Interrogate the record *(step 10)* | Picks a case herself — not the one they wanted to show her — and asks for its complete record | Observed: Decision & Audit Record (F20) | "Not that one. That one. Show me the whole basis for it." | Rigorous, then satisfied | Historical decisions that recorded only the outcome, leaving the reasoning unrecoverable | The record for a decision she just watched is available immediately, chronological, attributed and read-only by construction | Timeline replays ingestion, flagging, AI outputs, request, upload, revalidation, recommendation, approval and notifications; all 8 required fields present on the finalized decision; AI content visually separated from human decisions; no edit or delete affordance anywhere |

#### Key Moments

- **Decision Point — Probe for autonomy:** Angela's adoption question is answered here. A single autonomous path would end the evaluation regardless of everything else on screen.
- **Decision Point — Interrogate the record:** she chooses the case, which converts the audit screen from a demonstration into a test.
- **Delight Opportunity — Watch the document loop:** being told "one resolved, two retained" without having to ask is the moment the product distinguishes itself from the demonstrations she has sat through before.
- **Risk of Abandonment — Interrogate the AI summary:** unlabeled or ungrounded machine text would confirm her prior that this is another unverifiable tool, and the remaining steps would be watched as theatre.
- **Risk of Abandonment — Set the terms:** if the reset cannot be run in front of her, she treats everything after it as pre-arranged.

#### Success Outcome

**10 of 10 walkthrough steps complete end-to-end** in the preview environment with zero manual data entry and zero developer intervention (JTBD-04.1). **0 AI-initiated actions and 0 clearances without a recorded approving official** across the session (JTBD-04.2). **100% of finalized decisions carry all 8 required audit fields**, demonstrated on a case Angela selects herself, with every machine-generated statement traceable to a displayed field value or document (JTBD-04.3).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Set the terms | F22, F2, F16 |
| Watch the queue and the open *(steps 1–2)* | F17, F18, F5 |
| Interrogate the AI summary *(step 3)* | F18, F7 |
| Check the evidence *(step 4)* | F19, F5, F4, F8 |
| Watch the document loop *(steps 5–7)* | F18, F10, F6 |
| Probe for autonomy *(step 8)* | F19, F9, F11, F8 |
| Watch the approval *(step 9)* | F19, F11, F14, F13 |
| Interrogate the record *(step 10)* | F20, F12, F13 |

---
