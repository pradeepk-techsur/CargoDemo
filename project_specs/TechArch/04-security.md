---

# 4. Security Architecture

CargoDemo has an unusual security posture that must be stated plainly, because misreading it would misread the whole demo:

> **The authentication is simulated. The authorization is real.**

There is no PIV/CAC, no SSO, no password, and no identity federation — role selection over five seeded users is sufficient for the demo (PRD §5.8). But authorization is enforced with production discipline: server-side on every route, declaratively registered, self-checked at startup, backed by database constraints, and asserted by a 180-case matrix test. That asymmetry is deliberate. *Authorization is the property being demonstrated to CBP*; authentication is not, and simulating it keeps the demo focused on the mission capability rather than on credential plumbing.

## 4.1 Threat Model and Scope

| In scope | Out of scope (with reason) |
|---|---|
| Privilege escalation between the three roles | Credential theft — there are no credentials |
| Self-approval / separation-of-duties bypass | Identity federation attacks — no IdP exists |
| Role spoofing via client-supplied fields | Network interception — single-origin, sandboxed, synthetic data |
| Audit tampering and deletion | Data exfiltration — every record is synthetic; there is nothing to exfiltrate |
| Malicious or malformed document upload | DoS / rate limiting — single-tenant, single-session demo |
| Path traversal in document storage | Clickjacking — see §4.7; explicitly accepted for iframe embedding |
| Accidental PII ingress (seed, upload, prompt) | Multi-tenant isolation — PRD §5.8 excludes multi-tenancy |
| Secret leakage through logs, errors, or health | CSRF — no cookie-only auth path grants authority; see §4.7 |

## 4.2 Authentication — Simulated Login

```
  ① GET /api/users                    open route; role selector renders before any session exists
  ② POST /api/session { user_id }     server verifies the user exists AND is active
  ③ token = randomBytes(32)           ≥ 256 bits of entropy
  ④ store { sha256(token), user_id }  the plaintext token is NEVER persisted
  ⑤ return session_token              client sends X-CargoDemo-Session, or the
                                      cargodemo_session HttpOnly cookie in embedded-preview mode
  ⑥ every request: sha256 → sessions → users → role      ← role read from the DB, every time
  ⑦ DELETE /api/session               ends it; POST while one exists implicitly ends the prior
                                      session and writes a ROLE_SWITCHED audit entry
```

Four properties make this simulated mechanism nonetheless sound:

| Property | Enforcement | Why it matters |
|---|---|---|
| **The token does not encode the role** | `sessions` stores only `token_hash` and `user_id`; role comes from the `users` join | A token is an *identity reference*, not a *capability grant*. A forged token could at most impersonate an identity whose authority is then read from the database — it cannot manufacture authority |
| **The token is never stored in plaintext** | `token_hash TEXT NOT NULL UNIQUE` | Database inspection does not yield usable sessions |
| **Deactivation invalidates immediately** | Every request re-reads `users.active`; inactive → `401 SESSION_INVALID` | An administrator can revoke access mid-demo and it takes effect on the next request |
| **A role switch is itself auditable** | `ROLE_SWITCHED` system audit entry with both identities | The walkthrough's step 8→9 specialist→supervisor switch appears in the record, so the separation of duties is visible rather than assumed |

**Role spoofing is structurally impossible.** The acting user is resolved *only* from the session. A `role` field in a request body, a query parameter, or a custom header is either rejected by `additionalProperties: false` or ignored entirely. Test AC-06 posts a spoofed `SYSTEM_ADMINISTRATOR` role alongside a specialist session and asserts the specialist's permissions still apply.

## 4.3 Authorization — Four Enforcement Layers

