---

## F9 (Part 1 of 2): Exception Case Workflow — Statuses & State Machine

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 8

**Description:** F9 is the state machine governing a flagged shipment from queue entry to final disposition. This chunk specifies the seven statuses, the complete transition table keyed by `(from_status, action, role)`, the guards that qualify individual transitions, and the invariants that make the governance claims enforceable. The five actions themselves — their inputs, validation, side effects, and errors — are specified in `F09b-case-workflow-actions.md`.

**Terminology:**
- **Transition:** A `(from_status, action, actor_role) → to_status` triple that the server permits. Any triple absent from the table is invalid and is rejected server-side with a reason naming both the current status and the attempted action.
- **Guard:** An additional predicate a permitted transition must satisfy (e.g. "the recommendation's author is not the acting user"). A failed guard is a distinct error from an invalid transition, because the two mean different things to the user.
- **Self-loop:** A transition whose `from` and `to` status are equal. Only `AWAITING_INFORMATION --REQUEST_INFORMATION--> AWAITING_INFORMATION` is permitted, because a second document may legitimately be requested while the first is outstanding.
- **Terminal status:** `CLEARED`. No transition leaves it, and no action, ingestion, revalidation, or rule change may modify a cleared case.
- **Authority transfer:** The property of `ESCALATED` that specialists lose the ability to act on the case. This is what makes escalation meaningful rather than a label.

**Sub-features:**
- Seven canonical statuses with defined semantics
- The complete role-aware transition table
- Guards: self-approval block, terminal block, hold-release restriction, escalation authority transfer
- Invariants asserted by the test suite
- Server-side rejection with explanatory reasons

### §1 Status semantics

| Status | Entered when | Who may act | Exits to |
|---|---|---|---|
| `NEW` | Ingestion/seed flags the shipment (F5) | CS, SUP | `IN_REVIEW`, `AWAITING_INFORMATION`, `PENDING_APPROVAL`, `ON_HOLD`, `ESCALATED` |
| `IN_REVIEW` | A human takes the case up, information arrives, a hold is released, or a recommendation is rejected | CS, SUP | `AWAITING_INFORMATION`, `PENDING_APPROVAL`, `ON_HOLD`, `ESCALATED` |
| `AWAITING_INFORMATION` | A document request is opened | CS, SUP | `IN_REVIEW`, `AWAITING_INFORMATION` (self), `PENDING_APPROVAL`, `ON_HOLD`, `ESCALATED` |
| `ON_HOLD` | A human parks the case | CS (limited), SUP | `IN_REVIEW`, `AWAITING_INFORMATION`, `PENDING_APPROVAL` (SUP only), `ESCALATED` |
| `ESCALATED` | A human transfers authority upward | **SUP only** | `IN_REVIEW`, `AWAITING_INFORMATION`, `PENDING_APPROVAL`, `ON_HOLD` |
| `PENDING_APPROVAL` | A clearance recommendation is submitted | **SUP only, and not the recommender** | `CLEARED`, `IN_REVIEW`, `AWAITING_INFORMATION`, `ON_HOLD` |
| `CLEARED` | A distinct supervisor approves the recommendation | nobody | — (terminal) |

### §2 Complete transition table

Roles: **CS** = Cargo Specialist, **SUP** = Supervisor. **ADM** (System Administrator) appears in no row of this table: the administrator cannot adjudicate and is denied on every workflow action with `FORBIDDEN_ROLE` (F14).

