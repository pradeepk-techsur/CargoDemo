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
