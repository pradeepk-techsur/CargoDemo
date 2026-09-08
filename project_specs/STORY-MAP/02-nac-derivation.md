## NaC Derivation Table

Full derivation chain for every NaC on the map: **JTBD outcome → journey stage → testable criterion → story.**
All 21 jobs appear. Where one job is met at several stages, each stage produces its own NaC.

| JTBD ID | Outcome | Journey Stage | NaC | Story |
|---------|---------|---------------|-----|-------|
| JTBD-01.1 | Prioritised work selection | JRN-01.2:Survey | Every flagged shipment shows ID, importer, exception type, priority and status without being opened; the clean seeded shipment is absent | US-9.2 |
| JTBD-01.1 | Prioritised work selection | JRN-01.1:Step 1 | Queue renders in <1s against the seeded set in identical row order to the previous run, with zero manual data entry | US-11.1 |
| JTBD-01.1 | Multi-exception legibility | JRN-01.2:Survey | `SHP-2026-0007` displays three distinct exception-type chips; 0 multi-exception shipments presented as single-exception | US-9.4 |
| JTBD-01.1 | Prioritised work selection | JRN-01.2:Narrow | Filter by status/exception type/priority and sort by priority and age on the list itself; next case chosen in <15s with no speculative opens | US-9.3 |
| JTBD-01.2 | Comprehension without reconstruction | JRN-01.1:Step 2 | Identity, classification, origin, manufacturer, value and documents-received state all render on one screen in <1s with no navigation away | US-11.2, US-9.5 |
| JTBD-01.2 | Comprehension without reconstruction | JRN-01.1:Step 3 | The flagging reason is stated in <30s of opening, from a labelled plain-language summary on the same screen | US-11.3 |
| JTBD-01.2 | Flagging is legible at all | JRN-01.1:Step 1 | All three exception types fire correctly on ingestion; the canonical case flags all 3 on first evaluation | US-1.1, US-1.2, US-1.3 |
| JTBD-01.3 | Verifiable evidence | JRN-01.1:Step 4 | For 100% of exceptions the triggering rule with policy reference plus ≥1 concrete field reference and value are shown, sourced from the exception API and not the AI response | US-11.4, US-1.5 |
| JTBD-01.3 | AI narrative checkable, not authoritative | JRN-01.1:Step 3 | Every claim in the summary maps to a field or document visible elsewhere on the screen | US-2.1 |
| JTBD-01.3 | Advisory confidence with a basis | JRN-01.1:Step 4 | The recommendation displays confidence level, stated basis and a rationale traceable to displayed evidence, and is never pre-selected | US-2.4 |
| JTBD-01.3 | Nothing suppressed | JRN-01.3:Revalidate | Same entry + same rule set always yields the same exception set; every firing rule is retained and shown | US-1.4 |
| JTBD-01.4 | Request bound to the case | JRN-01.1:Step 5 | One `OUTSTANDING` request created with requester, timestamp, linked exception and linked rule; case → `AWAITING_INFORMATION`; audit entry and notification written | US-11.5, US-3.2, US-4.1 |
| JTBD-01.4 | Evidence cannot be faked in | JRN-01.1:Step 6 | Document type is taken from the request, not from client input; provenance is displayed as `SIMULATED_UPLOAD` | US-4.2, US-4.5, US-11.6 |
| JTBD-01.4 | No partial state on refusal | JRN-01.3:Rejected upload | A renamed archive is refused with `422 FILE_CONTENT_MISMATCH`; no document row, no revalidation, request stays outstanding | US-4.3 |
| JTBD-01.4 | Correct revalidation | JRN-01.1:Step 7 | Missing-document → `RESOLVED_BY_REVALIDATION`; origin and HTS retained; open count 3 → 2; round-trip <2s; case never becomes `CLEARED` by revalidation | US-11.7, US-1.6, US-4.4 |
| JTBD-01.4 | "One fixed" never reads as "clean" | JRN-01.1:Step 7 | The inline change indication reads "1 resolved, 2 retained" with the retained evidence still displayed | US-9.6 |
| JTBD-01.5 | Justified action | JRN-01.1:Step 4 | All five actions presented together; nothing pre-selected or auto-submitted; submission without a justification is rejected | US-3.1, US-12.5 |
| JTBD-01.5 | Disabled means explained | JRN-01.1:Step 8 | 100% of unavailable actions state why — including Approve being unavailable to her role | US-3.7, US-9.7 |
| JTBD-01.5 | Clean hand-off | JRN-01.1:Step 8 | `PENDING` recommendation bound to the evaluation version; case → `PENDING_APPROVAL` not `CLEARED`; Supervisor-addressed notification generated; case appears under his filter | US-11.8, US-5.1 |
| JTBD-01.5 | Refusals are information | JRN-01.3:Escalate | Invalid or unauthorised follow-ups are rejected server-side with a stated reason and written to the audit trail | US-3.6, US-3.5, US-3.4, US-3.3 |
| JTBD-01.6 | Reconstructable reasoning | JRN-01.4:Replay | Every entry shows exceptions, evidence reviewed, AI recommendation and confidence, decision, justification, timestamp, acting user and role | US-6.4, US-6.1 |
| JTBD-01.6 | Nothing tidied afterwards | JRN-01.4:Answer | Entries are append-only; no edit or delete affordance exists anywhere on the screen or path through the application | US-6.3, US-12.4 |
| JTBD-02.1 | Visible approval backlog | JRN-02.1:Isolate approvals | Pending-approval items are visually distinct and reachable in one filtered step in <15s | US-5.2 |
| JTBD-02.1 | Whole-team visibility, role-scoped | JRN-02.1:Check in | The queue spans every specialist and every status, scoped server-side to what his role may act on | US-8.3 |
| JTBD-02.2 | Decision on the record | JRN-02.1:Adjudicate #2 — read the record | Exception, triggering rule, evidence, AI advice with confidence, and the named specialist justification all visible at the decision point with no navigation away | US-9.8 |
| JTBD-02.2 | What he was advised is recorded | JRN-01.1:Step 8 | The AI recommendation and the human's concurrence or divergence are snapshotted on the recommendation | US-2.5 |
| JTBD-02.2 | Before/after inspectable | JRN-01.1:Step 7 | The revalidation audit entry carries the complete before and after exception sets and refreshed AI outputs | US-1.7 |
| JTBD-02.2 | Return, don't close | JRN-02.1:Adjudicate #1 — return it | Rejection requires a reason code plus a ≥40-character justification, returns the case to its author, and leaves exceptions `OPEN` | US-5.4 |
| JTBD-02.2 | Evidence drift surfaced | JRN-02.1:Adjudicate #2 — approve | Approval refused with `EVIDENCE_CHANGED_UNACKNOWLEDGED` until the diff is acknowledged; the acknowledgement is recorded | US-5.5 |
| JTBD-02.3 | Authorship distinguishable | JRN-02.2:Separate authorship | 100% of AI outputs are visually labelled and display provider/model identifier, generation timestamp and evidence inputs | US-2.2 |
| JTBD-02.3 | Separation inside the record | JRN-01.4:Verify authorship | The timeline visually and textually separates machine-authored entries from human decisions; justifications render verbatim | US-6.4 |
| JTBD-02.4 | Structural separation of duties | JRN-01.1:Step 9 | SoD-1 and SoD-2 both pass server-side; the eight-field gate passes with a non-null approving official; case → `CLEARED`, then terminal | US-11.9, US-5.3 |
| JTBD-02.4 | Self-approval impossible, and recorded | JRN-02.1:Confirm the structure holds | The attempt returns `403 SELF_APPROVAL_BLOCKED`, the case never leaves `PENDING_APPROVAL`, and the refusal appears as an `ACCESS_DENIED` audit entry | US-12.2 |
| JTBD-02.4 | No path to Cleared without an official | JRN-01.1:Persona Handoff Point | 0 clearances without a recorded approving official distinct from the recommender; revalidation and ingestion can never produce `CLEARED` | US-12.3 |
| JTBD-02.4 | Enforcement, not interface hiding | JRN-02.1:Check in | 100% of protected operations reject unauthorised roles server-side; unauthorised attempts are logged | US-8.4 |
| JTBD-02.5 | One-action defensible export | JRN-02.2:Hand it over | One action produces the whole chronological attributed history as JSON and as a printable view | US-6.5 |
| JTBD-02.5 | Complete on every finalised decision | JRN-02.2:Reconstruct | 100% of finalised decisions carry all 8 required fields; non-applicable fields are shown explicitly | US-6.1, US-11.10 |
| JTBD-02.5 | Incompleteness impossible | JRN-02.2:Reconstruct | 0 decisions finalisable with a required field missing | US-6.2 |
| JTBD-02.5 | Notifications beside their decisions | JRN-02.2:Check the notifications | Exactly one notification per action, written in the same transaction, displayed inline and labelled "Generated, not transmitted" | US-7.1, US-7.2 |
| JTBD-03.1 | Configuration-owned rules | JRN-03.1:Make the real change | A rule parameter is changed and validation results reflect it with 0 code changes and 0 redeploys | US-8.5 |
| JTBD-03.2 | Safe rule change | JRN-03.1:Attempt a malformed edit | Malformed configuration is rejected on save with a message naming what was invalid; the prior rule set remains in effect | US-8.5 |
| JTBD-03.2 | Impact known before it is trusted | JRN-03.1:Preview the impact | Affected shipments are indicated before the change lands, and before/after exception sets are recorded on revalidation | US-8.6 |
| JTBD-03.3 | Pre-flight readiness | JRN-03.2:Pre-flight | One health check reports database availability, seed presence and AI-assist status including fallback mode | US-10.5 |
| JTBD-03.3 | Degradation is a labelled mode | JRN-03.2:Judge the degradation | Fallback summary and recommendation are served and clearly labelled, with a degradation banner; the full walkthrough completes with the provider disabled | US-2.3 |
| JTBD-03.4 | Deterministic reset | JRN-03.2:Reset | One-action reset to pristine seeded state with no manual database intervention; 3 consecutive post-reset walkthroughs produce identical results | US-10.4 |
| JTBD-03.4 | Canonical case verbatim, no real data | JRN-03.2:Verify the canonical case | The canonical shipment appears identically with all 3 expected exceptions; 0 instances of real or PII data in seed, fixtures, logs or prompts | US-0.4, US-0.1 |
| JTBD-03.4 | Idempotent ingestion | JRN-03.2:Reset | Re-ingesting a shipment ID updates rather than duplicates, from the JSON file and from the local endpoint | US-0.2, US-0.3 |
| JTBD-03.5 | Administrator boundary enforced | JRN-03.1:Hit her own boundary | Adjudication by the administrator role returns `403 FORBIDDEN_ROLE` and is written to the audit trail | US-12.6 |
| JTBD-03.5 | Every change attributed | JRN-03.1:Verify attribution | 100% of rule changes appear in the audit trail with her identity, role and timestamp | US-8.6 |
| JTBD-03.5 | Named acting identity everywhere | JRN-01.2:Arrive | The acting user's name and role are stamped on every audit entry across all three roles | US-8.1, US-8.2, US-0.5 |
| JTBD-04.1 | Live end-to-end capability | JRN-04.1:Watch the queue and the open | Steps 1–10 run live in the preview environment with zero manual data entry and zero developer intervention | US-11.1 … US-11.10, US-10.3 |
| JTBD-04.1 | Working system, not a click-path | JRN-04.2:Break the sequence | Any of the four screens opens directly and renders correctly; no step leaves the application broken; mid-session reset restarts from step 1 with identical data | US-11.11, US-9.1, US-9.9 |
| JTBD-04.1 | Off-script cases exist | JRN-04.2:Pick her own cases | A multi-exception shipment and a pre-cleared shipment with a complete historical record are both openable on request | US-0.4 |
| JTBD-04.2 | No autonomous action | JRN-04.1:Probe for autonomy | 0 AI-initiated actions; the recommendation is inert until a human selects; no scheduler, queue or webhook acts on cases | US-12.1 |
| JTBD-04.2 | The machine says so on screen | JRN-04.1:Probe for autonomy | The governance notice "The AI recommends. A named official decides. No action has been taken." is visible at the decision point | US-9.7 |
| JTBD-04.3 | Immediate defensibility | JRN-04.1:Interrogate the record | On a stakeholder-selected case, all 8 required fields are present and chain verification reports every entry intact | US-11.10, US-6.1 |
| JTBD-04.3 | Claims trace to evidence as it was | JRN-04.1:Interrogate the AI summary | Every machine-generated claim traces to the field value or document displayed at decision time | US-6.6, US-2.2 |
| JTBD-04.3 | Resolve one, retain two — on the record | JRN-04.1:Watch the document loop | The record shows the revalidation with before/after exception sets matching what was stated on screen | US-1.7, US-9.6 |
| JTBD-04.4 | Customer-owned policy | JRN-04.2:Watch a policy change | A parameter is changed live by the administrator, the effect on validation is visible, and the change is attributed to a named administrator with a timestamp | US-8.5, US-8.6 |
| JTBD-04.5 | Claims held by tests | JRN-04.2:Ask for the proof | The suite runs green across the three exception types, all valid and invalid transitions, each role against each protected operation, audit completeness and append-only, and all ten steps | US-10.1, US-10.2, US-10.3 |
| JTBD-04.5 | Simulation boundary stated | JRN-04.2:Check the boundary | Simulated login labelled, "Generated, not transmitted" on every notification, demo-mode indicator visible, document provenance shown on every document | US-7.2, US-4.5, US-8.1 |
| JTBD-04.5 | Exclusions are decisions | JRN-04.2:Check the boundary | Every PRD §5.8 exclusion is asserted absent by test — no ACE client, no fourth exception type, no outbound transport, no real data | US-12.7 |

**Derivation coverage:** 21 of 21 jobs derived. Every NaC on the map above cites the job it came from;
no criterion appears that is not traceable to a JTBD outcome and a journey stage.

---
