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
