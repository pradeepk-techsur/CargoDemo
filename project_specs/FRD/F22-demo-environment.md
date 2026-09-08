---

## F22: Demo Environment & Reset

**Priority:** P1 · **Category:** Quality & Demo Readiness

**Description:** F22 provides the operational guarantees that let the walkthrough be run repeatedly, live, without cleanup between runs: a single-command start with the dev server bound to `0.0.0.0` on a deterministic port for an embeddable preview URL, a one-command/one-click reset to pristine seeded state, a health check confirming database, seed data, and AI-assist availability including fallback status before a demo, deterministic seed output, and a graceful-degradation banner when AI assistance is in offline-fallback mode.

**Terminology:**
- **Deterministic port:** A fixed port from configuration, never an ephemeral one, so the preview URL is stable across restarts and embeddable in a briefing deck.
- **Single-command start:** `npm start` performs install-independent startup: migrate → seed if empty → serve both the API and the built/served frontend from one process on one port.
- **Pristine state:** The exact database contents produced by a fresh `FORCE_RESEED` (F2), byte-identical on every run.
- **Health check:** `GET /api/health`, an open route reporting subsystem status, used by the presenter before a demo and by the shell for the degradation banner.
- **Degradation banner:** The persistent, non-dismissible notice shown while AI assistance is in a fallback mode (F16 §Process step 6).

**Sub-features:**
- Single-command start with deterministic binding
- One-command and one-click reset
- Health check with subsystem detail
- Deterministic seed output
- AI-fallback degradation banner
- Pre-demo readiness verification

**Process:**
1. `npm start` runs the startup sequence: read configuration → open/create the SQLite database → run migrations (F0) → schema self-check → seed if empty (F2) → route registry self-check (F14 §1 step 9) → probe the AI provider → bind the server.
2. The server binds to `CARGODEMO_HOST` (default `0.0.0.0`) on `CARGODEMO_PORT` (default `3000`). **`3000` is the single deterministic port for this product** — it is the port the sandboxed preview expects and probes, and it is the platform convention (TechArch AD-05 records the same value). No other document may name a different default. Binding to `0.0.0.0` is what makes the sandbox preview reachable; binding to `localhost` would produce an unreachable preview URL and is treated as a misconfiguration warning at startup.
3. If the port is occupied, startup fails with `PORT_IN_USE` and a clear message naming the port and the environment variable to change it. The server does **not** silently pick another port — a shifting URL breaks an embedded demo.
4. Both the API (`/api/*`) and the frontend (all other paths, with SPA fallback to `index.html`) are served from the single process, so there is one URL and one command.
5. The startup log prints a readiness block: preview URL, schema version, entry count, canonical scenario present, AI mode, and the reset command.
6. The AI provider probe is a non-blocking capability check: if `CARGODEMO_AI_PROVIDER=none`, the mode is recorded as `FALLBACK_PROVIDER_DISABLED` without any network call. Otherwise a lightweight reachability check with a 3-second budget sets the mode to `LLM` or `FALLBACK_PROVIDER_ERROR`. **A failed probe never prevents startup.**
7. `GET /api/health` returns the readiness detail (§Outputs). It is an open route so a presenter can check it before selecting a role.
8. Reset is available as `npm run reset` (CLI) and as `POST /api/admin/reset` (administrator-only, exposed as a one-click control on the administrator surface with a confirmation step). Both invoke F2 with `FORCE_RESEED` inside one transaction.
9. After reset, the response and the CLI output report the `SeedReport` coverage block, so the presenter can confirm in one glance that the canonical scenario is present and the queue is populated.
10. The shell polls health every 60 seconds and renders the degradation banner whenever `ai.mode` is any `FALLBACK_*` value, or a warning banner whenever any subsystem reports `status: "degraded"` or `"failed"`.

**Inputs:**
- Environment: `CARGODEMO_HOST` (default `0.0.0.0`), `CARGODEMO_PORT` (default `3000`), `CARGODEMO_DB_PATH`, `CARGODEMO_DOC_STORAGE_DIR`, `CARGODEMO_SEED_ON_EMPTY`, `CARGODEMO_SEED_CLOCK`, `CARGODEMO_AI_PROVIDER`, `CARGODEMO_AI_MODEL`, `CARGODEMO_AI_API_KEY`, `CARGODEMO_AI_TIMEOUT_MS`
- `POST /api/admin/reset` body: `{ confirm: true }` (required; a reset without explicit confirmation is rejected)
- `GET /api/health` query: `verbose` (boolean, default `false`)

