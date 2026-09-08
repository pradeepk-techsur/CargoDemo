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
