---
schema_version: 1
slug: cargodemo-cbp-cargo-exception-review-app
scope: reduced
reason: capacity
reduction_effective: true
generated_by: pivota_spec-scope-auditor
date: 2026-09-08T17:59:15Z
metrics: { p0_features: 23, p1_p3_features: 0, entities: 21, endpoints: 70, integrations: 11, nfr_flags: 3, gap_density: 0.008 }
budget:  { hard_trip: true, size_trip: true, gap_trip: false }
mvp_scope:
  included_features: [F0, F2, F3, F4, F5, F9, F17, F18]
  primary_journey: "JRN-01.1"
  selection_source: journey-primary
deferred_scope:
  excluded_features: [F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22]
  excluded_reason: "over-budget — outside the flag → review → decide slice of JRN-01.1 that fits express capacity"
---

# Scope Decision — CargoDemo (CBP cargo exception review app)

## Decision

Express builds **one end-to-end slice of the 10-step walkthrough (JRN-01.1)**: a seeded cargo entry
is validated against configurable rules, flagged with field-level evidence, listed on the Cargo
Exception Queue, opened on the Shipment Review screen, and acted on by a specialist with a mandatory
justification.

**8 of 23 features are selected.** The remaining 15 are deferred.

## Why

`scope metrics` returned **`HARD_TRIP`**, `reason: capacity`. Both capacity predicates fired:

| Predicate | Measured | Threshold | Tripped |
|---|---|---|---|
| `nfr_flags` | 3 | >= 2 | yes (hard) |
| `integrations` | 11 | >= 3 | yes (hard) |
| `entities` | 21 | >= 14 | yes (hard) |
| `p0_features` | 23 | > 8 | yes (size) |
| `gap_density` | 0.008 | — | no |

`p0_unit` was `features`, so 23 is a genuine feature count, not an inflated story count. Every one of
the 23 features is P0 (`p1_p3_features: 0`) — PRD §9.1 states this explicitly — so **priority carries
no selection signal on this spec**, and neither does the release grouping: STORY-MAP Release R1 is
74 of 80 stories, i.e. very nearly the whole project. Both were therefore discarded as selection
criteria and the cut was made on **journey structure**.

`selection_source: journey-primary` — STORY-MAP-CargoDemo.md is present and its horizontal backbone
is stated outright to be the 10-step walkthrough of **JRN-01.1** on the canonical shipment
`SHP-2026-0007`. JRN-01.1 is referenced by all eleven backbone lanes (Step 0 through Step 10), far
more than JRN-01.2, JRN-01.3, JRN-02.1, JRN-02.2, JRN-03.1, JRN-03.2, JRN-04.1 or JRN-04.2. It is
the primary journey by reference count and it forms a complete create→view loop.

**Where the cut fell inside JRN-01.1.** The journey's own ten steps cannot all fit: walking Steps 0-10
in order and unioning the thinnest story's `Feature Ref:` at each stage reaches 20 features, which is
still far over capacity. Capacity was exhausted partway through the walkthrough, so selection stopped
at the last step that closes a loop rather than taking a further step it could not finish. Steps 1, 2
and the evidence half of Step 4 are built, plus the human action point; Steps 3 (AI summary), 5-6
(document request and upload), 7 (revalidation), 8-9 (approval chain) and 10 (audit trail) are
deferred whole. No step is half-built.

**Step 8 hard check — satisfied.** The selected set contains a complete create→view loop and a
user-facing surface:

- **create** — a seeded shipment (F2) is persisted (F0), evaluated by the configurable rule engine
  (F4), and turned into exceptions with concrete field-level evidence (F5); the specialist then
  creates a decision by taking one of the five actions with a mandatory justification (F9).
- **view** — the flagged shipment appears on the Cargo Exception Queue (F17) and opens on the
  Shipment Review screen (F18), where the entry data, documents panel and validation results are
  read, and where the post-action state change is visible.
