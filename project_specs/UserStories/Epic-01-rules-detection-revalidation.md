
## Epic 1: Rules, Exception Detection & Revalidation (F4)

Validation as configuration, exceptions as reviewable work with field-level evidence, and revalidation that reconciles before against after without losing history.

### US-1.1: Detect a Missing Required Document
**As a** Marisol Reyes (Cargo Specialist), **I want to** shipments to be flagged when a document required by policy has not been received, **so that** I am told what is absent instead of having to notice the absence myself.

**Acceptance Criteria:**
- [ ] The missing-required-document rule reads a parameterised list of required document types from persisted configuration
- [ ] The rule evaluates the required list against the documents actually received on the shipment
- [ ] The rule can be conditioned on shipment attributes such as a value threshold or commodity, and does not fire when the condition does not apply
- [ ] A firing rule produces an exception whose `missing_information` names each specific document type still outstanding
- [ ] The canonical solar-panel shipment ($85,000, certificate missing) fires this rule on first ingestion
- [ ] Changing the required-document list in configuration changes the outcome with no code change and no redeploy

**Priority:** P0 | **Feature Ref:** F4, F5

---

### US-1.2: Detect an Invalid or Incomplete HTS Code
**As a** Marisol Reyes (Cargo Specialist), **I want to** shipments with a malformed or incomplete HTS classification to be flagged with the expected format stated, **so that** I can see exactly how the declared code falls short.

**Acceptance Criteria:**
- [ ] The HTS rule validates format, length and completeness against a configurable expected digit count
- [ ] The rule performs a known-code check against the configured code list
- [ ] The exception evidence states both the observed value (e.g. the declared code and its normalised digit count) and the expected value (the configured digit count/format)
- [ ] The canonical solar-panel shipment's incomplete HTS code fires this rule on first ingestion
- [ ] A shipment with a complete, well-formed, known HTS code does not fire the rule
- [ ] Changing the expected digit count in configuration changes which shipments fire, with no code change

**Priority:** P0 | **Feature Ref:** F4, F5

---

### US-1.3: Detect a Conflicting Country of Origin
**As a** Marisol Reyes (Cargo Specialist), **I want to** a declared country of origin that conflicts with the manufacturer's address country to be flagged, **so that** origin inconsistency is surfaced as a finding rather than something I have to spot by reading two fields.

**Acceptance Criteria:**
- [ ] The origin rule compares the declared `country_of_origin` against `manufacturer.address.country` and any other configured origin-bearing fields
- [ ] The origin-comparison field set is configurable
- [ ] A mismatch produces an exception whose evidence names both field paths and both values, e.g. `country_of_origin = "Malaysia"` versus `manufacturer.address.country = "China"`
- [ ] Matching origin values do not fire the rule
- [ ] The canonical solar-panel shipment (Malaysia declared, China manufacturer address) fires this rule on first ingestion

**Priority:** P0 | **Feature Ref:** F4, F5

---

### US-1.4: Trust That Validation Is Deterministic and Never Suppressed
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** the same shipment plus the same rule set to always produce the same exceptions, with every firing rule retained, **so that** what I saw in one walkthrough is what the next walkthrough will show.

**Acceptance Criteria:**
- [ ] Evaluating the same cargo entry twice against the same rule set produces an identical exception set in an identical order
- [ ] When multiple rules fire on one shipment, all of them produce exceptions — none is suppressed, deduplicated or collapsed into a headline
- [ ] The canonical solar-panel shipment produces exactly three exceptions: origin conflict, incomplete HTS, missing document
- [ ] Each evaluation records a rule-set fingerprint so the rule configuration in force at that moment is recoverable
- [ ] Only the three supported exception types exist; there is no fourth type and no extension point that introduces one
- [ ] Single-shipment rule evaluation completes in under 500 ms with the seeded dataset

**Priority:** P0 | **Feature Ref:** F4

---