| # | From | Action | CS | SUP | To | Guards |
|---|---|---|---|---|---|---|
| T01 | `NEW` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC |
| T02 | `NEW` | `SEND_FOR_SPECIALIST_REVIEW` | ✅ | ✅ | `IN_REVIEW` | — |
| T03 | `NEW` | `CLEAR_EXCEPTION` | ✅ | ✅ | `PENDING_APPROVAL` | G-REC |
| T04 | `NEW` | `PLACE_ON_HOLD` | ✅ | ✅ | `ON_HOLD` | — |
| T05 | `NEW` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T06 | `IN_REVIEW` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC |
| T07 | `IN_REVIEW` | `SEND_FOR_SPECIALIST_REVIEW` | ❌ | ❌ | — | invalid: already in review (`TRANSITION_REDUNDANT`) |
| T08 | `IN_REVIEW` | `CLEAR_EXCEPTION` | ✅ | ✅ | `PENDING_APPROVAL` | G-REC |
| T09 | `IN_REVIEW` | `PLACE_ON_HOLD` | ✅ | ✅ | `ON_HOLD` | — |
| T10 | `IN_REVIEW` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T11 | `AWAITING_INFORMATION` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC, G-DUP |
| T12 | `AWAITING_INFORMATION` | `SEND_FOR_SPECIALIST_REVIEW` | ✅ | ✅ | `IN_REVIEW` | G-CANCEL (outstanding requests are cancelled with a reason) |
| T13 | `AWAITING_INFORMATION` | `CLEAR_EXCEPTION` | ✅ | ✅ | `PENDING_APPROVAL` | G-REC, G-ACK (must acknowledge outstanding requests) |
| T14 | `AWAITING_INFORMATION` | `PLACE_ON_HOLD` | ✅ | ✅ | `ON_HOLD` | — |
| T15 | `AWAITING_INFORMATION` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T16 | `ON_HOLD` | `REQUEST_INFORMATION` | ✅ | ✅ | `AWAITING_INFORMATION` | G-DOC |
| T17 | `ON_HOLD` | `SEND_FOR_SPECIALIST_REVIEW` | ✅ | ✅ | `IN_REVIEW` | — (this is the release-from-hold path) |
| T18 | `ON_HOLD` | `CLEAR_EXCEPTION` | ❌ | ✅ | `PENDING_APPROVAL` | G-REC. *A held case must be released into review before a specialist may propose clearing it; a supervisor may propose directly.* |
| T19 | `ON_HOLD` | `PLACE_ON_HOLD` | ❌ | ❌ | — | invalid: already on hold (`TRANSITION_REDUNDANT`) |
| T20 | `ON_HOLD` | `ESCALATE_TO_SUPERVISOR` | ✅ | ✅ | `ESCALATED` | — |
| T21 | `ESCALATED` | `REQUEST_INFORMATION` | ❌ | ✅ | `AWAITING_INFORMATION` | G-DOC, G-AUTH |
| T22 | `ESCALATED` | `SEND_FOR_SPECIALIST_REVIEW` | ❌ | ✅ | `IN_REVIEW` | G-AUTH (this is the de-escalation path) |
| T23 | `ESCALATED` | `CLEAR_EXCEPTION` | ❌ | ✅ | `PENDING_APPROVAL` | G-REC, G-AUTH |
| T24 | `ESCALATED` | `PLACE_ON_HOLD` | ❌ | ✅ | `ON_HOLD` | G-AUTH |
| T25 | `ESCALATED` | `ESCALATE_TO_SUPERVISOR` | ❌ | ❌ | — | invalid: already escalated (`TRANSITION_REDUNDANT`) |
| T26 | `PENDING_APPROVAL` | `REQUEST_INFORMATION` | ❌ | ✅ | `AWAITING_INFORMATION` | G-DOC, G-SOD, G-WITHDRAW (pending recommendation → `RETURNED_FOR_INFORMATION`) |
| T27 | `PENDING_APPROVAL` | `SEND_FOR_SPECIALIST_REVIEW` | ❌ | ❌ | — | invalid while approval is outstanding (`APPROVAL_PENDING`) |
| T28 | `PENDING_APPROVAL` | `CLEAR_EXCEPTION` | ❌ | ❌ | — | invalid: a recommendation already exists (`RECOMMENDATION_ALREADY_PENDING`) |
| T29 | `PENDING_APPROVAL` | `PLACE_ON_HOLD` | ❌ | ✅ | `ON_HOLD` | G-SOD, G-WITHDRAW (recommendation → `WITHDRAWN`) |
| T30 | `PENDING_APPROVAL` | `ESCALATE_TO_SUPERVISOR` | ❌ | ❌ | — | invalid: already at supervisor authority (`TRANSITION_REDUNDANT`) |
| T31 | `PENDING_APPROVAL` | `APPROVE_CLEARANCE` *(F11, not one of the five)* | ❌ | ✅ | `CLEARED` | G-SOD, G-AUDIT |
| T32 | `PENDING_APPROVAL` | `REJECT_RECOMMENDATION` *(F11)* | ❌ | ✅ | `IN_REVIEW` | G-SOD |
| T33 | `CLEARED` | *any* | ❌ | ❌ | — | terminal (`CASE_TERMINAL`) |

