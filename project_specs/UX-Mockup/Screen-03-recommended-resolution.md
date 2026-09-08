### Screen 3: Recommended Resolution

**Feature:** F19 · **Walkthrough steps:** 4, 8, 9 · **Route:** `/shipments/:shipmentId/resolution`
**Purpose:** Show why the shipment was flagged, what the machine advises, what the human may do — and make it impossible to read the machine as the decider.
**User Stories:** US-11.4, US-2.4, US-2.5, US-3.1, US-3.7, US-9.7, US-9.8, US-5.1, US-5.3, US-5.4, US-5.5, US-12.1, US-12.2, US-12.3, US-12.5
**Personas:** PER-01 (primary), PER-02 (primary), PER-03 (read-only), PER-04 (this is the screen she judges the product on)

This is the governance screen. Every claim CargoDemo makes about human authority is either legible here or nowhere.

#### Layout — Cargo Specialist, `IN_REVIEW` at v2 (walkthrough steps 4 and 8)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to Shipment Review                                    Steps 4 & 8 of 10 ⓘ    │
│ SHP-2026-0007 · Helios Grid Supply · ▷ In review · ▮▮▮▮ Critical · Evaluation v2     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ AUTHORITY CHAIN — how this shipment can reach Cleared                                 │
│                                                                                        │
│   ①  RECOMMEND              ②  SUPERVISOR APPROVAL         ③  CLEARED                 │
│      ▶ You are here            🔒 Not your authority          ⬤ Only reachable         │
│      Marisol Reyes                Supervisor role required      through step ②         │
│      (Cargo Specialist)           A supervisor other than                              │
│                                   you must approve.                                    │
│   ────────────────────────▶  ─────────────────────────────▶                            │
│                                                                                        │
│   Your role cannot set this shipment to Cleared. There is no action on this screen,   │
│   and no path anywhere in the application, that does so.                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │ ┌─────────────────────────────────────┐ │
│ │ ⚙ SYSTEM · EXCEPTIONS DETECTED (2 open) │ │ ╎✦ AI-GENERATED · ADVISORY            │ │
│ │─────────────────────────────────────────│ │ ╎  Recommended resolution             │ │
│ │ ⬡ ORIGIN CONFLICT        Sev: CRITICAL  │ │ ╎─────────────────────────────────────│ │
│ │ Triggering rule                         │ │ ╎AI suggests: Escalate to supervisor  │ │
│ │   Declared origin must match            │ │ ╎── a statement, not a selection      │ │
│ │   manufacturer address country          │ │ ╎                                     │ │
│ │   (rule-origin-manufacturer v2)         │ │ ╎Model confidence: MEDIUM             │ │
│ │ Authority / policy reference            │ │ ╎Basis: an open exception at CRITICAL │ │
│ │   19 CFR 134.1          [ View rule ]   │ │ ╎ severity is present, so the         │ │
│ │ Assertion                               │ │ ╎ deterministic derivation advises    │ │
│ │   Declared country of origin conflicts  │ │ ╎ supervisor authority; disposition   │ │
│ │   with the manufacturer's address       │ │ ╎ depends on judgment the model       │ │
│ │   country.                              │ │ ╎ cannot make.                        │ │
│ │ EVIDENCE                                │ │ ╎Contributing factors                 │ │
│ │   country_of_origin                     │ │ ╎ · 2 exceptions retained at v2       │ │
│ │     "Malaysia" → MY                     │ │ ╎ · 1 exception at CRITICAL severity  │ │
│ │   manufacturer.address.country          │ │ ╎ · shipment value above threshold    │ │
│ │     "China" → CN                        │ │ ╎Rationale                            │ │
│ │   documents.CERTIFICATE_OF_ORIGIN       │ │ ╎ The missing-document exception has  │ │
│ │     .stated_country "China" → CN        │ │ ╎ resolved. An origin conflict at     │ │
│ │   compare: MY ≠ CN                      │ │ ╎ CRITICAL severity remains open, so  │ │
│ │ MISSING INFORMATION  none               │ │ ╎ the advisory next step is to raise  │ │
│ │─────────────────────────────────────────│ │ ╎ the case to supervisor authority.   │ │
│ │ ⬡ INCOMPLETE HTS         Sev: HIGH      │ │ ╎─────────────────────────────────────│ │
│ │ Triggering rule                         │ │ ╎ⓘ Confidence describes the model's   │ │
│ │   HTS code completeness                 │ │ ╎  own certainty about its own        │ │
│ │   (rule-hts-completeness v3)            │ │ ╎  output. It confers no authority,   │ │
│ │ Authority / policy reference            │ │ ╎  carries no approval weight, and    │ │
│ │   19 CFR 152.11         [ View rule ]   │ │ ╎  does not change what you may do.   │ │
│ │ Assertion                               │ │ ╎─────────────────────────────────────│ │
│ │   HTS code has 6 digits; 10 expected.   │ │ ╎AI-generated · not a finding ·       │ │
│ │ EVIDENCE                                │ │ ╎no action has been taken             │ │
│ │   hts_code "8541.40" → 854140 (6)       │ │ ╎Provider: openai · Model: gpt-4o     │ │
│ │   rule.expected_digit_count = 10        │ │ ╎Mode: LIVE · 6 Sep 14:22:14 UTC      │ │
│ │ MISSING INFORMATION                     │ │ ╎Evidence inputs: 2 exceptions,       │ │
│ │   full 10-digit classification          │ │ ╎5 evidence rows, evaluation v2       │ │
│ └─────────────────────────────────────────┘ │ └─────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┃ GOVERNANCE NOTICE                                                                   │
│ ┃ The AI recommends. A named official decides. No action has been taken.              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 👤 YOUR DECISION — Marisol Reyes (Cargo Specialist)                                   │
│    Select one action. Nothing is pre-selected and nothing submits automatically.      │
│                                                                                        │
│  ○ Request additional information                                          AVAILABLE  │
│      Ask for a named document. Moves the case to Awaiting information.                │
│                                                                                        │
│  ○ Send for specialist review                              [ UNAVAILABLE 🔒 ]         │
│      The case is already in this state.                                                │
│                                                                                        │
│  ○ Recommend clearance                                                     AVAILABLE  │
│      ⚠ This creates a recommendation. It does not clear the shipment.                 │
│        A supervisor other than you must approve before the status can                 │
│        become Cleared. Your role can never set Cleared directly.                      │
│                                                                                        │
│  ○ Place on hold                                                           AVAILABLE  │
│      Park the case with a stated reason. Reversible.                                   │
│                                                                                        │
│  ○ Escalate to supervisor                                                  AVAILABLE  │
│      ⚠ Transfers authority. After escalating you will not be able to act              │
│        on this case; only a Supervisor will.                                           │
│                                                                                        │
│  ─────────────────────────────────────────────────────────────────────────────────────│
│  Justification (required)                                    0 / 40 minimum           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                                  │ │
│  │                                                                                  │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│  ⓘ Write your own reasoning. This text is recorded verbatim under your name and is    │
│    not prefilled from the AI rationale. A justification identical to the AI text      │
│    is rejected.                                                                        │
│                                                                                        │
│                                          [ Cancel ]   [ Submit decision ] (disabled)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### The `Recommend clearance` confirmation step (walkthrough step 8)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Confirm: recommend clearance                                                 [×] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┃ You are creating a RECOMMENDATION. This does not clear the shipment.          │
│ ┃ SHP-2026-0007 will move to Pending approval and will remain flagged until a   │
│ ┃ Supervisor other than you approves it.                                         │
│                                                                                  │
│ Exceptions proposed for clearance (2)                                           │
│   ⬡ Origin conflict     CRITICAL    — accepted on your stated basis             │
│   ⬡ Incomplete HTS      HIGH  — accepted on your stated basis                   │
│                                                                                  │
│ Resolution basis    ○ Exceptions resolved  ○ Exceptions accepted  ● Mixed        │
│                     ⓘ Mixed: at least one exception resolved by evidence and     │
│                       at least one accepted on judgment. Requires a 40-character │
│                       minimum justification.                                     │
│                                                                                  │
│ Outstanding document requests: none                                              │
│                                                                                  │
│ Your justification (recorded verbatim, under your name)                          │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ Certificate of origin received 6 Sep resolves the documentary gap. The       │ │
│ │ origin conflict is retained: the certificate states China, consistent with   │ │
│ │ the manufacturer address, and I read the Malaysia declaration as an entry    │ │
│ │ error rather than a misdeclaration given the consistent commercial docs.     │ │
│ │ The HTS is incomplete at 6 digits; classification to 10 does not change      │ │
│ │ admissibility for this commodity. Recommending clearance on that basis.      │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                              412 / 40 minimum ✔ │
│                                                                                  │
│ After submission: status → Pending approval · notification generated to the      │
│ Supervisor role · audit entry written · you will have no further action on this  │
│ case until a supervisor decides.                                                 │
│                                                                                  │
│                          [ Back ]      [ Submit recommendation ]                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Layout — Supervisor, `PENDING_APPROVAL` (walkthrough step 9)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SHP-2026-0007 · Helios Grid Supply · ◫ Pending approval · ▮▮▮▮ Critical · Evaluation v3    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ AUTHORITY CHAIN                                                                        │
│   ① RECOMMEND ✔ Marisol Reyes   ▶ ② SUPERVISOR APPROVAL — You are here                │
│                6 Sep 14:31 UTC       Dwayne Okafor (Supervisor)                        │
│                                      ▶ ③ CLEARED — reachable from your decision        │
│   ⓘ Approving makes you the recorded approving official on this clearance.             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚠ EVIDENCE CHANGED SINCE THIS RECOMMENDATION                                          │
│   The recommendation was made at evaluation v2. The current evaluation is v3.          │
│   [ Compare v2 → v3 ]                                                                  │
│   [ ] I have reviewed what changed and am deciding on the current evidence.            │
│       ⓘ Required. The approve and reject controls stay disabled until this is checked. │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 👤 PENDING RECOMMENDATION — human-authored                                             │
│    Recommended by   Marisol Reyes (Cargo Specialist)                                   │
│    Submitted        6 Sep 2026 14:31:07 UTC                                            │
│    Resolution basis MIXED                                                              │
│    Exceptions       ⬡ Origin conflict (CRITICAL)   ⬡ Incomplete HTS (HIGH)            │
│    Justification    "Certificate of origin received 6 Sep resolves the documentary     │
│                      gap. The origin conflict is retained: the certificate states      │
│                      China, consistent with the manufacturer address, and I read the   │
│                      Malaysia declaration as an entry error rather than a              │
│                      misdeclaration given the consistent commercial docs. The HTS is   │
│                      incomplete at 6 digits; classification to 10 does not change      │
│                      admissibility for this commodity. Recommending clearance on       │
│                      that basis."                            (verbatim, not truncated) │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚙ SYSTEM · EXCEPTIONS + EVIDENCE  (2 open, as at v3)          [ same cards as above ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ╎✦ AI-GENERATED · ADVISORY                                                            │
│ ╎ AI suggests: Escalate to supervisor · Model confidence: MEDIUM · basis stated        │
│ ╎ CONCURRENCE: the specialist's recommendation DIVERGED from the AI advice.            │
│ ╎ ⓘ Concurrence is recorded for transparency. It is not a quality signal and does      │
│ ╎   not strengthen the recommendation.                                                  │
│ ╎ AI-generated · not a finding · Provider: openai · gpt-4o · LIVE · 14:22:14 UTC       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┃ GOVERNANCE NOTICE                                                                   │
│ ┃ The AI recommends. A named official decides. No action has been taken.              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 👤 YOUR DECISION — Dwayne Okafor (Supervisor)                                          │
│                                                                                        │
│  APPROVAL DECISION                                                                     │
│  ○ Approve clearance      → status becomes CLEARED. You are recorded as the            │
│                             approving official. This is the only path to Cleared.      │
│  ○ Reject / return        → returns the case to Marisol Reyes in In review with your   │
│                             reason. Does not close the case.                            │
│  ○ Request more information → moves to Awaiting information.                            │
│                                                                                        │
│  Reject reason code (required for Reject)  ▾ Insufficient justification               │
│  Justification (required, 40 char minimum for Reject)                    0 / 40       │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  ─────────────────────────────────────────────────────────────────────────────────────│
│  THE FIVE WORKFLOW ACTIONS (also available to you)                                     │
│  ○ Request additional information   AVAILABLE (withdraws the recommendation)           │
│  ○ Send for specialist review       [ UNAVAILABLE 🔒 ] A clearance recommendation is   │
│                                       awaiting supervisor decision.                    │
│  ○ Recommend clearance              [ UNAVAILABLE 🔒 ] A clearance recommendation has  │
│                                       already been submitted.                          │
│  ○ Place on hold                    AVAILABLE (withdraws the recommendation)           │
│  ○ Escalate to supervisor           [ UNAVAILABLE 🔒 ] The case is already in this      │
│                                       state.                                            │
│                                                                                        │
│                              [ Cancel ]   [ Submit decision ] (disabled)              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Layout — Supervisor who is also the recommender (self-approval blocked)

