# Roadmap: CargoDemo

## Overview

CargoDemo is judged by a live 10-step walkthrough (PRD §3.2 / JRN-01.1), so the roadmap is sequenced by that walkthrough rather than by technical layer. Phase 1 stands up the single-process app inside the sandboxed preview with deterministic seeded data, a role-enforcing API and the schema-level governance constraints — the only phase without a stakeholder-visible screen. From Phase 2 onward every phase adds walkthrough steps and leaves the app in a state that can be shown to a CBP stakeholder: Phase 2 makes steps 1–3 live (queue, review, AI explanation), Phase 3 makes step 4 live and lands the decision point together with the append-only audit spine, Phase 4 closes the document loop (steps 5–7) and puts the audit trail on screen, Phase 5 completes the walkthrough with the specialist → supervisor approval chain and locks all ten steps behind an automated test. Phase 6 is deliberately last and deliberately non-load-bearing: rule administration proves the customer owns the policy after we leave, and if it slipped the demo would still stand.

Two structural rules shaped the phase boundaries. First, the four screens are paired with the backend capability they expose — no phase delivers only internals after Phase 1, and no screen is deferred to a UI phase at the end. Second, the three governance claims are spread across four phases rather than concentrated at the end: server-side RBAC and the schema constraints in Phase 1, AI-explains-never-decides in Phases 2–3, append-only audit in Phase 3, separation of duties in Phase 5.

**Walkthrough demonstrability by phase:**

| After phase | Walkthrough steps live |
|---|---|
| 1 | none (boots seeded and reachable; API and roles only) |
| 2 | 1, 2, 3 |
| 3 | 4 |
| 4 | 5, 6, 7 + step 10 partial (trail up to revalidation) |
| 5 | 8, 9, 10 — **all ten steps end-to-end** |
| 6 | beyond the walkthrough (live rule change) |

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Seeded, Governed, Servable Foundation** - One-command boot in the sandboxed preview with deterministic synthetic data, a role-enforcing API and schema-level governance constraints
- [ ] **Phase 2: The Flagged Shipment, Explained** - Rules and evidence behind a live Exception Queue and Shipment Review screen with a labelled plain-language summary (walkthrough steps 1–3)
- [ ] **Phase 3: The Decision Point** - Recommended Resolution screen with deterministic recommendation, five justified actions, and the append-only audit spine (step 4)
- [ ] **Phase 4: Close the Gap and Show the Record** - Document request, simulated upload, revalidation, and the read-only audit trail on screen (steps 5–7, 10 partial)
- [ ] **Phase 5: Named Authority, Proven** - Specialist → supervisor approval chain, separation of duties, and the automated suite that runs all ten steps (steps 8–10)
- [ ] **Phase 6: The Policy Is Yours** - Rule administration as configuration, changeable live and attributed like any other decision

## Phase Details

### Phase 1: Seeded, Governed, Servable Foundation
**Goal**: The application boots with one command inside the sandboxed preview, already seeded and role-aware, so every later phase and every demo run starts from a known, reproducible state rather than a hand-prepared one.
**Depends on**: Nothing (first phase)
**Requirements**: F0, F1, F2, F3, F14, F22
**Success Criteria** (what must be TRUE):
  1. A single start command runs one process bound to `0.0.0.0:3000` and the app loads inside the sandboxed preview IFRAME — no `X-Frame-Options` and no restrictive `frame-ancestors` block it; the startup schema self-check (append-only audit triggers and the separation-of-duties `CHECK` constraints present) passes, or the process exits non-zero rather than serving a degraded app.
  2. After boot, 10–15 synthetic shipments are present with zero manual data entry — including the canonical solar-panel case verbatim (Malaysia vs. China, incomplete HTS, $85,000, certificate missing), all three exception types, all queue statuses, a multi-exception shipment and a pre-cleared shipment with historical audit — and contain no real or personally identifiable data anywhere.
  3. Two consecutive boots produce byte-identical seed data (same IDs, timestamps and ordering); re-ingesting the same shipment ID updates rather than duplicates; a malformed entry is reported without aborting the batch.
  4. Acting as each of the three roles, a protected operation outside that role is rejected **server-side** with a stated reason rather than merely hidden, and the acting user's name and role are carried on the request.
  5. A reset returns the environment to the pristine seeded state with no manual database intervention, and a second walkthrough-ready boot follows it.
**Plans**: TBD

