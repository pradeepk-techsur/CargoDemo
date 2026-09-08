# Security Report — Express: cargodemo-cbp-cargo-exception-review-app

**Mode:** retroactive
**Audited:** 2026-09-08
**Verdict:** SECURED
**Confirmed HIGH/CRITICAL:** 0

## Summary
Whole-diff audit of the CargoDemo express task (`git diff main...HEAD`, 127 files added), a
Fastify v4 API on `0.0.0.0:3000` that also serves a built React/Vite SPA same-origin over a
file-backed SQLite database (better-sqlite3). No plan-time threat model exists, so a STRIDE
register was built retroactively from the diff and each item audited against the sinks in the
implementation. Every candidate finding — SQL injection, path traversal, command/argument
injection, IDOR / write-path integrity, prototype pollution, secret leakage, client XSS, and
error-envelope disclosure — was **refuted** as already-neutralized within this build's documented
no-auth single-actor demo scope. There are **zero** open HIGH/CRITICAL findings. The one structural
gap (no authentication / no RBAC) is a **recorded, deliberate scope decision** (STATE.md Wave-3
decision; SUMMARY.md deferred F16), and no exploit *beyond* that documented model was found: the
single mutating endpoint cannot be driven into an inconsistent or forbidden state, and no read leaks
data outside the demo model. **Ship.**

## Attack surface audited
| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| `GET /api/queue` querystring (filter/sort/page) | T | SAFE | queue.ts:22-35 (`additionalProperties:false`); queueService.ts:124-169 allow-list + INVALID_QUERY_PARAM |
| Queue dynamic SQL (ORDER BY / IN clauses) | T | SAFE | queueService.ts:172-211 (SORT allow-list + hardcoded `SEVERITY_RANK`); 256-269 bound `@statusN/@priorityN/@etypeN` params |
| `GET /api/shipments/:shipment_id[/exceptions|/documents]` | T/I | SAFE | shipments.ts:23-67 (params schema); shipmentService.ts:37,57,151,207 all bound `?` params |
| `POST /api/cases/:case_id/actions` (sole mutating endpoint) | T/E | SAFE | cases.ts:97-159 (oneOf discriminated union, `additionalProperties:false`, mandatory `justification`) |
| Action write path integrity (justification, version, state machine, single writer) | T/E | SAFE | workflowService.ts:92-224 (BEGIN IMMEDIATE txn, justification+version guards, pure `evaluateTransition`) |
| Case status writer (single-writer invariant) | E | SAFE | workflowRepository.ts:120-143 (the only `UPDATE cases SET status`, fully bound params) |
| All repositories (cargo/case/document/evaluation/evidence/exception/idempotency/rule/user/workflow) | T | SAFE | grep of `src/infra/db/repositories/*`: every statement is prepared with bound `@`/`?` params; only interpolation is hardcoded `SEVERITY_RANK_SQL` (caseRepository.ts:34-39, ruleRepository.ts:20-25) |
| Rule field-path resolution (dynamic property access) | T | SAFE | fieldPath.ts:19,37-70 (explicit allow-list + `__proto__|constructor|prototype` reject) |
| Country/HTS/doc normalization (JSON/dynamic) | T | SAFE | normalize.ts:111-149 (table-driven, pure, no dynamic index into attacker keys) |
| Static SPA serving + fallback | I/T | SAFE | spa.ts:19-44 (`@fastify/static` root-confined `CLIENT_DIR`, `wildcard:false`, literal `sendFile('index.html')`); `/api` unmatched → JSON 404 |
| DB path / doc storage dir handling | T | SAFE | connection.ts:29-46 + config.ts:99-100 (operator env config, not request-controlled) |
| Migration runner (SQL exec from disk) | T | SAFE | migrate.ts:42-112 (checksum-verified `.sql` files from repo dir, not request input) |
| Response headers (iframe-safety by design) | S/I | SAFE | headers.ts:12-40 (CSP w/o frame-ancestors, `nosniff`, `no-referrer`, `no-store` on /api) — deliberate per AD-05/AD-06 |
| Error envelope (stack/SQL/path leakage) | I | SAFE | errorMapper.ts:51-113 (INTERNAL_ERROR hides detail behind `request_id`; no raw message surfaced) |
| Request logging | R/I | SAFE | app.ts:80-110 (metadata only — method/path/status/duration; no bodies, no secrets; path truncated) |
| Readiness/boot block | I | SAFE | index.ts:100-145 (prints only non-secret counts + literal preview URL) |
| Scripts: `ensureClientBuild.mjs` / `verifyPreview.mjs` | T | SAFE | ensureClientBuild.mjs:84-88 & verifyPreview.mjs:262-267 (`spawn`/`spawnSync` array-arg form, `shell` off on non-win32; no request input) |
| `.pivota/start-dev.sh` / `uat-start.sh` (launchers) | T | SAFE | start-dev.sh env-seed loop operates on `.env.example`/env vars, not attacker HTTP input; uat-start.sh:14-15 `fuser`/`pkill` scoped to port/pattern — reachable only by the operator |
| Config / secret handling | I | SAFE | .env.example:1-30 (no real secrets; demo actor id is non-secret); `.env` gitignored (.gitignore:129); no secret files tracked (`git ls-files`) |
| Client fetch / URL construction | S/T | SAFE | client/api/client.ts:48-149 (relative same-origin `/api/` only, `URLSearchParams`, no token/Authorization) |
| Client rendering (XSS) | T/I | SAFE | no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in `src/`; JSX auto-escapes; routes.ts:16-17 `encodeURIComponent` on shipment id |
| Actor resolution (identity spoofing) | S/E | SAFE | actorService.ts:28-42 (server-side constant resolved from DB; no actor/role read from request) |

