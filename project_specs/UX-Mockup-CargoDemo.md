# UX Mockup
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Based on** | JOURNEYS-CargoDemo.md, PRD-CargoDemo.md, PERSONAS-CargoDemo.md, UserStories (Y0 index), FRD F16–F20, F09a, F15 |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | Implementation plan, component library, verify-work link-graph check |

---

## Overview

CargoDemo's interface has one job that is unusual for a case-management tool: **it must make a governance argument visible on screen.** A CBP evaluator (PER-04 Angela Pruitt) will judge the product by watching two specialists use it, and she will conclude one of two things — either that the machine is advising a named human who decides, or that the machine is deciding and the human is clicking. The difference between those two conclusions is almost entirely a UX outcome. The backend enforcement (F09a, F11, F14) is necessary but invisible; this document specifies the visible half.

Four primary screens carry the product (PROJECT.md Constraints — *four screens only*):

| # | Screen | Feature | Walkthrough steps |
|---|--------|---------|-------------------|
| 1 | Cargo Exception Queue | F17 | 1 |
| 2 | Shipment Review | F18 | 2, 3, 5, 6, 7 |
| 3 | Recommended Resolution | F19 | 4, 8, 9 |
| 4 | Decision & Audit Record | F20 | 10 |

Plus two supporting surfaces that exist **only to support the four** and are never presented as product breadth: the application shell with role switcher (F16) and the administrator's Rule Administration surface (F15).

### Design principles

**P1 — Authorship is a first-class visual property, not a caption.**
Three kinds of content appear on these screens and they must be distinguishable across a conference room at a glance: **human-authored** decisions and justifications, **AI-generated** advisory prose, and **deterministic system output** (rule findings, evidence, status transitions). Each gets a distinct container, a distinct label, a distinct icon, and a distinct surface treatment. An AI summary must never be able to be screenshotted and mistaken for an official finding. See `Y0-patterns.md` §Authorship Banding.

**P2 — The evidence renders without the narrative.**
Every screen that shows AI prose also shows the underlying field-level evidence, sourced from the exception API rather than from the AI response (FRD F18 §Validation, F19 §Process step 2). The evidence panel is fully usable when the AI panel is absent, loading, or in offline fallback. Marisol can verify the machine's story against the machine's findings without leaving the screen (US-1.5, US-9.5, PER-01 success criteria).

**P3 — Confidence is reported, not deferred to.**
The confidence level is rendered inside the AI container, always with its stated basis, always accompanied by the fixed caption that confidence confers no authority. It is never a trust dial, never a percentage badge in a screen header, never colour-coded green-for-go. See `Y0-patterns.md` §Confidence Display (US-2.4, US-9.7).

**P4 — Unavailable is shown, never hidden.**
All five workflow actions are rendered on every visit to Recommended Resolution, in the same order, in the same place. Those the acting role or the current state forbids are rendered disabled **with the reason text visible in the layout** — not in a tooltip, not behind a hover, not omitted from the list (PRD §6 Usability; FRD F09a §5; US-3.7). A shortened action list is a defect: the operator must learn the shape of their own authority, including its edges.

**P5 — The clearance boundary is drawn on the screen, not just in the server.**
A specialist can never reach `CLEARED`. This is enforced by exactly one transition row (F09a T31) but it is *communicated* by a persistent **Authority Chain rail** on the Recommended Resolution screen showing `Recommend → Supervisor approval → Cleared`, with the specialist's own position marked and step 2 explicitly labelled as outside their authority. The specialist's clear action is titled **"Recommend clearance"**, never "Clear", and carries the standing sub-label that a supervisor other than them must approve. See `Screen-03-recommended-resolution.md` §Authority Chain (US-5.1, US-12.2, US-12.3).

**P6 — The audit record has no verbs.**
The Decision & Audit Record screen contains zero mutating affordances by construction (FRD F20 §Process step 8). No edit pencil, no delete, no inline editing, no context menu, no drag handle, no row-hover action tray. The only controls are read controls: filter, disclose, verify, export, print. A read-only header chip states the property in words (US-6.3, US-12.4).

**P7 — The demo must be navigable cold, by someone who has never seen it.**
The 10-step walkthrough is not a script the presenter memorises; it is a path the interface signposts. Every screen names its own place in the sequence, every completed action confirms what it recorded and offers the single next step, and a shell-level **Demo Guide** strip states which step the current case is at, derived from case status. The guide *describes*; it never acts (US-11.11).

**P8 — The frame is small and it is not a browser.**
The application is embedded in an iframe in a sandboxed preview. Nothing may depend on a top-level window: no popups, no `window.open`, no fullscreen API, no `window.confirm`/`window.alert`, no viewport-unit layouts that assume the visual viewport equals the frame. All overlays are in-frame, focus-trapped modals and drawers. See `Y1-responsive.md`.

**P9 — Nothing on screen should be mistakable for production.**
A persistent demo-mode chip, "Generated, not transmitted" on every notification, the simulated-login role gate, and the offline-fallback banner keep the simulation boundary explicit (PRD §8 risk; US-7.2, US-12.7).

---

## Navigation Map

The single source of truth for how every screen is **reached**.

| Screen | Route | Reached from | Nav element |
|--------|-------|--------------|-------------|
| Role Gate (simulated login) | `/session` | App load with no session | Automatic full-screen gate; no nav element (it precedes the shell) |
| Cargo Exception Queue | `/queue` | App shell (default landing route after session established) | Sidebar: **"Exception Queue"** (always enabled, all roles) |
| Shipment Review | `/shipments/:shipmentId/review` | Cargo Exception Queue | Row click / `Enter` on focused row; then Sidebar: **"Shipment Review"** (case-scoped, enabled once context set) |
| Recommended Resolution | `/shipments/:shipmentId/resolution` | Shipment Review | Primary button **"Go to Recommended Resolution"** in the review action bar; also Sidebar: **"Recommended Resolution"** (case-scoped) |
| Decision & Audit Record | `/shipments/:shipmentId/audit` | Recommended Resolution (post-submission confirmation link), Shipment Review (header link **"View audit record"**), Queue (row overflow **"Audit record"**) | Sidebar: **"Decision & Audit Record"** (case-scoped) |
| Audit Printable View | `/shipments/:shipmentId/audit/print` | Decision & Audit Record | Button **"Print / Save"** in the audit toolbar (renders in-frame, calls `window.print()`; **no new window**) |
| Notification List | `/notifications` | App shell header | Header bell icon → dropdown → **"View all notifications"** |
| Rule Administration (list) | `/admin/rules` | App shell (System Administrator role only) | Sidebar: **"Rule Administration"** (hidden for CS/SUP; route renders 403 view if reached by URL) |
| Rule Editor | `/admin/rules/:ruleId` | Rule Administration list | Row click / **"Edit rule"** button |
| Demo Environment & Reset | `/admin/environment` | App shell (System Administrator role only) | Sidebar: **"Environment & Reset"** (hidden for CS/SUP) |
| Rule Detail (read-only) | *no route — in-frame drawer* | Shipment Review, Recommended Resolution | Exception card link **"View triggering rule"** opens a focus-trapped side drawer over the current screen |
| 403 Forbidden view | *inline, any route* | Any route the acting role may not use | Rendered in the content region; navigation remains usable |
| 404 Not found view | *inline, any route* | Unknown `shipmentId` | Rendered in the content region with **"Back to queue"** link |

**Invariant — no orphan screens.** Every screen above has at least one inbound path traceable to the app shell. The three case-scoped screens trace to the shell through the Exception Queue, which is the shell's default landing route. The two administrator surfaces trace directly to the shell sidebar under the System Administrator role. The audit printable view and the read-only rule drawer trace to their parents. No screen is reachable only by typing a URL.

**Deep-link recovery.** Case context lives in the route (`:shipmentId`), so any case-scoped screen is restorable from its URL alone (FRD F16 §Terminology). This is a live-demo requirement: a mis-click must be recoverable in one step, and a role switch must be able to re-enter the same case as a different user in two clicks (FRD F16 §Process step 8).

---

## Role → Surface Matrix

What each role sees in the shell navigation. Hiding here is **presentational only**; the server denies regardless (FRD F16 §Process step 3, US-8.4).

| Surface | Cargo Specialist (PER-01) | Supervisor (PER-02) | System Administrator (PER-03) |
|---|---|---|---|
| Exception Queue | Visible | Visible (+ prominent *Pending approval only* toggle) | Visible, read-only |
| Shipment Review | Visible, actionable | Visible, actionable | Visible, all action controls disabled with reason *"System Administrators do not adjudicate shipments"* |
| Recommended Resolution | Visible; five actions with availability; **approve/reject not rendered as controls** — represented in the Authority Chain rail as *"Supervisor authority"* | Visible; five actions **plus** approve / reject / request-more-info panel | Visible read-only; all five actions disabled with role reason |
| Decision & Audit Record | Visible for cases in scope | Visible for all cases | Visible for all cases |
| Rule Administration | **Hidden** (read-only rule drawer still available from exception cards) | **Hidden** (read-only rule drawer available) | Visible, editable |
| Environment & Reset | **Hidden** | **Hidden** | Visible |

**Why approve/reject is not a disabled button for specialists.** Principle P4 says unavailable actions are shown disabled with a reason. Approval is deliberately treated differently, and the distinction is intentional rather than an exception to the rule: the **five workflow actions** are the specialist's action space and all five are always rendered, disabled-with-reason where closed. **Approval is not one of the five** (F09a T31 is a separate action, `APPROVE_CLEARANCE`). Rendering an "Approve" button to a specialist — even disabled — would misrepresent the action space as six-wide and invite the reading that approval is something she might one day be permitted to do on this case. Instead the authority itself is made visible: the Authority Chain rail states in words that step 2 belongs to the Supervisor role and that the specialist's recommendation cannot reach Cleared without it. FRD F19 §Validation ("approve/reject controls MUST be hidden from specialists entirely") is satisfied, and the governance requirement — *the boundary is visible in the UI, not just enforced server-side* — is satisfied more strongly than a greyed button would.

---

## Shared Visual Language

Defined once here, consumed by every screen chunk. Component contracts are FRD F16 §Shared component contracts.

| Token | Applies to | Treatment | Never |
|---|---|---|---|
| **Human band** | Decisions, justifications, actor attribution | Neutral surface, solid 3px left border, person glyph, label *"{Name} ({Role})"* | Wrapped around AI text |
| **AI band** | Summaries, recommendations, rationale, confidence | Tinted surface, **dashed** 3px left border, hatched header strip, sparkle glyph, header chip **`AI-GENERATED · ADVISORY`**, mandatory footer provenance line | Used for any human or system text; used without the header chip; used without the footer provenance |
| **System band** | Rule findings, evidence rows, status transitions, ingestion events | Plain bordered surface, tabular/label-value layout, gear glyph, label *"System finding — deterministic rule evaluation"* | Rendered in prose |
| **StatusBadge** | 7 statuses | Text label + distinct shape (`NEW` chip, `IN_REVIEW` chip, `AWAITING_INFORMATION` chip, `ON_HOLD` square, `ESCALATED` upward chevron, `PENDING_APPROVAL` outlined double-border, `CLEARED` filled + lock glyph) | Colour alone |
| **PriorityIndicator** | Critical / High / Medium / Low | Text label + rank glyph (`▮▮▮▮` / `▮▮▮` / `▮▮` / `▮`); derivation basis in an adjacent info disclosure | Colour alone; numeric score without label |
| **ExceptionTypeChip** | 3 types only | One chip per distinct type: `Origin conflict`, `Incomplete HTS`, `Missing document` | Collapsed to *"3 exceptions"* |
| **EvidenceRow** | Field-level evidence | `field_path` · raw value · normalized value · comparison pair, as labelled text | Prose |
| **DisabledActionButton** | Closed actions | Disabled styling + lock glyph + **visible** reason paragraph beneath | Tooltip-only reason; omission |
| **Read-only chip** | Audit screen, cleared cases | `READ-ONLY · APPEND-ONLY` | Adjacent to any mutating control |
| **Demo-mode chip** | Shell header, always | *"Demo — synthetic data, simulated login, notifications not transmitted"* | Dismissible |

### The canonical case used in all wireframes

Every wireframe in this document renders `SHP-2026-0007` — solar panels, importer Helios Grid Supply, derived priority **Critical**, declared origin Malaysia, manufacturer address in China, HTS `8541.40` against a 10-digit expectation, value $85,000 USD, `CERTIFICATE_OF_ORIGIN` missing. Three exceptions fire at evaluation v1; after the certificate upload and revalidation at v2, exactly one resolves and two are retained (JOURNEYS §Reading notes). Using one case throughout means the wireframes compose into a walkthrough rather than illustrating six unrelated states.
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
### Flow 1: Shift Start — Choosing What to Work Before Working Anything

**Trigger:** Marisol opens the app at the start of a shift with 20–40 flagged entries and no sense of priority.
**User Stories:** US-9.1, US-9.2, US-9.3, US-9.4, US-8.1, US-8.2
**Journey:** JRN-01.2 · **JTBD:** JTBD-01.1
**Persona:** PER-01

The success measure here is a *negative*: she must choose her next case in under 15 seconds **without opening any shipment she does not intend to work**. Every speculative open is a UX failure, so severity must be legible from the row.

```
[ App load ]
     │
     ▼
┌──────────────────────────────────────┐
│ ROLE GATE (full-screen, /session)    │
│ Seeded users listed with name + role │
│  ○ Marisol Reyes — Cargo Specialist  │
│  ○ Dwayne Okafor — Supervisor        │
│  ○ Priya Raghavan — Sys Administrator│
│ [ Enter as selected user ]           │
└──────────────┬───────────────────────┘
               │  session established
               ▼
      SURVEY  /queue  (default: no filters, priority:desc, age:desc)
               │
               ├── acting user chip visible in header at all times
               ├── admin nav absent entirely (role-aware nav)
               ├── multi-exception rows show one chip per type
               │
               ▼
      NARROW  filter Priority = High  +  sort Age desc
               │
               ├── applied filters render as removable chips built
               │   from the SERVER's `applied` block, not optimistic
               │   client state (US-9.3 determinism)
               ├── invalid filter in a restored URL ──▶ chip flagged
               │   invalid + INVALID_QUERY_PARAM surfaced + Clear filters
               │   (never silently unfiltered)
               ▼
      CHOOSE  SHP-2026-0007 — High, 3 chips, $85,000, oldest
               │  row click / Enter on focused row
               ▼
        /shipments/SHP-2026-0007/review   ──▶ Flow 0 begins at step 2
               │
               ▼
      RE-ENTER  later in the shift, back to /queue
               │
               └── refetch on window focus, after any mutating action
                   anywhere in the app, and on a 30s interval.
                   Her acted-on case shows AWAITING_INFORMATION and
                   drops out of her High/New filter without a reload.
```

**Steps:**

1. **Role gate.** Full-screen, before the shell renders. Not a dropdown in a corner — identity is a prerequisite, not a setting (FRD F16 §Process step 1). Each option shows the seeded user's **name and role together**, because the audit trail will name the person, not the role. Copy under the list: *"Simulated login. No PIV/CAC, no SSO. The selected identity is recorded on every action you take."* (US-8.1, US-12.7)
2. **Survey.** Queue renders in under 1s. Row scanning must answer *how bad is today* without a click: `ExceptionTypeChip` per distinct type (three chips on the canonical row, never "3 exceptions"), `PriorityIndicator` with text label plus rank glyph, `StatusBadge` with text plus shape, and Age in days from the oldest open exception (not case creation).
3. **Narrow.** Filters: status (7), exception type (3), priority (4), assignment (`any`/`me`/`unassigned`), and a `Pending approval only` toggle. Sorts: Priority, Age. All server-side; ties break on `shipment_id` ascending so ordering is byte-identical across demo runs (US-9.3, PRD §6 Determinism).
4. **Choose.** Row activation navigates and sets case context, enabling the three case-scoped sidebar entries.
5. **Re-enter.** The queue is the source of truth, not a report. State changes made on Review or Resolution are reflected on return without a manual refresh.

**Key moments:**

- **Decision point — Choose.** The entire value of F17 is realised or lost here. If severity requires a click to discover, the screen has failed regardless of how it looks (JRN-01.2 Key Moments).
- **Risk of abandonment — Survey.** A flat arrival-ordered list is indistinguishable from the spreadsheet she already has. Default sort must be `priority:desc,age:desc`, never insertion order.
- **Delight — Re-enter.** Seeing her own action reflected without a refresh establishes the queue as authoritative.

**Empty-state discrimination (three distinct states, never one generic message):**

| Condition | Copy | Control |
|---|---|---|
| No flagged shipments at all | "No shipments are currently flagged. Clean entries stay off this queue." | — |
| No shipments match the filters | "No shipments match these filters." | **Clear filters** |
| Load failure | "The queue could not be loaded." + error code as human copy + `request_id` | **Retry** |

---

### Flow 2: Supervisor Approval Sweep

**Trigger:** Dwayne checks in mid-morning and wants only the subset waiting on his signature.
**User Stories:** US-5.2, US-5.3, US-5.4, US-5.5, US-9.3, US-9.8, US-8.3, US-12.2
**Journey:** JRN-02.1 · **Persona:** PER-02

