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
