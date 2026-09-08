
### JRN-03.2: Twenty Minutes Before the Stakeholders Arrive

**Persona:** PER-03 (Priya Raghavan)
**Scenario:** A walkthrough is scheduled in twenty minutes, and the previous run left the environment used — documents uploaded, cases cleared, statuses moved. Priya's job is to hand the presenters an environment that behaves exactly as it did the first time, and to know before the audience does whether anything is degraded. She restarts, runs one pre-flight check, discovers that AI assistance is running in offline-fallback mode, decides that is acceptable because the fallback is labeled and the walkthrough completes without the provider, resets to pristine seeded state, and verifies the canonical solar-panel scenario is present verbatim before she hands over.
**Related Jobs:** JTBD-03.3, JTBD-03.4

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Start | Starts the application with a single command and opens the preview URL | Demo Environment (F22) → shell (F16) | "One command, same port, same URL as last week — or I'm re-sending links five minutes before we begin." | Businesslike | Demo environments that need manual setup and never come up the same way twice | Single-command start bound to a deterministic port, so the preview URL is stable across restarts and embeddable | Application starts clean; frontend and API served in one preview session on the deterministic port |
| Pre-flight | Runs the health check | Demo Environment (F22) → health check | "Database, seed, AI — one answer, not three places to look." | Focused | Finding out mid-demonstration that AI assistance is degraded, in front of the audience | A single pre-flight signal covers database availability, seed data presence, and AI-assist availability including fallback status | Health check reports database available, seed data present, and **AI assist: offline-fallback** with the fallback status stated explicitly |
| Judge the degradation | Reads the fallback status and decides to proceed rather than scramble | Demo Environment (F22) → degradation banner | "Fallback, labeled, deterministic. That's a talking point, not a failure." | Composed, mildly relieved | Discovering a dependency problem with no time and no options | Degradation is a labeled, expected mode rather than an outage: the walkthrough completes with the provider disabled | A graceful-degradation banner is displayed in the application before and during the run, stating that AI assistance is running in offline-fallback mode |
| Reset | Triggers the one-action reset to pristine seeded state | Demo Environment (F22) → reset control | "Back to zero without touching the database. Last run's uploads and clearances have to be gone." | Decisive | Cleaning up demo state by hand or editing the database between runs | One action, from an administrative surface, with no manual database intervention | Environment reset to pristine seeded state; prior session's documents, decisions, approvals and audit entries removed; deterministic IDs and timestamps reproduced identically |
| Verify the canonical case | Opens the queue and checks `SHP-2026-0007` presents verbatim | Cargo Exception Queue (F17) → Shipment Review (F18) | "Solar panels, Malaysia against China, incomplete HTS, $85,000, certificate missing, three exceptions. Exactly that." | Attentive | A repeat walkthrough that is never quite identical to the first, so nothing can be compared | Deterministic seeding means the canonical scenario is present verbatim on every run | Canonical shipment present with the specified attributes and **all 3 expected exceptions on first ingestion**; all three exception types and all queue statuses represented across the seeded set, including a multi-exception shipment and a pre-cleared shipment with a complete historical record |
| Hand over | Confirms the demo-mode indicator is visible and that no real or identifiable data is present anywhere, then hands the environment to the presenters | Shell (F16) → Demo Environment (F22) | "Nobody in that room should mistake this for production, and nothing in it should belong to a real importer." | Confident | Stakeholders reading a demo as production-ready, or synthetic data quietly containing something real | Simulated-login labeling, generated-not-transmitted notifications and a visible demo-mode indicator make the simulation boundary explicit at every point it is encountered | Demo-mode indicator visible in the shell; **0 instances of real or personally identifiable data** in seed data, fixtures, logs or AI prompts |

#### Key Moments

- **Decision Point — Judge the degradation:** whether the walkthrough proceeds. The value of the pre-flight check is entirely in giving her this decision before the audience is in the room rather than during step 3.
- **Delight Opportunity — Reset:** returning to a byte-identical starting state in one action is what makes three consecutive comparable walkthroughs possible at all.
- **Risk of Abandonment — Verify the canonical case:** if the seeded scenario drifts by even a field, the presenters' narration stops matching the screen and the demo loses the room.
- **Trust-Building Moment — Hand over:** the demo-mode indicator is a small piece of UI carrying a disproportionate amount of the product's credibility with an evaluator.

#### Success Outcome

Priya confirms database, seed data and AI-assist status in **a single pre-demo check**, and the full walkthrough completes successfully **with the AI provider disabled and the fallback clearly labeled** (JTBD-03.3, PRD §7 AI availability resilience). **3 consecutive full walkthroughs after reset produce identical results**, with the canonical solar-panel shipment flagging all 3 expected exceptions on first ingestion and **0 instances of real or personally identifiable data** anywhere in the environment (JTBD-03.4, PRD §7 Walkthrough repeatability, Data safety).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Start | F22, F16 |
| Pre-flight | F22, F7, F0 |
| Judge the degradation | F22, F7, F8 |
| Reset | F22, F2, F0 |
| Verify the canonical case | F17, F18, F2, F5 |
| Hand over | F16, F22, F13, F14 |

---