Every protected operation passes through up to four independent gates. No single layer is trusted to be sufficient; this is principle P1 applied to access control.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ LAYER 0 — UI affordance          convenience only, NEVER a control        │
│   Navigation hidden, actions disabled with a stated reason.               │
│   Driven entirely by GET /api/rbac/matrix and /available-actions —        │
│   the client never computes permissions from the role itself.             │
└──────────────────────────────┬────────────────────────────────────────────┘
┌──────────────────────────────▼────────────────────────────────────────────┐
│ LAYER 1 — Declarative route gate            preHandler, before any write  │
│   routeOptions.config = { routeId, allowedRoles, predicates }             │
│   Role mismatch → 403 FORBIDDEN_ROLE + ACCESS_DENIED audit entry.         │
│   STARTUP SELF-CHECK: a route without allowedRoles ⇒ exit 1               │
│   (ROUTE_PERMISSION_MISSING). An unprotected endpoint cannot ship by      │
│   omission — only by an explicit, reviewable declaration.                 │
└──────────────────────────────┬────────────────────────────────────────────┘
┌──────────────────────────────▼────────────────────────────────────────────┐
│ LAYER 2 — Resource predicates               INSIDE the transaction        │
│   G-SOD   approver ≠ recommender             → 403 SELF_APPROVAL_BLOCKED  │
│   G-AUTH  ESCALATED ⇒ SUPERVISOR only        → 403 ESCALATED_REQUIRES_…   │
│   state machine (status, action, role)       → 409 INVALID_TRANSITION     │
│   case version                               → 409 CASE_VERSION_CONFLICT  │
│   Run inside the transaction, not beside Layer 1, because they read       │
│   mutable state — evaluating them earlier would be a TOCTOU bug.          │
└──────────────────────────────┬────────────────────────────────────────────┘
┌──────────────────────────────▼────────────────────────────────────────────┐
│ LAYER 3 — Database constraints              the backstop                  │
│   approvals CHECK (approver_role = 'SUPERVISOR')                          │
│   approvals CHECK (approver_user_id <> recommended_by_user_id)            │
│   cases     CHECK (status <> 'CLEARED' OR approving_official IS NOT NULL) │
│   case_actions CHECK (actor_role IN ('CARGO_SPECIALIST','SUPERVISOR'))    │
│   audit_entries CHECK (actor_kind <> 'AI' OR user_decision IS NULL)       │
│   A defective code path fails to WRITE, not merely fails to check.        │
└───────────────────────────────────────────────────────────────────────────┘
```

**Why the ordering matters.** Layer 1 runs before Layer 2 so that a role denial never leaks resource-existence information: a specialist probing `POST /api/rules/{id}` gets `403` whether or not the rule exists. Layer 2 runs before any domain write so a rejected predicate leaves no partial state. Layer 3 catches everything, including bugs nobody anticipated.

## 4.4 RBAC Matrix (60 routes × 3 roles)

**CS** = Cargo Specialist · **SUP** = Supervisor · **ADM** = System Administrator · ✅ allowed · ❌ `403 FORBIDDEN_ROLE` · ⚠️ allowed subject to a resource predicate

| # | Method | Route | CS | SUP | ADM | Predicate |
|---|---|---|---|---|---|---|
| **Session & users** |
| 1 | GET | `/api/users` | ✅ | ✅ | ✅ | open (no session required) |
| 2 | POST | `/api/session` | ✅ | ✅ | ✅ | open |
| 3 | GET | `/api/session` | ✅ | ✅ | ✅ | — |
| 4 | DELETE | `/api/session` | ✅ | ✅ | ✅ | — |
| 5 | GET | `/api/rbac/matrix` | ✅ | ✅ | ✅ | — |
| 6 | POST | `/api/users` | ❌ | ❌ | ✅ | — |
| 7 | PATCH | `/api/users/{id}` | ❌ | ❌ | ✅ | self role change blocked |
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
| **Workflow** |
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

### The mirror-image restriction

The matrix encodes a deliberate symmetry that is the heart of the separation-of-duties story:

- **Supervisors adjudicate and approve but cannot edit rules** (rows 49–53). Rule ownership is separated from adjudication authority, so a supervisor cannot change the policy that constrains their own decisions.
- **Administrators own rules but cannot adjudicate at all** (rows 20–29, 33, 35). Denied on all five actions, revalidation, upload, approval, and AI regeneration — and the `case_actions.actor_role` `CHECK` makes it impossible even if a handler check were removed.

**Neither role can quietly become the other.** That is a stronger claim than "roles are enforced", and it is the one a CBP oversight reviewer actually cares about.

## 4.5 Separation of Duties — The Clearance Path

The single governance claim the demo exists to prove, and the five independent things that enforce it:

```
  specialist                                supervisor (a DIFFERENT person)
      │                                              │
      │ CLEAR_EXCEPTION                              │ POST /api/cases/{id}/approval
      ▼                                              ▼
  PENDING_APPROVAL ───────────────────────────▶  CLEARED
  + recommendations row (PENDING)                + approvals row
                                                 + cases.approving_official_user_id
                                                 + cases.cleared_at
