# Requirements Traceability Matrix (RTM)
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Author** | Pivota Spec Framework (RTM Generator) |
| **Upstream** | `.planning/PROJECT.md`, `PRD-CargoDemo.md` |
| **Traced Documents** | PERSONAS, JTBD, JOURNEYS, PRD, FRD, TechArch, UserStories, STORY-MAP |
| **Feature Coverage** | F0–F22 (23 of 23) |
| **Story Coverage** | US-0.1 – US-12.7 (80 of 80) |

---

## 1. Overview

This Requirements Traceability Matrix provides bidirectional traceability across the CargoDemo specification set. Forward traceability runs PRD feature → FRD requirement section → TechArch specification → user story → test case. Reverse traceability runs test case → user story → PRD feature, so every artifact on disk can be shown to originate in a recorded requirement and every requirement can be shown to terminate in an implementable, testable specification.

Every identifier in this document is extracted from a source document that exists in `project_specs/`. FRD requirements are cited as `{chunk} §{section}` because the FRD is authored as feature-scoped chunks with numbered sections rather than flat `REQ-` identifiers; TechArch specifications are cited by their numbered section and by architectural decision (`AD-nn`); test cases are cited by the identifiers enumerated in FRD `F21` §§1–8 and TechArch §4.10. No placeholder identifiers appear.

This RTM is a planning input. It is deliberately tabular and compact so it can be attached to a planner prompt alongside the PRD without displacing it.

### 1.1 Traceability Levels

| Level | Artifact | ID form | Authoritative source |
|---|---|---|---|
| L0 | Mission requirement | prose bullet | `.planning/PROJECT.md` §Requirements |
| L1 | Persona / Job / Journey | `PER-0n`, `JTBD-0n.n`, `JRN-0n.n` | PERSONAS, JTBD, JOURNEYS |
| L2 | Product feature | `F0`–`F22` | `PRD-CargoDemo.md` §5, §9 |
| L3 | Functional requirement | `F{n} §{sec}`, `Y0a`–`Y3 §{sec}` | `project_specs/FRD/` |
| L4 | Technical specification | `§{n.n}`, `AD-01`–`AD-15` | `project_specs/TechArch/` |
| L5 | User story | `US-{epic}.{n}` | `project_specs/UserStories/` |
| L6 | Test case | `RE/WF/AC/AU/RV/AI/IN/SD/DE/UP/HDR/E2E-nn` | FRD `F21`, TechArch §4.10 |
| L7 | Release | `R1`, `R2` | `project_specs/STORY-MAP/` |

### 1.2 ID Conventions in Force

| Prefix | Level | Range in use | Example |
|---|---|---|---|
| `F` | PRD feature | F0–F22 (23) | `F11` |
| `Y0a`/`Y0b` | FRD consolidated schema | §1–§11 / §1–§10 | `Y0b §6` |
| `Y1a`/`Y1b`/`Y1c` | FRD API contract | §1–§7 / §1–§7 / §1–§6 | `Y1b §2` |
| `Y2`/`Y3` | FRD errors / integrations | §1–§9 / §1–§9 | `Y2 §6` |
| `T` | FRD workflow transition | T01–T33 | `T31` |
| `G-` | FRD workflow guard | G-DOC, G-DUP, G-REC, G-ACK, G-CANCEL, G-AUTH, G-SOD, G-WITHDRAW, G-AUDIT | `G-SOD` |
| `I` | FRD workflow invariant | I1–I10 | `I1` |
| `AD-` | TechArch decision | AD-01–AD-15 | `AD-11` |
| `P` | TechArch principle | P1–P5 | `P5` |
| `US-` | User story | US-0.1 – US-12.7 (80) | `US-11.9` |
| `RE/WF/AC/AU/RV/AI/IN/SD/DE/UP/HDR/E2E` | Test case | 108 identifiers | `AU-02` |

---

## 2. Requirements Summary

- **23 PRD features** (F0–F22), all in scope for the first demo: 20 × P0, 3 × P1 (F13, F15, F22), 0 × P2/P3.
- **7 feature categories**: Platform & Data Foundation (F0–F3), Rules & Validation (F4–F6), AI Assistance (F7–F8), Workflow/Approvals/Governance (F9–F13), Access Control & Administration (F14–F15), User Interface (F16–F20), Quality & Demo Readiness (F21–F22).
- **33 FRD chunks** — 25 feature chunks (F9 split into `F09a`/`F09b`), 7 cross-feature chunks (`Y0a`, `Y0b`, `Y1a`, `Y1b`, `Y1c`, `Y2`, `Y3`), 1 header.
- **12 TechArch chunks** carrying 11 numbered section families plus the 15-entry decision record (AD-01–AD-15) and 5 architectural principles (P1–P5).
- **80 user stories** across 13 epics (Epic 0 – Epic 12): 74 × P0, 6 × P1. Release split: R1 = 74 stories, R2 = 6 stories.
- **Workflow surface**: 7 case statuses, 5 user actions, 2 approval operations, 33 transition rows (T01–T33), 9 guards, 10 invariants.
- **Governance surface**: exactly 1 transition to `CLEARED` (T31), 8 mandatory audit fields, 3 roles, 60 RBAC-declared routes.
- **108 test identifiers**: RE-01–RE-20 (20), WF-01–WF-14 (14), AC-01–AC-10 (10), AU-01–AU-11 (11), RV-01–RV-09 (9), AI-01–AI-10 (10), IN-01–IN-04 (4), SD-01–SD-05 (5), DE-01–DE-02 (2), UP-01–UP-06 (6), HDR-01–HDR-02 (2), E2E-01–E2E-03 (3), plus the 10 asserted steps inside E2E-01.
- **Non-functional requirements**: 14 PRD §6 categories, each bound to at least one story in UserStories `Y1-priorities.md` §Non-Functional Acceptance Thresholds.
- **10 recorded exclusions** in PRD §5.8 — decisions, not gaps (see §9.3).