```
[ Role gate → Dwayne Okafor (Supervisor) ]
                    │
                    ▼
        /queue  — full team, all statuses
                    │
                    ├── PENDING_APPROVAL rows carry a persistent
                    │   "Awaiting your approval" marker (SUP view)
                    │   — visually distinct from every other status,
                    │     not merely a different badge colour
                    ▼
        toggle [✓] Pending approval only     ← prominent for SUP
                    │
                    ├── list shows recommender name + submission time
                    │   + enumerated exception set per row
                    ▼
        row click ──▶ /shipments/:id/resolution
                    │
                    ▼
    ┌───────────────────────────────────────────────────────────┐
    │ PENDING RECOMMENDATION PANEL (above the decision panel)   │
    │  recommender + role + submission time                     │
    │  resolution_basis (MIXED)                                 │
    │  enumerated exceptions with evidence                      │
    │  specialist justification — verbatim, human band          │
    │  AI recommendation — AI band, with concurrence verdict     │
    │  [evidence-changed warning if versions differ]            │
    └───────────────┬───────────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────────┬─────────────────────┐
     ▼              ▼                  ▼                     ▼
  APPROVE        REJECT        REQUEST MORE INFO      (self-approval)
  own just.      reason code   own justification      disabled control:
  ≥10 chars      + just.≥40    → AWAITING_INFO        "You submitted this
     │              │                                  recommendation and
     │              ▼                                  cannot decide on it"
     │        → IN_REVIEW,                             server: 403
     │        reassigned to                            SELF_APPROVAL_BLOCKED
     │        recommender,                             + denial recorded
     │        notification
     │        "Clearance recommendation returned"
     ▼
  SoD-1 (role is SUP) ✓
  SoD-2 (acting ≠ recommender) ✓
  G-AUDIT 8-field gate ✓ (non-null approving official)
     │
     ├── gate fails ──▶ prominent error:
     │   "Clearance blocked: the audit record would be
     │    incomplete ({field})."  No partial state.
     ▼
  → CLEARED · approving_official set · cleared_at set
    confirmation + link to /shipments/:id/audit
```

**Steps:**

1. **Isolate.** *Pending approval only* is a first-class toggle, not a status he has to read for. Approvals must never be hunted (PER-02 success criteria).
2. **Read the record.** Everything needed to decide is on one screen: exception, triggering rule with policy reference, evidence, AI advice with confidence, and the named specialist justification. **No navigation away** — this is the requirement that removes the day-long round trip (JRN-02.1 Delight Opportunity).
3. **Return, don't kill.** Reject requires a reason code plus a ≥40-character justification and returns the case to its author in `IN_REVIEW`. The copy on the reject confirmation says so explicitly: *"This returns the case to {recommender} for rework. It does not close the case."* (US-5.4)
4. **Acknowledge drift.** If the recommendation was made at v2 and the current evaluation is v3, the evidence-changed warning renders with a version-diff link and a required acknowledgement checkbox. Submit stays disabled until checked; the server rejects with `EVIDENCE_CHANGED_UNACKNOWLEDGED` if bypassed (US-5.5).
5. **Confirm the structure holds.** Opening a third case's audit record shows an `ACCESS_DENIED` entry with acting user, attempted action, case status, and reason `SELF_APPROVAL_BLOCKED`. *The difference between a blocked action and a recorded blocked action is the difference between a control and evidence of a control* (JRN-02.1 Key Moments; US-12.2).

---
### Flow 3: Document Request → Simulated Upload → Revalidation

**Trigger:** An open missing-document exception names `CERTIFICATE_OF_ORIGIN` in its missing information.
**User Stories:** US-3.2, US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-1.6, US-9.6, US-11.5, US-11.6, US-11.7
**Journeys:** JRN-01.1 steps 5–7, JRN-01.3 (unhappy path) · **Persona:** PER-01

This is the flow that decides whether Marisol ever trusts a revalidation result again. Two failure modes must be visibly impossible: a permissive upload that lets any file close any requirement, and a "paperwork complete = problem solved" reading.

```
       ┌─────────────────────────────────────────────────┐
       │ REQUEST  (Resolution screen, in-frame dialog)   │
       │ Document types are CHECKBOXES sourced from open │
       │ exceptions' missing_information — not free text │
       │  [✓] Certificate of origin                      │
       │  [ ] Other type ▸ requires justify_unlisted_    │
       │      document + justification ≥ 20 chars        │
       │  Justification (required, min 10) ──────────────│
       │  [ Cancel ]                    [ Submit request]│
       └────────────────┬────────────────────────────────┘
                        │
        ┌───────────────┼──────────────────────────┐
        ▼               ▼                          ▼
  justification    duplicate OUTSTANDING     type not in any
  too short        request for same type     missing_information
  submit stays     409 DUPLICATE_DOCUMENT_   422 DOCUMENT_TYPE_
  DISABLED,        REQUEST — dialog error    NOT_REQUIRED
  inline error     names the existing        with the accepted list
                   request
        │
        ▼  valid submit
  dr-0007-coo = OUTSTANDING · requester + timestamp recorded
  NEW → AWAITING_INFORMATION · audit entry + notification written
  confirmation: "Request recorded against this case."
  forward affordance: [ Back to Shipment Review ]
                        │
                        ▼
       ┌─────────────────────────────────────────────────┐
       │ UPLOAD  (Review screen, documents panel row)    │
       │ The "Upload simulated document" control exists  │
       │ ONLY on an OUTSTANDING request row. There is no │
       │ free-floating "attach a document" affordance.   │
       │                                                 │
       │ Document type: Certificate of origin            │
       │   ← taken from the REQUEST, never from the file │
       │   ← rendered as read-only text, not a selector  │
       │                                                 │
       │ ○ Seeded fixture: coo-shp-2026-0007.pdf         │
       │ ○ Choose a file…                                │
       │ [ Cancel ]                        [ Upload ]    │
       └────────────────┬────────────────────────────────┘
                        │
    ┌───────────────────┼──────────────────┬──────────────────┐
    ▼                   ▼                  ▼                  ▼
 UNSUPPORTED_        PAYLOAD_          FILE_CONTENT_      PII_SUSPECTED
 MEDIA_TYPE          TOO_LARGE         MISMATCH           inline error:
 "…accepted types:   size limit        "File content does  "This file appears
  PDF, PNG, JPEG"    named             not match its       to contain personal
                                       declared type"      data. Synthetic
                                                           fixtures only."
    └───────────────────┴──────────────────┴──────────────────┘
                        │
              ALL REJECTIONS ARE NON-DESTRUCTIVE:
              no document row, no revalidation, request stays
              OUTSTANDING, case stays AWAITING_INFORMATION.
              The dialog stays open with the reason inline —
              never a generic "upload failed" toast.
                        │
                        ▼  accepted
  document attached · provenance = SIMULATED_UPLOAD · uploader named
  request → FULFILLED · DOCUMENT_UPLOADED audit entry + notification
                        │
                        │  same transaction (US-4.4)
                        ▼
       ┌─────────────────────────────────────────────────┐
       │ REVALIDATION at evaluation v2                    │
       │ Change-indication banner, ABOVE the panels:      │
       │                                                  │
       │  ⟳ Revalidated at 14:22 UTC — evaluation v2      │
       │    1 exception resolved · 2 retained · 0 new     │
       │    [ Compare v1 → v2 ]                           │
       │                                                  │
       │ Missing-document card → RESOLVED_BY_REVALIDATION │
       │   moves into "Resolved (1)" disclosure carrying  │
       │   a "Resolved by revalidation" marker            │
       │ Origin-conflict card → RETAINED, evidence intact │
       │ Incomplete-HTS card → RETAINED, evidence intact  │
       │ AWAITING_INFORMATION → IN_REVIEW                 │
       │ AI summary + recommendation regenerate at v2     │
       └─────────────────────────────────────────────────┘
```

**Steps:**

1. **The request binds to the exception, not to an inbox.** The dialog's document-type list is derived from open exceptions' `missing_information`, so the request is traceable to the rule that requires it. Anyone opening the case later sees what was asked and why (JRN-01.1 step 5 Opportunity).
2. **The document type comes from the request.** On the upload dialog the type is read-only text, not a dropdown. A certificate requirement cannot be closed by a file labelled as something else — *"an upload flow that let any file satisfy any requirement would make the whole exercise theatre"* (JRN-01.1 step 6).
3. **Rejections name their reason and leave nothing behind.** All four rejection classes render inline in the open dialog with the specific reason and, where applicable, the accepted types. A refusal that names its reason and leaves no partial state is worth more to Marisol's confidence than a dozen happy-path steps (JRN-01.3 Key Moments; US-4.3).
4. **The revalidation result is a reconciliation, never a tick.** The banner counts resolved / retained / new. Resolved exceptions are *moved and marked*, never deleted. Retained exceptions keep their evidence in place. A silent refresh is a defect — visible reconciliation is the entire purpose of step 7 (FRD F18 §Validation; US-9.6).
5. **A document can make things worse, and the UI must permit that reading.** In JRN-01.3 the accepted certificate asserts China as the stated country: the missing-document exception resolves while the origin exception's evidence set *grows* to include `documents.CERTIFICATE_OF_ORIGIN.stated_country = "China"`. The retained origin card renders an **"Updated"** marker and the new evidence row appears alongside the original. Nothing anywhere says the shipment is now clean.

**Manual revalidate control.** A distinct **Revalidate** button in the Review action bar produces the identical change indication. Available whenever the case is not `CLEARED`; disabled with *"This shipment has been cleared and can no longer be changed"* when it is. This exists so Angela can ask for step 7 out of sequence and get it (US-11.11).

**State design for this flow:**

| State | Documents panel | Validation panel | Action bar |
|---|---|---|---|
| No request yet | `CERTIFICATE_OF_ORIGIN` row: state **Missing**, provenance —, no upload control | 3 open exception cards | Request additional information enabled |
| Request outstanding | Row: state **Requested**, requester + request time, **Upload simulated document** control | unchanged | Request additional information enabled (second type); duplicate blocked |
| Upload in flight | Row shows inline progress with the eventual layout reserved | unchanged (not optimistically cleared) | Controls disabled with *"Upload in progress"* |
| Upload rejected | Row unchanged, still **Requested** | unchanged | Dialog remains open with the reason |
| Upload accepted | Row: state **Received**, provenance **Uploaded this session**, uploader named, filename with download link | change banner + reconciled cards | Revalidate + Go to Resolution |

---

### Flow 4: Escalation — Authority Actually Leaves Her Hands

**Trigger:** After revalidation two exceptions still fire and the certificate contradicts the entry. Recommending clearance would be indefensible.
**User Stories:** US-3.5, US-3.7, US-3.6, US-12.6, US-2.5
**Journey:** JRN-01.3 stages 6–7 · **Persona:** PER-01 → PER-02

```
   /shipments/SHP-2026-0007/resolution  (IN_REVIEW, v2)
                    │
                    ▼
   AI recommendation block: "AI suggests: Escalate to supervisor"
   Model confidence: Medium · basis stated
   ── rendered as a STATEMENT, inside the AI band.
   ── NOT pre-selected. NOT highlighted as the default.
   ── The five action cards are all unselected on arrival.
                    │
   Marisol diverges from the machine. The screen treats this as
   normal: the governance notice says so, and no styling marks
   her choice as a deviation.
                    │
                    ▼
   select "Escalate to supervisor"
   ├── escalation_reason (required)
   ├── optional target supervisor
   ├── justification (required, min 10)
                    ▼
   submit ──▶ IN_REVIEW → ESCALATED
             audit entry + Supervisor-addressed notification
             confirmation states the CONCURRENCE VERDICT:
             "Your decision diverged from the AI recommendation.
              This is recorded."          (US-2.5)
                    │
                    ▼
   She reloads the same screen. Now:
   ┌────────────────────────────────────────────────────────────┐
   │ ⚑ This case has been escalated. Authority has transferred. │
   │                                                            │
   │ Request additional information   [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Send for specialist review       [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Recommend clearance              [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Place on hold                    [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Escalate to supervisor           [ UNAVAILABLE 🔒 ]        │
   │   The case is already in this state.                       │
   └────────────────────────────────────────────────────────────┘
   All five still rendered. All five explained. None hidden.
   If she calls the endpoint anyway: 403 ESCALATED_REQUIRES_
   SUPERVISOR and the denial is written to the audit trail (I10).
```

**Why this flow is a UX requirement and not just a server rule.** *"Discovering that escalation actually removes her ability to act tells her that the role boundaries elsewhere are probably real too"* (JRN-01.3 Delight Opportunity). The design consequence: after an escalation the five action cards must **re-render in place, still five, now closed, each with its reason** — not disappear, and not be replaced by a single "no actions available" message. The learning happens because the shape of her authority is drawn and then visibly redrawn.

---
### Flow 5: Retrieving and Defending a Decision Months Later

**Trigger:** A clearance is challenged weeks after the fact by someone who was not in the room.
**User Stories:** US-6.4, US-6.5, US-6.6, US-6.1, US-6.3, US-2.2, US-7.2, US-9.9, US-12.4
**Journeys:** JRN-01.4 (specialist defends her own call), JRN-02.2 (supervisor produces the record) · **Personas:** PER-01, PER-02, PER-04

```
        /queue
          │
          ├── filter Status = Cleared   (include_cleared = true)
          │     Cleared cases do NOT vanish from the working surface.
          │     If they did, she would assume the record is gone too
          │     and stop looking (JRN-01.4 Risk of Abandonment).
          │
          ├── row shows status CLEARED (filled badge + lock glyph)
          │     and the approving official's name
          │
          ▼  row overflow → "Audit record"   (or row click → Review → header link)
        /shipments/SHP-2026-0007/audit
          │
          ├── CASE HEADER
          │     shipment · importer · status CLEARED · priority
          │     DISPOSITION BLOCK:
          │       "Cleared 2026-09-08 14:41 UTC.
          │        Approving official: Dwayne Okafor (Supervisor).
          │        On the recommendation of: Marisol Reyes
          │        (Cargo Specialist)."
          │     ← the one-glance answer to "who cleared this and
          │       on whose recommendation"
          │
          ├── COMPLETENESS BLOCK
          │     "12 events recorded. 5 decisions, all 5 complete
          │      against the 8 required fields."
          │     ← the claim is shown on camera, not narrated
          │     ── if missing_fields is non-empty it renders as a
          │        PROMINENT FAILURE naming the entry and the field
          │
          ├── CHAIN VERIFICATION
          │     "Audit chain verified: 12 of 12 entries intact."
          │     ── on failure: red banner naming the first invalid
          │        sequence number; the timeline STILL renders
          │
          ▼
        TIMELINE — ascending sequence_no, identical on every load
          │
          ├── each entry banded by authorship:
          │     SYSTEM  ⚙  ingestion, flagging, revalidation
          │     AI      ✦  summary v1, recommendation v1/v2
          │     HUMAN   👤 request, upload, recommendation, approval
          │
          ├── VERIFY AUTHORSHIP (JRN-01.4 stage 3)
          │     "That paragraph wasn't mine — and it's labeled,
          │      so nobody can claim it was."
          │     Every AI entry carries provider, model, generation
          │     mode, timestamp, and evidence inputs.
          │     Every human entry carries acting user and role.
          │
          ├── filter bar: all / decisions only / AI outputs /
          │   system events / access denials
          │     ── filtering is PRESENTATIONAL; the underlying
          │        record is always complete
          │
          ▼
        HAND IT OVER — one action, complete record
          ├── [ Export JSON ]  → audit-SHP-2026-0007.json via blob
          │     download; contains every field of every entry
          │     plus the hash chain
          └── [ Print / Save ] → /shipments/:id/audit/print rendered
                IN-FRAME (full-bleed print-styled route), then
                window.print(). NO new window, NO popup, NO PDF
                toolchain. A "Back to record" link returns.
```

**Steps:**

1. **Locate.** Cleared cases remain retrievable and openable from the queue behind the `Cleared` status filter, with the approving official on the row. This is a deliberate deviation from "the queue is a work list": the default view excludes cleared cases, the filter restores them, and nothing is deleted from view (FRD F17 §Terminology, §Validation).
2. **Replay.** The timeline covers the whole case history — ingestion and flagging included, not only human decisions. Step 10's requirement is to replay *every* step (FRD F20 §Validation).
3. **Verify authorship.** Machine text quoted back at a human as though she had written it is a category of professional risk PER-01 has simply lived with. The authorship band plus explicit text label plus icon removes it permanently (JRN-01.4 Delight Opportunity; US-2.2).
4. **Read the eight fields.** Every decision entry renders all eight. A non-applicable field renders the explicit words **"Not applicable"** — never blank, never omitted. *The reader must never have to infer whether a field was empty or simply not shown* (FRD F20 §Validation; US-6.1).
5. **Check the notifications.** Each generated notification renders in a distinct sub-block **beside the decision that produced it**, with the fixed label *"Generated, not transmitted"*. Dwayne's line: *"Nobody is going to accuse us of having emailed an importer"* (JRN-02.2 stage 4; US-7.2).
6. **Hand it over.** One action produces the whole chronological attributed history. No assembly, no screenshot set (US-6.5).

**Read-only by construction (US-12.4, P6).** The screen registers no mutating handlers of any kind. Concretely, in UX terms:

- No icon buttons in entry headers or on hover. Entry cards have **no hover state that reveals controls**.
- No inline-editable fields anywhere, including justification text.
- No context menu; right-click is the browser default.
- No drag handles, no reorder, no checkbox multi-select with a bulk action bar.
- Justifications render **verbatim and in full** — never truncated with a "…more" that could be mistaken for an editor.
- A `READ-ONLY · APPEND-ONLY` chip renders in the toolbar, adjacent to the export controls and nothing else.
- The only controls: entry-class filter, evidence disclosure, **Verify chain**, **Export JSON**, **Print / Save**.

An F21 test asserts no `POST`/`PATCH`/`PUT`/`DELETE` originates from this route during a full render-and-interaction pass. The UX contract is that there is nothing on the screen that *could* originate one.

---

### Flow 6: Administrator Changes a Rule as Configuration

**Trigger:** Policy moves — the HTS completeness rule needs a different expected digit count.
**User Stories:** US-8.5, US-8.6, US-8.1, US-12.6, US-10.4, US-10.5
**Journey:** JRN-03.1 · **Persona:** PER-03

