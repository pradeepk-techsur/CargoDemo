
## Journey-to-JTBD Traceability

| Journey Stage | JTBD ID | Expected Outcome |
|--------------|---------|-----------------|
| JRN-01.2:Survey | JTBD-01.1 | Every flagged shipment shows ID, importer, exception type, priority and status without being opened; multi-exception shipments are never collapsed to one |
| JRN-01.2:Narrow | JTBD-01.1 | Filter by status/exception type/priority and sort by priority and age available on the list itself; queue loads in <1s |
| JRN-01.2:Choose | JTBD-01.1 | Next case selected in <15s with no speculative opens |
| JRN-01.2:Re-enter | JTBD-01.1 | Queue reflects state changes made elsewhere in the workflow without a manual refresh cycle |
| JRN-01.1:Step 2 — Open the flagged shipment | JTBD-01.2 | Identity, classification, origin, manufacturer, value and documents-received state all present on one screen; detail loads in <1s |
| JRN-01.1:Step 3 — Show the AI summary | JTBD-01.2 | Plain-language explanation on the same screen, labeled AI-generated with provider/model identifier and generation timestamp; flagging reason understood in <30s |
| JRN-01.1:Step 4 — Display the triggering rule and evidence | JTBD-01.3 | Triggering rule with policy reference and ≥1 concrete field-level evidence value shown for 100% of exceptions, independent of the AI narrative |
| JRN-01.3:Revalidate | JTBD-01.3 | Every firing rule retained and shown with its evidence; none suppressed in favour of a headline exception |
| JRN-01.1:Step 5 — Request the missing document | JTBD-01.4 | Request names a document type, is bound to the exception and rule, moves the case to Awaiting Information, and is recorded with requester and timestamp |
| JRN-01.1:Step 6 — Upload the simulated document | JTBD-01.4 | Document attached with visible provenance against the open request; document type taken from the request, not from client input |
| JRN-01.1:Step 7 — Revalidate | JTBD-01.4 | Missing-document exception resolved-by-revalidation and 100% of still-firing exceptions retained; round-trip <2s |
| JRN-01.3:Accepted but unhelpful upload | JTBD-01.4 | A satisfied document requirement never implies a clean shipment; retained exceptions stay visible with updated evidence |
| JRN-01.1:Step 8 — Specialist recommends clearance | JTBD-01.5 | Mandatory justification captured; case moves to Pending Approval; notification generated; approval action unavailable to her role and stating why |
| JRN-01.3:Weigh and reject the recommendation | JTBD-01.5 | No action pre-selected or auto-submitted; the human may diverge from the AI recommendation as a normal path |
| JRN-01.3:Escalate | JTBD-01.5 | Invalid or unauthorized follow-up actions rejected server-side with a stated reason and recorded as audit entries |
| JRN-01.4:Replay | JTBD-01.6 | Past decision fully reconstructable from the system alone, chronological and human-readable |
| JRN-01.4:Answer | JTBD-01.6 | All 8 required audit fields present; read-only and append-only by construction with no edit or delete affordance |
| JRN-02.1:Check in | JTBD-02.1 | Full-team queue across all statuses, scoped server-side to what his role may act on |
| JRN-02.1:Isolate approvals | JTBD-02.1 | Pending-approval work visually distinct and locatable in a single filtered view in <15s |
| JRN-02.1:Adjudicate #2 — read the record | JTBD-02.2 | Exception, triggering rule, evidence, AI advice with confidence, and the named specialist justification all present at the decision point |
| JRN-02.1:Adjudicate #1 — return it | JTBD-02.2 | Rejection carries a reason code and a fuller justification and returns the case to its author rather than closing it |
| JRN-01.1:Step 9 — Supervisor approves | JTBD-02.2, JTBD-02.4 | Named approving official recorded; eight-field audit gate passes before commit; notification generated |
| JRN-02.2:Separate authorship | JTBD-02.3 | 100% of AI outputs labeled with provider/model identifier, generation timestamp and evidence inputs, visually separated from human decisions |
| JRN-01.4:Verify authorship | JTBD-02.3 | Machine-authored content permanently distinguishable from the human record |
| JRN-02.1:Adjudicate #2 — approve | JTBD-02.4 | Exactly one transition reaches Cleared; SoD-1 and SoD-2 both enforced server-side; evidence-changed warning acknowledged and recorded |
| JRN-02.1:Confirm the structure holds | JTBD-02.4 | Self-approval rejected server-side and the refused attempt written to the audit trail |
| JRN-01.1:Persona Handoff Point | JTBD-02.4 | No path to Cleared without an approving official distinct from the recommender; authority transfers by case state, not by procedure |
| JRN-02.2:Reconstruct | JTBD-02.5 | Complete chronological attributed history with all 8 fields per finalized decision |
| JRN-02.2:Hand it over | JTBD-02.5 | Full case audit record exported or printed in a single action |
| JRN-02.2:Check the notifications | JTBD-02.5 | Generated notifications displayed alongside the decisions that produced them, labeled generated-not-transmitted |
| JRN-03.1:Inspect the rule set | JTBD-03.1 | Rules listed as configuration with type, severity, enabled state, policy reference and editable parameters |
| JRN-03.1:Make the real change | JTBD-03.1 | Rule parameter changed with 0 code changes and 0 redeploys; change written to the audit trail |
| JRN-03.1:Attempt a malformed edit | JTBD-03.2 | Malformed configuration rejected on save with a message naming what was invalid; prior rule set remains in effect |
| JRN-03.1:Preview the impact | JTBD-03.2 | Affected shipments indicated before the change is trusted |
| JRN-03.1:Confirm by revalidation | JTBD-03.2 | Before/after exception sets recorded; deterministic evaluation for identical inputs |
| JRN-03.2:Pre-flight | JTBD-03.3 | Single health check reports database availability, seed data presence and AI-assist status including fallback |
| JRN-03.2:Judge the degradation | JTBD-03.3 | Degradation banner displayed; walkthrough completes with the AI provider disabled and the fallback labeled |
| JRN-03.2:Reset | JTBD-03.4 | One-action reset to pristine seeded state with no manual database intervention |
| JRN-03.2:Verify the canonical case | JTBD-03.4 | Canonical solar-panel shipment present verbatim, flagging all 3 expected exceptions; 3 consecutive post-reset walkthroughs identical |
| JRN-03.2:Hand over | JTBD-03.4 | 0 instances of real or personally identifiable data in seed data, fixtures, logs or prompts; demo-mode indicator visible |
| JRN-03.1:Hit her own boundary | JTBD-03.5 | Administrator adjudication rejected server-side with `FORBIDDEN_ROLE` and logged |
| JRN-03.1:Verify attribution | JTBD-03.5 | 100% of rule changes attributed to the administrator with role and timestamp |
| JRN-04.1:Set the terms | JTBD-04.1 | Environment reset live in front of the evaluator; canonical case present verbatim after reset |
| JRN-04.1:Watch the queue and the open | JTBD-04.1 | Steps 1–2 delivered live against seeded data with zero manual entry and zero developer intervention |
| JRN-04.2:Break the sequence | JTBD-04.1 | The four screens navigable in any order; no step leaves the application in a broken state |
| JRN-04.2:Pick her own cases | JTBD-04.1 | Off-script cases available in the seeded data, including a multi-exception shipment and a pre-cleared shipment with a complete historical record |
| JRN-04.1:Probe for autonomy | JTBD-04.2 | AI recommendation inert until a human selects an action; 0 AI-initiated actions; self-approval blocked and recorded |
| JRN-04.1:Watch the approval | JTBD-04.2 | 0 clearances without a recorded approving official |
| JRN-04.1:Interrogate the AI summary | JTBD-04.3 | Every machine-generated claim traceable to a displayed field value or document, labeled and attributed |
| JRN-04.1:Interrogate the record | JTBD-04.3 | 100% of finalized decisions carry all 8 required audit fields on a stakeholder-selected case |
| JRN-04.1:Watch the document loop | JTBD-04.3 | Exactly one exception resolved and two retained, stated on screen and reflected in the record |
| JRN-04.2:Watch a policy change | JTBD-04.4 | Rule parameter changed live with 0 code changes and 0 redeploys, attributed to a named administrator |
| JRN-04.2:Ask for the proof | JTBD-04.5 | Green test suite covering rule, workflow-transition, RBAC and audit-completeness claims plus an end-to-end run of all ten steps |
| JRN-04.2:Cut the AI off | JTBD-04.5, JTBD-03.3 | Deterministic fallback served and clearly labeled; walkthrough completes with the provider disabled |
| JRN-04.2:Check the boundary | JTBD-04.5 | Simulated login, generated-not-transmitted notifications, demo-mode indicator and document provenance labeled at every point of contact |
| JRN-01.1:Step 10 — Show the complete audit trail | JTBD-01.6, JTBD-02.5, JTBD-04.3 | Chronological attributed replay of all ten steps with AI content separated from human decisions and no edit affordance |
| JRN-01.3:Rejected upload | JTBD-01.4, JTBD-04.5 | Invalid upload rejected before any write; no document row, no revalidation, no partial state |

**Coverage check:** all 21 jobs (JTBD-01.1 … JTBD-04.5) appear at least once. Every journey contributes at least two rows. The canonical walkthrough (JRN-01.1) traces to jobs belonging to three different personas, which is what makes it the acceptance narrative rather than one persona's flow.

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