## Confirmed findings
> None. Every candidate survived only until refutation.

*No OPEN HIGH/CRITICAL or lower-severity findings.*

## Resolved findings
*None — this is the first audit of this diff.*

## Accepted risks
| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | No authentication / no session / no RBAC on any route, including the mutating `POST /api/cases/:case_id/actions`. Every action is attributed to the single default actor `usr-cs-001`. | Recorded, deliberate scope decision for this reduced demo slice (STATE.md Wave-3: "Role dimension collapsed — access control out of scope"; SUMMARY.md defers F16). It is the first item on the graduation path, not an oversight. Critically, the *absence* of a check is not independently exploitable here: `executeAction` still enforces mandatory human justification, the pure state machine (destination status never taken from the request), optimistic concurrency (`CASE_VERSION_CONFLICT`), the exact-set clearance guard (G-REC), and a `BEGIN IMMEDIATE` single-writer transaction, so the one mutating endpoint cannot be driven into an inconsistent or terminal-CHECK-violating state, and reads expose only demo data. The API binds `0.0.0.0` and is meant to run behind the sandbox preview proxy, not the open internet. | Product / graduation path |
| AR-02 | Iframe-safe headers by design: no `X-Frame-Options` and CSP intentionally omits `frame-ancestors`, so the app is framable. | Deliberate per AD-05/AD-06 — the Pivota Preview embeds the app in an iframe; a framing header blanks it. Compensated by a locked-down CSP (`default-src 'self'`, `object-src 'none'`, `script-src 'self'`, `base-uri 'self'`), `nosniff`, and `no-referrer`. Clickjacking risk is acceptable for a same-origin demo preview with no auth-gated actions and no cross-origin state to steal. | Platform / preview |

## Audit trail
- Diff scoped via: `git diff main...HEAD` (base `main`=6857d43, HEAD=7f61039 on `develop`; 127 files, all added). Context from SUMMARY.md + STATE.md Decisions.
- Register: built retroactively from the diff (no PLAN.md `<threat_model>` exists). STRIDE surface enumerated across HTTP routes, DB repositories, static serving, scripts/shell launchers, config/secrets, domain rule engine, and client.
- Refutation: **8 candidate classes examined, 0 confirmed, 8 refuted as safe** — SQL injection (parameterized + hardcoded ORDER BY allow-list), path traversal (`@fastify/static` root-confined + literal sendFile), command/argument injection (array-arg spawn, no request-sourced shell strings), IDOR / write-path integrity (single serialized writer + guards + version check), prototype pollution (field-path allow-list + forbidden-key regex), secret leakage (nothing committed, envelope strips detail), client XSS (no dangerous sinks, JSX escaping, encoded URLs), error-disclosure (request_id-only INTERNAL_ERROR). Two structural gaps recorded as **accepted risks** (deferred auth/RBAC; deliberate framable headers), neither independently exploitable within scope.