```
[ Role gate → Priya Raghavan (System Administrator) ]
                    │
   ── Sidebar now shows: Exception Queue (read-only),
      Rule Administration, Environment & Reset.
   ── Adjudication surfaces are still reachable but every
      action control renders DISABLED with the reason
      "System Administrators do not adjudicate shipments."
      (visible boundary, not a hidden menu — P4)
                    │
                    ▼
        /admin/rules
          │  rule list: type · severity · enabled · policy ref
          │             · version · open_exception_count
          ▼  row click
        /admin/rules/rule-hts-completeness
          │
          │  TYPE-AWARE FORM — selecting exception_type renders
          │  exactly the parameters that type accepts. No free-form
          │  JSON editing required; raw params_json shown read-only
          │  beneath for transparency.
          │
          ├── malformed edit: expected_digit_count = "ten"
          │     ──▶ 422 RULE_CONFIG_INVALID
          │         FIELD-LEVEL message naming the parameter.
          │         The prior rule set REMAINS IN EFFECT.
          │         Banner: "No changes were applied."
          │         (JRN-03.1 stage 2 — she must not discover a
          │          bad config through a broken queue at 9am)
          │
          ├── change_note (required, 10–500 chars)
          │
          ▼  [ Preview impact ]   ← always before [ Apply ]
        IMPACT PREVIEW PANEL (zero writes)
          │  evaluated_shipments: 14
          │  would add (0) · would remove (2) · priority changes (2)
          │  ┌──────────────┬──────────────────┬─────────────────┐
          │  │ SHP-2026-0007│ Incomplete HTS   │ would be removed│
          │  │ SHP-2026-0001│ Incomplete HTS   │ would be removed│
          │  └──────────────┴──────────────────┴─────────────────┘
          │  truncated at 100 entries if larger
          │  [ Back to editing ]   [ Apply with revalidation ]
          ▼
        APPLY
          │  version += 1 · rule cache invalidated
          │  RULE_UPDATED audit entry with the full before/after
          │  definition, the computed parameter diff, her identity,
          │  timestamp, and the change note
          │  revalidate_affected = true ──▶ each affected shipment
          │  gets a normal F6 run with trigger = RULE_CHANGE
          │  CLEARED cases are excluded and reported as
          │  skipped_cleared — a rule change can never disturb a
          │  cleared disposition (F09a I6)
          ▼
        RESULT PANEL
          "Rule saved at version 4. 2 shipments revalidated,
           2 exceptions resolved, 1 priority changed,
           1 cleared case skipped."
          [ View rule history ]   [ Back to Exception Queue ]
                    │
                    ▼
        /queue shows the reduced exception counts immediately —
        0 code changes, 0 redeploys (PRD §7 Rule configurability)
```

**Steps:**

1. **The rule set must read as data on first glance.** *"If this is a code listing dressed up as a screen, I'll know in five seconds"* (JRN-03.1 stage 1). The list is a table of configuration with a policy reference column, not a syntax-highlighted blob.
2. **Validation names the parameter.** Field-level messages, the accepted parameter list on an unknown key, and cross-field messages spelled out (*"min_digit_count cannot exceed expected_digit_count"*). A typo must never silently disable a check (FRD F15 §Validation).
3. **Preview before apply, always.** `Apply with revalidation` is not reachable without a successful preview render in the same session on the same draft. The preview performs zero writes.
4. **Rules are never deletable.** The list has no delete affordance. Disable is the retirement path, so the rule that produced a historical exception stays readable forever. Attempting `DELETE` returns `405 RULE_DELETE_NOT_SUPPORTED`; the UI simply has no such control (FRD F15 §Validation).
5. **Enable/disable gets its own confirmation.** It is the most consequential single-click change, so it carries its own copy: *"Disabling this rule stops it firing on future evaluations. Existing exceptions keep their evidence and their rule version."*
6. **Her own boundary is visible too.** She opens a shipment out of habit and every action is disabled with a stated reason. Her inability to adjudicate is as real and as legible as the specialist's inability to approve (PER-03 Goals; US-12.6).

---
## Screen Designs

### Screen 0: Application Shell, Navigation & Role Switcher

**Feature:** F16 · **Purpose:** The frame every screen lives in. It answers, permanently and without being asked: *who am I acting as, what may I reach, is this real, and is the AI working?*
**User Stories:** US-9.1, US-8.1, US-8.2, US-8.3, US-7.2, US-12.7
**Routes:** all
**Personas:** PER-01, PER-02, PER-03 (primary); PER-04 (observer)