```
│ 👤 YOUR DECISION — Ronald Pike (Supervisor, usr-sup-002)                               │
│                                                                                        │
│  ⚠ You submitted this recommendation and cannot decide on it.                          │
│    Authority for this case now sits with a different Supervisor. This is enforced      │
│    on the server; an attempt to bypass it is refused and recorded on the audit trail.  │
│                                                                                        │
│  ○ Approve clearance          [ UNAVAILABLE 🔒 ]                                       │
│      You submitted this recommendation and cannot decide on it.                        │
│  ○ Reject / return            [ UNAVAILABLE 🔒 ]                                       │
│      You submitted this recommendation and cannot decide on it.                        │
```

Note this panel renders for a **Supervisor** who authored the recommendation (F11 SoD-2). For a Cargo Specialist the approval controls are not rendered at all; the Authority Chain rail carries the boundary instead — see `00-overview.md` §Role → Surface Matrix for why.

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Authority Chain rail | Directly beneath the case header, above everything | The clearance boundary is the product's central claim; it is the first thing on the screen (P5) |
| Primary | Exception + triggering rule + policy reference + evidence | Left column, system band | *"`country_of_origin = Malaysia` against `manufacturer.address.country = China` — yes, that's a real conflict, and I can see it myself"* (JRN-01.1 step 4) |
| Primary | Governance notice | Fixed, between the AI block and the decision panel, every render, every role | The screen-level expression of "the AI never decides" |
| Primary | The five actions with availability and reasons | Decision panel | The operator learns the shape of their authority including its edges |
| Primary | Mandatory justification with live count | Decision panel | No decision without human-authored reasoning (US-12.5) |
| Primary (SUP) | Pending recommendation panel with the specialist justification **verbatim** | Above the decision panel | Everything Dwayne needs is on the decision screen with no navigation away |
| Secondary | AI recommendation, confidence, basis, factors, rationale | Right column, AI band | Advisory; read second |
| Secondary | Evidence-changed warning + acknowledgement | Above the pending panel when versions differ | US-5.5 |
| Secondary | Missing information per exception | Inside each exception card | What would resolve it |
| Tertiary | Concurrence verdict | Inside the AI band, after submission or on the SUP view | Recorded for transparency, explicitly not a quality signal |
| Tertiary | Confidence caption | Inside the AI band, beneath the confidence badge | Prevents confidence being read as authority (P3) |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading | Exception cards + decision panel skeletons at final size; AI block skeleton **inside the AI band with its label already rendered** | `aria-busy` per region |
| Ready, nothing selected | All five action cards unselected; submit disabled | *"Select one action."* |
| Action selected | Action-specific fields reveal beneath the selected card; other cards stay visible and unselected | — |
| No open exceptions | Exception block: *"No open exceptions"*; `Recommend clearance` remains available with an empty set | — |
| AI in offline fallback | AI block renders normally with the `OFFLINE FALLBACK` sub-chip; the recommended action is identical to the online path (`action_source: DETERMINISTIC`); shell banner active | Banner copy from Screen 0 |
| Justification too short | Inline field error + live count in red; submit stays disabled | *"40 characters minimum for this action. 12 entered."* |
| Justification copied from AI | Server rejects `JUSTIFICATION_NOT_AUTHORED`; inline error; **the entered text is preserved** | *"This justification matches the AI rationale. Write your own reasoning."* |
| Action unavailable (role) | `DisabledActionButton` with the reason in the layout | *"Your role (Cargo Specialist) cannot take this action."* |
| Action unavailable (state) | Same | *"The case is already in this state." / "A clearance recommendation is awaiting supervisor decision."* |
| Case escalated, acting as CS | All five disabled with the escalation reason; the case still fully readable | *"This case has been escalated; only a Supervisor can act on it."* |
| Recommendation already pending, acting as CS | Decision panel replaced by the read-only pending recommendation panel | *"A clearance recommendation has already been submitted. It is awaiting a Supervisor decision."* |
| Exception set stale | Banner + refetch; **the selection and the typed justification are preserved** | *"The evidence changed; review and resubmit."* |
| Evidence changed, unacknowledged | Approve/Reject disabled until the checkbox is set | *"Required. Review what changed before deciding."* |
| Audit completeness gate fails | Prominent error; no partial state | *"Clearance blocked: the audit record would be incomplete (approving_official)."* |
| Self-approval attempted | Inline error on the already-disabled control | *"You cannot approve your own recommendation."* |
| Submission in flight | Submit shows inline progress; all inputs locked; **no double-submit possible** | *"Recording decision…"* |
| Submitted | Confirmation panel: the recorded decision, the resulting status, the concurrence verdict, and a link to the audit record | *"Recorded. SHP-2026-0007 is now Pending approval. Your decision diverged from the AI advice."* |
| Case cleared | Whole panel replaced by a read-only disposition summary + audit link + read-only chip | *"Cleared 6 Sep 14:41 UTC. Approving official: Dwayne Okafor (Supervisor)."* |
| Acting as ADM | All controls disabled with the role reason; the screen remains fully readable | *"System Administrators do not adjudicate shipments."* |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| Five action cards | Radio group | Arrow keys move within the group; `Space` selects; nothing selected on arrival; unavailable cards are focusable but not selectable and announce their reason |
| Action-specific fields | Conditional reveal | Document types (`REQUEST_INFORMATION`), assignee (`SEND_FOR_SPECIALIST_REVIEW`), exception confirmation + `resolution_basis` + outstanding-request acknowledgement (`CLEAR_EXCEPTION`), `hold_reason` (`PLACE_ON_HOLD`), `escalation_reason` + optional target (`ESCALATE_TO_SUPERVISOR`) |
| `JustificationInput` | Textarea | Required-field styling, live character count against the action-specific minimum, inline error under the minimum. **Never prefilled. Never populated from the AI rationale.** |
| Submit decision | Primary button | Disabled until every required field is valid. `CLEAR_EXCEPTION` routes through the confirmation step first. Never auto-submits |
| Confirmation **Back** | Secondary | Returns to the decision panel with all input intact |
| Approve / Reject / Request more info | Radio group (SUP only) | Each with its own mandatory justification; Reject additionally requires a reason code and a 40-character minimum |
| Evidence-changed acknowledgement | Checkbox | Gates the approve/reject submit |
| Compare v2 → v3 | Link → in-frame drawer | Evaluation diff |
| View rule | Link per exception → in-frame drawer | Read-only rule detail with policy reference and parameters |
| Regenerate recommendation | Tertiary, inside the AI band | Re-requests the recommendation; causes no state transition; **never changes the operator's selection** |

