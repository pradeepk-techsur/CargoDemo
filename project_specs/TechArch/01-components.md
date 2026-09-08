---

# 1. Component Architecture

## 1.1 Repository Layout

```
cargodemo/
├─ package.json                     # one package; npm start / test / test:e2e / test:all / reset
├─ tsconfig.json                    # strict: true, noUncheckedIndexedAccess: true
├─ vite.config.ts                   # SPA build → dist/client ; dev proxy /api → :3000
├─ playwright.config.ts             # E2E drives `npm start`, not `npm run dev`
├─ vitest.config.ts
├─ data/                            # gitignored runtime state
│  ├─ cargodemo.db                  # SQLite (WAL)
│  └─ documents/{shipment_id}/…     # simulated uploads
├─ fixtures/
│  ├─ documents/                    # synthetic PDFs/PNGs, seeded + upload-ready
│  ├─ cargo-entries.seed.json       # the 12-shipment dataset
│  ├─ rules.seed.json               # the 7 default rule definitions
│  └─ golden/                       # byte-compared expected outputs
├─ src/
│  ├─ server/
│  │  ├─ index.ts                   # startup sequence, binding, readiness log
│  │  ├─ app.ts                     # Fastify assembly, plugin order, route registration
│  │  ├─ config.ts                  # env parsing + validation (fail fast)
│  │  ├─ plugins/                   # requestId, session, rbac, errorMapper, requestLog, spa
│  │  └─ routes/                    # 60 routes, grouped by domain, each with a RouteDefinition
│  ├─ app/                          # APPLICATION layer — use-case services
│  ├─ domain/                       # DOMAIN layer — pure, no I/O
│  ├─ infra/                        # INFRASTRUCTURE layer — adapters
│  ├─ shared/                       # types shared by server and client (the API contract)
│  └─ client/                       # React SPA
└─ tests/
   ├─ unit/  integration/  e2e/  helpers/
```

`src/shared/` is the single source of the API contract: every interface in chunks `03a`–`03c` lives there and is imported by both the Fastify route definitions and the React data layer. A response shape cannot drift between server and client because there is only one declaration of it.

## 1.2 Dependency Rule

```
  client ─────────────┐
                      ▼
  server/routes ──▶ app/services ──▶ domain/*
        │                │              ▲
        │                ▼              │
        └──────────▶ infra/ports ───────┘   (ports declared inward, implemented outward)
```

Enforced mechanically by `eslint-plugin-import` `no-restricted-paths`:

| Layer | May import | May NOT import |
|---|---|---|
| `domain/` | `domain/`, `shared/types` | `app/`, `infra/`, `server/`, `node:fs`, `node:http`, any driver |
| `app/` | `domain/`, `infra/ports`, `shared/` | `server/`, concrete adapters |
| `infra/` | `domain/`, `infra/`, `shared/` | `app/`, `server/` |
| `server/` | everything | — |
| `client/` | `shared/types` only | any `src/server`, `src/app`, `src/domain`, `src/infra` |

The `domain/` row is the one that matters: because the domain cannot import `node:fs` or a clock, the determinism claims of P2 are enforced by the linter rather than by discipline.

## 1.3 Backend Components

### 1.3.1 Transport layer (`src/server/`)

