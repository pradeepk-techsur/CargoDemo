---
schema_version: 1
slug: cargodemo-cbp-cargo-exception-review-app
scope: reduced
reason: capacity
reduction_effective: true
generated_by: pivota_spec-scope-auditor
date: 2026-09-08T16:28:56Z
metrics: { p0_features: 23, p1_p3_features: 0, entities: 21, endpoints: 70, integrations: 11, nfr_flags: 3, gap_density: 0.008 }
budget:  { hard_trip: true, size_trip: true, gap_trip: false }
mvp_scope:
  included_features: [F0, F2, F3, F4, F5, F9, F17, F18]
  primary_journey: "JRN-01.1"
  selection_source: journey-primary
deferred_scope:
  excluded_features: [F1, F6, F7, F8, F10, F11, F12, F13, F14, F15, F16, F19, F20, F21, F22]
  excluded_reason: "over-budget"
---

# Scope Decision — CargoDemo

## Decision

Express will build **8 of the 23 specified features**, covering the front half of the canonical
10-step demo walkthrough (JRN-01.1): a seeded cargo entry is validated against configurable rules,
flagged with field-level evidence, worked from the exception queue, opened in full detail, and
disposed of by a named human action carrying mandatory justification.

The remaining 15 features are deferred, not cancelled. The AI assistance layer, the
document-request/upload/revalidate arc, the supervisor approval chain, the audit-record screen,
role-based access control and the automated test suite are all outside this build.

## Why

`scope metrics` returned **`HARD_TRIP`**, reason **`capacity`**. Six budget predicates fired, not one:

| Predicate | Measured | Threshold | Tripped |
|---|---|---|---|
| `nfr_flags` | 3 | >= 2 | yes (hard) |
| `integrations` | 11 | >= 3 | yes (hard) |
| `entities` | 21 | >= 14 | yes (hard) |
| `p0_features` | 23 | > 8 | yes (size) |
| `p0 + p1_p3` | 23 | > 12 | yes (size) |
| `endpoints` | 70 | > 20 | yes (size) |

`p0_unit` is `features`, so 23 is a genuine distinct-feature count, not an inflated story count —
the trip is not an artefact of measurement. `gap_density` is 0.008 across 249 RTM rows and
`prd_has_gaps` is `false`: this specification is unusually clean. It is not ambiguous, it is
**large**. Nothing here is a criticism of the spec; the corpus is fully traced and internally
consistent. It simply describes more system than one express run builds reliably.

Because `p0_features` (23) exceeds `SIZE_P0` (8), the selected set is capped at **8 features**.
That cap, not editorial preference, is what forced the depth of this cut.

**Selection signal:** `journey-primary`. STORY-MAP-CargoDemo is present and its horizontal backbone
is explicitly the 10-step walkthrough. JRN-01.1 carries 27 stage references — more than double the
next journey (JRN-02.1 at 16) — confirming it as the primary journey and matching PRD §3.2's stated
primary acceptance narrative.

**Priority and release grouping were deliberately not used as the boundary.** Both are degenerate on
this corpus: 20 of 23 features are P0 with zero P2/P3, and the STORY-MAP's R1 "Demo Release" holds
74 of 80 stories. Selecting by either would have selected ~100% of the project and produced a gate
that cut nothing. The cut was made by walking JRN-01.1's stages in order and taking the thinnest
story satisfying each.

**Step 8 hard check — satisfied.** The selected set contains a complete create→view loop: seeded
shipments are validated and flagged (F4, F5), the specialist views the queue (F17), opens the
shipment and reads the triggering rule plus field-level evidence (F18), then authors a decision with
mandatory justification (F9) whose resulting state change is visible back on the queue and detail
views. A user-facing surface is present (F17, F18), so this is not an API-only build — which PRD §8
names explicitly as an acceptance failure.

## In scope

8 of 23 features.

| Feature | Why it survived the cut |
|---|---|
| F0 | Cargo Entry Data Model & Persistence — the domain model every screen and transition reads |
| F2 | Synthetic Seed Dataset — the canonical solar-panel scenario, so the walkthrough runs with zero manual data entry |
| F3 | Backend HTTP API — the only data path the UI has |
| F4 | Configurable Business Rule Engine — rules as configuration across the three exception types |
| F5 | Exception Detection, Evidence Capture & Flagging — creates the reviewable work and the field-level evidence |
| F9 | Exception Case Workflow & User Actions — the five actions with mandatory justification; the human-authored half of the loop |
| F17 | Cargo Exception Queue Screen — walkthrough step 1, the landing surface |
| F18 | Shipment Review Screen — walkthrough step 2, full detail with evidence and documents-received panel |

Two consequences of the cap are worth stating plainly rather than discovering at build time:

- The application shell and role switcher are not in the set, so navigation is limited to the queue
  row opening the shipment detail — which F17 already specifies as its own behaviour. There is no
  shared frame, no notification indicator and no role-aware navigation.