#### Layout — signed-in shell (Cargo Specialist, case context set)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ CargoDemo  │ DEMO — synthetic data, simulated login, notifications not          │
│            │ transmitted                                    🔔 3  │ 👤 Marisol  │
│            │                                                      │ Reyes       │
│            │                                                      │ Cargo       │
│            │                                                      │ Specialist  │
│            │                                                      │ [Switch ▾]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ⓘ Demo guide · Step 4 of 10 — Display the triggering rule and evidence          │
│   This case is IN_REVIEW at evaluation v2. Next: Step 5, request a missing      │
│   document. This guide describes where you are. It takes no action.  [collapse] │
├───────────────────────────┬──────────────────────────────────────────────────────┤
│ NAVIGATION                │  MAIN  (skip-to-content target)                      │
│                           │                                                      │
│ ▸ Exception Queue         │  ┌────────────────────────────────────────────────┐ │
│                           │  │                                                │ │
│ CASE — SHP-2026-0007      │  │            routed screen content               │ │
│ ▸ Shipment Review     ◀── │  │                                                │ │
│ ▸ Recommended Resolution  │  │                                                │ │
│ ▸ Decision & Audit Record │  │                                                │ │
│                           │  └────────────────────────────────────────────────┘ │
│ ─────────────────────     │                                                      │
│ (Rule Administration and  │                                                      │
│  Environment & Reset are  │                                                      │
│  absent for this role)    │                                                      │
└───────────────────────────┴──────────────────────────────────────────────────────┘
```

#### Layout — no case context (queue landing)

```
│ NAVIGATION                │
│ ▸ Exception Queue     ◀── │
│                           │
│ CASE — none selected      │
│ ○ Shipment Review         │  ← disabled, reason text beneath the group:
│ ○ Recommended Resolution  │    "Select a shipment from the queue to open
│ ○ Decision & Audit Record │     these screens."
```

The three case-scoped entries are **disabled with a visible reason**, not hidden. This is the shell's own instance of principle P4 and it teaches the queue→case model in one glance.

#### Layout — role gate (`/session`, full-screen, precedes the shell)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                              CargoDemo                                           │
│                    Governed Cargo Exception Handling                             │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  Select an acting user                                                 │    │
│   │                                                                        │    │
│   │  ○  Marisol Reyes            Cargo Specialist        usr-cs-001        │    │
│   │     Works the exception queue. Cannot approve clearance or edit rules. │    │
│   │                                                                        │    │
│   │  ○  Dwayne Okafor            Supervisor              usr-sup-001       │    │
│   │     Approving official. Everything a specialist can do, plus approve   │    │
│   │     or reject clearance recommendations. Cannot edit rules.            │    │
│   │                                                                        │    │
│   │  ○  Priya Raghavan           System Administrator    usr-adm-001       │    │
│   │     Owns rules and configuration. Does not adjudicate shipments.       │    │
│   │                                                                        │    │
│   │  ○  Marcus Hale              Cargo Specialist        usr-cs-002        │    │
│   │     Second specialist, for hand-off and reassignment paths.            │    │
│   │                                                                        │    │
│   │  ○  Ronald Pike              Supervisor              usr-sup-002       │    │
│   │     Second supervisor, so a supervisor-authored recommendation still   │    │
│   │     has a distinct approver (F11 SoD-2).                               │    │
│   │                                                                        │    │
│   │                                        [ Enter as selected user ]      │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   Simulated login. No PIV/CAC, no SSO. The selected identity is recorded on      │
│   every action you take and appears by name on the audit record.                 │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

All **five seeded users** are listed (FRD F14 §Process step 1, F2 §Seeded users): the three roles, plus a second specialist and a second supervisor so hand-off and supervisor-authored-recommendation paths are demonstrable. Every option states its **authority and its limits in the same breath.** This is where the separation-of-duties story starts: an evaluator reads the three role descriptions before a single shipment is opened.

#### Layout — role switcher (in-frame drawer, from the header)

```
┌─────────────────────────────────────────────────┐
│ Switch acting user                          [×] │
├─────────────────────────────────────────────────┤
│ You are currently: Marisol Reyes                │
│                    (Cargo Specialist)           │
│                                                 │
│ Switching ends this session and starts a new    │
│ one. You will return to SHP-2026-0007 as the    │
│ new user, so the same case can be viewed from   │
│ a different role.                               │
│                                                 │
│  ○ Dwayne Okafor   Supervisor                   │
│  ○ Priya Raghavan  System Administrator         │
│  ○ Marcus Hale     Cargo Specialist             │
│  ○ Ronald Pike     Supervisor                   │
│                                                 │
│           [ Cancel ]   [ Switch and continue ]  │
└─────────────────────────────────────────────────┘
```

Two clicks from any case-scoped screen to the same case as a different role — the specialist→supervisor handoff at walkthrough step 8→9 must not cost the presenter more than that (FRD F16 §Process step 8).

#### Layout — banners (stack in this fixed order, beneath the header, above the Demo Guide)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ⚠ SUBSYSTEM DEGRADED — database: ok · seed data: ok · AI assist: unreachable    │  ← health check failure
├──────────────────────────────────────────────────────────────────────────────────┤
│ ✦ AI assistance is running in offline fallback mode. Summaries and              │  ← non-dismissible while
│   recommendations are generated deterministically from the recorded evidence.   │    the condition holds
├──────────────────────────────────────────────────────────────────────────────────┤
│ ✕ The server could not be reached.                              [ Retry ]       │  ← navigation stays usable
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement | Why |
|---|---|---|---|
| Primary | Acting user name + role | Header, right, always | Every screen must display them; a screen rendering without them is a defect (FRD F16 §Validation) |
| Primary | Demo-mode chip | Header, centre-left, never dismissible | The simulation boundary must be explicit at all times (PRD §8) |
| Primary | Primary navigation with active-route highlight | Left rail | Orientation across the four screens |
| Primary | AI-fallback banner when active | Directly beneath the header | An unlabelled fallback would make the AI claims unverifiable |
| Secondary | Notification indicator with unread count | Header, right of the demo chip | `aria-live="polite"`; access to the in-app list |
| Secondary | Case context label (`CASE — SHP-2026-0007`) | Nav rail group header | Confirms which case the three case-scoped screens refer to |
| Secondary | Demo Guide strip | Beneath banners, collapsible | Walkthrough navigability without training (P7) |
| Tertiary | Health-degraded banner | Top of the banner stack | Pre-demo signal for PER-03 |
| Tertiary | Skip-to-content link | Visually hidden until focused | Accessibility |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Unauthenticated | Full-screen role gate; shell not rendered | *"Select an acting user"* |
| Session establishing | Gate button shows inline progress; option list disabled | *"Starting session…"* |
| Ready | Full shell with active-route highlight | — |
| Loading (routed view) | Skeleton **matching the eventual layout**, reserving its space — never a centred spinner that reflows on arrival | Region labelled *"Loading…"* via `aria-busy` |
| Empty (routed view) | Explanatory text **plus the action that would populate it** | e.g. *"Select a shipment from the queue"* |
| Error (routed view) | Error code translated to human copy + `request_id` + **Retry**; navigation stays usable; no stack traces | *"The queue could not be loaded. Reference: req_8f3c1a."* |
| Session invalidated mid-demo | Toast, then role gate, **deep link preserved** | *"Your session ended. Sign in again to return to SHP-2026-0007."* |
| Forbidden route | Inline 403 view naming the acting role and the required role | *"Rule Administration requires the System Administrator role. You are acting as Cargo Specialist."* |
| Unknown shipment in URL | Inline 404 with **Back to queue** | *"SHP-9999-9999 was not found."* |
| AI in fallback | Persistent non-dismissible banner | see banner copy above |
| Case changed by another user | Toast + automatic refetch, never a silent overwrite | *"This case changed; reloading."* |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| Sidebar: Exception Queue | Nav link | → `/queue`; clears case context |
| Sidebar: Shipment Review / Recommended Resolution / Decision & Audit Record | Nav links, case-scoped | → the corresponding case route; disabled with a group-level reason when no case is selected |
| Sidebar: Rule Administration | Nav link, ADM only | → `/admin/rules`; absent for CS/SUP |
| Sidebar: Environment & Reset | Nav link, ADM only | → `/admin/environment`; absent for CS/SUP |
| Acting user chip | Display + trigger | Opens the role-switcher drawer; never a bare dropdown that could switch identity by accident |
| Switch and continue | Destructive-ish CTA | Confirms, `DELETE` then `POST /api/session`, clears client caches, returns to the queue with the previous shipment as a deep link |
| Notification bell | Trigger + badge | Opens an in-frame dropdown of recent notifications, each stamped *"Generated, not transmitted"*; footer link **View all notifications** → `/notifications` |
| Banner **Retry** | Secondary button | Re-issues the failed fetch; never reloads the frame |
| Demo Guide **collapse** | Toggle | Session-persisted; the guide never gates navigation |
| Skip to content | Hidden link | First tab stop; jumps to `<main>` |

#### Governance expression on this screen

- The acting identity is never ambiguous, so no audit entry can ever be disputed as "someone at that desk".
- Administrator surfaces are hidden from CS/SUP navigation **and** the routes render a 403 view if typed — hiding is presentational, the server denies regardless (US-8.4).
- The demo-mode chip and the "generated, not transmitted" notification labelling are not dismissible. Angela must never mistake the demo for production (PER-04 success criteria).
- The AI-fallback banner is non-dismissible while the condition holds, so a fallback-mode summary can never be presented as a live model output (US-2.3).

---
### Screen 1: Cargo Exception Queue

**Feature:** F17 · **Walkthrough step:** 1 · **Route:** `/queue`
**Purpose:** Establish a defensible order of work and open the next case — without opening any shipment the operator does not intend to work.
**User Stories:** US-9.2, US-9.3, US-9.4, US-11.1, US-11.11, US-5.2
**Personas:** PER-01 (primary), PER-02 (primary, pending-approval view), PER-03 (read-only)

#### Layout — Cargo Specialist view

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Cargo Exception Queue                                          Step 1 of 10 ⓘ           │
│ 8 flagged shipments · showing 8                                                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS   Status ▾   Exception type ▾   Priority ▾   Assignment ▾   [ ] Pending approval │
│ SORT      Priority ▾ (desc)   Age ▾ (desc)                                               │
│ APPLIED   ⊗ Priority: High    ⊗ Status: New, In review          [ Clear all filters ]   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ Shipment ID   │ Importer          │ Exception(s)          │ Priority │ Status      │ Age │
│───────────────┼───────────────────┼───────────────────────┼──────────┼─────────────┼─────│
│ SHP-2026-0007 │ Helios Grid Supply│ ⬡Origin conflict      │ ▮▮▮▮ Crit │ ⬡ New       │ 6d │
│               │                   │ ⬡Incomplete HTS       │          │             │     │
│               │                   │ ⬡Missing document     │          │             │     │
│───────────────┼───────────────────┼───────────────────────┼──────────┼─────────────┼─────│
│ SHP-2026-0001 │ Northgate Textiles│ ⬡Incomplete HTS       │ ▮▮▮ High │ ▷ In review │ 5d  │
│───────────────┼───────────────────┼───────────────────────┼──────────┼─────────────┼─────│
│ SHP-2026-0004 │ Cardinal Machine  │ ⬡Missing document     │ ▮▮ Med   │ ⧗ Awaiting  │ 4d  │
│               │ Works             │                       │          │ information │     │
│               │                   │                       │          │ Awaiting    │     │
│               │                   │                       │          │ supervisor: no    │
│───────────────┼───────────────────┼───────────────────────┼──────────┼─────────────┼─────│
│ SHP-2026-0012 │ Blue Ridge Foods  │ ⬡Origin conflict      │ ▮▮ Med   │ ◫ Pending   │ 3d  │
│               │                   │                       │          │ approval    │     │
│               │                   │                       │          │ ⇧ Awaiting  │     │
│               │                   │                       │          │ supervisor  │     │
│───────────────┼───────────────────┼───────────────────────┼──────────┼─────────────┼─────│
│ SHP-2026-0003 │ Summit Auto Parts │ ⬡Incomplete HTS       │ ▮ Low    │ ⏸ On hold   │ 9d  │
│───────────────┴───────────────────┴───────────────────────┴──────────┴─────────────┴─────│
│                                                            ‹ Prev   Page 1 of 1   Next › │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Row-level detail on hover/focus (no action controls — see §Prohibitions): an overflow menu offering **Audit record** only, because it is a read navigation, not a decision.

#### Layout — Supervisor view with `Pending approval only` engaged

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Cargo Exception Queue — all specialists                                                  │
│ 2 shipments awaiting your approval                                                       │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS   Status ▾  Exception type ▾  Priority ▾  Assignment ▾  [✓] PENDING APPROVAL ONLY│
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ Shipment ID   │ Importer   │ Exception(s)      │ Pri.  │ Status          │ Recommended by │
│───────────────┼────────────┼───────────────────┼───────┼─────────────────┼────────────────│
│ ╔═══════════════════════════════════════════════════════════════════════════════════════╗│
│ ║SHP-2026-0007│ Helios Grid│ ⬡Origin conflict  │▮▮▮▮Cr │ ◫ Pending       │ Marisol Reyes ║│
│ ║             │ Supply     │ ⬡Incomplete HTS   │       │ approval        │ 6 Sep 14:31 UTC║│
│ ║             │            │                   │       │ ⇧ AWAITING YOUR │ basis: MIXED   ║│
│ ║             │            │                   │       │   APPROVAL      │                ║│
│ ╚═══════════════════════════════════════════════════════════════════════════════════════╝│
│ ╔═══════════════════════════════════════════════════════════════════════════════════════╗│
│ ║SHP-2026-0012│ Blue Ridge │ ⬡Origin conflict  │▮▮ Med│ ◫ Pending       │ Marisol Reyes  ║│
│ ║             │ Foods      │                   │       │ approval        │ 6 Sep 09:12 UTC║│
│ ║             │            │                   │       │ ⇧ AWAITING YOUR │ basis:          ║│
│ ║             │            │                   │       │   APPROVAL      │ EXCEPTIONS_    ║│
│ ║             │            │                   │       │                 │ ACCEPTED       ║│
│ ╚═══════════════════════════════════════════════════════════════════════════════════════╝│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Pending-approval rows carry a **double-border container plus the explicit words "AWAITING YOUR APPROVAL"** — a structural distinction, not a tint. *"If pending work is buried among new exceptions, Dwayne reverts to being told about approvals informally, and the chain becomes procedural again"* (JRN-02.1 Risk of Abandonment). For specialists the same row reads **"Awaiting supervisor"** instead, so a specialist can see her own recommendation is in flight without seeing an approval affordance.

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Priority (label + rank glyph) | Column 4, sorted default desc | Answers "is anything screaming?" |
| Primary | Exception chips — **one per distinct type** | Column 3 | Multi-exception shipments must be self-identifying; a $85,000 three-problem shipment must not look like a single-issue one (JRN-01.1 step 1 Pain Point) |
| Primary | Status (label + shape) | Column 5 | Distinguishes "review this" from "chase this" |
| Primary | Shipment ID | Column 1, monospace | The handle used in every conversation about the case |
| Secondary | Importer | Column 2 | Identity/recognition |
| Secondary | Age in days from oldest open exception | Column 6 | *"Old and high-priority first"*; age of the **problem**, not of the paperwork |
| Secondary | Recommended by + submission time + basis | Supervisor view only | Everything needed to prioritise the approval sweep |
| Secondary | Applied-filter chips, from the server's `applied` block | Above the table | The UI always shows the **server's** interpretation, never optimistic client state |
| Tertiary | Assigned to | Column 7 (specialist view, collapsible) | Workload read for PER-02 |
| Tertiary | Shipment value | Available as a sort field; shown in a row disclosure | Consequence signal without widening the table past the iframe |
| Tertiary | Result count + pagination | Header and footer | Orientation |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading | Skeleton table with the real column headers and 8 placeholder rows at final row height — no reflow on arrival | `aria-busy="true"` on the table region |
| Ready | Table as above | Result count in the header |
| Empty — nothing flagged | Illustration-free panel | *"No shipments are currently flagged. Clean entries stay off this queue."* |
| Empty — no filter matches | Panel + **Clear filters** | *"No shipments match these filters."* |
| Error — fetch failed | Error panel + **Retry** + `request_id` | *"The queue could not be loaded. Reference: req_8f3c1a."* |
| Error — invalid restored filter | Offending filter chip flagged invalid; table shows the **error panel, not unfiltered data**; **Clear filters** offered | *"Priority value 'urgent' is not recognised. Accepted: Critical, High, Medium, Low."* |
| Refreshing (focus / post-action / 30s poll) | Subtle top-edge progress line; **existing rows stay in place** | Row-level change flash on updated rows, announced via `aria-live` |
| Row target reset mid-demo | Navigation shows the inline 404; the queue refetches behind it | *"SHP-2026-0007 was not found. It may have been reset."* |
| Session expired during polling | Toast, then role gate | *"Your session ended."* |
| Cleared case shown (filter engaged) | `CLEARED` badge (filled + lock glyph); approving official rendered in the Status cell | Row is openable; no action affordance |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| Table row | Selectable region | Click or `Enter`/`Space` on the focused row → `/shipments/{id}/review`, sets case context. Visible focus ring on the row, not only on an inner link |
| Status / Exception type / Priority filters | Multi-select popovers | Server-side; each selection re-issues `GET /api/queue` and re-renders `applied` chips |
| Assignment filter | Segmented control `any / me / unassigned` | `me` resolves to the acting user |
| Pending approval only | Toggle | Prominent for SUP, available to CS (shows her own in-flight recommendations) |
| Priority / Age sort | Sort controls | Server-side; ties break on `shipment_id` asc so ordering is identical across reloads and demo runs |
| Applied-filter chip `⊗` | Remove | Drops that one filter |
| Clear all filters | Secondary button | Resets to defaults |
| Row overflow → **Audit record** | Nav link | → `/shipments/{id}/audit`. A read navigation only |
| Pagination | Prev / Next | `page_size` default 25, max 100 |

#### Prohibitions (design-level, from FRD F17 §Validation)

- **No action controls on this screen at all.** No approve button, no clear button, no bulk-select with an action bar, no inline status editor. All decisions happen on Review/Resolution so the queue can never become a place where a shipment is dispositioned without its evidence being read. The row overflow contains navigation only.
- **No collapsing of multi-exception rows.** Three chips, never "3 exceptions". The canonical row must show three distinct chips.
- **No default inclusion of clean or cleared shipments.** `SHP-2026-0011` (the clean seeded shipment) must not appear by default — that absence is the visible proof that clean entries stay off the queue.
- **No colour-only encoding** of priority or status; every badge carries its text label.
- **No client-side sort** — determinism is a demo requirement, and two demo runs must produce byte-identical row order.

#### Performance & determinism

Queue load < 1s against the seeded dataset (PRD §6). The loading skeleton must reserve final row height so a presenter cannot mis-click a row that moves under the cursor — a live demo cannot afford reflow (FRD F16 §Validation).

---
### Screen 2: Shipment Review

**Feature:** F18 · **Walkthrough steps:** 2, 3, 5, 6, 7 · **Route:** `/shipments/:shipmentId/review`
**Purpose:** Establish the whole case on one screen, and let a first-time specialist state *why* this shipment was flagged in under 30 seconds without leaving it.
**User Stories:** US-9.5, US-9.6, US-2.1, US-2.2, US-4.5, US-1.5, US-11.2, US-11.3, US-11.6, US-11.7
**Personas:** PER-01 (primary), PER-02 (secondary), PER-03 (read-only, actions disabled with role reason)

#### Layout — post-revalidation state (evaluation v2)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to queue                                            Steps 2, 3, 5–7 of 10 ⓘ  │
│ SHP-2026-0007  ·  Helios Grid Supply  ·  ▷ In review  ·  ▮▮▮▮ Critical ⓘ  ·  $85,000 USD │
│ Evaluation v2   ·   [ View audit record ]                                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ⟳ Revalidated 6 Sep 14:22 UTC — evaluation v2                                         │
│   1 exception resolved · 2 retained · 0 new              [ Compare v1 → v2 ]          │
├───────────────────────────────────────────────┬────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ │ ⚙ SYSTEM · ENTRY DATA                     │ │ │ ╎✦ AI-GENERATED · ADVISORY        │ │
│ │───────────────────────────────────────────│ │ │ ╎  Plain-language summary          │ │
│ │ Importer          Helios Grid Supply      │ │ │ ╎────────────────────────────────  │ │
│ │ Carrier           Pacific Star Lines      │ │ │ ╎ This shipment is a consignment  │ │
│ │ Product           Photovoltaic solar      │ │ │ ╎ of photovoltaic solar panels    │ │
│ │                   panels, 480 units       │ │ │ ╎ valued at $85,000 imported by   │ │
│ │ HTS code          8541.40                 │ │ │ ╎ Helios Grid Supply. Two issues  │ │
│ │                   ⚠ 6 digits normalized;  │ │ │ ╎ remain open.                    │ │
│ │                   rule expects 10         │ │ │ ╎                                  │ │
│ │ Country of origin MALAYSIA                │ │ │ ╎ The declared country of origin  │ │
│ │ Manufacturer      Sunfield Industrial Ltd │ │ │ ╎ (country_of_origin) is Malaysia, │ │
│ │ Mfr. address      No. 88 Jinhu Road,      │ │ │ ╎ but the manufacturer's address   │ │
│ │                   Suzhou, Jiangsu,        │ │ │ ╎ (manufacturer.address.country)   │ │
│ │                   **CHINA**               │ │ │ ╎ is in China. A certificate of    │ │
│ │ Shipment value    $85,000.00 USD          │ │ │ ╎ origin was received on 6 Sep and │ │
│ │ Entry date        31 Aug 2026             │ │ │ ╎ resolved the missing-document    │ │
│ │ Status            ▷ In review             │ │ │ ╎ issue. The HTS code 8541.40 is   │ │
│ │ Priority          ▮▮▮▮ Critical ⓘ derivation   │ │ │ ╎ shorter than the 10 digits the   │ │
│ └───────────────────────────────────────────┘ │ │ ╎ classification rule expects.     │ │
│                                               │ │ ╎────────────────────────────────  │ │
│ ┌───────────────────────────────────────────┐ │ │ ╎ AI-generated · not a finding     │ │
│ │ ⚙ SYSTEM · DOCUMENTS RECEIVED             │ │ │ ╎ Provider: openai · Model: gpt-4o │ │
│ │───────────────────────────────────────────│ │ │ ╎ Mode: LIVE · 6 Sep 14:22:11 UTC │ │
│ │ Commercial invoice     ✔ Received         │ │ │ ╎ Evidence inputs: 3 exceptions,   │ │
│ │   Seeded · inv-0007.pdf · 31 Aug          │ │ │ ╎ 7 evidence rows, evaluation v2   │ │
│ │───────────────────────────────────────────│ │ │ ╎           [ Regenerate summary ] │ │
│ │ Packing list           ✔ Received         │ │ └────────────────────────────────────┘ │
│ │   Seeded · pkl-0007.pdf · 31 Aug          │ │                                        │
│ │───────────────────────────────────────────│ │ ┌────────────────────────────────────┐ │
│ │ Certificate of origin  ✔ Received         │ │ │ ⚙ SYSTEM · VALIDATION RESULTS      │ │
│ │   ⬆ UPLOADED THIS SESSION                 │ │ │ 2 open · Resolved (1) ▸            │ │
│ │   coo-shp-2026-0007.pdf                   │ │ │────────────────────────────────────│ │
│ │   by Marisol Reyes · 6 Sep 14:22           │ │ │ ⬡ ORIGIN CONFLICT   Sev: CRITICAL  │ │
│ │   Requested by Marisol Reyes 6 Sep 13:58   │ │ │   ⓘ Updated at v2                  │ │
│ │   ⬇ download                              │ │ │ Rule: Declared origin must match   │ │
│ │───────────────────────────────────────────│ │ │       manufacturer address country │ │
│ │ ⓘ Every document is either seeded with    │ │ │ Authority: 19 CFR 134.1            │ │
│ │   the demo data or uploaded against a     │ │ │ [ View triggering rule ]           │ │
│ │   request. No importer correspondence     │ │ │ Assertion: Declared country of     │ │
│ │   path exists.                            │ │ │  origin conflicts with the         │ │
│ └───────────────────────────────────────────┘ │ │  manufacturer's address country.   │ │
│                                               │ │ EVIDENCE                            │ │
│                                               │ │  country_of_origin                 │ │
│                                               │ │    raw "Malaysia" → norm "MY"      │ │
│                                               │ │  manufacturer.address.country      │ │
│                                               │ │    raw "China" → norm "CN"         │ │
│                                               │ │  documents.CERTIFICATE_OF_ORIGIN   │ │
│                                               │ │    .stated_country                 │ │
│                                               │ │    raw "China" → norm "CN"   ⓘ new │ │
│                                               │ │  compare: MY ≠ CN                  │ │
│                                               │ │ MISSING INFORMATION: none          │ │
│                                               │ │────────────────────────────────────│ │
│                                               │ │ ⬡ INCOMPLETE HTS    Sev: HIGH      │ │
│                                               │ │ Rule: HTS code completeness        │ │
│                                               │ │ Authority: 19 CFR 152.11           │ │
│                                               │ │ [ View triggering rule ]           │ │
│                                               │ │ Assertion: HTS code has 6 digits;  │ │
│                                               │ │  10 are expected.                  │ │
│                                               │ │ EVIDENCE                            │ │
│                                               │ │  hts_code raw "8541.40"            │ │
│                                               │ │    → norm "854140" (6 digits)      │ │
│                                               │ │  rule.expected_digit_count = 10    │ │
│                                               │ │ MISSING INFORMATION:                │ │
│                                               │ │  full 10-digit classification      │ │
│                                               │ └────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ACTIONS   [ Request additional information ]  [ Revalidate ]                           │
│                                       [ Go to Recommended Resolution → ]  (primary)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### The "Resolved (1)" disclosure, expanded

```
│ ⚙ SYSTEM · VALIDATION RESULTS      2 open · Resolved (1) ▾                            │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ⬡ MISSING DOCUMENT   Sev: HIGH        ✔ RESOLVED BY REVALIDATION at v2             │ │
│ │ Rule: Certificate of origin required above $50,000                                 │ │
│ │ Authority: 19 CFR 141.83                                                           │ │
│ │ Opened 31 Aug 09:04 UTC · Resolved 6 Sep 14:22 UTC                                 │ │
│ │ EVIDENCE AT OPENING                                                                │ │
│ │   documents.CERTIFICATE_OF_ORIGIN = absent                                         │ │
│ │   shipment_value_usd = 85000 (threshold 50000)                                     │ │
│ │ Resolved because: documents.CERTIFICATE_OF_ORIGIN received 6 Sep 14:22 UTC          │ │
│ │ ⓘ Resolved, not deleted. This exception and its evidence remain on the record.      │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
```

Resolved exceptions are **marked and moved, never deleted** — the disclosure keeps history present without making the working set noisy (FRD F18 §Process step 4; US-1.6).

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Pinned shipment header: ID, importer, status, priority, value | Sticky above the panels | Context must survive scrolling; the header never leaves |
| Primary | Validation results panel — exception + rule + authority + evidence in **one card** | Right column, above the fold | This is what makes the 30-second comprehension target achievable without leaving the screen (FRD F18 §Validation) |
| Primary | Change-indication banner after a revalidation | Full width, directly beneath the header | *"One down. Two to go — and I want to see the two, not a green tick"* |
| Primary | Documents panel with **missing rendered as an explicit absence** | Left column | A missing document must be visible as an absence, not inferable from a gap |
| Secondary | AI summary panel | Right column, above validation results | Read first, verified against the panel below it |
| Secondary | Entry data panel — all eight PRD-mandated attributes plus entry date | Left column | Establishes identity; historically six fields on four systems |
| Secondary | Document provenance (`Seeded` / `Ingested` / `Uploaded this session`) + uploader + request linkage | Per document row | US-4.5; Angela asks where every document came from |
| Tertiary | Resolved-exception disclosure | Collapsed by default | History present, not noisy |
| Tertiary | Priority derivation basis | Info disclosure on the priority indicator | Explains the ranking without occupying the header |
| Tertiary | Evaluation version + compare link | Header sub-line | Lets a supervisor see what moved |

#### Why the AI panel sits *above* the validation panel

Marisol reads the narrative, then verifies it. Reading order is summary → findings. But the **loading order is inverted**: the five non-AI calls resolve first and render the verifiable facts; the AI panel occupies a reserved skeleton until it arrives (FRD F18 §Process step 1). Walkthrough step 2 completes without the AI. A slow provider therefore delays step 3 by a few seconds and never delays step 2, and the evidence is never gated behind the narrative.

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading (evidence) | Four panel skeletons at final dimensions; header renders as soon as the shipment call resolves | `aria-busy` per panel |
| Loading (AI only) | AI panel skeleton **inside the AI band with the label already visible** — so a half-loaded screen still can't present machine text as a finding | *"Generating summary…"* |
| Ready | As wireframed | — |
| AI in offline fallback | AI panel renders normally with an added `OFFLINE FALLBACK` sub-chip and the provenance line reading `Mode: FALLBACK_DETERMINISTIC`; shell banner active | Banner copy from Screen 0 |
| Never evaluated | Validation panel: *"Not yet evaluated"* + **Revalidate** control | — |
| Empty documents | Documents panel lists required-but-absent types; never an empty box | *"No documents have been received for this shipment."* |
| No open exceptions | Validation panel: *"No open exceptions"*; Resolved disclosure holds the history | — |
| Post-revalidation | Change banner + resolved/retained/new markers + `aria-live` announcement | *"Revalidated: 1 exception resolved, 2 retained, 0 new."* |
| Upload in flight | Inline progress on the request row; action controls disabled with *"Upload in progress"* | — |
| Upload rejected | Dialog stays open with the specific reason; **no panel state changes** | see Flow 3 |
| Action rejected by state machine | Inline dialog error naming the reason; the case refetches | *"Cannot request information on a case in status Cleared."* |
| Action rejected by role (ADM) | Every action control disabled with the visible reason | *"System Administrators do not adjudicate shipments."* |
| Case cleared | All action controls disabled; read-only chip in the header | *"This shipment has been cleared and can no longer be changed."* |
| Case changed concurrently | Toast + automatic refetch; the action is **not** retried silently | *"This case changed; reloading."* |
| Shipment not found | Inline 404 + **Back to queue** | — |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| **Request additional information** | Secondary button → in-frame dialog | Checkbox list from open exceptions' `missing_information`; "other type" gated by `justify_unlisted_document` (≥20 char justification); mandatory `JustificationInput` (min 10). Submit disabled until valid. Posts `REQUEST_INFORMATION` |
| **Upload simulated document** | Contextual button, **only on an `OUTSTANDING` request row** | Fixture radio list + file picker; document type is **read-only text taken from the request**. Posts to `/api/document-requests/{id}/upload` |
| **Revalidate** | Secondary button | Posts `/api/shipments/{id}/revalidate`; produces the identical change indication. Available whenever the case is not `CLEARED` |
| **Regenerate summary** | Tertiary button inside the AI band | Re-requests the summary. CS and SUP only. Causes no state transition |
| **View triggering rule** | Link per exception card → in-frame drawer | Read-only rule detail: name, description, policy reference, severity, parameters, version. Available to all roles — a specialist must be able to see the rule that flagged her shipment |
| **Compare v1 → v2** | Link → in-frame drawer | Evaluation diff: exceptions added / resolved / retained, with the evidence delta highlighted |
| **View audit record** | Header link | → `/shipments/{id}/audit` |
| **Go to Recommended Resolution** | Primary button | → `/shipments/{id}/resolution`, case context preserved. The single forward affordance, so the walkthrough's next step is never ambiguous |
| **Back to queue** | Breadcrumb link | → `/queue`; clears case context |
| Document **download** | Link per received document | Serves the synthetic fixture |

#### Governance expression on this screen

- **The AI panel can never be mistaken for a finding.** It lives in the AI band, it is introduced by the chip `AI-GENERATED · ADVISORY`, it is closed by the words *"AI-generated · not a finding"* plus full provenance, and it is never rendered in the same container as human-authored or system text (FRD F18 §Validation).
- **The findings render without the narrative.** The validation panel is populated from the exception API and stays fully usable when the AI panel is absent, loading, or in fallback. This is the mitigation for PRD §8's hallucination risk and the reason Marisol keeps reading the summary at all (JRN-01.1 Risk of Abandonment, stage 3).
- **Provenance on every document.** `SEEDED` / `INGESTED` / `SIMULATED_UPLOAD` with the uploader named, plus the standing note that no importer correspondence path exists (US-4.5, US-12.7).
- **Every action is enabled or disabled-with-a-visible-reason.** There is no hidden-without-explanation state on this screen.
- **Revalidation is reconciliation.** Resolved counts and retained counts are always both stated. There is no success state on this screen that reads as "clean".

---
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
### Screen 4: Decision & Audit Record

**Feature:** F20 · **Walkthrough step:** 10 · **Route:** `/shipments/:shipmentId/audit`
**Purpose:** Replay the complete, attributed, timestamped history of a case so a decision can be defended months later — from the record, without adding a word to it.
**User Stories:** US-9.9, US-6.1, US-6.3, US-6.4, US-6.5, US-6.6, US-7.2, US-2.2, US-12.4, US-11.10
**Personas:** PER-02 (primary), PER-04 (primary), PER-01 (secondary)

#### Layout — cleared case, full timeline

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to Shipment Review                                        Step 10 of 10 ⓘ    │
│ Decision & Audit Record                              READ-ONLY · APPEND-ONLY          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SHP-2026-0007 · Helios Grid Supply · ⬤🔒 Cleared · ▮▮▮▮ Critical                      │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DISPOSITION                                                                        │ │
│ │ Cleared 6 Sep 2026 14:41:52 UTC                                                    │ │
│ │ Approving official   Dwayne Okafor (Supervisor)                                    │ │
│ │ On the recommendation of   Marisol Reyes (Cargo Specialist), 6 Sep 14:31:07 UTC    │ │
│ │ Resolution basis   MIXED · 2 exceptions closed as CLEARED_BY_DECISION              │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ COMPLETENESS                                                                       │ │
│ │ 12 events recorded. 5 decisions, all 5 complete against the 8 required fields.     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ INTEGRITY            Audit chain verified: 12 of 12 entries intact.   [ Re-verify ]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SHOW  ● All events  ○ Decisions only  ○ AI outputs  ○ System events  ○ Access denials │
│       ⓘ Filtering changes what is displayed. The record itself is always complete.    │
│                                            [ Export JSON ]   [ Print / Save ]         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  #1  ⚙ SYSTEM · CARGO ENTRY INGESTED                          31 Aug 2026 09:04:11   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            System (ingestion, cargo-entry JSON)                            │ │
│  │ Status change    — → ⬡ New                                                       │ │
│  │ Exception        Not applicable                                                  │ │
│  │ Evidence         cargo-entries-v1.json, record 7 of 14                           │ │
│  │ AI recommendation  No AI recommendation had been generated at this point.        │ │
│  │ User decision    Not applicable — no human action                                │ │
│  │ Justification    Not applicable                                                  │ │
│  │ Approving official  Not applicable                                               │ │
│  │ Notification     ⓘ Generated, not transmitted                                    │ │
│  │                  To: Cargo Specialist · "New cargo entry received"               │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #2  ⚙ SYSTEM · SHIPMENT FLAGGED — 3 EXCEPTIONS                31 Aug 2026 09:04:12   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            System (rule evaluation, evaluation v1)                         │ │
│  │ Exception        ⬡ Origin conflict CRITICAL · rule-origin-manufacturer v2        │ │
│  │                  ⬡ Incomplete HTS MEDIUM · rule-hts-completeness v3              │ │
│  │                  ⬡ Missing document HIGH · rule-doc-highvalue-coo v1             │ │
│  │ Evidence reviewed                                                                │ │
│  │   country_of_origin "Malaysia" → MY                                              │ │
│  │   manufacturer.address.country "China" → CN                                      │ │
│  │   hts_code "8541.40" → 854140 (6 digits; 10 expected)                            │ │
│  │   ▸ Show all evidence (7 rows)                                                   │ │
│  │ AI recommendation  No AI recommendation had been generated at this point.        │ │
│  │ User decision / Justification / Approving official   Not applicable              │ │
│  │ Notification     ⓘ Generated, not transmitted · To: Cargo Specialist             │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #3  ╎✦ AI-GENERATED · PLAIN-LANGUAGE SUMMARY (v1)             31 Aug 2026 09:04:15   │
│  ╎┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  ╎│ Author         AI assistance — not a human, not a finding                       │ │
│  ╎│ Provenance     openai · gpt-4o · mode LIVE · 31 Aug 09:04:15 UTC                │ │
│  ╎│ Evidence inputs  3 exceptions, 7 evidence rows, evaluation v1                    │ │
│  ╎│ Content        "This shipment of photovoltaic solar panels valued at $85,000…"  │ │
│  ╎│ User decision  Not applicable — AI output takes no action                        │ │
│  ╎│ Justification  Not applicable                                                    │ │
│  ╎│ Approving official  Not applicable                                               │ │
│  ╎│ Notification   None generated for AI output                                      │ │
│  ╎└─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #5  👤 HUMAN DECISION · REQUEST ADDITIONAL INFORMATION          6 Sep 2026 13:58:02  │
│  ┃┌──────────────────────────────────────────────────────────────────────────────────┐│
│  ┃│ Actor            Marisol Reyes (Cargo Specialist)                                ││
│  ┃│ Status change    ⬡ New → ⧗ Awaiting information                                  ││
│  ┃│ Exception        ⬡ Missing document HIGH · rule-doc-highvalue-coo v1             ││
│  ┃│ Evidence reviewed  documents.CERTIFICATE_OF_ORIGIN = absent                      ││
│  ┃│                    shipment_value_usd = 85000 (threshold 50000)                  ││
│  ┃│ AI recommendation  ╎✦ AI suggested: Escalate to supervisor                       ││
│  ┃│                    ╎ confidence MEDIUM · basis: an open exception at CRITICAL    ││
│  ┃│                    ╎ severity is present                                         ││
│  ┃│                    ╎ openai · gpt-4o · LIVE · 31 Aug 09:04:17 UTC                ││
│  ┃│                    ╎ CONCURRENCE: the decision DIVERGED from the AI advice        ││
│  ┃│ User decision    REQUEST_INFORMATION · document type CERTIFICATE_OF_ORIGIN       ││
│  ┃│ Justification    "Required certificate of origin is absent and the shipment      ││
│  ┃│                   value is above the documentary threshold. Requesting the        ││
│  ┃│                   certificate before assessing the origin conflict."             ││
│  ┃│                   (verbatim, in full)                                             ││
│  ┃│ Timestamp        6 Sep 2026 13:58:02 UTC                                          ││
│  ┃│ Approving official  Not applicable                                                ││
│  ┃│ Notification     ⓘ Generated, not transmitted                                     ││
│  ┃│                  To: Cargo Specialist · "Document requested: certificate of      ││
│  ┃│                  origin" · body: "A certificate of origin has been requested…"   ││
│  ┃└──────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                        │
│  #7  ⚙ SYSTEM · REVALIDATED — EVALUATION v2                      6 Sep 2026 14:22:09  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            System (revalidation, trigger DOCUMENT_UPLOAD)                  │ │
│  │ Status change    ⧗ Awaiting information → ▷ In review                            │ │
│  │ Before → after   3 open → 2 open                                                 │ │
│  │   RESOLVED_BY_REVALIDATION  ⬡ Missing document                                   │ │
│  │   RETAINED                  ⬡ Origin conflict (evidence set grew by 1 row)       │ │
│  │   RETAINED                  ⬡ Incomplete HTS                                     │ │
│  │   NEW                       none                                                 │ │
│  │ ⓘ Resolved, not deleted. The exception and its evidence remain on this record.   │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #10 👤 HUMAN DECISION · CLEARANCE RECOMMENDED                    6 Sep 2026 14:31:07 │
│  ┃  ... all eight fields ... resolution_basis MIXED ... 2 exceptions enumerated ...   │
│  ┃  Approving official  Not applicable — recommendation awaiting supervisor decision  │
│                                                                                        │
│  #11 👤 HUMAN DECISION · CLEARANCE APPROVED                       6 Sep 2026 14:41:52 │
│  ┃┌──────────────────────────────────────────────────────────────────────────────────┐│
│  ┃│ Actor            Dwayne Okafor (Supervisor)                                      ││
│  ┃│ Status change    ◫ Pending approval → ⬤🔒 Cleared                                ││
│  ┃│ Exception        ⬡ Origin conflict CRITICAL → CLEARED_BY_DECISION                ││
│  ┃│                  ⬡ Incomplete HTS HIGH → CLEARED_BY_DECISION                     ││
│  ┃│ Evidence reviewed  evaluation v3 snapshot · ▸ Show all evidence (5 rows)         ││
│  ┃│ AI recommendation  ╎✦ AI suggested: no new action while approval is outstanding   ││
│  ┃│                    ╎ CONCURRENCE: NOT_APPLICABLE — the AI never advises approval  ││
│  ┃│ User decision    APPROVE_CLEARANCE                                                ││
│  ┃│ Justification    "Reviewed the retained origin conflict against the certificate.  ││
│  ┃│                   The specialist's reading is supported by the commercial         ││
│  ┃│                   documents and the incomplete HTS does not affect admissibility  ││
│  ┃│                   for this commodity. Approving on that basis."                   ││
│  ┃│ Timestamp        6 Sep 2026 14:41:52 UTC                                          ││
│  ┃│ APPROVING OFFICIAL  Approved by Dwayne Okafor (Supervisor)          ← prominent   ││
│  ┃│ Notification     ⓘ Generated, not transmitted                                     ││
│  ┃│                  To: Cargo Specialist · "Clearance approved — SHP-2026-0007"     ││
│  ┃└──────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                        │
│  End of record. 12 of 12 entries shown.                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### An access-denial entry (the entry that proves the control)

```
│  #6  ⛔ ACCESS DENIED · APPROVE_CLEARANCE                        6 Sep 2026 14:33:41  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            Marisol Reyes (Cargo Specialist)                                │ │
│  │ Attempted action APPROVE_CLEARANCE                                               │ │
│  │ Case status at attempt   ◫ Pending approval                                      │ │
│  │ Outcome          REFUSED · SELF_APPROVAL_BLOCKED                                 │ │
│  │ Reason           "You cannot approve your own recommendation."                   │ │
│  │ Status change    None — the case did not leave Pending approval                  │ │
│  │ ⓘ The attempt was refused and recorded. A rejected action is governance-relevant │ │
│  │   information, not a silent no-op.                                               │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
```

*"It's in the log. The attempt was refused* and *recorded — that's the part that matters"* (JRN-02.1 stage 6). This entry class has its own filter option so an evaluator can ask for it directly.

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Disposition block: approving official, clearance timestamp, recommender | Case header | The one-glance answer to *"who cleared this and on whose recommendation"* |
| Primary | Completeness block: `n events, m decisions, all m complete against the 8 required fields` | Header, second block | The claim is **shown on camera**, not narrated (FRD F20 §Terminology) |
| Primary | Authorship band per entry — text label + icon + container treatment | Every entry | Removes a category of professional risk PER-01 has lived with |
| Primary | The eight fields on every decision entry | Entry body, fixed order | An absent field is the failure mode the whole feature exists to prevent |
| Primary | `READ-ONLY · APPEND-ONLY` chip | Toolbar | States the property in words (P6) |
| Secondary | Chain-verification result | Header, third block | On-demand integrity check |
| Secondary | Justification, **verbatim and in full** | Human-band entries | Never truncated, summarised, or paraphrased |
| Secondary | Generated notification, in a distinct sub-block beside its decision | Every entry that produced one | Notifications live with the decision that caused them |
| Secondary | Entry-class filter | Toolbar | Focused replay for a live demo; presentational only |
| Tertiary | Evidence beyond three rows | Behind **Show all evidence** disclosure — collapsed, **never omitted** | Density without loss |
| Tertiary | Export / Print | Toolbar, right | One action produces the whole record |
| Tertiary | Sequence numbers | Entry header | Ordering is stated, not implied |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading | Timeline skeleton: header blocks + 6 entry cards at final height | `aria-busy` on the list |
| Ready | Timeline as wireframed, ascending `sequence_no`, identical on every load | *"12 of 12 entries shown."* |
| Empty history | Panel, no timeline | *"No events recorded for this case yet."* |
| Filtered to a class | Only matching entries; footer states the reduction | *"Showing 5 of 12 entries (decisions only). The record itself is complete."* |
| Fetch failed | Error panel + **Retry** + `request_id`; header blocks hidden | *"The audit record could not be loaded. Reference: req_11a4."* |
| Chain verification failed | **Prominent red banner** naming the first invalid sequence number; **the timeline still renders** | *"Audit chain verification failed at entry #7. The record is displayed unmodified."* |
| Decision entry missing a required field | Prominent failure in the completeness block naming the entry and the field (should be unreachable — the write-time gate prevents it) | *"Entry #10 is missing: approving_official."* |
| Verification in flight | Integrity block shows inline progress | *"Verifying chain…"* |
| Export in flight | Button shows inline progress | *"Preparing export…"* |
| Export failed | Toast + **Retry**; the timeline is unaffected | *"Export failed. The record is unchanged."* |
| Case not found | Inline 404 + **Back to queue** | — |
| Cross-case audit denied (CS) | Not offered in the UI; direct route renders the inline 403 | *"This case is outside your assigned scope."* |
| Not-yet-cleared case | Disposition block reads the current status instead of a clearance | *"Not cleared. Current status: Pending approval, awaiting supervisor decision."* |

#### Interactive Elements — the complete list

| Element | Type | Behaviour |
|---|---|---|
| Entry-class filter | Radio group | `all` / `decisions only` / `AI outputs` / `system events` / `access denials`. Presentational; re-issues the read with `entry_class` |
| **Show all evidence** | Disclosure per entry | Expands evidence rows beyond the first three. Collapsed, never omitted |
| **Re-verify** | Secondary button | Re-issues `GET /api/cases/{id}/audit/verify` |
| **Export JSON** | Secondary button | Blob download `audit-SHP-2026-0007.json`; every field of every entry plus the hash chain |
| **Print / Save** | Secondary button | Navigates in-frame to `/shipments/:id/audit/print`, a full-bleed print-styled route, then calls `window.print()`. **No `window.open`, no popup, no new tab, no PDF toolchain.** A **Back to record** link returns |
| **Back to Shipment Review** | Breadcrumb link | → `/shipments/:id/review` |
| Pagination | Prev / Next | `page_size` 100; the seeded canonical case fits on one page |

That is the entire control inventory. There is no other interactive element on this screen.

#### Printable view (`/shipments/:shipmentId/audit/print`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [ ‹ Back to record ]                              [ Print / Save PDF ]│  ← screen only
├════════════════════════════════════════════════════════════════════════┤
│ CargoDemo — Decision & Audit Record                                    │
│ DEMO ARTEFACT · SYNTHETIC DATA · SIMULATED LOGIN · NOTIFICATIONS NOT   │
│ TRANSMITTED                                                            │
│                                                                        │
│ Case SHP-2026-0007 · Helios Grid Supply · Cleared 6 Sep 2026 14:41 UTC │
│ Approving official: Dwayne Okafor (Supervisor)                         │
│ 12 events · 5 decisions · all 5 complete against the 8 required fields │
│ Audit chain verified: 12 of 12 entries intact                          │
│ Exported 8 Sep 2026 by Dwayne Okafor (Supervisor)                      │
│                                                                        │
│ [ linear, un-collapsed rendering of all 12 entries with all eight      │
│   fields, all evidence rows expanded, all justifications in full,      │
│   authorship stated as words — "AI-GENERATED", "HUMAN DECISION",       │
│   "SYSTEM" — because a printed page has no colour guarantee ]          │
└────────────────────────────────────────────────────────────────────────┘
```

