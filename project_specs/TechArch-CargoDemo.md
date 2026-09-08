# Technical Architecture Document (TechArch)
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Author** | Pivota Spec Framework (TechArch Generator) |
| **Upstream Documents** | `.planning/PROJECT.md`, `project_specs/PRD-CargoDemo.md`, `project_specs/FRD-CargoDemo.md` |
| **Downstream Documents** | UserStories-CargoDemo, implementation |
| **Status** | Authoritative technical decision record |

---

## 0.1 Purpose

This document specifies **how CargoDemo is built**: the architecture pattern, the process and deployment topology, the component decomposition, the complete database schema, the API contract expressed as TypeScript interfaces, the security and RBAC enforcement layers, the rule-engine configuration storage model, the AI integration boundary and its deterministic fallback, the document-upload handling path, the testing architecture, and the sandboxed-preview deployment topology.

Per PRD §4, **this document is the authoritative decision record for technology selection**. Where a selection here differs from the PRD's working assumption or from an FRD default, the deviation is recorded explicitly in §0.8 with its rationale. Everything not recorded as a deviation is inherited unchanged from the FRD, which remains authoritative for *functional* behavior.

## 0.2 Document Layout

This TechArch is authored as chunk files under `project_specs/TechArch/` and assembled into the canonical `project_specs/TechArch-CargoDemo.md`. Both forms carry identical content.

| Chunk | Contents |
|---|---|
| `00-overview.md` | This section: principles, architecture pattern, diagrams, topology, decision record |
| `01-components.md` | Backend and frontend component decomposition, request lifecycle, module map |
| `02a-data-model-core.md` | ER model + verbatim DDL: entries, documents, requests, rules, evaluations, exceptions, evidence |
| `02b-data-model-workflow-audit.md` | Verbatim DDL: users, cases, actions, recommendations, approvals, audit, notifications, AI outputs, transport |
| `03a-api-conventions-read.md` | API conventions, shared envelope types, TypeScript interfaces for all read endpoints |
| `03b-api-actions.md` | TypeScript interfaces for all mutating/workflow endpoints |
| `03c-api-admin-ai.md` | TypeScript interfaces for session, AI, rules, ingestion, demo operations; error catalog types |
| `04-security.md` | Authentication, the four RBAC enforcement layers, separation of duties, data protection, upload security, HTTP headers and iframe compatibility |
| `05-tech-stack.md` | Framework/database/dependency selections with rationale, configuration, repository layout |
| `06a-integrations-rules-ai.md` | Rule-engine configuration storage, evaluator architecture, AI integration boundary and determinism contract, integration inventory |
| `06b-testing-deployment.md` | Testing architecture, CI gating, deployment and preview topology, operational runbook |

## 0.3 Architectural Principles

These five principles decide every trade-off in this document. Where a conventional design and a principle conflict, the principle wins.

**P1 — Governance is structural, not procedural.** Every governance claim the demo makes to CBP is enforced at the lowest layer that can express it, and preferably at more than one. "No clearance without a named approving official" is not a code review convention; it is a `CHECK` constraint on `cases`, a `CHECK` constraint on `approvals`, a single-row property of the transition table, a handler guard, and an F21 test. A defective code path cannot bypass a database constraint, which is why the constraints exist even though the handler already checks.

**P2 — Determinism over cleverness.** Identical inputs produce byte-identical outputs: seed data, rule evaluation, evidence ordering, fallback prose, the audit hash chain, and the port the server binds to. Anything non-deterministic (wall clock, random IDs, network latency, LLM sampling) is either injected as a dependency, fixed by configuration, or moved off the critical path. Determinism is what makes the walkthrough repeatable three times on camera.

**P3 — Configuration is data, code is mechanism.** The three rule *evaluators* are code; every threshold, document list, digit count, comparison field, severity, and applicability condition is a row in `rules`. There is no code path that reads a hardcoded document type or digit count. This is what makes the System Administrator role meaningful and what lets a rule change take effect without a rebuild or restart.

**P4 — Hermetic by default.** With `CARGODEMO_AI_PROVIDER=none` — the default — the application makes **zero** outbound network requests and the entire ten-step walkthrough completes. No CDN, no font host, no analytics, no telemetry exporter, no external identity provider, no SMTP. The demo cannot be broken by conference-centre Wi-Fi.

**P5 — History is append-only.** Exceptions are resolved, never deleted. Evaluations are versioned, never overwritten. Audit entries and notifications are insert-only, hash-chained, and protected by database triggers. The single bulk-removal path is the administrator reset, which is a whole-environment operation, never a selective edit.

## 0.4 Architecture Pattern

**Pattern: single-process modular monolith with a layered, ports-and-adapters interior.**

A single Node.js process serves the API at `/api/*` and the compiled React SPA at every other path, listening on one deterministic port. This is not a simplification of a distributed design — it is the correct design for the constraints:

- **One process, one port, one URL** is the hard requirement of the sandboxed preview (PRD §4.2, FRD `Y3` §8). Two processes would mean two ports, a proxy, and a CORS surface — three additional demo-day failure modes for no benefit.
- **The transactional guarantee that a case never moves without its audit entry** (FRD `Y2` §9.3) requires the domain write, the audit append, and the notification insert to share one transaction. Splitting services across processes would make that guarantee a distributed-transaction problem instead of a `BEGIN IMMEDIATE`.
- **Zero external services** (no message broker, no scheduler, no cache server) follows from PRD §5.9: all processing is request-time.

The interior is layered, and the layering is enforced by dependency direction — an inner layer never imports an outer one:

```
  transport  ──▶  application  ──▶  domain  ◀──  infrastructure
   (HTTP)          (services)      (pure)         (adapters)
```

- **Domain** is pure TypeScript: the state machine, the three rule evaluators, priority derivation, confidence derivation, the deterministic action-derivation table, canonical serialization, and hashing. No I/O, no clock, no randomness — every one of those is a parameter. This is why the determinism tests (RE-15, AI-02, AI-04) are cheap unit tests rather than expensive integration tests.
- **Application** orchestrates use cases inside transactions: take an action, approve a recommendation, revalidate, upload a document, save a rule. Every mutating use case follows the same skeleton (§01 §4).
- **Infrastructure** implements ports: `CargoRepository`, `AuditRepository` (which exposes only `append()` and reads), `DocumentStore`, `AiProvider`, `Clock`, `IdGenerator`. Adapters are SQLite, the local filesystem, the HTTP LLM client, and the deterministic fallback generator.
- **Transport** is Fastify: schema validation, session resolution, the declarative RBAC gate, error mapping, and the OpenAPI document.

**Ports-and-adapters earns its keep in exactly three places**, and is not applied elsewhere for its own sake:

| Port | Adapters | Why the seam exists |
|---|---|---|
| `AiProvider` | `NoneProvider` (default), `OpenAiProvider`, `AnthropicProvider`, `StubProvider` (tests) | The determinism contract (§06a §4) requires the *same* recommendation with the provider on or off. A seam is the only way to test that. |
| `IngestionPort` | `FileIngestor`, `HttpIngestor` | FRD `Y3` §2: a real ACE adapter would implement this same port, leaving the domain unchanged. No such adapter is built. |
| `Clock` / `IdGenerator` | `SystemClock`/`Uuid`, `SeedClock`/`DeterministicId` | Byte-identical seed output on every run (SD-03) is impossible without injecting both. |