#### Governance expression on this screen — the checklist

1. **Nothing is pre-selected, ever.** The AI recommendation must not set the initial radio state. It is rendered as the sentence *"AI suggests: Escalate to supervisor"* inside the AI band, next to the controls, never as a default (FRD F19 §Validation; US-12.1).
2. **All five actions render, always.** Filtering the list to only the available ones is a defect. Two closed actions with two stated reasons is the required output (US-3.7).
3. **Confidence is captioned.** The badge never appears without its basis sentence, and never without the fixed caption that it confers no authority (P3, US-2.4).
4. **`Clear exception` is titled `Recommend clearance` for a specialist** and carries a standing warning that it does not clear the shipment. The confirmation step restates it a second time before submission (US-5.1, US-12.3).
5. **The Authority Chain rail draws the boundary.** Step ② is marked *"Not your authority — Supervisor role required"* for specialists, with the explicit sentence that no action on this screen and no path in the application sets Cleared for her role.
6. **Approval is visibly separate from the five.** On the supervisor view the approval decision sits in its own block *above* the five workflow actions, so approval never reads as a sixth action in the same set.
7. **Self-approval is refused on screen and on the server, and the refusal is recorded.** The disabled control states the reason; the endpoint returns `403 SELF_APPROVAL_BLOCKED`; the attempt itself becomes an `ACCESS_DENIED` audit entry (US-12.2, F09a I10).
8. **Divergence from the AI is normal, not deviant.** No styling marks a non-concurring selection as unusual. The concurrence verdict is reported after the fact, in the AI band, with the caption that it is not a quality signal (US-2.5).
9. **Justification is human-authored or it is refused.** Server-side equality check against the AI rationale, surfaced inline, with the typed text preserved (US-12.5).
10. **Every rejected submission preserves input.** A live demo cannot afford retyping a 400-character justification (FRD F19 §Validation).

---