Print rules: `@media print` hides the shell, the toolbar, and the Back link; all disclosures render expanded; authorship is carried by **words and rules-lines, never by background tint**, because a monochrome print must preserve the AI/human distinction. The demo-artefact banner prints on every page so an exported record can never be mistaken for a production record.

#### Governance expression on this screen

- **Zero verbs.** No edit, no delete, no inline editing, no context menu, no hover-revealed action tray, no multi-select, no drag handle. The read-only property is achieved by construction and stated in words (US-12.4, P6).
- **Eight fields, always, with explicit "Not applicable".** The reader never has to infer whether a field was empty or simply not shown (US-6.1).
- **AI content is banded and captioned even inside a human entry.** Field 3 of a human decision entry is the AI recommendation; it renders in a nested AI band with its own provenance and the concurrence verdict, so a quoted confidence level can never be attributed to the human (US-2.2, JRN-02.2 stage 3).
- **Evidence is the evidence as at decision time**, snapshotted, not re-derived from current state (US-6.6).
- **Notifications sit with their decisions**, labelled *"Generated, not transmitted"* (US-7.2).
- **The whole history, including ingestion and flagging**, not only the human decisions — step 10 requires replaying every step (US-11.10).
- **Denials are entries.** An `ACCESS_DENIED` entry with its own filter class is the difference between a control and evidence of a control (US-12.2, F09a I10).
- **Fallback demonstration target.** `SHP-2026-0009` (the pre-cleared seeded shipment) renders a complete history of at least 8 entries with a named approving official, so step 10 is demonstrable even if the live walkthrough case is not yet cleared (FRD F20 §Validation).

---
### Screen 5: Rule Administration (Administrator Surface)

**Feature:** F15 · **Routes:** `/admin/rules`, `/admin/rules/:ruleId` · **Role:** System Administrator only
**Purpose:** Prove that business rules are configuration owned by the customer, not code owned by a vendor — changeable, previewable, validated, and audited, with 0 code changes and 0 redeploys.
**User Stories:** US-8.5, US-8.6, US-12.6
**Personas:** PER-03 (primary), PER-04 (observer — she asks to see a rule changed in front of her)

**Scope discipline.** This surface exists **only to support the four primary screens** (PROJECT.md Constraints; PRD §5.8). It is deliberately plain: a table, a form, a preview, a history. It must not acquire dashboards, charts, or a rule-authoring DSL, and it must never be presented as a fifth primary screen.