---

## 3. Master Traceability Matrix — PRD → FRD → TechArch → UserStories

Forward trace, one row per PRD feature. All 23 features present.

| PRD Feature | Pri | FRD Requirement | TechArch Spec | User Stories |
|---|---|---|---|---|
| **F0** Cargo Entry Data Model & Persistence | P0 | `F00` §Process, §Validation, §Schema Surface; `Y0a` §1–§11; `Y0b` §1–§10 | §2.1–§2.13, §2b.1–§2b.11, AD-03, AD-12, P5 | US-0.1, US-11.2 |
| **F1** Cargo Entry Ingestion (JSON / local API) | P0 | `F01` §Process, §Validation, §Error States; `Y1c` §4; `Y2` §2; `Y3` §2 | §3c.4, §6.4, §1.3.2, AD-01 | US-0.2, US-0.3, US-12.7 |
| **F2** Synthetic Seed Dataset | P0 | `F02` §Process, §Validation; `Y1c` §5; `Y0a`/`Y0b` (all tables) | §3c.5, §8.1, §8.3, §2b.11, P2 | US-0.4, US-10.4, US-11.1, US-11.11, US-12.7 |
| **F3** Backend HTTP API | P0 | `F03` §API Surface; `Y1a` §1–§7; `Y1b` §1–§7; `Y1c` §1–§6; `Y2` §1, §9 | §1.3.1, §1.4, §1.5, §3.1, §3.2, §3c.6, §3c.7, AD-01, AD-02 | US-0.5, US-11.2 |
| **F4** Configurable Business Rule Engine | P0 | `F04` §2–§7; `Y2` §3 | §6.2, §2.7, §1.3.3, AD-07, P3 | US-1.1, US-1.2, US-1.3, US-1.4, US-10.1, US-11.4, US-11.7, US-12.7 |
| **F5** Exception Detection, Evidence Capture & Flagging | P0 | `F05` §Process step 6, §Validation; `Y0a` §6–§8 | §2.8, §2.9, §2.10, §6.2, §2b.2 | US-1.1, US-1.2, US-1.3, US-1.5, US-9.4, US-11.1, US-11.4 |
| **F6** Shipment Revalidation | P0 | `F06` §Process step 7, §State transitions; `Y1b` §3 | §3b.4, §2.8, §2.9, §6.2, AD-12 | US-1.6, US-1.7, US-4.4, US-8.6, US-9.6, US-10.1, US-11.7, US-12.3 |
| **F7** AI Plain-Language Shipment Summary | P0 | `F07` §Process, §Validation; `Y1c` §2; `Y2` §7; `Y3` §3 | §3c.2, §6.3, §2b.8, AD-09, P4 | US-2.1, US-2.2, US-2.3, US-11.3, US-12.7 |
| **F8** AI Recommended Resolution with Confidence | P0 | `F08` §Action derivation, §Confidence derivation; `Y1c` §2; `Y2` §7 | §3c.2, §6.3, §2b.8, AD-08 | US-2.2, US-2.3, US-2.4, US-2.5, US-11.4, US-11.8, US-12.1 |
| **F9** Exception Case Workflow & User Actions | P0 | `F09a` §1–§5 (T01–T33, G-*, I1–I10); `F09b` §1–§7; `Y1b` §1, §5; `Y2` §4 | §3b.2, §3b.7, §3b.8, §1.3.3, §1.5, §2b.3 | US-3.1–US-3.7, US-5.1, US-10.2, US-11.5, US-11.8, US-12.1, US-12.3, US-12.5, US-12.6 |
| **F10** Document Request & Simulated Upload | P0 | `F10` §Process, §Validation; `Y1b` §4; `Y0a` §3, §4; `Y2` §5 | §3b.5, §3b.6, §2.5, §2.6, §4.6, AD-14 | US-3.2, US-4.1–US-4.5, US-11.5, US-11.6 |
| **F11** Specialist → Supervisor Approval Chain | P0 | `F11` §1–§3; `F09a` §2 (T31, T32), §3 (G-SOD, G-AUDIT); `Y1b` §2; `Y0b` §4, §5; `Y2` §6 | §3b.3, §2b.4, §2b.5, §4.5, AD-11, P1 | US-5.1–US-5.5, US-9.8, US-10.2, US-11.8, US-11.9, US-12.2, US-12.3, US-12.5 |
| **F12** Decision & Audit Record | P0 | `F12` §1–§5; `Y0b` §6; `Y1a` §5; `Y2` §6 | §2b.6, §2b.10, §3.7, AD-10, AD-13, P5 | US-1.7, US-2.5, US-3.6, US-6.1–US-6.6, US-7.1, US-8.6, US-10.2, US-11.10, US-12.1, US-12.2, US-12.4, US-12.5 |
| **F13** Notification Generation | P1 | `F13` §Process, §Template catalog; `Y0b` §7; `Y1a` §6; `Y3` §6 | §2b.7, §3.8, §6.5 | US-1.7, US-5.3, US-5.4, US-7.1, US-7.2, US-11.5, US-11.9, US-12.7 |
| **F14** Role Simulation & RBAC | P0 | `F14` §1, §2 (RBAC matrix); `Y1c` §1; `Y0b` §1; `Y2` §1; `Y3` §7 | §4.2, §4.3, §4.4, §4.9, §2b.1, §3c.1, P1 | US-0.3, US-0.5, US-4.2, US-8.1–US-8.4, US-10.2, US-11.9, US-12.2, US-12.6, US-12.7 |
| **F15** Rule Administration | P1 | `F15` §Process, §Validation; `Y1c` §3; `Y2` §3 | §3c.3, §6.2, §2.7, AD-07, P3 | US-8.5, US-8.6, US-12.6 |
| **F16** Application Shell, Navigation & Role Switcher | P0 | `F16` §Process, §Validation; `Y1c` §1; `Y3` §8 | §1.6.1, §1.6.2, §4.7, AD-04, AD-06 | US-7.2, US-9.1, US-12.7 |
| **F17** Cargo Exception Queue Screen | P0 | `F17` §Process, §Inputs, §Validation; `Y1a` §1 | §1.6.3, §3.3, §5.3 | US-5.2, US-9.2, US-9.3, US-9.4, US-11.1, US-11.11 |
| **F18** Shipment Review Screen | P0 | `F18` §Process, §Validation; `Y1a` §2, §3, §4 | §1.6.3, §3.4, §3.5, §3.6 | US-2.1, US-2.2, US-4.5, US-9.5, US-9.6, US-11.2, US-11.3 |
| **F19** Recommended Resolution Screen | P0 | `F19` §Process, §Validation; `F09a` §5 (reason strings); `Y1b` §1, §2; `Y1c` §2 | §1.6.3, §3.9, §3c.2, §3b.2 | US-2.2, US-2.4, US-3.7, US-9.7, US-9.8, US-11.4 |
| **F20** Decision & Audit Record Screen | P0 | `F20` §Process, §Validation; `Y1a` §5, §6 | §1.6.3, §3.7, §3.8 | US-2.2, US-6.4, US-6.5, US-7.2, US-9.9, US-11.10 |
| **F21** Automated Test Suite | P0 | `F21` §1–§8, §Validation | §7.1–§7.5, §4.10, AD-15 | US-6.2, US-6.6, US-8.4, US-10.1, US-10.2, US-10.3 |
| **F22** Demo Environment & Reset | P1 | `F22` §Process, §Inputs; `Y1c` §5; `Y2` §8; `Y3` §8 | §8.1–§8.6, §3c.5, §0.7, AD-05 | US-2.3, US-6.3, US-10.3, US-10.4, US-10.5, US-11.11, US-12.4 |