**Reachability of `CLEARED`:** exactly one row (T31) targets `CLEARED`, it is available only to `SUPERVISOR`, and it is gated by G-SOD and G-AUDIT. There is no other path, no administrative override, no ingestion path, no revalidation path, and no bulk operation. This single-row property is asserted directly by an F21 test that enumerates the transition table and counts rows with `to_status = 'CLEARED'`.

### §3 Guards

| Guard | Applies to | Predicate | Error on failure |
|---|---|---|---|
| **G-DOC** | `REQUEST_INFORMATION` | The request names ≥ 1 document type; each named type is either listed in some open exception's `missing_information` or accompanied by `justify_unlisted_document = true` with a justification ≥ 20 chars | `DOCUMENT_TYPE_NOT_REQUIRED` |
| **G-DUP** | `REQUEST_INFORMATION` from `AWAITING_INFORMATION` | The new request MUST NOT duplicate an `OUTSTANDING` request for the same document type | `DUPLICATE_DOCUMENT_REQUEST` |
| **G-REC** | `CLEAR_EXCEPTION` | No `PENDING` recommendation exists on the case; the request enumerates the `exception_ids` being proposed for clearance and they match the current open set | `RECOMMENDATION_ALREADY_PENDING`, `EXCEPTION_SET_STALE` |
| **G-ACK** | `CLEAR_EXCEPTION` from `AWAITING_INFORMATION` | `acknowledge_outstanding_requests = true` must be supplied, and outstanding requests are marked `CANCELLED_BY_CLEARANCE` with the justification | `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` |
| **G-CANCEL** | `SEND_FOR_SPECIALIST_REVIEW` from `AWAITING_INFORMATION` | Outstanding requests are cancelled with `cancellation_reason` from the justification; recorded on the audit entry | — (always satisfiable) |
| **G-AUTH** | any action from `ESCALATED` | `acting_role = SUPERVISOR` | `ESCALATED_REQUIRES_SUPERVISOR` |
| **G-SOD** | T26, T29, T31, T32 | `acting_user_id != recommendation.recommended_by_user_id` | `SELF_APPROVAL_BLOCKED` |
| **G-WITHDRAW** | T26, T29 | The pending recommendation is closed with a terminal status and a reason before the transition commits | — (always satisfiable) |
| **G-AUDIT** | T31 | The audit entry being written satisfies the eight-field completeness rule, including a non-null `approving_official` (F12) | `AUDIT_INCOMPLETE` |

### §4 Invariants (each asserted by an F21 test)

