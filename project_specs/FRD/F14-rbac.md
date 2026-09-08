---

## F14: Role Simulation & Role-Based Access Control

**Priority:** P0 · **Category:** Access Control & Administration · **Walkthrough step:** 9

**Description:** F14 establishes a named acting user through a simulated login / role selector — no PIV/CAC, no SSO — and enforces exactly three roles server-side on every endpoint. The acting user's name and role are stamped on every audit entry. UI hiding is a convenience; the authoritative check is on the server, and every unauthorized attempt is rejected and recorded. This chunk contains the complete endpoint-by-role permission matrix.

**Terminology:**
- **Simulated login:** Selecting a seeded user from a list. `POST /api/session` issues an opaque session token bound to that user. There is no password, no identity provider, and no token exchange with an external system.
- **Acting user:** The `{ user_id, name, role }` resolved from the session on every request. Never taken from the request body, a query parameter, or a client-supplied role header.
- **Role switch:** Ending the current session and starting a new one as a different user. Switching is explicit and logged; it is not a privilege elevation within a session.
- **Route permission:** A declarative `{ route_id, allowed_roles, resource_predicates }` entry attached to every route at definition time. The matrix in §2 is generated from these declarations and served at `GET /api/rbac/matrix`, so the specification, the enforcement, and the tests read the same data.
- **Resource predicate:** A per-request check beyond the role, e.g. SoD-2 (F11) or the escalation authority transfer (F09a G-AUTH).

**Sub-features:**
- Simulated login / role selector with named users
- Session issuance, resolution, and termination
- Declarative route permissions with startup completeness self-check
- Server-side enforcement on every route
- Resource predicates for self-approval and escalation
- Denial logging as audit entries
- Actor stamping on every audit entry

### §1 Process

1. On first load the UI calls `GET /api/users` (open route) and renders the role selector listing the five seeded users with their roles.
2. The user selects an identity. The client calls `POST /api/session` with `{ user_id }`. The server verifies the user exists and is active, generates a random 32-byte token, stores `{ token_hash, user_id, created_at, last_seen_at }`, and returns `{ session_token, user: { id, name, role }, permissions_summary }`.
3. The client stores the token and sends it as `X-CargoDemo-Session` on every subsequent request. The token is also settable as an `HttpOnly` cookie for the embedded-preview case where header injection is inconvenient.
4. Every request resolves the acting user before route handling (F3 §Process step 3). Unresolvable sessions return `401 UNAUTHENTICATED` on protected routes.
5. The route's `allowed_roles` is checked. A role mismatch returns `403 FORBIDDEN_ROLE` and appends an `ACCESS_DENIED` audit entry recording the acting user, role, route, method, target resource, and reason.
6. Resource predicates run after the role check, so a supervisor attempting self-approval receives the specific `SELF_APPROVAL_BLOCKED` rather than a generic role denial — the distinction matters, because one is "your role cannot do this" and the other is "you personally cannot do this here".
7. The acting user's `id`, `name`, and `role` are stamped on every audit entry written during the request (`actor_user_id`, `actor_name`, `actor_role`).
8. `DELETE /api/session` ends the session. `POST /api/session` while a session exists implicitly ends the previous one and writes a `ROLE_SWITCHED` system audit entry with both identities, so a demo role switch is itself part of the record.
9. At startup, the route registry self-check asserts that every registered route declares `allowed_roles`, and that every mutating route declares a non-empty set. A route missing its declaration aborts startup with `ROUTE_PERMISSION_MISSING` — it is impossible to ship an unprotected mutating endpoint by omission.

### §2 Complete RBAC matrix

**CS** = Cargo Specialist · **SUP** = Supervisor · **ADM** = System Administrator · ✅ allowed · ❌ denied (`403 FORBIDDEN_ROLE`) · ⚠️ allowed subject to a resource predicate

