---

## F13: Notification Generation

**Priority:** P1 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 9

**Description:** F13 generates and records a notification on every case state change and every decision, links it to the audit entry that produced it, and surfaces it in an in-app notification center with read state. Notifications are **generated, never transmitted** — no email, SMS, webhook, or outbound network call exists anywhere in the system. Every notification is explicitly labeled as recorded-not-transmitted so the simulation boundary is obvious on screen.

**Terminology:**
- **Notification:** A `notifications` row: the message that *would* have been sent, with recipient, subject, body, and timestamp.
- **Recipient role vs recipient user:** Notifications are addressed to a role (`CARGO_SPECIALIST`, `SUPERVISOR`) and optionally to a specific user (the case assignee, the recommender, a named escalation target). Role-addressed notifications appear for every user holding that role.
- **Read state:** Per user, not per notification row — two supervisors reading the same role-addressed notification track their own read state in `notification_reads`.
- **Transmission boundary:** `transmitted` is a column that is always `false` and has no code path that sets it `true`. Its presence in the schema and in every API response is deliberate: it makes the boundary explicit in the data, not merely in the UI copy.

**Sub-features:**
- Notification generation on every state change and decision
- Template catalog keyed by event type
- Audit-entry linkage in both directions
- In-app notification center with unread count and read marking
- Per-case notification list
- Explicit "generated, not transmitted" labeling

**Process:**
1. A notification is generated inside the same transaction as the audit entry it belongs to (F09b §1 step 13). There is no queue, no scheduler, and no retry — generation is synchronous and cannot partially fail.
2. The service selects the template for the event type (§Template catalog) and renders subject and body from the event context: shipment ID, importer, acting user name and role, action, justification excerpt (first 200 chars), exception summary, and status change.
3. The service resolves recipients per the template's addressing rule. A single event may generate exactly one notification row addressed to one role, optionally with a `recipient_user_id` for direct addressing. Multi-recipient fan-out is deliberately not implemented: one event produces one notification row, keeping the one-to-one audit linkage exact and testable (F09a I4).
4. The service inserts the `notifications` row with `audit_entry_id`, `transmitted: false`, `generated_at`, and `case_id`.
5. The caller performs the single permitted `notification_id` update on the audit entry (F12 §3.3), completing field 8 of the eight.
6. The notification appears immediately in the notification center for users holding the recipient role, and in the per-case notification list on F20 alongside the decision that produced it.
7. A user marks a notification read via `POST /api/notifications/{id}/read`, which upserts a `notification_reads` row for that user. Read state is per-user and never modifies the notification row itself.

### §Template catalog

| Event type | Recipient role | Direct recipient | Subject |
|---|---|---|---|
| `REQUEST_INFORMATION` | `CARGO_SPECIALIST` | case assignee, if any | "Document requested for {shipment_id}" |
| `SEND_FOR_SPECIALIST_REVIEW` | `CARGO_SPECIALIST` | assignee, if named | "{shipment_id} assigned for specialist review" |
| `CLEAR_EXCEPTION` | `SUPERVISOR` | escalation target, if any | "Clearance recommendation awaiting approval — {shipment_id}" |
| `PLACE_ON_HOLD` | `SUPERVISOR` | recommender, if withdrawn | "{shipment_id} placed on hold" |
| `ESCALATE_TO_SUPERVISOR` | `SUPERVISOR` | named supervisor, if any | "Escalated: {shipment_id}" |
| `DOCUMENT_UPLOADED` | `CARGO_SPECIALIST` | requester | "Document received for {shipment_id}" |
| `DOCUMENT_REQUEST_CANCELLED` | `CARGO_SPECIALIST` | requester | "Document request cancelled — {shipment_id}" |
| `REVALIDATED` | `CARGO_SPECIALIST` | assignee | "{shipment_id} revalidated: {n} resolved, {m} remaining" |
| `CLEARANCE_APPROVED` | `CARGO_SPECIALIST` | recommender | "Clearance approved for {shipment_id} by {approving_official_name}" |
| `CLEARANCE_REJECTED` | `CARGO_SPECIALIST` | recommender | "Clearance recommendation returned — {shipment_id}" |
| `CLEARANCE_RETURNED_FOR_INFORMATION` | `CARGO_SPECIALIST` | recommender | "More information requested before clearance — {shipment_id}" |
| `RULE_CREATED` / `RULE_UPDATED` / `RULE_ENABLED` / `RULE_DISABLED` | `SYSTEM_ADMINISTRATOR` | — | "Rule {rule_name} {change} by {actor_name}" |
| `DEMO_RESET` | `SYSTEM_ADMINISTRATOR` | — | "Demo data reset to pristine state" |

