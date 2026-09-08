
### JRN-01.2: Shift Start — Deciding What to Work Before Working Anything

**Persona:** PER-01 (Marisol Reyes)
**Scenario:** Marisol logs in at the start of a shift with a queue of flagged entries and no sense of which are urgent. Her goal for the next minute is not to resolve anything — it is to establish an order of work she can defend, and to pick the first case without opening five shipments she has no intention of touching. Every shipment she opens speculatively is a minute she does not get back, and the ones that punish her for guessing are the multi-exception, high-value ones that look ordinary in a flat list.
**Related Jobs:** JTBD-01.1

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity | System Response |
|-------|--------|------------|----------|---------|------------|-------------|-----------------|
| Arrive | Selects Cargo Specialist at the simulated login and lands on the queue | Shell / role selector (F16) | "Am I definitely acting as myself, in my own role?" | Neutral, slightly rushed | A role she cannot see is a role she cannot trust to be enforced | Current user and role are always visible in the shell, and the demo-mode indicator makes the simulation boundary explicit | Session established with a named acting user; role-aware navigation hides administrator surfaces entirely |
| Survey | Scans the full list of flagged shipments without opening any | Cargo Exception Queue (F17) | "How bad is today, and is anything screaming?" | Assessing | A flat arrival-ordered list forces her to open entries to discover severity | Every row carries ID, importer, exception type, priority and status, so severity is legible without a click | Queue renders in <1s; multi-exception shipments are marked as such rather than collapsed to one headline problem |
| Narrow | Filters to Critical and High priority and sorts by age | Cargo Exception Queue (F17) → filter/sort controls | "Old and high-priority first. Anything aging in Awaiting Information I need to chase, not review." | Focused, in control | Cross-referencing three spreadsheets to estimate what is aging | Filter by status, exception type and priority plus sort by priority and age, all on the list itself | Filtered view returns instantly; status and priority are conveyed by text label as well as color, so the distinction survives a color-blind reader and a projector |
| Choose | Selects `SHP-2026-0007` — highest priority, three exceptions, $85,000 | Cargo Exception Queue (F17) | "Three exceptions and high value. That one gets my fresh attention, not my tired attention." | Decided | Choosing badly at 8am costs the whole morning | Multi-exception chips make the highest-consequence case self-identifying | Row selection opens Shipment Review for that shipment (this is where JRN-01.1 begins) |
| Re-enter | Later in the shift, returns to the queue after acting on a case and finds it in its new status without reloading | Cargo Exception Queue (F17) | "Did my last action actually land, or am I looking at a stale list?" | Mildly suspicious | Stale lists cause duplicate work and double-requests | The queue reflects state changes made elsewhere in the workflow, so a case she moved to Awaiting Information appears that way immediately | Queue reflects post-action and post-revalidation state; her acted-on case shows its new status and drops out of her Critical-and-High/New filter |

#### Key Moments

- **Decision Point — Choose:** the entire value of the queue screen is realized or lost in this one selection. If she has to open shipments to find out how bad they are, the screen has failed regardless of how it looks.
- **Risk of Abandonment — Survey:** a flat, unprioritized list is indistinguishable from the spreadsheet she already has, and she will go back to the spreadsheet.
- **Delight Opportunity — Re-enter:** seeing her own action reflected without a manual refresh is a small thing that establishes the queue as the source of truth rather than a report.

#### Success Outcome

Marisol selects her next case in **under 15 seconds** without opening any shipment she does not intend to work, and **no multi-exception shipment is ever presented to her as a single-exception case** (JTBD-01.1 success measure; PRD §6 Performance, queue loads in <1s).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Arrive | F16, F14 |
| Survey | F17, F5, F2 |
| Narrow | F17 |
| Choose | F17, F18 |
| Re-enter | F17, F9 |

---
