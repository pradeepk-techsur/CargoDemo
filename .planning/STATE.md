# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-08)

**Core value:** A cargo specialist can open a flagged shipment, immediately understand *why* it was flagged and what evidence triggered it, and resolve it through a human-authored decision that is permanently traceable.
**Current focus:** Phase 1 — Seeded, Governed, Servable Foundation

## Current Position

Phase: 1 of 6 (Seeded, Governed, Servable Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-08 — Roadmap created; all 23 requirements (F0–F22) mapped to 6 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (express)
- Average duration: ~12 min
- Total execution time: 0.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| express-wave-1 | 1 | 9 min | 9 min |
| express-wave-2 | 1 | 14 min | 14 min |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table; technical decisions AD-01–AD-15 in `project_specs/TechArch/00-overview.md` §0.8.
Recent decisions affecting current work:

- [Roadmap]: Phases sequenced by the 10-step walkthrough, not by technical layer — steps 1–3 live after Phase 2, all ten after Phase 5.
- [Roadmap]: The four screens are paired with the backend they expose (F17/F18 → Phase 2, F19 → Phase 3, F20 → Phase 4); no final UI phase.
- [Roadmap]: Governance claims spread across Phases 1, 2, 3 and 5; the last phase (F15 rule administration) is deliberately non-load-bearing.
- [Roadmap]: F21 mapped wholly to Phase 5 because its E2E family cannot complete until step 10 exists; earlier phases still carry plan-level tests.
- [AD-08/AD-09]: Recommended action and confidence are always deterministic; `CARGODEMO_AI_PROVIDER=none` is the default and every phase's criteria hold with it.
- [AD-05/AD-06]: Deterministic port 3000 bound to 0.0.0.0, no frame-blocking headers — owned by Phase 1.
- [Wave 2]: `min_shipment_value_usd` param kept as spelled; compared as `shipment_value_cents/100 >= min_shipment_value_usd` (no column rename, no new column).
- [Wave 2]: Rules ordered by explicit SEVERITY_RANK DESC (LOW0/MED1/HIGH2/CRIT3), never string sort; same rank drives max(severity) in priority derivation.
- [Wave 2]: `evaluations.duration_ms` pinned to 0 under deterministic (seed/test) mode for byte-identical reseeds; live evaluations record the real value.

### Pending Todos

None yet.

### Blockers/Concerns

- [Spec context] Three spec masters are too large to read whole (FRD 4749 lines, TechArch 3407, UX-Mockup 2581, UserStories 1632). Use the chunked directories: `project_specs/FRD/`, `project_specs/TechArch/`, `project_specs/UX-Mockup/`, `project_specs/UserStories/`.
- [RTM G1] The four screens and shell have no dedicated component test family — coverage is E2E-only unless per-screen tests are added during phase planning.

## Session Continuity

Last session: 2026-09-08
Stopped at: Completed express-wave-2 plan 02 (config-driven rule engine + F5 detection + seed hook). Commits 5061098, f065132, 0e7c657. See .planning/express/cargodemo-cbp-cargo-exception-review-app/02-SUMMARY.md
Resume file: None

### Express task progress

- express/cargodemo-cbp-cargo-exception-review-app plan 01 (wave 1, database): COMPLETE — 21-table schema, F0 migrations/self-check, F2 12-shipment idempotent seed, typed repository contract published at src/infra/db. 24 integration tests green.
- express/cargodemo-cbp-cargo-exception-review-app plan 02 (wave 2, rules+detection): COMPLETE — F4 pure config-driven rule engine (three evaluators, closed map, Ajv, fingerprint), F5 one-transaction detection with write-time evidence gates + derived priority + queue projection, seed hook populates 12 evaluations / 15 exceptions / 33 evidence on migrate+seed. 78 tests green (9 files). detectExceptions/createEvaluateHook/derivePriority + ExceptionRecord projection published for wave 3.
