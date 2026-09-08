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
