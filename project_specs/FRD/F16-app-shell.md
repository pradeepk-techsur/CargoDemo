---

## F16: Application Shell, Navigation & Role Switcher

**Priority:** P0 · **Category:** User Interface

**Description:** F16 is the frame every screen lives in: layout, navigation across the four primary screens and the administrator surfaces, the simulated login / role selector with the acting user always visible, the notification indicator, the demo-mode and AI-fallback banners, and the shared visual language for status, priority, exception types, AI-generated content, and evidence. It also defines the loading, empty, and error states that every data-backed view inherits.

**Terminology:**
- **Primary navigation:** Exception Queue, Shipment Review, Recommended Resolution, Decision & Audit Record. The last three are case-scoped and are disabled until a shipment is selected.
- **Case context:** The currently selected `shipment_id`, held in the route (`/shipments/:shipmentId/review`) so a deep link restores the exact screen — important for a live demo where a mis-click must be recoverable in one step.
- **Role switcher:** The header control that ends the current session and starts a new one as a different seeded user (F14 §1 step 8).
- **Shared component:** A presentational component used identically everywhere so that a status badge, an AI label, or an evidence row never varies between screens.

**Sub-features:**
- Persistent layout with header, primary navigation, and content region
- Case-scoped routing and deep links
- Simulated login / role selector with always-visible acting user
- Role-aware navigation (administrator surfaces hidden from CS and SUP)
- Notification indicator with unread count and dropdown list
- Demo-mode and AI-fallback banners
- Shared components: status badge, priority indicator, exception-type chip, AI-content label, evidence row, justification input, disabled-action tooltip
- Loading, empty, and error states

**Process:**
1. On load, the app calls `GET /api/session`. If unauthenticated it renders the role selector as a full-screen gate listing the seeded users from `GET /api/users` with their names and roles. No screen is reachable without a named acting user — the identity is a prerequisite, not an afterthought.
2. On session establishment the shell renders: header (product name, demo-mode chip, notification indicator, acting user chip with name + role, role switcher), primary navigation, and the routed content.
3. The shell calls `GET /api/rbac/matrix` once and uses it to hide navigation entries the acting role cannot use. Hiding is presentational only; the server denies regardless (F14).
4. Selecting a queue row sets the case context and enables the three case-scoped navigation entries. Navigating between them preserves the context; returning to the queue clears it.
5. The shell polls `GET /api/notifications/unread-count` every 20 seconds and after every mutating action, and updates the indicator. Polling is used rather than websockets because the demo is single-session and has no async job surface (PRD §5.9).
6. The shell calls `GET /api/health` on load and every 60 seconds. When `ai.mode` is a fallback mode, it renders the AI-fallback banner: *"AI assistance is running in offline fallback mode. Summaries and recommendations are generated deterministically from the recorded evidence."* When the health check fails, it renders a degraded banner naming the failing subsystem.
7. Every data-backed view renders one of four states: loading (skeleton matching the eventual layout, never a spinner that shifts content), empty (explanatory text plus the action that would populate it), error (the error `code` rendered as human copy, with a Retry control and the `request_id` shown for support), or ready.
8. Role switching prompts for confirmation, calls `DELETE /api/session` then `POST /api/session`, clears client caches, and returns to the queue preserving the previously selected shipment as a deep link so a demo can re-enter the same case as a different role in two clicks.

**Inputs:**
- `GET /api/session`, `GET /api/users`, `GET /api/rbac/matrix`, `GET /api/notifications/unread-count`, `GET /api/health`
- Route parameters: `shipmentId`
- User interactions: navigation, role selection, notification open/read, banner dismissal (dismissal is per-session and never suppresses the fallback banner, which must remain visible while the condition holds)

**Outputs:**
- Rendered shell with active-route highlighting
- Acting user and role visible on every screen at all times
- Notification indicator with unread count and dropdown
- Persistent demo-mode chip reading *"Demo — synthetic data, simulated login, notifications not transmitted"*
- Shared components consumed by F17–F20

**Shared component contracts:**