### Phase 2: The Flagged Shipment, Explained
**Goal**: A stakeholder watching the screen can see the exception queue, open the canonical flagged shipment, and understand in plain language why it was flagged — without the presenter explaining it to them, and with the AI provider switched off.
**Depends on**: Phase 1
**Requirements**: F4, F5, F7, F16, F17, F18
**Success Criteria** (what must be TRUE):
  1. The preview opens on a populated Cargo Exception Queue listing shipment ID, importer, exception, priority and status; the clean seeded shipment is absent; a multi-exception shipment shows all of its exception types rather than one headline; the list filters by status, exception type and priority and sorts by priority and age deterministically.
  2. Selecting a row opens the Shipment Review screen showing importer, carrier, product description, HTS code, country of origin, manufacturer name and address, shipment value, documents received with provenance, and validation results — all on one screen with no navigation away.
  3. The canonical shipment flags all three exception types on first ingestion, each carrying its triggering rule and concrete field-level evidence *values* (e.g. `country_of_origin = "Malaysia"` against `manufacturer.address.country = "China"`), not prose; the same entry plus the same rule configuration always yields the identical exception set, and changing a stored rule parameter changes the outcome with no code change.
  4. A plain-language summary on the review screen states why the shipment was flagged, is visibly labelled AI-generated with provider/model, generation timestamp and evidence inputs, and every claim in it maps to a field or document displayed elsewhere on the same screen.
  5. With the AI provider disabled — the default — the summary still renders from the deterministic fallback, clearly labelled as fallback with a degradation banner; the screen never blocks, errors or empties.
**Plans**: TBD

### Phase 3: The Decision Point
**Goal**: At the point of decision the human sees the triggering rule, the evidence and an advisory recommendation with confidence, and can take any of the five actions with a justification — so no action is ever taken without a stated human reason, and no action is ever taken by the machine.
**Depends on**: Phase 2
**Requirements**: F8, F9, F12, F13, F19
**Success Criteria** (what must be TRUE):
  1. The Recommended Resolution screen shows the exception detected, the triggering rule with its policy reference, the supporting evidence and the missing information — sourced from the exception data, not from the AI text — alongside the recommended action, its confidence level and the stated basis.
  2. The recommended action and confidence are byte-identical with the AI provider enabled and disabled (they are computed deterministically; the provider authors prose only), the screen states plainly that the AI recommends and a named official decides, and no action is pre-selected or auto-submitted.
  3. All five actions are presented together; actions unavailable to the current role or case state are visibly unavailable **with the reason stated**; submitting any action without a justification is rejected server-side.
  4. Every executed action writes exactly one append-only audit entry and exactly one generated (never transmitted) notification in the same transaction, stamped with the acting user and role; there is no application path that edits or deletes an audit entry, and an invalid or unauthorised transition is refused with a reason and the refusal is itself recorded.
  5. Nothing in the running system can execute a workflow action except a human submission — the recommendation is inert until a human acts, and there is no scheduler, queue, webhook or AI path that moves a case.
**Plans**: TBD

### Phase 4: Close the Gap and Show the Record
**Goal**: A specialist can close a documentation gap inside the case — request the missing certificate, upload it, revalidate — and the audit screen replays exactly what happened, so a partially resolved shipment never reads as a clean one and nothing that happened is lost.
**Depends on**: Phase 3
**Requirements**: F6, F10, F20
**Success Criteria** (what must be TRUE):
  1. Requesting the missing document creates one outstanding request bound to the specific exception and the rule that requires it, moves the case to an information-requested state, and is visible on the shipment record itself with requester and timestamp.
  2. Uploading the synthetic fixture offered by the app attaches it against the open request (document type taken from the request, not from client input) and triggers revalidation in the same transaction; a file that fails validation is refused before anything is written — no document row, no revalidation, and the request stays outstanding.
  3. After revalidation the canonical shipment states inline that one exception resolved and two are retained, with the retained evidence still displayed; resolved exceptions are marked resolved-by-revalidation rather than deleted; revalidation never produces a cleared case.
  4. The Decision & Audit Record screen replays every event so far — ingestion, flagging, AI summary and recommendation, document request, upload, revalidation — in chronological order, each attributed to a named actor and role and timestamped, with AI-authored content visually separated from human decisions, notifications shown beside the decisions that produced them, and no edit or delete affordance anywhere on the screen.
  5. The revalidation entry carries the complete before and after exception sets, prior evaluations are retained rather than overwritten, and the whole record exports in a single action as JSON and as a printable view.
**Plans**: TBD

