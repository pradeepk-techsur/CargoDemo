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