## 0.5 System Context

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SANDBOXED PREVIEW ENVIRONMENT                         │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐     │
│   │  Pivota Preview  ──  <iframe src="http://0.0.0.0:3000">            │     │
│   │  (embeds the app; app MUST NOT send X-Frame-Options / restrictive   │     │
│   │   frame-ancestors — see 04-security §7)                             │     │
│   └────────────────────────────────┬───────────────────────────────────┘     │
│                                    │ HTTP, same origin, no CORS              │
│   ┌────────────────────────────────▼───────────────────────────────────┐     │
│   │            CargoDemo — single Node.js process, port 3000            │     │
│   │                                                                     │     │
│   │   GET /*          ──▶  React SPA (built assets, index.html fallback)│     │
│   │   /api/*          ──▶  Fastify API (60 routes)                      │     │
│   │                                                                     │     │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────┐   │     │
│   │   │  Rule     │  │ Workflow  │  │  Audit    │  │  AI Assist     │   │     │
│   │   │  Engine   │  │ + Approval│  │  + Notify │  │  (fallback     │   │     │
│   │   │  (config- │  │  chain    │  │  (append- │  │   first)       │   │     │
│   │   │   driven) │  │           │  │   only)   │  │                │   │     │
│   │   └───────────┘  └───────────┘  └───────────┘  └───────┬────────┘   │     │
│   └──────────┬────────────────────────────────┬────────────┼────────────┘     │
│              │                                │            │                  │
│   ┌──────────▼──────────┐      ┌──────────────▼──────┐     │                  │
│   │  SQLite (WAL, FK on)│      │  Local filesystem   │     │                  │
│   │  cargodemo.db       │      │  synthetic docs     │     │                  │
│   └─────────────────────┘      └─────────────────────┘     │                  │
└────────────────────────────────────────────────────────────┼──────────────────┘
                                                             │
                        ┌────────────────────────────────────▼───────────────┐
                        │  AI provider (OpenAI/Anthropic-compatible HTTPS)   │
                        │  ══ OPTIONAL — DISABLED BY DEFAULT ══              │
                        │  CARGODEMO_AI_PROVIDER=none ⇒ never contacted.     │
                        │  Authors prose only; NEVER the action/confidence.  │
                        └────────────────────────────────────────────────────┘

  ABSENT BY DESIGN (PRD §5.8):  ACE feed · SMTP/SMS · PIV/CAC/SSO ·
                                message queue · scheduler · CDN · telemetry
```

## 0.6 Internal Layering

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TRANSPORT (Fastify)                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ requestId → bodyLimit → schemaValidate → resolveSession →             │ │
│  │ rbacGate(allowed_roles) → handler → errorMapper → requestLog          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  60 routes, each carrying { routeId, schema, allowedRoles, predicates }    │
│  Startup self-check: a route missing schema or allowedRoles ⇒ exit 1       │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │ (never skipped — no handler is reachable
                               │  without passing the RBAC gate)
┌──────────────────────────────▼────────────────────────────────────────────┐
│ APPLICATION (use-case services, transaction owners)                        │
│  WorkflowService · ApprovalService · RevalidationService · DocumentService │
│  RuleAdminService · IngestionService · AiAssistService · SeedService       │
│  Uniform mutating skeleton:                                                │
│    BEGIN IMMEDIATE → load+lock case → guard → domain decide → persist      │
│    → audit.append() → notify.generate() → link → COMMIT → project          │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────────┐
│ DOMAIN (pure, no I/O, no clock, no randomness)                             │
│  stateMachine.ts   — 33 transitions, 9 guards, 10 invariants               │
│  rules/            — 3 evaluators + conditions + normalizers               │
│  priority.ts       — derivation with recorded basis                        │
│  recommendation.ts — deterministic action table + confidence scoring       │
│  auditDraft.ts     — 8-field completeness gate + canonical JSON + SHA-256  │
│  fallback/         — deterministic summary & rationale templates           │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │ (ports, defined by domain/application)
┌──────────────────────────────▼────────────────────────────────────────────┐
│ INFRASTRUCTURE (adapters)                                                  │
│  SqliteRepositories (better-sqlite3, WAL, FK on, prepared statements)      │
│  AuditRepository — append() + reads ONLY; no update(), no delete()         │
│  FsDocumentStore — path-confined, magic-byte checked, atomic write         │
│  AiProviderAdapters — none | openai | anthropic | stub                     │
│  SystemClock / SeedClock · UuidGenerator / DeterministicIdGenerator        │
└───────────────────────────────────────────────────────────────────────────┘
```

## 0.7 Deployment Topology

| Topology | Command | Binding | Database | Documents | AI |
|---|---|---|---|---|---|
| **Sandboxed preview (primary)** | `npm start` | `0.0.0.0:3000` | `./data/cargodemo.db` | `./data/documents/` | `none` |
| **Local developer run** | `npm start` | `0.0.0.0:3000` | same | same | `none` |
| **Developer inner loop** | `npm run dev` | API `0.0.0.0:3000`, Vite dev `0.0.0.0:3001` proxying `/api` → 3000 | same | same | `none` |
| **Test (unit/integration)** | `npm test` | no listener | temp file per test file | temp dir | `none` / `stub` |
| **Test (E2E)** | `npm run test:e2e` | `0.0.0.0` on an ephemeral port | fresh temp file | temp dir | `none` |

**One command, one process, one port.** `npm start` executes: read configuration → open/create SQLite → run forward-only migrations → schema self-check (constraints and append-only triggers present) → seed if empty → route-registry self-check → non-blocking AI probe → bind. Any failure in that chain except the AI probe aborts with exit code 1 rather than serving a degraded application (FRD `Y2` §8).

**The port does not move.** If port 3000 is occupied, startup fails with `PORT_IN_USE` naming the port and the environment variable. Automatic port fallback is **not implemented**, because a shifting URL breaks an embedded preview mid-demo.

**The `npm run dev` two-port mode is a developer convenience only and is never used for a demo or an E2E run.** The E2E suite drives the same single-process `npm start` path, so a passing E2E implies a working demo (F21 §Validation).

## 0.8 Architectural Decision Record

Decisions marked **[Δ]** deviate from a PRD working assumption or an FRD default and are recorded here as required by FRD `00-header.md` §0.2 and PRD §4.

| # | Decision | Rationale | Consequence |
|---|---|---|---|
| AD-01 | **Single-process modular monolith**, API and SPA from one Fastify instance on one port | Preview embeddability, one-command start, and the single-transaction audit guarantee all require it | No CORS surface exists; no proxy to misconfigure |
| AD-02 | **Fastify 4** over Express **[Δ]** (PRD §4.1 offered either) | Schema-first JSON Schema validation is native and compiled; `routeOptions.config` carries the declarative `{ routeId, allowedRoles, predicates }` the RBAC self-check enumerates; `@fastify/swagger` emits `GET /api/openapi.json` from the *same* schemas the middleware validates against, making the drift-impossibility claim of FRD F3 structural rather than aspirational | Express-specific middleware idioms are not used |
| AD-03 | **better-sqlite3**, synchronous, WAL, `foreign_keys=ON` per connection | The mutating skeleton needs a real `BEGIN IMMEDIATE … COMMIT` spanning domain write + audit append + notification. Synchronous access makes that a plain function call instead of an async transaction dance, and removes an entire class of interleaving bug. Single-process, single-writer, ~12 shipments — concurrency is a non-issue | Node-native module; must build in the sandbox (falls back to prebuilt binaries) |
| AD-04 | **React 18 + TypeScript + Vite 5** SPA; **Next.js is explicitly not used** **[Δ]** | The app needs no SSR, no file-system routing, no server components. Vite produces a static bundle the API process serves directly, preserving the one-process/one-port property. *If Next.js were ever adopted, the sandbox constraint requires pinning `next >= 15`, or using `next.config.mjs`/`next.config.js` — never `next.config.ts` on Next 14, which that version cannot load.* | No `next.config.ts` risk exists in this build |
| AD-05 | **Deterministic port `3000`** (`CARGODEMO_PORT`, default `3000`), host `0.0.0.0` | 3000 is the port the Pivota Preview expects and probes, and is the platform convention. FRD F22 §Process step 2 and §Inputs state the same default, so there is a single port across all documents; every other F22 property (deterministic, no fallback, `0.0.0.0`) is preserved verbatim | `health.demo.port` reports `3000`; the F22 pre-demo checklist reads `3000` |
| AD-06 | **No `X-Frame-Options`; CSP without a restrictive `frame-ancestors`** | The app is embedded in an IFRAME by the Pivota Preview. `X-Frame-Options: DENY`/`SAMEORIGIN` or `frame-ancestors 'none'`/`'self'` would blank the preview. Clickjacking is not in the threat model of a single-tenant synthetic-data demo with no real authority | Documented as a demo-scoped exception in `04-security` §7, with the production-hardening note recorded |
| AD-07 | **Rule logic as three closed evaluators; all parameters as `rules.params_json`** validated by Ajv against a per-type JSON Schema with `additionalProperties: false` | P3. A closed evaluator map with no registration API makes a fourth exception type structurally impossible (PRD §5.8); `additionalProperties: false` makes a mistyped parameter a loud rejection instead of a silently disabled check | Adding an exception type requires a code change *and* a schema change *and* a PRD amendment — exactly the friction intended |
| AD-08 | **AI authors prose only.** Recommended action and confidence are always computed in-process from the deterministic tables; `action_source` is permanently `"DETERMINISTIC"` | The governance claim and the offline guarantee are the same claim. If the provider chose the action, "the walkthrough completes with AI disabled" would be a hope; because it does not, it is a structural property, asserted by AI-04 running the same shipment with the provider stubbed-on and off | The provider can never surprise a presenter with a different recommendation |
| AD-09 | **`CARGODEMO_AI_PROVIDER=none` is the default and the recommended demo configuration** | Zero egress, zero latency risk, deterministic prose from golden fixtures | The degradation banner is visible by default and is presented as a feature — the simulation boundary made obvious |
| AD-10 | **Audit immutability enforced at four layers**: absent routes, an `append()`-only repository, `BEFORE UPDATE`/`BEFORE DELETE` triggers, and a SHA-256 hash chain | P1/P5. Any single layer is a convention; four layers is an architecture | The one narrow trigger exemption (null→non-null `notification_id`) is the only mutation the schema permits, and a second attempt aborts |
| AD-11 | **Separation of duties enforced in the schema**, not only the handler: `approvals CHECK (approver_user_id <> recommended_by_user_id)`, `approvals CHECK (approver_role = 'SUPERVISOR')`, `cases CHECK (status <> 'CLEARED' OR approving_official_user_id IS NOT NULL)` | A handler bug must not be able to produce an unattributed clearance | Handler checks run first and produce friendly errors; the constraints are the backstop that makes bypass impossible |
| AD-12 | **Evaluation-versioned history**: exceptions and evidence are insert-only, revalidation writes a new `evaluations` row | Walkthrough step 7 must show one exception resolving while two persist, *and* step 10 must replay what the decider saw at each point. Both require history, not current state | Row counts are monotonically non-decreasing (RV-03) |
| AD-13 | **Snapshot, not reference**, for audit evidence and AI recommendation (`evidence_reviewed_json`, `ai_recommendation_json`) | A later revalidation changes the live exception set; the audit entry must still show what the decider actually saw (AU-08) | Audit rows are larger; correctness is not negotiable |
| AD-14 | **Documents on the local filesystem** with metadata in SQLite, not as DB blobs **[Δ]** (PRD §4.1 offered either) | Streaming `GET /api/documents/{id}/content` from disk keeps the database small and the WAL fast; path confinement plus magic-byte checks give a bounded, testable upload surface | The reset routine clears the storage directory alongside the database |
| AD-15 | **Vitest + Supertest-style Fastify `inject` + Playwright**, with golden fixtures for every determinism claim | `inject` exercises the real middleware chain (including the RBAC gate) without binding a port, so integration tests are fast and parallel-safe; Playwright drives the same start command as the demo | `npm run test:all` is the single verification command |

## 0.9 Walkthrough → Architecture Traceability

Each of the ten steps must be servable by named components. This table is the architectural acceptance criterion.

| Step | Route(s) | Application service | Domain module | Persistence effect |
|---|---|---|---|---|
| 1 Show the queue | `GET /api/queue` | `QueueService` | `priority` (read) | none |
| 2 Open a shipment | `GET /api/shipments/{id}` + `/exceptions` + `/documents` | `ShipmentService` | — | none |
| 3 AI summary | `GET /api/shipments/{id}/ai/summary` | `AiAssistService` | `fallback/summary` | `ai_outputs` insert |
| 4 Rule + evidence + recommendation | `GET /api/shipments/{id}/ai/recommendation` | `AiAssistService` | `recommendation` (deterministic) | `ai_outputs` insert |
| 5 Request a document | `POST /api/cases/{id}/actions` | `WorkflowService` | `stateMachine` T01/T06 | `case_actions` + `document_requests` + `audit_entries` + `notifications` |
| 6 Upload the document | `POST /api/document-requests/{id}/upload` | `DocumentService` | upload validators | `documents` + fs write + cascade to step 7 |
| 7 Revalidate | `POST /api/shipments/{id}/revalidate` (auto on upload) | `RevalidationService` | `rules/*`, `reconcile` | new `evaluations` + `exceptions` + `evidence` |
| 8 Recommend clearance | `POST /api/cases/{id}/actions` (`CLEAR_EXCEPTION`) | `WorkflowService` | `stateMachine` T08, G-REC | `recommendations` (PENDING) + audit + notification |
| 9 Supervisor approves | `POST /api/cases/{id}/approval` | `ApprovalService` | `stateMachine` T31, G-SOD, G-AUDIT | `approvals` + `cases.status=CLEARED` + audit + notification |
| 10 Audit trail | `GET /api/cases/{id}/audit` + `/verify` + `/export` | `AuditQueryService` | `auditDraft` (verify) | none |

**The single most important structural property in this table:** step 9 is the only row that can produce `CLEARED`, and `ApprovalService` is the only service that can write it. That is `health.subsystems.workflow.clearance_paths == 1`, asserted at startup, on the health endpoint, and by test WF-02.
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
---

# 2. Data Model

## 2.1 Storage Conventions

SQLite dialect, file-backed at `CARGODEMO_DB_PATH` (default `./data/cargodemo.db`). These conventions are inherited verbatim from FRD `Y0a` §Preamble and are not restated per table.

| Convention | Value | Rationale |
|---|---|---|
| Primary keys | `TEXT` holding UUIDv4 or a prefixed identifier (`rule-<slug>`, `usr-cs-001`, `case-0007`) | Prefixed IDs make the seeded demo data readable on screen during the walkthrough; deterministic generation makes SD-03 pass |
| Timestamps | `TEXT`, ISO-8601 UTC with milliseconds — `YYYY-MM-DDTHH:MM:SS.sssZ` | Lexicographic and chronological ordering coincide, so `ORDER BY occurred_at` needs no casting and the audit monotonicity check is a string comparison |
| Money | `INTEGER` cents (`shipment_value_cents`) | No floating-point money anywhere; the API projects a decimal *string* (`"85000.00"`), never a JS number |
| Booleans | `INTEGER` `0`/`1` with a `CHECK` | SQLite has no boolean type; the `CHECK` prevents a third value |
| Enums | `TEXT` with a `CHECK … IN (…)` | The closed-enum `CHECK` on `exception_type` is what makes a fourth exception type structurally impossible (PRD §5.8) |
| JSON columns | `TEXT` suffixed `_json`, always non-null with a defined empty form (`'[]'`, `'{}'`) | "Absent" is recorded explicitly rather than as `NULL`, which is what lets the eight-field audit completeness rule be satisfiable |
| Per-connection pragmas | `foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000` | `foreign_keys` is **off by default in SQLite** and must be set on every connection or `ON DELETE RESTRICT` is inert |
| Deletes | `ON DELETE RESTRICT` on **every** foreign key; no cascade exists anywhere | No single delete can silently remove history (P5). The only bulk removal is the administrator reset |
| Migrations | Forward-only, numbered, checksum-verified at startup | A changed applied migration aborts with `MIGRATION_CHECKSUM_MISMATCH` rather than serving against a drifted schema |

**Schema integrity self-check (startup, blocking).** After migrations the server asserts that `foreign_keys` is on, that the four governance `CHECK` constraints are present (`cases` clearance, `approvals` SoD, `approvals` role, `notifications` transmitted), and that the three append-only triggers exist. A failure aborts with `SCHEMA_INTEGRITY_FAILED` and exit code 1. **The application never serves requests against a database whose audit triggers it has not verified.**

## 2.2 Entity-Relationship Model

```
                          ┌──────────┐
                          │  users   │──────────< sessions
                          └────┬─────┘
                               │ (assigned_to, escalated_to, approving_official,
                               │  actor on every action/approval/audit row)
                               ▼
  ┌───────────────┐  1:1  ┌─────────┐  1:n   ┌──────────────┐
  │ cargo_entries │───────│  cases  │────────│ case_actions │
  └───┬───────┬───┘       └────┬────┘        └──────────────┘
      │       │                │  1:n   ┌──────────────────┐  1:n  ┌───────────┐
      │       │                ├────────│ recommendations  │───────│ approvals │
      │       │                │        └──────────────────┘       └───────────┘
      │       │                │  1:n   ┌───────────────────┐ 1:0..1 ┌──────────────┐
      │       │                ├────────│  audit_entries    │────────│notifications │
      │       │                │        └───────────────────┘        └──────┬───────┘
      │       │                │             (mutual reference)             │ 1:n
      │       │                │  1:n   ┌──────────────┐                    ▼
      │       │                ├────────│  ai_outputs  │           notification_reads
      │       │                │        └──────────────┘
      │       │                │  1:n   ┌───────────────────┐ 0..1  ┌───────────┐
      │       │                └────────│ document_requests │───────│ documents │
      │       │                         └───────────────────┘       └─────┬─────┘
      │       │  1:n                                                      │
      │       └──────────────────────────────────────────────────────────►│
      │  1:n
      ▼
  ┌─────────────┐  1:n   ┌────────────┐  1:n   ┌──────────┐
  │ evaluations │────────│ exceptions │────────│ evidence │
  └─────────────┘        └─────┬──────┘        └──────────┘
                               │ n:1
                         ┌─────▼─────┐
                         │   rules   │
                         └───────────┘

  ingestion_batches ──< cargo_entries        idempotency_keys, request_log (standalone)
```

**Four relationships carry the governance weight of the whole system:**

1. `cargo_entries 1──n evaluations ──n exceptions ──n evidence` — history is a chain of *versions*, not a mutable current state. Revalidation appends a new `evaluations` row; nothing upstream is edited (AD-12).
2. `recommendations 1──n approvals` with `approvals.recommended_by_user_id` **copied** onto the approval row — a copy is required because `CHECK (approver_user_id <> recommended_by_user_id)` cannot reach across tables in SQLite. This is separation of duties expressed as a column-level constraint.
3. `audit_entries 1──0..1 notifications` is a *mutual* reference, resolved by inserting the audit entry, inserting the notification, then performing the single trigger-permitted `notification_id` update inside the same transaction (`01-components` §1.5 step 8).
4. `rules 1──n exceptions` with `rule_version` **stamped onto the exception** — so an audit reader can prove which version of which rule produced a finding, even after the administrator has edited the rule.

## 2.3 Migrations

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  checksum    TEXT NOT NULL,
  applied_at  TEXT NOT NULL
);
```

## 2.4 Cargo Entries

```sql
CREATE TABLE cargo_entries (
  id                                TEXT PRIMARY KEY,
  shipment_id                       TEXT NOT NULL UNIQUE,
  importer_name                     TEXT NOT NULL,
  carrier_name                      TEXT NOT NULL,
  product_description               TEXT NOT NULL,
  hts_code                          TEXT,                      -- declared, may be null/incomplete
  hts_code_normalized               TEXT,                      -- digits only, F4 §4 step 2
  country_of_origin                 TEXT NOT NULL,             -- declared text
  country_of_origin_iso2            TEXT,                      -- normalized, null when unmappable
  manufacturer_name                 TEXT NOT NULL,
  manufacturer_address_line1        TEXT NOT NULL,
  manufacturer_address_city         TEXT,
  manufacturer_address_region       TEXT,
  manufacturer_address_postal_code  TEXT,
  manufacturer_address_country      TEXT NOT NULL,
  manufacturer_address_country_iso2 TEXT,
  shipment_value_cents              INTEGER NOT NULL CHECK (shipment_value_cents >= 0),
  entry_date                        TEXT NOT NULL,             -- YYYY-MM-DD
  declared_priority_hint            TEXT CHECK (declared_priority_hint IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  ingestion_source                  TEXT NOT NULL,             -- 'seed' | 'file:<name>' | 'api'
  ingestion_batch_id                TEXT REFERENCES ingestion_batches(id),
  created_at                        TEXT NOT NULL,
  updated_at                        TEXT NOT NULL,
  CHECK (shipment_id GLOB '[A-Z][A-Z][A-Z]-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]')
);
CREATE INDEX idx_cargo_entries_importer ON cargo_entries(importer_name);
CREATE INDEX idx_cargo_entries_value    ON cargo_entries(shipment_value_cents);
```

Both the raw and the normalized value are stored for HTS and for both country fields. The rule evaluators compare normalized values; the evidence rows display **both**, so a specialist sees `Malaysia` and `MY` side by side and can judge the normalization itself. `ingestion_source` keeps the ACE-simulation boundary visible on every shipment (`Y3` §2).

## 2.5 Documents

```sql
CREATE TABLE documents (
  id                     TEXT PRIMARY KEY,
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  document_type          TEXT NOT NULL,                       -- upper snake case, normalized
  status                 TEXT NOT NULL CHECK (status IN ('RECEIVED','NOT_RECEIVED')),
  filename               TEXT,
  storage_path           TEXT,
  content_hash           TEXT,                                -- sha256 hex
  file_size_bytes        INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 5242880),
  mime_type              TEXT CHECK (mime_type IS NULL OR mime_type IN
                           ('application/pdf','image/png','image/jpeg','text/plain','text/csv')),
  provenance             TEXT NOT NULL CHECK (provenance IN ('SEEDED','INGESTED','SIMULATED_UPLOAD')),
  stated_country         TEXT,                                -- declarative, for origin rules reading documents.*
  note                   TEXT,
  superseded             INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0,1)),
  duplicate_of_document_id TEXT REFERENCES documents(id),
  source_request_id      TEXT REFERENCES document_requests(id),
  uploaded_by_user_id    TEXT REFERENCES users(id),
  received_at            TEXT,
  created_at             TEXT NOT NULL,
  -- F10 §Validation: a RECEIVED document must have a file when it is expected to satisfy a rule
  CHECK (status <> 'RECEIVED' OR filename IS NOT NULL)
);
CREATE INDEX idx_documents_entry_type ON documents(cargo_entry_id, document_type, status);
CREATE UNIQUE INDEX idx_documents_active_type
  ON documents(cargo_entry_id, document_type)
  WHERE superseded = 0 AND status = 'RECEIVED';
```

The MIME allow-list and the 5 MB ceiling are enforced **three times** — by the multipart parser, by magic-byte inspection in `FsDocumentStore`, and by these `CHECK` constraints — so a bypass of the upload handler still cannot persist an unexpected file type. `provenance` is what the Shipment Review screen renders as "Seeded" vs "Uploaded this session", making the simulation boundary visible in walkthrough step 6.

## 2.6 Document Requests

```sql
CREATE TABLE document_requests (
  id                     TEXT PRIMARY KEY,
  case_id                TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  document_type          TEXT NOT NULL,
  status                 TEXT NOT NULL CHECK (status IN
                           ('OUTSTANDING','FULFILLED','CANCELLED','CANCELLED_BY_CLEARANCE')),
  linked_exception_id    TEXT REFERENCES exceptions(id),
  linked_rule_id         TEXT REFERENCES rules(id),
  requested_from         TEXT,
  due_by                 TEXT,
  requested_by_user_id   TEXT NOT NULL REFERENCES users(id),
  requested_by_name      TEXT NOT NULL,
  requested_at           TEXT NOT NULL,
  fulfilled_by_user_id   TEXT REFERENCES users(id),
  fulfilled_at           TEXT,
  fulfilling_document_id TEXT REFERENCES documents(id),
  cancellation_reason    TEXT,
  cancelled_by_user_id   TEXT REFERENCES users(id),
  cancelled_at           TEXT,
  created_at             TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_document_requests_outstanding
  ON document_requests(cargo_entry_id, document_type)
  WHERE status = 'OUTSTANDING';                                -- enforces guard G-DUP (F09a §3)
CREATE INDEX idx_document_requests_case ON document_requests(case_id, status);
```

The partial unique index **is** guard G-DUP. The handler check produces the friendly `DUPLICATE_DOCUMENT_REQUEST` error; the index guarantees that a race or a defective path cannot open two outstanding requests for the same document type.

## 2.7 Rules — Configuration Storage

```sql
CREATE TABLE rules (
  id                TEXT PRIMARY KEY,                          -- 'rule-<slug>'
  name              TEXT NOT NULL,
  name_lower        TEXT NOT NULL UNIQUE,                      -- case-insensitive uniqueness
  exception_type    TEXT NOT NULL CHECK (exception_type IN
                      ('MISSING_REQUIRED_DOCUMENT','INVALID_HTS_CODE','CONFLICTING_COUNTRY_OF_ORIGIN')),
  description       TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 500),
  policy_reference  TEXT NOT NULL CHECK (length(policy_reference) BETWEEN 3 AND 120),
  severity          TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority_mapping  TEXT,                                      -- JSON object, nullable = identity
  conditions_json   TEXT NOT NULL DEFAULT '{}',                -- F4 §3
  params_json       TEXT NOT NULL,                             -- F4 §4–§6, schema-validated per type
  enabled           INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  version           INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by_user_id TEXT REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_rules_enabled_type ON rules(enabled, exception_type);
```

**This table is the entirety of the rule configuration store.** There is deliberately **no** `DELETE` path for `rules` (F15 §Validation); retirement is `enabled = 0`, so a disabled rule remains referenceable by the historical exceptions it produced. The `params_json`/`conditions_json` contract, its Ajv validation, and the cache-invalidation model are specified in `06a-integrations-rules-ai` §2.

## 2.8 Evaluations

```sql
CREATE TABLE evaluations (
  id                    TEXT PRIMARY KEY,
  cargo_entry_id        TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id               TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  version               INTEGER NOT NULL CHECK (version >= 1),
  trigger               TEXT NOT NULL CHECK (trigger IN
                          ('INGESTION','MANUAL_REVALIDATION','DOCUMENT_UPLOAD','RULE_CHANGE','SEED')),
  rule_set_fingerprint  TEXT NOT NULL,                         -- sha256 over ordered (rule_id, version, enabled)
  skipped_rules_json    TEXT NOT NULL DEFAULT '[]',
  invalid_rules_json    TEXT NOT NULL DEFAULT '[]',
  finding_count         INTEGER NOT NULL DEFAULT 0,
  duration_ms           INTEGER,
  actor_kind            TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM')),
  actor_user_id         TEXT REFERENCES users(id),
  evaluated_at          TEXT NOT NULL,
  UNIQUE (cargo_entry_id, version)
);
CREATE INDEX idx_evaluations_entry ON evaluations(cargo_entry_id, version DESC);
```

`actor_kind` here can never be `'AI'` — the rule engine is not an AI surface (FRD `00-header` §0.4.7). `rule_set_fingerprint` is a SHA-256 over the ordered `(rule_id, version, enabled)` tuples, recorded so an audit reader can prove *which rule configuration* produced a finding months later. `skipped_rules_json` records rules that were not applicable **and why**, so an administrator can see the difference between "the rule passed" and "the rule did not apply".

## 2.9 Exceptions

```sql
CREATE TABLE exceptions (
  id                            TEXT PRIMARY KEY,
  evaluation_id                 TEXT NOT NULL REFERENCES evaluations(id) ON DELETE RESTRICT,
  cargo_entry_id                TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id                       TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  rule_id                       TEXT NOT NULL REFERENCES rules(id) ON DELETE RESTRICT,
  rule_version                  INTEGER NOT NULL,
  exception_type                TEXT NOT NULL CHECK (exception_type IN
                                  ('MISSING_REQUIRED_DOCUMENT','INVALID_HTS_CODE','CONFLICTING_COUNTRY_OF_ORIGIN')),
  sub_reason                    TEXT NOT NULL,
  severity                      TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status                        TEXT NOT NULL CHECK (status IN
                                  ('OPEN','RESOLVED_BY_REVALIDATION','CLEARED_BY_DECISION','SUPERSEDED_BY_EVALUATION')),
  assertion                     TEXT NOT NULL,
  missing_information_json      TEXT NOT NULL DEFAULT '[]',
  first_detected_evaluation_id  TEXT NOT NULL REFERENCES evaluations(id),
  opened_at                     TEXT NOT NULL,                 -- carried forward on retention (F6 §7)
  resolved_at                   TEXT,
  resolved_by_evaluation_id     TEXT REFERENCES evaluations(id),
  resolution_reason             TEXT CHECK (resolution_reason IS NULL OR resolution_reason IN
                                  ('DOCUMENT_RECEIVED','HTS_CORRECTED','ORIGIN_ALIGNED','RULE_DISABLED',
                                   'RULE_PARAMS_CHANGED','CONDITION_NO_LONGER_APPLICABLE')),
  superseded_by_exception_id    TEXT REFERENCES exceptions(id),
  cleared_by_approval_id        TEXT REFERENCES approvals(id),
  created_at                    TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_exceptions_eval_rule ON exceptions(evaluation_id, rule_id);
CREATE INDEX idx_exceptions_case_status     ON exceptions(case_id, status);
CREATE INDEX idx_exceptions_type_status     ON exceptions(exception_type, status);
```

No application code path issues `DELETE FROM exceptions` (F6 §Validation, test RV-03). `opened_at` and `first_detected_evaluation_id` are **carried forward** onto the successor row when an exception is retained across a revalidation, so the Shipment Review screen can honestly say "open since 1 September" even though the row itself was written during evaluation v2. The `(evaluation_id, rule_id)` unique index guarantees one exception per firing rule per evaluation.

## 2.10 Evidence

```sql
CREATE TABLE evidence (
  id                            TEXT PRIMARY KEY,
  exception_id                  TEXT NOT NULL REFERENCES exceptions(id) ON DELETE RESTRICT,
  kind                          TEXT NOT NULL CHECK (kind IN ('OBSERVED','COMPARISON','MISSING','CONTEXT')),
  field_path                    TEXT NOT NULL,
  raw_value                     TEXT,
  normalized_value              TEXT,
  comparison_field_path         TEXT,
  comparison_raw_value          TEXT,
  comparison_normalized_value   TEXT,
  expected                      TEXT,
  observed                      TEXT,
  assertion                     TEXT,
  truncated                     INTEGER NOT NULL DEFAULT 0 CHECK (truncated IN (0,1)),
  display_order                 INTEGER NOT NULL,
  created_at                    TEXT NOT NULL,
  CHECK (raw_value IS NULL OR length(raw_value) <= 2000)
);
CREATE INDEX idx_evidence_exception ON evidence(exception_id, display_order);
```

Evidence rows are insert-only and are **structured, never prose** — `field_path` + `raw_value` + `normalized_value`, not a sentence. The plain-language rendering is the AI summary's job (F7) and is stored separately in `ai_outputs`. That separation is what lets the Recommended Resolution screen display the evidence beside the AI text so a specialist can verify the machine's claim against the fields it claims to have read.

F5 §Validation requires ≥ 1 evidence row per exception and type-specific `kind`s. A SQLite `CHECK` cannot span tables, so the constraint is enforced in the repository's transactional write (`EXCEPTION_EVIDENCE_REQUIRED`) and asserted by test RE-18.

## 2.11 Ingestion Batches

```sql
CREATE TABLE ingestion_batches (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  schema_version  TEXT NOT NULL,
  received_count  INTEGER NOT NULL,
  created_count   INTEGER NOT NULL,
  updated_count   INTEGER NOT NULL,
  rejected_count  INTEGER NOT NULL,
  report_json     TEXT NOT NULL,
  actor_user_id   TEXT REFERENCES users(id),
  actor_kind      TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM')),
  created_at      TEXT NOT NULL
);
```

## 2.12 Referential and Lifecycle Rules

- Every foreign key uses `ON DELETE RESTRICT`. **No cascade exists anywhere**, so no single delete can silently remove history. The only bulk removal is the administrator reset (F2 §Process step 2), which truncates in reverse-dependency order inside one transaction (`02b` §11).
- `cargo_entries.shipment_id` is the only business key exposed in URLs and the UI; all joins use surrogate IDs.
- `documents` uniqueness is scoped to active received rows, so a superseded document and its replacement coexist.
- `document_requests` uniqueness on `(cargo_entry_id, document_type) WHERE status = 'OUTSTANDING'` is the database-level expression of guard G-DUP.
- `exceptions` uniqueness on `(evaluation_id, rule_id)` guarantees one exception per firing rule per evaluation (F4 §Process step 6).
- `evaluations` uniqueness on `(cargo_entry_id, version)` plus in-transaction version assignment prevents concurrent evaluation collisions (F5 §Process step 2).

## 2.13 Indexing Rationale

Every foreign key used in a query path carries an index; the seeded dataset is ~12 shipments, so these indexes exist for correctness of query plans and for honest architecture rather than for scale.

| Index | Serves |
|---|---|
| `idx_cases_status_priority`, `idx_cases_queued` | The queue screen's default sort (`priority:desc, age:desc`) and its default exclusions — PRD §6 target of < 1 s |
| `idx_exceptions_case_status` | Open-exception counts on every case projection and every audit snapshot |
| `idx_exceptions_type_status` | Queue filtering by exception type; rule impact preview |
| `idx_evaluations_entry (version DESC)` | "Current evaluation" lookup, which happens on every shipment read |
| `idx_evidence_exception (display_order)` | Deterministic evidence ordering — the display order is a *stored* property, never a client sort |
| `idx_documents_entry_type` | The missing-document evaluator's received-set construction |
| `idx_audit_case_seq` | Timeline read and `max(sequence_no)+1` assignment under the case lock |
| `idx_notifications_role`, `idx_notifications_case` | Role-scoped notification centre and the per-case notification list |
---

# 2b. Data Model — Workflow, Governance & Transport

Conventions as in §2.1. This chunk covers users and sessions, cases, actions, recommendations, approvals, audit entries, notifications, AI outputs, and transport-support tables. **Every governance claim CargoDemo makes to CBP is expressed as a constraint or a trigger in this chunk.** §2b.12 indexes those claims to their enforcement.

## 2b.1 Users and Sessions

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,                                -- 'usr-cs-001'
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  role        TEXT NOT NULL CHECK (role IN
                ('CARGO_SPECIALIST','SUPERVISOR','SYSTEM_ADMINISTRATOR')),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  token_hash    TEXT NOT NULL UNIQUE,                          -- sha256 of a 32-byte random token
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  ended_at      TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id, ended_at);
```

The token is **never stored in plaintext and never encodes the role** (F14 §Validation). Role resolution always joins to the `users` row, so a forged or replayed token cannot grant authority even in principle — it can at most impersonate an identity whose authority is then read from the database. The `role` `CHECK` closes the enum at three values, so `POST /api/users` cannot introduce a fourth role even if a handler check were removed.

## 2b.2 Cases

```sql
CREATE TABLE cases (
  id                            TEXT PRIMARY KEY,
  cargo_entry_id                TEXT NOT NULL UNIQUE REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  shipment_id                   TEXT NOT NULL,                 -- denormalized for queue/audit readability
  status                        TEXT NOT NULL CHECK (status IN
                                  ('NEW','IN_REVIEW','AWAITING_INFORMATION','ON_HOLD',
                                   'ESCALATED','PENDING_APPROVAL','CLEARED')),
  priority                      TEXT NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority_basis_json           TEXT NOT NULL DEFAULT '[]',    -- F5 §Process step 6
  queued                        INTEGER NOT NULL DEFAULT 0 CHECK (queued IN (0,1)),
  current_evaluation_id         TEXT REFERENCES evaluations(id),
  open_exception_count          INTEGER NOT NULL DEFAULT 0,
  exception_type_summary        TEXT NOT NULL DEFAULT '',      -- sorted, comma-joined distinct open types
  assigned_to_user_id           TEXT REFERENCES users(id),
  hold_reason                   TEXT CHECK (hold_reason IS NULL OR hold_reason IN
                                  ('AWAITING_EXTERNAL_INPUT','PENDING_POLICY_GUIDANCE','RESOURCE_CONSTRAINT','OTHER')),
  hold_reason_detail            TEXT,
  hold_placed_by_user_id        TEXT REFERENCES users(id),
  hold_placed_at                TEXT,
  escalation_reason             TEXT,
  escalated_by_user_id          TEXT REFERENCES users(id),
  escalated_to_user_id          TEXT REFERENCES users(id),
  escalated_at                  TEXT,
  approving_official_user_id    TEXT REFERENCES users(id),
  approving_official_name       TEXT,
  approving_official_role       TEXT,
  cleared_at                    TEXT,
  last_action_id                TEXT REFERENCES case_actions(id),
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL,
  -- the schema-level expression of "no clearance without a named approving official" (F11 SoD-1)
  CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL))
);
CREATE INDEX idx_cases_status_priority ON cases(status, priority, updated_at DESC);
CREATE INDEX idx_cases_queued          ON cases(queued, priority);
```

**The final `CHECK` is the single most important line of SQL in the product.** It makes "no clearance without a named approving official" — the central claim of the demo — a property the storage engine enforces. A defective handler, a mistaken migration, or a direct SQL update cannot produce a `CLEARED` case with a null approving official; the write simply fails.

`cases.updated_at` in epoch-millis form is the `X-Case-Version` value used for optimistic concurrency (F3 §Process step 9). `approving_official_name` and `approving_official_role` are **denormalized copies**, so the audit record remains readable even if the `users` row is later renamed or deactivated.

## 2b.3 Case Actions

```sql
CREATE TABLE case_actions (
  id                    TEXT PRIMARY KEY,
  case_id               TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id        TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  action                TEXT NOT NULL CHECK (action IN
                          ('REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW','CLEAR_EXCEPTION',
                           'PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR')),
  status_before         TEXT NOT NULL,
  status_after          TEXT NOT NULL,
  justification         TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
  parameters_json       TEXT NOT NULL DEFAULT '{}',            -- action-specific fields
  evaluation_id         TEXT REFERENCES evaluations(id),
  actor_user_id         TEXT NOT NULL REFERENCES users(id),
  actor_name            TEXT NOT NULL,
  actor_role            TEXT NOT NULL CHECK (actor_role IN ('CARGO_SPECIALIST','SUPERVISOR')),
  audit_entry_id        TEXT NOT NULL,
  idempotency_key       TEXT,
  occurred_at           TEXT NOT NULL
);
CREATE INDEX idx_case_actions_case ON case_actions(case_id, occurred_at);
CREATE UNIQUE INDEX idx_case_actions_idem ON case_actions(case_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

Three constraints carry governance weight here:

- **`action` is a closed enum of exactly five values.** `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` are not among them and cannot be written to this table — the approval surface is disjoint by construction (F11 §Validation).
- **`actor_role` excludes `SYSTEM_ADMINISTRATOR` at the schema level** — the administrator cannot adjudicate (F14 matrix rows 20–24), and no code path can make them.
- **`justification` has a `CHECK (length(trim(…)) >= 10)`** — invariant I3 (mandatory justification) is enforced by storage, so there is no transition path that omits it. Note the `trim`: whitespace padding does not satisfy the constraint.

## 2b.4 Recommendations

```sql
CREATE TABLE recommendations (
  id                          TEXT PRIMARY KEY,
  case_id                     TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluation_id               TEXT NOT NULL REFERENCES evaluations(id),
  action_id                   TEXT NOT NULL REFERENCES case_actions(id),
  recommended_action          TEXT NOT NULL DEFAULT 'CLEAR' CHECK (recommended_action = 'CLEAR'),
  resolution_basis            TEXT NOT NULL CHECK (resolution_basis IN
                                ('EXCEPTIONS_RESOLVED','EXCEPTIONS_ACCEPTED','MIXED')),
  exception_ids_json          TEXT NOT NULL,
  justification               TEXT NOT NULL,
  ai_recommendation_snapshot_json TEXT NOT NULL,
  concurrence                 TEXT NOT NULL CHECK (concurrence IN
                                ('AGREED','DIVERGED','NO_RECOMMENDATION_PRESENT',
                                 'NOT_APPLICABLE')),
  status                      TEXT NOT NULL CHECK (status IN
                                ('PENDING','APPROVED','REJECTED','WITHDRAWN','RETURNED_FOR_INFORMATION')),
  withdrawal_reason           TEXT,
  recommended_by_user_id      TEXT NOT NULL REFERENCES users(id),
  recommended_by_name         TEXT NOT NULL,
  recommended_by_role         TEXT NOT NULL,
  recommended_at              TEXT NOT NULL,
  closed_at                   TEXT
);
CREATE UNIQUE INDEX idx_recommendations_pending ON recommendations(case_id)
  WHERE status = 'PENDING';                                    -- enforces guard G-REC (F09a §3)
```

`concurrence` records whether the human's clearance recommendation **agreed with or diverged from** the AI's advice at the moment it was made; on an approval decision it is `NOT_APPLICABLE`, since the AI never advises `APPROVE_CLEARANCE`. Divergence is not an error — it is the point of the design, and storing it is what makes human authority demonstrable on the audit screen rather than merely asserted. In the canonical walkthrough the specialist diverges from `ESCALATE_TO_SUPERVISOR`, and step 10 shows it.

The partial unique index is guard G-REC: one pending recommendation per case, enforced by storage.

## 2b.5 Approvals

```sql
CREATE TABLE approvals (
  id                              TEXT PRIMARY KEY,
  case_id                         TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  recommendation_id               TEXT NOT NULL REFERENCES recommendations(id),
  decision                        TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT','REQUEST_INFO')),
  rejection_reason                TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN
                                    ('INSUFFICIENT_JUSTIFICATION','EVIDENCE_INCOMPLETE',
                                     'EXCEPTION_NOT_RESOLVED','POLICY_DISAGREEMENT','OTHER')),
  justification                   TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
  approver_user_id                TEXT NOT NULL REFERENCES users(id),
  approver_name                   TEXT NOT NULL,
  approver_role                   TEXT NOT NULL CHECK (approver_role = 'SUPERVISOR'),
  recommended_by_user_id          TEXT NOT NULL REFERENCES users(id),   -- copied for the SoD-2 constraint
  recommendation_evaluation_version INTEGER NOT NULL,
  current_evaluation_version      INTEGER NOT NULL,
  evidence_changed                INTEGER NOT NULL DEFAULT 0 CHECK (evidence_changed IN (0,1)),
  acknowledged_evidence_changed   INTEGER NOT NULL DEFAULT 0 CHECK (acknowledged_evidence_changed IN (0,1)),
  audit_entry_id                  TEXT NOT NULL,
  idempotency_key                 TEXT,
  decided_at                      TEXT NOT NULL,
  -- SoD-1: only a supervisor approves (approver_role CHECK above)
  -- SoD-2: the approver is never the recommender
  CHECK (approver_user_id <> recommended_by_user_id),
  CHECK (decision <> 'REJECT' OR rejection_reason IS NOT NULL),
  CHECK (evidence_changed = 0 OR acknowledged_evidence_changed = 1)
);
CREATE INDEX idx_approvals_case ON approvals(case_id, decided_at);
```

**These are the database-level enforcement of F11's governance claims.** Handler-level checks come first and produce friendly errors (`403 SELF_APPROVAL_BLOCKED`); these constraints make a bypass impossible even by a defective code path. Test AC-02 asserts the block at *both* layers — the handler and the trigger — precisely because a single-layer guarantee is a convention rather than an architecture.

`recommended_by_user_id` is copied onto the approval row because SQLite `CHECK` constraints cannot reference another table. The copy is what turns separation of duties into a column comparison the engine can enforce.

The third `CHECK` closes a subtle governance hole: if evidence changed between the recommendation and the approval, the approver must have explicitly acknowledged it. A supervisor cannot approve a stale recommendation without recording that they knew it was stale.

## 2b.6 Audit Entries

```sql
CREATE TABLE audit_entries (
  id                          TEXT PRIMARY KEY,
  case_id                     TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id              TEXT REFERENCES cargo_entries(id),
  shipment_id                 TEXT,
  sequence_no                 INTEGER NOT NULL,
  entry_class                 TEXT NOT NULL CHECK (entry_class IN
                                ('SYSTEM_EVENT','AI_OUTPUT','HUMAN_ACTION','APPROVAL_DECISION','ACCESS_DENIED')),
  event_type                  TEXT NOT NULL,

  -- the eight required fields (F12 §1)
  exceptions_json             TEXT NOT NULL,                   -- 1
  evidence_reviewed_json      TEXT NOT NULL,                   -- 2
  ai_recommendation_json      TEXT NOT NULL,                   -- 3  (explicit {present:false} when absent)
  user_decision               TEXT,                            -- 4
  user_decision_detail_json   TEXT,                            -- 4
  justification               TEXT,                            -- 5
  occurred_at                 TEXT NOT NULL,                   -- 6
  approving_official_user_id  TEXT REFERENCES users(id),       -- 7
  approving_official_name     TEXT,                            -- 7
  approving_official_role     TEXT,                            -- 7
  notification_id             TEXT REFERENCES notifications(id), -- 8
  notification_snapshot_json  TEXT,                            -- 8

  -- attribution and integrity
  actor_kind                  TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM','AI')),
  actor_user_id               TEXT REFERENCES users(id),
  actor_name                  TEXT,
  actor_role                  TEXT,
  system_actor_label          TEXT,
  case_status_before          TEXT,
  case_status_after           TEXT,
  evaluation_version          INTEGER,
  rule_set_fingerprint        TEXT,
  request_id                  TEXT,
  prev_hash                   TEXT NOT NULL,
  entry_hash                  TEXT NOT NULL,

  UNIQUE (case_id, sequence_no),
  -- "the AI never decides" as a storage constraint (00-header §0.4.7)
  CHECK (actor_kind <> 'AI' OR user_decision IS NULL),
  -- human and approval entries must be attributable and justified
  CHECK (entry_class NOT IN ('HUMAN_ACTION','APPROVAL_DECISION')
         OR (actor_user_id IS NOT NULL AND justification IS NOT NULL AND user_decision IS NOT NULL)),
  -- an approval decision must name the approving official and its notification
  CHECK (entry_class <> 'APPROVAL_DECISION'
         OR (approving_official_user_id IS NOT NULL AND approving_official_name IS NOT NULL))
);
CREATE INDEX idx_audit_case_seq  ON audit_entries(case_id, sequence_no);
CREATE INDEX idx_audit_actor     ON audit_entries(actor_user_id, occurred_at);
CREATE INDEX idx_audit_event     ON audit_entries(event_type, occurred_at);
```

**`CHECK (actor_kind <> 'AI' OR user_decision IS NULL)` is the machine-readable form of "the AI never decides."** It is not a comment, a policy, or a test — it is a condition the storage engine evaluates on every insert. An implementation that tried to record an AI-authored decision would fail to write the row. Test AU-09 asserts it holds across the entire post-walkthrough database.

**Fields 1, 2, and 3 are `NOT NULL` with explicit empty forms** (`'[]'`, `'{}'`, `{"present":false,"reason":"NOT_GENERATED"}`). Absence is *recorded*, never merely missing — which is what makes the eight-field completeness claim checkable rather than aspirational. Evidence and the AI recommendation are stored as **snapshots, not foreign keys** (AD-13): a later revalidation changes the live exception set, and the audit entry must still show what the decider actually saw (AU-08).

### Append-only triggers (F12 §3)

```sql
CREATE TRIGGER audit_entries_no_delete
BEFORE DELETE ON audit_entries
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_IMMUTABLE: audit records cannot be deleted');
END;

-- The single narrow exemption: notification_id / notification_snapshot_json may go null -> non-null once.
CREATE TRIGGER audit_entries_no_update
BEFORE UPDATE ON audit_entries
WHEN NOT (
     OLD.notification_id IS NULL
 AND NEW.notification_id IS NOT NULL
 AND OLD.id                         IS NEW.id
 AND OLD.case_id                    IS NEW.case_id
 AND OLD.sequence_no                IS NEW.sequence_no
 AND OLD.entry_class                IS NEW.entry_class
 AND OLD.event_type                 IS NEW.event_type
 AND OLD.exceptions_json            IS NEW.exceptions_json
 AND OLD.evidence_reviewed_json     IS NEW.evidence_reviewed_json
 AND OLD.ai_recommendation_json     IS NEW.ai_recommendation_json
 AND OLD.user_decision              IS NEW.user_decision
 AND OLD.user_decision_detail_json  IS NEW.user_decision_detail_json
 AND OLD.justification              IS NEW.justification
 AND OLD.occurred_at                IS NEW.occurred_at
 AND OLD.approving_official_user_id IS NEW.approving_official_user_id
 AND OLD.actor_kind                 IS NEW.actor_kind
 AND OLD.actor_user_id              IS NEW.actor_user_id
 AND OLD.prev_hash                  IS NEW.prev_hash
 AND OLD.entry_hash                 IS NEW.entry_hash
)
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_IMMUTABLE: audit records are append-only');
END;
```

Any second attempt to set `notification_id` fails the `OLD.notification_id IS NULL` condition and aborts (test AU-05). Note the `IS` comparisons rather than `=`: `NULL = NULL` is `NULL` in SQL, which would make the `WHEN` clause silently permissive for any nullable column. `IS` gives null-safe equality, so a change from a value to `NULL` is correctly detected as a mutation and rejected.

**Hash chain.** `entry_hash = SHA256(canonical_json(entry_without_hashes) || prev_hash)`, where `prev_hash` is the previous entry's hash for the same case, or a fixed genesis constant for the first. Canonical JSON means sorted keys, no whitespace, and ISO-8601 UTC ms timestamps — the same canonicalization used everywhere else in the system (`01-components` §1.3.3). Tampering with any historical row breaks verification for every subsequent row, which `GET /api/cases/{id}/audit/verify` reports with the exact `first_invalid_sequence_no`. Test AU-06 tampers with a middle row via direct SQL and asserts the failure lands on that row.

## 2b.7 Notifications

```sql
CREATE TABLE notifications (
  id              TEXT PRIMARY KEY,
  case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id  TEXT REFERENCES cargo_entries(id),
  shipment_id     TEXT,
  audit_entry_id  TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  recipient_role  TEXT NOT NULL CHECK (recipient_role IN
                    ('CARGO_SPECIALIST','SUPERVISOR','SYSTEM_ADMINISTRATOR')),
  recipient_user_id TEXT REFERENCES users(id),
  subject         TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body            TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  transmitted     INTEGER NOT NULL DEFAULT 0 CHECK (transmitted = 0),   -- structurally never transmitted
  generated_at    TEXT NOT NULL
);
CREATE INDEX idx_notifications_role ON notifications(recipient_role, generated_at DESC);
CREATE INDEX idx_notifications_case ON notifications(case_id, generated_at);

CREATE TRIGGER notifications_no_delete
BEFORE DELETE ON notifications
BEGIN
  SELECT RAISE(ABORT, 'NOTIFICATION_IMMUTABLE: notifications cannot be deleted');
END;

CREATE TABLE notification_reads (
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  read_at         TEXT NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);
```

`CHECK (transmitted = 0)` makes **"generated, not transmitted" a schema guarantee rather than a convention** (test AU-11). The column exists solely so the guarantee is expressible: a transmission attempt could not even be *recorded*, let alone performed. This is reinforced by four other properties (`06a` §5): no SMTP/SMS/webhook client is a project dependency; every rendered body ends with the fixed sentence *"This notification was generated and recorded by CargoDemo. It was not transmitted to any external recipient."*; and every notification is displayed under the "Generated, not transmitted" label.

Read state lives in a separate `notification_reads` join table rather than a column on `notifications`, because marking a notification read must not mutate an immutable row.

## 2b.8 AI Outputs

```sql
CREATE TABLE ai_outputs (
  id                     TEXT PRIMARY KEY,
  kind                   TEXT NOT NULL CHECK (kind IN ('SUMMARY','RECOMMENDATION')),
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id                TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluation_id          TEXT NOT NULL REFERENCES evaluations(id),
  content_json           TEXT NOT NULL,
  provenance_json        TEXT NOT NULL,                        -- provider, model, mode, timestamps, latency
  grounding_fingerprint  TEXT NOT NULL,
  generation_mode        TEXT NOT NULL CHECK (generation_mode IN
                           ('LLM','FALLBACK_PROVIDER_DISABLED','FALLBACK_PROVIDER_ERROR',
                            'FALLBACK_TIMEOUT','FALLBACK_VALIDATION_FAILED')),
  recommended_action     TEXT,                                 -- RECOMMENDATION only; one of the five
  confidence_level       TEXT CHECK (confidence_level IS NULL OR confidence_level IN ('HIGH','MEDIUM','LOW')),
  confidence_basis       TEXT,
  superseded_by          TEXT REFERENCES ai_outputs(id),
  regenerated_by_user_id TEXT REFERENCES users(id),
  generated_at           TEXT NOT NULL,
  -- an AI output may never name an approval action, and confidence always carries a basis
  CHECK (recommended_action IS NULL OR recommended_action IN
         ('REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW','CLEAR_EXCEPTION',
          'PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR')),
  CHECK (confidence_level IS NULL OR confidence_basis IS NOT NULL)
);
CREATE UNIQUE INDEX idx_ai_outputs_current ON ai_outputs(cargo_entry_id, kind, evaluation_id)
  WHERE superseded_by IS NULL;
```

Two `CHECK`s encode governance:

- **`recommended_action` cannot be an approval code.** `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` are absent from the allowed set, so the system structurally cannot recommend that a supervisor approve something. Approval is a human prerogative the machine does not advise on.
- **`confidence_level` requires `confidence_basis`.** A confidence badge without a stated basis is decorative rather than inspectable, so the schema forbids it (`CONFIDENCE_BASIS_REQUIRED`, test AI-05).

`generation_mode` is the audit trail of *how* each output was produced. Every `FALLBACK_*` value is a first-class recorded outcome, not an error state — the walkthrough's default configuration produces `FALLBACK_PROVIDER_DISABLED` on every row, and that is the supported demo condition.

The partial unique index caches exactly one live output per `(shipment, kind, evaluation_version)`; regeneration supersedes rather than overwrites, so the audit screen can show what the decider was advised at each point in history (`GET /api/shipments/{id}/ai/outputs`).

## 2b.9 Transport Support

```sql
CREATE TABLE idempotency_keys (
  key            TEXT NOT NULL,
  scope          TEXT NOT NULL,                                -- 'case:<id>:action' | 'request:<id>:upload' | …
  request_hash   TEXT NOT NULL,                                -- sha256 of the canonical request body
  response_json  TEXT NOT NULL,
  status_code    INTEGER NOT NULL,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (key, scope)
);

CREATE TABLE request_log (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL,
  method        TEXT NOT NULL,
  path          TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  actor_role    TEXT,
  duration_ms   INTEGER NOT NULL,
  error_code    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_request_log_created ON request_log(created_at DESC);
```

`request_log` stores **no request bodies and no field values** — only routing and outcome metadata — so it cannot become an accidental data sink (PRD §6 Privacy). It is bounded to the most recent 10 000 rows by a trim on insert.

`idempotency_keys` stores the `request_hash` alongside the response so a replay with an *identical* payload returns the original response, while a replay of the same key with a *different* payload is rejected with `409 IDEMPOTENCY_KEY_REUSED` rather than silently applying the second payload.

## 2b.10 Governance Claim → Enforcement Index

This table is the answer to "how do you know?" during a CBP walkthrough. Every claim is enforced at two or more layers.

| Claim (PRD §6 / §7) | Schema enforcement | Other layers |
|---|---|---|
| No clearance without a named approving official | `cases CHECK (status <> 'CLEARED' OR approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL)` | Single transition row T31; G-AUDIT completeness gate; `ApprovalService` is the only writer; WF-02, AU-02 |
| Only a supervisor approves | `approvals CHECK (approver_role = 'SUPERVISOR')` | RBAC row 29; transition table T31 CS=❌; AC-04, AC-05 |
| A recommender cannot approve their own recommendation | `approvals CHECK (approver_user_id <> recommended_by_user_id)` | Guard G-SOD as a resource predicate inside the transaction; AC-02 asserts both layers |
| The AI never decides | `audit_entries CHECK (actor_kind <> 'AI' OR user_decision IS NULL)` | `ai_outputs.recommended_action` excludes approval codes; `AiAssistService` writes only `ai_outputs`; AI-08, AU-09 |
| The administrator never adjudicates | `case_actions CHECK (actor_role IN ('CARGO_SPECIALIST','SUPERVISOR'))` | RBAC rows 20–28 deny ADM; AC-05 |
| Every action carries a justification | `case_actions`/`approvals CHECK (length(trim(justification)) >= 10)` | Route schema minLength; invariant I3; WF-04 |
| Audit records are append-only | `BEFORE UPDATE`/`BEFORE DELETE` triggers | No PATCH/PUT/DELETE route exists; `AuditRepository` has no `update()`/`delete()`; hash chain; AU-04…AU-06 |
| Notifications are never transmitted | `notifications CHECK (transmitted = 0)` | No SMTP/SMS dependency; fixed body sentence; UI label; AU-11 |
| One pending recommendation per case | Partial unique index `idx_recommendations_pending` | Guard G-REC; WF-10 |
| One outstanding request per document type | Partial unique index `idx_document_requests_outstanding` | Guard G-DUP; WF-10 |
| Exactly three exception types | `CHECK (exception_type IN (…))` on `rules` **and** `exceptions` | Closed evaluator map with no registration API; `EXCEPTION_TYPE_UNSUPPORTED` |
| Confidence always has a stated basis | `ai_outputs CHECK (confidence_level IS NULL OR confidence_basis IS NOT NULL)` | `CONFIDENCE_BASIS_REQUIRED`; AI-05 |
| History is never deleted | `ON DELETE RESTRICT` everywhere; no cascades | No `DELETE FROM exceptions` code path; RV-03 asserts monotonic row counts |

## 2b.11 Reset Order

`POST /api/admin/reset` (F2, F22) truncates in this order inside one transaction, then reseeds:

```
notification_reads → notifications → audit_entries → approvals → recommendations →
case_actions → ai_outputs → evidence → exceptions → evaluations → document_requests →
documents → cases → cargo_entries → ingestion_batches → rules → sessions → users →
idempotency_keys → request_log
```

The append-only delete triggers on `audit_entries` and `notifications` are dropped and recreated around the reset transaction by the migration-aware reset routine. **This is the only code path permitted to do so**, it is administrator-gated, and it operates on the whole database rather than any selected subset (F12 §3.5). Selective deletion of a single entry or a single case's history is not implementable through any surface. The document storage directory is cleared in the same operation so storage and database never diverge, and the first row of the new audit chain is a `DEMO_RESET` entry (test DE-02).
---

# 3. API Design

All interfaces in chunks `03a`–`03c` live in `src/shared/api/` and are imported by both the Fastify route definitions and the React data layer, so a response shape cannot drift between server and client (`01-components` §1.1). Each interface is paired with a JSON Schema used for runtime validation and for generating `GET /api/openapi.json`.

## 3.1 Conventions

| Concern | Rule |
|---|---|
| Base path | `/api`; every other path serves the SPA with `index.html` fallback |
| Origin | Same-origin only. **No CORS configuration exists**, removing an entire class of demo-day failure (`Y3` §8) |
| Auth | `X-CargoDemo-Session` header, or the `cargodemo_session` `HttpOnly` cookie for the embedded-preview case where header injection is inconvenient |
| Content type | `application/json` everywhere except the upload route (`multipart/form-data`) |
| Lists | Wrapped: `{ data, page, applied }` |
| Single resources | Unwrapped, with `_links` for related collections |
| Timestamps | ISO-8601 UTC with milliseconds, as strings |
| Money | Decimal **strings** (`"85000.00"`), never JS numbers |
| Enums | Canonical codes verbatim from FRD `00-header` §0.4 |
| Unknown fields | Rejected — every schema is `additionalProperties: false`, so a typo is a loud `422` rather than a silently ignored parameter |
| Unknown query params | Rejected with `422 INVALID_QUERY_PARAM`. Silent absorption is how a filter quietly stops filtering |
| Errors | The uniform `ErrorEnvelope` of §3c.7. Clients branch on `code`, never on `message` |

## 3.2 Shared Types

```ts
// ─── Canonical vocabularies (FRD 00-header §0.4) ───────────────────────────
export type Role          = 'CARGO_SPECIALIST' | 'SUPERVISOR' | 'SYSTEM_ADMINISTRATOR';
export type CaseStatus    = 'NEW' | 'IN_REVIEW' | 'AWAITING_INFORMATION' | 'ON_HOLD'
                          | 'ESCALATED' | 'PENDING_APPROVAL' | 'CLEARED';
export type UserAction    = 'REQUEST_INFORMATION' | 'SEND_FOR_SPECIALIST_REVIEW'
                          | 'CLEAR_EXCEPTION' | 'PLACE_ON_HOLD' | 'ESCALATE_TO_SUPERVISOR';
export type ExceptionType = 'MISSING_REQUIRED_DOCUMENT' | 'INVALID_HTS_CODE'
                          | 'CONFLICTING_COUNTRY_OF_ORIGIN';
export type ExceptionStatus = 'OPEN' | 'RESOLVED_BY_REVALIDATION'
                            | 'CLEARED_BY_DECISION' | 'SUPERSEDED_BY_EVALUATION';
export type Severity      = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Priority      = Severity;
export type ActorKind     = 'HUMAN' | 'SYSTEM' | 'AI';
export type EntryClass    = 'SYSTEM_EVENT' | 'AI_OUTPUT' | 'HUMAN_ACTION'
                          | 'APPROVAL_DECISION' | 'ACCESS_DENIED';
export type EvaluationTrigger = 'INGESTION' | 'MANUAL_REVALIDATION' | 'DOCUMENT_UPLOAD'
                              | 'RULE_CHANGE' | 'SEED';
export type GenerationMode = 'LLM' | 'FALLBACK_PROVIDER_DISABLED' | 'FALLBACK_PROVIDER_ERROR'
                           | 'FALLBACK_TIMEOUT' | 'FALLBACK_VALIDATION_FAILED';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Concurrence   = 'AGREED' | 'DIVERGED' | 'NO_RECOMMENDATION_PRESENT' | 'NOT_APPLICABLE';
export type EvidenceKind  = 'OBSERVED' | 'COMPARISON' | 'MISSING' | 'CONTEXT';
export type DocumentStatus = 'RECEIVED' | 'NOT_RECEIVED';
export type Provenance    = 'SEEDED' | 'INGESTED' | 'SIMULATED_UPLOAD';
export type RequestStatus = 'OUTSTANDING' | 'FULFILLED' | 'CANCELLED' | 'CANCELLED_BY_CLEARANCE';

/** Epoch-millis form of cases.updated_at, used for optimistic concurrency. */
export type CaseVersion = number;

