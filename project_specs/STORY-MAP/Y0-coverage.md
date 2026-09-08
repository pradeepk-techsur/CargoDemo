## Coverage Analysis

### Persona Coverage

| Persona | R1 | R2 | R3 |
|---------|----|----|-----|
| **PER-01** Marisol Reyes (Cargo Specialist) | US-0.5, US-1.1, US-1.2, US-1.3, US-1.5, US-1.6, US-2.1, US-2.4, US-3.1, US-3.2, US-3.4, US-3.5, US-3.6, US-3.7, US-4.1, US-4.2, US-4.4, US-5.1, US-8.2, US-9.1, US-9.2, US-9.4, US-9.5, US-9.6, US-9.7, US-11.2, US-11.3, US-11.4, US-11.5, US-11.6, US-11.7, US-11.8 | — | — |
| **PER-02** Dwayne Okafor (Supervisor) | US-1.7, US-2.5, US-3.3, US-5.2, US-5.3, US-6.1, US-6.4, US-6.5, US-7.1, US-8.3, US-9.3, US-9.8, US-11.9, US-12.2, US-12.5 | US-5.4, US-5.5 | — |
| **PER-03** Priya Raghavan (System Administrator) | US-0.1, US-0.2, US-2.3, US-4.3, US-8.1, US-10.1, US-10.3, US-10.4, US-12.6 | US-0.3, US-8.5, US-8.6, US-10.5 | — |
| **PER-04** Angela Pruitt (observer, no account) | US-0.4, US-1.4, US-2.2, US-4.5, US-6.2, US-6.3, US-6.6, US-7.2, US-8.4, US-9.9, US-10.2, US-11.1, US-11.10, US-11.11, US-12.1, US-12.3, US-12.4, US-12.7 | — | — |

**Journey completeness per release:**

| Journey | R1 | R2 |
|---|---|---|
| JRN-01.1 The canonical 10-step walkthrough | ✅ complete (all 10 stages) | — |
| JRN-01.2 Shift start | ✅ complete (Arrive, Survey, Narrow, Choose, Re-enter) | — |
| JRN-01.3 Unhappy path — refused upload, escalation | ✅ complete | — |
| JRN-01.4 Defending a past decision | ✅ complete (Locate, Replay, Verify authorship, Answer) | — |
| JRN-02.1 The approval sweep | ⚠️ approve path and blocked-self-approval only | ✅ completed by US-5.4, US-5.5 |
| JRN-02.2 A clearance is challenged | ✅ complete (Retrieve → Hand it over) | — |
| JRN-03.1 Changing what gets flagged | ⚠️ boundary enforcement only (US-12.6) | ✅ completed by US-8.5, US-8.6 |
| JRN-03.2 Twenty minutes before the stakeholders arrive | ⚠️ Start, Reset, Verify, Hand over | ✅ completed by US-10.5 (Pre-flight, Judge the degradation) |
| JRN-04.1 Watching the ten steps | ✅ complete (all 8 stages) | — |
| JRN-04.2 Going off script | ⚠️ 5 of 6 stages | ✅ completed by US-8.5, US-8.6 (Watch a policy change) |

Every persona can complete at least one journey end-to-end in R1: PER-01 (JRN-01.1, JRN-01.2, JRN-01.3,
JRN-01.4), PER-02 (JRN-02.2 and steps 9–10 of JRN-01.1), PER-03 (JRN-03.2 less pre-flight), PER-04 (JRN-04.1).

### JTBD Coverage

