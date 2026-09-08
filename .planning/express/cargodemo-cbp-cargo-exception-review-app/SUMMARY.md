---
slug: cargodemo-cbp-cargo-exception-review-app
description: CargoDemo — CBP cargo exception review app
scope: reduced
deferred_features: [F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22]
date: 2026-09-08
total_plans: 5
total_waves: 5
---

# Express Task: CargoDemo (CBP cargo exception review app) — Summary

## Execution Overview

**Scope:** Reduced — 8 of 23 features built, 15 deferred (see SCOPE-DECISION.md). This slice
demonstrates *governed exception detection and a justified human action* (the flag → review → act
half of JRN-01.1 on the canonical shipment SHP-2026-0007). It does not include the AI assistance,
approval chain, document upload/revalidation, or audit trail — those are the first items on the
graduation path in SCOPE-DECISION.md.
**Plans:** 5 across 5 waves
**Date:** 2026-09-08

### Wave Breakdown

| Wave | Domain      | Plans | Features        | Status     |
|------|-------------|-------|-----------------|------------|
| 1    | database    | 01    | F0, F2          | ✓ Complete |
| 2    | backend     | 02    | F4, F5          | ✓ Complete |
| 3    | backend     | 03    | F9, F3          | ✓ Complete |
| 4    | frontend    | 04    | F17, F18        | ✓ Complete |
| 5    | integration | 05    | all in-scope    | ✓ Complete |

### Per-Plan Details

**01 (Wave 1 — persistence foundation):** Complete SQLite schema (21 tables, 3 append-only triggers,
all CHECKs/indexes) as verbatim FRD Y0a/Y0b DDL, with a forward-only checksum-verified migration
runner and a blocking schema self-check; deterministic idempotent seed of 5 users, 7 rules (3
disabled), 12 shipments (canonical SHP-2026-0007 reproduced field-for-field), all 7 statuses.
- Tasks: 3/3
- Commits: `05f60b9`, `e9bd2f7`, `89a00cf`, `cc8444d`
- Files created: `src/infra/db/migrations/001_initial_schema.sql`, `src/infra/db/index.ts`, five repositories, `src/app/seedService.ts`, `fixtures/*.seed.json`, `src/shared/types/db.ts`

**02 (Wave 2 — rule engine + detection):** Pure configuration-driven rule engine — three evaluators
(missing required document, invalid/incomplete HTS, conflicting country-of-origin) reading every
threshold/list/field-path from `rules.params_json`; detection layer persisting `evaluations`,
`exceptions`, `evidence` with derived priority, queue membership and structured missing information;
wired into the seed evaluate hook so seeded shipments arrive flagged (12 evaluations, 15 exceptions,
33 evidence rows; SHP-2026-0007 = exactly 3 OPEN exceptions).
- Tasks: 3/3
- Commits: `5061098`, `f065132`, `0e7c657`, `177c8ae`
- Files created: `src/domain/rules/engine.ts` (+ evaluators), `src/domain/priority.ts`, `src/app/evaluationService.ts`, `src/shared/types/detection.ts`

**03 (Wave 3 — state machine + HTTP API):** Pure case workflow state machine (35 status×action
transitions as data, four guards, mandatory justification) and a six-route Fastify HTTP API on
`0.0.0.0:3000` — queue read (filter/sort), full shipment detail, exceptions-with-evidence, documents
panel, available-actions projection, transactional action write — all behind one uniform error
envelope with iframe-safe headers.
- Tasks: 3/3
- Commits: `ca3a8db`, `7ad1115`, `aa66060`, `e4e11d4`
- Files created: `src/domain/workflow/stateMachine.ts`, `src/server/index.ts`, `src/server/routes/*`, `src/shared/api/types.ts`, `src/shared/api/errors.ts`

