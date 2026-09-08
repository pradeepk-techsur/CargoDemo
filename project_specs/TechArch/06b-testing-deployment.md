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