| Component | Responsibility | Key detail |
|---|---|---|
| `index.ts` | Startup sequence and binding | migrate → schema self-check → seed-if-empty → route self-check → AI probe → `listen({ host: '0.0.0.0', port: 3000 })`. Any failure but the AI probe ⇒ `process.exit(1)` |
| `app.ts` | Fastify assembly and plugin ordering | Registers plugins in the fixed order of §1.4, then all 60 `RouteDefinition`s, then the SPA plugin last (so `/api/*` always wins) |
| `config.ts` | Environment parsing | Parses and validates every `CARGODEMO_*` variable at boot; an invalid value aborts startup rather than defaulting silently |
| `plugins/requestId.ts` | Correlation | Generates `X-Request-Id`, attaches to the request context, echoes on every response and in every error body |
| `plugins/session.ts` | Acting-user resolution | Reads `X-CargoDemo-Session` header or `cargodemo_session` cookie → SHA-256 → `sessions` lookup → **`users` row read for the role**. Never reads a role from the request |
| `plugins/rbac.ts` | Declarative authorization gate | Reads `routeOptions.config.allowedRoles`; denies with `403 FORBIDDEN_ROLE` and appends an `ACCESS_DENIED` audit entry. Runs as `preHandler`, before any handler body executes |
| `plugins/errorMapper.ts` | Uniform error envelope | Maps `DomainError`/`ValidationError`/SQLite constraint failures to the `Y2` catalog; strips paths, SQL, and stack traces |
| `plugins/requestLog.ts` | Routing/outcome metadata only | Writes `request_log`; stores **no** bodies and **no** field values, and trims to the most recent 10 000 rows on insert |
| `plugins/spa.ts` | Static SPA serving | Serves `dist/client` with `index.html` fallback for non-`/api` paths. Sets the iframe-compatible header set of `04-security` §7 |
| `routes/*.ts` | 60 route definitions | Each exports `{ routeId, method, url, schema, allowedRoles, predicates, handler }`; the registry self-check enumerates them at startup |

### 1.3.2 Application layer (`src/app/`)

Every service in this table owns transactions; nothing below it opens one.

| Service | Use cases | Transactional writes |
|---|---|---|
| `WorkflowService` | The five user actions (`POST /api/cases/{id}/actions`), available-actions projection | `case_actions`, `cases`, `document_requests`, `recommendations`, `audit_entries`, `notifications` |
| `ApprovalService` | `approve` / `reject` / `request_info` — **the only writer of `cases.status = 'CLEARED'`** | `approvals`, `recommendations`, `cases`, `exceptions` (→ `CLEARED_BY_DECISION`), `audit_entries`, `notifications` |
| `RevalidationService` | Manual and automatic revalidation; exception reconciliation | `evaluations`, `exceptions`, `evidence`, `cases`, `document_requests`, `audit_entries`, `notifications` |
| `DocumentService` | Simulated upload, request cancellation, content streaming | `documents`, `document_requests`, filesystem, then delegates to `RevalidationService` in the *same* transaction |
| `EvaluationService` | Invokes the rule engine and persists findings, evidence, priority, status | `evaluations`, `exceptions`, `evidence`, `cases` |
| `RuleAdminService` | Rule CRUD, enable/disable, impact preview, history | `rules`, `audit_entries`; preview performs **zero** writes |
| `IngestionService` | File and API ingestion, idempotent on `shipment_id` | `cargo_entries`, `documents`, `cases`, `ingestion_batches`, then `EvaluationService` |
| `AiAssistService` | Summary and recommendation retrieval, caching, regeneration | `ai_outputs` only — **never** `cases`, `case_actions`, `recommendations`, `approvals` (AI-08) |
| `AuditService` | `append(draft)` with the eight-field completeness gate and hash chaining | `audit_entries` (insert + the one permitted `notification_id` link) |
| `NotificationService` | Template rendering and generation on every state change | `notifications`, `notification_reads` |
| `QueueService` / `ShipmentService` / `AuditQueryService` | Read projections for the four screens | none |
| `SeedService` | Deterministic seeding and reset | truncate-and-reseed in the `Y0b` §10 order |
| `HealthService` | Subsystem readiness aggregation | none |

### 1.3.3 Domain layer (`src/domain/`) — pure