---

## 4. Requirements Detail — PRD Capability → FRD Requirement

Per-feature decomposition of the PRD capability bullets into the FRD sections that make them executable.

### 4.1 Platform & Data Foundation

- **F0** — 16 tables (`users`, `cargo_entries`, `documents`, `document_requests`, `rules`, `evaluations`, `exceptions`, `evidence`, `cases`, `case_actions`, `recommendations`, `approvals`, `audit_entries`, `notifications`, `ai_outputs`, `schema_migrations`) specified as verbatim DDL in FRD `Y0a` §2–§9 and `Y0b` §1–§8; migrations in `Y0a` §1; referential/lifecycle rules in `Y0a` §11; reset order in `Y0b` §10. TechArch mirrors these as §2.4–§2.11 and §2b.1–§2b.8 with indexing rationale in §2.13.
- **F1** — file and endpoint ingestion, schema validation, per-entry rejection reporting, idempotency on `shipment_id`, and auto-evaluation are specified in FRD `F01` §Process with the API in `Y1c` §4 (`POST /api/ingest/cargo-entries`, `GET /api/ingest/reports/{batch_id}`) and the ACE simulation boundary in `Y3` §2 (integration `I1`).
- **F2** — 10–15 deterministic shipments, all 3 exception types, all 7 statuses, ≥1 multi-exception shipment, 1 pre-cleared case with historical audit, upload-ready fixture, and the canonical `SHP-2026-0007` scenario are specified in FRD `F02` §Process and pinned by the canonical scenario in FRD `00-header` §0.5.
- **F3** — 60 routes enumerated in FRD `Y1c` §6 (route inventory) and TechArch §3c.6; read contracts `Y1a` §1–§7; mutating contracts `Y1b` §1–§4; admin/AI/ops `Y1c` §1–§5; single error envelope `Y2` §1 + TechArch §3c.7; concurrency/idempotency TechArch §3b.8.

### 4.2 Rules & Validation

- **F4** — rule definition schema `F04` §2; applicability conditions `F04` §3; `INVALID_HTS_CODE` logic `F04` §4; `CONFLICTING_COUNTRY_OF_ORIGIN` logic `F04` §5; `MISSING_REQUIRED_DOCUMENT` logic `F04` §6; default seeded rule set `F04` §7. Configuration-as-data storage in TechArch §6.2; closed evaluator set fixed by AD-07.
- **F5** — one exception row per firing rule, field-level evidence (`field_path`, `raw_value`, `normalized_value`, comparison triple, `assertion`), `missing_information`, priority derivation (`F05` §Process step 6), queue membership, and evaluation-versioned history (`Y0a` §6–§8).
- **F6** — manual and automatic revalidation, `RESOLVED_BY_REVALIDATION` semantics (resolve, never delete), retention of still-firing exceptions, status/priority recomputation, audit entry with before/after sets, and AI regeneration — `F06` §Process step 7 and §State transitions; endpoint `Y1b` §3; invariant `F09a` §4 I9.

### 4.3 AI Assistance

- **F7** — grounding in captured evidence, attribution metadata (provider, model, timestamp, evidence inputs), caching per evaluation version, deterministic offline fallback, AI-generated labelling — `F07` §Process/§Validation; provider boundary and determinism contract TechArch §6.3; default provider `none` by AD-09.
- **F8** — action derivation table (`F08` §Action derivation, first-match-wins), confidence derivation (`F08` §Confidence derivation), rationale, inertness, and snapshotting onto the case. AD-08 fixes `action_source = DETERMINISTIC` permanently, which is what makes "AI recommends, human decides" structural rather than procedural.

### 4.4 Workflow, Approvals & Governance