- **surface** — F17 and F18 are user-operated screens, not an API. PRD §8 risk 4 ("UI treated as an
  afterthought behind a working API") is respected: two of the four primary screens ship as
  first-class features, and F3 keeps the server-side contract behind them.

No widening was needed to satisfy Step 8.

**Gap rule (Step 7) — nothing to apply.** `prd_has_gaps: false`, `gap_trip: false`,
`gap_density: 0.008` (2 gaps across 249 RTM rows). No selected feature carries an unresolved
definition gap, so no feature was excluded with `unresolved-gap` and Step 7 never contended with
Step 8.

**Reduction is effective.** `excluded_features` is non-empty (15 features), so `scope: reduced` is a
true claim. The Step 9 `reduction_effective: false` valve does not apply here: although `nfr_flags`
(3) is app-wide and unreducible by feature selection, `integrations` (11) and `entities` (21) both
fall with the deferred features, and `size_trip` fired independently and was reducible.

`scope metrics` returned **no warnings** — every `Feature Ref:` resolved against the PRD/RTM feature
index, and no story carrying a feature reference was missing a `Priority:` line.

## In scope

8 of 23 features.

| Feature | Name | Why it is in the slice |
|---|---|---|
| F0 | Cargo Entry Data Model & Persistence | The store every screen and every write depends on; nothing persists without it |
| F2 | Synthetic Seed Dataset | The only data source in scope — carries the canonical solar-panel shipment verbatim with its 3 expected exceptions, so the demo needs zero manual data entry |
| F3 | Backend HTTP API | The contract between the two screens and the domain; queue read, shipment detail read, and the action write |
| F4 | Configurable Business Rule Engine | Rules as configuration, not code — all three exception types evaluated deterministically |
| F5 | Exception Detection, Evidence Capture & Flagging | Creates the exceptions and captures evidence as field references and values (`country_of_origin = "Malaysia"` vs `manufacturer.address.country = "China"`), which is what makes the flag legible |
| F9 | Exception Case Workflow & User Actions | The human write: five actions, validated state transitions, mandatory justification on every action |
| F17 | Cargo Exception Queue Screen | Walkthrough Step 1 — the landing surface; multi-exception shipments shown as multi-exception |
| F18 | Shipment Review Screen | Walkthrough Step 2 — the whole case on one screen: entry fields, documents panel, validation results |

## Deferred beyond MVP

15 features. Each is deferred because it sits outside the selected slice of JRN-01.1, not because it
is unimportant — several are central to the product's thesis and are the first thing the graduation
path restores.

| Feature | Name | Deferred because |
|---|---|---|
| F1 | Cargo Entry Ingestion (JSON / local API) | F2's deterministic seed supplies the canonical case; a second ingestion interface adds no walkthrough step |
| F6 | Shipment Revalidation | Walkthrough Step 7; depends on F10's upload to have anything to re-evaluate |
| F7 | AI Plain-Language Shipment Summary | Walkthrough Step 3; the evidence and triggering rule are shown independently by F5/F18, so comprehension survives without the narrative |
| F8 | AI Recommended Resolution with Confidence | Walkthrough Step 4's advisory half; F9's action panel is human-driven and does not require it |
| F10 | Document Request & Simulated Upload | Walkthrough Steps 5-6, deferred whole rather than half-built |
| F11 | Specialist → Supervisor Approval Chain | Walkthrough Steps 8-9; separation of duties needs F14's roles, which are also deferred |
| F12 | Decision & Audit Record | Walkthrough Step 10 — **the most consequential deferral on this list**; see Open Question SCOPE-Q2, which offers a direct trade for it |
| F13 | Notification Generation | Generated-not-transmitted notifications hang off decisions recorded in F12 |
| F14 | Role Simulation & RBAC | Three roles and server-side role enforcement; without F11 there is no approval boundary to enforce, so the slice runs as a single implicit specialist |
| F15 | Rule Administration | STORY-MAP places the editing surface in R2; F4's rules stay configuration, just not editable in-app |
| F16 | Application Shell, Navigation & Role Switcher | STORY-MAP calls this a supporting feature; two screens route without a dedicated shell feature |
| F19 | Recommended Resolution Screen | Its decision-support payload (rule, evidence, five actions) is carried by F5, F9 and F18 in this slice |
| F20 | Decision & Audit Record Screen | The surface for F12; deferred with it |
| F21 | Automated Test Suite | Scoped to the governance claims (RBAC, approval chain, audit completeness) that this slice defers |
| F22 | Demo Environment & Reset | Single-command start and one-action reset; F2's deterministic seed covers repeatability of the data itself |

**What the user should know plainly:** this slice demonstrates *governed exception detection and a
justified human action*. It does **not** demonstrate the approval chain, the audit trail, or the AI
assistance — which are the product's three headline governance claims. If those claims are what the
build must show, take the graduation path below rather than express.

## Graduation path

Express delivers one journey slice. To build the full 23-feature specification — all ten walkthrough
steps, all four screens, the approval chain, the audit record and the AI assistance — use the
**standard phase route** (`/pivota_spec-roadmap` then per-phase planning) instead of express. The
standard route plans the corpus in sequenced phases with no capacity ceiling on the whole, and it is
the honest answer to "build all of it".

Suggested restoration order, following the STORY-MAP backbone:

1. **F12 + F20** — the audit record and its screen (Step 10). Restores the defensibility claim first.
2. **F14 + F11** — roles and the specialist → supervisor approval chain (Steps 8-9), plus blocked
   self-approval. Restores separation of duties.
3. **F10 + F6** — document request, simulated upload and revalidation (Steps 5-7). Restores the
   resolve-one/retain-two loop.
4. **F7 + F8 + F19** — AI summary, recommendation with confidence, and the Recommended Resolution
   screen (Steps 3-4). Restores the governed-AI claim.
5. **F13, F16, F15, F1, F21, F22** — notifications, shell, rule administration, the second ingestion
   interface, the test suite and the demo reset.

## Open Questions

```yaml
- id: SCOPE-Q1
  source: scope-decision
  header: "Demo slice"
  question: "This spec is 23 features and express reliably builds about 8, so I'm building one slice of the 10-step walkthrough end-to-end and deferring the rest. I picked flag the shipment, review it, then act on it with a justification. Keep that slice, or start somewhere else?"
  options:
    - "Keep: flag, review, then act"
    - "Instead: flag, review, audit trail"
    - "Instead: flag, review, AI summary"
    - "Instead: flag, recommend, approve"
  default: "Keep: flag, review, then act"
  affects: [F3, F7, F9, F11, F12, F18, F19, F20]
  can_widen_scope: false

- id: SCOPE-Q2
  source: scope-decision
  header: "Audit trail"
  question: "The audit record and its screen (walkthrough step 10) do not fit alongside the slice I picked. I can trade one selected feature for it, but not add it on top. Which trade do you want?"
  options:
    - "Keep as is: no audit trail"
    - "Trade the API layer for it"
    - "Trade the review screen for it"
  default: "Keep as is: no audit trail"
  affects: [F3, F12, F18, F20]
  can_widen_scope: false
```

## Notes

- `p0_unit` was `features`, so `p0_features: 23` is a true feature count and matches PRD §9 exactly
  (F0-F22). The `F00`-style tokens appearing in RTM are FRD chunk filenames, not feature IDs, and
  were correctly not counted.
- All 23 features are P0 and `p1_p3_features` is 0, so priority was unusable as a selection signal.
  STORY-MAP Release R1 is 74 of 80 stories, so release grouping was unusable too. Selection was made
  purely on journey structure, per the backbone STORY-MAP itself declares.
- Every discoverable feature ID (F0-F22, 23 total) appears in exactly one of `included_features` (8)
  or `excluded_features` (15). 8 + 15 = 23.
- PRD §5.8 exclusions (ACE integration, a fourth exception type, real data, production auth, outbound
  transport, ML training, mobile-native, multi-tenancy) are recorded product decisions and are **not**
  represented in `excluded_features` — they were never in scope to defer.