export interface ActorRef  { kind: ActorKind; user_id: string | null; name: string | null; role: Role | null; }
export interface UserRef   { id: string; name: string; role: Role; }
export interface PageInfo  { page: number; page_size: number; total: number; total_pages: number; }
export interface ListResponse<T, TApplied = Record<string, unknown>> {
  data: T[]; page: PageInfo; applied?: TApplied;
}

export interface EvidenceRow {
  kind: EvidenceKind;
  field_path: string;
  raw_value: string | null;
  normalized_value: string | null;
  comparison_field_path?: string | null;
  comparison_raw_value?: string | null;
  comparison_normalized_value?: string | null;
  expected?: string | null;
  observed?: string | null;
  assertion?: string | null;
  truncated?: boolean;
  display_order: number;
}

export type MissingInformation =
  | { document_type: string; requirement: string; required_by_rule: string; policy_reference: string }
  | { field_path: string; requirement: string; observed_digits?: number; missing_digits?: number };

export interface RuleRef {
  id: string; name: string; version: number;
  description: string; policy_reference: string; severity: Severity;
}

export interface ExceptionView {
  exception_id: string;
  exception_type: ExceptionType;
  sub_reason: string;
  severity: Severity;
  status: ExceptionStatus;
  assertion: string;
  opened_at: string;
  resolved_at?: string | null;
  resolution_reason?: string | null;
  rule: RuleRef;
  evidence: EvidenceRow[];
  missing_information: MissingInformation[];
}

