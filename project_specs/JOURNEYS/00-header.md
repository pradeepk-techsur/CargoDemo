# User Journeys
## CargoDemo — Governed Cargo Exception Handling

| Field | Value |
|-------|-------|
| **Product Name** | CargoDemo |
| **Project Acronym** | CargoDemo |
| **Document Version** | 1.0 |
| **Date** | 2026-09-08 |
| **Related Personas** | PERSONAS-CargoDemo.md (PER-01 … PER-04) |
| **Related JTBD** | JTBD-CargoDemo.md (JTBD-01.1 … JTBD-04.5) |
| **Related PRD** | PRD-CargoDemo.md (§3.2 Walkthrough, §5 Features, §6 NFRs, §7 Success Metrics) |
| **Source of Truth** | `.planning/PROJECT.md` |
| **Downstream Documents** | STORY-MAP-CargoDemo, UserStories-CargoDemo, UX design |

**Reading notes:**

- **The four screens are the only touchpoints that matter.** Every touchpoint below names one of them — **Cargo Exception Queue (F17)**, **Shipment Review (F18)**, **Recommended Resolution (F19)**, **Decision & Audit Record (F20)** — plus the shell (F16) and the two supporting administrative surfaces (F15 Rule Administration, F22 Demo Environment & Reset). Nothing is resolved in email, a spreadsheet, or a side channel; that is the point of the product.
- **Stage tables carry an eighth column, `System Response`,** so each step records what the application did in reply, not only what the human did. The seven standard columns are unchanged and in their standard order.
- **Persona naming.** The seeded demo users `usr-cs-001`, `usr-sup-001` and `usr-adm-001` **are** PER-01, PER-02 and PER-03: FRD F2 §Seeded users seeds them as Marisol Reyes, Dwayne Okafor and Priya Raghavan, so the names narrated in the walkthrough are the names the queue and the audit record display. Two further seeded users exist for paths the personas cannot cover alone — `usr-cs-002` Marcus Hale (hand-off) and `usr-sup-002` Ronald Pike (a distinct approver for a supervisor-authored recommendation, F11 SoD-2). This document uses the persona names throughout, and the seeded user IDs where identity enforcement is the point.
- **PER-04 has no account.** Angela's journey has touchpoints in the sense of *what she watches on someone else's screen and what she asks them to prove*. Her "Action" column is observation and interrogation, never operation.
- **Canonical scenario used in JRN-01.1, JRN-02.1 and JRN-04.1:** shipment `SHP-2026-0007`, importer Helios Grid Supply, solar panels, derived priority **Critical**, declared `country_of_origin = "Malaysia"`, `manufacturer.address.country = "China"`, `hts_code = "8541.40"` (incomplete against a 10-digit expectation), `shipment_value = 85,000 USD`, required `CERTIFICATE_OF_ORIGIN` missing. Three exceptions fire at evaluation v1: **origin conflict**, **incomplete HTS**, **missing document**. After the certificate upload and revalidation at v2, **exactly one exception resolves (missing document) and two are retained (origin conflict, incomplete HTS)**.

---

## Journey Index

| ID | Persona | Scenario | Key JTBD | Stages |
|----|---------|----------|----------|--------|
| JRN-01.1 | PER-01 → PER-02 | **The canonical 10-step walkthrough** on `SHP-2026-0007`, from queue to cleared, with the specialist → supervisor handoff at step 8→9 | JTBD-01.2, JTBD-01.3, JTBD-01.4, JTBD-01.5, JTBD-02.2 | 10 |
| JRN-01.2 | PER-01 | Shift start — ordering 20–40 flagged entries and choosing what to work first | JTBD-01.1 | 5 |
| JRN-01.3 | PER-01 | **Unhappy path** — the uploaded document is rejected, the second upload does not resolve the exception, and Marisol escalates instead of recommending clearance | JTBD-01.4, JTBD-01.5 | 7 |
| JRN-01.4 | PER-01 | Defending a decision she made months ago against a challenge she cannot remember the case for | JTBD-01.6 | 4 |
| JRN-02.1 | PER-02 | Working the pending-approval list — one rejection, one approval, one blocked self-approval attempt observed | JTBD-02.1, JTBD-02.2, JTBD-02.3, JTBD-02.4 | 6 |
| JRN-02.2 | PER-02 | A cleared shipment is challenged weeks later and the record has to be produced in one action | JTBD-02.5, JTBD-02.3 | 5 |
| JRN-03.1 | PER-03 | Changing the HTS digit-count rule parameter as configuration, previewing the impact, and hitting her own role boundary | JTBD-03.1, JTBD-03.2, JTBD-03.5 | 7 |
| JRN-03.2 | PER-03 | Pre-demo reset and health check twenty minutes before stakeholders arrive, with AI assistance degraded | JTBD-03.3, JTBD-03.4 | 6 |
| JRN-04.1 | PER-04 *(observer)* | Watching all 10 walkthrough steps over Marisol's and Dwayne's shoulders and judging governance from outside | JTBD-04.1, JTBD-04.2, JTBD-04.3 | 8 |
| JRN-04.2 | PER-04 *(observer)* | Going off script — out-of-sequence navigation, self-approval probe, AI switched off, live rule change, test suite | JTBD-04.1, JTBD-04.2, JTBD-04.4, JTBD-04.5 | 6 |

**Coverage check:** every persona has at least one journey (PER-01 has 4, PER-02 has 2, PER-03 has 2, PER-04 has 2). Every journey maps to at least one JTBD, and all 21 jobs appear in the traceability table at the end of this document.

---
