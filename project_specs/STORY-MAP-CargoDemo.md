# User Story Map
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related Personas** | PERSONAS-CargoDemo.md (PER-01 … PER-04) |
| **Related Journeys** | JOURNEYS-CargoDemo.md (JRN-01.1 … JRN-04.2) |
| **Related JTBD** | JTBD-CargoDemo.md (JTBD-01.1 … JTBD-04.5) |
| **Related User Stories** | UserStories-CargoDemo.md (US-0.1 … US-12.7, 80 stories, 13 epics) |
| **Related PRD** | PRD-CargoDemo.md (§3.2 Walkthrough, §5 Features, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |

---

## Overview

This map organises all **80 existing user stories** from `UserStories-CargoDemo.md` into a two-dimensional
backbone. No new stories are created here; every story is placed, and every placement carries a Natural
Acceptance Criterion (NaC) traced to a JTBD outcome.

**The horizontal backbone is the canonical 10-step demo walkthrough (JRN-01.1 / PRD §3.2), not a feature
taxonomy.** That is a deliberate choice: the walkthrough *is* the product's primary acceptance criterion
(PER-04's judgment, PRD §3.2, §7 "Walkthrough completion"), so the lane a story sits in answers the only
question that matters for sequencing — *which of the ten steps fails without it?*

**Lanes in this map:**

| Lane group | Lanes | Purpose |
|---|---|---|
| Backbone | Step 0 (foundation) → Step 10 | The 10-step walkthrough in order, plus the pre-step foundation it stands on |
| Governance | Governance Negatives, Proof by Test | What the system must **refuse**, and the tests that hold the refusals true |
| Resilience | Off-Script Resilience, Unhappy Path, Shift Start | The paths PER-04 probes when the script ends |
| Later | Adjudication Depth, Rule Administration, Demo Operations (partial) | Not required by the ten steps or the negatives |

**Release rule applied throughout:**

- **R1 — The Demo Release.** Everything required to make the ten walkthrough steps run end-to-end, plus
  every governance negative and the tests that assert them. 74 stories.
- **R2 — The Full Evaluation Session.** Capability that a stakeholder session needs beyond the scripted
  ten steps: supervisor rejection depth, live rule administration, and pre-flight operability. 6 stories.
- **R3 — Explicitly Out of Scope.** Deliberately empty. PRD §5.8 exclusions are recorded decisions, not
  deferred work.

### What a NaC is here

A Natural Acceptance Criterion is not invented for this document. Each one is the intersection of three
things that already exist upstream:

1. a **JTBD outcome** — what the persona is trying to achieve (the "what matters"),
2. a **journey stage** — the moment in JRN-XX.N where that outcome is either met or lost (the "when"),
3. a **user story** — the thing being built (the "what").

So `JTBD-01.4` ("close a documentation gap inside the case") applied to `JRN-01.1:Step 7` (revalidation)
produces the NaC *"exactly 1 exception resolves and 2 are retained, stated on screen, round-trip <2s"* —
which is testable, and which US-11.7 must satisfy. A criterion that cannot be traced back to a JTBD
outcome does not appear in this map.

---
## Story Map Matrix

**Backbone:** the 10-step walkthrough of JRN-01.1 on the canonical shipment `SHP-2026-0007`
(solar panels, Malaysia vs. China, incomplete HTS `8541.40`, $85,000, certificate missing → 3 exceptions).
Step 0 is the pre-walkthrough foundation: it has no demo step of its own, and steps 1–10 all fail without it.

### Step 0 — Foundation: Start Seeded, Named and Governed

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Persist the whole domain — shipments, documents, rules, exceptions, decisions, approvals, notifications, audit | PER-03 | Epic 0 (F0) | US-0.1 | JTBD-03.4: a fresh sandbox migrates and starts clean with deterministic schema; every entity carries actor attribution and timestamps | R1 |
| Ingest the seeded cargo entries from the cargo-entry JSON file and validate on ingest | PER-03 | Epic 0 (F1) | US-0.2 | JTBD-03.4: re-ingesting the same shipment ID updates rather than duplicates; malformed entries are reported without aborting the batch | R1 |
| Seed 10–15 synthetic shipments including the canonical case verbatim, a multi-exception case and a pre-cleared case | PER-04 | Epic 0 (F2) | US-0.4 | JTBD-03.4: the canonical solar-panel shipment appears identically on every run with all 3 expected exceptions; 0 instances of real or PII data anywhere | R1 |
| Serve one consistent backend contract to the UI with server-side role enforcement on every mutating endpoint | PER-01 | Epic 0 (F3, F14) | US-0.5 | JTBD-03.5: every mutating endpoint authorises server-side; role checks are never client-only | R1 |
| Enter as a named acting user through simulated login and see the demo-mode boundary stated | PER-03 | Epic 8 (F14) | US-8.1 | JTBD-04.5: the acting user's name and role are stamped on every audit entry; simulated login is labelled as simulated | R1 |
| Scope the Cargo Specialist role — queue, review, five actions, recommend; never approve, never edit rules | PER-01 | Epic 8 (F14) | US-8.2 | JTBD-01.5: actions outside her role are unavailable **and state why**, not merely inert | R1 |
| Scope the Supervisor role — everything a specialist can do plus approve/reject; never edit rules | PER-02 | Epic 8 (F14) | US-8.3 | JTBD-02.1: his queue spans the whole team and every status, scoped server-side to what he may act on | R1 |
| Frame the four screens in a shell with persistent navigation, role always visible, and loading/empty/error states | PER-01 | Epic 9 (F16) | US-9.1 | JTBD-04.1: current user and role are visible on every screen; administrator surfaces are hidden from non-administrators | R1 |

### Step 1 — Show the Exception Queue

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Land the walkthrough on a populated queue of flagged shipments with ID, importer, exception, priority, status | PER-04 | Epic 11 (F17, F5, F2) | US-11.1 | JTBD-04.1: step 1 renders live against seeded data in <1s with zero manual data entry, in identical row order to the previous run | R1 |
| Work the queue as the landing surface — tabular, selectable rows that open Shipment Review | PER-01 | Epic 9 (F17) | US-9.2 | JTBD-01.1: every flagged shipment is legible without being opened; the clean seeded shipment is not listed | R1 |
| Show multi-exception shipments as multi-exception rather than collapsing them to one headline problem | PER-01 | Epic 9 (F17, F5) | US-9.4 | JTBD-01.1: `SHP-2026-0007` shows three distinct exception-type chips; 0 multi-exception shipments presented as single-exception | R1 |
| Detect a missing required document from configurable rule parameters | PER-01 | Epic 1 (F4, F5) | US-1.1 | JTBD-01.2: the certificate-of-origin requirement fires as a named exception with the missing document type stated | R1 |
| Detect an invalid or incomplete HTS code against the configured expected digit count | PER-01 | Epic 1 (F4, F5) | US-1.2 | JTBD-01.2: `8541.40` fires against the configured 10-digit expectation with declared and expected counts both captured | R1 |
| Detect a conflicting country of origin by comparing declared origin against manufacturer address country | PER-01 | Epic 1 (F4, F5) | US-1.3 | JTBD-01.2: Malaysia vs. China fires as an origin conflict on first ingestion | R1 |
| Keep evaluation deterministic and retain every firing rule — none suppressed in favour of a headline | PER-04 | Epic 1 (F4) | US-1.4 | JTBD-01.3: same entry + same rule set always yields the same exception set; all 3 canonical exceptions retained | R1 |

### Step 2 — Open the Flagged Shipment

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Open the canonical row and land on its full review detail in one activation (click or keyboard) | PER-01 | Epic 11 (F18, F0, F3) | US-11.2 | JTBD-01.2: all eight required attributes plus documents and validation panels render in <1s on the non-AI calls | R1 |
| See the whole case on one screen — entry fields, documents-received with provenance, validation results | PER-01 | Epic 9 (F18) | US-9.5 | JTBD-01.2: identity, classification, origin, manufacturer, value and documents state are all present with **no navigation away** | R1 |

### Step 3 — Show the AI-Generated Summary

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Render the plain-language summary of what the shipment is and why it was flagged, on the review screen | PER-01 | Epic 11 (F7, F18) | US-11.3 | JTBD-01.2: the flagging reason is stated in <30s of opening, without leaving Shipment Review or consulting external policy | R1 |
| Ground every sentence of the summary in captured evidence — named fields and documents, not prose | PER-01 | Epic 2 (F7, F18) | US-2.1 | JTBD-01.3: every claim in the summary maps to a field or document visible elsewhere on the same screen | R1 |
| Label and attribute every AI output wherever it appears — provider/model, generation timestamp, evidence inputs | PER-04 | Epic 2 (F7, F8, F18, F19, F20) | US-2.2 | JTBD-02.3: 100% of AI outputs are visually labelled AI-generated and carry provider/model, timestamp and evidence inputs | R1 |

### Step 4 — Display the Triggering Rule and Evidence

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Render one card per open exception with its triggering rule, policy reference, severity and evidence | PER-01 | Epic 11 (F5, F4, F8, F19) | US-11.4 | JTBD-01.3: for 100% of exceptions the rule + ≥1 concrete field reference and value are shown, sourced from the exception API and **not** from the AI response | R1 |
| Capture and display field-level evidence, and state explicitly what is missing where evidence is absent | PER-01 | Epic 1 (F5) | US-1.5 | JTBD-01.3: `country_of_origin = "Malaysia"` against `manufacturer.address.country = "China"` displayed as values, never as prose | R1 |
| Present the AI recommended action with an explicit confidence level, stated basis and traceable rationale | PER-01 | Epic 2 (F8, F19) | US-2.4 | JTBD-01.3: the advisory recommendation carries a confidence level with a stated basis and a rationale traceable to displayed evidence | R1 |
| Present exactly five actions with role- and state-aware availability and mandatory justification | PER-01 | Epic 3 (F9) | US-3.1 | JTBD-01.5: all five actions are presented together; no action is pre-selected or auto-submitted; submission without justification is rejected | R1 |
| State the reason on every unavailable action rather than greying it out silently | PER-01 | Epic 3 (F9, F19) | US-3.7 | JTBD-01.5: 100% of disabled actions display why they are unavailable to this role or this case state | R1 |
| Make the screen say plainly that the AI recommends and the named official decides | PER-01 | Epic 9 (F19) | US-9.7 | JTBD-04.2: the governance notice "The AI recommends. A named official decides. No action has been taken." is visible at the decision point | R1 |

### Step 5 — Request the Missing Document

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Issue the request for the missing certificate with a justification and move the case to Awaiting Information | PER-01 | Epic 11 (F10, F9, F13) | US-11.5 | JTBD-01.4: one `OUTSTANDING` request is created with requester, timestamp, linked exception and linked rule; case → `AWAITING_INFORMATION`; audit entry and notification both written | R1 |
| Take the request-additional-information action from the five, bound to the missing-document exception | PER-01 | Epic 3 (F9, F10) | US-3.2 | JTBD-01.4: the request names a specific document type drawn from the exception's missing information, never free text | R1 |
| Track the request lifecycle — outstanding → fulfilled — with requester, fulfiller and timestamps on the case | PER-01 | Epic 4 (F10) | US-4.1 | JTBD-01.4: the outstanding request is visible on the shipment record itself, so nothing lives in a side channel | R1 |

### Step 6 — Upload the Simulated Document

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Attach the seeded certificate fixture to the open request from the review screen, live during the demo | PER-01 | Epic 11 (F10) | US-11.6 | JTBD-04.1: the fixture is offered by the app so nothing is sourced from the presenter's machine; zero manual data entry | R1 |
| Upload a simulated document against an open request as an authorised role | PER-01 | Epic 4 (F10, F14) | US-4.2 | JTBD-01.4: the document type is taken from the **request**, not from client input, so a requirement cannot be closed by a mislabelled file | R1 |
| Show where every document came from — seeded, ingested, or uploaded this session | PER-04 | Epic 4 (F10, F18) | US-4.5 | JTBD-04.5: provenance is displayed on every document (`SEEDED` / `SIMULATED_UPLOAD`), keeping the simulation boundary explicit | R1 |
| Trigger revalidation atomically inside the upload transaction | PER-01 | Epic 4 (F10, F6) | US-4.4 | JTBD-01.4: upload and revalidation commit together — a document can never be attached without its re-evaluation | R1 |

### Step 7 — Revalidate the Shipment

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Re-run the rules at a new evaluation version and reconcile the outcome on screen | PER-01 | Epic 11 (F6, F4) | US-11.7 | JTBD-01.4: missing-document → `RESOLVED_BY_REVALIDATION`; origin and HTS **retained**; open count 3 → 2; case → `IN_REVIEW`; round-trip <2s; the case never becomes `CLEARED` by revalidation | R1 |
| Revalidate after evidence changes, resolving what no longer fires and retaining what still does | PER-01 | Epic 1 (F6) | US-1.6 | JTBD-01.4: resolved exceptions are marked resolved-by-revalidation rather than deleted, and 100% of still-firing exceptions are retained | R1 |
| Record the revalidation with before/after exception sets and refresh the AI outputs against the new version | PER-02 | Epic 1 (F6, F12, F13) | US-1.7 | JTBD-02.2: the audit entry carries the complete before and after exception sets; summary and recommendation regenerate at v2 | R1 |
| State inline what changed after revalidation | PER-01 | Epic 9 (F18, F6) | US-9.6 | JTBD-01.4: the change indication reads "1 resolved, 2 retained" — she is never told a shipment is clear while a rule still fires | R1 |

### Step 8 — Specialist Recommends Clearance

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Select clear-exception, enumerate the exception set, write the justification, and route it upward | PER-01 | Epic 11 (F9, F8, F11) | US-11.8 | JTBD-01.5: a `PENDING` recommendation bound to the current evaluation version is created; case → `PENDING_APPROVAL`, visibly **not** `CLEARED`; 40-character minimum justification on `MIXED` basis | R1 |
| Recommend clearance and have the hand-off happen through the queue rather than an inbox | PER-01 | Epic 5 (F11, F9) | US-5.1 | JTBD-01.5: a Supervisor-addressed notification is generated and the case appears under the supervisor's pending-approval filter with a distinct marker | R1 |
| Snapshot what the human was advised, and whether they concurred with or diverged from it | PER-02 | Epic 2 (F8, F12) | US-2.5 | JTBD-02.2: the recommendation records the AI advice, its confidence and the human's concurrence, so the record shows what she was told at the time | R1 |

### Step 9 — Supervisor Approves

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Approve the recommendation and be recorded by name as the approving official | PER-02 | Epic 11 (F11, F14, F13) | US-11.9 | JTBD-02.4: SoD-1 (is Supervisor) and SoD-2 (`usr-sup-001 ≠ usr-cs-001`) both pass; the eight-field audit gate passes with a non-null approving official; case → `CLEARED` and becomes terminal | R1 |
| Find pending-approval work without hunting for it, across the whole team | PER-02 | Epic 5 (F11, F17) | US-5.2 | JTBD-02.1: pending-approval items are visually distinct and reachable in one filtered step in <15s | R1 |
| Adjudicate on the record — exception, rule, evidence, AI advice with confidence, and the named justification in one view | PER-02 | Epic 9 (F19, F11) | US-9.8 | JTBD-02.2: for 100% of recommendations, all four elements are visible at the point of decision with no navigation away | R1 |
| Write the approval identity, decision, justification and timestamp to the record and generate the notification | PER-02 | Epic 5 (F11, F12, F13) | US-5.3 | JTBD-02.4: 0 shipments reach `CLEARED` without a recorded approving official; a notification naming that official is generated | R1 |

### Step 10 — Show the Complete Audit Trail

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Replay every step just watched — ingestion through approval — attributed and timestamped | PER-04 | Epic 11 (F12, F20) | US-11.10 | JTBD-04.3: the timeline contains all nine event classes in order; the approval entry names the approving official and the recommender; chain verification reports all entries intact | R1 |
| Record all eight required fields on every finalised decision | PER-02 | Epic 6 (F12) | US-6.1 | JTBD-02.5: 100% of finalised decisions carry exception, evidence reviewed, AI recommendation, decision, justification, timestamp, approving official and generated notification | R1 |
| Block finalisation outright when a required audit field is absent | PER-04 | Epic 6 (F12, F21) | US-6.2 | JTBD-04.3: 0 decisions are finalisable with a missing field — incompleteness is impossible rather than unlikely | R1 |
| Keep the record append-only, with no edit or delete path through the application | PER-04 | Epic 6 (F12, F22) | US-6.3 | JTBD-01.6: entries cannot be edited or removed after the fact; the screen offers no edit or delete affordance anywhere | R1 |
| Read the complete case timeline in chronological order, with AI content separated from human decisions | PER-02 | Epic 6 (F12, F20) | US-6.4 | JTBD-02.3: machine-authored entries are visually and textually separated from human-authored decisions; justifications render verbatim and in full | R1 |
| Replay the record read-only on the fourth screen and open it directly on a specific entry | PER-04 | Epic 9 (F20, F12) | US-9.9 | JTBD-04.1: the audit screen opens directly, and before any decision exists shows ingestion and flagging rather than an empty state | R1 |
| Read the evidence as it stood at decision time, not as it stands now | PER-04 | Epic 6 (F12, F21) | US-6.6 | JTBD-04.3: every machine-generated claim in the record traces to the field value or document that was displayed when the decision was taken | R1 |
| Export or print the complete record in a single action | PER-02 | Epic 6 (F12, F20) | US-6.5 | JTBD-02.5: one action produces the whole chronological attributed history as JSON and as a printable view — no hand assembly | R1 |
| Generate exactly one notification per decision and state change, in the same transaction as the audit entry | PER-02 | Epic 7 (F13, F12) | US-7.1 | JTBD-02.5: never zero, never two; a state change without its notification is structurally impossible | R1 |
| Show notifications beside the decisions that produced them, labelled "Generated, not transmitted" | PER-04 | Epic 7 (F13, F16, F20) | US-7.2 | JTBD-04.5: every notification carries `transmitted: false` and the fixed label; no outbound transport client exists in the codebase | R1 |

---
### Governance Negatives — What the System Must Refuse

*These lanes are R1 by rule: a governance claim that is not enforced in the demo release is a claim PER-04
will disprove in the session. Every row here is something the system must refuse **and record refusing**.*

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Reject invalid state transitions server-side with a stated reason instead of accepting and dropping them | PER-01 | Epic 3 (F9, F12) | US-3.6 | JTBD-01.5: invalid transitions are refused with an explanatory reason, and the refusal is written to the audit trail | R1 |
| Enforce authorisation server-side on every mutating operation, and log every unauthorised attempt | PER-04 | Epic 8 (F14, F21) | US-8.4 | JTBD-02.4: 100% of protected operations reject unauthorised roles server-side; UI hiding alone never satisfies the check | R1 |
| Prevent the AI from clearing, holding or escalating anything on its own | PER-04 | Epic 12 (F8, F9, F12) | US-12.1 | JTBD-04.2: **0 AI-initiated actions** across the session; the recommendation is inert until a human selects an action; no scheduler, queue or webhook acts on cases | R1 |
| Prevent a specialist from approving their own recommendation | PER-02 | Epic 12 (F11, F14, F12) | US-12.2 | JTBD-02.4: the attempt returns `403 SELF_APPROVAL_BLOCKED`, the case never leaves `PENDING_APPROVAL`, and the refused attempt appears in the audit trail | R1 |
| Prevent any path to Cleared without a named approving official | PER-04 | Epic 12 (F11, F9, F6) | US-12.3 | JTBD-04.2: **0 clearances without a recorded approving official**; revalidation, ingestion and re-seeding can never produce `CLEARED` | R1 |
| Prevent audit records from being edited or deleted | PER-04 | Epic 12 (F12, F22) | US-12.4 | JTBD-01.6: no application path mutates or removes an audit entry; append-only is enforced at the storage boundary, not by convention | R1 |
| Prevent a decision without a human-authored justification | PER-02 | Epic 12 (F9, F11, F12) | US-12.5 | JTBD-01.5: every action and every approval requires a justification; no decision is finalisable with the field missing | R1 |
| Prevent role boundaries from being crossed — including the administrator's own inability to adjudicate | PER-03 | Epic 12 (F14, F9, F15) | US-12.6 | JTBD-03.5: administrator adjudication returns `403 FORBIDDEN_ROLE` and is logged; non-administrators are blocked from the rule endpoints the same way | R1 |
| Prevent excluded capabilities from reappearing — no ACE client, no fourth exception type, no real data, no outbound transport | PER-04 | Epic 12 (F1, F4, F2, F14, F13, F7, F16) | US-12.7 | JTBD-04.5: every PRD §5.8 exclusion is asserted absent by test, so scope discipline is a recorded decision rather than a narration | R1 |

### Proof by Test — Claims Held by Something Other Than Narration

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Cover rule evaluation and revalidation by test — three types, positive, negative, multi-exception, parameter change | PER-03 | Epic 10 (F21, F4, F6) | US-10.1 | JTBD-04.5: rule tests cover all three exception types in both directions plus the resolve-one/retain-two revalidation case | R1 |
| Cover workflow transitions, RBAC and audit completeness by test | PER-04 | Epic 10 (F21, F9, F11, F12, F14) | US-10.2 | JTBD-04.5: every valid and invalid transition, each role against each protected operation, blocked self-approval, blocked rule editing, and append-only enforcement are asserted | R1 |
| Cover all ten walkthrough steps end-to-end in one test against seeded data | PER-03 | Epic 10 (F21, F22) | US-10.3 | JTBD-04.1: one test executes steps 1–10 and fails if any step stops working — the walkthrough is regression-protected, not rehearsed | R1 |

### Off-Script Resilience — Out of Order, Provider Off, Reset Live

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Survive out-of-sequence navigation, stakeholder-chosen cases, mid-session AI disablement and mid-session reset | PER-04 | Epic 11 (F22, F2, F17) | US-11.11 | JTBD-04.1: any of the four screens opens directly by URL and renders correctly; every off-script request is served by the running system; no step leaves the application broken | R1 |
| Continue the walkthrough with the AI provider unavailable, on a labelled deterministic fallback | PER-03 | Epic 2 (F7, F8, F22) | US-2.3 | JTBD-03.3: fallback summary and recommendation are served and **clearly labelled as fallback** with a degradation banner; the full walkthrough completes with the provider disabled | R1 |

### Unhappy Path — Refused Upload, Hold and Escalation (JRN-01.3)

*The five actions are a first-class R1 deliverable (US-3.1): a five-action panel where three actions do
nothing would be a governance claim the panel itself contradicts. The behaviours below therefore ship in R1.*

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Refuse anything other than a synthetic document fixture, before anything is written | PER-03 | Epic 4 (F10) | US-4.3 | JTBD-01.4: a renamed archive is refused with `422 FILE_CONTENT_MISMATCH`; **no document row, no revalidation, no partial state** — the request stays outstanding | R1 |
| Place a case on hold with a stated reason | PER-01 | Epic 3 (F9) | US-3.4 | JTBD-01.5: the hold action requires a justification and produces an audit entry and a notification like any other action | R1 |
| Escalate to a supervisor and have authority actually transfer | PER-01 | Epic 3 (F9) | US-3.5 | JTBD-01.5: after escalation her own follow-up returns `403 ESCALATED_REQUIRES_SUPERVISOR` with a stated reason, and the denial is itself an audit entry | R1 |
| Send a case back for specialist review | PER-02 | Epic 3 (F9) | US-3.3 | JTBD-02.2: the action returns the case to a specialist with the reason attached rather than closing it | R1 |

### Shift Start — Ordering the Work Before Touching It (JRN-01.2)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Filter by status, exception type and priority and sort by priority and age, deterministically | PER-02 | Epic 9 (F17) | US-9.3 | JTBD-01.1: the next case is chosen in <15s with no speculative opens; identical filters yield identical order on every run; status and priority are conveyed by label, not colour alone | R1 |

*JRN-01.2's remaining stages are served by stories already placed on the backbone: Arrive by US-8.1 and
US-9.1 (Step 0), Survey by US-9.2 and US-9.4 (Step 1), Choose by US-11.2 (Step 2), and Re-enter by US-9.2's
post-action queue refresh (Step 1).*

### Adjudication Depth — Return, Re-Weigh, Re-Read (JRN-02.1)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Reject or return a recommendation with a reason code and a fuller justification | PER-02 | Epic 5 (F11, F13) | US-5.4 | JTBD-02.2: rejection requires a reason code plus a ≥40-character justification, returns the case to its author with the reason attached, and leaves the exceptions `OPEN` | R2 |
| Be warned, and required to acknowledge, when the evidence changed since the recommendation was made | PER-02 | Epic 5 (F11, F6) | US-5.5 | JTBD-02.2: approval is refused with `EVIDENCE_CHANGED_UNACKNOWLEDGED` until the version diff is acknowledged, and the acknowledgement is recorded on the approval | R2 |

### Rule Administration as Configuration (JRN-03.1, JRN-04.2)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| List, create, edit, enable and disable rules and their parameters from an administrative surface | PER-03 | Epic 8 (F15, F14) | US-8.5 | JTBD-03.1: a rule parameter is changed and validation results reflect it with **0 code changes and 0 redeploys**; malformed configuration is rejected on save with a message naming what was invalid, and the prior rule set stays in effect | R2 |
| Preview the impact of a rule change, confirm it by revalidation, and have the change attributed | PER-03 | Epic 8 (F15, F12, F6) | US-8.6 | JTBD-03.2 / JTBD-04.4: affected shipments are indicated before the change is trusted, before/after exception sets are recorded, and 100% of rule changes appear in the audit trail under the administrator's name and timestamp | R2 |

### Demo Operations — Start, Reset, Pre-Flight (JRN-03.2)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Start and reset a demo-ready environment in one command / one action | PER-03 | Epic 10 (F22, F2) | US-10.4 | JTBD-03.4: single-command start on a deterministic port; one-action reset to pristine seeded state with no manual database intervention; **3 consecutive post-reset walkthroughs produce identical results** | R1 |
| Confirm database, seed data and AI-assist status in a single pre-flight check before presenting | PER-03 | Epic 10 (F22) | US-10.5 | JTBD-03.3: one health check reports database availability, seed presence and AI-assist status including fallback mode, before the audience is in the room | R2 |
| Accept cargo entries posted to a local ingestion endpoint under the same schema | PER-03 | Epic 0 (F1, F14) | US-0.3 | JTBD-03.4: posting an existing shipment ID updates rather than duplicates, and ingestion triggers validation automatically | R2 |

---
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
## Release Planning

### Release R1: The Demo Release — All Ten Steps, Live, and Every Governance Negative

**Theme:** the walkthrough runs end-to-end in front of PER-04 against seeded data, and every claim made
while it runs is enforced rather than narrated. R1 is scoped by one test: *if this story were absent, would
one of the ten steps fail, or would a governance claim be disprovable in the room?*

**Stories (74):**

| Lane | Stories |
|---|---|
| Step 0 — Foundation | US-0.1, US-0.2, US-0.4, US-0.5, US-8.1, US-8.2, US-8.3, US-9.1 |
| Step 1 — Exception Queue | US-11.1, US-9.2, US-9.4, US-1.1, US-1.2, US-1.3, US-1.4 |
| Step 2 — Open the shipment | US-11.2, US-9.5 |
| Step 3 — AI summary | US-11.3, US-2.1, US-2.2 |
| Step 4 — Rule and evidence | US-11.4, US-1.5, US-2.4, US-3.1, US-3.7, US-9.7 |
| Step 5 — Request the document | US-11.5, US-3.2, US-4.1 |
| Step 6 — Upload the document | US-11.6, US-4.2, US-4.5, US-4.4 |
| Step 7 — Revalidate | US-11.7, US-1.6, US-1.7, US-9.6 |
| Step 8 — Recommend clearance | US-11.8, US-5.1, US-2.5 |
| Step 9 — Supervisor approves | US-11.9, US-5.2, US-5.3, US-9.8 |
| Step 10 — Audit trail | US-11.10, US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6, US-9.9, US-7.1, US-7.2 |
| Governance negatives | US-3.6, US-8.4, US-12.1, US-12.2, US-12.3, US-12.4, US-12.5, US-12.6, US-12.7 |
| Proof by test | US-10.1, US-10.2, US-10.3 |
| Off-script resilience | US-11.11, US-2.3 |
| Unhappy path | US-4.3, US-3.4, US-3.5, US-3.3 |
| Shift start | US-9.3 |
| Demo operations | US-10.4 |

**Personas Served:** PER-01 (full JRN-01.1 and JRN-01.3, and JRN-01.2 except nothing — all stages served),
PER-02 (JRN-01.1 steps 9–10, JRN-02.2 in full, JRN-02.1 approve-path only), PER-03 (JRN-03.2 start/reset/verify),
PER-04 (JRN-04.1 in full, JRN-04.2 except the live rule change).

**JTBD Addressed:** JTBD-01.1, JTBD-01.2, JTBD-01.3, JTBD-01.4, JTBD-01.5, JTBD-01.6, JTBD-02.1,
JTBD-02.3, JTBD-02.4, JTBD-02.5, JTBD-03.4, JTBD-03.5, JTBD-04.1, JTBD-04.2, JTBD-04.3, JTBD-04.5
(16 of 21 fully; JTBD-02.2 partially — approve path only; JTBD-03.3 partially — fallback yes, health check in R2).

#### Four Primary Screens — First-Class Release 1 Deliverables

The PRD's stated failure mode is "UI treated as an afterthought behind a working API" (§8, risk 4). Each of
the four screens is therefore confirmed below as an R1 deliverable in its own right, not as a by-product of
the API stories.

| Screen | Feature | Delivering stories (all R1) | Backbone steps it carries | Confirmed |
|--------|---------|------------------------------|---------------------------|-----------|
| Screen 1 — **Cargo Exception Queue** | F17 | US-9.2, US-9.3, US-9.4, US-11.1, US-5.2, US-11.11 | Steps 1 and 9 (pending-approval filter) | ✅ R1 |
| Screen 2 — **Shipment Review** | F18 | US-9.5, US-9.6, US-11.2, US-11.3, US-2.1, US-4.5 | Steps 2, 3, 6 and 7 | ✅ R1 |
| Screen 3 — **Recommended Resolution** | F19 | US-9.7, US-9.8, US-11.4, US-2.4, US-3.1, US-3.7 | Steps 4, 5, 8 and 9 | ✅ R1 |
| Screen 4 — **Decision & Audit Record** | F20 | US-9.9, US-11.10, US-6.4, US-6.5, US-7.2 | Step 10 | ✅ R1 |
| Supporting — application shell, navigation, role switcher | F16 | US-9.1, US-8.1 | Frames all ten steps | ✅ R1 |

All four screens are in R1. No walkthrough step is delivered by an API-only path, and each screen has at
least one story whose acceptance criteria are stated in terms of what renders on it.

**Acceptance Gate:**
- [ ] All NaC for included stories pass
- [ ] 10 of 10 walkthrough steps complete end-to-end in the preview environment with zero manual data entry and zero developer intervention (PRD §7)
- [ ] All four primary screens are navigable in any order and each has loading, empty and error states
- [ ] The canonical solar-panel shipment flags all 3 expected exceptions on first ingestion
- [ ] After the simulated upload: exactly 1 exception resolved, 2 retained, round-trip <2s
- [ ] 0 shipments reach `CLEARED` without a recorded approving official distinct from the recommender
- [ ] 0 AI-initiated actions across a full session
- [ ] 100% of finalised decisions carry all 8 required audit fields; 0 finalisable with a field missing
- [ ] Self-approval, administrator adjudication and non-administrator rule editing are each rejected server-side **and recorded**
- [ ] The full walkthrough completes with the AI provider disabled, with the fallback labelled
- [ ] 3 consecutive post-reset walkthroughs produce identical results
- [ ] Test suite green across rule, workflow-transition, RBAC and audit-completeness claims plus the end-to-end ten-step run
- [ ] 0 instances of real or personally identifiable data in seed data, fixtures, logs or prompts

**Deliberate priority deviations in R1:** three P1 stories are pulled into R1 because the walkthrough
depends on them — US-7.1 and US-7.2 (steps 5, 9 and 10 each require a generated notification, displayed
inline and labelled "Generated, not transmitted") and US-10.4 (single-command start and one-action reset,
without which the walkthrough cannot be run or repeated).

---
### Release R2: The Full Evaluation Session — Adjudication Depth, Owned Policy, Pre-Flight

**Theme:** everything a real stakeholder session needs *after* the scripted ten steps have run. R2 closes
the two jobs R1 leaves partial (JTBD-02.2 rejection depth, JTBD-03.3 pre-flight) and delivers the one
question PER-04 asks that the walkthrough itself never answers — *who owns the rules after you leave?*

**Stories (6):** US-5.4, US-5.5, US-8.5, US-8.6, US-10.5, US-0.3

| Story | Why it is not in R1 | Journey it completes |
|---|---|---|
| US-5.4 Reject or return a recommendation with a reason | Step 9 of the walkthrough is an approval; rejection is off the backbone | JRN-02.1:Adjudicate #1 |
| US-5.5 Evidence-changed warning and acknowledgement | The canonical case is approved at the same evaluation version it was recommended at | JRN-02.1:Adjudicate #2 — approve |
| US-8.5 Manage business rules as configuration | Rules are already persisted configuration in R1 (US-0.1, US-1.4) and the rule endpoints are already RBAC-protected (US-12.6); the **editing surface** is not on the ten steps | JRN-03.1:Inspect / Attempt / Make the real change |
| US-8.6 Preview and audit the effect of a rule change | Depends on US-8.5 | JRN-03.1:Preview / Confirm / Verify attribution; JRN-04.2:Watch a policy change |
| US-10.5 Pre-demo health check | The walkthrough runs without it; it exists to protect the *presenter*, not the narrative | JRN-03.2:Pre-flight, Judge the degradation |
| US-0.3 Local ingestion endpoint | The walkthrough ingests from the seeded cargo-entry JSON file (US-0.2) | JRN-03.2 (re-ingestion), PRD F1 second interface |

**Personas Served:** PER-02 (JRN-02.1 in full), PER-03 (JRN-03.1 in full, JRN-03.2 in full),
PER-04 (JRN-04.2:Watch a policy change).

**JTBD Addressed:** JTBD-02.2 (completed), JTBD-03.1, JTBD-03.2, JTBD-03.3 (completed), JTBD-04.4.

**Acceptance Gate:**
- [ ] All NaC for included stories pass
- [ ] Release extends journey depth without breaking any of the ten backbone steps — the R1 end-to-end test still passes unchanged
- [ ] A rule parameter is changed live and the effect on validation is visible with 0 code changes and 0 redeploys
- [ ] 100% of malformed rule configurations are rejected on save with a message naming what was invalid, and the prior rule set remains in effect
- [ ] 100% of rule changes appear in the audit trail attributed to a named administrator with a timestamp
- [ ] A single health check reports database, seed data and AI-assist status including fallback mode
- [ ] Rejection returns the case to its author with a reason code and justification; exceptions remain `OPEN`

**Deliberate priority deviations in R2:** three P0 stories are held out of R1 — US-0.3, US-5.4 and US-5.5.
Each is P0 because its parent feature (F1, F11) is demo-critical, but none of the three is exercised by any
of the ten walkthrough steps or by any governance negative. They are sequenced second by the backbone rule
stated in the Overview, and the rationale is recorded here rather than left implicit. **Watch item:** until
R2 ships, PER-02's JTBD-02.2 is served on the approve path only — a supervisor who disagrees with a
recommendation has no in-product route to return it. If a stakeholder session is likely to probe
disagreement, US-5.4 should be pulled forward into R1.

---

### Release R3: Explicitly Out of Scope — Deliberately Empty

**Stories:** none. R3 exists to record that the remaining surface is a set of decisions, not a backlog.

| Excluded capability | Status | Recorded in |
|---|---|---|
| Live ACE integration | ⛔ Not deferred — excluded; simulated via cargo-entry JSON / local API (US-0.2, US-0.3) | PRD §5.8, PROJECT.md Constraints |
| A fourth exception type (valuation fraud, sanctions screening, tariff engineering) | ⛔ Excluded; exactly three types, asserted by US-12.7 | PRD §5.8 |
| Real importer/carrier data or any PII | ⛔ Excluded; synthetic only, asserted by US-0.4 and US-12.7 | PRD §5.8 |
| Production authentication (PIV/CAC, SSO) | ⛔ Excluded; simulated login (US-8.1) | PRD §5.8 |
| Real outbound email/SMS delivery | ⛔ Excluded; generated-not-transmitted (US-7.1, US-7.2, US-12.7) | PRD §5.8 |
| Machine-learning model training | ⛔ Excluded; request-time generation only (US-2.1, US-2.4) | PRD §5.8 |
| Mobile-native applications | ⛔ Excluded; responsive web only | PRD §5.8 |
| Multi-port / multi-tenant configuration | ⛔ Excluded; single-tenant, deterministic port (US-10.4) | PRD §5.8 |
| Screens beyond the four primary screens | ⛔ Excluded by constraint; F15 and F16 exist only to support the four | PRD §5.8, PROJECT.md |
| Autonomous clearance or any AI-initiated action | ⛔ Excluded by governance constraint; asserted by US-12.1, US-12.3 | PRD §5.8 |
| Background / async jobs, schedulers, queues, webhooks | ⛔ Excluded; all processing is request-time, asserted by US-12.1 | PRD §5.9 |

No story in `UserStories-CargoDemo.md` maps to any row above, which is the intended result: the exclusions
are enforced by the Epic 12 negatives rather than parked as future work.

---
## Coverage Analysis

### Persona Coverage

| Persona | R1 | R2 | R3 |
|---------|----|----|-----|
| **PER-01** Marisol Reyes (Cargo Specialist) | US-0.5, US-1.1, US-1.2, US-1.3, US-1.5, US-1.6, US-2.1, US-2.4, US-3.1, US-3.2, US-3.4, US-3.5, US-3.6, US-3.7, US-4.1, US-4.2, US-4.4, US-5.1, US-8.2, US-9.1, US-9.2, US-9.4, US-9.5, US-9.6, US-9.7, US-11.2, US-11.3, US-11.4, US-11.5, US-11.6, US-11.7, US-11.8 | — | — |
| **PER-02** Dwayne Okafor (Supervisor) | US-1.7, US-2.5, US-3.3, US-5.2, US-5.3, US-6.1, US-6.4, US-6.5, US-7.1, US-8.3, US-9.3, US-9.8, US-11.9, US-12.2, US-12.5 | US-5.4, US-5.5 | — |
| **PER-03** Priya Raghavan (System Administrator) | US-0.1, US-0.2, US-2.3, US-4.3, US-8.1, US-10.1, US-10.3, US-10.4, US-12.6 | US-0.3, US-8.5, US-8.6, US-10.5 | — |
| **PER-04** Angela Pruitt (observer, no account) | US-0.4, US-1.4, US-2.2, US-4.5, US-6.2, US-6.3, US-6.6, US-7.2, US-8.4, US-9.9, US-10.2, US-11.1, US-11.10, US-11.11, US-12.1, US-12.3, US-12.4, US-12.7 | — | — |

**Journey completeness per release:**

| Journey | R1 | R2 |
|---|---|---|
| JRN-01.1 The canonical 10-step walkthrough | ✅ complete (all 10 stages) | — |
| JRN-01.2 Shift start | ✅ complete (Arrive, Survey, Narrow, Choose, Re-enter) | — |
| JRN-01.3 Unhappy path — refused upload, escalation | ✅ complete | — |
| JRN-01.4 Defending a past decision | ✅ complete (Locate, Replay, Verify authorship, Answer) | — |
| JRN-02.1 The approval sweep | ⚠️ approve path and blocked-self-approval only | ✅ completed by US-5.4, US-5.5 |
| JRN-02.2 A clearance is challenged | ✅ complete (Retrieve → Hand it over) | — |
| JRN-03.1 Changing what gets flagged | ⚠️ boundary enforcement only (US-12.6) | ✅ completed by US-8.5, US-8.6 |
| JRN-03.2 Twenty minutes before the stakeholders arrive | ⚠️ Start, Reset, Verify, Hand over | ✅ completed by US-10.5 (Pre-flight, Judge the degradation) |
| JRN-04.1 Watching the ten steps | ✅ complete (all 8 stages) | — |
| JRN-04.2 Going off script | ⚠️ 5 of 6 stages | ✅ completed by US-8.5, US-8.6 (Watch a policy change) |

Every persona can complete at least one journey end-to-end in R1: PER-01 (JRN-01.1, JRN-01.2, JRN-01.3,
JRN-01.4), PER-02 (JRN-02.2 and steps 9–10 of JRN-01.1), PER-03 (JRN-03.2 less pre-flight), PER-04 (JRN-04.1).

### JTBD Coverage

| JTBD ID | Release | Stories | NaC Count |
|---------|---------|---------|-----------|
| JTBD-01.1 | R1 | US-9.2, US-9.3, US-9.4, US-11.1 | 4 |
| JTBD-01.2 | R1 | US-1.1, US-1.2, US-1.3, US-9.5, US-11.2, US-11.3 | 3 |
| JTBD-01.3 | R1 | US-1.4, US-1.5, US-2.1, US-2.4, US-11.4 | 4 |
| JTBD-01.4 | R1 | US-1.6, US-3.2, US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-9.6, US-11.5, US-11.6, US-11.7 | 5 |
| JTBD-01.5 | R1 | US-3.1, US-3.3, US-3.4, US-3.5, US-3.6, US-3.7, US-5.1, US-9.7, US-11.8, US-12.5 | 4 |
| JTBD-01.6 | R1 | US-6.1, US-6.3, US-6.4, US-12.4 | 2 |
| JTBD-02.1 | R1 | US-5.2, US-8.3 | 2 |
| JTBD-02.2 | R1 partial → R2 | US-1.7, US-2.5, US-9.8 (R1); US-5.4, US-5.5 (R2) | 5 |
| JTBD-02.3 | R1 | US-2.2, US-6.4 | 2 |
| JTBD-02.4 | R1 | US-5.3, US-8.4, US-11.9, US-12.2, US-12.3 | 4 |
| JTBD-02.5 | R1 | US-6.1, US-6.2, US-6.5, US-7.1, US-7.2, US-11.10 | 4 |
| JTBD-03.1 | R2 | US-8.5 | 1 |
| JTBD-03.2 | R2 | US-8.5, US-8.6 | 2 |
| JTBD-03.3 | R1 partial → R2 | US-2.3 (R1); US-10.5 (R2) | 2 |
| JTBD-03.4 | R1 partial → R2 | US-0.1, US-0.2, US-0.4, US-10.4 (R1); US-0.3 (R2) | 3 |
| JTBD-03.5 | R1 | US-0.5, US-8.1, US-8.2, US-12.6 (R1); US-8.6 (R2) | 3 |
| JTBD-04.1 | R1 | US-9.1, US-9.9, US-10.3, US-11.1–US-11.11, US-0.4 | 3 |
| JTBD-04.2 | R1 | US-9.7, US-12.1 | 2 |
| JTBD-04.3 | R1 | US-1.7, US-2.2, US-6.1, US-6.6, US-9.6, US-11.10 | 3 |
| JTBD-04.4 | R2 | US-8.5, US-8.6 | 1 |
| JTBD-04.5 | R1 | US-4.5, US-7.2, US-8.1, US-10.1, US-10.2, US-10.3, US-12.7 | 3 |

**All 21 jobs have at least one story and at least one NaC.** 16 are fully served in R1, 5 in R2
(JTBD-03.1, JTBD-03.2, JTBD-04.4 wholly; JTBD-02.2 and JTBD-03.3 completed there).

### Gap Analysis

**JTBD outcomes with no story:** none. All 21 jobs (JTBD-01.1 … JTBD-04.5) map to at least one story.

**Journey stages with no story coverage:** none. All 60 stages across the ten journeys map to at least one
story. Six stages are R2-only and are listed explicitly in the journey-completeness table above:
JRN-02.1:Adjudicate #1, JRN-02.1:Adjudicate #2 — approve (the evidence-changed sub-behaviour only),
JRN-03.1:Inspect the rule set / Attempt a malformed edit / Make the real change / Preview the impact /
Confirm by revalidation, JRN-03.2:Pre-flight and Judge the degradation (health-check half),
JRN-04.2:Watch a policy change.

**Orphan stories (not mapped to any journey stage or backbone lane):** **none — 0 of 80.** Every story in
`UserStories-CargoDemo.md` appears exactly once in the Story Map Matrix. Placement count reconciles:
8 + 7 + 2 + 3 + 6 + 3 + 4 + 4 + 3 + 4 + 10 (backbone, 54) + 9 + 3 + 2 + 4 + 1 + 3 + 2 + 2 (supporting, 26) = **80**.

**Personas without a journey mapped in a release:** none. PER-04 is an observer with no system account, so
her stories are observation and interrogation stories (US-11.1, US-11.10, US-11.11, US-12.x) delivered
through the four screens rather than through an account — she is served in R1 without ever logging in.

**Watch items rather than gaps:**

1. **JTBD-02.2 is partial in R1** (approve path only). A supervisor who disagrees with a recommendation has
   no in-product route to return it until US-5.4 ships. Pull US-5.4 forward if the session will probe
   disagreement. *(Recorded in R2's release notes.)*
2. **JTBD-04.4 lands entirely in R2.** The "who owns the rules after you leave" question — PER-04's
   procurement question, and the moment JRN-04.2 identifies as decisive — is not answerable in R1. R1
   proves rules are *configuration* (US-0.1, US-1.4) and that the rule endpoints are role-protected
   (US-12.6), but the live change in front of her requires US-8.5.
3. **Three P0 stories sit in R2** (US-0.3, US-5.4, US-5.5) and three P1 stories sit in R1 (US-7.1, US-7.2,
   US-10.4). Both deviations are deliberate consequences of using the walkthrough rather than priority as
   the release backbone, and both are recorded in the release notes above.
4. **Epic 12 has no journey of its own** by design — every negative story is anchored to the stage where a
   persona probes it (JRN-01.3:Escalate, JRN-02.1:Confirm the structure holds, JRN-03.1:Hit her own
   boundary, JRN-04.1:Probe for autonomy, JRN-04.2:Check the boundary). No negative is unobserved.

---
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
