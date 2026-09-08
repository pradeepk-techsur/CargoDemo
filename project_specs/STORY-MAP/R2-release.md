### Release R2: The Full Evaluation Session — Adjudication Depth, Owned Policy, Pre-Flight

**Theme:** everything a real stakeholder session needs *after* the scripted ten steps have run. R2 closes
the two jobs R1 leaves partial (JTBD-02.2 rejection depth, JTBD-03.3 pre-flight) and delivers the one
question PER-04 asks that the walkthrough itself never answers — *who owns the rules after you leave?*

**Stories (6):** US-5.4, US-5.5, US-8.5, US-8.6, US-10.5, US-0.3

| Story | Why it is not in R1 | Journey it completes |
|---|---|---|
| US-5.4 Reject or return a recommendation with a reason | Step 9 of the walkthrough is an approval; rejection is off the backbone | JRN-02.1:Adjudicate #1 |
| US-5.5 Evidence-changed warning and acknowledgement | The canonical case is approved at the same evaluation version it was recommended at | JRN-02.1:Adjudicate #2 — approve |
| US-8.5 Manage business rules as configuration | Rules are already persisted configuration in R1 (US-0.1, US-1.4) and the rule endpoints are already RBAC-protected (US-12.6); the **editing surface** is not on the ten steps | JRN-03.1:Inspect / Attempt / Make the real change |
| US-8.6 Preview and audit the effect of a rule change | Depends on US-8.5 | JRN-03.1:Preview / Confirm / Verify attribution; JRN-04.2:Watch a policy change |
| US-10.5 Pre-demo health check | The walkthrough runs without it; it exists to protect the *presenter*, not the narrative | JRN-03.2:Pre-flight, Judge the degradation |
| US-0.3 Local ingestion endpoint | The walkthrough ingests from the seeded cargo-entry JSON file (US-0.2) | JRN-03.2 (re-ingestion), PRD F1 second interface |

**Personas Served:** PER-02 (JRN-02.1 in full), PER-03 (JRN-03.1 in full, JRN-03.2 in full),
PER-04 (JRN-04.2:Watch a policy change).

**JTBD Addressed:** JTBD-02.2 (completed), JTBD-03.1, JTBD-03.2, JTBD-03.3 (completed), JTBD-04.4.

**Acceptance Gate:**
- [ ] All NaC for included stories pass
- [ ] Release extends journey depth without breaking any of the ten backbone steps — the R1 end-to-end test still passes unchanged
- [ ] A rule parameter is changed live and the effect on validation is visible with 0 code changes and 0 redeploys
- [ ] 100% of malformed rule configurations are rejected on save with a message naming what was invalid, and the prior rule set remains in effect
- [ ] 100% of rule changes appear in the audit trail attributed to a named administrator with a timestamp
- [ ] A single health check reports database, seed data and AI-assist status including fallback mode
- [ ] Rejection returns the case to its author with a reason code and justification; exceptions remain `OPEN`

**Deliberate priority deviations in R2:** three P0 stories are held out of R1 — US-0.3, US-5.4 and US-5.5.
Each is P0 because its parent feature (F1, F11) is demo-critical, but none of the three is exercised by any
of the ten walkthrough steps or by any governance negative. They are sequenced second by the backbone rule
stated in the Overview, and the rationale is recorded here rather than left implicit. **Watch item:** until
R2 ships, PER-02's JTBD-02.2 is served on the approve path only — a supervisor who disagrees with a
recommendation has no in-product route to return it. If a stakeholder session is likely to probe
disagreement, US-5.4 should be pulled forward into R1.

---

### Release R3: Explicitly Out of Scope — Deliberately Empty

**Stories:** none. R3 exists to record that the remaining surface is a set of decisions, not a backlog.

| Excluded capability | Status | Recorded in |
|---|---|---|
| Live ACE integration | ⛔ Not deferred — excluded; simulated via cargo-entry JSON / local API (US-0.2, US-0.3) | PRD §5.8, PROJECT.md Constraints |
| A fourth exception type (valuation fraud, sanctions screening, tariff engineering) | ⛔ Excluded; exactly three types, asserted by US-12.7 | PRD §5.8 |
| Real importer/carrier data or any PII | ⛔ Excluded; synthetic only, asserted by US-0.4 and US-12.7 | PRD §5.8 |
| Production authentication (PIV/CAC, SSO) | ⛔ Excluded; simulated login (US-8.1) | PRD §5.8 |
| Real outbound email/SMS delivery | ⛔ Excluded; generated-not-transmitted (US-7.1, US-7.2, US-12.7) | PRD §5.8 |
| Machine-learning model training | ⛔ Excluded; request-time generation only (US-2.1, US-2.4) | PRD §5.8 |
| Mobile-native applications | ⛔ Excluded; responsive web only | PRD §5.8 |
| Multi-port / multi-tenant configuration | ⛔ Excluded; single-tenant, deterministic port (US-10.4) | PRD §5.8 |
| Screens beyond the four primary screens | ⛔ Excluded by constraint; F15 and F16 exist only to support the four | PRD §5.8, PROJECT.md |
| Autonomous clearance or any AI-initiated action | ⛔ Excluded by governance constraint; asserted by US-12.1, US-12.3 | PRD §5.8 |
| Background / async jobs, schedulers, queues, webhooks | ⛔ Excluded; all processing is request-time, asserted by US-12.1 | PRD §5.9 |

No story in `UserStories-CargoDemo.md` maps to any row above, which is the intended result: the exclusions
are enforced by the Epic 12 negatives rather than parked as future work.

---