#### Layout — rule list (`/admin/rules`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Rule Administration                                              👤 Priya Raghavan    │
│ Business rules are configuration. Changes take effect without a code change or a       │
│ redeploy, and every change is recorded under your name.                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS  Exception type ▾   Enabled ▾   Severity ▾                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Rule                    │ Type            │ Sev.   │ Enabled │ Policy ref  │ v │ Open │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Certificate of origin   │ Missing         │ HIGH   │ ✔ Yes   │ 19 CFR      │ 1 │  3   │
│ required above $50,000  │ document        │        │         │ 102.0       │   │      │
│  rule-doc-highvalue-coo │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Baseline entry          │ Missing         │ MEDIUM │ ✔ Yes   │ 19 CFR      │ 1 │  1   │
│ documents required      │ document        │        │         │ 141.81      │   │      │
│  rule-doc-baseline      │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Solar certificate       │ Missing         │ HIGH   │ ✕ No    │ 19 CFR      │ 1 │  0   │
│ required                │ document        │        │         │ 102.0       │   │      │
│  rule-doc-solar-cert    │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ HTS code completeness   │ Incomplete HTS  │ HIGH   │ ✔ Yes   │ 19 CFR      │ 3 │  4   │
│  rule-hts-completeness  │                 │        │         │ 152.11      │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ HTS known-code check    │ Incomplete HTS  │ MEDIUM │ ✕ No    │ HTSUS       │ 1 │  0   │
│  rule-hts-known-chapter │                 │        │         │ General     │   │      │
│                         │                 │        │         │ Rules       │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Declared origin must    │ Origin conflict │CRITICAL│ ✔ Yes   │ 19 CFR      │ 2 │  3   │
│ match manufacturer      │                 │        │         │ 134.1       │   │      │
│ address country         │                 │        │         │             │   │      │
│  rule-origin-           │                 │        │         │             │   │      │
│    manufacturer         │                 │        │         │             │   │      │
│─────────────────────────┼─────────────────┼────────┼─────────┼─────────────┼───┼──────│
│ Declared origin must    │ Origin conflict │ HIGH   │ ✕ No    │ 19 CFR      │ 1 │  0   │
│ match certificate       │                 │        │         │ 134.1       │   │      │
│ stated country          │                 │        │         │             │   │      │
│  rule-origin-certificate│                 │        │         │             │   │      │
│─────────────────────────┴─────────────────┴────────┴─────────┴─────────────┴───┴──────│
│                                                                  [ + Create rule ]    │
│ ⓘ Rules cannot be deleted. Disabling is the retirement path, so the rule that          │
│   produced a historical exception stays readable forever.                              │
│ ⓘ Exactly three exception types are supported. A fourth type is out of scope by        │
│   recorded decision (PRD §5.8).                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

The list reads as **configuration**, with a policy-reference column and a version column — the answer to *"if this is a code listing dressed up as a screen, I'll know in five seconds"* (JRN-03.1 stage 1).

#### Layout — rule editor with impact preview (`/admin/rules/rule-hts-completeness`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to rules      HTS code completeness      v3 · enabled · 4 open exceptions      │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ DEFINITION                                │ IMPACT PREVIEW                             │
│                                           │                                            │
│ Name        HTS code completeness         │  Not yet run.                              │
│ Exception   Incomplete HTS  🔒 immutable  │  Preview the effect of this change before   │
│  type       ⓘ A rule's exception type     │  applying it. Preview performs no writes.   │
│             cannot be changed — it would  │                                            │
│             orphan the exceptions it      │  ── after [ Preview impact ] ──            │
│             produced.                     │                                            │
│ Description HTS classification must be    │  Evaluated 12 shipments (1 cleared case     │
│  ┌──────────────────────────────────────┐ │  skipped — a rule change never disturbs a  │
│  │ complete to the configured digit     │ │  cleared disposition).                     │
│  │ count.                               │ │                                            │
│  └──────────────────────────────────────┘ │  Would add       0 exceptions               │
│ Policy ref  19 CFR 152.11                 │  Would remove    2 exceptions               │
│  ⓘ Required. F19 must always be able to   │  Severity change 0                          │
│    display the triggering authority.      │  Priority change 1 shipment                 │
│ Severity    ▾ HIGH                        │                                            │
│ Priority    ▾ HIGH when value > 50000     │  ┌──────────────┬──────────────┬─────────┐ │
│  mapping                                  │  │ SHP-2026-0007│ Incomplete   │ removed │ │
│                                           │  │              │ HTS          │         │ │
│ PARAMETERS  (type-aware form)             │  │ SHP-2026-0001│ Incomplete   │ removed │ │
│ expected_digit_count   [ 6            ]   │  │              │ HTS          │         │ │
│   was 10                                  │  │ SHP-2026-0007│ priority     │unchanged│ │
│ min_digit_count        [ 6            ]   │  │              │ (Critical)   │         │ │
│ check_known_codes      [ ] off            │  │ SHP-2026-0001│ priority     │ High →  │ │
│ known_codes            (disabled while    │  │              │ leaves queue │ Low     │ │
│                         check is off)     │  └──────────────┴──────────────┴─────────┘ │
│                                           │  Showing 3 of 3 changes.                   │
│ CONDITIONS   value_usd > 0                │                                            │
│                                           │  [ Back to editing ]                       │
│ RAW params_json  (read-only, for          │  [ Apply with revalidation ]                │
│  transparency)                            │  [ ] Apply without revalidating            │
│  { "expected_digit_count": 6,             │      (queue will not update until the next │
│    "min_digit_count": 6,                  │       evaluation)                          │
│    "check_known_codes": false }           │                                            │
│                                           │                                            │
│ CHANGE NOTE (required, 10–500 chars)      │                                            │
│  ┌──────────────────────────────────────┐ │                                            │
│  │ Policy update: subheading-level      │ │                                            │
│  │ classification is now sufficient for │ │                                            │
│  │ this commodity class.                │ │                                            │
│  └──────────────────────────────────────┘ │                                            │
│                              78 / 10 ✔    │                                            │
│                                           │                                            │
│ [ Cancel ]  [ Preview impact ]            │                                            │
│           ⓘ Apply is unavailable until a  │                                            │
│             preview has been run on this  │                                            │
│             draft.                        │                                            │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│ [ Disable rule ]                                         [ View rule history (4) ]     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Layout — validation failure (the 9am-on-demo-day test)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ✕ The rule was not saved. The previous rule set remains in effect.                    │
│   No changes were applied and no shipment was revalidated.                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ expected_digit_count   [ ten                                       ]  ← field-level    │
│   ✕ Must be a whole number. "ten" is not a number.                                     │
│                                                                                        │
│ min_digit_count        [ 12                                        ]                   │
│   ✕ min_digit_count cannot exceed expected_digit_count.                                │
│                                                                                        │
│ known_codes            [ (empty)                                   ]                   │
│   ✕ known_codes must be non-empty when check_known_codes is enabled.                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Messages name **the parameter and the constraint**, never a generic failure. *"What happens if I get this wrong at 9am on a demo day?"* — she finds out in the form, not through an empty queue an hour later (JRN-03.1 stage 2).

#### Layout — apply result

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ✔ Rule saved at version 4 by Priya Raghavan (System Administrator), 8 Sep 09:12 UTC   │
│                                                                                        │
│   PARAMETER DIFF                                                                       │
│     params_json.expected_digit_count   10 → 6                                          │
│     params_json.min_digit_count        10 → 6                                          │
│   REVALIDATION                                                                         │
│     2 shipments revalidated · 2 exceptions resolved · 1 priority changed              │
│     1 cleared case skipped                                                             │
│   AUDIT                                                                                │
│     RULE_UPDATED entry written with the full before/after definition, the diff,        │
│     your identity, the timestamp, and your change note.                                │
│                                                                                        │
│   [ View rule history ]   [ Go to Exception Queue to see the effect ]                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

The forward affordance goes **straight to the queue**, because the demonstrable claim is that the effect is visible on the working surface immediately, with no restart (PRD §7 Rule configurability).

#### Layout — Environment & Reset (`/admin/environment`, F22)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Environment & Reset                                              👤 Priya Raghavan    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ HEALTH CHECK                                                    [ Re-run check ]      │
│   Database            ✔ ok        14 shipments, 12 rules, 96 audit entries            │
│   Seed data           ✔ ok        deterministic seed v1, canonical scenario present   │
│   AI assistance       ⚠ fallback  provider unreachable; deterministic fallback active │
│                                    ⓘ The walkthrough completes in this mode. All AI    │
│                                      output is labelled OFFLINE FALLBACK.             │
│   Canonical scenario  ✔ ok        SHP-2026-0007 · 3 exceptions at evaluation v1       │
│   Pre-cleared case    ✔ ok        SHP-2026-0009 · 9 audit entries · approving         │
│                                    official recorded                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ RESET TO PRISTINE SEEDED STATE                                                         │
│   Restores the database to the deterministic seed. All session uploads, decisions,     │
│   approvals, audit entries and notifications created during this run are discarded.    │
│   ⚠ This is a demo-environment operation. It is the one place in the application       │
│     where recorded history is removed, and it removes ALL of it — it cannot remove     │
│     or alter a single entry. Append-only holds within a run.                            │
│                                                                                        │
│   Type RESET to confirm  [                    ]        [ Reset environment ]          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

The reset copy is careful for a reason: an evaluator who sees a "reset" button next to an append-only claim will ask about it. The wording states that reset is **wholesale and environmental**, never selective — it cannot be used to remove or edit one inconvenient entry (US-6.3, US-12.4).

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Rule list as a configuration table with policy reference and version | List screen | Rules must read as data on first glance |
| Primary | Type-aware parameter form | Editor, left | No free-form JSON required; a typo cannot silently disable a check |
| Primary | Impact preview with per-shipment changes | Editor, right | *"Preview the effect before trusting it"* — and zero writes |
| Primary | Field-level validation messages | Inline, per parameter | Names the parameter and the constraint |
| Primary | Change note (required) | Editor, bottom-left | Rule changes are governance events and carry justification discipline |
| Secondary | Enable/disable with its own confirmation copy | Editor footer | The most consequential single-click change |
| Secondary | Rule history with before/after diffs | Link from the editor | Configuration drift is traceable |
| Secondary | Health check with AI-fallback status | Environment screen | Pre-demo signal; she must not find out mid-demonstration |
| Tertiary | Raw `params_json`, read-only | Editor, beneath the form | Transparency without an editing path |
| Tertiary | Standing notes: three types only, no deletion | List footer | Scope discipline is a recorded decision, visible on the surface |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading | Table skeleton with real headers | `aria-busy` |
| Ready | As wireframed | Result count |
| Empty (unreachable with seed data) | Panel + **Create rule** | *"No rules are configured. Validation would flag nothing."* |
| Draft edited, not previewed | **Apply** disabled with a visible reason | *"Run a preview on this draft before applying."* |
| Preview running | Preview panel inline progress | *"Evaluating 14 shipments…"* |
| Preview: no changes | Preview panel states it plainly | *"This change would not alter any current exception or priority."* |
| Preview truncated | Table footer | *"Showing 100 of 214 changes."* |
| Preview too large | Error in the preview panel | *"Impact preview is limited to 500 shipments."* |
| Validation failed | Banner + field-level errors; **prior rule set remains in effect**; no partial state | see wireframe |
| Duplicate name | Field-level error on Name | *"A rule named 'HTS code completeness' already exists."* |
| Type change attempted | Field is `readonly` with a lock glyph; server would return `RULE_TYPE_IMMUTABLE` | *"A rule's exception type cannot be changed."* |
| Change note missing | Field-level error; submit disabled | *"A change note is required for rule changes."* |
| Saving | Buttons show inline progress; form locked | *"Saving…"* |
| Saved, revalidation ok | Apply-result panel | see wireframe |
| Saved, revalidation partly failed (`207`) | Apply-result panel with a warning section naming the failed shipments and a per-shipment revalidate link on F18 | *"Rule saved at version 4. 1 shipment failed revalidation; the configuration change is durable."* |
| Enable/disable redundant | Inline error | *"Rule rule-hts-completeness is already enabled."* |
| Non-administrator reaches the route | Inline 403 view; nav entry absent | *"Rule Administration requires the System Administrator role. You are acting as Cargo Specialist."* |
| Health check degraded | Amber row naming the subsystem; shell banner active | see Environment wireframe |
| Reset confirmation not typed | **Reset environment** disabled | *"Type RESET to confirm."* |
| Reset running | Full-screen in-frame progress; navigation locked | *"Reseeding… do not navigate away."* |
| Reset complete | Result panel + link to the queue | *"Pristine seeded state restored. 14 shipments, canonical scenario present."* |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| Rule row | Selectable | → `/admin/rules/:ruleId` |
| Exception type / Enabled / Severity filters | Multi-select | Server-side re-query |
| **Create rule** | Primary button | Empty editor; `exception_type` selectable **once**, from exactly three options |
| Parameter fields | Type-aware inputs | Rendered from the type's `params_schema`; dependent fields disable when their gate is off |
| **Preview impact** | Primary button | `POST /api/rules/{id}/preview-impact`; zero writes |
| **Apply with revalidation** | Primary button | Enabled only after a successful preview on the current draft |
| **Apply without revalidating** | Checkbox modifier | Sets `revalidate_affected = false`, with the consequence stated inline |
| **Disable / Enable rule** | Secondary button → confirmation | Own audit event type and own copy: *"Disabling stops this rule firing on future evaluations. Existing exceptions keep their evidence and their rule version."* |
| **View rule history** | Link → in-frame drawer | Append-only `RULE_CREATED` / `RULE_UPDATED` / `RULE_ENABLED` / `RULE_DISABLED` entries with before/after diffs, administrator identity, timestamp, change note |
| **Re-run check** | Secondary button | Re-issues `GET /api/health` |
| **Reset environment** | Destructive button, typed confirmation | `RESET` must be typed; in-frame progress; no `window.confirm` |
| **Go to Exception Queue** | Forward link on the apply result | → `/queue` |

**No delete control exists anywhere on this surface.** Not in the list, not in the editor, not in an overflow menu (FRD F15 §Validation).

---
## Interaction Patterns

These are the reusable behaviours that make the four screens coherent. Each is defined once and consumed by every screen chunk. Implementations map to the shared components in FRD F16 §Shared component contracts.

---

### Pattern: Authorship Banding

**When to use:** Any time content is rendered whose author matters — which, on these four screens, is all content.
**User Stories:** US-2.2, US-6.1, US-9.9, US-12.1
**Requirement:** *AI-authored content must be visually distinguishable from human-authored content and from deterministic system output at a glance. Never let an AI summary look like an official finding.*

Three bands. Every content block belongs to exactly one, and bands never nest **except** for the one deliberate case documented below.

```
┌─ SYSTEM BAND ────────────────────────────────────────────────┐
│ ⚙ SYSTEM · VALIDATION RESULTS                                │  solid thin border
│ ──────────────────────────────────────────────────────────── │  label-value / tabular
│ hts_code    raw "8541.40"  →  norm "854140" (6 digits)       │  monospace values
│ rule.expected_digit_count = 10                                │  NO prose
└──────────────────────────────────────────────────────────────┘

┃┌─ HUMAN BAND ────────────────────────────────────────────────┐
┃│ 👤 HUMAN DECISION · Marisol Reyes (Cargo Specialist)         │  SOLID 3px left rule
┃│ ──────────────────────────────────────────────────────────── │  neutral surface
┃│ "Certificate of origin received 6 Sep resolves the           │  verbatim quotation
┃│  documentary gap…"                                            │
┃└─────────────────────────────────────────────────────────────┘

╎┌─ AI BAND ───────────────────────────────────────────────────┐
╎│ ✦ AI-GENERATED · ADVISORY                                    │  DASHED 3px left rule
╎│ ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨ │  hatched header strip
╎│ AI suggests: Escalate to supervisor                           │  tinted surface
╎│ Model confidence: MEDIUM                                      │
╎│ ──────────────────────────────────────────────────────────── │
╎│ AI-generated · not a finding · no action has been taken       │  MANDATORY footer
╎│ Provider: openai · Model: gpt-4o · Mode: LIVE · 14:22:14 UTC  │  MANDATORY provenance
╎│ Evidence inputs: 2 exceptions, 5 evidence rows, evaluation v2 │
╎└─────────────────────────────────────────────────────────────┘
```

**Behaviour:**

| Rule | Detail |
|---|---|
| Four simultaneous signals | Icon (`⚙` / `👤` / `✦`), text label, border style (solid / solid-thick-left / **dashed**-thick-left), and surface treatment (plain / neutral / tinted + hatched header). **No band is identified by colour alone**, so the distinction survives a colour-blind reader, a projector, and a monochrome print (PRD §6 Accessibility). |
| Mandatory AI header chip | `AI-GENERATED · ADVISORY`. An AI block without it is a defect. |
| Mandatory AI footer | The words *"AI-generated · not a finding"* plus provider, model, generation mode, timestamp, and evidence inputs. Provenance is not a tooltip and not a disclosure — it is always rendered (PRD §6 Explainability; US-2.2). |
| Vocabulary discipline | AI blocks use *suggests*, *recommends*, *advisory*, *rationale*. They must **never** use *finding*, *determination*, *decision*, *conclusion*, *result*, *verdict*, or *approved*. Those words belong to system findings and human decisions respectively. |
| Never wrap human text in the AI band, and never wrap AI text in the human band | `AiContentLabel` must never wrap human-authored text (FRD F16). A justification is human, always, even when it agrees with the model. |
| Never render AI prose and human prose in the same container | Adjacent, yes. Same card, no. |
| The one permitted nesting | On the audit screen, field 3 of a **human decision** entry is the AI recommendation that was on screen at decision time. It renders as a nested AI band **inside** the human entry, with its own full provenance and the concurrence verdict. This is required: the record must show what the human was advised, and it must be unmistakable which part of the entry is the machine's (FRD F20 §Process step 4). |
| Loading state carries the band | An AI panel loading renders its **skeleton inside the AI band with the label already visible**. A half-loaded screen must not be able to present machine text as a finding. |
| Fallback mode adds, never replaces | `OFFLINE FALLBACK` renders as an additional sub-chip and `Mode: FALLBACK_DETERMINISTIC` in the provenance line. The `AI-GENERATED · ADVISORY` chip stays. |

**Where used:** Shipment Review (AI summary), Recommended Resolution (AI recommendation), Decision & Audit Record (every AI entry plus field 3 of human decision entries).

---

### Pattern: Confidence Display

**When to use:** Wherever an AI recommendation is shown.
**User Stories:** US-2.4, US-9.7, US-12.1
**Requirement:** *Confidence level must be shown without implying the AI has authority.*

