---

## User Flows

### Flow 0: The Canonical 10-Step Walkthrough

**Trigger:** A presenter opens the preview URL cold in front of stakeholders (PER-04 Angela Pruitt observing).
**User Stories:** US-11.1 – US-11.10, US-11.11, US-9.1, US-9.2, US-9.5, US-9.6, US-9.7, US-9.8, US-9.9
**Journey:** JRN-01.1 · **PRD:** §3.2
**Personas:** PER-01 (steps 1–8) → PER-02 (step 9) → either (step 10)

This is the product's primary acceptance criterion, so it is also the primary UX criterion: it must be walkable by someone who has never been trained, with no step requiring a memorised click path. Every screen therefore names its own step, and every completed action confirms what was recorded and offers exactly one forward affordance.

```
                          [ Preview URL opens ]
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  ROLE GATE  /session         │
                    │  pick: Marisol Reyes (CS)    │
                    └──────────────┬───────────────┘
                                   ▼
  STEP 1 ─── /queue ─────────────────────────────────────────────────
    Exception Queue. SHP-2026-0007 row shows 3 chips + High priority.
                                   │  row click / Enter
                                   ▼
  STEP 2 ─── /shipments/SHP-2026-0007/review ────────────────────────
    Shipment panel + documents panel + validation results (3 open).
    ├── Evidence renders first (5 non-AI calls) ──▶ step 2 complete
    │
  STEP 3 ─── same screen, AI summary panel resolves ─────────────────
    AI band, labelled + attributed. Verifiable against panel below.
    ├── provider slow/offline ──▶ deterministic fallback, labelled
    │                             shell banner active; step 3 still
    │                             completes (US-2.3)
                                   │  "Go to Recommended Resolution"
                                   ▼
  STEP 4 ─── /shipments/SHP-2026-0007/resolution ────────────────────
    3 exception cards: rule + policy reference + evidence + missing
    info. AI recommendation with confidence + basis. Governance
    notice. Five actions, none pre-selected.
                                   │  select "Request additional information"
                                   ▼
  STEP 5 ─── in-frame dialog: Request additional information ────────
    Checkbox CERTIFICATE_OF_ORIGIN (from missing_information)
    + mandatory justification (min 10 chars)
    ├── justification < min ──▶ submit stays disabled, inline error
    └── submit ──▶ NEW → AWAITING_INFORMATION
                  confirmation: "Request dr-0007-coo recorded.
                  Audit entry + notification written."
                  forward affordance: "Back to Shipment Review"
                                   ▼
  STEP 6 ─── /shipments/.../review → documents panel ────────────────
    Outstanding request row now shows "Upload simulated document".
    ├── wrong file (archive renamed .pdf)
    │     ──▶ 422 FILE_CONTENT_MISMATCH, inline dialog error,
    │         NOTHING written, request stays OUTSTANDING (JRN-01.3)
    └── seeded fixture ──▶ accepted, provenance = SIMULATED_UPLOAD
                                   │  (same transaction)
                                   ▼
  STEP 7 ─── same screen, change-indication banner ──────────────────
    "Revalidated: 1 exception resolved, 2 retained, 0 new"
    Resolved card moves to "Resolved (1)" disclosure with a
    "Resolved by revalidation" marker. Two retained cards stay,
    evidence intact. AWAITING_INFORMATION → IN_REVIEW.
    AI summary + recommendation regenerate at v2.
                                   │  "Go to Recommended Resolution"
                                   ▼
  STEP 8 ─── /shipments/.../resolution ──────────────────────────────
    Authority Chain rail: [You: Recommend] → [Supervisor: Approve]
                          → [Cleared]  (step 2 marked not-your-authority)
    select "Recommend clearance"
    ├── confirmation step restates: 2 exceptions proposed,
    │   this creates a RECOMMENDATION not a clearance,
    │   a supervisor other than you must approve
    ├── justification < 40 chars (basis = MIXED) ──▶ submit disabled
    ├── justification == AI rationale ──▶ 422 JUSTIFICATION_NOT_AUTHORED
    │                                     inline, input preserved
    └── submit ──▶ IN_REVIEW → PENDING_APPROVAL
                  confirmation: recorded decision, new status,
                  concurrence verdict, link to audit record
                                   │
                    ══════ HANDOFF (structural) ══════
                    Marisol has no remaining action.
                    Header role switcher → Dwayne Okafor (SUP)
                    Deep link preserved: same case, new role, 2 clicks
                                   │
                                   ▼
  STEP 9 ─── /queue with "Pending approval only" ON ─────────────────
    Row carries "Awaiting your approval" marker for SUP.
                                   │  row click
                                   ▼
        /shipments/.../resolution — Pending recommendation panel
        recommender + time + basis + enumerated exceptions +
        Marisol's justification verbatim + AI rec with concurrence
    ├── evaluation version differs ──▶ evidence-changed warning,
    │     diff link, acknowledgement checkbox; submit disabled
    │     until checked (US-5.5)
    ├── acting user IS recommender ──▶ Approve/Reject disabled:
    │     "You submitted this recommendation and cannot decide on it"
    │     (server also returns 403 SELF_APPROVAL_BLOCKED and
    │      records the denial — US-12.2)
    ├── Reject ──▶ reason code + 40-char justification
    │              PENDING_APPROVAL → IN_REVIEW, returned to author
    └── Approve ──▶ own justification
                   SoD-1 + SoD-2 + 8-field audit gate pass
                   PENDING_APPROVAL → CLEARED
                   approving_official = Dwayne Okafor
                   confirmation + link to audit record
                                   │
                                   ▼
  STEP 10 ── /shipments/SHP-2026-0007/audit ─────────────────────────
    READ-ONLY · APPEND-ONLY chip. Disposition block naming the
    approving official. Completeness block: "12 events recorded.
    5 decisions, all 5 complete against the 8 required fields."
    Chronological timeline, authorship-banded, notifications inline.
    Export JSON · Print (in-frame). No edit or delete anywhere.
```

