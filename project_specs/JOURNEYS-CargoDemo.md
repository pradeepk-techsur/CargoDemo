# User Journeys
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related Personas** | PERSONAS-CargoDemo.md (PER-01 … PER-04) |
| **Related JTBD** | JTBD-CargoDemo.md (JTBD-01.1 … JTBD-04.5) |
| **Related PRD** | PRD-CargoDemo.md (§3.2 Walkthrough, §5 Features, §6 NFRs, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | STORY-MAP-CargoDemo, UserStories-CargoDemo, UX design |

**Reading notes:**

- **The four screens are the only touchpoints that matter.** Every touchpoint below names one of them — **Cargo Exception Queue (F17)**, **Shipment Review (F18)**, **Recommended Resolution (F19)**, **Decision & Audit Record (F20)** — plus the shell (F16) and the two supporting administrative surfaces (F15 Rule Administration, F22 Demo Environment & Reset). Nothing is resolved in email, a spreadsheet, or a side channel; that is the point of the product.
- **Stage tables carry an eighth column, `System Response`,** so each step records what the application did in reply, not only what the human did. The seven standard columns are unchanged and in their standard order.
- **Persona naming.** The seeded demo users `usr-cs-001`, `usr-sup-001` and `usr-adm-001` **are** PER-01, PER-02 and PER-03: FRD F2 §Seeded users seeds them as Marisol Reyes, Dwayne Okafor and Priya Raghavan, so the names narrated in the walkthrough are the names the queue and the audit record display. Two further seeded users exist for paths the personas cannot cover alone — `usr-cs-002` Marcus Hale (hand-off) and `usr-sup-002` Ronald Pike (a distinct approver for a supervisor-authored recommendation, F11 SoD-2). This document uses the persona names throughout, and the seeded user IDs where identity enforcement is the point.
- **PER-04 has no account.** Angela's journey has touchpoints in the sense of *what she watches on someone else's screen and what she asks them to prove*. Her "Action" column is observation and interrogation, never operation.
- **Canonical scenario used in JRN-01.1, JRN-02.1 and JRN-04.1:** shipment `SHP-2026-0007`, importer Helios Grid Supply, solar panels, derived priority **Critical**, declared `country_of_origin = "Malaysia"`, `manufacturer.address.country = "China"`, `hts_code = "8541.40"` (incomplete against a 10-digit expectation), `shipment_value = 85,000 USD`, required `CERTIFICATE_OF_ORIGIN` missing. Three exceptions fire at evaluation v1: **origin conflict**, **incomplete HTS**, **missing document**. After the certificate upload and revalidation at v2, **exactly one exception resolves (missing document) and two are retained (origin conflict, incomplete HTS)**.

---

## Journey Index

| ID | Persona | Scenario | Key JTBD | Stages |
|----|---------|----------|----------|--------|
| JRN-01.1 | PER-01 → PER-02 | **The canonical 10-step walkthrough** on `SHP-2026-0007`, from queue to cleared, with the specialist → supervisor handoff at step 8→9 | JTBD-01.2, JTBD-01.3, JTBD-01.4, JTBD-01.5, JTBD-02.2 | 10 |
| JRN-01.2 | PER-01 | Shift start — ordering 20–40 flagged entries and choosing what to work first | JTBD-01.1 | 5 |
| JRN-01.3 | PER-01 | **Unhappy path** — the uploaded document is rejected, the second upload does not resolve the exception, and Marisol escalates instead of recommending clearance | JTBD-01.4, JTBD-01.5 | 7 |
| JRN-01.4 | PER-01 | Defending a decision she made months ago against a challenge she cannot remember the case for | JTBD-01.6 | 4 |
| JRN-02.1 | PER-02 | Working the pending-approval list — one rejection, one approval, one blocked self-approval attempt observed | JTBD-02.1, JTBD-02.2, JTBD-02.3, JTBD-02.4 | 6 |
| JRN-02.2 | PER-02 | A cleared shipment is challenged weeks later and the record has to be produced in one action | JTBD-02.5, JTBD-02.3 | 5 |
| JRN-03.1 | PER-03 | Changing the HTS digit-count rule parameter as configuration, previewing the impact, and hitting her own role boundary | JTBD-03.1, JTBD-03.2, JTBD-03.5 | 7 |
| JRN-03.2 | PER-03 | Pre-demo reset and health check twenty minutes before stakeholders arrive, with AI assistance degraded | JTBD-03.3, JTBD-03.4 | 6 |
| JRN-04.1 | PER-04 *(observer)* | Watching all 10 walkthrough steps over Marisol's and Dwayne's shoulders and judging governance from outside | JTBD-04.1, JTBD-04.2, JTBD-04.3 | 8 |
| JRN-04.2 | PER-04 *(observer)* | Going off script — out-of-sequence navigation, self-approval probe, AI switched off, live rule change, test suite | JTBD-04.1, JTBD-04.2, JTBD-04.4, JTBD-04.5 | 6 |

**Coverage check:** every persona has at least one journey (PER-01 has 4, PER-02 has 2, PER-03 has 2, PER-04 has 2). Every journey maps to at least one JTBD, and all 21 jobs appear in the traceability table at the end of this document.

---

## PER-01: Marisol Reyes

### JRN-01.1: The Canonical 10-Step Walkthrough — Solar Panels, Three Exceptions, One Cleared Shipment

**Persona:** PER-01 (Marisol Reyes)
**Handoff Persona:** PER-02 (Dwayne Okafor) — takes the case from Stage 9 onward
**Scenario:** Shipment `SHP-2026-0007` — a consignment of solar panels valued at $85,000 — arrives in the exception queue flagged with three simultaneous exceptions: the declared country of origin is Malaysia while the manufacturer's address is in China, the HTS code `8541.40` is incomplete against the configured 10-digit expectation, and the required certificate of origin was never received. Marisol picks it up cold, with no prior knowledge of the case. She reads the AI summary, checks it against the field-level evidence, requests the missing certificate, accepts the simulated upload, revalidates — which resolves exactly one of the three exceptions and retains the other two — and then recommends clearance on the strength of a justification that addresses the two exceptions she is *not* resolving. She cannot clear it herself. The case leaves her hands and enters Dwayne's approval list, where he adjudicates it on the record and becomes the named approving official. The tenth step belongs to neither of them: the Decision & Audit Record screen replays everything that just happened, attributed and timestamped, for anyone who asks.
**Related Jobs:** JTBD-01.2, JTBD-01.3, JTBD-01.4, JTBD-01.5, JTBD-02.2, JTBD-02.4, JTBD-04.1

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Step 1 — Show the queue | Marisol opens the application, confirms she is acting as Cargo Specialist in the role indicator, and scans the flagged shipments list | Cargo Exception Queue (F17), shell (F16) | "What's flagged, and which of these is going to be the ugly one?" | Alert, businesslike | 45 rows compete for attention; a $85,000 shipment with three problems looks the same as a single-issue one unless the list says so | Multi-exception rows carry a "3 exceptions" chip and a Critical priority badge, so the ugly one announces itself before she opens anything | Queue renders in <1s against seeded data with shipment ID, importer, exception type(s), priority and status per row; `SHP-2026-0007` shows three exception chips and priority Critical (derived: base CRITICAL from the origin rule, with value and multiplicity escalations clamped — FRD F5 §Process step 6) |
| Step 2 — Open the flagged shipment | She selects the `SHP-2026-0007` row | Shipment Review (F18) | "Solar panels, $85,000. Show me the whole entry before you tell me what's wrong with it." | Focused | Historically this is where reconstruction starts — six fields on four systems | Everything she needs to establish identity is on one screen: importer, carrier, product description, HTS, origin, manufacturer name and address, value, and the documents-received panel | Detail loads in <1s: entry fields, documents panel (certificate of origin shown as **Missing**, commercial invoice and packing list shown as **Received / SEEDED**), and a validation-results panel listing three open exceptions |
| Step 3 — Show the AI summary | She reads the plain-language summary at the top of the review screen | Shipment Review (F18) → AI summary panel (F7) | "Fine — but who wrote this, and when?" | Curious, guarded | Machine prose is worthless to her if she cannot tell it apart from the record | The panel is visibly labeled AI-generated and carries provider/model identifier, generation timestamp, and the evidence inputs used, so she knows exactly what she is reading | Summary returns within the 5s p95 budget, naming the commodity, importer, value, and each of the three exceptions in non-technical language, each claim naming the field or document it rests on |
| Step 4 — Display the triggering rule and evidence | She opens Recommended Resolution and reads each exception's rule, policy reference, and captured evidence, checking the summary's claims against the raw field values | Recommended Resolution (F19) | "`country_of_origin = Malaysia` against `manufacturer.address.country = China` — yes, that's a real conflict, and I can see it myself." | Confident, verifying | Prose evidence would force her back to the policy manual in another tab | Evidence is shown as concrete field references and values, rendered independently of the AI narrative, so the narrative is checkable rather than authoritative | Three exceptions displayed, each with triggering rule, policy reference, severity, and field-level evidence; the missing-document exception states its missing information as `CERTIFICATE_OF_ORIGIN`; the AI recommendation appears with an explicit confidence level and rationale, advisory and not pre-selected |
| Step 5 — Request the missing document | She selects **Request additional information**, names `CERTIFICATE_OF_ORIGIN`, types a justification, and submits | Recommended Resolution (F19) → action panel (F9, F10) | "I'm not deciding anything until the certificate is in the record. Log the request against the case, not in my inbox." | Purposeful | Historically the request lives in email and the shipment sits in an unclear state nobody can read | The request is bound to the missing-document exception and the rule that requires it, so anyone opening the case later can see what was asked and why | Submission is blocked until a justification is present; on submit, request `dr-0007-coo` is created as `OUTSTANDING` with requester and timestamp, case moves `NEW → AWAITING_INFORMATION`, an audit entry and a notification are written **(walkthrough step 5 complete)** |
| Step 6 — Upload the simulated document | She returns to Shipment Review, opens the outstanding request, selects the seeded certificate fixture, and uploads it | Shipment Review (F18) → documents panel (F10) | "Simulated, obviously. But it has to behave like the real thing or it proves nothing." | Slightly wary, then satisfied | An upload flow that let any file satisfy any requirement would make the whole exercise theatre | Document type is taken from the request, never from the upload, so a certificate requirement cannot be closed by a file labeled as something else | File passes size, MIME, extension, magic-byte and PII checks; document attached with `provenance = SIMULATED_UPLOAD` and named uploader; request marked `FULFILLED`; a `DOCUMENT_UPLOADED` audit entry and notification written |
| Step 7 — Revalidate | She watches the revalidation result render — she does not have to trigger it, though the manual control is there | Shipment Review (F18) → validation results (F6) | "One down. Two to go — and I want to see the two, not a green tick." | Guarded relief | The old failure mode: fix one thing, get told the shipment is clear, discover later it was still held | Resolved exceptions are marked resolved-by-revalidation rather than deleted, and the still-firing ones stay visible with their evidence intact | Revalidation runs automatically inside the upload transaction at evaluation v2, completing in <2s: **missing-document exception → RESOLVED_BY_REVALIDATION; origin-conflict and incomplete-HTS exceptions retained**; case moves `AWAITING_INFORMATION → IN_REVIEW`; panel states "1 resolved, 2 retained"; AI summary and recommendation regenerate against v2 |
| Step 8 — Specialist recommends clearance | She selects **Clear exception**, confirms the enumerated exception set, and writes a justification addressing the two exceptions she is not resolving as well as the one she is | Recommended Resolution (F19) → action panel (F9, F11) | "I'm recommending, not clearing. My reasoning has to hold up on its own, because the next person reading it won't have me sitting next to them." | Committed, faintly exposed | Writing a recommendation into an email and hoping it is read before the shipment ages | The action is mandatory-justification and role-aware: **Approve is not offered to her at all, and states why** — her role cannot take it | `CLEAR_EXCEPTION` executes with `resolution_basis = MIXED`; a `PENDING` recommendation is created bound to evaluation v2; the AI recommendation is snapshotted with its concurrence; case moves `IN_REVIEW → PENDING_APPROVAL`; a notification addressed to the Supervisor role is generated naming her, the shipment, the exceptions and her justification |
| **Step 9 — Supervisor approves** *(PER-02 Dwayne Okafor)* | Dwayne filters the queue to pending approvals, opens `SHP-2026-0007`, reads the exception set, the evidence, the AI recommendation with its confidence, and Marisol's justification, then approves with his own justification | Cargo Exception Queue (F17) → Recommended Resolution (F19) → approval panel (F11) | "Two exceptions are still open and she's recommending clearance anyway. Her reasoning had better say why — my name is the one going on this." | Deliberate, accountable | Approving on the strength of a colleague's summary because the backing evidence was never assembled at the point of decision | Everything he needs is on the decision screen: exception, rule, evidence, AI advice with confidence, and the named specialist justification — no navigation away | SoD-1 passes (he is a Supervisor); SoD-2 passes (`usr-sup-001 ≠ usr-cs-001`); the eight-field audit completeness gate passes with a non-null approving official; the two retained exceptions close as `CLEARED_BY_DECISION`; case moves `PENDING_APPROVAL → CLEARED` with `approving_official = Dwayne Okafor` and `cleared_at` set; approval notification generated |
| Step 10 — Show the complete audit trail | Either of them opens the Decision & Audit Record for the case and scrolls the timeline from ingestion to clearance | Decision & Audit Record (F20) | "Everything I did is there, in order, with my name on the parts that were mine and the model's name on the parts that weren't." | Vindicated, calm | A record that captured only the outcome, leaving the reasoning unrecoverable | The timeline visually separates AI-authored content from human decisions, and shows each generated notification beside the decision that produced it | Chronological, read-only, append-only timeline: ingestion → flagging (3 exceptions with evidence) → AI summary v1 → document request → upload → revalidation v2 (1 resolved / 2 retained) → AI summary v2 → recommendation → approval → notifications. Every finalized decision carries all 8 required fields. No edit or delete affordance exists anywhere on the screen |

#### Persona Handoff Point

**The handoff occurs between Stage 8 and Stage 9, and it is structural rather than procedural.** At the end of Stage 8 the case is in `PENDING_APPROVAL` and Marisol has no remaining action on it: `APPROVE_CLEARANCE` is not one of her five actions, `CLEAR_EXCEPTION` is refused with `RECOMMENDATION_ALREADY_PENDING`, and if she called the approval endpoint directly she would receive `403 SELF_APPROVAL_BLOCKED` and the attempt itself would be written to the audit trail. Authority passes to PER-02 by the state of the case, not by anyone remembering to pass it. Dwayne acquires the case through the queue's pending-approval filter, not through a message from Marisol — the hand-off has no informal channel to get lost in. From Stage 9 the acting persona is PER-02 for the remainder of the journey; Stage 10 is readable by both.

#### Key Moments

- **Decision Point — Stage 4 (rule and evidence):** this is where Marisol either accepts the AI account or rejects it. If the evidence were prose rather than field values, she would leave the screen for the policy manual and the 30-second comprehension target would be lost along with her trust in the summary.
- **Decision Point — Stage 8 (recommend vs. escalate):** with two exceptions still firing, recommending clearance is a judgment call, not a formality. The alternative path is JRN-01.3.
- **Critical Governance Moment — Stage 9 (approval):** the single transition in the whole system that reaches `CLEARED`. Every governance claim in the demo is either true here or nowhere.
- **Delight Opportunity — Stage 7 (revalidation):** the "1 resolved, 2 retained" statement is the moment the product distinguishes itself from every tool that told her a shipment was clean when it was not.
- **Risk of Abandonment — Stage 3 (AI summary):** if the summary is unlabeled, unattributed, or ungrounded, Marisol stops reading it permanently and works from raw fields for the rest of her career with the tool. Recovery is unlikely; first impressions of machine text are durable.
- **Risk of Abandonment — Stage 5 (document request):** if the request does not visibly attach to the case, she reverts to email within a week and the workflow hollows out.

#### Success Outcome

Marisol states why `SHP-2026-0007` was flagged in **under 30 seconds** without leaving the Shipment Review screen (JTBD-01.2). After the upload, the missing-document exception resolves and **100% of still-firing exceptions are retained** (JTBD-01.4, PRD §7 Revalidation correctness). The shipment reaches `CLEARED` **only** through a recorded approving official distinct from the recommender (JTBD-02.4, PRD §7 Human authority), and the finalized decision carries **all 8 required audit fields** (JTBD-02.2, PRD §7 Audit completeness). All **10 of 10 walkthrough steps** complete end-to-end against seeded data with zero manual data entry and zero developer intervention (JTBD-04.1, PRD §7 Walkthrough completion).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Step 1 — Show the queue | F17, F16, F5, F2 |
| Step 2 — Open the flagged shipment | F18, F0, F3 |
| Step 3 — Show the AI summary | F18, F7 |
| Step 4 — Display the triggering rule and evidence | F19, F5, F4, F8 |
| Step 5 — Request the missing document | F19, F10, F9, F12, F13 |
| Step 6 — Upload the simulated document | F18, F10 |
| Step 7 — Revalidate | F18, F6, F4, F7, F8 |
| Step 8 — Specialist recommends clearance | F19, F9, F11, F8, F12, F13 |
| Step 9 — Supervisor approves | F17, F19, F11, F14, F12, F13 |
| Step 10 — Show the complete audit trail | F20, F12, F13 |

---

### JRN-01.2: Shift Start — Deciding What to Work Before Working Anything

**Persona:** PER-01 (Marisol Reyes)
**Scenario:** Marisol logs in at the start of a shift with a queue of flagged entries and no sense of which are urgent. Her goal for the next minute is not to resolve anything — it is to establish an order of work she can defend, and to pick the first case without opening five shipments she has no intention of touching. Every shipment she opens speculatively is a minute she does not get back, and the ones that punish her for guessing are the multi-exception, high-value ones that look ordinary in a flat list.
**Related Jobs:** JTBD-01.1

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Arrive | Selects Cargo Specialist at the simulated login and lands on the queue | Shell / role selector (F16) | "Am I definitely acting as myself, in my own role?" | Neutral, slightly rushed | A role she cannot see is a role she cannot trust to be enforced | Current user and role are always visible in the shell, and the demo-mode indicator makes the simulation boundary explicit | Session established with a named acting user; role-aware navigation hides administrator surfaces entirely |
| Survey | Scans the full list of flagged shipments without opening any | Cargo Exception Queue (F17) | "How bad is today, and is anything screaming?" | Assessing | A flat arrival-ordered list forces her to open entries to discover severity | Every row carries ID, importer, exception type, priority and status, so severity is legible without a click | Queue renders in <1s; multi-exception shipments are marked as such rather than collapsed to one headline problem |
| Narrow | Filters to Critical and High priority and sorts by age | Cargo Exception Queue (F17) → filter/sort controls | "Old and high-priority first. Anything aging in Awaiting Information I need to chase, not review." | Focused, in control | Cross-referencing three spreadsheets to estimate what is aging | Filter by status, exception type and priority plus sort by priority and age, all on the list itself | Filtered view returns instantly; status and priority are conveyed by text label as well as color, so the distinction survives a color-blind reader and a projector |
| Choose | Selects `SHP-2026-0007` — highest priority, three exceptions, $85,000 | Cargo Exception Queue (F17) | "Three exceptions and high value. That one gets my fresh attention, not my tired attention." | Decided | Choosing badly at 8am costs the whole morning | Multi-exception chips make the highest-consequence case self-identifying | Row selection opens Shipment Review for that shipment (this is where JRN-01.1 begins) |
| Re-enter | Later in the shift, returns to the queue after acting on a case and finds it in its new status without reloading | Cargo Exception Queue (F17) | "Did my last action actually land, or am I looking at a stale list?" | Mildly suspicious | Stale lists cause duplicate work and double-requests | The queue reflects state changes made elsewhere in the workflow, so a case she moved to Awaiting Information appears that way immediately | Queue reflects post-action and post-revalidation state; her acted-on case shows its new status and drops out of her Critical-and-High/New filter |

#### Key Moments

- **Decision Point — Choose:** the entire value of the queue screen is realized or lost in this one selection. If she has to open shipments to find out how bad they are, the screen has failed regardless of how it looks.
- **Risk of Abandonment — Survey:** a flat, unprioritized list is indistinguishable from the spreadsheet she already has, and she will go back to the spreadsheet.
- **Delight Opportunity — Re-enter:** seeing her own action reflected without a manual refresh is a small thing that establishes the queue as the source of truth rather than a report.

#### Success Outcome

Marisol selects her next case in **under 15 seconds** without opening any shipment she does not intend to work, and **no multi-exception shipment is ever presented to her as a single-exception case** (JTBD-01.1 success measure; PRD §6 Performance, queue loads in <1s).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Arrive | F16, F14 |
| Survey | F17, F5, F2 |
| Narrow | F17 |
| Choose | F17, F18 |
| Re-enter | F17, F9 |

---

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

### JRN-03.2: Twenty Minutes Before the Stakeholders Arrive

**Persona:** PER-03 (Priya Raghavan)
**Scenario:** A walkthrough is scheduled in twenty minutes, and the previous run left the environment used — documents uploaded, cases cleared, statuses moved. Priya's job is to hand the presenters an environment that behaves exactly as it did the first time, and to know before the audience does whether anything is degraded. She restarts, runs one pre-flight check, discovers that AI assistance is running in offline-fallback mode, decides that is acceptable because the fallback is labeled and the walkthrough completes without the provider, resets to pristine seeded state, and verifies the canonical solar-panel scenario is present verbatim before she hands over.
**Related Jobs:** JTBD-03.3, JTBD-03.4

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Start | Starts the application with a single command and opens the preview URL | Demo Environment (F22) → shell (F16) | "One command, same port, same URL as last week — or I'm re-sending links five minutes before we begin." | Businesslike | Demo environments that need manual setup and never come up the same way twice | Single-command start bound to a deterministic port, so the preview URL is stable across restarts and embeddable | Application starts clean; frontend and API served in one preview session on the deterministic port |
| Pre-flight | Runs the health check | Demo Environment (F22) → health check | "Database, seed, AI — one answer, not three places to look." | Focused | Finding out mid-demonstration that AI assistance is degraded, in front of the audience | A single pre-flight signal covers database availability, seed data presence, and AI-assist availability including fallback status | Health check reports database available, seed data present, and **AI assist: offline-fallback** with the fallback status stated explicitly |
| Judge the degradation | Reads the fallback status and decides to proceed rather than scramble | Demo Environment (F22) → degradation banner | "Fallback, labeled, deterministic. That's a talking point, not a failure." | Composed, mildly relieved | Discovering a dependency problem with no time and no options | Degradation is a labeled, expected mode rather than an outage: the walkthrough completes with the provider disabled | A graceful-degradation banner is displayed in the application before and during the run, stating that AI assistance is running in offline-fallback mode |
| Reset | Triggers the one-action reset to pristine seeded state | Demo Environment (F22) → reset control | "Back to zero without touching the database. Last run's uploads and clearances have to be gone." | Decisive | Cleaning up demo state by hand or editing the database between runs | One action, from an administrative surface, with no manual database intervention | Environment reset to pristine seeded state; prior session's documents, decisions, approvals and audit entries removed; deterministic IDs and timestamps reproduced identically |
| Verify the canonical case | Opens the queue and checks `SHP-2026-0007` presents verbatim | Cargo Exception Queue (F17) → Shipment Review (F18) | "Solar panels, Malaysia against China, incomplete HTS, $85,000, certificate missing, three exceptions. Exactly that." | Attentive | A repeat walkthrough that is never quite identical to the first, so nothing can be compared | Deterministic seeding means the canonical scenario is present verbatim on every run | Canonical shipment present with the specified attributes and **all 3 expected exceptions on first ingestion**; all three exception types and all queue statuses represented across the seeded set, including a multi-exception shipment and a pre-cleared shipment with a complete historical record |
| Hand over | Confirms the demo-mode indicator is visible and that no real or identifiable data is present anywhere, then hands the environment to the presenters | Shell (F16) → Demo Environment (F22) | "Nobody in that room should mistake this for production, and nothing in it should belong to a real importer." | Confident | Stakeholders reading a demo as production-ready, or synthetic data quietly containing something real | Simulated-login labeling, generated-not-transmitted notifications and a visible demo-mode indicator make the simulation boundary explicit at every point it is encountered | Demo-mode indicator visible in the shell; **0 instances of real or personally identifiable data** in seed data, fixtures, logs or AI prompts |

#### Key Moments

- **Decision Point — Judge the degradation:** whether the walkthrough proceeds. The value of the pre-flight check is entirely in giving her this decision before the audience is in the room rather than during step 3.
- **Delight Opportunity — Reset:** returning to a byte-identical starting state in one action is what makes three consecutive comparable walkthroughs possible at all.
- **Risk of Abandonment — Verify the canonical case:** if the seeded scenario drifts by even a field, the presenters' narration stops matching the screen and the demo loses the room.
- **Trust-Building Moment — Hand over:** the demo-mode indicator is a small piece of UI carrying a disproportionate amount of the product's credibility with an evaluator.

#### Success Outcome

Priya confirms database, seed data and AI-assist status in **a single pre-demo check**, and the full walkthrough completes successfully **with the AI provider disabled and the fallback clearly labeled** (JTBD-03.3, PRD §7 AI availability resilience). **3 consecutive full walkthroughs after reset produce identical results**, with the canonical solar-panel shipment flagging all 3 expected exceptions on first ingestion and **0 instances of real or personally identifiable data** anywhere in the environment (JTBD-03.4, PRD §7 Walkthrough repeatability, Data safety).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Start | F22, F16 |
| Pre-flight | F22, F7, F0 |
| Judge the degradation | F22, F7, F8 |
| Reset | F22, F2, F0 |
| Verify the canonical case | F17, F18, F2, F5 |
| Hand over | F16, F22, F13, F14 |

---

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

### JRN-04.2: Going Off Script — Out of Order, Provider Off, Rule Changed, Tests Run

**Persona:** PER-04 (Angela Pruitt)
**Scenario:** The scripted walkthrough finished cleanly, which tells Angela almost nothing — every demonstration she has been shown finished cleanly. The half hour that follows is the part that decides her assessment. She asks for steps out of sequence, picks cases nobody prepared, has the AI provider switched off mid-session, watches a rule parameter changed live by an administrator she has not seen operate before, and asks to see the test suite that supposedly holds the governance claims true. She still touches nothing herself; she directs, and she watches the four screens answer.
**Related Jobs:** JTBD-04.1, JTBD-04.2, JTBD-04.4, JTBD-04.5

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Break the sequence | Asks them to open the audit record first, then jump back to the queue, then into a review screen for an unrelated shipment | Observed: Decision & Audit Record (F20) → Cargo Exception Queue (F17) → Shipment Review (F18) | "The demo runs in one order. Does the application?" | Testing | Rehearsed click-paths that break the moment the sequence changes | The four screens are navigable in any order rather than only in walkthrough order, and each has defined loading, empty and error states | Every screen loads directly and independently; no step leaves the application in a broken state; nothing depends on having arrived from the previous screen |
| Pick her own cases | Chooses two cases nobody offered her: a multi-exception shipment and an already-cleared one with a historical record | Observed: Cargo Exception Queue (F17) → Shipment Review (F18) → Decision & Audit Record (F20) | "Not the shipment you rehearsed. These two." | Deliberate | Seed data that only exercises the demonstrated path, leaving everything else empty | The seeded set covers all three exception types and all queue statuses, including a multi-exception case and a pre-cleared case with a complete historical record | Both cases render fully; the cleared one replays a complete attributed history including its approving official; the multi-exception one shows every firing rule, none suppressed |
| Cut the AI off | Asks what happens when the AI provider is unavailable, and has it disabled while she watches | Observed: Shipment Review (F18) → AI summary panel, degradation banner (F7, F8, F22) | "Every AI demo I've seen has a network dependency it doesn't mention. Where's yours?" | Sharp, expectant | Demonstrations that collapse when a dependency is unavailable, having never disclosed the dependency | A deterministic offline fallback is served and labeled as such, so degradation is a stated mode rather than a failure | Fallback summary and fallback recommendation are served and **clearly labeled as fallback**; a degradation banner is displayed; the walkthrough continues to completion with the provider disabled |
| Watch a policy change | Asks whether a policy change needs the vendor; watches Priya change a rule parameter live and revalidate the affected shipments | Observed: Rule Administration (F15) → Shipment Review (F18) validation results (F6) | "Who owns the rules after you leave? That's the whole procurement question." | Genuinely surprised | Rapidly built systems that are rigid, where any policy change means the vendor rebuilds | Rules are visible as configuration — type, severity, enabled state, policy reference, editable parameters — and the change lands without a developer | Parameter changed and validation results updated with **0 code changes and 0 redeploys**; the change is recorded in the audit trail attributed to a named administrator with a timestamp |
| Ask for the proof | Asks to see the tests behind the claims: self-approval blocked, non-administrators blocked from editing rules, audit completeness, all ten steps | Observed: test suite output (F21) | "Narration is not evidence. Show me the thing that fails if this stops being true." | Rigorous | Governance claims held true by a presenter's assurance and nothing else | The claims she cares about are asserted by tests she can watch run, including an end-to-end execution of all ten steps | Test suite runs green, covering the three exception types (positive, negative, multi-exception, parameter change), all valid and invalid workflow transitions, each role against each protected operation, audit completeness and append-only enforcement, and the full ten-step walkthrough |
| Check the boundary | Confirms the simulation boundary is stated wherever she encounters it — login, notifications, demo mode, ingestion source | Observed: shell (F16), notifications (F13), Shipment Review documents panel (F10) | "I need to be certain that nobody in this room walks out thinking this is in production." | Settled | Simulated elements presented ambiguously, so a demo gets read as a deployed system | The boundary is labeled at every point she meets it, and the exclusions are recorded as decisions rather than omitted | Simulated-login labeling, "generated, not transmitted" on every notification, a visible demo-mode indicator, and document provenance shown as seeded or simulated-upload on every document |

#### Key Moments

- **Decision Point — Watch a policy change:** this is the moment her assessment turns from "impressive build" to "system we could own", or does not. Everything before it was about whether the demo works; this is about what happens after the vendor leaves.
- **Decision Point — Ask for the proof:** a green suite covering the specific claims converts narration into evidence; an absent or unrelated suite retroactively devalues everything she has been told.
- **Delight Opportunity — Cut the AI off:** a labeled fallback that keeps the walkthrough running answers a question she expected to end the meeting on.
- **Risk of Abandonment — Break the sequence:** a single broken screen outside the rehearsed order confirms her prior that this is a script, and nothing after it recovers her attention.

#### Success Outcome

Every out-of-sequence and off-script request Angela makes **is served by the running system** (JTBD-04.1). A rule parameter is changed in front of her and the effect on validation is visible with **0 code changes and 0 redeploys**, attributed to a named administrator (JTBD-04.4, PRD §7 Rule configurability). The walkthrough **completes with the AI provider disabled and the fallback clearly labeled** (PRD §7 AI availability resilience). The test suite is green across **100% of the specified rule, workflow-transition, RBAC and audit-completeness behaviors**, and Angela never mistakes a simulated element for a production one (JTBD-04.5).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Break the sequence | F16, F17, F18, F20 |
| Pick her own cases | F17, F18, F20, F2 |
| Cut the AI off | F18, F7, F8, F22 |
| Watch a policy change | F15, F4, F6, F12 |
| Ask for the proof | F21 |
| Check the boundary | F16, F13, F14, F10 |

---

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