- **F9** — 7 statuses (`F09a` §1), the complete 33-row transition table (`F09a` §2, T01–T33), 9 guards (`F09a` §3), 10 invariants (`F09a` §4, I1–I10), 9 UI reason strings (`F09a` §5), the common execution pipeline (`F09b` §1) and the five actions individually (`F09b` §2–§6).
- **F10** — request creation gated by G-DOC/G-DUP, lifecycle `OUTSTANDING → FULFILLED / CANCELLED`, synthetic-fixture-only upload, provenance display, and automatic cascade to F6 — `F10` §Process; upload security surface TechArch §4.6.
- **F11** — separation-of-duties constraints (`F11` §1), recommendation submission (`F11` §2 = walkthrough step 8), supervisor disposition (`F11` §3 = step 9). Enforced at schema level by AD-11: `approvals CHECK (approver_user_id <> recommended_by_user_id)`, `approvals CHECK (approver_role = 'SUPERVISOR')`, `cases CHECK (status <> 'CLEARED' OR approving_official_user_id IS NOT NULL)`.
- **F12** — the eight required fields (`F12` §1), completeness rules by entry class (`F12` §2), append-only enforcement (`F12` §3), write path (`F12` §4), timeline read (`F12` §5). Four immutability layers per AD-10; snapshot-not-reference per AD-13.
- **F13** — generation on every decision and state change, template catalog (`F13` §Template catalog), persistence and audit linkage (`Y0b` §7), in-app surfacing (`Y1a` §6), and the recorded-not-transmitted boundary (`Y3` §6, TechArch §6.5).

### 4.5 Access Control & Administration

- **F14** — 3 roles (`00-header` §0.4.1), simulated login (`F14` §1), the complete 60-route × 3-role matrix (`F14` §2 = TechArch §4.4), four enforcement layers (TechArch §4.3), denial logging (TechArch §4.9), actor stamping on every audit entry (`Y0b` §1).
- **F15** — rule list/create/edit/enable/disable, parameter editing, save-time validation, impact preview, and change auditing — `F15` §Process; endpoints `Y1c` §3 (including `POST /api/rules/{id}/preview-impact`, `GET /api/rules/{id}/history`).

### 4.6 User Interface — Four Primary Screens

| Screen feature | FRD | TechArch reads / writes (§1.6.3) |
|---|---|---|
| F16 Shell + role switcher | `F16` §Process | `/session`, `/users`, `/notifications`, `/health` |
| F17 Exception Queue | `F17` §Process, §Inputs | reads `GET /api/queue` (§3.3); no writes |
| F18 Shipment Review | `F18` §Process | reads `/shipments/{id}`, `/exceptions`, `/documents`, `/document-requests`, `/upload-fixtures`, `/ai/summary`, `/available-actions`; writes `REQUEST_INFORMATION`, upload, revalidate |
| F19 Recommended Resolution | `F19` §Process | reads `/ai/recommendation`, `/exceptions`, `/available-actions`, `/recommendations`; writes all five actions + `/approval` |
| F20 Decision & Audit Record | `F20` §Process | reads `/cases/{id}/audit`, `/audit/verify`, `/cases/{id}/notifications`; **no writes by construction** |

### 4.7 Quality & Demo Readiness

- **F21** — eight test families (`F21` §1–§8) totalling 108 identifiers, CI gating (`F21` §Validation, TechArch §7.5), golden-fixture determinism (AD-15).
- **F22** — single-command start (TechArch §8.1), preview topology on deterministic port `3000` bound to `0.0.0.0` (AD-05, TechArch §8.2), reset and repeatability (§8.3), pre-demo checklist (§8.4), failure modes (§8.5), health endpoint (`Y1c` §5).

---

## 5. Reverse Traceability — User Story → PRD Feature

All 80 stories, each traced to at least one PRD feature. Epic column = UserStories epic chunk; Rel = STORY-MAP release.