Every rendered body ends with the fixed sentence: *"This notification was generated and recorded by CargoDemo. It was not transmitted to any external recipient."*

**Inputs:**
- Internal `notifications.generate(context)`: `{ case_id, audit_entry_id, event_type, actor, status_before, status_after, justification, exception_summary, recipient_user_id? }`
- `GET /api/notifications` query: `unread_only` (boolean, default `false`), `case_id` (optional), `page`, `page_size` (1–100, default 25)
- `POST /api/notifications/{id}/read` — no body
- `POST /api/notifications/read-all` — optional `{ case_id }` to scope

**Outputs:**
- Persisted `notifications` row: `{ id, case_id, cargo_entry_id, shipment_id, audit_entry_id, event_type, recipient_role, recipient_user_id, subject, body, generated_at, transmitted: false }`
- Notification list projection with `read: boolean` computed for the acting user
- `unread_count` returned on every list response and by `GET /api/notifications/unread-count`, driving the shell's notification indicator (F16)
- Per-case notification list embedded in the F20 timeline

**Validation:**
- Every `HUMAN_ACTION` and `APPROVAL_DECISION` audit entry MUST have exactly one linked notification. Zero or two is a defect; asserted by an F21 test that counts rows per audit entry.
- `transmitted` MUST be `false` on every row. No code path sets it otherwise; an F21 test asserts the column's distinct value set is `{false}` after a full walkthrough.
- The application MUST make no outbound network request for notification purposes. The only permitted outbound call in the entire system is the optional AI provider call (F7/F8), documented in `Y3-integrations.md`.
- `recipient_role` MUST be one of the three canonical roles.
- Subject MUST be 1–200 chars; body 1–4 000 chars. Justification excerpts are truncated at 200 chars with an ellipsis rather than rejected.
- A notification MUST NOT contain content that is absent from the underlying event context — bodies are template-rendered, never AI-generated. (Notification text is deliberately not an AI surface: it must be reproducible for the audit record.)
- Read state MUST be per user; marking read MUST NOT modify the `notifications` row, which is append-only alongside `audit_entries`.
- A user MUST NOT be able to read notifications for a role they do not hold, except that `SUPERVISOR` and `SYSTEM_ADMINISTRATOR` may read all notifications for oversight (F14).
- Notifications MUST NOT be deletable through any surface.

**State transitions caused:** None. Notification generation is a consequence of a transition, never a cause of one.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Template missing for an event type | 500 | `NOTIFICATION_TEMPLATE_MISSING` | "No notification template for {event_type}" |
| Notification generation failed inside a transaction | 500 | `NOTIFICATION_GENERATION_FAILED` | "Action rolled back: notification could not be generated" |
| Notification not found | 404 | `RESOURCE_NOT_FOUND` | "Notification {id} not found" |
| Marking read a notification for another role | 403 | `FORBIDDEN_ROLE` | "This notification is not addressed to your role" |
| Attempt to update or delete a notification | 405 | `NOTIFICATION_IMMUTABLE` | "Notifications are recorded and cannot be modified" |
| Unauthenticated | 401 | `UNAUTHENTICATED` | "No acting user" |

Because generation is inside the action's transaction, `NOTIFICATION_GENERATION_FAILED` rolls back the entire action — a state change without its notification cannot be committed.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/notifications` | CS, SUP, ADM | Notification center list, filtered by role addressing |
| GET | `/api/notifications/unread-count` | CS, SUP, ADM | Badge count for the shell indicator |
| GET | `/api/cases/{id}/notifications` | CS, SUP, ADM | Per-case notifications with audit linkage |
| POST | `/api/notifications/{id}/read` | CS, SUP, ADM | Mark read for the acting user |
| POST | `/api/notifications/read-all` | CS, SUP, ADM | Mark all (optionally case-scoped) read |

Full schemas: `Y1a-api-read.md` §Notifications.

**Schema Surface (this feature):** owns `notifications` and `notification_reads`; referenced by `audit_entries.notification_id`. See `Y0b-schema-workflow-audit.md` §Notifications.