| Module | Contents | Asserted by |
|---|---|---|
| `workflow/stateMachine.ts` | The 33-row transition table as **data**, the 9 guards, `evaluateTransition(status, action, role, context)` | WF-01, WF-02 |
| `workflow/availableActions.ts` | The five actions with `available` + `reason` for a (status, role) pair | WF-14 |
| `rules/evaluators/missingDocument.ts` | `MISSING_REQUIRED_DOCUMENT` algorithm (F4 §6) | RE-01…RE-04 |
| `rules/evaluators/htsCode.ts` | `INVALID_HTS_CODE` ordered checks (F4 §4) | RE-05…RE-08 |
| `rules/evaluators/countryOfOrigin.ts` | `CONFLICTING_COUNTRY_OF_ORIGIN` algorithm (F4 §5) | RE-09…RE-12 |
| `rules/conditions.ts` | Applicability conditions, shared by all three | RE-13 |
| `rules/normalize.ts` | Country alias table, HTS digit normalization, document-type casing | RE-10 |
| `rules/engine.ts` | Deterministic ordering, dispatch, `rule_set_fingerprint` | RE-15 |
| `priority.ts` | Priority derivation with the recorded `priority_basis` | RE-19 |
| `ai/recommendation.ts` | The 9-row deterministic action table + the 8-factor confidence score | AI-04, AI-05 |
| `ai/fallback/summary.ts`, `ai/fallback/rationale.ts` | Deterministic templates per `(exception_type, sub_reason)` | AI-02, AI-03 |
| `ai/grounding.ts` | Grounding fingerprint and the LLM output grounding check | AI-06 |
| `audit/completeness.ts` | Eight-field rules per entry class | AU-01…AU-03 |
| `audit/hashChain.ts` | Canonical JSON (sorted keys, no whitespace) + SHA-256 chaining | AU-06 |
| `errors.ts` | The `Y2` catalog as a typed union | — |

### 1.3.4 Infrastructure layer (`src/infra/`)

| Adapter | Port | Notes |
|---|---|---|
| `db/connection.ts` | — | Opens SQLite; sets `PRAGMA foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000` on every connection |
| `db/migrations/` | — | Forward-only, numbered, checksum-verified; a changed applied migration aborts startup |
| `db/repositories/*.ts` | `CargoRepository`, `CaseRepository`, `RuleRepository`, … | Prepared statements; no ORM |
| `db/repositories/auditRepository.ts` | `AuditRepository` | Exposes **only** `append()`, `list()`, `get()`, `verify()`. There is no `update()` or `delete()` to call (F12 §3.2) |
| `storage/fsDocumentStore.ts` | `DocumentStore` | Path confinement, magic-byte check, atomic temp-then-rename, rollback-safe delete |
| `ai/noneProvider.ts` | `AiProvider` | **Default.** Returns "unavailable" without any network activity |
| `ai/openAiProvider.ts`, `ai/anthropicProvider.ts` | `AiProvider` | Single call, no retries, `AbortController` at `CARGODEMO_AI_TIMEOUT_MS` |
| `ai/stubProvider.ts` | `AiProvider` | Test-only; scripted responses including invalid ones for AI-06 |
| `clock.ts` | `Clock` | `SystemClock` in production; `SeedClock` (fixed instant, monotonic step) during seeding and tests |
| `ids.ts` | `IdGenerator` | `UuidGenerator` in production; `DeterministicIdGenerator` (counter-derived) during seeding — this is what makes SD-03 pass |

## 1.4 Request Lifecycle

Plugin order is fixed and is itself a security property: nothing that touches domain state runs before the RBAC gate.

```
  ① requestId          assign X-Request-Id
  ② bodyLimit          reject > 1 MB JSON / > 5 MB multipart  → 413 PAYLOAD_TOO_LARGE
  ③ contentType        enforce application/json | multipart   → 415 UNSUPPORTED_MEDIA_TYPE
  ④ schemaValidate     compiled JSON Schema, additionalProperties:false → 422 VALIDATION_FAILED
  ⑤ resolveSession     header/cookie → sha256 → sessions → users.role  → 401 UNAUTHENTICATED
  ⑥ rbacGate           routeOptions.config.allowedRoles                → 403 FORBIDDEN_ROLE
                       ├─ on denial: append ACCESS_DENIED audit entry (I10) ──┐
  ⑦ idempotency        Idempotency-Key + scope + request hash → replay original response
  ⑧ handler            ──▶ application service                                │
  ⑨ resourcePredicates inside the transaction: G-SOD, G-AUTH, case version    │
  ⑩ errorMapper        DomainError | SQLite constraint → Y2 envelope          │
  ⑪ requestLog         method, path, status, actor, duration, error_code ◀────┘
```