export interface AiProvenance {
  provider: string;                 // 'deterministic-fallback' when in fallback
  model: string;                    // e.g. 'cargodemo-fallback-recommendation@1'
  generation_mode: GenerationMode;
  generated_at: string;
  grounding_fingerprint: string;    // 'sha256:…'
  /** ALWAYS 'DETERMINISTIC'. The provider never chooses the action. */
  action_source?: 'DETERMINISTIC';
  rationale_source?: 'LLM' | 'FALLBACK';
  is_ai_generated: true;
}

/** Snapshot embedded in every human-action audit entry (F12 field 3). Never null. */
export type AiRecommendationSnapshot =
  | { present: false; reason: 'NOT_GENERATED' }
  | {
      present: true;
      recommended_action: UserAction;
      confidence_level: ConfidenceLevel;
      confidence_basis: string;
      rationale: string;
      provenance: AiProvenance;
      concurrence: Concurrence;
    };
```

## 3.3 Queue — `GET /api/queue` (CS, SUP, ADM)

```ts
export interface QueueQuery {
  status?: CaseStatus[];
  exception_type?: ExceptionType[];
  priority?: Priority[];
  assignment?: 'any' | 'me' | 'unassigned';
  pending_approval_only?: boolean;
  include_clean?: boolean;          // default false — zero-exception cases are off the queue
  include_cleared?: boolean;        // default false
  sort?: string;                    // default 'priority:desc,age:desc'
  page?: number;
  page_size?: number;
}

export interface QueueRow {
  shipment_id: string;
  case_id: string;
  importer_name: string;
  carrier_name: string;
  priority: Priority;
  priority_basis_summary: string;
  status: CaseStatus;
  open_exception_count: number;
  exception_types: Array<{ type: ExceptionType; count: number }>;
  exception_summary: string;
  oldest_exception_opened_at: string | null;
  age_days: number;
  assigned_to: UserRef | null;
  pending_approval: { recommendation_id: string; recommended_by: UserRef; recommended_at: string } | null;
  shipment_value_usd: string;
  updated_at: string;
}

export type QueueResponse = ListResponse<QueueRow, {
  filters: Record<string, unknown>;
  sort: string;
}>;
```

`exception_types` is an array rather than a single value so multi-exception shipments are **clearly indicated rather than collapsed** (F17). Default exclusions: zero-exception cases and `CLEARED` cases.

## 3.4 Shipment Detail — `GET /api/shipments/{shipment_id}` (CS, SUP, ADM)

```ts
export interface ShipmentDetail {
  shipment_id: string;
  case_id: string;
  importer_name: string;
  carrier_name: string;
  product_description: string;
  hts_code: string | null;
  hts_code_normalized: string | null;
  hts_digit_count: number | null;
  country_of_origin: string;
  country_of_origin_iso2: string | null;
  manufacturer: {
    name: string;
    address: {
      line1: string; city: string | null; region: string | null;
      postal_code: string | null; country: string; country_iso2: string | null;
    };
  };
  shipment_value_usd: string;
  entry_date: string;
  case: {
    status: CaseStatus;
    priority: Priority;
    priority_basis: Array<{ factor: string; detail: string; from: Priority | null; to: Priority }>;
    open_exception_count: number;
    current_evaluation: {
      id: string; version: number; evaluated_at: string;
      trigger: EvaluationTrigger; rule_set_fingerprint: string;
    } | null;
    assigned_to: UserRef | null;
    hold_reason: string | null;
    escalated_to: UserRef | null;
    approving_official: UserRef | null;
    cleared_at: string | null;
    case_version: CaseVersion;
  };
  ingestion: { source: string; batch_id: string | null };
  _links: {
    exceptions: string; documents: string; ai_summary: string;
    ai_recommendation: string; audit: string; available_actions: string;
  };
}
```

`priority_basis` is returned as structured factors rather than a sentence so the screen can show *why* a shipment is `CRITICAL` — derived, never hand-set.

## 3.5 Exceptions and Evaluations

```ts
// GET /api/shipments/{id}/exceptions   (CS, SUP, ADM)
export interface ExceptionsQuery {
  include_resolved?: boolean;       // default true
  evaluation_version?: number;      // default = current
}

export interface ExceptionsResponse {
  evaluation: {
    id: string; version: number; trigger: EvaluationTrigger;
    evaluated_at: string; rule_set_fingerprint: string;
  };
  open: ExceptionView[];
  resolved: ExceptionView[];
  counts: { open: number; resolved_by_revalidation: number; cleared_by_decision: number };
}

// GET /api/shipments/{id}/evaluations   (CS, SUP, ADM)  — newest first
export interface EvaluationSummary {
  id: string; version: number; trigger: EvaluationTrigger; evaluated_at: string;
  actor: ActorRef; finding_count: number; rule_set_fingerprint: string; exception_summary: string;
}
export type EvaluationListResponse = EvaluationSummary[];

// GET /api/shipments/{id}/evaluations/{version}  →  ExceptionsResponse (historical)

// GET /api/shipments/{id}/evaluations/{a}/diff/{b}   (CS, SUP, ADM)
export interface ResolvedExceptionDelta {
  exception_id: string; rule_id: string; exception_type: ExceptionType;
  resolution_reason: string; was_open_since: string;
}
export interface RetainedExceptionDelta {
  exception_id: string; prior_exception_id: string; rule_id: string;
  exception_type?: ExceptionType; open_since: string;
  missing_information_before: MissingInformation[];
  missing_information_after: MissingInformation[];
  evidence_changed: boolean;
}
export interface EvaluationDiff {
  from: { version: number }; to: { version: number };
  resolved: ResolvedExceptionDelta[];
  retained: RetainedExceptionDelta[];
  new: ExceptionView[];
  priority: { before: Priority; after: Priority };
  status: { before: CaseStatus; after: CaseStatus };
  open_exception_count: { before: number; after: number };
}
```

Exception order in every response is the deterministic evaluation order from F4 §Process step 3 — `(exception_type ASC, severity DESC, rule_id ASC)`. It never varies between runs, so a screenshot from one demo matches the next.

## 3.6 Documents

```ts
// GET /api/shipments/{id}/documents   (CS, SUP, ADM)
export interface DocumentView {
  id?: string;                      // absent for a not-yet-received required type
  document_type: string;
  display_name: string;
  status: DocumentStatus;
  provenance: Provenance | null;
  filename?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  content_hash?: string | null;
  received_at?: string | null;
  uploaded_by?: UserRef | null;
  source_request_id?: string | null;
  required_by_rules: string[];
  outstanding_request?: { id: string; requested_by: string; requested_at: string } | null;
  _links?: { content: string };
}
export type DocumentsResponse = { data: DocumentView[] };

// GET /api/shipments/{id}/document-requests   (CS, SUP, ADM)
export interface DocumentRequestView {
  id: string;
  document_type: string;
  status: RequestStatus;
  requested_by: UserRef;
  requested_at: string;
  requested_from: string | null;
  due_by: string | null;
  fulfilled_by: UserRef | null;
  fulfilled_at: string | null;
  fulfilling_document_id: string | null;
  cancellation_reason: string | null;
  cancelled_by: UserRef | null;
  cancelled_at: string | null;
  linked_exception_id: string | null;
  linked_rule_id: string | null;
}

// GET /api/documents/{id}/content  (CS, SUP, ADM)
//   Streams the stored synthetic file.
//   Content-Type from mime_type; Content-Disposition: attachment.

// GET /api/shipments/{id}/upload-fixtures   (CS, SUP — ADM denied)
export interface UploadFixture {
  fixture_id: string; document_type: string; filename: string;
  mime_type: string; size_bytes: number; description: string;
}
export type UploadFixturesResponse = UploadFixture[];
```

`DocumentView` intentionally represents a *required but not received* document type as a row with `status: 'NOT_RECEIVED'` and no `id`. The Shipment Review screen must show what is missing as prominently as what is present — that is the whole point of walkthrough step 5.

## 3.7 Audit — `GET /api/cases/{id}/audit` (CS, SUP, ADM)

```ts
export interface AuditQuery {
  entry_class?: EntryClass;
  since_sequence_no?: number;
  page?: number;
  page_size?: number;               // 1–500, default 100 — a timeline is meant to be read whole
}

/** The eight required fields (F12 §1) are fields 1–8 below, each explicitly present. */
export interface AuditEntryView {
  id: string;
  sequence_no: number;
  entry_class: EntryClass;
  event_type: string;
  occurred_at: string;                                  // 6 — server clock, monotonic per case
  actor: ActorRef;
  status_change: { before: CaseStatus | null; after: CaseStatus | null };

  exceptions: Array<{                                   // 1
    exception_id: string; exception_type: ExceptionType; severity: Severity;
    status: ExceptionStatus; rule_id: string; rule_name?: string;
    rule_version?: number; policy_reference: string; opened_at?: string;
  }>;
  evidence_reviewed: Array<EvidenceRow & { exception_id: string }>;   // 2 — snapshot, not a reference
  ai_recommendation: AiRecommendationSnapshot;          // 3 — never null
  user_decision: string | null;                         // 4
  user_decision_detail: Record<string, unknown> | null; // 4
  justification: string | null;                         // 5 — human-authored, verbatim
  approving_official: UserRef | null;                   // 7 — non-null on APPROVAL_DECISION
  approving_official_applicable?: boolean;              // 7 — false records deliberate absence
  notification: {                                       // 8
    id: string; recipient_role: Role; subject: string;
    body: string; generated_at: string; transmitted: false;
  } | null;

  evaluation_version: number | null;
  rule_set_fingerprint: string | null;
  prev_hash: string;
  entry_hash: string;

  /** Rendered directly by F20; `authorship` drives the AI/human visual separation. */
  presentation: {
    headline: string;
    authorship: 'HUMAN' | 'AI' | 'SYSTEM';
    actor_label: string;
    decision_label: string | null;
  };
}

export interface AuditResponse {
  case: {
    id: string; shipment_id: string; status: CaseStatus;
    approving_official: UserRef | null; cleared_at: string | null;
  };
  /** Lets the screen assert on camera that the record is complete. */
  completeness: {
    total_entries: number; decision_entries: number;
    decision_entries_complete: number; missing_fields: string[];
  };
  data: AuditEntryView[];
  page: PageInfo;
}

// GET /api/cases/{id}/audit/{sequence_no}  →  AuditEntryView
// GET /api/cases/{id}/audit/verify         (CS, SUP, ADM)
export interface AuditVerifyResponse {
  valid: boolean;
  entries_checked: number;
  first_invalid_sequence_no: number | null;
  verified_at: string;
}

// GET /api/cases/{id}/audit/export?format=json|printable   (CS, SUP, ADM)
//   json      → full record + hash chain + `verification` block,
//               Content-Disposition: attachment; filename="audit-SHP-2026-0007.json"
//   printable → server-rendered HTML for the browser's print dialog.
//               No PDF toolchain is required or used.

// GET /api/audit   (SUP, ADM only — cross-case search)
export interface CrossCaseAuditQuery {
  actor_user_id?: string; event_type?: string; entry_class?: EntryClass;
  shipment_id?: string; from?: string; to?: string; page?: number; page_size?: number;
}
```

Three properties of `AuditEntryView` are load-bearing for the governance claim and are worth stating explicitly:

1. **`ai_recommendation` is never `null`.** When no recommendation existed at action time it is the explicit object `{ present: false, reason: 'NOT_GENERATED' }`. Absence is recorded, so the eight-field completeness rule is satisfiable rather than vacuous.
2. **`evidence_reviewed` is a snapshot.** After a later revalidation, this array is unchanged (AU-08). An implementation that stored foreign keys and re-joined at read time would show the reviewer evidence the decider never saw.
3. **`presentation.authorship`** drives the visual separation required by F12 §5.3 and F20: AI content is never rendered inside a human-decision container, and every AI block carries its provenance.

## 3.8 Notifications

```ts
// GET /api/notifications   (CS, SUP, ADM — scoped to the acting role's addressing)
export interface NotificationsQuery { unread_only?: boolean; case_id?: string; page?: number; page_size?: number; }
export interface NotificationView {
  id: string; case_id: string; shipment_id: string;
  event_type: string; recipient_role: Role;
  subject: string; body: string;
  generated_at: string;
  transmitted: false;               // structurally always false (schema CHECK)
  read: boolean;
  audit_entry_id: string;
}
export interface NotificationsResponse extends ListResponse<NotificationView> { unread_count: number; }

// GET /api/notifications/unread-count  →  { unread_count: number }
// GET /api/cases/{id}/notifications    →  NotificationView[]  (ascending by generated_at)
// POST /api/notifications/{id}/read    (CS ⚠ must be addressed to the acting role, SUP, ADM) → 204
// POST /api/notifications/read-all     (CS, SUP, ADM — scoped to the acting role) → { marked: number }
```

`transmitted` is typed as the literal `false`, not `boolean` — the type system mirrors the `CHECK (transmitted = 0)` constraint, so a client cannot even write code that branches on a transmitted notification.

## 3.9 Workflow Reads

```ts
// GET /api/cases/{id}/available-actions   (CS, SUP, ADM)
export type UnavailableReason =
  | 'ROLE_NOT_PERMITTED' | 'ESCALATED_REQUIRES_SUPERVISOR' | 'TRANSITION_REDUNDANT'
  | 'APPROVAL_PENDING' | 'RECOMMENDATION_ALREADY_PENDING' | 'SELF_APPROVAL_BLOCKED'
  | 'CASE_TERMINAL' | 'HOLD_REQUIRES_RELEASE' | 'NO_MISSING_DOCUMENTS';

export interface AvailableAction {
  action: UserAction;
  available: boolean;
  reason: UnavailableReason | null;      // always populated when available === false
  required_fields?: string[];
  justification_min_length?: number;
}

export interface AvailableActionsResponse {
  case_id: string;
  status: CaseStatus;
  acting_role: Role;
  actions: AvailableAction[];             // always all five, never a filtered subset
  approval: { available: boolean; reason: string | null };
  case_version: CaseVersion;
}

// GET /api/workflow/transitions   (CS, SUP, ADM) — the F09a §2 table as data
export interface TransitionRow {
  id: string;                             // 'T01' … 'T33'
  from: CaseStatus;
  action: UserAction | 'APPROVE_CLEARANCE' | 'REJECT_RECOMMENDATION';
  allowed_roles: Role[];
  to: CaseStatus | null;
  guards: string[];                       // 'G-DOC' | 'G-DUP' | 'G-REC' | 'G-ACK' | …
  invalid_reason: string | null;
}
export type TransitionsResponse = TransitionRow[];

// GET /api/cases/{id}/actions   (CS, SUP, ADM) — action history
export interface CaseActionView {
  action_id: string; action: UserAction;
  status_before: CaseStatus; status_after: CaseStatus;
  justification: string; parameters: Record<string, unknown>;
  actor: ActorRef; occurred_at: string; audit_entry_id: string;
}

// GET /api/cases/{id}/recommendations  →  RecommendationView[]  (ascending by time)
export interface RecommendationView {
  id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'RETURNED_FOR_INFORMATION';
  resolution_basis: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';
  exception_ids: string[];
  justification: string;
  ai_recommendation_snapshot: AiRecommendationSnapshot;
  concurrence: Concurrence;
  recommended_by: UserRef; recommended_at: string;
  evaluation_version: number; closed_at: string | null;
}

// GET /api/cases/{id}/approvals  →  ApprovalView[]  (ascending by time)
export interface ApprovalView {
  id: string; recommendation_id: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  rejection_reason: string | null;
  justification: string;
  approver: UserRef;
  evidence_changed: boolean;
  acknowledged_evidence_changed: boolean;
  decided_at: string;
  audit_entry_id: string;
}
```

**`actions` always contains all five entries.** The server never returns a filtered subset, because PRD §6 Usability requires that *every disabled action states why it is unavailable* — a hidden action explains nothing. `reason` is a closed enum so the UI copy is centralized and testable (WF-14 asserts the outcome for every (status, role) pair).

`TransitionsResponse` exposes the state machine as data. The UI consumes it, and tests WF-01/WF-02 enumerate it — including the assertion that **exactly one row has `to === 'CLEARED'`**. A governance invariant that can be counted from a public endpoint is one a stakeholder can verify without reading code.
---

# 3b. API — Mutating & Workflow Endpoints

Every endpoint in this chunk requires `X-CargoDemo-Session`; performs the server-side role check **before any write**; accepts `Idempotency-Key` and `If-Match-Case-Version`; executes its domain write, audit entry, and notification in **one transaction**; and returns `X-Case-Version` on success.

## 3b.1 Shared Request and Response Headers

```ts
export interface MutatingRequestHeaders {
  'x-cargodemo-session': string;          // required — 401 UNAUTHENTICATED if absent or invalid
  'idempotency-key'?: string;             // recommended; the UI always sends it
  'if-match-case-version'?: string;       // recommended; stale value → 409 CASE_VERSION_CONFLICT
  'content-type': 'application/json' | 'multipart/form-data';
}

