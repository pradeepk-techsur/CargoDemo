---

## F3: Backend HTTP API

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** 2 (and every step)

**Description:** F3 is the programmatic contract between the web UI and the domain services. It defines the transport-level conventions that all endpoints share — request validation, the uniform error envelope, acting-user resolution, role enforcement on every mutating route, pagination and filtering, and idempotency on action endpoints. The endpoint catalog itself is consolidated in `Y1a-api-read.md`, `Y1b-api-actions.md`, and `Y1c-api-admin.md`; this chunk specifies the cross-cutting behavior those endpoints inherit.

**Terminology:**
- **Acting user context:** The `{ user_id, name, role }` triple resolved server-side for every request from the session header/cookie established by F14. No endpoint accepts a role in the request body.
- **Uniform error envelope:** Every non-2xx response body is `{ error: { code, message, details?, field_errors?, request_id } }`. Clients branch on `code`, never on `message`.
- **Mutating endpoint:** Any `POST`, `PATCH`, `PUT`, or `DELETE` route. Every mutating endpoint performs an explicit role check and writes an audit entry (or is a pure read-through like AI generation, which writes an `ai_outputs` row instead).
- **Action idempotency key:** A client-supplied `Idempotency-Key` header on workflow action endpoints. Replaying the same key against the same case returns the original result instead of duplicating an action, an audit entry, and a notification.
- **Projection:** The API response shape for an entity, which is deliberately narrower and flatter than the schema (e.g. the queue projection returns an exception summary string plus a count, not the full exception graph).

**Sub-features:**
- Read endpoints: exception queue (filter/sort), shipment detail, exceptions, documents, audit, notifications, rules
- Action endpoints: five user actions, document request, document upload, revalidation, approval decisions
- AI endpoints: summary and recommended resolution retrieval/regeneration
- Rule CRUD restricted to the administrator
- Session/role endpoints for the simulated login
- Health and demo-operations endpoints
- Cross-cutting request validation, error contract, RBAC enforcement, and audit coupling