**Why predicates run inside the transaction (⑨) rather than beside the role check (⑥):** SoD-2 and the case-version check read mutable state. Evaluating them outside the transaction that will act on that state is a time-of-check/time-of-use bug. The role check can safely run earlier because a role cannot change mid-request — a role switch ends the session (F14 §1 step 8).

## 1.5 The Uniform Mutating Skeleton

Every mutating use case — the five actions, approval, revalidation, upload, rule save — is the same nine steps. This uniformity is what makes invariant I4 ("every transition writes exactly one audit entry and exactly one notification") checkable by counting rather than by inspection.

```ts
function executeMutation<TCmd, TRes>(cmd: TCmd): TRes {
  return db.transaction(() => {                        // BEGIN IMMEDIATE
    const caseRow = caseRepo.loadForUpdate(cmd.caseId);      // 1. load + lock
    assertNotTerminal(caseRow);                              // 2. CASE_TERMINAL
    assertCaseVersion(caseRow, cmd.ifMatchCaseVersion);      // 3. CASE_VERSION_CONFLICT
    const decision = domain.decide(caseRow, cmd, ctx);       // 4. pure: transition + guards
    const effects  = repos.applyEffects(decision);           // 5. domain writes
    const entry    = audit.append(draftFrom(decision, effects)); // 6. 8-field gate + hash chain
    const note     = notifications.generate(entry);          // 7. template render + insert
    audit.linkNotification(entry.id, note.id);               // 8. the ONE permitted update
    return project(caseRow, decision, effects, entry, note); // 9. response + X-Case-Version
  })();
}
```

Five properties follow directly from this shape and are each covered by a test:

1. **No orphan state.** Any throw at any step rolls back the domain write, the audit entry, and the notification together (`Y2` §9.3). There is no state in which a case moved but its record did not.
2. **No un-audited transition.** Step 6 is unconditional and non-skippable; the completeness gate can *abort* a transition (notably `PENDING_APPROVAL → CLEARED`) but can never be bypassed. That is guard G-AUDIT.
3. **No un-notified decision.** Step 7 is likewise unconditional; a `NOTIFICATION_GENERATION_FAILED` rolls the action back rather than clearing a case silently (WF-05).
4. **Serialized case writes.** `BEGIN IMMEDIATE` plus the case-row load gives a writer lock for the whole use case, so two concurrent actions produce one success and one `CASE_VERSION_CONFLICT` (WF-13) rather than a lost update.
5. **Purity where it counts.** Step 4 is the only place a decision is made, and it is pure. The state machine can therefore be exhaustively tested (70 cases in WF-01) without a database.

**The audit↔notification circular reference** (step 8) is the single reason the `audit_entries` `BEFORE UPDATE` trigger has an exemption at all. The trigger permits an update that changes *only* `notification_id`/`notification_snapshot_json`, only from null to non-null. A second attempt fails the `OLD.notification_id IS NULL` condition and aborts (AU-05).

## 1.6 Frontend Components

### 1.6.1 Structure

