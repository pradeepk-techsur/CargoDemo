## NaC-to-Acceptance Criteria Mapping

Each NaC on the map is checked against the acceptance criteria already written in
`UserStories-CargoDemo.md`. The sample below covers **all ten backbone steps** (via Epic 11, the
step-by-step integration stories) plus the two epics that carry the product's central claims — Epic 5
(approval chain) and Epic 6 (audit record) — and Epic 7 (notifications, required by steps 5, 9 and 10).
AC text is quoted from the story chunks, abbreviated where long.

| NaC | Story | AC from UserStories | Aligned? |
|-----|-------|---------------------|----------|
| JTBD-01.1: queue renders in <1s in identical row order, zero manual data entry | US-11.1 | "The queue renders in under 1 second with no manual data entry"; "Row order is identical to the previous walkthrough run" | Yes |
| JTBD-01.1: multi-exception shipments never collapsed | US-11.1 | "The canonical solar-panel shipment is present and shows three distinct exception-type chips"; "All three exception types are visible across the listed rows" | Yes |
| JTBD-01.2: whole case on one screen, <1s, no navigation away | US-11.2 | "All eight required attributes render…"; "The documents panel shows the required certificate explicitly as Missing"; "Detail renders in under 1 second on the non-AI calls" | Yes |
| JTBD-01.2: flagging reason stated in <30s from a labelled summary | US-11.3 | "The AI summary panel renders on the Shipment Review screen without a separate navigation step"; "The panel is inside the AI-content label with provider, model, generation mode and generation timestamp" | Yes |
| JTBD-01.3: every AI claim maps to a visible field or document | US-11.3 | "Every claim in the summary maps to a field or document visible elsewhere on the screen" | Yes |
| JTBD-01.3: rule + concrete field values, sourced independently of the AI | US-11.4 | "The origin exception shows `country_of_origin = \"Malaysia\"` against `manufacturer.address.country = \"China\"`…"; "Evidence and missing information are sourced from the exception API, not from the AI response" | Yes |
| JTBD-01.3: confidence level with a stated basis and traceable rationale | US-11.4 | "The AI recommended action, confidence level, confidence basis and rationale render alongside, inside the AI-content label" | Yes |
| JTBD-04.2: the screen states the AI recommends and a named official decides | US-11.4 | "The governance notice 'The AI recommends. A named official decides. No action has been taken.' is visible" | Yes |
| JTBD-01.4: request bound to exception and rule, with requester and timestamp | US-11.5 | "Submitting creates one `OUTSTANDING` document request with the requester's name, the timestamp, the linked exception and the linked rule"; "The case transitions… to `AWAITING_INFORMATION`" | Yes |
| JTBD-01.5: justification mandatory before submit | US-11.5 | "A justification of at least 10 characters is required before submit is enabled" | Yes |
| JTBD-01.4: document type taken from the request, not client input; provenance shown | US-11.6 | "The uploaded document's type is taken from the request, not from client input"; "attaches with `provenance = SIMULATED_UPLOAD` and is visually marked as uploaded this session" | Yes |
| JTBD-01.4: 1 resolved / 2 retained, resolved-not-deleted, round-trip <2s | US-11.7 | "The missing-document exception is marked `RESOLVED_BY_REVALIDATION`… and is retained rather than deleted"; "The change indication reads '1 resolved, 2 retained' (0 new)"; "The round trip completes in under 2 seconds" | Yes |
| JTBD-04.2: revalidation can never produce a clearance | US-11.7 | "The case does not become `CLEARED` or `PENDING_APPROVAL` as a result of revalidation" | Yes |
| JTBD-01.5: recommendation, not clearance; nothing pre-selected; 40-char floor on MIXED | US-11.8 | "with nothing pre-selected beforehand"; "with `MIXED` or `EXCEPTIONS_ACCEPTED` the justification minimum is 40 characters"; "The case moves to `PENDING_APPROVAL` — visibly not to `CLEARED`" | Yes |
| JTBD-01.5: hand-off happens through the queue, with a generated notification | US-5.1 | "A notification addressed to the Supervisor role names the recommender, the shipment, the exceptions and the justification"; US-5.2 "`PENDING_APPROVAL` rows carry a persistent 'Awaiting your approval' marker for Supervisors" | Yes |
| JTBD-02.2: recommendation bound to the evaluation version it was made against | US-5.1 | "The recommendation is bound to the evaluation version it was made against" | Yes |
| JTBD-02.4: self-approval structurally impossible at the recommender's end | US-11.8 | "The specialist's own approve/reject controls are absent or disabled with the self-approval reason"; US-5.1 "A second recommendation while one is pending is rejected with `RECOMMENDATION_ALREADY_PENDING`" | Yes |
| JTBD-02.2: exception, evidence, AI advice with confidence, and named justification at the decision point | US-5.3 | "The pending recommendation panel shows the recommender's name and role, submission timestamp, resolution basis, the enumerated exceptions with their evidence, the specialist's justification verbatim, and the AI recommendation with its concurrence" | Yes |
| JTBD-02.4: SoD-1 and SoD-2 both pass; case → CLEARED with a named official | US-11.9 | "The separation-of-duties checks pass because the approver is a Supervisor and is a different user from the recommender"; "The case records `cleared_at` and the approving official's user ID, name and role" | Yes |
| JTBD-02.4: the eight-field gate is a precondition of clearance, not a report | US-11.9 / US-6.2 | US-11.9 "The audit completeness gate passes with a non-null approving official"; US-6.2 "When an approval is blocked by the completeness gate, the case does **not** move to `CLEARED`" | Yes |
| JTBD-02.5: 100% of finalised decisions carry all 8 fields, non-applicable shown explicitly | US-6.1 / US-11.10 | US-6.1 enumerates fields 1–8 with "never null" conditions; US-11.10 "Every decision entry displays all eight required fields, with non-applicable fields shown explicitly as 'Not applicable'" | Yes |
| JTBD-04.3: 0 decisions finalisable with a missing field | US-6.2 | "A missing required field aborts the enclosing transaction with `AUDIT_INCOMPLETE`, naming the field"; "There is no path that writes an audit entry in a separate transaction from the state change it records" | Yes |
| JTBD-01.6: append-only, no edit or delete affordance anywhere | US-6.3 / US-11.10 | US-6.3 "No `PATCH`, `PUT` or `DELETE` route exists… the routes are not defined at all"; "Database triggers on update and delete raise `AUDIT_IMMUTABLE`"; US-11.10 "The screen offers no edit or delete affordance anywhere" | Yes |
| JTBD-02.3: AI content visually separated from human decisions; justifications verbatim | US-6.4 | "Authorship drives visual separation: AI content is never rendered inside a human-decision container"; "Justifications are returned and rendered verbatim and in full" | Yes |
| JTBD-01.5: refusals are recorded, not silent | US-6.4 | "Access denials and rejected transitions appear in the timeline as their own entry class" | Yes |
| JTBD-04.3: claims trace to the evidence as it stood at decision time | US-6.6 | "Evidence and AI recommendation are stored as JSON copies on the audit entry, not as foreign keys"; "Revalidating a case after a decision leaves the earlier entry's evidence snapshot byte-identical" | Yes |
| JTBD-02.5: complete attributed history exported in one action | US-6.5 / US-11.10 | US-6.5 "A JSON export returns every field of every entry plus the hash chain and a verification block"; "A printable export returns server-rendered HTML…"; US-11.10 "The record exports as JSON and as a printable view" | Yes — and note "No PDF toolchain is required or used", consistent with this environment |
| JTBD-02.5: exactly one notification per action, same transaction | US-7.1 | "Exactly one notification is produced per case action — never zero, never two"; "A state change without its notification is structurally impossible because both are written in one transaction" | Yes |
| JTBD-04.5: notifications labelled generated-not-transmitted, beside their decisions | US-7.2 / US-11.10 | US-7.2 "Every notification displays the fixed label 'Generated, not transmitted'"; "Every notification record carries `transmitted: false`"; US-11.10 "Each notification appears alongside the decision that produced it" | Yes |
| JTBD-04.1: four screens navigable in any order; nothing depends on arrival path | US-11.11 | "Any of the four screens can be opened directly by URL and renders correctly with the case context resolved"; "Opening the audit screen before any decision has been taken shows the ingestion and flagging entries rather than an empty state" | Yes |
| JTBD-03.3: walkthrough completes with the AI provider disabled, fallback labelled | US-11.11 / US-11.3 | US-11.11 "Disabling the AI provider mid-session moves both AI outputs to the labelled fallback path without breaking any screen"; US-11.3 "the labelled deterministic fallback summary renders instead and the shell banner is active" | Yes |
| JTBD-03.4: mid-session reset restarts the walkthrough with identical data | US-11.11 | "A reset can be performed mid-session and the walkthrough restarted from step 1 with identical data"; "No step requires a developer to run a command or edit data" | Yes |
| JTBD-02.2 (R2): rejection returns the case with a reason and leaves exceptions open | US-5.4 | "On rejection the recommendation becomes `REJECTED` with the reason, exceptions remain `OPEN`, the case returns to `IN_REVIEW`, and assignment returns to the recommender" | Yes |
| JTBD-02.2 (R2): approval refused until evidence drift is acknowledged | US-5.5 | "Submitting without acknowledgement is rejected server-side with `EVIDENCE_CHANGED_UNACKNOWLEDGED`"; "The warning and the acknowledgement are recorded on the approval row and on the audit entry" | Yes |
| JTBD-04.3: a stakeholder-selected case demonstrates completeness even if the live case is not cleared | US-11.10 | "If the live case has not been cleared, the pre-cleared seeded shipment provides the same demonstration with at least 8 entries and a named approving official" | Yes |

**Alignment result:** 35 of 35 sampled NaC align with existing acceptance criteria; **0 conflicts and 0 NaC
requiring a new story.** Two observations worth carrying forward:

1. The user stories are in several places *stricter* than the NaC derived from the JTBD success measures —
   e.g. US-6.3's hash chain and verification endpoint go beyond "append-only, no edit affordance", and
   US-5.1's `EXCEPTION_SET_STALE` check goes beyond "enumerate the exception set". The map does not weaken
   those criteria; the NaC is the floor, the AC is the contract.
2. US-6.5 explicitly states "No PDF toolchain is required or used", which is consistent with this
   environment. Audit export is JSON plus a server-rendered printable view; no PDF dependency is introduced
   anywhere in the map.

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