| Component | Props | Rules |
|---|---|---|
| `StatusBadge` | `status` | Text label plus a distinct shape/icon; never color alone (PRD §6 Accessibility). `CLEARED` is visually distinct from all in-flight statuses. |
| `PriorityIndicator` | `priority`, `basis` | Text label plus rank glyph; tooltip lists the derivation factors from `priority_basis` (F5 §Process step 6). |
| `ExceptionTypeChip` | `exception_type`, `count?` | One chip per distinct type; multi-exception shipments render multiple chips, never a collapsed "3 exceptions" string (PRD F17). |
| `AiContentLabel` | `provenance` | Wraps all AI text. Renders "AI-generated" plus provider, model, generation mode, and timestamp. Renders "offline fallback" when the mode is any `FALLBACK_*`. Must never wrap human-authored text. |
| `EvidenceRow` | `evidence` | Renders `field_path`, raw value, normalized value, and the comparison pair when present, as labeled text — not prose. |
| `JustificationInput` | `minLength`, `value` | Required-field styling, live character count, inline error when under the minimum. Never prefilled, never populated from the AI rationale (F09b §Validation). |
| `DisabledActionButton` | `action`, `reason` | Renders the action disabled with the reason text visible (not tooltip-only), from F09a §5. |

**Validation:**
- Every screen MUST display the acting user's name and role; a screen that renders without them is a defect (PRD §6 Governance depends on the operator always knowing who they are acting as).
- Administrator-only navigation MUST be hidden from CS and SUP, and the corresponding routes MUST render a 403 view if reached by URL.
- The AI-fallback banner MUST be visible whenever any AI output on the current screen was produced in a fallback mode, and MUST NOT be dismissible while that condition holds.
- All four primary screens MUST be keyboard navigable: visible focus rings, logical tab order, skip-to-content link, `Escape` closing overlays, and `Enter`/`Space` activating controls.
- Semantic markup MUST be used: `<table>` with `<th scope>` for the queue and audit tables, heading hierarchy without skipped levels, `<nav>`/`<main>`/`<header>` landmarks, `aria-live="polite"` on the notification indicator and on post-action confirmations.
- Status and priority MUST be conveyed by text, not color alone; contrast MUST meet WCAG 2.1 AA (4.5:1 body, 3:1 large text and UI boundaries).
- The layout MUST be responsive from 1024px to 1920px and MUST remain usable in an embedded preview iframe with no horizontal scrolling of the primary content region.
- Loading states MUST reserve the eventual layout's space so content does not jump — a live demo cannot afford a mis-click caused by reflow.
- Every error view MUST show the server's error `code` translated to human copy plus the `request_id`; raw stack traces MUST NOT be rendered.
- The client MUST NOT cache mutating responses, and MUST invalidate queue, shipment, exception, AI, audit, and notification caches after any action, upload, revalidation, or approval.

**State transitions caused:** None. The shell initiates no workflow transitions; it routes to the screens that do.

**Error States:**

| Scenario | UI behavior | Underlying code |
|---|---|---|
| No session | Full-screen role selector gate | `UNAUTHENTICATED` |
| Session invalidated mid-demo | Toast plus return to the role selector, preserving the deep link | `SESSION_INVALID` |
| Route reached without permission | Inline 403 view naming the role and the required role | `FORBIDDEN_ROLE` |
| Shipment in the URL does not exist | Inline 404 view with a link back to the queue | `RESOURCE_NOT_FOUND` |
| API unreachable | Full-width error banner with Retry; navigation remains usable | network error |
| Health check reports a degraded subsystem | Persistent warning banner naming the subsystem | — |
| AI running in fallback | Persistent informational banner, non-dismissible | — |
| Case modified by another user | Toast "This case changed; reloading" plus automatic refetch | `CASE_VERSION_CONFLICT` |

**API Surface (this feature):** consumes rows 1–5, 43, and 59 of the F14 matrix. Defines no endpoints of its own.

**Schema Surface (this feature):** none directly; reads projections from `users`, `sessions`, `notifications`, and the health endpoint.
