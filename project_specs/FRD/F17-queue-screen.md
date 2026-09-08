---

## F17: Cargo Exception Queue Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough step:** 1

**Description:** F17 is the landing screen and the first step of the walkthrough: the tabular list of flagged shipments a specialist works from. It shows shipment ID, importer, exception, priority, and status; supports filtering by status, exception type, and priority and sorting by priority and age; visually distinguishes items pending supervisor approval; indicates multi-exception shipments rather than collapsing them; and reflects state changes made elsewhere in the workflow.

**Terminology:**
- **Queue membership:** A shipment appears when it has ≥ 1 `OPEN` exception, or its case status is `PENDING_APPROVAL` (F5 §Terminology). Clean shipments and cleared shipments are excluded by default and reachable through filters.
- **Age:** Time since the oldest `OPEN` exception's `opened_at` — not since the case was created. A case that has been reworked shows the age of the problem, not the age of the paperwork.
- **Row selection:** Clicking or keyboard-activating a row navigates to that shipment's Review screen (walkthrough step 2).

**Sub-features:**
- Tabular list with the five PRD-mandated columns plus age and exception count
- Filter by status, exception type, priority, assignment, and pending-approval
- Sort by priority and by age
- Pending-approval visual distinction and supervisor quick filter
- Multi-exception indication
- Live reflection of workflow changes
- Loading, empty, and error states

**Process:**
1. On mount the screen calls `GET /api/queue` with the current filter/sort state (defaults: no filters, `sort=priority:desc,age:desc`, `page_size=25`).
2. The table renders one row per shipment with columns: **Shipment ID**, **Importer**, **Exception(s)**, **Priority**, **Status**, **Age**, **Assigned to**.
   - **Exception(s)** renders one `ExceptionTypeChip` per distinct open exception type plus a count when a type occurs more than once. A three-exception shipment shows three chips — never "3 exceptions" (PRD F17: multi-exception shipments must not be collapsed).
   - **Priority** renders `PriorityIndicator` with the derivation basis in its tooltip.
   - **Status** renders `StatusBadge`; `PENDING_APPROVAL` rows additionally carry a persistent "Awaiting your approval" marker for supervisors, and "Awaiting supervisor" for specialists.
3. Filter controls: status (multi-select over the seven statuses), exception type (multi-select over the three types), priority (multi-select over the four levels), assignment (`any` | `me` | `unassigned`), and a `Pending approval only` toggle that is prominent for supervisors and available to specialists.
4. Sort controls: Priority (default descending) and Age (descending = oldest first). Sorting is server-side; ties break on `shipment_id` ascending so ordering is stable and identical on every run (PRD §6 Determinism).
5. Applied filters render as removable chips built from the server's `applied` block, so the UI always shows the server's interpretation rather than its own optimistic state.
6. Selecting a row navigates to `/shipments/{shipment_id}/review` and sets the case context (F16).
7. The screen refetches on window focus, after any mutating action anywhere in the app, and on a 30-second interval, so post-action and post-revalidation state is reflected without a manual reload.
8. Empty state distinguishes three cases: no flagged shipments at all ("No shipments are currently flagged"), none matching the filters ("No shipments match these filters" plus a Clear filters control), and a data-load failure (error state with Retry).

**Inputs:**
- `GET /api/queue` query parameters:
  - `status` (repeatable, canonical status codes)
  - `exception_type` (repeatable, canonical type codes)
  - `priority` (repeatable, canonical priority codes)
  - `assignment` (`any` | `me` | `unassigned`, default `any`)
  - `pending_approval_only` (boolean, default `false`)
  - `include_clean` (boolean, default `false`) — shows shipments with zero exceptions
  - `include_cleared` (boolean, default `false`)
  - `sort` (default `priority:desc,age:desc`; allowed fields `priority`, `age`, `shipment_id`, `value`, `status`)
  - `page`, `page_size` (default 25, max 100)
- Acting user role from session (affects the pending-approval affordance and the `me` assignment filter)

**Outputs:**
- Rendered table with the columns above and a result count
- `QueueRow` projection per row:
  ```
  { shipment_id, case_id, importer_name, priority, priority_basis_summary, status,
    open_exception_count, exception_types: [{ type, count }], exception_summary,
    oldest_exception_opened_at, age_days, assigned_to: { id, name } | null,
    pending_approval: { recommended_by_name, recommended_at } | null,
    shipment_value_usd, updated_at }
  ```
- Navigation to the Shipment Review screen on row activation
- Active-filter chips and pagination controls

**Validation:**
- The default view MUST exclude shipments with zero `OPEN` exceptions and MUST exclude `CLEARED` cases, so the queue is a work list rather than a data dump. `SHP-2026-0011` (the clean seeded shipment) MUST NOT appear by default — this is the visible proof that clean entries stay off the queue.
- A `PENDING_APPROVAL` case MUST appear even if its exceptions are all proposed for clearance, because it is the supervisor's work item.
- Every row MUST show all five PRD-mandated columns; a build that omits any of them fails acceptance.
- Multi-exception shipments MUST render one chip per distinct type. The canonical shipment MUST show three distinct chips.
- Sorting MUST be deterministic: identical data MUST produce identical row order across reloads and across demo runs.
- Filter values outside the canonical enums MUST be rejected by the server (`INVALID_QUERY_PARAM`) rather than ignored, and the UI MUST surface the rejection rather than silently showing unfiltered data.
- Rows MUST be keyboard-selectable (`Tab` to the row, `Enter`/`Space` to open) with a visible focus ring, and the table MUST use `<th scope="col">` headers.
- Queue load MUST complete in < 1 s with the seeded dataset (PRD §6).
- The screen MUST NOT expose any action controls. All decisions happen on F18/F19, so the queue can never become a place where a shipment is dispositioned without its evidence being read.

**State transitions caused:** None. F17 is read-only; it is the entry point to the screens that transition state.

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| Queue fetch failed | Error panel with Retry and `request_id` | `INTERNAL_ERROR` / network |
| Invalid filter in a restored URL | Filter chip flagged invalid; server rejection surfaced; Clear filters offered | `INVALID_QUERY_PARAM` |
| No results with filters applied | Empty state with Clear filters | — |
| No flagged shipments at all | Empty state explaining that all shipments are clear | — |
| Session expired during polling | Toast plus role selector gate | `SESSION_INVALID` |
| Row target shipment deleted/reset mid-demo | Navigation shows the 404 view; queue refetches | `RESOURCE_NOT_FOUND` |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/queue` | CS, SUP, ADM | Filterable, sortable queue projection |

Full schema: `Y1a-api-read.md` §Queue.

**Schema Surface (this feature):** reads `cases`, `cargo_entries`, `exceptions`, `recommendations`, `users`. No writes.