**04 (Wave 4 — React/Vite SPA):** Two routed screens served same-origin by the wave-3 API — the
Cargo Exception Queue at `/` (server-side filter/sort, one chip per distinct exception type,
keyboard+pointer navigation, distinct empty/error states) and the Shipment Review screen at
`/shipments/:shipmentId` (entry data with the conflicting country emphasised, documents with missing
ones shown as explicit absences, one card per open exception with rule/authority/assertion/evidence,
and a five-action panel whose submit stays inert until a valid justification is typed). No shell,
nav bar or role switcher (F16 remains deferred per the scope decision).
- Tasks: 3/3
- Commits: `5de9636`, `a5088b0`, `61d4018`, `6593842`
- Files created: `src/client/App.tsx`, `src/client/screens/queue/*`, `src/client/screens/review/*`, `src/client/api/*`, Playwright specs

**05 (Wave 5 — integration + E2E proof):** `npm start` as the single command taking a fresh checkout
(no `./data`, no `dist/client`) through build → migrate → seed → queue-non-empty assertion → serve
on `0.0.0.0:3000` with the preview URL in its readiness block; a preview-render verifier; and a
Playwright journey proving load queue → open SHP-2026-0007 → read 3 exceptions with field-level
evidence → submit PLACE_ON_HOLD with justification → *On hold* visible on both screens.
- Tasks: 3/3 (+1 contract-fix commit)
- Commits: `65b5655`, `67651b4`, `20db021`, `5e74618`, `16ff62c`
- Files created: `scripts/verifyPreview.mjs`, end-to-end journey spec, `npm start` boot orchestration

### Aggregated Stats

- **Total tasks:** 15 (3 per plan × 5)
- **Total commits:** 21 (per-plan atomic + SUMMARY/STATE docs commits) + 5 wave checkpoint commits
- **Key files created:** SQLite schema + migration runner + repositories, seed service + fixtures,
  pure rule engine + three evaluators + priority derivation, detection service, case workflow state
  machine, six-route Fastify API with uniform error envelope, React/Vite SPA (Queue + Shipment
  Review), single-command boot orchestration, Playwright journey + preview verifier
- **Verification:** typecheck 0 errors; 134/134 vitest; 27/27 Playwright E2E + 6 journey; fresh
  `npm start` boots a populated app on 0.0.0.0:3000; seed idempotent and byte-identical on reseed

### Contract Gates

- Wave 1 → 2: consumer requires ✓, provides existence ✓
- Wave 2 → 3: consumer requires ✓, provides existence ✓
- Wave 3 → 4: consumer requires ✓ (2 verify commands had shell-escaping / wrong-file grep quirks;
  artifacts — `src/shared/api/index.ts` re-exports, `/api/shipments/:shipment_id/exceptions` route —
  confirmed present directly)
- Wave 4 → 5: consumer requires ✓ (same wrong-file grep quirk on the exceptions route; confirmed
  present)
- Wave 5: final wave, no downstream gate

### Deviations

All deviations were auto-fixed within the deviation rules and documented in per-plan summaries; none
changed scope, schema or the declared contracts:
- Wave 1: vitest reporter flag incompatibility (tooling); `.gitignore` append vs overwrite. Two
  FRD/TechArch inconsistencies documented with resolutions (`shipment_value_cents` column vs
  `shipment_value_usd` projection; `recommendations.concurrence` enum count — FRD DDL authoritative).
- Wave 2: `duration_ms` pinned to 0 in seed/test mode for byte-identical reseeds; `seed:reset` FK
  ordering fix; vitest reporter flag.
- Wave 3: query-param safety bug fix; cleared-case visibility fix; doc-comment literal gates.
- Wave 4: wave-3 SPA-fallback test now accepts built bundle HTML; doc-comment/regex hygiene.
- Wave 5: two test-authoring bugs (CSS `text-transform`, `data-*` attribute location); one blocking
  contract-literal fix (named the preview URL in the readiness-block comment).

**Known Stubs:** None.