| Story | Epic | Persona | Pri | Rel | PRD Feature(s) |
|---|---|---|---|---|---|
| US-0.1 | 0 Platform & Data Foundation | PER-03 | P0 | R1 | F0 |
| US-0.2 | 0 | PER-03 | P0 | R1 | F1 |
| US-0.3 | 0 | PER-03 | P0 | R2 | F1, F14 |
| US-0.4 | 0 | PER-04 | P0 | R1 | F2 |
| US-0.5 | 0 | PER-01 | P0 | R1 | F3, F14 |
| US-1.1 | 1 Rules, Detection & Revalidation | PER-01 | P0 | R1 | F4, F5 |
| US-1.2 | 1 | PER-01 | P0 | R1 | F4, F5 |
| US-1.3 | 1 | PER-01 | P0 | R1 | F4, F5 |
| US-1.4 | 1 | PER-04 | P0 | R1 | F4 |
| US-1.5 | 1 | PER-01 | P0 | R1 | F5 |
| US-1.6 | 1 | PER-01 | P0 | R1 | F6 |
| US-1.7 | 1 | PER-02 | P0 | R1 | F6, F12, F13 |
| US-2.1 | 2 AI Assistance | PER-01 | P0 | R1 | F7, F18 |
| US-2.2 | 2 | PER-04 | P0 | R1 | F7, F8, F18, F19, F20 |
| US-2.3 | 2 | PER-03 | P0 | R1 | F7, F8, F22 |
| US-2.4 | 2 | PER-01 | P0 | R1 | F8, F19 |
| US-2.5 | 2 | PER-02 | P0 | R1 | F8, F12 |
| US-3.1 | 3 Workflow & Five Actions | PER-01 | P0 | R1 | F9 |
| US-3.2 | 3 | PER-01 | P0 | R1 | F9, F10 |
| US-3.3 | 3 | PER-02 | P0 | R1 | F9 |
| US-3.4 | 3 | PER-01 | P0 | R1 | F9 |
| US-3.5 | 3 | PER-01 | P0 | R1 | F9 |
| US-3.6 | 3 | PER-01 | P0 | R1 | F9, F12 |
| US-3.7 | 3 | PER-01 | P0 | R1 | F9, F19 |
| US-4.1 | 4 Document Request & Upload | PER-01 | P0 | R1 | F10 |
| US-4.2 | 4 | PER-01 | P0 | R1 | F10, F14 |
| US-4.3 | 4 | PER-03 | P0 | R1 | F10 |
| US-4.4 | 4 | PER-01 | P0 | R1 | F10, F6 |
| US-4.5 | 4 | PER-04 | P0 | R1 | F10, F18 |
| US-5.1 | 5 Approval Chain | PER-01 | P0 | R1 | F11, F9 |
| US-5.2 | 5 | PER-02 | P0 | R1 | F11, F17 |
| US-5.3 | 5 | PER-02 | P0 | R1 | F11, F12, F13 |
| US-5.4 | 5 | PER-02 | P0 | R2 | F11, F13 |
| US-5.5 | 5 | PER-02 | P0 | R2 | F11, F6 |
| US-6.1 | 6 Decision & Audit Record | PER-02 | P0 | R1 | F12 |
| US-6.2 | 6 | PER-04 | P0 | R1 | F12, F21 |
| US-6.3 | 6 | PER-04 | P0 | R1 | F12, F22 |
| US-6.4 | 6 | PER-02 | P0 | R1 | F12, F20 |
| US-6.5 | 6 | PER-02 | P0 | R1 | F12, F20 |
| US-6.6 | 6 | PER-04 | P0 | R1 | F12, F21 |
| US-7.1 | 7 Notifications | PER-02 | P1 | R1 | F13, F12 |
| US-7.2 | 7 | PER-04 | P1 | R1 | F13, F16, F20 |
| US-8.1 | 8 Access Control & Rule Admin | PER-03 | P0 | R1 | F14 |
| US-8.2 | 8 | PER-01 | P0 | R1 | F14 |
| US-8.3 | 8 | PER-02 | P0 | R1 | F14 |
| US-8.4 | 8 | PER-04 | P0 | R1 | F14, F21 |
| US-8.5 | 8 | PER-03 | P1 | R2 | F15, F14 |
| US-8.6 | 8 | PER-03 | P1 | R2 | F15, F12, F6 |
| US-9.1 | 9 Four Primary Screens & Shell | PER-01 | P0 | R1 | F16 |
| US-9.2 | 9 | PER-01 | P0 | R1 | F17 |
| US-9.3 | 9 | PER-02 | P0 | R1 | F17 |
| US-9.4 | 9 | PER-01 | P0 | R1 | F17, F5 |
| US-9.5 | 9 | PER-01 | P0 | R1 | F18 |
| US-9.6 | 9 | PER-01 | P0 | R1 | F18, F6 |
| US-9.7 | 9 | PER-01 | P0 | R1 | F19 |
| US-9.8 | 9 | PER-02 | P0 | R1 | F19, F11 |
| US-9.9 | 9 | PER-04 | P0 | R1 | F20, F12 |
| US-10.1 | 10 Quality & Demo Readiness | PER-03 | P0 | R1 | F21, F4, F6 |
| US-10.2 | 10 | PER-04 | P0 | R1 | F21, F9, F11, F12, F14 |
| US-10.3 | 10 | PER-03 | P0 | R1 | F21, F22 |
| US-10.4 | 10 | PER-03 | P1 | R1 | F22, F2 |
| US-10.5 | 10 | PER-03 | P1 | R2 | F22 |
| US-11.1 | 11 Walkthrough (step 1) | PER-04 | P0 | R1 | F17, F5, F2 |
| US-11.2 | 11 (step 2) | PER-01 | P0 | R1 | F18, F0, F3 |
| US-11.3 | 11 (step 3) | PER-01 | P0 | R1 | F7, F18 |
| US-11.4 | 11 (step 4) | PER-01 | P0 | R1 | F5, F4, F8, F19 |
| US-11.5 | 11 (step 5) | PER-01 | P0 | R1 | F10, F9, F13 |
| US-11.6 | 11 (step 6) | PER-01 | P0 | R1 | F10 |
| US-11.7 | 11 (step 7) | PER-01 | P0 | R1 | F6, F4 |
| US-11.8 | 11 (step 8) | PER-01 | P0 | R1 | F9, F8, F11 |
| US-11.9 | 11 (step 9) | PER-02 | P0 | R1 | F11, F14, F13 |
| US-11.10 | 11 (step 10) | PER-04 | P0 | R1 | F12, F20 |
| US-11.11 | 11 (off-script) | PER-04 | P0 | R1 | F22, F2, F17 |
| US-12.1 | 12 Governance Guardrails | PER-04 | P0 | R1 | F8, F9, F12 |
| US-12.2 | 12 | PER-02 | P0 | R1 | F11, F14, F12 |
| US-12.3 | 12 | PER-04 | P0 | R1 | F11, F9, F6 |
| US-12.4 | 12 | PER-04 | P0 | R1 | F12, F22 |
| US-12.5 | 12 | PER-02 | P0 | R1 | F9, F11, F12 |
| US-12.6 | 12 | PER-03 | P0 | R1 | F14, F9, F15 |
| US-12.7 | 12 | PER-04 | P0 | R1 | F1, F4, F2, F14, F13, F7, F16 |

**Reverse-trace result:** 80 of 80 stories map to ≥ 1 PRD feature. 0 orphan stories. 0 stories referencing a feature outside F0–F22.

---

## 6. Test Case Coverage Matrix

### 6.1 Test Families (FRD `F21` §§1–8, TechArch §4.10)