export interface MutatingResponseHeaders {
  'x-request-id': string;                 // correlates with request_log and error bodies
  'x-case-version': string;               // the case's new version for the next If-Match
  location?: string;                      // on 201 responses
}
```

Replaying a request with the **same** `Idempotency-Key` and an identical payload returns the original response and creates no second row (WF-12). Replaying the same key with a *different* payload returns `409 IDEMPOTENCY_KEY_REUSED` rather than silently applying the second payload.

## 3b.2 Workflow Actions — `POST /api/cases/{case_id}/actions` (CS, SUP · `201 Created`)

A discriminated union on `action`. `justification` is required on all five variants: 10–2 000 characters, and **40 minimum** for `CLEAR_EXCEPTION` with `resolution_basis` of `EXCEPTIONS_ACCEPTED` or `MIXED` — accepting a still-firing exception demands more than a sentence.

```ts
interface ActionBase {
  justification: string;                  // 10–2000 chars (40 min for accepted/mixed clearance)
}

export interface RequestInformationCommand extends ActionBase {
  action: 'REQUEST_INFORMATION';
  document_types: string[];               // 1–10 items; guard G-DOC
  requested_from?: string | null;
  due_by?: string | null;                 // YYYY-MM-DD
  justify_unlisted_document?: boolean;    // true ⇒ justification ≥ 20 chars for an unlisted type
}

export interface SendForSpecialistReviewCommand extends ActionBase {
  action: 'SEND_FOR_SPECIALIST_REVIEW';
  assign_to_user_id?: string | null;      // ASSIGNEE_INVALID if not an active user of the right role
  cancel_outstanding_requests?: boolean;  // guard G-CANCEL
}

export interface ClearExceptionCommand extends ActionBase {
  action: 'CLEAR_EXCEPTION';
  exception_ids: string[];                // must match the current open set — else EXCEPTION_SET_STALE
  resolution_basis: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';
  acknowledge_outstanding_requests?: boolean;   // guard G-ACK, required from AWAITING_INFORMATION
}

export interface PlaceOnHoldCommand extends ActionBase {
  action: 'PLACE_ON_HOLD';
  hold_reason: 'AWAITING_EXTERNAL_INPUT' | 'PENDING_POLICY_GUIDANCE'
             | 'RESOURCE_CONSTRAINT' | 'OTHER';
  hold_reason_detail?: string | null;
  review_by?: string | null;
}

export interface EscalateToSupervisorCommand extends ActionBase {
  action: 'ESCALATE_TO_SUPERVISOR';
  escalation_reason: string;
  escalation_reason_detail?: string | null;
  escalate_to_user_id?: string | null;    // ESCALATION_TARGET_INVALID if not an active SUPERVISOR
}

export type ActionCommand =
  | RequestInformationCommand | SendForSpecialistReviewCommand | ClearExceptionCommand
  | PlaceOnHoldCommand | EscalateToSupervisorCommand;
```

**Response — `ActionResult` (F09b §7):**

```ts
export interface ActionResult {
  action_id: string;
  action: UserAction;
  status: { before: CaseStatus; after: CaseStatus };
  acting_user: UserRef;
  justification: string;
  occurred_at: string;

  /** What the human was advised, and whether they agreed. Divergence is not an error. */
  ai_recommendation: AiRecommendationSnapshot;

  side_effects: {
    document_requests_created: string[];
    document_requests_cancelled: string[];
    recommendation_created: string | null;
    recommendation_closed: string | null;
    case_assigned_to: UserRef | null;
    escalated_to: UserRef | null;
  };

  audit_entry_id: string;                 // exactly one — invariant I4
  notification_id: string;                // exactly one — invariant I4
  available_actions: AvailableAction[];   // refreshed for the new state, so the UI needs no refetch
  case_version: CaseVersion;
}
```

**Errors** — `401 UNAUTHENTICATED`; `403 FORBIDDEN_ROLE | ESCALATED_REQUIRES_SUPERVISOR | HOLD_REQUIRES_RELEASE | ASSIGNMENT_NOT_PERMITTED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | TRANSITION_REDUNDANT | CASE_TERMINAL | CASE_VERSION_CONFLICT | RECOMMENDATION_ALREADY_PENDING | EXCEPTION_SET_STALE | DUPLICATE_DOCUMENT_REQUEST | DOCUMENT_ALREADY_RECEIVED | IDEMPOTENCY_KEY_REUSED`; `422 VALIDATION_FAILED | ACTION_NOT_A_USER_ACTION | JUSTIFICATION_REQUIRED | JUSTIFICATION_NOT_AUTHORED | DOCUMENT_TYPE_NOT_REQUIRED | OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED | ASSIGNEE_INVALID | ESCALATION_TARGET_INVALID`; `500 AUDIT_INCOMPLETE | NOTIFICATION_GENERATION_FAILED`.

Two error codes deserve architectural note:

- **`JUSTIFICATION_NOT_AUTHORED`** rejects a justification that is an exact copy of the AI rationale. The human must author their reasoning, not paste the machine's. This is a small check with a large governance meaning.
- **`403` vs `409` is a deliberate distinction** (`Y2` §9.1): `403` means "you may not", `409` means "not from here". A specialist acting on an escalated case gets `403 ESCALATED_REQUIRES_SUPERVISOR` — an authority problem, not a state problem — because the two demand different operator responses.

## 3b.3 Approvals — `POST /api/cases/{case_id}/approval` (SUP only · `200 OK`)

```ts
export interface ApprovalCommand {
  recommendation_id: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  justification: string;                  // ≥ 10 chars; ≥ 40 when decision is REJECT
  acknowledge_evidence_changed?: boolean; // required true when evidence changed since the recommendation
  rejection_reason?: 'INSUFFICIENT_JUSTIFICATION' | 'EVIDENCE_INCOMPLETE'
                   | 'EXCEPTION_NOT_RESOLVED' | 'POLICY_DISAGREEMENT' | 'OTHER' | null;
  document_types?: string[] | null;       // 1–10 items, required when decision is REQUEST_INFO
}

export interface ApprovalResult {
  approval: ApprovalView;
  recommendation: RecommendationView;
  case: {
    status: CaseStatus;                   // 'CLEARED' only on APPROVE
    approving_official: UserRef | null;   // non-null whenever status === 'CLEARED'
    cleared_at: string | null;
  };
  exceptions_closed: Array<{ exception_id: string; status: 'CLEARED_BY_DECISION' }>;
  audit_entry_id: string;
  notification_id: string;
  case_version: CaseVersion;
}
```

**Errors** — `403 FORBIDDEN_ROLE | SELF_APPROVAL_BLOCKED`; `404 RESOURCE_NOT_FOUND`; `409 INVALID_TRANSITION | CASE_TERMINAL | RECOMMENDATION_NOT_PENDING | EVIDENCE_CHANGED_UNACKNOWLEDGED | CASE_VERSION_CONFLICT`; `422 VALIDATION_FAILED | JUSTIFICATION_REQUIRED`; `500 AUDIT_INCOMPLETE`.

**The two surfaces are disjoint by design.** `POST /api/cases/{id}/actions` MUST reject `APPROVE_CLEARANCE` and `REJECT_RECOMMENDATION` with `422 ACTION_NOT_A_USER_ACTION`, and this endpoint MUST reject any of the five user action codes with the same error. Approval is not a sixth user action; it is a different kind of authority, and the API says so structurally.

**This is the only endpoint in the entire API that can produce `CLEARED`**, and only under `decision: 'APPROVE'` by a supervisor who is not the recommender. That is the API-surface expression of invariant I1, backed by transition row T31, guards G-SOD and G-AUDIT, and the `cases`/`approvals` `CHECK` constraints of `02b`.

## 3b.4 Revalidation — `POST /api/shipments/{shipment_id}/revalidate` (CS, SUP · `200 OK`)

```ts
export interface RevalidateCommand {
  note?: string | null;                   // 0–1000 chars, optional
}
```

Revalidation requires **no justification** because it asserts nothing — it re-runs deterministic rules against current evidence (F6 §Inputs). `trigger` is server-determined and is never accepted from the client, so a caller cannot mislabel the provenance of an evaluation.

```ts
export interface RevalidationResult {
  evaluation: {
    id: string; version: number; evaluated_at: string;
    trigger: EvaluationTrigger; rule_set_fingerprint: string;
  };
  resolved: ResolvedExceptionDelta[];     // no longer firing — retained, never deleted
  retained: RetainedExceptionDelta[];     // still firing; opened_at carried forward
  new: ExceptionView[];                   // newly triggered
  priority: { before: Priority; after: Priority; basis: string[] };
  status:   { before: CaseStatus; after: CaseStatus };
  open_exception_count: { before: number; after: number };
  document_requests_fulfilled: string[];
  ai_regeneration: {
    summary_status: 'LLM' | 'FALLBACK' | 'SKIPPED';
    recommendation_status: 'LLM' | 'FALLBACK' | 'SKIPPED';
  };
  audit_entry_id: string;
  notification_id: string;
  case_version: CaseVersion;
}
```

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 CASE_TERMINAL | CASE_VERSION_CONFLICT | EVALUATION_VERSION_CONFLICT`; `500 EVALUATION_FAILED | RECONCILIATION_INCONSISTENT | AUDIT_INCOMPLETE`.

**`RevalidationResult` is the walkthrough step 7 contract.** The screen renders `resolved` / `retained` / `new` verbatim — "1 resolved, 2 retained" is a server fact, not a client computation. The canonical scenario is engineered so this is exactly what happens: the certificate of origin resolves the missing-document exception, while the HTS exception (untouched by document evidence) and the origin exception (whose default rule compares only `manufacturer.address.country`) both persist. Revalidation **never** produces `CLEARED` or `PENDING_APPROVAL` (invariant I9, test RV-05).

## 3b.5 Document Upload — `POST /api/document-requests/{request_id}/upload` (CS, SUP · `201 Created`)

`Content-Type: multipart/form-data` with exactly two parts:

```ts
/** Part `file` — binary. 1 byte – 5 MB. */
export type UploadAllowedMime =
  | 'application/pdf' | 'image/png' | 'image/jpeg' | 'text/plain' | 'text/csv';

/** Part `metadata` — JSON. */
export interface UploadMetadata {
  original_filename: string;
  note?: string | null;
  stated_country?: string | null;         // feeds documents.stated_country for origin rules
}
```

**`document_type` is not accepted from the client.** It is copied from the `document_requests` row (F10 §Process step 7), so an upload cannot be retargeted to satisfy a requirement it was not requested for.

```ts
export interface UploadResult {
  document: DocumentView;                 // provenance: 'SIMULATED_UPLOAD'
  request: DocumentRequestView;           // status: 'FULFILLED'
  /** Revalidation is automatic on successful upload and shares the same transaction. */
  revalidation: RevalidationResult;
  audit_entry_id: string;
  notification_id: string;
  case_version: CaseVersion;
}
```

**Errors** — `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `409 REQUEST_NOT_OUTSTANDING | CASE_TERMINAL | CASE_VERSION_CONFLICT`; `413 PAYLOAD_TOO_LARGE`; `415 UNSUPPORTED_MEDIA_TYPE`; `422 FILE_REQUIRED | FILE_EMPTY | FILE_EXTENSION_MISMATCH | FILE_CONTENT_MISMATCH | PII_SUSPECTED`; `500 STORAGE_PATH_INVALID | STORAGE_WRITE_FAILED | EVALUATION_FAILED`.

**Upload and revalidation are one transaction**, which is what makes walkthrough steps 6 and 7 a single atomic advance rather than two states a demo could get stuck between. A filesystem write failure rolls back the document row, the request status change, and the triggered revalidation, and removes any partially written file — storage and database never diverge. The full upload security path is specified in `04-security` §6.

## 3b.6 Cancel a Document Request — `POST /api/document-requests/{request_id}/cancel` (CS, SUP · `200 OK`)

```ts
export interface CancelRequestCommand { reason: string; }
export type CancelRequestResult = { request: DocumentRequestView };  // status: 'CANCELLED'
```

Errors: `403 FORBIDDEN_ROLE`; `409 REQUEST_NOT_OUTSTANDING`; `422 VALIDATION_FAILED`.

## 3b.7 Endpoint-to-Transition Map

| Endpoint | Transitions it can cause | Never causes |
|---|---|---|
| `POST /api/cases/{id}/actions` | T01–T06, T08–T18, T20–T24, T26, T29 | **`CLEARED`** |
| `POST /api/cases/{id}/approval` | T31 (`CLEARED`), T32 (`IN_REVIEW`), T26 (`AWAITING_INFORMATION`) | any of the five user actions |
| `POST /api/shipments/{id}/revalidate` | `NEW→IN_REVIEW`, `AWAITING_INFORMATION→IN_REVIEW` | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/upload` | indirectly, via revalidation | `CLEARED`, `PENDING_APPROVAL` |
| `POST /api/document-requests/{id}/cancel` | none | any |

The `CLEAR_EXCEPTION` action is named for what a specialist *intends*, but it never produces `CLEARED` — it produces `PENDING_APPROVAL` and a `PENDING` recommendation (test WF-11). The gap between the action's name and its effect is the separation of duties, made visible.

## 3b.8 Concurrency and Idempotency Model

```ts
/** Read from GET responses; echoed on the next mutation. */
export type IfMatchCaseVersion = CaseVersion;
```

| Mechanism | Scope | Failure mode |
|---|---|---|
| `BEGIN IMMEDIATE` + case-row load-for-update | Whole use case | Serializes writers; second writer waits up to `busy_timeout` |
| `If-Match-Case-Version` | Per case | `409 CASE_VERSION_CONFLICT` — "Case was modified by another user; reload and retry" |
| `Idempotency-Key` + scope + `request_hash` | Per (case, key) | Identical replay → original response; different payload → `409 IDEMPOTENCY_KEY_REUSED` |
| `UNIQUE (case_id, sequence_no)` on `audit_entries` | Audit chain | `409 AUDIT_SEQUENCE_CONFLICT` — retry |
| `UNIQUE (cargo_entry_id, version)` on `evaluations` | Evaluation history | `409 EVALUATION_VERSION_CONFLICT` — retry |

Two simultaneous actions on one case produce **one success and one `CASE_VERSION_CONFLICT`** (test WF-13), never a lost update and never two audit entries for one decision. The UI always sends both headers, so a double-click during a live demo is a no-op rather than a duplicated action — a small robustness property with an outsized effect on a walkthrough performed on camera.
---

# 3c. API — Session, AI, Rules, Ingestion & Demo Operations

## 3c.1 Session and Roles

```ts
// GET /api/users   — OPEN (no session required, so the role selector can render first)
export type UsersResponse = Array<{ id: string; name: string; role: Role; active: boolean }>;

// POST /api/session   — OPEN · 201
export interface CreateSessionCommand { user_id: string; }
export interface SessionResponse {
  session_token: string;                  // opaque, random ≥ 256 bits; the server stores only its SHA-256
  user: UserRef;
  permissions_summary: {
    can_adjudicate: boolean;
    can_approve: boolean;
    can_edit_rules: boolean;
    can_reset: boolean;
  };
}
// Errors: 404 RESOURCE_NOT_FOUND, 403 USER_INACTIVE.
// An existing session is implicitly ended and a ROLE_SWITCHED system audit entry is written —
// a demo role switch is itself part of the record.

// GET    /api/session   (CS, SUP, ADM) → SessionResponse['user'] | 401 UNAUTHENTICATED
// DELETE /api/session   (CS, SUP, ADM) → 204

// GET /api/rbac/matrix   (CS, SUP, ADM)
export interface RbacMatrixRow {
  route_id: string;                       // 'cases.actions.create'
  method: string;
  path: string;
  allowed_roles: Role[];
  predicates: string[];                   // 'state_machine' | 'escalation_authority' | 'sod_2' | …
}
export type RbacMatrixResponse = RbacMatrixRow[];

// POST  /api/users        (ADM · 201) — { name, role, active }
// PATCH /api/users/{id}   (ADM · 200) — { name?, role?, active? }
export interface CreateUserCommand { name: string; role: Role; active?: boolean; }
export interface UpdateUserCommand { name?: string; role?: Role; active?: boolean; }
// Errors: 422 INVALID_ENUM_VALUE, 403 SELF_ROLE_CHANGE_BLOCKED.
```

`permissions_summary` is a **convenience for rendering**, never an authority. The client uses it to decide which navigation items to show; the server re-derives authority from the `users` row on every single request. `GET /api/rbac/matrix` is **generated from the enforcement declarations**, not hand-maintained — the specification, the middleware, and test AC-01 all read the same data, so the matrix cannot drift from what is enforced.

## 3c.2 AI Assistance

```ts
// GET /api/shipments/{id}/ai/summary   (CS, SUP, ADM) · ALWAYS 200
export interface AiSummaryQuery { regenerate?: boolean; }
export interface AiSummaryResponse {
  kind: 'SUMMARY';
  shipment_id: string;
  evaluation_version: number;
  /** Plain-language narrative, grounded in the captured evidence. */
  summary: string;
  exception_narratives: Array<{
    exception_id: string;
    exception_type: ExceptionType;
    sub_reason: string;
    narrative: string;
    grounded_in: string[];                // field paths the narrative references
  }>;
  provenance: AiProvenance;
  cached: boolean;
}

// POST /api/shipments/{id}/ai/summary/regenerate   (CS, SUP — ADM denied) · 200
//   Same shape with cached:false and regenerated_by_user_id recorded.

// GET /api/shipments/{id}/ai/recommendation   (CS, SUP, ADM) · ALWAYS 200
export interface AiRecommendationResponse {
  kind: 'RECOMMENDATION';
  shipment_id: string;
  evaluation_version: number;

  /** Deterministic. Identical with the provider enabled or disabled. Never an approval code. */
  recommended_action: UserAction;
  confidence: {
    level: ConfidenceLevel;
    score: number;                        // [0,1]
    basis: string;                        // names the factors that moved the score — never empty
    factors: Array<{ factor: string; adjustment: number }>;
  };
  /** LLM-authored prose when a provider is enabled; deterministic template otherwise. */
  rationale: string;

  available_to_current_role: boolean;
  unavailable_reason: UnavailableReason | null;

  presentation: {
    exceptions: Array<{
      exception_id: string; exception_type: ExceptionType; sub_reason: string; severity: Severity;
      rule: RuleRef;                      // MUST include policy_reference — never a recommendation
      evidence: EvidenceRow[];            //   without its authority
      missing_information: MissingInformation[];
    }>;
  };

  governance_notice: 'This is an AI-generated recommendation. It has not been acted on. A named official must decide.';
  provenance: AiProvenance & { action_source: 'DETERMINISTIC'; rationale_source: 'LLM' | 'FALLBACK' };
  cached: boolean;
}

// POST /api/shipments/{id}/ai/recommendation/regenerate   (CS, SUP — ADM denied) · 200

// GET /api/shipments/{id}/ai/outputs   (CS, SUP, ADM)
export interface AiOutputHistoryItem {
  id: string; kind: 'SUMMARY' | 'RECOMMENDATION';
  evaluation_version: number; generation_mode: GenerationMode;
  generated_at: string; superseded_by: string | null;
  provenance: AiProvenance; content_summary: string;
}
```

**The AI routes are fallback-first and never return `503`.** Provider unavailability is not an error condition — it is the default configuration. `AI_UNAVAILABLE` is a reserved code that `/ai/summary` and `/ai/recommendation` never return. The only genuine errors on these routes are `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `409 NO_EVALUATION`, and `403 FORBIDDEN_ROLE` (regenerate only, ADM denied).

`available_to_current_role` is the one place role affects the response — and only as *annotation*. If the derived action is unavailable to the viewer, the recommendation is still returned with the derived action and the reason; **it is never silently rewritten to suit the viewer**. A recommendation that changes depending on who is looking at it is not evidence of anything.

## 3c.3 Rules

```ts
// GET /api/rules   (CS, SUP, ADM — read-only for CS/SUP: a rule must be visible to be defensible)
export interface RulesQuery {
  exception_type?: ExceptionType; enabled?: boolean; severity?: Severity;
  page?: number; page_size?: number;
}
export interface RuleListItem {
  id: string; name: string; exception_type: ExceptionType; severity: Severity;
  enabled: boolean; policy_reference: string; description: string;
  version: number; updated_at: string; updated_by_name: string | null;
  open_exception_count: number; affected_shipment_count: number;
}
export type RulesResponse = ListResponse<RuleListItem>;

// GET /api/rules/{id}   (CS, SUP, ADM)
export interface RuleDetail extends RuleListItem {
  conditions: RuleConditions;
  params_json: RuleParams;
  /** The JSON Schema for this exception_type, so the admin form renders generically. */
  params_schema: Record<string, unknown>;
  priority_mapping: Record<Severity, Severity> | null;
}

// ─── Rule configuration payloads (see 06a §2 for semantics) ────────────────
export interface RuleConditions {
  min_shipment_value_usd?: number;
  max_shipment_value_usd?: number;
  commodity_keywords?: string[];
  hts_prefixes?: string[];
  country_of_origin_in?: string[];
  country_of_origin_not_in?: string[];
}

export interface MissingDocumentParams {
  required_document_types: string[];      // 1–20 items, required
  match_mode?: 'ALL' | 'ANY_ONE_OF';      // default 'ALL'
  accept_statuses?: DocumentStatus[];     // default ['RECEIVED']
  require_file_present?: boolean;         // default true
  ignore_superseded?: boolean;            // default true
}

export interface HtsCodeParams {
  expected_digit_count?: number;          // 6–12, default 10
  min_digit_count?: number;               // 4–12, default 6
  allowed_separators?: string[];          // default ['.', '-', ' ']
  allow_partial?: boolean;                // default false
  treat_missing_as_exception?: boolean;   // default true
  check_known_codes?: boolean;            // default false
  known_code_prefix_length?: number;      // 4–10, default 6
  known_codes?: string[];                 // must be non-empty when check_known_codes is true
  placeholder_characters?: string[];      // default ['X','x','*','?','#']
}