```
╎ Model confidence: MEDIUM
╎ Basis: the origin conflict is supported by two independent field values, but the
╎  certificate of origin does not reconcile them, so the disposition depends on
╎  judgment the model cannot make.
╎ Contributing factors
╎  · 2 exceptions retained at evaluation v2
╎  · required document now received
╎  · shipment value above threshold
╎ ──────────────────────────────────────────────────────────────────────────────
╎ ⓘ Confidence describes the model's own certainty about its own output. It confers
╎   no authority, carries no approval weight, and does not change what you may do.
```

**Behaviour:**

| Rule | Detail |
|---|---|
| Always inside the AI band | Confidence never appears in a screen header, a case header, a queue row, or a status badge. It is not a property of the shipment; it is a property of a model output. |
| Always with its basis | A confidence badge without its `confidence_basis` sentence is a defect (FRD F19 §Validation). |
| Always with the fixed caption | The caption above is fixed copy, rendered every time, in both roles. |
| Words, not a dial | `HIGH` / `MEDIUM` / `LOW` as text plus a three-step rank glyph. **No percentage**, no gauge, no progress bar, no traffic-light. A numeric score invites arithmetic on a judgment. |
| Never green-for-go | Confidence must not be encoded on a good/bad axis. High confidence in *"escalate"* is not a positive outcome. Use the same neutral treatment for all three levels; distinguish them by label and rank glyph only. |
| Never gates a control | No action is enabled, disabled, defaulted, pre-selected, emphasised, or de-emphasised as a function of confidence. Availability comes from role and state, never from the model. |
| Never aggregated | No "average confidence" anywhere. No confidence column in the queue. Confidence does not roll up. |
| Recorded, not scored | On the audit record, confidence is reproduced as it stood at decision time, inside the nested AI band, with the concurrence verdict beside it and the explicit note that concurrence is not a quality signal. |

---

### Pattern: Disabled Action with Visible Reason

**When to use:** Any control the acting role or the current state forbids.
**User Stories:** US-3.7, US-8.2, US-8.3, US-12.6 · **PRD §6 Usability**
**Requirement:** *Actions the current role may not take must be visibly disabled with the reason stated — not hidden.*

```
  ○ Send for specialist review                              [ UNAVAILABLE 🔒 ]
      The case is already in this state.

  ○ Recommend clearance                                     [ UNAVAILABLE 🔒 ]
      This case has been escalated; only a Supervisor can act on it.
```

**Behaviour:**

| Rule | Detail |
|---|---|
| The reason occupies layout space | Rendered as a paragraph beneath the control. **Never tooltip-only**, never `title=`, never hover-revealed (FRD F16 `DisabledActionButton`). A projector audience and a keyboard user must both read it. |
| Three simultaneous signals | Disabled styling, the word `UNAVAILABLE`, and a lock glyph. Not greyness alone. |
| Reason text comes from the server | Drawn from `GET /api/cases/{id}/available-actions`, using the fixed reason strings in F09a §5. The client never invents copy, so the screen and the server can never disagree about why. |
| Focusable, not selectable | The control remains in the tab order with `aria-disabled="true"` and the reason associated via `aria-describedby`, so a screen-reader user hears the reason. `Space`/`Enter` do nothing. |
| The set never shrinks | All five workflow actions render on every visit, in the same order, in the same place. A shortened list is a defect. |
| Re-renders in place | After an escalation, the five cards stay five and become closed with reasons. They do not disappear or collapse into a single message. This is how the operator learns the boundary is real (Flow 4). |
| Applies to every role | Including the administrator: on Review and Resolution every action control is disabled with *"System Administrators do not adjudicate shipments."* Her boundary is as visible as the specialist's. |
| The one documented exception | `APPROVE_CLEARANCE` is **not** rendered as a disabled control for Cargo Specialists, because it is not one of the five and rendering it would misdescribe the action space. The boundary is carried by the Authority Chain rail instead. See `00-overview.md` §Role → Surface Matrix for the full reasoning. |

---

### Pattern: Authority Chain Rail

**When to use:** The Recommended Resolution screen, every render, every role.
**User Stories:** US-5.1, US-12.2, US-12.3
**Requirement:** *A specialist can never reach "Cleared"; the clearance path always routes through supervisor approval. Make that visible in the UI, not just enforced server-side.*

```
  ①  RECOMMEND              ②  SUPERVISOR APPROVAL         ③  CLEARED
     ▶ You are here            🔒 Not your authority          ⬤ Only reachable
     Marisol Reyes                Supervisor role required      through step ②
     (Cargo Specialist)           A supervisor other than
                                  you must approve.
  ────────────────────────▶  ─────────────────────────────▶

  Your role cannot set this shipment to Cleared. There is no action on this screen,
  and no path anywhere in the application, that does so.
```

**Behaviour:**

| Rule | Detail |
|---|---|
| Always three steps | The chain is a property of the system, not of the case. It renders identically for a `NEW` case and a `PENDING_APPROVAL` one; only the position marker moves. |
| The marker is the acting user, by name | `▶ You are here — Marisol Reyes (Cargo Specialist)`. Not "your role" in the abstract. |
| Closed steps state the requirement, not just the denial | *"Supervisor role required. A supervisor other than you must approve."* Two facts: the role, and the distinctness. |
| Supervisor view marks step ② as theirs and names the consequence | *"Approving makes you the recorded approving official on this clearance."* |
| Recommender-supervisor view marks step ② closed | Even for a supervisor, if they authored the recommendation the step reads `🔒 You submitted this recommendation and cannot decide on it.` |
| Post-clearance the rail is a history | `① ✔ Marisol Reyes → ② ✔ Dwayne Okafor → ③ ⬤ Cleared 6 Sep 14:41 UTC` |
| Never a progress bar the user can advance by clicking | The rail is not interactive. Steps are not buttons. |

---

### Pattern: Mandatory Justification

**When to use:** Every workflow action and every approval decision.
**User Stories:** US-12.5, US-3.1, US-5.4
**Component:** `JustificationInput` (FRD F16)

**Behaviour:**

| Rule | Detail |
|---|---|
| Never prefilled | Empty on arrival, always. No template, no placeholder that could be submitted, no "suggest a justification" affordance anywhere in the product. |
| Never populated from the AI rationale | There is no copy-from-AI control. A submission whose justification exactly matches the AI rationale is rejected server-side with `JUSTIFICATION_NOT_AUTHORED` and surfaced inline (FRD F19 §Validation). |
| Action-specific minimum, shown live | `0 / 40 minimum` counter, updating as she types. 10 characters default; **40** for `CLEAR_EXCEPTION` with `resolution_basis ∈ {EXCEPTIONS_ACCEPTED, MIXED}` and for supervisor `Reject`. |
| Submit disabled until valid | Not "submit and get an error". The gate is visible before the attempt. |
| Standing note beneath the field | *"Write your own reasoning. This text is recorded verbatim under your name and is not prefilled from the AI rationale."* |
| Preserved on every rejection | Any server rejection leaves the typed text intact. A live demo cannot afford retyping 400 characters (FRD F19 §Validation). |
| Rendered verbatim forever after | On the audit record and in the supervisor's pending-recommendation panel, never truncated, never summarised, never paraphrased. |

---

### Pattern: Post-Action Confirmation with a Single Forward Affordance