| Family | IDs | Count | Primary features | FRD source |
|---|---|---|---|---|
| Rule engine | RE-01 … RE-20 | 20 | F4, F5 | `F21` §1 |
| Workflow transitions | WF-01 … WF-14 | 14 | F9, F11 | `F21` §2 |
| RBAC | AC-01 … AC-10 | 10 | F14, F11, F3 | `F21` §3 |
| Audit completeness & immutability | AU-01 … AU-11 | 11 | F12, F13, F0 | `F21` §4 |
| Revalidation | RV-01 … RV-09 | 9 | F6, F10, F15 | `F21` §5 |
| AI assistance | AI-01 … AI-10 | 10 | F7, F8 | `F21` §6 |
| Ingestion | IN-01 … IN-04 | 4 | F1 | `F21` §7 |
| Seed data | SD-01 … SD-05 | 5 | F2 | `F21` §7 |
| Demo environment | DE-01 … DE-02 | 2 | F22 | `F21` §7 |
| Upload security | UP-01 … UP-06 | 6 | F10 | TechArch §4.10 |
| Iframe/CSP headers | HDR-01 … HDR-02 | 2 | F16, F22 | TechArch §4.10 |
| End-to-end walkthrough | E2E-01, E2E-02, E2E-03 | 3 | all | `F21` §8 |
| **Total** | — | **108** | — | — |

### 6.2 Feature → Test Coverage

| Feature | Stories | Test cases | Coverage |
|---|---|---|---|
| F0 | 2 | AU-04, AU-07, RV-03, SD-01, DE-01 | ✅ indirect (schema asserted through consumers) |
| F1 | 3 | IN-01, IN-02, IN-03, IN-04 | ✅ full |
| F2 | 5 | SD-01, SD-02, SD-03, SD-04, SD-05 | ✅ full |
| F3 | 2 | AC-01, AC-07, WF-12, WF-13, DE-01 | ✅ full (60 routes × 3 roles via AC-01) |
| F4 | 8 | RE-01 … RE-17, RE-20 | ✅ full |
| F5 | 7 | RE-14, RE-18, RE-19 | ✅ full |
| F6 | 8 | RV-01 … RV-09 | ✅ full |
| F7 | 5 | AI-01, AI-02, AI-03, AI-06, AI-07, AI-09 | ✅ full |
| F8 | 7 | AI-01, AI-04, AI-05, AI-08, AI-10 | ✅ full |
| F9 | 15 | WF-01 … WF-14 | ✅ full (7 statuses × 5 actions × 2 roles via WF-01) |
| F10 | 8 | UP-01 … UP-06, RV-01, IN-04, E2E-01 step 6 | ✅ full |
| F11 | 12 | WF-02, WF-11, AC-02, AC-03, AU-02, E2E-03 | ✅ full |
| F12 | 18 | AU-01 … AU-11, WF-09, AI-10 | ✅ full |
| F13 | 8 | AU-11, WF-05 | ⚠️ partial — generation and non-transmission asserted; in-app centre only via E2E-01 |
| F14 | 13 | AC-01 … AC-10 | ✅ full |
| F15 | 3 | RE-07, RE-08, RE-16, RV-07, AC-04 | ✅ full |
| F16 | 3 | HDR-01, HDR-02, E2E-01 | ⚠️ partial — no dedicated component test family |
| F17 | 6 | E2E-01 step 1, E2E-02, SD-01 | ⚠️ E2E-only |
| F18 | 7 | E2E-01 steps 2, 3, 6, 7 | ⚠️ E2E-only |
| F19 | 6 | E2E-01 step 4, WF-14 | ⚠️ E2E-only + reason-string coverage |
| F20 | 6 | E2E-01 step 10, AU-06, AU-10 | ⚠️ E2E-only + export/chain coverage |
| F21 | 6 | self (`F21` §Validation, TechArch §7.5 CI gate) | ✅ meta |
| F22 | 7 | DE-01, DE-02, E2E-02, AI-01 | ✅ full |

### 6.3 Governance Claim → Test Coverage (TechArch §7.3, FRD `F09a` §4)

| Governance claim | Enforcement ID | Tests |
|---|---|---|
| Exactly one path to `CLEARED` | I1, T31, AD-11 | WF-02, WF-11 |
| No AI or SYSTEM actor executes a transition | I2, AD-08 | WF-03, AU-09, AI-08 |
| Every transition carries a justification | I3 | WF-04 |
| One audit entry + one notification per transition | I4 | WF-05, AU-11 |
| Terminal cases are immutable | I6 | WF-06, IN-03 |
| Escalation transfers authority | I7 | WF-07 |
| Redundant transitions rejected, not absorbed | I8 | WF-08 |
| Revalidation never clears or pends approval | I9 | RV-05 |
| Denials are recorded | I10 | WF-09, AC-10 |
| Self-approval blocked at handler *and* database | G-SOD, AD-11 | AC-02, AC-03, E2E-03 |
| Eight-field audit completeness | `F12` §1, G-AUDIT | AU-01, AU-02, AU-03 |
| Audit append-only, four layers | AD-10, P5 | AU-04, AU-05, AU-06 |
| Snapshot, not reference | AD-13 | AU-08 |
| History never deleted | AD-12, P5 | RV-03 |
| Rule logic is configuration, not code | AD-07, P3 | RE-07, RE-08, RE-13, RE-16 |
| Walkthrough completes with AI disabled | AD-09, P4 | AI-01, AI-04, E2E-01 |
| Notifications generated, never transmitted | `Y3` §6 | AU-11 |
| No real or PII data anywhere | PRD §6 Privacy | SD-05, UP-05 |

---

## 7. Walkthrough Traceability (PRD §3.2 — Primary Acceptance Criterion)