**Outputs:**
- A running application on a stable, embeddable URL
- Startup readiness log block
- `GET /api/health` response:
  ```
  {
    "status": "ok" | "degraded" | "failed",
    "version": "1.0.0",
    "uptime_s": 412,
    "subsystems": {
      "database":  { "status": "ok", "schema_version": 7, "foreign_keys": true, "append_only_triggers": true, "path_writable": true },
      "seed":      { "status": "ok", "seeded": true, "entry_count": 12, "canonical_scenario_present": true,
                     "exception_types_covered": 3, "statuses_covered": 7, "precleared_case": "SHP-2026-0009" },
      "rules":     { "status": "ok", "total": 7, "enabled": 5, "invalid": 0 },
      "documents": { "status": "ok", "storage_dir_writable": true, "fixtures_present": 9, "upload_ready_fixtures": 2 },
      "ai":        { "status": "ok", "provider": "none", "model": null,
                     "mode": "FALLBACK_PROVIDER_DISABLED", "fallback_available": true, "last_probe_at": "…" },
      "workflow":  { "status": "ok", "transitions_registered": 33, "clearance_paths": 1 },
      "rbac":      { "status": "ok", "routes_registered": 60, "routes_without_permission": 0 }
    },
    "demo": { "port": 3000, "host": "0.0.0.0", "preview_url": "http://0.0.0.0:3000", "reset_endpoint": "/api/admin/reset" }
  }
  ```
- `POST /api/admin/reset` response: the `SeedReport` (F2) plus `reset_at` and `duration_ms`

**Validation:**
- Startup MUST bind to `0.0.0.0` by default; a `localhost`-only binding logs a prominent warning naming the embedded-preview consequence.
- The port MUST be deterministic; automatic port fallback MUST NOT be implemented.
- Startup MUST fail loudly rather than serve a degraded schema: migration failure, schema self-check failure, and route-permission self-check failure all abort with a non-zero exit code (F0, F14).
- Startup MUST NOT require network access. An AI probe failure is a recorded mode, never a startup failure.
- The whole start path MUST work in a fresh sandbox with no pre-existing database, no external services, and no manual data entry.
- Reset MUST require `confirm: true` and the administrator role, and MUST produce a state satisfying every F2 coverage assertion; a failed assertion leaves the transaction rolled back and reports `SEED_COVERAGE_FAILED`.
- Reset MUST be safe to run between demo runs with no manual database intervention, and three consecutive reset-plus-walkthrough cycles MUST produce identical results (PRD §7, test `E2E-02`).
- `health.subsystems.workflow.clearance_paths` MUST equal `1`. Surfacing the governance invariant on the health endpoint means a presenter can demonstrate it without opening code.
- `health.subsystems.rbac.routes_without_permission` MUST equal `0`.
- The degradation banner MUST appear whenever AI assistance is in fallback and MUST NOT be dismissible while that condition holds.
- The health endpoint MUST NOT expose the AI API key, absolute filesystem paths outside the project, or any database credentials.
- The full walkthrough MUST complete with `CARGODEMO_AI_PROVIDER=none` — this is the supported demo default, not a fallback of last resort (PRD §7 "AI availability resilience").

**State transitions caused:** Reset destroys and recreates all cases, then drives the seeded cases through real F9/F11 transitions (F2 §Process step 7). No case transitions in place; the prior cases cease to exist.

**Error States:**

| Scenario | HTTP Status / exit | Error Code | Message |
|---|---|---|---|
| Port already in use | exit 1 | `PORT_IN_USE` | "Port {port} is in use; set CARGODEMO_PORT" |
| Database path unwritable | exit 1 | `DB_UNAVAILABLE` | "Cannot open database at {path}" |
| Migration or schema self-check failure | exit 1 | `SCHEMA_INTEGRITY_FAILED` | "Schema integrity check failed: {detail}" |
| Route registered without permissions | exit 1 | `ROUTE_PERMISSION_MISSING` | "Route {method} {path} has no allowed_roles declaration" |
| Document storage directory unwritable | exit 1 | `STORAGE_UNAVAILABLE` | "Document storage directory is not writable: {path}" |
| AI probe failed | 200 (health `degraded`) | — | `ai.mode = FALLBACK_PROVIDER_ERROR`; banner shown; startup proceeds |
| Reset without `confirm: true` | 422 | `CONFIRMATION_REQUIRED` | "Set confirm to true to reset demo data" |
| Reset by a non-administrator | 403 | `FORBIDDEN_ROLE` | "Only a System Administrator may reset demo data" |
| Reset coverage assertion failed | 500 | `SEED_COVERAGE_FAILED` | "Reset rolled back: {assertion}" |
| Health check subsystem failure | 200 with `status: "failed"` | — | Subsystem detail names the failure; the shell shows a warning banner |

**Pre-demo checklist (operational, derived from the health response):**
1. `GET /api/health` returns `status: "ok"` (or `"degraded"` with only the AI subsystem in fallback, which is an accepted demo configuration).
2. `seed.canonical_scenario_present` is `true` and `entry_count` is 12.
3. `workflow.clearance_paths` is `1` and `rbac.routes_without_permission` is `0`.
4. `documents.upload_ready_fixtures` is ≥ 1 so walkthrough step 6 has a file to attach.
5. The queue shows `SHP-2026-0007` with three exception chips at `CRITICAL` priority and status `New`.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/health` | open | Subsystem readiness including AI fallback status |
| POST | `/api/admin/reset` | ADM | Reset to pristine seeded state |
| GET | `/api/admin/seed-report` | ADM | Last seed report with coverage |

Full schemas: `Y1c-api-admin.md` §Demo operations.

**Schema Surface (this feature):** reads all tables for the health summary; reset truncates and reseeds all tables via F2.
