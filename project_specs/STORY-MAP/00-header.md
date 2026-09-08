# User Story Map
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related Personas** | PERSONAS-CargoDemo.md (PER-01 … PER-04) |
| **Related Journeys** | JOURNEYS-CargoDemo.md (JRN-01.1 … JRN-04.2) |
| **Related JTBD** | JTBD-CargoDemo.md (JTBD-01.1 … JTBD-04.5) |
| **Related User Stories** | UserStories-CargoDemo.md (US-0.1 … US-12.7, 80 stories, 13 epics) |
| **Related PRD** | PRD-CargoDemo.md (§3.2 Walkthrough, §5 Features, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |

---

## Overview

This map organises all **80 existing user stories** from `UserStories-CargoDemo.md` into a two-dimensional
backbone. No new stories are created here; every story is placed, and every placement carries a Natural
Acceptance Criterion (NaC) traced to a JTBD outcome.

**The horizontal backbone is the canonical 10-step demo walkthrough (JRN-01.1 / PRD §3.2), not a feature
taxonomy.** That is a deliberate choice: the walkthrough *is* the product's primary acceptance criterion
(PER-04's judgment, PRD §3.2, §7 "Walkthrough completion"), so the lane a story sits in answers the only
question that matters for sequencing — *which of the ten steps fails without it?*

**Lanes in this map:**

| Lane group | Lanes | Purpose |
|---|---|---|
| Backbone | Step 0 (foundation) → Step 10 | The 10-step walkthrough in order, plus the pre-step foundation it stands on |
| Governance | Governance Negatives, Proof by Test | What the system must **refuse**, and the tests that hold the refusals true |
| Resilience | Off-Script Resilience, Unhappy Path, Shift Start | The paths PER-04 probes when the script ends |
| Later | Adjudication Depth, Rule Administration, Demo Operations (partial) | Not required by the ten steps or the negatives |

**Release rule applied throughout:**

- **R1 — The Demo Release.** Everything required to make the ten walkthrough steps run end-to-end, plus
  every governance negative and the tests that assert them. 74 stories.
- **R2 — The Full Evaluation Session.** Capability that a stakeholder session needs beyond the scripted
  ten steps: supervisor rejection depth, live rule administration, and pre-flight operability. 6 stories.
- **R3 — Explicitly Out of Scope.** Deliberately empty. PRD §5.8 exclusions are recorded decisions, not
  deferred work.

### What a NaC is here

A Natural Acceptance Criterion is not invented for this document. Each one is the intersection of three
things that already exist upstream:

1. a **JTBD outcome** — what the persona is trying to achieve (the "what matters"),
2. a **journey stage** — the moment in JRN-XX.N where that outcome is either met or lost (the "when"),
3. a **user story** — the thing being built (the "what").

So `JTBD-01.4` ("close a documentation gap inside the case") applied to `JRN-01.1:Step 7` (revalidation)
produces the NaC *"exactly 1 exception resolves and 2 are retained, stated on screen, round-trip <2s"* —
which is testable, and which US-11.7 must satisfy. A criterion that cannot be traced back to a JTBD
outcome does not appear in this map.

---