| # | Method | Route | CS | SUP | ADM | Predicate |
|---|---|---|---|---|---|---|
| **Session & users** |
| 1 | GET | `/api/users` | ✅ | ✅ | ✅ | open (no session required) |
| 2 | POST | `/api/session` | ✅ | ✅ | ✅ | open |
| 3 | GET | `/api/session` | ✅ | ✅ | ✅ | — |
| 4 | DELETE | `/api/session` | ✅ | ✅ | ✅ | — |
| 5 | GET | `/api/rbac/matrix` | ✅ | ✅ | ✅ | — |
| 6 | POST | `/api/users` | ❌ | ❌ | ✅ | — |
| 7 | PATCH | `/api/users/{id}` | ❌ | ❌ | ✅ | — |
| **Queue & shipments (read)** |
| 8 | GET | `/api/queue` | ✅ | ✅ | ✅ | ADM read-only |
| 9 | GET | `/api/shipments/{id}` | ✅ | ✅ | ✅ | — |
| 10 | GET | `/api/shipments/{id}/exceptions` | ✅ | ✅ | ✅ | — |
| 11 | GET | `/api/shipments/{id}/evaluations` | ✅ | ✅ | ✅ | — |
| 12 | GET | `/api/shipments/{id}/evaluations/{v}` | ✅ | ✅ | ✅ | — |
| 13 | GET | `/api/shipments/{id}/evaluations/{a}/diff/{b}` | ✅ | ✅ | ✅ | — |
| 14 | GET | `/api/shipments/{id}/documents` | ✅ | ✅ | ✅ | — |
| 15 | GET | `/api/shipments/{id}/document-requests` | ✅ | ✅ | ✅ | — |
| 16 | GET | `/api/documents/{id}/content` | ✅ | ✅ | ✅ | — |
| 17 | GET | `/api/shipments/{id}/upload-fixtures` | ✅ | ✅ | ❌ | — |
| **Workflow (mutating)** |
| 18 | GET | `/api/cases/{id}/available-actions` | ✅ | ✅ | ✅ | ADM always receives all-false with `ROLE_NOT_PERMITTED` |
| 19 | GET | `/api/workflow/transitions` | ✅ | ✅ | ✅ | — |
| 20 | POST | `/api/cases/{id}/actions` — `REQUEST_INFORMATION` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`, `PENDING_APPROVAL` |
| 21 | POST | `/api/cases/{id}/actions` — `SEND_FOR_SPECIALIST_REVIEW` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`; invalid from `IN_REVIEW`, `PENDING_APPROVAL` |
| 22 | POST | `/api/cases/{id}/actions` — `CLEAR_EXCEPTION` | ⚠️ | ✅ | ❌ | CS denied from `ON_HOLD`, `ESCALATED`, `PENDING_APPROVAL` |
| 23 | POST | `/api/cases/{id}/actions` — `PLACE_ON_HOLD` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`, `PENDING_APPROVAL` |
| 24 | POST | `/api/cases/{id}/actions` — `ESCALATE_TO_SUPERVISOR` | ⚠️ | ✅ | ❌ | CS denied from `ESCALATED`, `PENDING_APPROVAL` |
| 25 | GET | `/api/cases/{id}/actions` | ✅ | ✅ | ✅ | — |
| 26 | POST | `/api/shipments/{id}/revalidate` | ✅ | ✅ | ❌ | denied when `CLEARED` |
| **Documents (mutating)** |
| 27 | POST | `/api/document-requests/{id}/upload` | ✅ | ✅ | ❌ | request must be `OUTSTANDING`; case not `CLEARED` |
| 28 | POST | `/api/document-requests/{id}/cancel` | ✅ | ✅ | ❌ | request must be `OUTSTANDING` |
| **Approvals** |
| 29 | POST | `/api/cases/{id}/approval` | ❌ | ⚠️ | ❌ | **SoD-2**: approver ≠ recommender |
| 30 | GET | `/api/cases/{id}/recommendations` | ✅ | ✅ | ✅ | — |
| 31 | GET | `/api/cases/{id}/approvals` | ✅ | ✅ | ✅ | — |
| **AI assistance** |
| 32 | GET | `/api/shipments/{id}/ai/summary` | ✅ | ✅ | ✅ | — |
| 33 | POST | `/api/shipments/{id}/ai/summary/regenerate` | ✅ | ✅ | ❌ | — |
| 34 | GET | `/api/shipments/{id}/ai/recommendation` | ✅ | ✅ | ✅ | — |
| 35 | POST | `/api/shipments/{id}/ai/recommendation/regenerate` | ✅ | ✅ | ❌ | — |
| 36 | GET | `/api/shipments/{id}/ai/outputs` | ✅ | ✅ | ✅ | — |
| **Audit & notifications** |
| 37 | GET | `/api/cases/{id}/audit` | ✅ | ✅ | ✅ | — |
| 38 | GET | `/api/cases/{id}/audit/{sequence_no}` | ✅ | ✅ | ✅ | — |
| 39 | GET | `/api/cases/{id}/audit/verify` | ✅ | ✅ | ✅ | — |
| 40 | GET | `/api/cases/{id}/audit/export` | ✅ | ✅ | ✅ | — |
| 41 | GET | `/api/audit` (cross-case) | ❌ | ✅ | ✅ | — |
| 42 | GET | `/api/notifications` | ✅ | ✅ | ✅ | CS sees only `CARGO_SPECIALIST`-addressed items |
| 43 | GET | `/api/notifications/unread-count` | ✅ | ✅ | ✅ | same scoping |
| 44 | GET | `/api/cases/{id}/notifications` | ✅ | ✅ | ✅ | — |
| 45 | POST | `/api/notifications/{id}/read` | ⚠️ | ✅ | ✅ | must be addressed to the acting role |
| 46 | POST | `/api/notifications/read-all` | ✅ | ✅ | ✅ | scoped to the acting role |
| **Rules** |
| 47 | GET | `/api/rules` | ✅ | ✅ | ✅ | CS/SUP read-only — the rule must be visible to be defensible |
| 48 | GET | `/api/rules/{id}` | ✅ | ✅ | ✅ | — |
| 49 | POST | `/api/rules` | ❌ | ❌ | ✅ | — |
| 50 | PATCH | `/api/rules/{id}` | ❌ | ❌ | ✅ | — |
| 51 | POST | `/api/rules/{id}/enable` | ❌ | ❌ | ✅ | — |
| 52 | POST | `/api/rules/{id}/disable` | ❌ | ❌ | ✅ | — |
| 53 | POST | `/api/rules/{id}/preview-impact` | ❌ | ❌ | ✅ | — |
| 54 | GET | `/api/rules/{id}/history` | ✅ | ✅ | ✅ | — |
| **Ingestion & demo operations** |
| 55 | POST | `/api/ingest/cargo-entries` | ❌ | ❌ | ✅ | — |
| 56 | GET | `/api/ingest/reports/{batch_id}` | ❌ | ❌ | ✅ | — |
| 57 | POST | `/api/admin/reset` | ❌ | ❌ | ✅ | — |
| 58 | GET | `/api/admin/seed-report` | ❌ | ❌ | ✅ | — |
| 59 | GET | `/api/health` | ✅ | ✅ | ✅ | open (no session required) |
| 60 | GET | `/api/openapi.json` | ✅ | ✅ | ✅ | open |

**Role summaries derived from the matrix:**
- **Cargo Specialist** works the queue, reviews shipments, requests documents, uploads simulated documents, revalidates, takes the five actions subject to state, and recommends clearance. Cannot approve clearance (row 29), cannot edit rules (rows 49–53), cannot ingest or reset (rows 55–58), cannot read cross-case audit (row 41).
- **Supervisor** does everything a specialist can do, plus approves/rejects recommendations (row 29, subject to SoD-2), acts on escalated cases, and reads cross-case audit. Cannot edit rules (rows 49–53) — rule ownership is deliberately separated from adjudication authority.
- **System Administrator** manages rules, users, ingestion, and reset, and has read access across the domain for support purposes. Cannot adjudicate: denied on all five actions (rows 20–24), revalidation (26), upload/cancel (27–28), approval (29), and AI regeneration (33, 35). This is the mirror image of the supervisor's rule restriction — neither role can quietly become the other.

**Inputs:**
- `POST /api/session` body: `{ user_id: string (required) }`
- `X-CargoDemo-Session` header or `cargodemo_session` cookie on every protected request
- `POST /api/users` body (ADM): `{ name (2–120), role (enum), active (boolean, default true) }`
- `PATCH /api/users/{id}` body (ADM): `{ name?, role?, active? }`

**Outputs:**
- `POST /api/session` → `{ session_token, user: { id, name, role }, permissions_summary: { can_approve, can_edit_rules, can_adjudicate, can_reset } }`
- `GET /api/session` → the current acting user, or `401`
- `GET /api/rbac/matrix` → the declarative matrix as data, consumed by the UI to hide unavailable navigation and by the F21 tests to enumerate expectations
- `ACCESS_DENIED` audit entries on every rejection
- Actor stamping on every audit entry system-wide

**Validation:**
- The role MUST NOT be readable from any client-supplied field. An implementation accepting `role` in a body or query parameter is a defect; an F21 test posts a spoofed role alongside a specialist session and asserts the specialist's permissions still apply.
- Every route MUST declare `allowed_roles`; enforced by the startup self-check.
- Every mutating route MUST perform its role check **before** any domain write and before any resource predicate that could leak existence information.
- Denials MUST be recorded as `ACCESS_DENIED` audit entries with the attempted route, method, target ID, acting user, and reason (F12 §2).
- Session tokens MUST be random (≥ 256 bits), stored hashed, and MUST NOT encode the role — a token is an identity reference, not a capability grant.
- Only the three canonical roles may exist. `POST /api/users` with any other role value returns `422 INVALID_ENUM_VALUE`.
- A user MUST NOT be able to change their own role (`PATCH /api/users/{id}` with `id = acting_user_id` and a role change returns `403 SELF_ROLE_CHANGE_BLOCKED`), so an administrator cannot silently grant themselves approval authority mid-demo.
- Deactivating a user MUST invalidate their sessions; subsequent requests return `401 SESSION_INVALID`.
- The matrix served at `GET /api/rbac/matrix` MUST be generated from the same declarations the middleware enforces — not a hand-maintained copy.
- An F21 RBAC test MUST iterate the full cross-product of (60 routes × 3 roles) and assert the expected allow/deny outcome, including the two predicate cases (self-approval, escalation authority).

**State transitions caused:** None directly. F14 gates every transition and can prevent one; it never causes one.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| No session on a protected route | 401 | `UNAUTHENTICATED` | "No acting user; select a role to continue" |
| Session token unknown, expired, or for a deactivated user | 401 | `SESSION_INVALID` | "Session is no longer valid; sign in again" |
| Role not permitted for the route | 403 | `FORBIDDEN_ROLE` | "Role {role} may not perform {operation}" |
| Specialist acting on an escalated case | 403 | `ESCALATED_REQUIRES_SUPERVISOR` | "Only a Supervisor may act on an escalated case" |
| Recommender approving their own recommendation | 403 | `SELF_APPROVAL_BLOCKED` | "You submitted this recommendation and cannot decide on it" |
| Self role change | 403 | `SELF_ROLE_CHANGE_BLOCKED` | "You cannot change your own role" |
| Unknown user on session creation | 404 | `RESOURCE_NOT_FOUND` | "User {id} not found" |
| Inactive user on session creation | 403 | `USER_INACTIVE` | "User {id} is not active" |
| Unsupported role value | 422 | `INVALID_ENUM_VALUE` | "role must be one of: CARGO_SPECIALIST, SUPERVISOR, SYSTEM_ADMINISTRATOR" |
| Route registered without a permission declaration | n/a (startup abort) | `ROUTE_PERMISSION_MISSING` | "Route {method} {path} has no allowed_roles declaration" |

**API Surface (this feature):** rows 1–7 and 5 of the matrix above; full schemas in `Y1c-api-admin.md` §Session and roles.

**Schema Surface (this feature):** owns `users` and `sessions`; stamps `actor_*` columns on `audit_entries`. See `Y0b-schema-workflow-audit.md` §Users and sessions.