```
src/client/
├─ main.tsx                    # React 18 root, QueryClient, Router
├─ app/
│  ├─ AppShell.tsx             # F16 — layout, nav, role chip, demo-mode chip, banners
│  ├─ RoleSwitcher.tsx         # F14 simulated login / role selection
│  ├─ NotificationBell.tsx     # F13 unread count + drawer
│  └─ DegradationBanner.tsx    # F22 — non-dismissible while ai.mode is FALLBACK_*
├─ screens/
│  ├─ QueueScreen.tsx          # F17 — walkthrough step 1
│  ├─ ShipmentReviewScreen.tsx # F18 — steps 2, 3, 5, 6, 7
│  ├─ ResolutionScreen.tsx     # F19 — steps 4, 8, 9
│  └─ AuditRecordScreen.tsx    # F20 — step 10
├─ admin/
│  ├─ RuleListScreen.tsx  RuleEditorScreen.tsx  ImpactPreview.tsx   # F15
│  └─ DemoControlsScreen.tsx                                        # F22 reset
├─ components/
│  ├─ AiGeneratedBlock.tsx     # the ONLY container AI prose may render inside
│  ├─ EvidenceTable.tsx        # field_path / raw / normalized — never prose
│  ├─ StatusBadge.tsx  PriorityBadge.tsx  ExceptionChip.tsx
│  ├─ ActionPanel.tsx          # five actions, disabled + reason, mandatory justification
│  ├─ ConfidenceBadge.tsx      # level + basis; basis is never hidden behind a tooltip alone
│  └─ States.tsx               # Loading / Empty / Error for every data-backed view
├─ api/
│  ├─ client.ts                # fetch wrapper: session header, Idempotency-Key,
│  │                           #   If-Match-Case-Version, Y2 error typing
│  └─ hooks/                   # TanStack Query hooks, one per endpoint
└─ state/sessionStore.ts       # acting user + token (sessionStorage)
```

### 1.6.2 Frontend architectural rules

| Rule | Rationale |
|---|---|
| **The server decides availability; the client only renders it.** `ActionPanel` renders exactly what `GET /api/cases/{id}/available-actions` returns, including the `reason` on every disabled action. The client never computes permissions from the role | UI hiding is a convenience, never the control (F14). It also satisfies PRD §6 Usability: every disabled action states why |
| **AI content renders only inside `AiGeneratedBlock`.** The component is non-optional: it renders the AI label, the provider/model, the generation timestamp, the generation mode, and the grounding fingerprint | PRD §6 Explainability, and F12 §5.3's requirement that AI content is never rendered inside a human-decision container |
| **Evidence renders independently of AI prose.** `EvidenceTable` is fed from `/exceptions`, not from the summary | Risk mitigation from PRD §8: a hallucinated summary is verifiable against evidence the human can see beside it |
| **Every mutation sends `Idempotency-Key` and `If-Match-Case-Version`** and invalidates the case, queue, exceptions, audit, and notification queries on success | A double-click during a live demo must not create two actions (WF-12) |
| **No third-party network assets.** Fonts, icons, and styles are bundled; no CDN, no analytics, no telemetry | P4 — the UI renders identically with no internet connection |
| **Accessibility is structural.** Semantic `<table>` for the queue and evidence, real headings, keyboard-reachable actions, status and priority conveyed by text *and* colour, WCAG 2.1 AA contrast | PRD §6 Accessibility |
| **Post-revalidation diff is rendered, not inferred.** The screen displays the server's `RevalidationResult` (`resolved` / `retained` / `new`) verbatim | Step 7 must show "1 resolved, 2 retained" as a server fact, not a client computation |

### 1.6.3 Screen → endpoint map

| Screen | Reads | Writes |
|---|---|---|
| Queue (F17) | `GET /api/queue` | — |
| Shipment Review (F18) | `/shipments/{id}`, `/exceptions`, `/documents`, `/document-requests`, `/upload-fixtures`, `/ai/summary`, `/available-actions` | `POST /cases/{id}/actions` (`REQUEST_INFORMATION`), `POST /document-requests/{id}/upload`, `POST /shipments/{id}/revalidate` |
| Recommended Resolution (F19) | `/ai/recommendation`, `/exceptions`, `/available-actions`, `/recommendations` | `POST /cases/{id}/actions` (all five), `POST /cases/{id}/approval` |
| Decision & Audit Record (F20) | `/cases/{id}/audit`, `/audit/verify`, `/cases/{id}/notifications` | — (read-only by construction; no edit or delete affordance exists anywhere on the screen) |
| Rule Admin (F15) | `/rules`, `/rules/{id}`, `/rules/{id}/history` | `POST/PATCH /rules`, `enable`, `disable`, `preview-impact` |
| Demo Controls (F22) | `/health`, `/admin/seed-report` | `POST /admin/reset` |
