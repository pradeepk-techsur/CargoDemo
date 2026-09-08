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