| Step | PRD features | FRD | TechArch §0.9 route / service | Story | Test |
|---|---|---|---|---|---|
| 1 Show the exception queue | F17, F5, F2 | `F17` §Process; `Y1a` §1 | `GET /api/queue` · `QueueService` | US-11.1 | E2E-01 (1) |
| 2 Open a flagged shipment | F18, F0, F3 | `F18` §Process; `Y1a` §2 | `/shipments/{id}` + `/exceptions` + `/documents` · `ShipmentService` | US-11.2 | E2E-01 (2) |
| 3 Show the AI summary | F7, F18 | `F07` §Process; `Y1c` §2 | `/ai/summary` · `AiAssistService` | US-11.3 | E2E-01 (3), AI-01 |
| 4 Display triggering rule + evidence | F5, F4, F19 | `F04` §2–§7; `F05` §Validation; `F08` | `/ai/recommendation` · `AiAssistService` | US-11.4 | E2E-01 (4), RE-09, AI-05 |
| 5 Request a missing document | F10, F9, F13 | `F09b` §2; `F10` §Process | `POST /cases/{id}/actions` · `WorkflowService` · T01/T06, G-DOC | US-11.5 | E2E-01 (5), WF-01 |
| 6 Upload the simulated document | F10 | `F10` §Process; `Y1b` §4 | `POST /document-requests/{id}/upload` · `DocumentService` | US-11.6 | E2E-01 (6), UP-01…UP-06 |
| 7 Revalidate the shipment | F6, F4 | `F06` §Process step 7; `Y1b` §3 | `POST /shipments/{id}/revalidate` · `RevalidationService` | US-11.7 | E2E-01 (7), RV-01, RV-02 |
| 8 Specialist recommends clearance | F9, F8, F11 | `F09b` §4; `F11` §2 | `CLEAR_EXCEPTION` · T08, G-REC | US-11.8 | E2E-01 (8), WF-11 |
| 9 Supervisor approves | F11, F14, F13 | `F11` §3; `Y1b` §2 | `POST /cases/{id}/approval` · `ApprovalService` · T31, G-SOD, G-AUDIT | US-11.9 | E2E-01 (9), AC-02, AU-02 |
| 10 Show the complete audit trail | F12, F20 | `F12` §5; `Y1a` §5 | `/cases/{id}/audit` + `/verify` + `/export` · `AuditQueryService` | US-11.10 | E2E-01 (10), AU-06, AU-10 |

Repeatability of all ten steps is asserted by E2E-02; the blocked self-approval negative by E2E-03.

---

## 8. Upstream Traceability — Persona / Job / Journey → Feature

| Persona | Jobs (JTBD) | Journeys (JRN) | Primary features |
|---|---|---|---|
| PER-01 Marisol Reyes (Cargo Specialist) | JTBD-01.1 … JTBD-01.6 | JRN-01.1, JRN-01.2, JRN-01.3, JRN-01.4 | F17, F18, F19, F5, F7, F8, F9, F10, F6 |
| PER-02 Dwayne Okafor (Supervisor) | JTBD-02.1 … JTBD-02.5 | JRN-02.1, JRN-02.2 | F11, F12, F20, F13, F17 |
| PER-03 Priya Raghavan (System Administrator) | JTBD-03.1 … JTBD-03.5 | JRN-03.1, JRN-03.2 | F15, F4, F1, F14, F22, F0 |
| PER-04 Angela Pruitt (observer — no system account) | JTBD-04.1 … JTBD-04.5 | JRN-04.1, JRN-04.2 | F12, F20, F21, F22, F2, F16 |

Journey completeness per release is recorded in `STORY-MAP/Y0-coverage.md`: 7 of 10 journeys complete in R1; JRN-02.1, JRN-03.1, JRN-03.2 and JRN-04.2 are completed by the 6 R2 stories.

---

## 9. Coverage Summary

### 9.1 Quantitative Coverage

| Measure | Value |
|---|---|
| PRD features defined (F0–F22) | 23 |
| Features with an FRD requirement section | 23 / 23 (100%) |
| Features with a TechArch specification reference | 23 / 23 (100%) |
| Features with ≥ 1 user story | 23 / 23 (100%) |
| Features with ≥ 1 test case identifier | 23 / 23 (100%) |
| Features with **full** downstream trace (FRD + TechArch + story + dedicated non-E2E test family) | 17 / 23 |
| Features whose test coverage is E2E-only or partial | 6 / 23 (F13, F16, F17, F18, F19, F20 — see §9.2) |
| User stories defined | 80 |
| Stories traceable to ≥ 1 PRD feature | 80 / 80 (100%) |
| Stories with no upstream feature (orphans) | 0 |
| Walkthrough steps with an end-to-end trace | 10 / 10 (100%) |
| Workflow transitions specified | 33 (T01–T33) |
| Transitions targeting `CLEARED` | 1 (T31) |
| Test case identifiers | 108 |
| PRD §6 NFR categories bound to a story | 14 / 14 (100%) |
| Recorded exclusions (PRD §5.8) | 10 |

### 9.2 Observed Gaps and Weak Links

These are genuine traceability observations for downstream planning, not scope changes.