export interface CountryOfOriginParams {
  declared_field?: string;                // default 'country_of_origin'
  comparison_fields?: string[];           // default ['manufacturer.address.country']
  treat_missing_declared_as_conflict?: boolean;    // default true
  treat_missing_comparison_as_conflict?: boolean;  // default false
  allowed_pairs?: Array<{ declared: string; comparison: string }>;
  case_sensitive?: boolean;               // default false
}

/** Discriminated by the rule's exception_type; validated by Ajv, additionalProperties:false. */
export type RuleParams = MissingDocumentParams | HtsCodeParams | CountryOfOriginParams;

export interface RuleDefinition {
  id: string;                             // ^rule-[a-z0-9-]{3,40}$, immutable after creation
  name: string;                           // 3–120 chars, unique (case-insensitive)
  exception_type: ExceptionType;          // immutable after creation
  description: string;                    // 10–500 chars
  policy_reference: string;               // 3–120 chars, e.g. '19 CFR 141.86'
  severity: Severity;
  conditions?: RuleConditions;
  params_json: RuleParams;
  priority_mapping?: Record<Severity, Severity> | null;
}

// POST  /api/rules        (ADM · 201)
// PATCH /api/rules/{id}   (ADM · 200) — exception_type MUST NOT change → 422 RULE_TYPE_IMMUTABLE
export interface SaveRuleCommand {
  definition: RuleDefinition;
  change_note: string;                    // required → 422 CHANGE_NOTE_REQUIRED
  revalidate_affected?: boolean;
}

// POST /api/rules/{id}/enable | /disable   (ADM · 200)
export interface ToggleRuleCommand { change_note: string; revalidate_affected?: boolean; }

export interface RuleSaveResult {
  rule: RuleDetail;
  previous_version: number;
  diff: Array<{ path: string; before: unknown; after: unknown }>;
  revalidation: {
    shipments_revalidated: number;
    exceptions_added: number;
    exceptions_resolved: number;
    priorities_changed: number;
    failures: Array<{ shipment_id: string; error_code: string }>;
  };
  audit_entry_id: string;
}

// POST /api/rules/{id}/preview-impact   (ADM · 200) — performs ZERO writes
export interface PreviewImpactCommand { definition: RuleDefinition; }
export interface PreviewImpactResult {
  valid: boolean;
  evaluated_shipments: number;
  would_add: Array<{ shipment_id: string; exception_type: ExceptionType; severity: Severity }>;
  would_remove: Array<{ shipment_id: string; exception_id: string; exception_type: ExceptionType }>;
  would_change_severity: Array<{ shipment_id: string; exception_id: string; from: Severity; to: Severity }>;
  would_change_priority: Array<{ shipment_id: string; from: Priority; to: Priority }>;
  summary: { added: number; removed: number; unchanged: number; priority_changes: number };
  skipped_cleared: string[];              // terminal cases are never touched, even in preview
  truncated: boolean;
}

// GET /api/rules/{id}/history   (CS, SUP, ADM)
export interface RuleHistoryItem {
  audit_entry_id: string; event_type: string; occurred_at: string;
  actor: ActorRef; change_note: string;
  before: RuleDefinition | null; after: RuleDefinition;
  diff: Array<{ path: string; before: unknown; after: unknown }>;
}
```

Errors: `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; **`405 RULE_DELETE_NOT_SUPPORTED`** — rules are disabled, never deleted, so a disabled rule remains referenceable by the historical exceptions it produced; `409 RULE_NAME_CONFLICT | TRANSITION_REDUNDANT`; `422 RULE_TYPE_IMMUTABLE | RULE_CONFIG_INVALID | RULE_PARAM_PATH_UNKNOWN | CHANGE_NOTE_REQUIRED | PREVIEW_TOO_LARGE | VALIDATION_FAILED`; `207 PARTIAL_REVALIDATION_FAILURE`.

`preview-impact` performing **zero writes** is asserted by a test, not merely intended: it is the surface that lets an administrator answer "what would this change do?" before committing, which is the difference between configurable rules and dangerous ones.

## 3c.4 Ingestion

```ts
// POST /api/ingest/cargo-entries   (ADM · 201 | 207 Multi-Status)
export interface CargoEntryInput {
  shipment_id: string;
  importer_name: string;
  carrier_name: string;
  product_description: string;
  hts_code: string | null;
  country_of_origin: string;
  manufacturer: {
    name: string;
    address: {
      line1: string; city?: string | null; region?: string | null;
      postal_code?: string | null; country: string;
    };
  };
  shipment_value_usd: number;
  entry_date: string;                     // YYYY-MM-DD
  documents?: Array<{
    document_type: string; status: DocumentStatus;
    filename?: string | null; received_at?: string | null; stated_country?: string | null;
  }>;
}

export interface IngestCommand {
  schema_version: '1.0';                  // anything else rejects the whole batch
  source: string;
  entries: CargoEntryInput[];             // 1–500
}

export interface IngestionReport {
  batch_id: string;
  schema_version: string;
  source: string;
  received_count: number;
  created_count: number;
  updated_count: number;
  rejected_count: number;
  results: Array<
    | { shipment_id: string; outcome: 'CREATED' | 'UPDATED'; evaluation_version: number; exception_count: number }
    | { shipment_id: string | null; outcome: 'REJECTED'; error_code: string; pointer: string; reason: string }
  >;
  created_at: string;
}

// GET /api/ingest/reports/{batch_id}   (ADM · 200) → IngestionReport
```

Errors: `400 INGEST_MALFORMED_JSON`; `403 FORBIDDEN_ROLE`; `422 INGEST_SCHEMA_VERSION_UNSUPPORTED | INGEST_BATCH_SIZE_INVALID | INGEST_ENTRY_INVALID | INGEST_DOCUMENT_FILENAME_REQUIRED`; `409 CASE_TERMINAL | INGEST_DUPLICATE_IN_BATCH`.

**A malformed envelope rejects the batch atomically; a malformed entry rejects only itself** and is reported with a JSON pointer and a reason, so a bad row cannot take down an import. Ingestion is idempotent on `shipment_id` — re-ingesting updates rather than duplicates, and creates a new evaluation version. **Re-ingesting a `CLEARED` shipment is refused with `CASE_TERMINAL`** (test IN-03), so an external feed cannot silently reopen a finalized decision. A `SIMULATED_UPLOAD` document is never downgraded by a re-ingestion declaring it not received (IN-04).

## 3c.5 Demo Operations

```ts
// GET /api/health   — OPEN · 200
export type SubsystemStatus = 'ok' | 'degraded' | 'failed';
export interface HealthResponse {
  status: SubsystemStatus;
  version: string;
  uptime_s: number;
  subsystems: {
    database:  { status: SubsystemStatus; schema_version: number; foreign_keys: boolean;
                 append_only_triggers: boolean; path_writable: boolean };
    seed:      { status: SubsystemStatus; seeded: boolean; entry_count: number;
                 canonical_scenario_present: boolean; exception_types_covered: number;
                 statuses_covered: number; precleared_case: string | null };
    rules:     { status: SubsystemStatus; total: number; enabled: number; invalid: number };
    documents: { status: SubsystemStatus; storage_dir_writable: boolean;
                 fixtures_present: number; upload_ready_fixtures: number };
    ai:        { status: SubsystemStatus; provider: string; model: string | null;
                 mode: GenerationMode; fallback_available: true; last_probe_at: string | null };
    workflow:  { status: SubsystemStatus; transitions_registered: number;
                 /** MUST equal 1 — the governance invariant, surfaced without opening code. */
                 clearance_paths: number };
    rbac:      { status: SubsystemStatus; routes_registered: number;
                 /** MUST equal 0. */
                 routes_without_permission: number };
  };
  demo: { port: number; host: string; preview_url: string; reset_endpoint: string };
}

// POST /api/admin/reset   (ADM · 200)
export interface ResetCommand { confirm: true; }                    // 422 CONFIRMATION_REQUIRED otherwise
export interface ResetResult extends SeedReport { reset_at: string; duration_ms: number; }

// GET /api/admin/seed-report   (ADM · 200) → SeedReport
export interface SeedReport {
  entry_count: number;
  canonical_scenario_present: boolean;
  coverage: {
    exception_types: ExceptionType[];
    statuses: CaseStatus[];
    multi_exception_shipments: string[];
    precleared_case: string | null;
    clean_shipments: string[];
  };
  rules_seeded: number;
  documents_seeded: number;
  upload_ready_fixtures: number;
  seeded_at: string;
}

// GET /api/openapi.json   — OPEN · 200
//   OpenAPI 3.1, generated from the same schemas the middleware validates against,
//   so specification drift is structurally impossible.
```

`health` **never exposes the AI API key, database credentials, or absolute paths outside the project**. `clearance_paths: 1` and `routes_without_permission: 0` are the two numbers a presenter can point at to demonstrate the governance invariants without opening an editor.

Reset errors: `403 FORBIDDEN_ROLE`; `422 CONFIRMATION_REQUIRED`; `500 SEED_COVERAGE_FAILED | SEED_CANONICAL_SCENARIO_INVALID | SEED_FIXTURE_MISSING | SEED_PII_SUSPECTED | SEED_WORKFLOW_SCRIPT_INVALID`. A failed coverage assertion leaves the transaction rolled back rather than producing a half-seeded demo.

## 3c.6 Route Inventory (60 routes)

| Group | Count | Routes |
|---|---|---|
| Session & users | 7 | `GET/POST/DELETE /api/session`, `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}`, `GET /api/rbac/matrix` |
| Queue & shipments | 6 | `/api/queue`, `/api/shipments/{id}`, `…/exceptions`, `…/evaluations`, `…/evaluations/{v}`, `…/evaluations/{a}/diff/{b}` |
| Documents | 6 | `…/documents`, `…/document-requests`, `…/upload-fixtures`, `/api/documents/{id}/content`, upload, cancel |
| Workflow | 5 | `POST/GET /api/cases/{id}/actions`, `/available-actions`, `/api/workflow/transitions`, `/api/shipments/{id}/revalidate` |
| Approvals | 3 | `POST /api/cases/{id}/approval`, `GET …/recommendations`, `GET …/approvals` |
| AI | 5 | summary, summary/regenerate, recommendation, recommendation/regenerate, outputs |
| Audit | 5 | `/audit`, `/audit/{seq}`, `/audit/verify`, `/audit/export`, `/api/audit` |
| Notifications | 5 | list, unread-count, per-case, read, read-all |
| Rules | 8 | list, detail, create, patch, enable, disable, preview-impact, history |
| Ingestion & demo | 5 | ingest, ingest report, health, reset, seed-report |
| OpenAPI | 1 | `/api/openapi.json` |
| **Total** | **60** | matches the F14 RBAC matrix and the `health.subsystems.rbac.routes_registered` assertion |

**60 is a checked number, not a count in prose.** The startup self-check enumerates the registry, `GET /api/rbac/matrix` serves it, `health.subsystems.rbac.routes_registered` reports it, and test AC-01 iterates all 60 × 3 roles. Adding a route without an RBAC declaration aborts startup; adding one without a matrix expectation fails AC-01.

## 3c.7 Error Envelope

```ts
export interface FieldError { path: string; code: string; message: string; }

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;                      // clients branch on this, never on `message`
    message: string;                      // user-facing copy
    details?: Record<string, unknown>;    // diagnostic
    field_errors?: FieldError[];          // drives inline form annotation
    request_id: string;                   // correlates with request_log
  };
}

export type ErrorCode =
  // Transport & auth
  | 'UNAUTHENTICATED' | 'SESSION_INVALID' | 'FORBIDDEN_ROLE' | 'SELF_ROLE_CHANGE_BLOCKED'
  | 'USER_INACTIVE' | 'RESOURCE_NOT_FOUND' | 'MALFORMED_JSON' | 'VALIDATION_FAILED'
  | 'INVALID_ENUM_VALUE' | 'INVALID_QUERY_PARAM' | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE' | 'IDEMPOTENCY_KEY_REUSED' | 'CASE_VERSION_CONFLICT' | 'INTERNAL_ERROR'
  // Ingestion & seed
  | 'INGEST_MALFORMED_JSON' | 'INGEST_SCHEMA_VERSION_UNSUPPORTED' | 'INGEST_BATCH_SIZE_INVALID'
  | 'INGEST_ENTRY_INVALID' | 'INGEST_DUPLICATE_IN_BATCH' | 'INGEST_DOCUMENT_FILENAME_REQUIRED'
  | 'INGEST_FILE_NOT_FOUND' | 'SEED_DB_NOT_EMPTY' | 'SEED_COVERAGE_FAILED'
  | 'SEED_CANONICAL_SCENARIO_INVALID' | 'SEED_FIXTURE_MISSING' | 'SEED_PII_SUSPECTED'
  | 'SEED_WORKFLOW_SCRIPT_INVALID'
  // Rules & evaluation
  | 'RULE_CONFIG_INVALID' | 'RULE_PARAM_PATH_UNKNOWN' | 'RULE_TYPE_IMMUTABLE' | 'RULE_NAME_CONFLICT'
  | 'CHANGE_NOTE_REQUIRED' | 'RULE_DELETE_NOT_SUPPORTED' | 'PREVIEW_TOO_LARGE'
  | 'PARTIAL_REVALIDATION_FAILURE' | 'EXCEPTION_TYPE_UNSUPPORTED' | 'EVALUATION_FAILED'
  | 'EVALUATION_TIMEOUT' | 'EVALUATION_VERSION_CONFLICT' | 'EXCEPTION_EVIDENCE_REQUIRED'
  | 'MISSING_INFORMATION_REQUIRED' | 'PRIORITY_DERIVATION_FAILED' | 'EVALUATION_HISTORY_IMMUTABLE'
  | 'NO_EVALUATION'
  // Workflow
  | 'INVALID_TRANSITION' | 'TRANSITION_REDUNDANT' | 'CASE_TERMINAL' | 'ESCALATED_REQUIRES_SUPERVISOR'
  | 'HOLD_REQUIRES_RELEASE' | 'APPROVAL_PENDING' | 'ACTION_NOT_A_USER_ACTION'
  | 'JUSTIFICATION_REQUIRED' | 'JUSTIFICATION_NOT_AUTHORED' | 'DOCUMENT_TYPE_NOT_REQUIRED'
  | 'OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED' | 'ASSIGNEE_INVALID' | 'ESCALATION_TARGET_INVALID'
  | 'ASSIGNMENT_NOT_PERMITTED' | 'EXCEPTION_SET_STALE'
  // Documents
  | 'REQUEST_NOT_OUTSTANDING' | 'DUPLICATE_DOCUMENT_REQUEST' | 'DOCUMENT_ALREADY_RECEIVED'
  | 'FILE_REQUIRED' | 'FILE_EMPTY' | 'FILE_EXTENSION_MISMATCH' | 'FILE_CONTENT_MISMATCH'
  | 'PII_SUSPECTED' | 'STORAGE_PATH_INVALID' | 'STORAGE_WRITE_FAILED'
  // Approvals & governance
  | 'SELF_APPROVAL_BLOCKED' | 'RECOMMENDATION_ALREADY_PENDING' | 'RECOMMENDATION_NOT_PENDING'
  | 'EVIDENCE_CHANGED_UNACKNOWLEDGED' | 'AUDIT_INCOMPLETE' | 'AUDIT_IMMUTABLE'
  | 'AUDIT_TIMESTAMP_NONMONOTONIC' | 'AUDIT_SEQUENCE_CONFLICT' | 'AUDIT_CHAIN_INVALID'
  | 'NOTIFICATION_TEMPLATE_MISSING' | 'NOTIFICATION_GENERATION_FAILED' | 'NOTIFICATION_IMMUTABLE'
  // AI (genuine errors only — provider unavailability is never an error)
  | 'FALLBACK_TEMPLATE_MISSING' | 'RECOMMENDATION_ACTION_INVALID' | 'CONFIDENCE_BASIS_REQUIRED'
  | 'AI_UNAVAILABLE'                      // reserved; never returned by the AI routes
  // Startup (exit code 1, never served)
  | 'DB_UNAVAILABLE' | 'MIGRATION_CHECKSUM_MISMATCH' | 'SCHEMA_INTEGRITY_FAILED'
  | 'ROUTE_SCHEMA_MISSING' | 'ROUTE_PERMISSION_MISSING' | 'PORT_IN_USE' | 'STORAGE_UNAVAILABLE'
  | 'CONFIRMATION_REQUIRED';
```

### Error-handling principles (architectural, from `Y2` §9)

1. **Distinguish authority from state.** `403` = "you may not"; `409` = "not from here". The two demand different operator responses, so they get different codes.
2. **Never silently absorb.** Redundant transitions, unknown filters, and unknown parameters are rejected, not ignored. Silent absorption is how an audit trail acquires a no-op decision or a rule quietly stops checking.
3. **Fail the whole transaction.** Any error during a mutating action rolls back the domain write, the audit entry, and the notification together.
4. **Fall back rather than fail — but only for AI assistance, and only with the fallback labeled.** Nothing else in the system degrades silently.
5. **Record denials.** Every `403` and every rejected transition writes an audit entry (invariant I10). A blocked self-approval attempt is exactly the kind of event an oversight reviewer wants to see.
6. **Never leak.** Error messages contain no API keys, no absolute paths outside the project, no SQL, and no stack traces. Diagnosis happens through `request_id` and the server log.
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
---

# 5. Technology Stack

## 5.1 Selection Criteria

Every selection below was made against four filters, in this order. A candidate failing an earlier filter was rejected regardless of how well it satisfied a later one.

1. **Runs fully locally with zero external services.** No database server, no container runtime, no broker, no cache, no cloud SDK, no CDN. The demo must start in a fresh sandbox with one command and no network.
2. **Deterministic.** Fixed versions, reproducible builds, no wall-clock or randomness on any path that produces demo-visible output.
3. **Supports governance enforcement at the lowest layer.** A database with real `CHECK` constraints and triggers; a web framework with declarative, enumerable route metadata.
4. **Small enough to be auditable.** A CBP reviewer should be able to read the dependency list and understand what the application can reach. A short list is a security property here, not merely tidiness.

## 5.2 Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Single process serving API + SPA |
| Language | TypeScript | 5.4 | `strict: true`, `noUncheckedIndexedAccess: true` across server, domain, and client |
| HTTP server | Fastify | 4.x | Routing, compiled JSON Schema validation, declarative route config, lifecycle hooks |
| Schema validation | Ajv (via Fastify) | 8.x | Request/response schemas **and** `rules.params_json` validation |
| OpenAPI | `@fastify/swagger` | 8.x | `GET /api/openapi.json` generated from the enforcing schemas |
| Static serving | `@fastify/static` | 7.x | SPA assets with `index.html` fallback |
| Multipart | `@fastify/multipart` | 8.x | Streamed 5 MB-limited upload parsing |
| Cookies | `@fastify/cookie` | 9.x | `cargodemo_session` fallback transport (§04 §4.7) |
| Database | SQLite via `better-sqlite3` | 11.x | File-backed, WAL, FK enforced, synchronous transactions |
| Migrations | Hand-rolled, forward-only | — | Numbered SQL files + checksum verification; no migration framework needed for ~20 tables |
| Frontend | React | 18.x | Four primary screens + admin surfaces |
| Build/dev | Vite | 5.x | Static bundle; dev proxy for the inner loop |
| Routing | React Router | 6.x | Client-side routing across the four screens |
| Server state | TanStack Query | 5.x | Fetch, cache, invalidate; one hook per endpoint |
| Styling | CSS Modules + design tokens | — | Bundled, no CSS framework CDN, WCAG 2.1 AA contrast tokens |
| Unit/integration tests | Vitest | 1.x | Domain, services, and HTTP via Fastify `inject` |
| E2E tests | Playwright | 1.4x | Ten-step walkthrough against the real start command |
| Lint | ESLint + `eslint-plugin-import` | 8.x | Includes `no-restricted-paths` enforcing the layer boundaries |
| Hashing | `node:crypto` | built-in | SHA-256 for the audit chain, tokens, content hashes, fingerprints |
| AI client | `fetch` (built-in) | — | **No SDK.** One HTTPS POST with `AbortController`; nothing else is needed |

**Total production dependencies: 10.** No ORM, no logging framework, no HTTP client library, no AI SDK, no UI component library, no state-management library beyond TanStack Query. Every one of those omissions is deliberate — see §5.4.

## 5.3 Selection Rationale

### Fastify over Express **[AD-02, deviation from PRD §4.1's "Express or Fastify"]**

Three properties decided it, all of which serve governance rather than performance:

1. **`routeOptions.config` is first-class route metadata.** Each route declares `{ routeId, allowedRoles, predicates }` alongside its handler. The startup self-check enumerates the registry and aborts with `ROUTE_PERMISSION_MISSING` if any route lacks a declaration. In Express this metadata would live in a hand-maintained side table — exactly the drift the FRD forbids.
2. **`GET /api/rbac/matrix` and `GET /api/openapi.json` are *generated* from the same declarations and schemas the middleware enforces.** The specification, the enforcement, and test AC-01 read one source. Drift is structurally impossible rather than merely discouraged.
3. **Compiled JSON Schema validation with `additionalProperties: false` by default.** A mistyped field is a loud `422`, not a silently ignored parameter — principle "never silently absorb" (`03c` §3c.7).

### better-sqlite3 over `node:sqlite` or an async driver **[AD-03]**

The uniform mutating skeleton (`01-components` §1.5) needs a genuine `BEGIN IMMEDIATE … COMMIT` spanning the domain write, the audit append, and the notification insert, with a case-row lock held throughout. `better-sqlite3` is synchronous, so that is an ordinary function call with ordinary exception semantics — a throw anywhere rolls back everything. An async driver would turn the single most important correctness property in the system into an interleaving problem for no benefit: this is a single-process, single-writer application with ~12 shipments.

Its transaction API also makes the guarantee legible in review: `db.transaction(fn)()` either committed or it did not.

### SQLite over PostgreSQL

Non-negotiable given filter 1: PostgreSQL requires a server process, which breaks single-command start in a fresh sandbox. SQLite additionally provides everything the governance model needs — `CHECK` constraints (including multi-column), partial unique indexes (guards G-DUP and G-REC), `BEFORE UPDATE`/`BEFORE DELETE` triggers with `RAISE(ABORT, …)` (audit immutability), and `ON DELETE RESTRICT`. The one accommodation is that a `CHECK` cannot span tables, which is why `approvals.recommended_by_user_id` is a copied column (`02b` §2b.5) and why the evidence-per-exception requirement is enforced in the repository write.

