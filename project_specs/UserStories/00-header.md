# User Stories
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related PRD** | PRD-CargoDemo.md |
| **Related FRD** | FRD-CargoDemo.md (chunks in `project_specs/FRD/`) |
| **Related Personas** | PERSONAS-CargoDemo.md |
| **Source of Truth** | `.planning/PROJECT.md` |

---

## Story Format

Each story follows: **As a [persona], I want to [action], so that [outcome].**

Acceptance criteria are listed beneath each story as testable checkboxes. Stories are grouped by epic, each epic is anchored to a PRD feature, and every story carries an explicit **Feature Ref** back to PRD §5.

## Personas Used

| Persona ID | Named persona | System role |
|---|---|---|
| PER-01 | **Marisol Reyes** | Cargo Specialist |
| PER-02 | **Dwayne Okafor** | Supervisor |
| PER-03 | **Priya Raghavan** | System Administrator |
| PER-04 | **Angela Pruitt** | CBP Evaluating Stakeholder *(observer — no system account)* |

Persona names are used verbatim from PERSONAS-CargoDemo.md, and the FRD's seed data uses the same identities: `usr-cs-001` is Marisol Reyes, `usr-sup-001` is Dwayne Okafor, `usr-adm-001` is Priya Raghavan (FRD F2 §Seeded users). Two additional seeded users — `usr-cs-002` Marcus Hale and `usr-sup-002` Ronald Pike — exist only to make hand-off and supervisor-authored-recommendation paths demonstrable and have no persona of their own.

## Index of Epics

| Epic | Name | Anchor feature | Features covered |
|---|---|---|---|
| Epic 0 | Platform & Data Foundation | F0 | F0, F1, F2, F3 |
| Epic 1 | Rules, Exception Detection & Revalidation | F4 | F4, F5, F6 |
| Epic 2 | AI Assistance — Explain and Recommend | F7 | F7, F8 |
| Epic 3 | Exception Case Workflow & The Five Actions | F9 | F9 |
| Epic 4 | Document Request & Simulated Upload | F10 | F10, F6 |
| Epic 5 | Specialist → Supervisor Approval Chain | F11 | F11 |
| Epic 6 | Decision & Audit Record | F12 | F12 |
| Epic 7 | Notification Generation | F13 | F13 |
| Epic 8 | Access Control & Rule Administration | F14 | F14, F15 |
| Epic 9 | The Four Primary Screens & Application Shell | F17 | F16, F17, F18, F19, F20 |
| Epic 10 | Quality, Tests & Demo Readiness | F21 | F21, F22 |
| Epic 11 | The 10-Step Demo Walkthrough (End-to-End Trace) | F17 | F2, F5–F14, F17–F22 |
| Epic 12 | Governance Guardrails (Negative & Constraint Stories) | F11 | F9, F11, F12, F14 |

**Coverage:** all 23 PRD features (F0–F22) have at least one story. Epic 11 traces the PRD §3.2 walkthrough step by step. Epic 12 states the things the system must *refuse* to do.

---
