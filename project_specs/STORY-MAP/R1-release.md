## Release Planning

### Release R1: The Demo Release — All Ten Steps, Live, and Every Governance Negative

**Theme:** the walkthrough runs end-to-end in front of PER-04 against seeded data, and every claim made
while it runs is enforced rather than narrated. R1 is scoped by one test: *if this story were absent, would
one of the ten steps fail, or would a governance claim be disprovable in the room?*

**Stories (74):**

| Lane | Stories |
|---|---|
| Step 0 — Foundation | US-0.1, US-0.2, US-0.4, US-0.5, US-8.1, US-8.2, US-8.3, US-9.1 |
| Step 1 — Exception Queue | US-11.1, US-9.2, US-9.4, US-1.1, US-1.2, US-1.3, US-1.4 |
| Step 2 — Open the shipment | US-11.2, US-9.5 |
| Step 3 — AI summary | US-11.3, US-2.1, US-2.2 |
| Step 4 — Rule and evidence | US-11.4, US-1.5, US-2.4, US-3.1, US-3.7, US-9.7 |
| Step 5 — Request the document | US-11.5, US-3.2, US-4.1 |
| Step 6 — Upload the document | US-11.6, US-4.2, US-4.5, US-4.4 |
| Step 7 — Revalidate | US-11.7, US-1.6, US-1.7, US-9.6 |
| Step 8 — Recommend clearance | US-11.8, US-5.1, US-2.5 |
| Step 9 — Supervisor approves | US-11.9, US-5.2, US-5.3, US-9.8 |
| Step 10 — Audit trail | US-11.10, US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6, US-9.9, US-7.1, US-7.2 |
| Governance negatives | US-3.6, US-8.4, US-12.1, US-12.2, US-12.3, US-12.4, US-12.5, US-12.6, US-12.7 |
| Proof by test | US-10.1, US-10.2, US-10.3 |
| Off-script resilience | US-11.11, US-2.3 |
| Unhappy path | US-4.3, US-3.4, US-3.5, US-3.3 |
| Shift start | US-9.3 |
| Demo operations | US-10.4 |

**Personas Served:** PER-01 (full JRN-01.1 and JRN-01.3, and JRN-01.2 except nothing — all stages served),
PER-02 (JRN-01.1 steps 9–10, JRN-02.2 in full, JRN-02.1 approve-path only), PER-03 (JRN-03.2 start/reset/verify),
PER-04 (JRN-04.1 in full, JRN-04.2 except the live rule change).

**JTBD Addressed:** JTBD-01.1, JTBD-01.2, JTBD-01.3, JTBD-01.4, JTBD-01.5, JTBD-01.6, JTBD-02.1,
JTBD-02.3, JTBD-02.4, JTBD-02.5, JTBD-03.4, JTBD-03.5, JTBD-04.1, JTBD-04.2, JTBD-04.3, JTBD-04.5
(16 of 21 fully; JTBD-02.2 partially — approve path only; JTBD-03.3 partially — fallback yes, health check in R2).

#### Four Primary Screens — First-Class Release 1 Deliverables

The PRD's stated failure mode is "UI treated as an afterthought behind a working API" (§8, risk 4). Each of
the four screens is therefore confirmed below as an R1 deliverable in its own right, not as a by-product of
the API stories.

| Screen | Feature | Delivering stories (all R1) | Backbone steps it carries | Confirmed |
|--------|---------|------------------------------|---------------------------|-----------|
| Screen 1 — **Cargo Exception Queue** | F17 | US-9.2, US-9.3, US-9.4, US-11.1, US-5.2, US-11.11 | Steps 1 and 9 (pending-approval filter) | ✅ R1 |
| Screen 2 — **Shipment Review** | F18 | US-9.5, US-9.6, US-11.2, US-11.3, US-2.1, US-4.5 | Steps 2, 3, 6 and 7 | ✅ R1 |
| Screen 3 — **Recommended Resolution** | F19 | US-9.7, US-9.8, US-11.4, US-2.4, US-3.1, US-3.7 | Steps 4, 5, 8 and 9 | ✅ R1 |
| Screen 4 — **Decision & Audit Record** | F20 | US-9.9, US-11.10, US-6.4, US-6.5, US-7.2 | Step 10 | ✅ R1 |
| Supporting — application shell, navigation, role switcher | F16 | US-9.1, US-8.1 | Frames all ten steps | ✅ R1 |

All four screens are in R1. No walkthrough step is delivered by an API-only path, and each screen has at
least one story whose acceptance criteria are stated in terms of what renders on it.

**Acceptance Gate:**
- [ ] All NaC for included stories pass
- [ ] 10 of 10 walkthrough steps complete end-to-end in the preview environment with zero manual data entry and zero developer intervention (PRD §7)
- [ ] All four primary screens are navigable in any order and each has loading, empty and error states
- [ ] The canonical solar-panel shipment flags all 3 expected exceptions on first ingestion
- [ ] After the simulated upload: exactly 1 exception resolved, 2 retained, round-trip <2s
- [ ] 0 shipments reach `CLEARED` without a recorded approving official distinct from the recommender
- [ ] 0 AI-initiated actions across a full session
- [ ] 100% of finalised decisions carry all 8 required audit fields; 0 finalisable with a field missing
- [ ] Self-approval, administrator adjudication and non-administrator rule editing are each rejected server-side **and recorded**
- [ ] The full walkthrough completes with the AI provider disabled, with the fallback labelled
- [ ] 3 consecutive post-reset walkthroughs produce identical results
- [ ] Test suite green across rule, workflow-transition, RBAC and audit-completeness claims plus the end-to-end ten-step run
- [ ] 0 instances of real or personally identifiable data in seed data, fixtures, logs or prompts

**Deliberate priority deviations in R1:** three P1 stories are pulled into R1 because the walkthrough
depends on them — US-7.1 and US-7.2 (steps 5, 9 and 10 each require a generated notification, displayed
inline and labelled "Generated, not transmitted") and US-10.4 (single-command start and one-action reset,
without which the walkthrough cannot be run or repeated).

---