### No ORM

Prisma or Drizzle would add a schema DSL that must be kept in sync with the DDL, and neither expresses SQLite triggers or partial unique indexes naturally. The DDL in `02a`/`02b` is the authoritative schema and is applied verbatim as migration SQL; repositories are thin modules of named prepared statements. For ~20 tables with no dynamic query building, an ORM would add indirection between the governance constraints and the reader — the opposite of what this codebase needs.

### React + Vite, not Next.js **[AD-04]**

The application needs no SSR, no file-system routing, no server components, and no image optimization. Vite produces a static bundle that the API process serves directly, which is what preserves the one-process/one-port property the preview requires.

> **Recorded for completeness (Next.js is not used here):** if Next.js were ever adopted in this environment, either pin `next >= 15`, or use `next.config.mjs` / `next.config.js` — **never `next.config.ts` on Next 14**, which cannot load a TypeScript config and fails at startup.

### TanStack Query, and no Redux

Nearly all client state is server state. TanStack Query handles fetching, caching, and — critically — **invalidation after a mutation**: one action invalidates the case, queue, exceptions, audit, and notification queries so every screen reflects the new state without a manual refresh (F17's "live reflection of state changes made elsewhere"). The small remainder of genuinely local state (acting user, token) is a 30-line store. A Redux setup would be ceremony around five values.

### `fetch` and no AI SDK

The AI integration is one HTTPS POST with a JSON body and an `AbortController` timeout (`06a` §4). An SDK would add a dependency with its own network behaviour, retry policy, and telemetry — three things that directly contradict "the only outbound call is the one we make deliberately, and by default we make none." Writing 40 lines of `fetch` keeps the entire egress surface reviewable in one file.

### No logging framework

Startup emits a readiness block; requests write structured rows to `request_log`; errors are correlated by `request_id`. A logging framework would introduce transports, and a transport is an egress path. `console` plus a database table is the whole logging architecture, and it cannot accidentally ship data anywhere.

## 5.4 Dependencies Deliberately Absent

| Not used | Reason |
|---|---|
| PostgreSQL / MySQL / Docker | Requires a server or runtime; breaks single-command start in a fresh sandbox |
| Prisma / TypeORM / Drizzle | Cannot express triggers and partial unique indexes naturally; adds a schema that can drift from the DDL |
| Redis / BullMQ / node-cron | PRD §5.9 excludes background and async jobs — all processing is request-time |
| Nodemailer / Twilio / any webhook client | PRD §5.8: notifications are **generated and recorded, never transmitted**. Absence of the dependency is itself an enforcement layer (`06a` §5) |
| Passport / NextAuth / any OIDC client | PRD §5.8: simulated login. No external identity call exists |
| OpenAI / Anthropic SDK | A raw `fetch` keeps the entire egress surface in one reviewable file with no hidden retries or telemetry |
| Axios / got | `fetch` is built in |
| Winston / Pino transports | A log transport is an egress path |
| Sentry / OpenTelemetry / analytics | Egress; PRD §5.9 excludes telemetry exporters |
| Google Fonts / any CDN | P4: the UI must render identically with no internet connection |
| MUI / Ant Design / Tailwind CDN | Bundled CSS Modules keep the asset graph local and the accessibility contract explicit |
| PDF toolchain (Puppeteer, pdfkit) | Audit export is JSON plus server-rendered printable HTML; the browser's own print dialog is the PDF path (F12 §5.5) |

## 5.5 Configuration

All configuration is environment variables, parsed and validated at startup by `src/server/config.ts`. **An invalid value aborts startup rather than defaulting silently** — a demo that quietly ran on the wrong port or against the wrong database would be worse than one that refused to start.

| Variable | Default | Purpose |
|---|---|---|
| `CARGODEMO_HOST` | `0.0.0.0` | Bind address. **Must be `0.0.0.0`** for the preview to be reachable; a `localhost` value logs a prominent warning naming the consequence |
| `CARGODEMO_PORT` | **`3000`** | Deterministic port **[AD-05]**. Occupied → `PORT_IN_USE`, exit 1. **No automatic fallback** — a shifting URL breaks an embedded demo |
| `CARGODEMO_DB_PATH` | `./data/cargodemo.db` | SQLite file. Unwritable → `DB_UNAVAILABLE`, exit 1 |
| `CARGODEMO_DOC_STORAGE_DIR` | `./data/documents` | Upload root; all paths confined inside it. Unwritable → `STORAGE_UNAVAILABLE`, exit 1 |
| `CARGODEMO_SEED_ON_EMPTY` | `true` | Seed automatically when the database has no entries |
| `CARGODEMO_SEED_CLOCK` | `2026-09-01T08:00:00.000Z` | Fixed instant for the deterministic seed clock — this is what makes SD-03 (two reseeds, identical rows including timestamps) pass |
| `CARGODEMO_AI_PROVIDER` | **`none`** | `openai` \| `anthropic` \| `none`. **`none` is the supported demo default and produces zero egress** |
| `CARGODEMO_AI_MODEL` | provider default | Recorded verbatim in every output's provenance |
| `CARGODEMO_AI_API_KEY` | unset | **Never logged, never returned by any endpoint, never committed** |
| `CARGODEMO_AI_TIMEOUT_MS` | `10000` | Hard timeout; the deterministic fallback serves after it |
| `CARGODEMO_LOG_LEVEL` | `info` | Console verbosity only; does not affect `request_log` |

`.env` is gitignored. A committed `.env.example` documents every variable with empty or safe values, so the shape of the configuration is reviewable without any secret being present.

## 5.6 npm Scripts

| Script | Does |
|---|---|
| `npm start` | Build the client if needed, then run the full startup sequence and bind `0.0.0.0:3000`. **The single demo command**, and the command the E2E suite drives |
| `npm run dev` | API on 3000 with watch, Vite dev server on 3001 proxying `/api` → 3000. Developer inner loop only; never used for a demo |
| `npm run reset` | CLI equivalent of `POST /api/admin/reset` — truncate, reseed, print the coverage block |
| `npm test` | Vitest unit + integration; temp database per test file; no network |
| `npm run test:e2e` | Playwright walkthrough against `npm start` on an ephemeral port |
| `npm run test:all` | `lint` + `typecheck` + `test` + `test:e2e`. **The single command a reviewer runs** |
| `npm run test:update-goldens` | Explicitly regenerate golden fixtures — never automatic, so a determinism regression cannot self-heal |
| `npm run lint` / `npm run typecheck` | ESLint (including layer-boundary rules) and `tsc --noEmit` |

## 5.7 Performance Budget

The seeded dataset is ~12 shipments, so these targets are met by ordinary indexed queries and are asserted rather than engineered for.

| Operation | Target (PRD §6) | How it is met | Test |
|---|---|---|---|
| Queue load | < 1 s | One indexed query over `cases` + aggregated exception counts; `idx_cases_status_priority` | — |
| Shipment detail | < 1 s | Five parallel indexed reads behind one screen; client fetches concurrently | — |
| Rule evaluation (single shipment) | < 500 ms | In-process, cached rule set, no I/O beyond two indexed reads | RE-20 |
| Revalidation round-trip | < 2 s | One transaction: evaluate, reconcile, audit, notify, regenerate AI (fallback < 50 ms) | RV-09 |
| AI summary/recommendation (p95) | ≤ 5 s | Cached per evaluation version; **the fallback path is < 50 ms** and is the default | AI-07 |
| AI hard timeout | 10 s | `AbortController`; fallback served, request still returns `200` | AI-07 |

**With `CARGODEMO_AI_PROVIDER=none`, the p95 AI budget is met by roughly two orders of magnitude**, because the deterministic generators are pure string templating over already-loaded evidence. The 5 s and 10 s figures exist for the optional-provider configuration only.
---

# 6. Rule Engine, AI Boundary & Integration Points

## 6.1 Integration Inventory

CargoDemo is deliberately near-hermetic. An integration not listed here does not exist and must not be added without amending PRD §5.8.

| # | Integration | Kind | Direction | Required for the demo | Failure behavior |
|---|---|---|---|---|---|
| I1 | Cargo-entry JSON file / local ingestion API | **Simulated** (stands in for ACE) | Inbound | Yes | Per-entry rejection; batch continues |
| I2 | AI provider (OpenAI/Anthropic-compatible HTTP) | **Real, optional** | Outbound | **No** | Deterministic fallback; walkthrough unaffected |
| I3 | SQLite database file | Real, local | Bidirectional | Yes | Startup abort |
| I4 | Local document storage (filesystem) | Real, local | Bidirectional | Yes | Startup abort; upload rolls back |
| I5 | Notification delivery (email/SMS) | **Simulated — generated, never transmitted** | — | Yes (as a recording) | N/A — no transport exists |
| I6 | Identity provider (PIV/CAC, SSO) | **Simulated — role selector** | — | Yes (as a selector) | N/A — no external call |
| I7 | Browser (embedded preview) | Real | Inbound | Yes | Deterministic port; stable URL |

Everything a production system of this shape would have — ACE connectivity, importer correspondence, message queues, schedulers, webhooks, external audit sinks, telemetry exporters — is explicitly absent (PRD §5.9).

### Egress summary

| Destination | When | Contains | Suppressible |
|---|---|---|---|
| AI provider | Summary/recommendation generation, **only when `CARGODEMO_AI_PROVIDER ≠ none`** | Synthetic shipment attributes, rule definitions, evidence | Yes — set the provider to `none`, **which is the default** |

**That is the complete egress inventory.** With `CARGODEMO_AI_PROVIDER=none` the application makes **zero** outbound network requests and the entire ten-step walkthrough still completes — the configuration used by the F21 end-to-end test and the recommended configuration for a live CBP demonstration.

## 6.2 Rule-Engine Configuration Storage

### Where configuration lives

**Entirely in the `rules` table** (`02a` §2.7). There is no rule DSL file, no YAML, no environment variable, and no hardcoded threshold anywhere in `src/domain/rules/`. The seed file `fixtures/rules.seed.json` is an *initial dataset*, not a runtime source — after boot, the database is the only authority.

```
  rules row
  ├─ exception_type    ──▶ selects which of exactly THREE evaluators runs   (code)
  ├─ conditions_json   ──▶ applicability gate, shared by all three          (data)
  ├─ params_json       ──▶ every threshold, list, count, and field path     (data)
  ├─ severity          ──▶ feeds priority derivation                        (data)
  ├─ priority_mapping  ──▶ optional per-rule severity→priority override     (data)
  ├─ enabled           ──▶ disabled rules never evaluate, ever              (data)
  └─ version           ──▶ stamped onto every exception the rule produces   (data)
```

**The dividing line is absolute:** `exception_type` selects *mechanism*; everything else is *behavior*, and all behavior is data. A `MISSING_REQUIRED_DOCUMENT` rule does not know which documents it requires until it reads `params_json`. An administrator changing `expected_digit_count` from 10 to 6, or adding a document type, or lowering a severity, produces a different validation outcome **with no code change and no redeploy** — which is exactly the F15/PRD §7 "rule configurability" success metric.

### Parameter validation

`params_json` is validated by Ajv against a JSON Schema chosen by `exception_type`, with **`additionalProperties: false`**. That last property is load-bearing: a typo in a parameter name is a `422 RULE_CONFIG_INVALID` on save rather than a silently ignored key that quietly disables a check. Cross-field checks are part of the same validation — for example, `check_known_codes: true` with an empty `known_codes` is invalid rather than a rule that passes everything (test RE-08).

Validation runs at three moments, deliberately:

| Moment | Behavior on failure |
|---|---|
| **On save** (F15, `POST`/`PATCH /api/rules`) | `422 RULE_CONFIG_INVALID` with `field_errors`; nothing persists |
| **On load** (F4, every evaluation) | The rule is **skipped and recorded** in `evaluations.invalid_rules_json`; the other rules still evaluate (test RE-17) |
| **On startup** (health probe) | Counted as `health.subsystems.rules.invalid`; a non-zero value degrades health but does not block startup |

Validating on load as well as on save is defence against a rule made invalid by a migration or a direct database edit. A silently non-firing rule is the worst possible failure for a compliance system: it looks like a passing shipment.

### The three evaluators (closed set)

| `exception_type` | Module | Parameter surface |
|---|---|---|
| `MISSING_REQUIRED_DOCUMENT` | `rules/evaluators/missingDocument.ts` | `required_document_types`, `match_mode`, `accept_statuses`, `require_file_present`, `ignore_superseded` |
| `INVALID_HTS_CODE` | `rules/evaluators/htsCode.ts` | `expected_digit_count`, `min_digit_count`, `allowed_separators`, `allow_partial`, `treat_missing_as_exception`, `check_known_codes`, `known_code_prefix_length`, `known_codes`, `placeholder_characters` |
| `CONFLICTING_COUNTRY_OF_ORIGIN` | `rules/evaluators/countryOfOrigin.ts` | `declared_field`, `comparison_fields`, `treat_missing_declared_as_conflict`, `treat_missing_comparison_as_conflict`, `allowed_pairs`, `case_sensitive` |

**The evaluator registry is a closed map with no registration API.** A fourth exception type cannot be added by configuration, by plugin, or by a rules row — `exception_type` carries a `CHECK` constraint on both `rules` and `exceptions`, and a persisted unknown value raises `EXCEPTION_TYPE_UNSUPPORTED`. Adding a type would require a code change *and* a migration *and* a PRD amendment. That friction is the intended enforcement of PRD §5.8.

### Evaluation pipeline

```
  invoke(cargo_entry_id, trigger, actor)
    │
    ├─ ① load entry + documents + ENABLED rule set (process-cached)
    ├─ ② sort deterministically: (exception_type ASC, severity DESC, rule_id ASC)
    │      └─ this ordering IS the persisted finding order and the UI display order
    ├─ ③ per rule: evaluate applicability conditions
    │      └─ not applicable → skipped_rules[] WITH the failing condition
    │         ("did not apply" is distinct from "passed", and both are recorded)
    ├─ ④ per applicable rule: dispatch to its evaluator
    │      └─ bad DATA is a finding, never a throw
    │         bad RULE DEFINITION → invalid_rules[], other rules continue
    ├─ ⑤ retain ALL findings — no suppression, no dedup, no "highest severity only"
    ├─ ⑥ compute rule_set_fingerprint = sha256 over ordered (rule_id, version, enabled)
    └─ ⑦ hand EvaluationResult to F5 for persistence + priority derivation
```

**Rule-set caching and invalidation.** The enabled rule set is cached in process and invalidated whenever any `rules` row is created, updated, enabled, or disabled. A rule change therefore takes effect **on the very next evaluation, with no restart** — which is what makes the F15 administrator demo (change a parameter, preview the impact, revalidate, see the queue change) work live. The cache is keyed by the same `rule_set_fingerprint` recorded on evaluations, so a stale cache would be visible as a fingerprint mismatch rather than a silent wrong answer.

**Determinism.** The same `(entry, rule set)` produces identical findings, identical ordering, and identical evidence arrays on every run — asserted by RE-15, which evaluates every seeded shipment twice and byte-compares serialized results against golden fixtures. Evaluators never mutate the entry, its documents, or the rule set; they are pure functions of their inputs.

### Why the canonical walkthrough works

The default `rule-origin-manufacturer` sets `comparison_fields: ["manufacturer.address.country"]` and nothing else. Attaching a certificate of origin in step 6 therefore **cannot change that rule's inputs**, and the HTS code is untouched by document evidence. So step 7 resolves exactly one exception and retains exactly two — the behavior the walkthrough must demonstrate — and it does so as a *consequence of configuration*, not a special case in code. `rule-origin-certificate` (which would read `documents.CERTIFICATE_OF_ORIGIN.stated_country`) and `rule-doc-solar-cert` are seeded **disabled**, so the canonical shipment has exactly three exceptions and an administrator has two rules available to demonstrate enabling.

## 6.3 AI Integration Boundary

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AiAssistService                                                             │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐     │
│   │  DETERMINISTIC CORE — always runs, never calls the network         │     │
│   │                                                                    │     │
│   │   recommended_action  ← domain/ai/recommendation.ts (9-row table)  │     │
│   │   confidence.level    ← domain/ai/recommendation.ts (8 factors)    │     │
│   │   confidence.basis    ← composed from the factors that moved it    │     │
│   │   presentation bundle ← exceptions + rule + policy_ref + evidence  │     │
│   │   grounding_fingerprint ← sha256 over the grounding set            │     │
│   └────────────────────────────┬───────────────────────────────────────┘     │
│                                │                                             │
│              ┌─────────────────┴──────────────────┐                          │
│              │  provider === 'none'?  (DEFAULT)   │                          │
│              ├───────────── YES ──────────────────┤                          │
│              │   NO NETWORK ACTIVITY AT ALL       │                          │
│              │   prose ← deterministic templates  │                          │
│              │   mode  ← FALLBACK_PROVIDER_DISABLED                          │
│              ├───────────── NO ───────────────────┤                          │
│              │   ONE HTTPS POST, no retries,      │                          │
│              │   temperature 0.2, 10 s abort      │                          │
│              │   prompt carries the grounding set │                          │
│              │   AND the already-decided action   │                          │
│              │   and confidence — asks ONLY for   │                          │
│              │   a rationale/narrative            │                          │
│              │        │                           │                          │
│              │        ├─ valid + grounded → prose, mode LLM                  │
│              │        └─ any failure ──────▶ deterministic templates         │
│              └────────────────────────────────────┘                          │
│                                │                                             │
│   ┌────────────────────────────▼───────────────────────────────────────┐     │
│   │  ALWAYS 200. ai_outputs row written with content + provenance.     │     │
│   │  provenance.action_source === 'DETERMINISTIC'  (permanently)       │     │
│   └────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The determinism contract

> **The recommended action and the confidence level are ALWAYS computed deterministically, in process, from the open exception set and case state. The AI provider authors prose only — the summary narrative and the recommendation rationale. It never selects the action, never sets the confidence, and never takes an action.**

Four consequences, each of which is an asserted property rather than an intention:

| Consequence | Enforcement | Test |
|---|---|---|
| The recommendation is **identical** with the provider enabled or disabled | The action/confidence code path never calls `AiProvider` | **AI-04** runs the same shipment with a stubbed provider on and off and asserts identical `recommended_action` and `confidence.level` |
| `provenance.action_source` is permanently `"DETERMINISTIC"` | Typed as the literal `'DETERMINISTIC'` in `03c`; no code path sets another value | AI-04 |
| The prose cannot contradict the advice | The LLM rationale is validated against the grounding set **and** checked for advocating a different action code or using approval language; failure → template | AI-06 |
| The walkthrough completes with zero egress | `provider === 'none'` short-circuits before any client construction | **AI-01**, **E2E-01** (which runs with `CARGODEMO_AI_PROVIDER=none`) |

**This is what turns "the demo works without the AI" from a hope into a structural property.** If the provider chose the action, disabling it would change the demo's behavior and the fallback would be a degradation. Because it does not, disabling the provider changes only the wording — and the wording is deterministic too.

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `CARGODEMO_AI_PROVIDER` | **`none`** | `openai` \| `anthropic` \| `none`. **`none` is the supported demo default** |
| `CARGODEMO_AI_MODEL` | provider default | Recorded verbatim in provenance |
| `CARGODEMO_AI_API_KEY` | unset | Never logged, never returned by any endpoint, never committed |
| `CARGODEMO_AI_TIMEOUT_MS` | `10000` | Hard timeout; the fallback serves after it |

### Request contract (only when a provider is enabled)

A single call, **no retries**, `temperature: 0.2`, max output tokens 700 (summary) / 500 (rationale), JSON-mode output where the provider supports it. The prompt contains only the **grounding set**: synthetic shipment attributes, rule definitions, and captured evidence. Because the entire dataset is synthetic, **no real or personal data can be transmitted even when the provider is enabled** (PRD §6 Privacy).

For the recommendation, the prompt additionally carries the **already-decided action and confidence** and asks for a justification traceable to the evidence. The model is not being asked what to do; it is being asked to explain a decision the system has already made deterministically.

### Failure behavior, exhaustively

| Condition | Behavior | `generation_mode` recorded |
|---|---|---|
| Provider disabled (`none`) | **No call attempted** | `FALLBACK_PROVIDER_DISABLED` |
| DNS / TLS / connection failure | Fallback | `FALLBACK_PROVIDER_ERROR` |
| HTTP 4xx/5xx, including rate limits | Fallback | `FALLBACK_PROVIDER_ERROR` |
| No response within `CARGODEMO_AI_TIMEOUT_MS` | Fallback | `FALLBACK_TIMEOUT` |
| Unparseable or schema-invalid output | Fallback | `FALLBACK_VALIDATION_FAILED` |
| Output fails the grounding or action-language check | Fallback | `FALLBACK_VALIDATION_FAILED` |

**In every case the endpoint returns `200` with complete content.** `AI_UNAVAILABLE` is a reserved error code that `/ai/summary` and `/ai/recommendation` never return (`Y2` §7). Provider unavailability is a recorded mode, not an error — because in the default configuration it is the *expected* mode.

### Deterministic fallback generators

`domain/ai/fallback/summary.ts` and `rationale.ts` render prose from templates keyed by `(exception_type, sub_reason)`. They are pure functions of the grounding set: identical grounding produces **byte-identical** text, compared against golden fixtures (AI-02). Template coverage is exhaustive — every `(exception_type, sub_reason)` pair defined in F4 has a template, asserted by AI-03, and a missing one is `FALLBACK_TEMPLATE_MISSING` (a genuine `500`, because it is a build defect rather than a runtime condition). The fallback path completes in **< 50 ms**.

Fallback output is **functionally complete, not a stub**: it names the commodity, the importer, the value, each exception, its triggering rule and policy reference, the evidence fields, and the missing information. A stakeholder watching the default configuration sees a complete product, clearly labeled — which is why the degradation banner is presented as a feature (the simulation boundary made obvious) rather than an apology.

### Inertness

`AiAssistService` writes to `ai_outputs` **and nothing else**. It MUST NOT write `cases`, `case_actions`, `recommendations`, or `approvals`, and MUST NOT enqueue any deferred execution. Test AI-08 asserts that requesting a recommendation leaves `cases.updated_at` and `cases.status` unchanged. At the storage layer, `audit_entries CHECK (actor_kind <> 'AI' OR user_decision IS NULL)` makes an AI-authored decision unwritable, and `ai_outputs CHECK` excludes approval codes from `recommended_action` — **the system structurally cannot recommend that a supervisor approve something.**

When a human later takes an action, the workflow service snapshots the current recommendation — action, confidence, basis, rationale, provenance, grounding fingerprint — into the audit entry, together with `concurrence: AGREED | DIVERGED | NO_RECOMMENDATION_PRESENT`. Approval decisions (F11) record `NOT_APPLICABLE`, because the AI never advises `APPROVE_CLEARANCE` and so an approval can neither agree nor disagree with it. **Divergence is not an error; it is the point.** In the canonical walkthrough the deterministic table advises `ESCALATE_TO_SUPERVISOR` (a `CRITICAL` origin finding is present) and the specialist instead requests the missing document — so step 10 shows a recorded, unscripted instance of a human overruling the machine.

### Startup probe

A 3-second reachability check sets `health.subsystems.ai.mode`. With `provider === 'none'` the mode is recorded as `FALLBACK_PROVIDER_DISABLED` **without any network call**. **A failed probe never blocks or fails startup** — startup must not require network access (P4).

## 6.4 I1 — Cargo-Entry Ingestion (ACE Simulation)

**Stands in for:** a live ACE (Automated Commercial Environment) feed.

**What exists instead:** a versioned JSON file at a known path and a local HTTP endpoint accepting the identical envelope (`03c` §3c.4). The API path is administrator-gated; the file/CLI path runs as a `SYSTEM` actor.

**Contract:** `schema_version: "1.0"`, `additionalProperties: false`, 1–500 entries per batch, idempotent on `shipment_id`.

**Boundary properties that must remain visible during the demo:**

- The ingestion source is labeled on every shipment (`ingestion.source`) as `seed`, `file:<name>`, or `api`.
- **No ACE credential, endpoint, or client library appears anywhere in the codebase or configuration.**
- Re-ingesting a `CLEARED` shipment is refused with `CASE_TERMINAL`, so an external feed cannot silently reopen a finalized decision (IN-03).

**Failure behavior:** a malformed envelope rejects the batch atomically; a malformed entry rejects only itself and is reported in the `IngestionReport` with a JSON pointer and reason.

**Forward path (out of scope, recorded):** a real ACE adapter would implement the same `IngestionPort` the file and API paths implement, leaving the domain unchanged. **No such adapter is built.**

## 6.5 I5 — Notification Delivery (Absent by Design)

**What a production system would have:** email or SMS delivery to importers, brokers, and internal recipients.

**What exists:** notification rows with recipient, subject, body, and timestamp, persisted and linked to the audit entry that produced them.

**Five independent enforcements that nothing is transmitted:**

1. **No SMTP, SMS, webhook, or push client is a dependency of the project.** There is no code that could send anything.
2. `notifications.transmitted` carries `CHECK (transmitted = 0)` — a transmission attempt could not even be *recorded*.
3. The TypeScript type is the literal `false`, not `boolean`, so a client cannot write code branching on a transmitted notification.
4. Every rendered body ends with the fixed sentence *"This notification was generated and recorded by CargoDemo. It was not transmitted to any external recipient."*
5. Every notification is displayed under the "Generated, not transmitted" label (F13, F20), and test AU-11 asserts the column's distinct value set after a full walkthrough.

## 6.6 I6 — Identity (Absent by Design)

**What a production system would have:** PIV/CAC smart-card authentication or SSO against an agency identity provider.

**What exists:** a role selector over five seeded users issuing an opaque local session token. No external call, no federation, no password, no token exchange. Full specification in `04-security` §4.2.

## 6.7 I3, I4, I7 — Local Resources

| # | Resource | Contract | Failure behavior |
|---|---|---|---|
| I3 | SQLite at `CARGODEMO_DB_PATH` | Schema of `02a`/`02b`, forward-only migrations with checksum verification, WAL, FK on per connection | Unwritable path, checksum mismatch, or failed schema self-check → **exit 1**. The application never serves against a database whose integrity it has not verified — in particular, never with the audit append-only triggers absent |
| I4 | Filesystem at `CARGODEMO_DOC_STORAGE_DIR` | `{shipment_id}/{request_id}-{sanitized_filename}`; 1 byte–5 MB; five allowed MIME types with extension and magic-byte consistency; PII screen on text content | Unwritable directory → exit 1. A write failure during upload rolls back the document row, the request status change, and the triggered revalidation, and removes any partially written file — **storage and database never diverge** |
| I7 | Browser via the embedded preview | Single origin: API at `/api/*`, SPA on all other paths with `index.html` fallback, one process bound to `0.0.0.0:3000`. **Same-origin only — no CORS configuration is required or provided**, which removes an entire class of demo-day failure. No third-party scripts, fonts, analytics, or CDN assets | An occupied port aborts startup rather than silently rebinding. Iframe-compatibility header constraints in `04-security` §4.7 |
---

# 7. Testing Architecture

## 7.1 Strategy

The test suite exists to **hold the governance claims true rather than merely asserted**. Every claim this document makes about separation of duties, audit immutability, AI inertness, determinism, or RBAC is paired with a test identifier, and every test failure prints the FRD reference it violates (e.g. `F09a I1`) — so a red build names the *requirement* that broke, not merely the assertion.

```
                        ┌──────────────────────────┐
                        │  E2E — Playwright        │   3 specs
                        │  the real start command  │   ~2 min
                        ├──────────────────────────┤
                        │  Integration — Fastify   │   ~120 specs
                        │  inject(), real          │   ~20 s
                        │  middleware, temp DB     │
                        ├──────────────────────────┤
                        │  Unit — Vitest           │   ~250 specs
                        │  pure domain, no I/O     │   ~3 s
                        └──────────────────────────┘
```

The pyramid is unusually **domain-heavy** because the layering makes it so. The state machine, the three evaluators, priority derivation, the action-derivation table, confidence scoring, the fallback templates, and the audit completeness gate are all pure functions (`01-components` §1.2). WF-01's 70-case matrix — every status × action × adjudicating role — is a fast unit test rather than 70 HTTP round-trips, which is why exhaustive coverage is affordable here.

| Level | Tool | Boundary | Database | Network |
|---|---|---|---|---|
| Unit | Vitest | A pure function or a single service | in-memory or temp file | none |
| Integration | Vitest + `fastify.inject()` | A real HTTP route through the **full middleware chain**, including the RBAC gate | temp file per test file | none |
| E2E | Playwright | The browser against `npm start` | fresh temp file | none |

**`fastify.inject()` rather than a live port** for integration tests: it exercises the genuine plugin chain — schema validation, session resolution, the RBAC gate, the error mapper — without binding a socket, so the suite is fast, parallel-safe, and free of port collisions. A test that bypassed the middleware would prove nothing about authorization.

## 7.2 Isolation and Determinism

| Property | Mechanism |
|---|---|
| **No shared state** | Each test *file* provisions its own temporary file-backed SQLite instance and document directory, torn down after. No test can observe another's writes |
| **Deterministic seeding** | `SeedClock` (fixed instant, monotonic step) + `DeterministicIdGenerator` (counter-derived) are injected, so two `FORCE_RESEED` runs produce byte-identical rows *including timestamps and IDs* (SD-03) |
| **Deterministic evaluation** | Determinism suites run each subject twice and byte-compare serialized output against golden fixtures |
| **Golden fixtures** | Committed expected outputs for evaluation results, fallback summary and rationale text, and audit exports. Regenerated **only** by an explicit `npm run test:update-goldens` — never automatically, so a determinism regression cannot self-heal into the baseline |
| **No network, ever** | The suite runs with `CARGODEMO_AI_PROVIDER=none`; provider-enabled cases use `StubProvider`, which is an in-process object, not a mock HTTP server |
| **File-backed, not `:memory:`** | Temp files rather than in-memory databases, because WAL mode, triggers, and multi-connection behavior must be exercised as they run in production |

## 7.3 Coverage by Governance Claim

The full test identifiers are enumerated in FRD F21 §§1–8. This table maps each **architectural** claim in this document to the tests that hold it.

| Claim (TechArch reference) | Tests |
|---|---|
| Rule logic is configuration, not code (`06a` §2) | RE-07 (`allow_partial` change alters behavior with no code change), RE-08, RE-13, RE-16 |
| Three exception types, closed set (AD-07) | RE-01…RE-14; `EXCEPTION_TYPE_UNSUPPORTED` path |
| Evaluation is deterministic (P2) | RE-15 (golden fixtures, every seeded shipment twice), RE-20 (< 500 ms) |
| Evidence is complete and structured (`02a` §2.10) | RE-18 |
| Exactly one path to `CLEARED` (`04` §4.5) | **WF-02** (counts rows from `GET /api/workflow/transitions`), WF-11 |
| No AI or SYSTEM actor executes a transition | WF-03, AU-09 |
| Every transition is justified, audited, and notified (I3, I4) | WF-04, WF-05 |
| Terminal cases are immutable (I6) | WF-06, IN-03 |
| Escalation transfers authority (I7) | WF-07 |
| Redundant transitions are rejected, not absorbed (I8) | WF-08 |
| Denials are recorded (I10) | WF-09, AC-10 |
| Concurrency and idempotency (`03b` §3b.8) | WF-12, WF-13 |
| RBAC: 60 routes × 3 roles (`04` §4.4) | **AC-01** |
| Separation of duties at handler *and* database (AD-11) | **AC-02**, AC-03 |
| Neither supervisor nor administrator can become the other (`04` §4.4) | AC-04, AC-05 |
| Role spoofing is impossible (`04` §4.2) | AC-06 |
| No unprotected route can ship by omission (`04` §4.3 L1) | AC-09 |
| Iframe compatibility: no `X-Frame-Options`, no restrictive `frame-ancestors` (**AD-06**) | **HDR-01**, HDR-02 |
| Upload security: size, MIME, magic bytes, PII, traversal (`04` §4.6) | UP-01…UP-06 |
| Eight-field audit completeness (`02b` §2b.6) | AU-01, **AU-02**, **AU-03** (a nulled field aborts and the case does *not* clear) |
| Audit append-only at the database layer (AD-10) | AU-04, AU-05 |
| Hash chain detects tampering | AU-06, AU-07 |
| Snapshot, not reference (AD-13) | **AU-08** |
| Notifications generated, never transmitted (`06a` §5) | AU-11 |
| History is never deleted (AD-12, P5) | **RV-03** (row counts monotonically non-decreasing) |
| Step 7 resolves one, retains two | **RV-01**, RV-02 |
| Revalidation never clears or pends approval (I9) | RV-05 |
| AI: complete output with the provider disabled | **AI-01** |
| AI: fallback prose is deterministic | AI-02, AI-03 |
| **AI: action and confidence identical, provider on or off (AD-08)** | **AI-04** |
| AI: confidence always has a basis | AI-05 |
| AI: hallucination is rejected and the fallback served | AI-06 |
| AI: timeout falls back and still returns `200` | AI-07 |
| **AI is inert — no workflow write** | **AI-08** |
| AI advice and concurrence appear on every human action entry | AI-10 |
| Ingestion is idempotent and cannot reopen a cleared case | IN-01…IN-04 |
| Seed coverage and canonical scenario | SD-01, **SD-02**, SD-03, SD-04, SD-05 |
| Health surfaces the invariants | DE-01, DE-02 |

## 7.4 The End-to-End Walkthrough

`E2E-01` executes the full ten-step narrative against a freshly reset environment with **`CARGODEMO_AI_PROVIDER=none`**, asserting at each step:

1. The queue lists flagged shipments with shipment ID, importer, exception, priority, and status; `SHP-2026-0007` shows **three exception chips** at `CRITICAL`; the clean shipment is **absent**.
2. Selecting the row loads Shipment Review with all eight required attributes.
3. The AI summary renders with **both** the AI-generated label and the offline-fallback label.
4. Recommended Resolution shows the exception, the triggering rule **with its policy reference**, the evidence, the missing information, the AI recommendation, and the confidence **with its basis**; all five actions are present and **none is pre-selected**.
5. Requesting the certificate of origin with a justification moves the case to `AWAITING_INFORMATION` and creates an audit entry and a notification.
6. Uploading the fixture attaches the document with `Uploaded this session` provenance.
7. Revalidation resolves the missing-document exception, retains the HTS and origin exceptions, and the change indication reports **"1 resolved, 2 retained"**.
8. The specialist recommends clearance; the case becomes `PENDING_APPROVAL` and appears under the supervisor's pending filter.
9. Switching to the supervisor, the approve control is enabled (and would be disabled for the specialist); approving moves the case to `CLEARED` with the approving official recorded and a notification generated.
10. The Decision & Audit Record screen replays every step with all eight fields on each decision entry, AI content **visually separated**, notifications shown alongside decisions, the completeness block reporting all decisions complete, and the chain **verifying**.

`E2E-02` repeats `E2E-01` **three consecutive times after reset** and asserts identical outcomes (PRD §7 repeatability). `E2E-03` asserts that a specialist attempting to approve their own recommendation is blocked **in the UI and by the server**, and that the denial appears in the audit record.

> **The E2E suite drives `npm start` — the same command used for the demo — on an ephemeral port.** This is deliberate and load-bearing: a passing E2E therefore *implies* a working demo. Testing against `npm run dev` (the two-port developer mode) would prove something about a configuration nobody demos.

## 7.5 CI Gating

`npm run test:all` = `lint` → `typecheck` → `test` → `test:e2e`. CI gates on the whole chain being green.

Two structural gates make coverage self-maintaining rather than aspirational:

- **A new route without an RBAC matrix row fails AC-01**, because the test iterates the registry rather than a hand-written list.
- **A new transition without a matrix row fails WF-01**, for the same reason.

Adding an unprotected endpoint additionally aborts *startup* (`ROUTE_PERMISSION_MISSING`), so the failure arrives before CI does. Failures report `{ test_id, frd_reference, expected, actual }`, and infrastructure failures (port in use, fixture missing) are distinguished from assertion failures so a red build is diagnosable in one read.

---

# 8. Deployment & Preview Topology

## 8.1 Startup Sequence

```
  npm start
    │
    ├─ ① parse + validate configuration        invalid value        → exit 1
    ├─ ② open/create SQLite at DB_PATH         unwritable           → DB_UNAVAILABLE, exit 1
    │      PRAGMA foreign_keys=ON, journal_mode=WAL, busy_timeout=5000
    ├─ ③ run forward-only migrations           checksum mismatch    → MIGRATION_CHECKSUM_MISMATCH, exit 1
    ├─ ④ SCHEMA SELF-CHECK                     missing CHECK/trigger→ SCHEMA_INTEGRITY_FAILED, exit 1
    │      • foreign_keys enabled
    │      • cases clearance CHECK present
    │      • approvals SoD + role CHECKs present
    │      • notifications transmitted CHECK present
    │      • audit_entries + notifications append-only triggers present
    ├─ ⑤ verify document storage dir writable  unwritable           → STORAGE_UNAVAILABLE, exit 1
    ├─ ⑥ seed if empty (SEED_ON_EMPTY)         coverage assertion   → SEED_COVERAGE_FAILED, rollback
    ├─ ⑦ ROUTE REGISTRY SELF-CHECK             missing allowedRoles → ROUTE_PERMISSION_MISSING, exit 1
    │                                          missing schema       → ROUTE_SCHEMA_MISSING, exit 1
    ├─ ⑧ AI provider probe (3 s budget)        NEVER blocks or fails startup
    │      provider === 'none' ⇒ mode = FALLBACK_PROVIDER_DISABLED, ZERO network activity
    ├─ ⑨ bind 0.0.0.0:3000                     occupied             → PORT_IN_USE, exit 1 (NO fallback)
    └─ ⑩ print the readiness block
```

**Step ④ is the one that matters most.** The application never serves requests against a database whose audit append-only triggers it has not verified. A demo running on a database with the triggers silently absent would make an unfalsifiable claim falsifiable, so it refuses to start instead.

**Steps ⑦ and ⑨ fail loudly by design.** An unprotected endpoint cannot ship by omission — only by an explicit, reviewable declaration. And the port never moves: automatic fallback is *not implemented*, because a shifting preview URL breaks an embedded demo mid-presentation.

### Readiness block

```
  CargoDemo 1.0.0 ready
  ─────────────────────────────────────────────────
  Preview URL      http://0.0.0.0:3000
  Schema version   7   (triggers: ok, foreign_keys: on)
  Seeded entries   12  (canonical scenario: SHP-2026-0007 ✓)
  Rules            7 total, 5 enabled, 0 invalid
  Clearance paths  1                    ← governance invariant
  Routes           60 registered, 0 without permission
  AI mode          FALLBACK_PROVIDER_DISABLED (provider: none)  ← zero egress
  Reset            npm run reset   |   POST /api/admin/reset
```

## 8.2 Preview Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│  Pivota Preview                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  <iframe src="http://0.0.0.0:3000">                              │  │
│  │                                                                  │  │
│  │   Embedding works ONLY because the app sends:                    │  │
│  │     • NO  X-Frame-Options header                                 │  │
│  │     • CSP WITHOUT frame-ancestors 'none'/'self'                  │  │
│  │   (04-security §4.7 — regression-tested by HDR-01)               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ same origin — no CORS, no proxy
┌──────────────────────────────▼─────────────────────────────────────────┐
│  ONE Node.js process · host 0.0.0.0 · port 3000 (deterministic)         │
│                                                                        │
│    /api/*      →  Fastify, 60 routes                                   │
│    /*          →  React SPA static assets, index.html fallback          │
│                                                                        │
│    ./data/cargodemo.db          ./data/documents/                      │
└────────────────────────────────────────────────────────────────────────┘
```

Four properties make the preview robust, each addressing a specific demo-day failure mode:

| Property | Prevents |
|---|---|
| `0.0.0.0` binding | An unreachable preview URL — `localhost` binding is not visible from outside the container. A `localhost` value logs a prominent warning naming this consequence |
| Deterministic port `3000`, no fallback | A URL that shifts between restarts and breaks an embedded frame mid-demo |
| One process, one origin | CORS misconfiguration, proxy failures, and the second-process-died class of problem |
| No third-party assets | A blank or unstyled UI on conference Wi-Fi. Every font, icon, and style is bundled and served from the app itself |

## 8.3 Reset and Repeatability

Reset is available two ways, both invoking the same `SeedService` with `FORCE_RESEED` inside one transaction:

| Surface | Access |
|---|---|
| `npm run reset` (CLI) | Local operator |
| `POST /api/admin/reset` `{ confirm: true }` | **Administrator only**, exposed as a one-click control with a confirmation step on the Demo Controls screen |

Reset truncates in the reverse-dependency order of `02b` §2b.11, clears the document storage directory in the same operation so storage and database never diverge, and reseeds. The append-only delete triggers are dropped and recreated around the transaction by the migration-aware reset routine — **the only code path permitted to do so**, administrator-gated, and whole-environment rather than selective. Selective deletion of one entry or one case's history is not implementable through any surface.

The first row of the new audit chain is a `DEMO_RESET` entry (DE-02). A failed coverage assertion leaves the transaction rolled back and reports `SEED_COVERAGE_FAILED` rather than producing a half-seeded demo.

**Three consecutive reset-plus-walkthrough cycles produce identical results** (E2E-02), which is what "repeatable, live, without cleanup between runs" actually requires.

## 8.4 Pre-Demo Checklist

Derived entirely from `GET /api/health` — a presenter can verify readiness in one request, from the browser, before selecting a role.

1. `status` is `"ok"`, or `"degraded"` with **only** the AI subsystem in fallback — which is the accepted and recommended demo configuration.
2. `seed.canonical_scenario_present` is `true` and `seed.entry_count` is `12`.
3. `workflow.clearance_paths` is **`1`** and `rbac.routes_without_permission` is **`0`**.
4. `documents.upload_ready_fixtures` is ≥ 1, so walkthrough step 6 has a file to attach.
5. `demo.port` is `3000` and `demo.host` is `0.0.0.0`.
6. The queue shows `SHP-2026-0007` with three exception chips at `CRITICAL` priority and status `New`.

Items 3 and 5 are worth pausing on during a walkthrough: `clearance_paths: 1` is the central governance claim, reported by the running system rather than asserted in a slide.

## 8.5 Failure Modes and Recovery

| Symptom | Cause | Recovery |
|---|---|---|
| `PORT_IN_USE` at startup | Port 3000 occupied by a prior run | Kill the prior process, or set `CARGODEMO_PORT`. **Never** auto-rebind |
| Preview frame blank, app reachable directly | An `X-Frame-Options` or restrictive `frame-ancestors` header was reintroduced | Remove it; HDR-01 exists to catch this in CI (AD-06) |
| Preview unreachable | Bound to `localhost` instead of `0.0.0.0` | Unset `CARGODEMO_HOST`; the startup warning names this exact case |
| `SCHEMA_INTEGRITY_FAILED` | Migration drift or a missing append-only trigger | Delete `./data/cargodemo.db` and restart; it reseeds deterministically |
| `SEED_COVERAGE_FAILED` | Seed dataset or fixtures edited without updating coverage | Transaction already rolled back; fix the fixture and re-run `npm run reset` |
| Degradation banner visible | AI in a `FALLBACK_*` mode | **Expected and correct in the default configuration.** Present it as the simulation boundary, not a fault |
| Case appears stuck in `PENDING_APPROVAL` | Acting user is the recommender | Switch to a second supervisor — this is separation of duties working (AC-03) |
| Action returns `409 CASE_VERSION_CONFLICT` | The case changed in another tab or role | Reload the shipment and resubmit. Expected under concurrent use (WF-13) |

## 8.6 What Is Deliberately Absent from Deployment

No container image, no orchestration manifest, no reverse proxy, no TLS termination, no process supervisor, no CI deployment pipeline, no secret manager, no external database, no object store, no CDN, no log aggregator, no APM agent.

**Every one of these is an omission with a reason**, not a gap: each would add an external dependency, a network path, or a failure mode to a single-session, single-tenant, synthetic-data demonstration whose entire value proposition is that it starts with one command in a fresh sandbox and completes a ten-step governed workflow with zero outbound network calls.

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