**When to use:** After any successful workflow action, approval, upload, or revalidation.
**User Stories:** US-11.5 – US-11.9, US-11.11, US-2.5 · **Principle P7**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✔ Recorded.                                                                  │
│   SHP-2026-0007 is now ◫ Pending approval.                                   │
│   Your decision DIVERGED from the AI advice. This is recorded.                │
│   Audit entry #10 written · notification generated to the Supervisor role.    │
│   You have no further action on this case until a supervisor decides.         │
│                                                                              │
│   [ View audit record ]                          [ Back to Exception Queue ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Behaviour:** states **what was recorded**, **the resulting status**, **the concurrence verdict**, **the audit and notification side-effects**, and **what the operator can and cannot now do**. Then exactly one primary forward affordance, so the next walkthrough step is never ambiguous. Announced via `aria-live="polite"`. Never a toast that disappears before a presenter finishes a sentence — confirmations of state changes are panels, not transients. Toasts are reserved for non-decision events (refresh, concurrency reload, export failure).

---

### Pattern: Change Indication After Revalidation

**When to use:** After any revalidation, whether upload-triggered, manual, or rule-change-triggered.
**User Stories:** US-9.6, US-1.6, US-1.7, US-11.7

```
⟳ Revalidated 6 Sep 14:22 UTC — evaluation v2
  1 exception resolved · 2 retained · 0 new              [ Compare v1 → v2 ]
```

**Behaviour:** resolved / retained / new counts are **always all three stated**, even when a count is zero. Resolved exceptions are marked `Resolved by revalidation` and **moved** into the collapsed Resolved disclosure — never deleted. Retained exceptions stay in place with their evidence intact, and gain an `Updated` marker when their evidence set or missing-information list changed. A silent refresh is a defect. **There is no success state on any screen that reads as "clean"** while an exception is still firing — this is the failure mode that would kill Marisol's trust in the tool permanently (JRN-01.3 Risk of Abandonment).

---

### Pattern: In-Frame Overlays (no popups)

**When to use:** Dialogs, drawers, confirmations. Always.
**Constraint:** Principle P8 — embedded iframe, sandboxed preview.

| Overlay | Use | Behaviour |
|---|---|---|
| **Dialog** (centred, ≤560px, ≤80% frame height, internally scrollable) | Request information, upload, clear-exception confirmation, reset confirmation | Focus trapped; `Escape` closes; focus returns to the trigger; scroll locked on the content region only |
| **Drawer** (right-edge, ≤480px, full frame height) | View triggering rule, evaluation diff, rule history, role switcher, notification list | Same focus rules; does not obscure the case header |
| **Inline panel** | Impact preview, post-action confirmation, error views | Not an overlay at all — preferred whenever the content is part of the task rather than an interruption |

**Prohibited absolutely:** `window.open`, `target="_blank"`, `window.confirm`, `window.alert`, `window.prompt`, the Fullscreen API, `window.print()` on any route other than the dedicated printable view, and any pattern that assumes the visual viewport equals the browser window.

---

### Pattern: Skeleton Loading That Reserves Layout

**When to use:** Every data-backed view.
**Requirement:** FRD F16 §Validation — *"Loading states MUST reserve the eventual layout's space so content does not jump — a live demo cannot afford a mis-click caused by reflow."*

**Behaviour:** skeletons replicate the eventual structure at final dimensions — real column headers on the queue table with placeholder rows at final row height; four panel outlines at final size on Review; exception-card and decision-panel outlines on Resolution. **Never a centred spinner** that collapses to zero height and reflows on arrival. Regions carry `aria-busy="true"`. Panels resolve independently: on Shipment Review the five non-AI calls render as they arrive while the AI panel holds its labelled skeleton, so evidence is never gated behind the narrative.

---

### Pattern: Error Surfacing

**When to use:** Every failure.
**Requirement:** FRD F16 §Validation

| Failure class | Surface | Copy shape |
|---|---|---|
| Field validation | Inline, beneath the field; submit stays disabled | Names the field and the constraint: *"40 characters minimum for this action. 12 entered."* |
| Action rejected (state / role / guard) | Inline in the open dialog or on the control; the control becomes disabled with the reason | Names the status and the attempted action: *"Cannot request information on a case in status Cleared."* |
| Upload rejected | Inline in the open dialog; **dialog stays open**; no panel state changes | Names the specific reason and the accepted set: *"File content does not match its declared type. Accepted: PDF, PNG, JPEG."* |
| Fetch failed | Error panel replacing the region, with **Retry** | Error code as human copy + `request_id`: *"The queue could not be loaded. Reference: req_8f3c1a."* |
| Concurrency | Toast + automatic refetch; the action is **not** retried silently | *"This case changed; reloading."* |
| Authorisation | Inline 403 view naming the acting role and the required role; navigation stays usable | *"Rule Administration requires the System Administrator role. You are acting as Cargo Specialist."* |
| Integrity | Prominent banner; **the underlying content still renders** | *"Audit chain verification failed at entry #7. The record is displayed unmodified."* |

**Universal rules:** every error shows the server's `code` translated to human copy plus the `request_id`. **No raw stack traces, ever.** No generic *"Something went wrong"*. Every rejection is non-destructive and says so where a partial state would otherwise be suspected. Errors never clear user input.

---

### Pattern: Read-Only by Construction

**When to use:** The Decision & Audit Record screen; any cleared case; the printable view.
**User Stories:** US-6.3, US-12.4 · **Principle P6**

**Behaviour:** the property is achieved by **absence of affordances**, not by disabling them. Concretely: no icon buttons in entry headers, no hover states that reveal controls, no inline-editable fields, no context menu, no drag handles, no multi-select with a bulk action bar, no "…more" truncation on justifications that could read as an editor. The only controls are read controls — filter, disclose, verify, export, print — and a `READ-ONLY · APPEND-ONLY` chip states the property in words. On a **cleared case** the Review and Resolution screens replace their action panels with a read-only disposition summary rather than disabling twelve controls: at terminal state there is nothing to explain, only a disposition to report.

---

### Pattern: Simulation Boundary Labelling

**When to use:** Everywhere, permanently.
**User Stories:** US-7.2, US-12.7 · **PRD §8**

| Marker | Placement | Copy |
|---|---|---|
| Demo-mode chip | Shell header, non-dismissible | *"Demo — synthetic data, simulated login, notifications not transmitted"* |
| Simulated-login note | Role gate, beneath the user list | *"Simulated login. No PIV/CAC, no SSO. The selected identity is recorded on every action you take."* |
| Notification label | Every notification, in-app list and audit record | *"Generated, not transmitted"* |
| Document provenance | Every document row | `Seeded` / `Ingested` / `Uploaded this session` + the standing note that no importer correspondence path exists |
| AI-fallback banner | Shell, non-dismissible while the condition holds | *"AI assistance is running in offline fallback mode…"* |
| Print header | Every page of the printable view | *"DEMO ARTEFACT · SYNTHETIC DATA · SIMULATED LOGIN · NOTIFICATIONS NOT TRANSMITTED"* |

Angela must never mistake the demo for production, and an exported record must never be able to circulate as a production record (PER-04 success criteria).

---
## Responsive Considerations

### The governing constraint: an iframe in a sandboxed preview

The application is embedded in an **iframe inside a sandboxed preview environment**. This is not a normal responsive-web problem; it changes what the layout may assume:

| Assumption normally safe | Why it fails here | Design response |
|---|---|---|
| The viewport is the browser window | The frame is a sub-region of someone else's page, of unknown and changeable size | Layout responds to the **container**, not the viewport. Use container queries or a measured root width; never `100vw`/`100vh` for structural sizing |
| A popup or new tab is available | `window.open` and `target="_blank"` may be blocked by the sandbox; a popup that does open lands outside the demo frame and derails a live walkthrough | **All overlays are in-frame.** The printable view is an in-frame route, not a new tab |
| Fullscreen is available | The Fullscreen API is commonly disabled in sandboxed frames | No fullscreen affordance anywhere; density is solved by layout, not by escaping the frame |
| `position: fixed` pins to the window | Inside a frame it pins to the frame, which is usually what is wanted — but nested scroll containers make it unreliable | Sticky headers use `position: sticky` within an explicitly scoped scroll container |
| The frame is tall | Embedded previews are frequently 600–700px tall | The **primary content region owns the vertical scroll**; the shell header, banners, and navigation do not scroll away the operator's identity |
| Browser zoom / OS text scaling is the user's business | A presenter may zoom to make a projector readable, which shrinks the effective container | Layout must survive 200% zoom at the design baseline without horizontal scrolling of the primary content region |

**Design baseline: 1280 × 720 container.** **Supported range: 1024–1920px wide, 600px+ tall.** FRD F16 §Validation requires responsiveness from 1024px to 1920px and usability in an embedded iframe **with no horizontal scrolling of the primary content region**. Below 1024px the layout degrades gracefully rather than breaking (see Narrow below), but 1024px is the supported floor because these are desk-browser, keyboard-first personas (PER-01: *"She works from a desk browser, keyboard-first"*).

---

### Desktop / wide (≥ 1440px container)

- **Shell:** persistent left navigation rail at 240px, expanded with section labels.
- **Queue:** all seven columns visible — Shipment ID, Importer, Exception(s), Priority, Status, Age, Assigned to. Shipment value in a row disclosure.
- **Shipment Review:** two columns. Left (≈45%): entry data, documents. Right (≈55%): AI summary above validation results. All four panels visible without scrolling at 900px+ height.
- **Recommended Resolution:** two columns. Left: exception cards. Right: AI recommendation. Authority Chain rail full width above both. Decision panel full width below.
- **Audit Record:** single-column timeline at a max content width of 960px, so long justifications stay readable; header blocks in a three-across row.
- **Rule Administration:** editor and impact preview side by side.

### Standard (1024–1440px container) — **the design baseline**

- **Shell:** navigation rail at 200px; section labels retained.
- **Queue:** `Assigned to` collapses into a row disclosure. The five PRD-mandated columns plus Age are **never** dropped at any width — a build that omits any of the five fails acceptance (FRD F17 §Validation).
- **Shipment Review:** two columns retained, ratio shifts to 40/60 to protect the validation-results panel, which is the panel the 30-second comprehension target depends on.
- **Recommended Resolution:** two columns retained down to 1100px, then the AI recommendation block moves **beneath** the exception cards and above the governance notice. Reading order is preserved: findings → advice → governance notice → decision panel. The AI block must never end up below the decision panel, where it would read as a justification for a choice already made.
- **Audit Record:** header blocks stack to two-across; timeline unchanged.
- **Rule Administration:** impact preview moves beneath the definition form and auto-scrolls into view when it resolves.

### Narrow (< 1024px container) — graceful degradation, not a supported target

- **Shell:** navigation rail collapses to an icon rail with an in-frame expand drawer. The **acting-user chip and role remain visible at every width** — a screen that renders without them is a defect (FRD F16 §Validation), so the identity block wraps to a second header line rather than truncating or hiding behind a menu.
- **Queue:** the table becomes a **stacked card list**, one card per shipment, each carrying all five mandated fields as labelled rows. It does **not** become a horizontally scrolling table — a presenter cannot discover a column that is off-screen.
- **Shipment Review / Recommended Resolution:** single column in the fixed order: header → banners → Authority Chain (Resolution) → system findings → AI block → governance notice → decision panel / action bar.
- **Audit Record:** single column; evidence disclosures stay collapsed by default; the eight fields stack as label-above-value pairs.
- **Rule Administration:** single column; **Apply** remains gated on a preview having been run.

### Mobile (< 768px)

**Not a supported target.** PRD §5.8 excludes mobile-native applications and the product is web-first for desk-based specialists. The narrow layout above prevents a catastrophic render if a frame is unexpectedly small, but no design work is committed below 768px and no acceptance criterion is evaluated there.

---

### Vertical space discipline

Embedded frames are short. Priority order for scarce vertical space:

1. Shell header with the acting user and role — **never scrolls away**.
2. Non-dismissible banners (AI fallback, degraded subsystem) — pinned beneath the header.
3. The case header on case-scoped screens — `position: sticky` within the content scroll container, so the operator never loses which shipment they are looking at while scrolling evidence.
4. On Recommended Resolution: the Authority Chain rail is sticky **with** the case header at heights ≥ 700px; below that it scrolls, because the decision panel must be reachable.
5. Everything else scrolls.

The Demo Guide strip is collapsible precisely so a short frame can reclaim its two lines, and the collapse state persists for the session.

### Reflow prohibitions (live-demo requirements)

- **No layout shift on data arrival.** Skeletons reserve final dimensions. A presenter must never mis-click a row that moves under the cursor (FRD F16 §Validation).
- **No content-dependent column widths** on the queue. Column widths are fixed proportions so row order and cell positions are stable across reloads and across demo runs — the visual companion to deterministic server-side sorting.
- **No auto-scroll except one case:** the impact-preview panel on Rule Administration scrolls into view when it resolves, because it appears below the fold on the baseline layout and is the whole point of the interaction.
- **Long values wrap, never truncate silently.** Manufacturer addresses, policy references, and justifications wrap. Justifications are **never** truncated with an ellipsis anywhere in the product (FRD F20 §Validation).
- **Tables never scroll horizontally.** If a column will not fit, it moves into a row disclosure or the layout switches to stacked cards.

### Print

The only print target is `/shipments/:shipmentId/audit/print`.

- `@media print`: shell, navigation, toolbar, and the Back link are hidden; the demo-artefact banner repeats on every page.
- All disclosures render **expanded** — collapsed evidence in a printed record would be an omission.
- Authorship is carried by **words and rule-lines only**. Background tints must not be relied on, because a monochrome print or a low-toner printer would erase the AI/human distinction — the single most important thing on the page.
- Page breaks avoid splitting an audit entry card; `break-inside: avoid` per entry.
- Triggered by `window.print()` **from this route only**, after in-frame navigation. No popup, no new tab, no PDF toolchain (there is none in this environment, and none is to be installed).

---
## Accessibility Notes

**Target:** WCAG 2.1 AA (PRD §6 Accessibility). Keyboard-navigable across all four primary screens; semantic headings and table markup; status and priority conveyed by text/label, not colour alone; 4.5:1 body contrast and 3:1 for large text and UI boundaries.

Accessibility here is not only a compliance obligation — it is load-bearing for the demo. PER-01 is keyboard-first by habit. The walkthrough will be shown on a projector where colour fidelity is poor. And the authorship distinction (`Y0-patterns.md` §Authorship Banding) is the product's central governance claim, so it **must not depend on colour** or it can be destroyed by a bad projector.

---

### Colour and contrast

| Requirement | Detail |
|---|---|
| Body text | ≥ 4.5:1 against its surface, including text on the **tinted AI band surface** — the tint must be light enough to keep the AI prose readable, which is a constraint on the tint, not on the text |
| Large text and UI boundaries | ≥ 3:1, including all band borders, focus rings, badge outlines, table row separators, and disabled-control borders |
| Disabled controls | Disabled action buttons must still meet **4.5:1 for their reason text**. The reason is information, not decoration, and must not be washed out by disabled styling — this is the most commonly failed detail in a disabled-with-reason pattern |
| **Nothing encoded by colour alone** | Every state carries text and/or shape: `StatusBadge` = label + distinct shape; `PriorityIndicator` = label + rank glyph; `ExceptionTypeChip` = type name; authorship = icon + text label + border style + surface treatment; resolved/retained/new = words plus markers; concurrence = the sentence *"AGREED with"* / *"DIVERGED from"*, never a green/red dot |
| Severity | `HIGH` / `MEDIUM` / `LOW` as words. No colour-only severity |
| Confidence | `HIGH` / `MEDIUM` / `LOW` as words plus a rank glyph, and explicitly **not** on a good/bad colour axis (`Y0-patterns.md` §Confidence Display) |
| Error, warning, success | Icon + text label + copy. `✔`, `⚠`, `✕`, `🔒`, `⛔` each paired with words |
| Projector test | The queue and the audit timeline must remain fully interpretable in greyscale. This is a release check, not an aspiration: screenshot both screens desaturated and confirm every status, priority, exception type, and authorship band is still identifiable |

---

### Keyboard navigation

FRD F16 §Validation: visible focus rings, logical tab order, skip-to-content link, `Escape` closing overlays, `Enter`/`Space` activating controls. All four primary screens must be fully operable without a pointer.

| Surface | Keyboard behaviour |
|---|---|
| Shell | Skip-to-content is the **first** tab stop, jumping to `<main>`. Tab order: skip link → header (demo chip is not focusable; notification bell → acting-user chip → role switcher) → banners' Retry if present → Demo Guide collapse → navigation rail → main content |
| Navigation rail | `Tab` into the rail, arrow keys move within the link group, `Enter` activates. Disabled case-scoped entries are focusable with `aria-disabled="true"` and announce the group-level reason |
| Queue table | `Tab` moves to the table, then `↑`/`↓` move between rows with a **visible focus ring on the row itself**, not only on an inner link. `Enter` or `Space` opens the focused row. `Home`/`End` jump to first/last row. Column sort controls are buttons with `aria-sort` on the `<th>` |
| Filters | Popovers open on `Enter`/`Space`, trap focus, close on `Escape` returning focus to the trigger. Checkbox groups navigate with arrows. Applied-filter chips are buttons; their `⊗` is reachable and labelled *"Remove filter: Priority High"* |
| Shipment Review | Panels are `<section>` landmarks with headings, reachable via heading navigation. Document rows are list items; the upload control on an outstanding request is a normal tab stop |
| Upload / request dialogs | Focus moves to the dialog's first interactive element on open; focus is **trapped**; `Escape` closes and returns focus to the trigger; the submit control's disabled state and reason are announced |
| Recommended Resolution — action cards | A **single radio group**. `Tab` enters the group at the selected item, or the first available item when nothing is selected. Arrow keys move within the group; `Space` selects. Unavailable cards are **focusable but not selectable**, with `aria-disabled="true"` and the reason associated via `aria-describedby`, so a screen-reader user hears *why* rather than skipping past silently |
| Justification textarea | Normal tab stop; the live character count is associated via `aria-describedby` and updates are **not** announced on every keystroke (`aria-live="off"` on the counter); the under-minimum error is announced once on blur |
| Clear-exception confirmation | Focus moves to the dialog; `Back` returns focus to the decision panel with input intact |
| Approval controls | Own radio group beneath the pending-recommendation panel; the evidence-changed acknowledgement checkbox is a tab stop and its requirement is announced via the submit control's `aria-describedby` |
| Audit timeline | A semantic `<ol>` of `<li>` entries — **not** presentational `<div>`s (FRD F20 §Validation). Each entry has an `<h3>` so heading navigation walks the case history. `Show all evidence` is a `<button aria-expanded>` |
| Printable view | `Back to record` is the first tab stop; `Print / Save` the second |
| Drawers | Right-edge drawers behave as dialogs: focus trapped, `Escape` closes, focus restored |
| No keyboard traps | Every overlay is escapable; no component captures `Tab` without a documented exit |
| No pointer-only interaction anywhere | Row selection, sorting, filtering, action selection, disclosure, upload, export, print — all keyboard-reachable |

---

### Semantic structure

| Requirement | Detail |
|---|---|
| Landmarks | `<header>`, `<nav>`, `<main>`, and a `<footer>` where present. One `<main>` per route, the skip-link target |
| Heading hierarchy | No skipped levels. `<h1>` = screen name (*"Cargo Exception Queue"*, *"Shipment Review — SHP-2026-0007"*); `<h2>` = panel titles; `<h3>` = exception cards and audit entries; `<h4>` = field groups within an entry |
| Tables | Real `<table>` with `<caption>`, `<thead>`, and `<th scope="col">` on the queue; `aria-sort` on the active sort column. Row selection is implemented as an accessible row, not a `<div>` grid |
| Lists | Documents panel, exception lists, evidence rows, and the audit timeline are semantic lists. Evidence rows are a description list (`<dl>`) of field path → value, so the label/value relationship is programmatic rather than visual |
| Forms | Every input has a real `<label>`. Required fields carry `aria-required="true"` and a visible *(required)*, not an asterisk alone. Errors use `aria-invalid` plus `aria-describedby` pointing at the message |
| Buttons vs links | Navigation is `<a href>` (so deep links work and are copyable); actions are `<button>`. Never a `<div onclick>` |
| Icons | All glyphs are decorative (`aria-hidden="true"`) and accompanied by text. **No icon-only controls anywhere in the product** |
| Language | `lang="en"` on the root |

---

### Screen-reader considerations

| Requirement | Detail |
|---|---|
| Authorship must be announced, not inferred | The band label is **real text**, first in the block's reading order: *"AI-generated, advisory"* / *"Human decision, Marisol Reyes, Cargo Specialist"* / *"System finding, deterministic rule evaluation"*. A sighted user gets the border and the tint; a screen-reader user gets the same information as words, in the same position |
| AI provenance is read, not hidden | The provider/model/mode/timestamp footer is in the accessibility tree, not `aria-hidden` decoration. It may be visually compact but must be readable |
| `aria-live="polite"` regions | The notification indicator's unread count; post-action confirmations; the revalidation change banner; filter result counts; chain-verification results (FRD F16, F18, F20 §Validation) |
| Never `aria-live="assertive"` | Nothing in this product warrants interrupting a screen-reader user mid-sentence |
| Loading | `aria-busy="true"` on the loading region, removed on resolve. Skeletons are `aria-hidden`; the region carries an accessible name such as *"Loading queue"* |
| Disabled reasons | Associated via `aria-describedby` so they are announced with the control, satisfying the requirement that the reason is *stated* rather than merely present in the DOM near the button |
| Status changes in the audit record | Announced as words: *"Status changed from Pending approval to Cleared"*, not as two adjacent badges with an arrow glyph |
| Confidence | Announced as *"Model confidence: Medium"* followed by the basis sentence and the authority caption. The rank glyph is `aria-hidden` |
| Counts | *"2 open exceptions, 1 resolved"* as text, not as a bare numeral in a badge |
| Justifications | Read in full. Never truncated in the DOM with the remainder behind a control, because a screen-reader user must be able to read the record linearly (US-6.4) |
| Empty states | Announced with their explanatory copy and their remedial action, not as an empty region |

---

### ARIA inventory

| Element | ARIA |
|---|---|
| Skip link | `<a href="#main" class="visually-hidden-focusable">` |
| Navigation rail | `<nav aria-label="Primary">`; active route `aria-current="page"`; disabled entries `aria-disabled="true" aria-describedby="case-scope-reason"` |
| Acting-user chip / role switcher | `<button aria-haspopup="dialog" aria-expanded>`; drawer `role="dialog" aria-modal="true" aria-labelledby` |
| Notification bell | `<button aria-haspopup="menu" aria-expanded>`; count in an `aria-live="polite"` span with an accessible name *"3 unread notifications"* |
| Banners | `role="status"` for the AI-fallback and demo banners (not `role="alert"` — they are persistent conditions, not events); `role="alert"` for the API-unreachable banner |
| Queue table | `<table>` + `<caption class="visually-hidden">`; sortable `<th aria-sort="descending">`; rows `tabindex="0"` with `aria-label` summarising the row |
| Filter popovers | `<button aria-haspopup="true" aria-expanded>`; `role="group" aria-label="Filter by status"` |
| Applied-filter chip remove | `<button aria-label="Remove filter: Priority High">` |
| Panels | `<section aria-labelledby="panel-heading-id">` |
| AI band | `<section aria-labelledby="ai-label-id">` where the label element contains the literal text *"AI-generated · advisory"* |
| Exception card | `<article aria-labelledby="exc-heading-id">` |
| Evidence rows | `<dl>` with `<dt>` field path and `<dd>` value |
| Action radio group | `role="radiogroup" aria-labelledby="decision-heading"`; items `role="radio" aria-checked`; unavailable items `aria-disabled="true" aria-describedby="reason-id"` |
| Justification | `<textarea aria-required="true" aria-describedby="count-id note-id error-id" aria-invalid>` |
| Submit | `<button aria-disabled="true" aria-describedby="blocking-reason-id">` when gated, so the blocker is announced rather than the user guessing |
| Dialogs / drawers | `role="dialog" aria-modal="true" aria-labelledby aria-describedby`; focus trapped; `Escape` bound |
| Audit timeline | `<ol>` / `<li>` with `<h3>` per entry; disclosures `<button aria-expanded aria-controls>` |
| Read-only chip | Plain text in the accessibility tree — *"Read-only, append-only"* |
| Print route | `<main>` with the record; toolbar `aria-hidden` under `@media print` |

---

### Motion and timing

- **No auto-advancing content.** No carousels, no auto-dismissing content that carries decision-relevant information. Post-action confirmations are **panels, not toasts**, precisely so they cannot vanish before a presenter finishes a sentence or before a screen-reader user reaches them.
- **No time limits** on any interaction. Justification fields do not time out; sessions do not expire on a timer during a walkthrough.
- **Respect `prefers-reduced-motion`:** the only motion in the product is the loading progress line, the disclosure expand, and the drawer slide. All are reduced to instant state changes under that query.
- **Polling is silent.** The 20-second notification poll and the 30-second queue refetch must not move focus, must not reorder rows under a keyboard user's cursor position, and must not announce anything except a genuine unread-count change.

---

### Accessibility acceptance checks

Tie these to the F21 suite or a documented manual pass:

1. Complete all ten walkthrough steps using **only** the keyboard, from role gate to audit record.
2. Screenshot the queue and the audit timeline **desaturated**; confirm every status, priority, exception type, severity, confidence level, and authorship band is still identifiable.
3. With a screen reader, confirm that the AI summary is announced as AI-generated **before** its content is read, on both Shipment Review and Recommended Resolution.
4. Confirm every disabled action announces its reason when focused.
5. Confirm the audit timeline is navigable by heading, that every decision entry exposes all eight fields as text, and that no justification is truncated.
6. Confirm no overlay traps focus and every overlay closes on `Escape`, returning focus to its trigger.
7. Confirm 200% browser zoom at the 1280px baseline produces no horizontal scrolling of the primary content region.
8. Confirm the printable audit view preserves the AI/human distinction in **monochrome**.

---

## Traceability

### Screen → Feature → Story

| Screen | Feature | Walkthrough steps | Primary stories |
|---|---|---|---|
| Application Shell | F16 | all | US-9.1, US-8.1, US-8.2, US-8.3, US-7.2, US-12.7 |
| Cargo Exception Queue | F17 | 1 | US-9.2, US-9.3, US-9.4, US-11.1, US-11.11, US-5.2 |
| Shipment Review | F18 | 2, 3, 5, 6, 7 | US-9.5, US-9.6, US-2.1, US-2.2, US-4.1–US-4.5, US-1.5, US-1.6, US-11.2, US-11.3, US-11.6, US-11.7 |
| Recommended Resolution | F19 | 4, 8, 9 | US-2.4, US-2.5, US-3.1–US-3.7, US-5.1, US-5.3–US-5.5, US-9.7, US-9.8, US-11.4, US-11.8, US-11.9, US-12.1–US-12.3, US-12.5 |
| Decision & Audit Record | F20 | 10 | US-6.1, US-6.3–US-6.6, US-7.2, US-9.9, US-11.10, US-12.4 |
| Rule Administration | F15 | — | US-8.5, US-8.6, US-12.6 |
| Environment & Reset | F22 | — | US-10.4, US-10.5, US-2.3, US-6.3 |

### Governance requirement → where it is expressed visually

| Requirement | Expressed by |
|---|---|
| AI content distinguishable from human and from system output at a glance | `Y0-patterns.md` §Authorship Banding — four simultaneous non-colour signals; Screen 2 §AI summary panel; Screen 3 §AI recommendation block; Screen 4 §nested AI band in human entries |
| An AI summary never looks like an official finding | Mandatory `AI-GENERATED · ADVISORY` chip, mandatory *"not a finding"* footer, banded loading skeleton, prohibited vocabulary list |
| Confidence shown without implying authority | `Y0-patterns.md` §Confidence Display — inside the AI band only, always with basis, fixed authority caption, words not percentages, never gates a control, never aggregated |
| Unavailable actions visibly disabled with the reason stated | `Y0-patterns.md` §Disabled Action with Visible Reason — reason occupies layout space, server-supplied copy, all five always rendered; Screen 3 §States; Flow 4 |
| A specialist can never reach Cleared; clearance routes through supervisor approval, visibly | `Y0-patterns.md` §Authority Chain Rail; Screen 3 §Authority Chain and §Governance checklist items 4–6; action titled *Recommend clearance*; confirmation step restating it |
| Audit records read-only / append-only, no edit or delete anywhere | `Y0-patterns.md` §Read-Only by Construction; Screen 4 §Interactive Elements (complete inventory) and §Governance expression; Screen 5 §reset copy |
| The 10-step walkthrough navigable without training | Principle P7; `Flow-00-ten-step-walkthrough.md`; per-screen step indicators; single forward affordance on every confirmation; Demo Guide strip |
| Constrained iframe viewport, no top-level-window dependencies | Principle P8; `Y1-responsive.md`; `Y0-patterns.md` §In-Frame Overlays; in-frame printable route |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