| # | Gap | Affected | Impact | Recommended planning action |
|---|---|---|---|---|
| G1 | The four primary screens (F17–F20) plus the shell (F16) have **no dedicated component/unit test family**; their assertions live inside `E2E-01` steps and TechArch §4.10 header tests. | F16, F17, F18, F19, F20 | A UI regression is caught only by the slowest test in the suite. PRD §8 records "UI treated as an afterthought" as a high risk. | Add per-screen component tests during implementation planning, or accept E2E-only coverage as a recorded decision. |
| G2 | F13 in-app notification centre and read state are asserted only via `AU-11` (linkage + `transmitted=false`) and `E2E-01` step 10. | F13 | Matches its P1 priority and the P1 rationale in `Y1-priorities.md` for US-7.1/US-7.2. | No action required for the demo; note as known-thin. |
| G3 | F0 has no test family of its own — schema correctness is asserted transitively (AU-04, AU-07, RV-03, SD-01, DE-01). | F0 | Acceptable: the schema is exercised by every other family, and startup self-checks (TechArch §8.1) fail fast. | No action. |
| G4 | The FRD does not use flat `REQ-` identifiers; requirements are addressed as `{chunk} §{section}`. | all | Section references are stable but coarser than per-sentence requirement IDs. | Planners should cite `{chunk} §{section}` verbatim; do not invent `REQ-` IDs. |
| G5 | 6 stories (US-0.3, US-5.4, US-5.5, US-8.5, US-8.6, US-10.5) are R2. F15 is therefore **entirely R2** and F1's second interface (local ingestion endpoint) is R2. | F15, F1 | R1 still satisfies all ten walkthrough steps; F15's adaptability claim (PRD §7 Rule configurability) is not demonstrable until R2. | Sequence F15 immediately after R1 if the rule-configurability metric is to be shown in the same session. |

### 9.3 PRD §5.8 Exclusions — Recorded Decisions, Not Coverage Gaps

**The ten items in PRD §5.8 are recorded decisions with stated rationale traceable to `.planning/PROJECT.md` §Out of Scope. They MUST NOT be counted as coverage gaps, backlog items, or omissions, and MUST NOT be silently reintroduced during build.** Each is structurally prevented rather than merely undocumented.

| Excluded capability | Recorded as | Structural prevention |
|---|---|---|
| Live ACE integration | PRD §5.8, PROJECT.md §Out of Scope | FRD `Y3` §2 (`I1` simulation boundary); TechArch §6.4 |
| Exception types beyond the three named | PRD §5.8 | Closed enum at DB + API (FRD `00-header` §0.4.4); closed evaluator map (AD-07) |
| Real importer/carrier data or any PII | PRD §5.8 | Seed PII deny-list (SD-05); upload PII scan (UP-05) |
| Production authentication (PIV/CAC, SSO) | PRD §5.8 | FRD `Y3` §7 (`I6` identity absent by design); TechArch §4.2, §6.6 |
| Real outbound email/SMS delivery | PRD §5.8 | FRD `Y3` §6 (`I5` absent by design); `transmitted = false` asserted by AU-11 |
| Machine-learning model training | PRD §5.8 | Request-time generation only (FRD `F07`/`F08`); TechArch §6.3 |
| Mobile-native applications | PRD §5.8 | Responsive web SPA only (AD-04) |
| Multi-port / multi-tenant configuration | PRD §5.8 | Single deterministic port (AD-05); single-tenant schema |
| Screens beyond the four primary screens | PRD §5.8 | F15/F22 surfaces scoped as supporting-only (`§1.6.3` screen map) |
| Autonomous clearance / any AI-initiated action | PRD §5.8 | I2, AD-08, `actor_kind` constraint; WF-03, AU-09, AI-08 |
| Background / async jobs | PRD §5.9 | All processing request-time; no scheduler in TechArch §0.4 |

**Exclusion trace integrity:** US-12.7 ("Prevent Excluded Capabilities from Reappearing") is the single story that regression-tests this table, covering F1, F4, F2, F14, F13, F7, F16.

---

## 10. Change Management

| Version | Date | Author | Change | Documents affected |
|---|---|---|---|---|
| 1.0 | 2026-09-08 | Pivota Spec Framework (RTM Generator) | Initial RTM. Traced all 23 PRD features, 80 user stories, 108 test identifiers, 33 workflow transitions and 15 architectural decisions across PERSONAS, JTBD, JOURNEYS, PRD, FRD, TechArch, UserStories and STORY-MAP. | — |

### 10.1 Change Control Rules

| Rule | Requirement |
|---|---|
| CC-1 | A new PRD feature MUST be added to §3 with an FRD section, a TechArch section, ≥ 1 story and ≥ 1 test ID before implementation planning begins. |
| CC-2 | A new user story MUST cite ≥ 1 existing PRD feature in §5; a story citing no feature is rejected. |
| CC-3 | A new route MUST appear in the FRD `Y1c` §6 route inventory and carry an RBAC matrix row (`F14` §2), or startup self-check AC-09 fails. |
| CC-4 | A new workflow transition MUST be added to `F09a` §2 and to the WF-01 matrix, or WF-01 fails. |
| CC-5 | Reintroducing any PRD §5.8 exclusion requires a PRD amendment recorded in §9.3 of this document; US-12.7 must be updated in the same change. |
| CC-6 | Any TechArch deviation from a PRD or FRD default MUST be recorded as a new `AD-nn` entry in TechArch §0.8. |

---

## 11. Approval

| Role | Name | Responsibility | Signature | Date |
|---|---|---|---|---|
| Product Owner | ____________________ | Confirms F0–F22 and the PRD §3.2 walkthrough are the correct scope, and that PRD §5.8 exclusions remain decisions | ____________________ | __________ |
| Business Analyst / Requirements Owner | ____________________ | Confirms FRD §-level requirements fully decompose every PRD capability bullet | ____________________ | __________ |
| Technical Architect | ____________________ | Confirms TechArch sections and AD-01–AD-15 cover every traced requirement | ____________________ | __________ |
| QA Lead | ____________________ | Confirms the 108 test identifiers cover every governance claim and accepts the §9.2 G1/G2 coverage observations | ____________________ | __________ |
| Governance / Compliance Reviewer | ____________________ | Confirms the audit, RBAC and separation-of-duties chains in §6.3 are complete and defensible | ____________________ | __________ |
| Delivery / Planning Lead | ____________________ | Accepts this RTM as the authoritative feature-count and dependency input for implementation planning | ____________________ | __________ |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
