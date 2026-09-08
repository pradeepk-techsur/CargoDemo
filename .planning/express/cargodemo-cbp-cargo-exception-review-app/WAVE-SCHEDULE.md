---
schema_version: 1
slug: cargodemo-cbp-cargo-exception-review-app
generated_by: pivota_spec-wave-architect
date: 2026-09-08
scope_decision: .planning/express/cargodemo-cbp-cargo-exception-review-app/SCOPE-DECISION.md
scope: reduced
in_scope_features: [F0, F2, F3, F4, F5, F9, F17, F18]
deferred_features: [F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22] # deferred — out of scope, not in this plan; listed here for traceability only
waves: 5
---

# Wave Schedule — CargoDemo (CBP cargo exception review app)

```yaml
wave: 1
domain: database
depends_on: []
features: [F0, F2]
objective: "Stand up the SQLite schema and migrations for the in-scope entities (cargo_entries, documents, rules, evaluations, exceptions, evidence, cases, case_actions) per FRD Y0a/Y0b DDL, and ship the deterministic, idempotent seed of 10-15 synthetic shipments including the canonical SHP-2026-0007 solar-panel scenario plus one default login user."
estimated_plans: 2
---
wave: 2
domain: backend
depends_on: [1]
features: [F4, F5]
objective: "Implement the configuration-driven rule engine (missing required document, invalid/incomplete HTS, conflicting country-of-origin) reading rule rows as data, and the detection layer that creates one exception per firing rule with field-level evidence, missing_information, derived priority and initial queue status."
estimated_plans: 2
---
wave: 3
domain: backend
depends_on: [1, 2]
features: [F9, F3]
objective: "Implement the case state machine with the five user actions, validated transitions and mandatory justification, then expose the HTTP contract the two screens consume: queue read with filter/sort, full shipment detail (entry fields, documents, exceptions with evidence), available-actions, and the action write endpoint with a consistent error envelope."
estimated_plans: 2
---
wave: 4
domain: frontend
depends_on: [3]
features: [F17, F18]
objective: "Ship the two in-scope screens as a routed React/Vite SPA: Cargo Exception Queue (shipment ID, importer, exception, priority, status; filter/sort; multi-exception shipments shown as multi-exception) at the app root route, and Shipment Review (entry fields, documents panel with provenance, validation results with rule and evidence, action panel with mandatory justification) at /shipments/:id."
frontend_shell_note: "F16 (application shell, navigation, role switcher) is DEFERRED and must not be planned as work. Routability is satisfied inside the F17/F18 plans with the minimum the two screens require: the router itself, F17 as the landing route so the queue is reachable without typing a URL, and clickable queue rows as the inbound nav element to F18 (with a back link to the queue). No persistent nav bar, no role switcher, no links to deferred screens, no notification indicator. This resolves the F16/F17/F18 tension without restoring F16."
estimated_plans: 2
---
wave: 5
domain: integration
depends_on: [1, 2, 3, 4]
features: [F0, F2, F3, F4, F5, F9, F17, F18]
objective: "Wire the stack end-to-end and prove the primary journey slice of JRN-01.1: docker compose (or single-command) start on 0.0.0.0:3000 running migrate -> seed -> serve, then a Playwright run that loads the queue, opens the canonical solar-panel shipment, reads its three exceptions with evidence, and submits an action with justification, asserting the resulting state change is visible on both screens."
estimated_plans: 1
```

## WAVE SCHEDULE

| Wave | Domain | Plans | Features | Objective |
|------|--------|-------|----------|-----------|
| 1 | database | 2 | F0, F2 | Schema + migrations for the in-scope entities; deterministic idempotent seed with the canonical SHP-2026-0007 scenario and a login user |
| 2 | backend | 2 | F4, F5 | Configuration-driven rule engine for the three exception types; exception + field-level evidence creation, priority and initial queue status |
| 3 | backend | 2 | F9, F3 | Case state machine with the five actions, validated transitions and mandatory justification; HTTP API for queue read, shipment detail, available actions and the action write |
| 4 | frontend | 2 | F17, F18 | Routed SPA shipping the Cargo Exception Queue (landing route) and the Shipment Review screen, reachable by clicking a queue row |
| 5 | integration | 1 | F0, F2, F3, F4, F5, F9, F17, F18 | Single-command/compose boot on 0.0.0.0:3000 with migrate → seed → serve, plus Playwright proof of flag → review → act end-to-end |

**In scope:** 8 | **Covered:** 8 | **Deferred by scope decision:** 15 (F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22)

Deferred features are a recorded decision (`SCOPE-DECISION.md`), not a coverage gap.

## Scope-coverage reconciliation

- **User-facing interface — REQUIRED and covered.** PER-01 (Cargo Specialist) works a queue, opens a flagged shipment and takes an action; the MVP set keeps F17 and F18 as first-class screen features. Wave 4 is a frontend-domain wave, so this is not an all-backend schedule.
- **Programmatic API — covered** by F3 (wave 3).
- **Data — covered** by F0 (schema/migrations) and F2 (seed content), wave 1.
- **Background/async — not required.** All processing is request-time (PRD §5.9 exclusion).
- **Integrations — not required.** ACE, email/SMS and IdP are PRD §5.8 exclusions; the AI provider rides with the deferred F7/F8.
- **Content/assets — covered** by F2's synthetic shipments and document fixtures.
- **F16 tension resolved without restoring it** — F16 remains deferred, out of scope, and not in this plan. See `frontend_shell_note` in wave 4. The two in-scope screens are routable and mutually reachable using only what F17/F18 themselves require; no shell, nav bar or role switcher is planned as work.