```

| # | Enforcement | Layer | Test |
|---|---|---|---|
| 1 | Exactly one transition row (T31) targets `CLEARED`, and it requires `SUPERVISOR` | Domain (transition table as data) | WF-02 counts rows from `GET /api/workflow/transitions` |
| 2 | `ApprovalService` is the only service that writes `cases.status = 'CLEARED'` | Application | WF-11: `CLEAR_EXCEPTION` never produces `CLEARED` |
| 3 | Guard G-SOD: `acting_user_id ≠ recommendation.recommended_by_user_id`, evaluated inside the transaction | Application predicate | AC-02 (handler) |
| 4 | `approvals CHECK (approver_user_id <> recommended_by_user_id)` and `CHECK (approver_role = 'SUPERVISOR')` | Database | AC-02 (direct SQL, expects abort) |
| 5 | Guard G-AUDIT: the `APPROVAL_DECISION` entry must carry **all eight fields** with a non-null approving official, or the transaction aborts | Domain completeness gate | AU-02, AU-03 |

**AC-03 is the test that proves the design rather than the implementation:** a supervisor-authored recommendation cannot be approved by its author, but *can* be approved by a second supervisor. Self-approval is blocked by identity, not by role — which is what separation of duties actually means.

`health.subsystems.workflow.clearance_paths` reports `1` at runtime, so a presenter can demonstrate the invariant on screen without opening code.

## 4.6 Document Upload Security

Simulated uploads are the one place untrusted bytes enter the system. The path is deliberately narrow and validated at every stage.

```
  ① multipart parse      exactly two parts: `file` (binary) + `metadata` (JSON)
                         > 5 MB → 413 PAYLOAD_TOO_LARGE (streamed limit, not buffered)
  ② declared MIME        allow-list: application/pdf, image/png, image/jpeg,
                         text/plain, text/csv  → else 415 UNSUPPORTED_MEDIA_TYPE
  ③ size                 0 bytes → 422 FILE_EMPTY ; absent part → 422 FILE_REQUIRED
  ④ extension consistency  .pdf must accompany application/pdf, etc.
                         → 422 FILE_EXTENSION_MISMATCH
  ⑤ MAGIC BYTES          sniff the leading bytes; must match the declared MIME
                         → 422 FILE_CONTENT_MISMATCH   ← a .pdf that is not a PDF is refused
  ⑥ PII screen           text/* content matched against a deny-list of patterns
                         (SSN-like, email, phone, passport, EIN) → 422 PII_SUSPECTED
  ⑦ document_type        COPIED FROM THE REQUEST ROW — never accepted from the client,
                         so an upload cannot be retargeted at a different requirement
  ⑧ path construction    {CARGODEMO_DOC_STORAGE_DIR}/{shipment_id}/{request_id}-{sanitized}
                         filename sanitized to [A-Za-z0-9._-]; resolved path MUST remain
                         inside the storage root → else 500 STORAGE_PATH_INVALID
  ⑨ atomic write         temp file → fsync → rename; sha256 recorded as content_hash
  ⑩ transaction          document row + request FULFILLED + revalidation, all in ONE tx.
                         Any failure rolls back the DB and deletes the partial file —
                         storage and database never diverge.
```

Three defence-in-depth notes:

- **Magic-byte checking (⑤) is what makes the allow-list meaningful.** An allow-list on the declared MIME type alone trusts the client; sniffing the content does not.
- **Path confinement (⑧) is checked on the *resolved* path**, not on the input string, so `..` sequences, absolute paths, and symlink tricks all fail the same check.
- **The MIME allow-list and size ceiling are re-asserted as `CHECK` constraints on `documents`** (`02a` §2.5), so even a bypass of this handler cannot persist an unexpected file type.

**There is no path by which a document arrives from outside the operator's own browser.** No inbox, no importer portal, no correspondence channel, no fetch-by-URL exists (`Y3` §5). The upload surface is exactly one authenticated, role-gated, request-scoped endpoint.

## 4.7 HTTP Headers and Sandboxed-Preview Compatibility

> ### ⚠️ Iframe embedding constraint — binding requirement
>
> The application is **embedded in an IFRAME by the Pivota Preview**. Therefore:
>
> - **`X-Frame-Options` MUST NOT be sent at all.** Neither `DENY` nor `SAMEORIGIN`.
> - **The Content-Security-Policy MUST NOT contain `frame-ancestors 'none'` or `frame-ancestors 'self'`.** The directive is omitted entirely (permitting embedding), or, if an explicit value is preferred, set to `frame-ancestors *`.
> - Either mistake blanks the preview and fails the demo before a single screen renders.
>
> Security-header defaults from Helmet-style middleware include `X-Frame-Options: SAMEORIGIN`. **If such middleware is used, that default must be explicitly disabled.** This is a known, easy-to-reintroduce regression and is covered by an integration test (§4.10).

### The header set actually sent

| Header | Value | Rationale |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'` — **no `frame-ancestors` directive** | `'self'` everywhere enforces the no-third-party-assets rule of P4 at the browser level. `frame-ancestors` is deliberately absent so the preview can embed the app |
| `X-Frame-Options` | **not sent** | See the constraint box above |
| `X-Content-Type-Options` | `nosniff` | Safe and harmless in an iframe; prevents MIME confusion on document downloads |
| `Referrer-Policy` | `no-referrer` | Nothing should leak a shipment ID to any external destination — and with no egress, there is none to leak to |
| `Cache-Control` (on `/api/*`) | `no-store` | Case state and audit records must never be served stale from a browser or intermediary cache |
| `Content-Disposition` (document content) | `attachment` | A synthetic document is never rendered inline in the app's own origin |
| `Strict-Transport-Security` | **not sent** | The preview is served over plain HTTP; sending HSTS would poison the browser for the host |
| CORS headers | **none** | Same-origin only. No CORS configuration exists to misconfigure (`Y3` §8) |

### Session transport in an iframe

The primary mechanism is the `X-CargoDemo-Session` **header**, which is immune to third-party-cookie restrictions in an embedded context and carries no CSRF exposure (a cross-site form post cannot set a custom header). The `cargodemo_session` cookie exists only as a fallback for preview environments where header injection is inconvenient, and is set `HttpOnly; SameSite=Lax; Path=/`. `Secure` is **not** set, because the preview is plain HTTP and a `Secure` cookie would simply never be stored.

**CSRF is not exploitable here** for three converging reasons: the header path is the default and cannot be forged cross-site; every mutating route requires a JSON or multipart content type that a simple cross-site form cannot produce; and there is no external origin that would have any reason or ability to target the sandbox.

### Production-hardening note (recorded, not implemented)

If CargoDemo were ever deployed outside a sandboxed preview, the following would be required and are deliberately absent here: `frame-ancestors` restricted to the hosting origin, `X-Frame-Options: SAMEORIGIN`, HSTS with TLS termination, `Secure` cookies, CSRF tokens on cookie-authenticated mutations, and real authentication replacing §4.2. **Recording these as deliberate demo-scoped exclusions is itself part of the governance story** — a stakeholder must not read the demo as production-ready (PRD §8).

## 4.8 Data Protection and Privacy

| Control | Implementation |
|---|---|
| **No real data, anywhere** | Every shipment, importer, carrier, manufacturer, user, and document is synthetic. Seeding runs a PII deny-list scan over all seeded strings and **fails the seed transaction** with `SEED_PII_SUSPECTED` on a match (test SD-05) |
| **No PII in uploads** | Text-content uploads are screened against the same deny-list → `422 PII_SUSPECTED` |
| **No PII in prompts** | The AI grounding set contains only synthetic shipment attributes, rule definitions, and evidence. Because the entire dataset is synthetic, no real or personal data can be transmitted *even when a provider is enabled* |
| **No PII in logs** | `request_log` stores method, path, status, actor ID, duration, and error code — **no bodies, no field values**. It is trimmed to 10 000 rows so it cannot become an accidental data sink |
| **Secrets never committed** | `CARGODEMO_AI_API_KEY` is read from the environment only; `.env` is gitignored; a `.env.example` documents variables with empty values. No secret appears in the repository, in `GET /api/health`, in any error body, or in any log line |
| **Errors leak nothing** | The error mapper strips SQL, stack traces, and absolute paths outside the project. Diagnosis is via `request_id` correlation |
| **Health leaks nothing** | `GET /api/health` is an open route and therefore explicitly excludes the API key, database credentials, and external absolute paths |
| **Document content is gated** | `GET /api/documents/{id}/content` requires a session and passes the RBAC gate like any other route; storage paths are never exposed to the client |

## 4.9 Denial Logging

Every `403` and every rejected transition writes an audit entry (invariant I10) with the acting user, attempted route and method, target resource, current status, and reason — classed as `ACCESS_DENIED` or `TRANSITION_REJECTED`.

This is a security control *and* a demo asset. A blocked self-approval attempt is exactly the kind of event an oversight reviewer wants to see in the record, and `E2E-03` deliberately performs one so that step 10 can show it. A system that silently swallowed the attempt would be less defensible, not more.

## 4.10 Security Test Coverage

| Test | Asserts |
|---|---|
| AC-01 | The full 60 routes × 3 roles cross-product matches §4.4, including open routes |
| AC-02 | Self-approval blocked at **both** the handler and the database trigger |
| AC-03 | A supervisor's own recommendation is blocked for them but approvable by a second supervisor |
| AC-04 | Rule mutation by CS and SUP → `403`; by ADM → success |
| AC-05 | All five actions, revalidation, upload, and approval by ADM → `403` |
| AC-06 | Role spoofing via body, query, or custom header does not change the effective role |
| AC-07 | Missing, invalid, or deactivated session → `401` on every protected route |
| AC-08 | Self role change → `403 SELF_ROLE_CHANGE_BLOCKED` |
| AC-09 | Startup self-check fails when a fixture route omits `allowed_roles` |
| AC-10 | Every denial produces an `ACCESS_DENIED` audit entry with route and reason |
| AU-04…AU-06 | Audit `UPDATE`/`DELETE` abort via direct SQL; hash chain detects tampering |
| **HDR-01** | **Responses carry no `X-Frame-Options` header and no `frame-ancestors 'none'`/`'self'` in the CSP** — the iframe-compatibility regression test for AD-06 |
| **HDR-02** | The CSP is present and restricts `default-src`/`script-src`/`connect-src` to `'self'` |
| UP-01…UP-06 | Oversized, empty, wrong-extension, wrong-magic-byte, PII-bearing, and traversal-path uploads are each rejected with their specific code |