### US-1.5: See Field-Level Evidence for Every Exception
**As a** Marisol Reyes (Cargo Specialist), **I want to** every exception to carry the concrete field references and values that triggered it, **so that** I can verify the finding myself instead of taking a narrative on faith.

**Acceptance Criteria:**
- [ ] One exception record is created per firing rule, linked to both the shipment and the rule definition
- [ ] Evidence is stored as structured field references and values (field path, raw value, normalised value, expected, observed, assertion) — not as prose
- [ ] Exceptions that depend on absent evidence record what information is missing, listing the specific document types or fields
- [ ] Each exception carries its severity and its triggering rule's policy/authority reference
- [ ] Shipment priority is derived from rule severity and shipment attributes, and the derivation basis is retrievable for display
- [ ] Every flagged shipment is placed on the exception queue; shipments with zero exceptions stay off it
- [ ] Evaluation history is preserved so both pre- and post-revalidation exception sets remain inspectable

**Priority:** P0 | **Feature Ref:** F5

---

### US-1.6: Revalidate a Shipment After Its Evidence Changes
**As a** Marisol Reyes (Cargo Specialist), **I want to** re-run the rules against a shipment and see exactly which exceptions cleared and which remain, **so that** I can confirm the effect of new evidence rather than guessing at it.

**Acceptance Criteria:**
- [ ] Revalidation can be triggered manually from the Shipment Review screen by a Cargo Specialist or Supervisor
- [ ] Revalidation is triggered automatically on evidence-changing events: simulated document upload, entry re-ingestion, and an administrator rule change with `revalidate_affected = true`
- [ ] Revalidation always creates a new evaluation version, even when nothing changes, and records the no-op as auditable information
- [ ] Reconciliation classifies every rule into exactly one of `resolved`, `retained`, `new` — never two
- [ ] Exceptions that no longer fire are marked `RESOLVED_BY_REVALIDATION` with a resolution reason, and are never deleted
- [ ] A resolved exception's original evidence rows are left unmodified
- [ ] Retained exceptions inherit `opened_at` and `first_detected_evaluation_id`, so age survives revalidation
- [ ] A partially satisfied missing-document exception is retained (not resolved) with a shortened `missing_information` list
- [ ] Newly firing exceptions are surfaced with the current evaluation as their first detection
- [ ] Queue status and priority are recomputed against the post-revalidation open set
- [ ] The revalidation round-trip completes in under 2 seconds with the seeded dataset, excluding AI regeneration

**Priority:** P0 | **Feature Ref:** F6

---

### US-1.7: Have Revalidation Recorded and the AI Refreshed
**As a** Dwayne Okafor (Supervisor), **I want to** each revalidation to write a before/after audit entry and refresh the AI outputs, **so that** I can see what the evidence looked like before and after, and never read a stale summary.

**Acceptance Criteria:**
- [ ] A `REVALIDATED` audit entry records the complete before and after exception sets, the per-rule reconciliation classification, prior/new priority with basis, prior/new status, the trigger, the actor and the rule-set fingerprint
- [ ] A notification is generated describing the change in plain language, e.g. "1 exception resolved, 2 remain open"
- [ ] The AI summary and recommendation are invalidated and regenerated against the new evaluation version, resolving via fallback if the provider is unavailable
- [ ] Revalidation never transitions a case to `CLEARED` or `PENDING_APPROVAL` under any circumstances
- [ ] Revalidating a `CLEARED` case is rejected with `CASE_TERMINAL`
- [ ] Revalidation leaves `recommendations` and `approvals` rows untouched; a pending recommendation stays pending and the evidence change is recorded for the supervisor's warning
- [ ] `ON_HOLD` and `ESCALATED` cases are not released by revalidation
- [ ] Total `exceptions` and `evidence` row counts are monotonically non-decreasing across a revalidation

**Priority:** P0 | **Feature Ref:** F6, F12, F13

---