- **I1 — Single clearance path.** Exactly one transition targets `CLEARED`, it requires `SUPERVISOR`, and it requires an approving official distinct from the recommender.
- **I2 — No AI actor.** No transition may be executed with `actor_kind = 'AI'` or `actor_kind = 'SYSTEM'`. All 33 rows require a `HUMAN` actor with a resolvable `user_id`. Ingestion, seeding, and revalidation write `SYSTEM` audit entries but execute **no** transition row, except the seed script which executes rows as a seeded human user (F2 §Process step 7).
- **I3 — Mandatory justification.** Every executed transition carries a non-empty justification of at least 10 characters. There is no transition path that omits it.
- **I4 — Audit-per-transition.** Every executed transition writes exactly one `audit_entries` row and exactly one `notifications` row, in the same transaction. Counting audit entries of action class must equal counting `case_actions` rows, always.
- **I5 — Status is always canonical.** `cases.status` is one of the seven codes at all times; there is no null, intermediate, or transient status.
- **I6 — Terminal immutability.** After `CLEARED`, `cases.status`, `cases.priority`, the recommendation, and the approval are immutable. Every mutating route returns `CASE_TERMINAL`.
- **I7 — Escalation transfers authority.** From `ESCALATED`, every specialist action is denied with `ESCALATED_REQUIRES_SUPERVISOR`, which is a `403`, not a `409` — it is an authority problem, not a state problem.
- **I8 — Redundant transitions are rejected, not absorbed.** Placing an already-held case on hold returns `409 TRANSITION_REDUNDANT` rather than silently succeeding, so the audit trail never contains a no-op decision.
- **I9 — Revalidation never transitions to `CLEARED` or `PENDING_APPROVAL`** (F6 §State transitions).
- **I10 — Denials are recorded.** Every rejected action (invalid transition, failed guard, role denial) writes an `ACCESS_DENIED` or `TRANSITION_REJECTED` audit entry with the acting user, attempted action, current status, and reason. A rejected attempt is itself governance-relevant information.

### §5 Reason strings surfaced to the UI

When the UI asks what a role may do from the current state (`GET /api/cases/{id}/available-actions`), the server returns every one of the five actions with `available: boolean` and, when false, a `reason` drawn from this fixed set — satisfying PRD §6 Usability ("every disabled action states why it is unavailable"):

| Reason code | Displayed text |
|---|---|
| `ROLE_NOT_PERMITTED` | "Your role (Cargo Specialist) cannot take this action." |
| `ESCALATED_REQUIRES_SUPERVISOR` | "This case has been escalated; only a Supervisor can act on it." |
| `TRANSITION_REDUNDANT` | "The case is already in this state." |
| `APPROVAL_PENDING` | "A clearance recommendation is awaiting supervisor decision." |
| `RECOMMENDATION_ALREADY_PENDING` | "A clearance recommendation has already been submitted." |
| `SELF_APPROVAL_BLOCKED` | "You submitted this recommendation and cannot decide on it." |
| `CASE_TERMINAL` | "This shipment has been cleared and can no longer be changed." |
| `HOLD_REQUIRES_RELEASE` | "Release the case from hold before recommending clearance." |
| `NO_MISSING_DOCUMENTS` | "There are no outstanding document requirements to request." |

**Error States (state-machine level; action-level errors are in F09b):**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Triple absent from the transition table | 409 | `INVALID_TRANSITION` | "Cannot {action} a case in status {status}" |
| Redundant transition | 409 | `TRANSITION_REDUNDANT` | "Case is already {status}" |
| Specialist acting on an escalated case | 403 | `ESCALATED_REQUIRES_SUPERVISOR` | "Only a Supervisor may act on an escalated case" |
| Any action on a cleared case | 409 | `CASE_TERMINAL` | "Shipment {id} is Cleared and cannot be changed" |
| Administrator attempting any workflow action | 403 | `FORBIDDEN_ROLE` | "System Administrators do not adjudicate shipments" |
| Approval action by the recommender | 403 | `SELF_APPROVAL_BLOCKED` | "You cannot approve your own recommendation" |
| Concurrent transition | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |

**API Surface (this part):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/cases/{id}/available-actions` | CS, SUP, ADM | The five actions with availability and reason for the acting role and current state |
| GET | `/api/workflow/transitions` | CS, SUP, ADM | The transition table as data, used by the UI and by the F21 invariant tests |

**Schema Surface (this part):** reads/writes `cases.status`, `cases.updated_at`; writes `case_actions`, `audit_entries`, `notifications`. See `Y0b-schema-workflow-audit.md` §Cases and §Actions.