### Phase 5: Named Authority, Proven
**Goal**: Clearance is reachable only through a named supervisor who is not the recommending specialist, and the complete ten-step walkthrough runs green in one automated test — so the governance claims are held by the system and the suite rather than by the presenter's narration.
**Depends on**: Phase 4
**Requirements**: F11, F21
**Success Criteria** (what must be TRUE):
  1. A specialist recommends clearance with a justification and the case moves to pending approval — visibly **not** cleared — and the supervisor reaches it in one filtered step from the queue, where pending-approval work is visually distinct.
  2. Supervisor approval clears the case with the approving official recorded by name; the finalised decision carries all eight required audit fields plus its generated notification, and finalisation is refused outright if any required field is absent.
  3. A specialist attempting to approve their own recommendation is refused server-side, the case never leaves pending approval, and the refusal itself appears in the audit trail; no other path — revalidation, ingestion, reset or any workflow action — can produce a cleared case without a named approving official distinct from the recommender.
  4. One automated test executes all ten walkthrough steps against seeded data **with the AI provider disabled** and fails if any step stops working; the suite additionally covers the three rule types positive and negative, valid and invalid workflow transitions, each role against each protected operation, blocked self-approval, revalidation resolve-one/retain-two, and append-only audit enforcement — and it runs green as a single command.
**Plans**: TBD

### Phase 6: The Policy Is Yours
**Goal**: A System Administrator can change a business rule live and see validation change with no code change and no redeploy, so a stakeholder can see the customer owns the policy after we leave — and the change is attributed and audited like any other decision.
**Depends on**: Phase 5
**Requirements**: F15
**Success Criteria** (what must be TRUE):
  1. The administrator surface lists every rule with its type, severity, enabled state and policy reference, and supports create, edit, enable and disable within the three supported exception types only — a fourth type cannot be introduced through it.
  2. Changing a rule parameter (required document list, HTS expected digit count, origin comparison fields, thresholds, severity) changes validation results on affected shipments during the running session, with zero code changes and zero restarts.
  3. A malformed rule definition is rejected on save with a message naming what was invalid, and the previous rule set remains in effect.
  4. The impact of a change is shown before it is trusted — affected shipments are named, and revalidation records before and after exception sets — and every rule change appears in the audit trail under the administrator's name, role and timestamp.
  5. The administrator still cannot adjudicate or approve a shipment; the attempt is refused server-side and recorded, and the ten-step walkthrough test from Phase 5 still passes unchanged.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Seeded, Governed, Servable Foundation | 0/TBD | Not started | - |
| 2. The Flagged Shipment, Explained | 0/TBD | Not started | - |
| 3. The Decision Point | 0/TBD | Not started | - |
| 4. Close the Gap and Show the Record | 0/TBD | Not started | - |
| 5. Named Authority, Proven | 0/TBD | Not started | - |
| 6. The Policy Is Yours | 0/TBD | Not started | - |

## Sequencing Notes

**Why F21 (test suite) maps to a single phase.** F21's defining deliverable is the consolidated suite with its CI gate and the end-to-end run of all ten walkthrough steps (E2E-01/02/03), and the tenth step does not exist until the approval chain lands in Phase 5 — an E2E family cannot be completed earlier. Phase 5 is therefore the only phase where F21 can be finished. This is not a licence to defer testing: every earlier phase carries its own unit and integration tests within its plans (rule evaluation in Phase 2, transition and audit-completeness tests in Phase 3, revalidation and upload-security tests in Phase 4), and every earlier phase's success criteria are checkable by direct demonstration in the running preview without waiting for Phase 5.

**Why the four screens are not a final UI phase.** F17 and F18 land in Phase 2 with the rules that populate them, F19 lands in Phase 3 with the recommendation it displays, and F20 lands in Phase 4 with the document loop it replays. The PRD records "UI treated as an afterthought behind a working API" as a high risk (§8); no phase after Phase 1 completes without a screen a stakeholder can be shown.

**Why the governance claims are spread.** Server-side RBAC plus the schema-level append-only and separation-of-duties constraints are Phase 1; AI-explains-never-decides is proven in Phase 2 (labelled, attributed, fallback-first) and Phase 3 (deterministic action, inert recommendation); append-only audit is written from the first action in Phase 3 and shown on screen in Phase 4; separation of duties completes in Phase 5. The final phase (F15) is deliberately the least load-bearing item in the set — if Phase 6 slipped, the walkthrough and all three governance claims would still be intact.

**Deterministic-first throughout.** Every phase's success criteria hold with `CARGODEMO_AI_PROVIDER=none`. The LLM prose layer is an enhancement on top of the deterministic path, never a dependency of it.

---
*Roadmap created: 2026-09-08*