**Process:**
1. The server binds to `0.0.0.0` on `CARGODEMO_PORT` (default `3000` for the combined dev server, API mounted at `/api`) — see F22.
2. For every request the middleware chain runs in this fixed order: request-ID assignment → body size limit → JSON body parse → session resolution (acting user) → route match → request-schema validation → role authorization → handler → response serialization → audit flush verification.
3. Session resolution reads the `X-CargoDemo-Session` header (or the equivalent cookie) and loads the acting user. If absent or unresolvable, mutating and case-scoped read routes return `401 UNAUTHENTICATED`; the login/role-list and health routes remain open.
4. Request-schema validation validates path params, query params, and body against the route's declared schema. All failures for the request are collected and returned together in `field_errors`, so the UI can annotate every bad field in one round trip.
5. Role authorization consults the RBAC matrix (F14) using `(route_id, acting_role)` plus, where relevant, resource-level predicates (the self-approval block of F11). A denial returns `403` with `FORBIDDEN_ROLE` or `SELF_APPROVAL_BLOCKED` and writes an `ACCESS_DENIED` audit entry.
6. The handler executes domain logic inside a single transaction for mutating routes. The transaction includes the domain write, the audit entry, and the notification. If any part fails, the whole request fails and no partial state persists.
7. Before committing a mutating transaction, the audit-completeness guard (F12 §Process step 6) verifies the eight required fields for the entry class. A guard failure aborts the transaction with `AUDIT_INCOMPLETE`.
8. Responses are serialized with `Content-Type: application/json; charset=utf-8`, monetary values as decimal strings, timestamps as ISO-8601 UTC with milliseconds, and enums as the canonical codes from `00-header.md` §0.4.
9. The response includes `X-Request-Id` and, on mutating routes, `X-Case-Version` (the case's `updated_at` epoch-millis) so clients can detect concurrent modification.

**Inputs (cross-cutting):**
- `X-CargoDemo-Session` (string, required on protected routes): opaque session token issued by `POST /api/session`.
- `Idempotency-Key` (string, optional, ≤ 128 chars): required-by-convention on the workflow action endpoints; the UI always sends one.
- `If-Match-Case-Version` (integer, optional): when supplied on a mutating case route, the request is rejected with `CASE_VERSION_CONFLICT` if the case has changed since that version. The UI sends it for all five actions and both approval decisions.
- Query conventions on list routes: `page` (integer ≥ 1, default 1), `page_size` (integer 1–100, default 25), `sort` (comma-separated `field:asc|desc`), plus route-specific filters.

**Outputs:**
- JSON projections per `Y1a`–`Y1c`.
- List responses wrapped as `{ data: [...], page: { page, page_size, total, total_pages }, applied: { filters, sort } }` so the UI can render active-filter chips from the server's interpretation rather than its own.
- Single-resource responses returned unwrapped at the top level with an `_links` object for related resources (`shipment`, `exceptions`, `audit`, `notifications`, `ai`).
- `OpenAPI 3.1` document served at `GET /api/openapi.json`, generated from the same schemas used for validation so drift is structurally impossible.

**Validation:**
- Every route MUST declare a request schema; a route without one fails a startup self-check (`ROUTE_SCHEMA_MISSING`).
- Every mutating route MUST declare a required role set; a route without one fails the same startup self-check. This is the structural guarantee behind "authorization is never client-only".
- Unknown body properties are rejected (`additionalProperties: false`) on all mutating routes.
- Request bodies are limited to 64 KB except document upload, which is limited to 5 MB (F10).
- `page_size` > 100 is rejected rather than silently clamped.
- Unknown `sort` fields or filter values outside the canonical enums are rejected with `INVALID_QUERY_PARAM` rather than ignored.
- `Idempotency-Key` reuse with a *different* payload on the same case returns `409 IDEMPOTENCY_KEY_REUSED`; reuse with an identical payload returns the original `200`/`201` response and its original body.
- Concurrency: two simultaneous actions on the same case are serialized by a transaction on the `cases` row; the loser receives `409 CASE_VERSION_CONFLICT`.
- Read routes MUST NOT expose the AI provider API key, absolute filesystem paths, or SQL fragments in any response or error message.
- HTTP verbs MUST NOT be tunneled: `DELETE` is not offered on `audit_entries`, `notifications`, `exceptions`, or `evidence` at all, so no client can even express the request.

**State transitions caused:** None of its own. F3 is the transport for the transitions defined in F9, F10, and F11 and enforces the preconditions (authentication, authorization, schema validity, case version) before those transitions are attempted.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| No/invalid session on a protected route | 401 | `UNAUTHENTICATED` | "No acting user; select a role to continue" |
| Role not permitted for the route | 403 | `FORBIDDEN_ROLE` | "Role {role} may not perform {operation}" |
| Path resource not found | 404 | `RESOURCE_NOT_FOUND` | "{entity} {id} not found" |
| Body/query schema violation | 422 | `VALIDATION_FAILED` | "Request validation failed" (with `field_errors`) |
| Malformed JSON | 400 | `MALFORMED_JSON` | "Request body is not valid JSON" |
| Body exceeds size limit | 413 | `PAYLOAD_TOO_LARGE` | "Request body exceeds {limit}" |
| Unsupported media type on upload | 415 | `UNSUPPORTED_MEDIA_TYPE` | "Content type {type} is not accepted" |
| Case changed since `If-Match-Case-Version` | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |
| Idempotency key reused with different payload | 409 | `IDEMPOTENCY_KEY_REUSED` | "Idempotency-Key already used with a different request" |
| Invalid sort/filter parameter | 422 | `INVALID_QUERY_PARAM` | "{param} value {value} is not supported" |
| Unhandled server fault | 500 | `INTERNAL_ERROR` | "Unexpected error; request_id {request_id}" |
| AI provider unavailable on a non-fallback-eligible route | 503 | `AI_UNAVAILABLE` | "AI assistance unavailable" *(F7/F8 routes never return this — they fall back)* |

The full catalog, including every domain-specific code, is in `Y2-errors.md`.

**API Surface (this feature):** the entire catalog. Route groups:

| Group | Base path | Chunk |
|---|---|---|
| Session & roles | `/api/session`, `/api/users` | `Y1c` |
| Queue & shipments | `/api/queue`, `/api/shipments` | `Y1a` |
| Exceptions & evidence | `/api/shipments/{id}/exceptions` | `Y1a` |
| Documents & requests | `/api/shipments/{id}/documents`, `/api/document-requests` | `Y1b` |
| Workflow actions | `/api/cases/{id}/actions` | `Y1b` |
| Approvals | `/api/cases/{id}/approval` | `Y1b` |
| Revalidation | `/api/shipments/{id}/revalidate` | `Y1b` |
| AI assistance | `/api/shipments/{id}/ai/summary`, `/api/shipments/{id}/ai/recommendation` | `Y1c` |
| Audit & notifications | `/api/cases/{id}/audit`, `/api/notifications` | `Y1a` |
| Rules | `/api/rules` | `Y1c` |
| Ingestion & demo ops | `/api/ingest/*`, `/api/admin/*`, `/api/health` | `Y1c` |

**Schema Surface (this feature):** reads and writes all tables through the repository layer; owns `idempotency_keys` and `request_log` (bounded, non-PII) — see `Y0b-schema-workflow-audit.md` §Transport support.