- Server-side role enforcement is not in the set, so the five actions are available to a single
  implicit specialist identity. Actor attribution still lands on records via F0, but there is no
  separation of duties in this build.

## Deferred beyond MVP

15 features, all `over-budget` — displaced by the 8-feature cap, not judged unnecessary:

| Feature | What is deferred |
|---|---|
| F1 | Cargo Entry Ingestion — F2's seed path covers the demo without it |
| F6 | Shipment Revalidation — walkthrough step 7 |
| F7 | AI Plain-Language Shipment Summary — walkthrough step 3 |
| F8 | AI Recommended Resolution with Confidence — walkthrough step 4's advisory half |
| F10 | Document Request & Simulated Upload — walkthrough steps 5 and 6 |
| F11 | Specialist → Supervisor Approval Chain — walkthrough steps 8 and 9 |
| F12 | Decision & Audit Record — walkthrough step 10's substance |
| F13 | Notification Generation |
| F14 | Role Simulation & Role-Based Access Control |
| F15 | Rule Administration |
| F16 | Application Shell, Navigation & Role Switcher |
| F19 | Recommended Resolution Screen |
| F20 | Decision & Audit Record Screen |
| F21 | Automated Test Suite |
| F22 | Demo Environment & Reset |

**Be explicit about what this costs.** The deferred set includes the project's three headline
governance claims: AI that explains (F7, F8), a named approving official (F11, F14), and a
permanently defensible audit record (F12, F20). This build demonstrates the *validation and review*
spine that those claims sit on top of; it does not demonstrate the claims themselves. If the
walkthrough in front of CBP stakeholders is the actual deliverable, read the graduation path below
before accepting this decision — an 8-feature express build cannot carry a 10-step governed
narrative, and no selection of 8 features would have.

## Graduation path

Express trades breadth for speed, and this spec is too large for that trade to be invisible. Two
routes forward:

1. **Accept this decision** and get the validation-and-review spine running end-to-end quickly, then
   commission the AI, approval-chain and audit layers as follow-on express runs (each of which can
   itself take up to 8 features — the deferred 15 fit comfortably in two further runs).
2. **Use the standard phase route instead.** Every one of the 23 features stays in scope; the build
   is planned in sequenced phases rather than one wave. Given that all 10 walkthrough steps are the
   stated acceptance criterion (PRD §3.2) and all 23 features are declared in scope for the first
   demo (PRD §9.1), this is the honest recommendation if the full narrative must ship. This decision
   does not block that route — it applies only to the express run.

## Open Questions

```yaml
- id: SCOPE-Q1
  source: scope-decision
  header: "MVP slice"
  question: "This spec is much larger than an express build fits, so I can build 8 of its 23 features and I'm building one slice of the demo walkthrough end-to-end. All four slices below cost the same 8 features and all give you a working queue, a shipment detail screen and something a human authors — they differ in which part of the story the demo tells. I picked review-and-decide. Keep it, or tell the story differently?"
  options:
    - "Keep: review and decide"
    - "Swap: AI summary focus"
    - "Swap: document resolve loop"
    - "Swap: full audit trail"
  default: "Keep: review and decide"
  affects: [F4, F6, F7, F9, F10, F12]
  can_widen_scope: false
```

Option detail, for the record — each is exactly 8 features and each satisfies the create→view check:

- **Keep: review and decide** — F0, F2, F3, F4, F5, F9, F17, F18. Configurable rules fire, evidence
  is shown, the human decides with justification. Walkthrough steps 1, 2, 4 and the authoring half
  of 8.
- **Swap: AI summary focus** — F4 out, F7 in. The plain-language AI explanation of why a shipment was
  flagged becomes the centrepiece (walkthrough step 3); rule logic ships hardcoded inside F5 rather
  than as administrator-owned configuration.
- **Swap: document resolve loop** — F4 and F9 out, F10 and F6 in. The demo shows the missing-document
  arc: request the document, upload it, revalidate, and watch the exception clear while other
  exceptions persist (walkthrough steps 5, 6, 7). The most visually convincing slice; no
  decision-authoring step.
- **Swap: full audit trail** — F4 out, F12 in. The human decision is recorded into an append-only,
  fully attributed audit record (walkthrough step 10's substance), at the cost of configurable rules.

## Notes

- All 23 discoverable feature IDs (F0–F22) are accounted for in exactly one of the two lists: 8
  included, 15 excluded.
- `scope metrics` returned no warnings. Every `Feature Ref:` resolved against the PRD/RTM feature
  index, and priorities parsed on all 80 stories, so no conservative fallback inflated the count.
- Step 7's gap rule produced no exclusions: `prd_has_gaps` is `false` and the 2 counted gap markers
  are incidental matches in RTM traceability tables, touching none of the 8 selected features. No
  feature was excluded as `unresolved-gap`, and no gap question was raised.
- `reduction_effective` is `true`: 15 features were genuinely deferred. The Step 9 `nfr_flags` valve
  does not apply here and was not used — `size_trip` fired independently and was reducible.