| JTBD ID | Release | Stories | NaC Count |
|---------|---------|---------|-----------|
| JTBD-01.1 | R1 | US-9.2, US-9.3, US-9.4, US-11.1 | 4 |
| JTBD-01.2 | R1 | US-1.1, US-1.2, US-1.3, US-9.5, US-11.2, US-11.3 | 3 |
| JTBD-01.3 | R1 | US-1.4, US-1.5, US-2.1, US-2.4, US-11.4 | 4 |
| JTBD-01.4 | R1 | US-1.6, US-3.2, US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-9.6, US-11.5, US-11.6, US-11.7 | 5 |
| JTBD-01.5 | R1 | US-3.1, US-3.3, US-3.4, US-3.5, US-3.6, US-3.7, US-5.1, US-9.7, US-11.8, US-12.5 | 4 |
| JTBD-01.6 | R1 | US-6.1, US-6.3, US-6.4, US-12.4 | 2 |
| JTBD-02.1 | R1 | US-5.2, US-8.3 | 2 |
| JTBD-02.2 | R1 partial → R2 | US-1.7, US-2.5, US-9.8 (R1); US-5.4, US-5.5 (R2) | 5 |
| JTBD-02.3 | R1 | US-2.2, US-6.4 | 2 |
| JTBD-02.4 | R1 | US-5.3, US-8.4, US-11.9, US-12.2, US-12.3 | 4 |
| JTBD-02.5 | R1 | US-6.1, US-6.2, US-6.5, US-7.1, US-7.2, US-11.10 | 4 |
| JTBD-03.1 | R2 | US-8.5 | 1 |
| JTBD-03.2 | R2 | US-8.5, US-8.6 | 2 |
| JTBD-03.3 | R1 partial → R2 | US-2.3 (R1); US-10.5 (R2) | 2 |
| JTBD-03.4 | R1 partial → R2 | US-0.1, US-0.2, US-0.4, US-10.4 (R1); US-0.3 (R2) | 3 |
| JTBD-03.5 | R1 | US-0.5, US-8.1, US-8.2, US-12.6 (R1); US-8.6 (R2) | 3 |
| JTBD-04.1 | R1 | US-9.1, US-9.9, US-10.3, US-11.1–US-11.11, US-0.4 | 3 |
| JTBD-04.2 | R1 | US-9.7, US-12.1 | 2 |
| JTBD-04.3 | R1 | US-1.7, US-2.2, US-6.1, US-6.6, US-9.6, US-11.10 | 3 |
| JTBD-04.4 | R2 | US-8.5, US-8.6 | 1 |
| JTBD-04.5 | R1 | US-4.5, US-7.2, US-8.1, US-10.1, US-10.2, US-10.3, US-12.7 | 3 |

**All 21 jobs have at least one story and at least one NaC.** 16 are fully served in R1, 5 in R2
(JTBD-03.1, JTBD-03.2, JTBD-04.4 wholly; JTBD-02.2 and JTBD-03.3 completed there).

### Gap Analysis

**JTBD outcomes with no story:** none. All 21 jobs (JTBD-01.1 … JTBD-04.5) map to at least one story.

**Journey stages with no story coverage:** none. All 60 stages across the ten journeys map to at least one
story. Six stages are R2-only and are listed explicitly in the journey-completeness table above:
JRN-02.1:Adjudicate #1, JRN-02.1:Adjudicate #2 — approve (the evidence-changed sub-behaviour only),
JRN-03.1:Inspect the rule set / Attempt a malformed edit / Make the real change / Preview the impact /
Confirm by revalidation, JRN-03.2:Pre-flight and Judge the degradation (health-check half),
JRN-04.2:Watch a policy change.

**Orphan stories (not mapped to any journey stage or backbone lane):** **none — 0 of 80.** Every story in
`UserStories-CargoDemo.md` appears exactly once in the Story Map Matrix. Placement count reconciles:
8 + 7 + 2 + 3 + 6 + 3 + 4 + 4 + 3 + 4 + 10 (backbone, 54) + 9 + 3 + 2 + 4 + 1 + 3 + 2 + 2 (supporting, 26) = **80**.

**Personas without a journey mapped in a release:** none. PER-04 is an observer with no system account, so
her stories are observation and interrogation stories (US-11.1, US-11.10, US-11.11, US-12.x) delivered
through the four screens rather than through an account — she is served in R1 without ever logging in.

**Watch items rather than gaps:**

1. **JTBD-02.2 is partial in R1** (approve path only). A supervisor who disagrees with a recommendation has
   no in-product route to return it until US-5.4 ships. Pull US-5.4 forward if the session will probe
   disagreement. *(Recorded in R2's release notes.)*
2. **JTBD-04.4 lands entirely in R2.** The "who owns the rules after you leave" question — PER-04's
   procurement question, and the moment JRN-04.2 identifies as decisive — is not answerable in R1. R1
   proves rules are *configuration* (US-0.1, US-1.4) and that the rule endpoints are role-protected
   (US-12.6), but the live change in front of her requires US-8.5.
3. **Three P0 stories sit in R2** (US-0.3, US-5.4, US-5.5) and three P1 stories sit in R1 (US-7.1, US-7.2,
   US-10.4). Both deviations are deliberate consequences of using the walkthrough rather than priority as
   the release backbone, and both are recorded in the release notes above.
4. **Epic 12 has no journey of its own** by design — every negative story is anchored to the stage where a
   persona probes it (JRN-01.3:Escalate, JRN-02.1:Confirm the structure holds, JRN-03.1:Hit her own
   boundary, JRN-04.1:Probe for autonomy, JRN-04.2:Check the boundary). No negative is unobserved.

---