**Steps in UI terms:**

| Step | Screen | What the operator does | What the interface must make obvious | Story |
|---|---|---|---|---|
| 1 | Queue | Scans the list | The ugly case announces itself: three chips, High priority, oldest age — no clicking to discover severity | US-11.1, US-9.2, US-9.4 |
| 2 | Review | Clicks the row | The whole entry is on one screen; missing document reads as an explicit absence, not a gap | US-11.2, US-9.5 |
| 3 | Review | Reads the summary | This is machine prose: AI band, dashed border, provenance footer with provider, model, mode, timestamp | US-11.3, US-2.1, US-2.2 |
| 4 | Resolution | Reads rule + evidence | The evidence is the system's finding, rendered independently of the narrative, with the policy reference as visible authority | US-11.4, US-1.5, US-2.4 |
| 5 | Resolution → dialog | Requests the certificate | The request binds to the exception and the rule that requires it; justification is mandatory | US-11.5, US-3.2, US-4.1 |
| 6 | Review → documents | Uploads the fixture | Document type comes from the request, never from the file; provenance is marked | US-11.6, US-4.2, US-4.5 |
| 7 | Review | Reads the outcome | "1 resolved, 2 retained" — never a green tick, never a silent refresh | US-11.7, US-9.6, US-1.6 |
| 8 | Resolution | Recommends clearance | The action is titled *Recommend clearance*; the confirmation restates that this is not a clearance | US-11.8, US-5.1, US-12.3 |
| 9 | Queue → Resolution | Supervisor approves | The full advisory chain is on the decision screen with no navigation away; the approving official is the acting user | US-11.9, US-5.3, US-9.8 |
| 10 | Audit | Replays everything | Every event, attributed and banded; eight fields on every decision; zero verbs on the screen | US-11.10, US-6.1, US-6.4, US-9.9 |

**Out-of-order tolerance (US-11.11).** Angela will ask for a step out of sequence. Because case context is in the route and all three case-scoped screens are independently addressable and independently fetch their own data, any step can be entered directly. Steps that are not yet legal are not hidden — they render as disabled actions with the state reason (*"The case is already in this state"*, *"A clearance recommendation is awaiting supervisor decision"*). The interface answers "why can't you do that yet?" without the presenter having to.

**Demo Guide strip (shell-level UX addition, presentational only).**
A single-line collapsible strip immediately beneath the shell header, rendered only when a case context is set:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ⓘ Demo guide · Step 7 of 10 — Revalidate the shipment                     │
│   This case is IN_REVIEW at evaluation v2. Next in the walkthrough:        │
│   Step 8, Specialist recommends clearance (Recommended Resolution).        │
│   This guide describes where you are. It takes no action.        [collapse]│
└────────────────────────────────────────────────────────────────────────────┘
```

Rules: derived purely from `case.status`, the presence of a pending recommendation, and the evaluation version — it holds no state of its own. It never contains a button that performs a workflow action; the only control is collapse (persisted per session). It never claims a step is complete that the audit record does not show. **This is a UX addition beyond FRD F16's specified sub-features** and is presentational; it must not be implemented as a wizard that gates navigation.

---
