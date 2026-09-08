---

## F5: Exception Detection, Evidence Capture & Flagging

**Priority:** P0 · **Category:** Rules & Validation · **Walkthrough steps:** 1, 4

**Description:** F5 turns the rule engine's findings into reviewable work. It persists an exception per firing rule, stores the field-level evidence that triggered it, records what information is missing, derives the case priority from rule severity and shipment attributes, sets the initial queue status, and places the shipment on the exception queue. It also preserves the full evaluation history so pre- and post-revalidation states remain independently inspectable.

**Terminology:**
- **Flagging:** The act of making a shipment visible on the exception queue. A shipment is flagged if and only if its current evaluation has ≥ 1 `OPEN` exception, or its case status is `PENDING_APPROVAL` (which must remain visible to supervisors even after the underlying exceptions are proposed for clearance).
- **Current evaluation:** The `evaluations` row referenced by `cases.current_evaluation_id`. Queue and detail views read exceptions from the current evaluation only; prior evaluations are reachable through the audit/history views.
- **Evidence record:** One `evidence` row bound to one exception. Structured, never prose.
- **Missing information:** Evidence rows with `kind = 'MISSING'`, describing absent evidence. Rendered as the "missing information" panel on F19 and consumed by F8's fallback.
- **Derived priority:** `cases.priority`, computed by the algorithm in §Process step 6. Never set by a human, never taken from the ingestion hint.

**Sub-features:**
- Exception persistence per firing rule, bound to an evaluation version
- Structured evidence capture with raw and normalized values
- Missing-information capture
- Deterministic priority derivation
- Initial status assignment and queue membership
- Evaluation history preservation

**Process:**
1. F5 receives an `EvaluationResult` from F4 together with `(case_id, trigger, actor)`.
2. F5 inserts the `evaluations` row with `version = previous_version + 1` (or `1` for a first evaluation), `trigger`, `rule_set_fingerprint`, `evaluated_at`, `actor_kind`, and `actor_user_id`. Version assignment happens inside the same transaction that reads the previous maximum, so concurrent evaluations cannot collide.
3. For each finding, F5 inserts an `exceptions` row: `{ evaluation_id, cargo_entry_id, rule_id, rule_version, exception_type, severity, sub_reason, status: 'OPEN', assertion, first_detected_evaluation_id, opened_at }`.
   - `first_detected_evaluation_id` is carried forward from the earliest evaluation in which this `(cargo_entry_id, rule_id)` pair fired without an intervening resolution, so the UI can show "open since" age and the queue can sort by exception age rather than case age.
4. For each finding, F5 inserts `evidence` rows. Each row is `{ exception_id, kind, field_path, raw_value, normalized_value, comparison_field_path, comparison_raw_value, comparison_normalized_value, expected, observed, assertion, display_order }` where `kind ∈ { OBSERVED, COMPARISON, MISSING, CONTEXT }`:
   - `OBSERVED` — the value that failed (`hts_code = "8541.40"` → `"854140"`).
   - `COMPARISON` — the value it was measured against (`manufacturer.address.country = "China"` → `"CN"`).
   - `MISSING` — absent evidence (`CERTIFICATE_OF_ORIGIN` not received; 4 of 10 HTS digits absent).
   - `CONTEXT` — attributes that made the rule applicable (`shipment_value_usd = 85000.00 ≥ 50000 threshold`). Context evidence is what lets a reviewer see *why this rule applied to this shipment*.
   - `display_order` is assigned from the evaluator's emission order so the evidence panel renders identically on every load.
5. F5 reconciles the exception set against the prior evaluation (delegated to F6 §Process steps 5–7 when the trigger is a revalidation; on first evaluation there is nothing to reconcile).
6. F5 derives priority from the current `OPEN` exception set:
   1. `base = max(severity)` across `OPEN` exceptions, using the ordering `LOW < MEDIUM < HIGH < CRITICAL`, after applying each rule's `priority_mapping`. If there are no `OPEN` exceptions, `priority = LOW`.
   2. **Value escalation:** if `shipment_value_usd >= 50000`, raise one level.
   3. **Multiplicity escalation:** if the count of `OPEN` exceptions `>= 3`, raise one level.
   4. **Age escalation:** if the oldest `OPEN` exception's `opened_at` is more than 7 days before `now`, raise one level. (In seed mode `now` is the seed clock, keeping seeded priorities deterministic.)
   5. Clamp to `CRITICAL`. Each applied escalation is recorded in `cases.priority_basis_json` as `[{ factor, detail, from, to }]` so the queue can explain a priority on hover and the audit record can defend it.
   - *Canonical scenario:* base `CRITICAL` (origin rule) → value escalation and multiplicity escalation both clamp → `CRITICAL`, with all three factors listed in the basis.
7. F5 sets the initial case status when the case is newly created: `NEW` if ≥ 1 `OPEN` exception, `NEW` with `queued = false` if zero exceptions. On subsequent evaluations F5 never changes status itself; status changes belong to F6 (revalidation) and F9/F11 (human actions).
8. F5 sets `cases.current_evaluation_id` to the new evaluation, `cases.open_exception_count`, and `cases.exception_type_summary` (a deterministic, sorted, comma-joined list of distinct open exception types used by the queue projection).
9. F5 writes a `SYSTEM`-actor audit entry `EXCEPTIONS_DETECTED` (or `EXCEPTIONS_REEVALUATED`) capturing the evaluation version, the exception ID set with types and severities, the evidence summary, the derived priority with its basis, and the rule-set fingerprint.
10. F5 invalidates the cached AI summary and recommendation for the shipment, because both are bound to an evaluation version (F7, F8).

**Inputs:**
- `EvaluationResult` from F4 (findings, skipped rules, invalid rules, fingerprint)
- `case_id` (uuid, required)
- `trigger` (enum, required), `actor` (object, required)
- Cargo entry attributes needed for priority derivation: `shipment_value_usd`, existing `opened_at` values

**Outputs:**
- Persisted `evaluations`, `exceptions`, `evidence` rows
- Updated `cases`: `current_evaluation_id`, `priority`, `priority_basis_json`, `open_exception_count`, `exception_type_summary`, `queued`, `updated_at`
- `DetectionResult` returned to the caller: `{ evaluation_id, version, opened: [exception_id], retained: [exception_id], resolved: [exception_id], priority, priority_basis, queued }`
- One `EXCEPTIONS_DETECTED` / `EXCEPTIONS_REEVALUATED` audit entry
- Queue membership visible immediately at `GET /api/queue`

**Validation:**
- Every persisted exception MUST have ≥ 1 evidence row. An exception with no evidence is a defect and is rejected at write time with `EXCEPTION_EVIDENCE_REQUIRED`.
- Every `MISSING_REQUIRED_DOCUMENT` exception MUST have ≥ 1 `MISSING`-kind evidence row.
- Every `CONFLICTING_COUNTRY_OF_ORIGIN` exception with `sub_reason = ORIGIN_MISMATCH` MUST have ≥ 1 `OBSERVED` and ≥ 1 `COMPARISON` evidence row, each with a non-null `normalized_value`.
- Every `INVALID_HTS_CODE` exception MUST have an `OBSERVED` evidence row whose `expected` and `observed` fields are both populated.
- Evidence values MUST be stored as strings exactly as observed (no rounding, reformatting, or locale conversion), with the normalized form in a separate column.
- `evidence.raw_value` MUST NOT exceed 2 000 characters; longer values are truncated with an explicit `…(truncated)` marker and `truncated = true`.
- At most one `OPEN` exception may exist per `(evaluation_id, rule_id)`.
- Priority derivation MUST be a pure function of `(open exception severities, shipment value, open exception count, oldest opened_at, now)` — asserted by an F21 table-driven test.
- A shipment with zero `OPEN` exceptions MUST NOT appear in the default queue response, and MUST still be retrievable by direct ID.
- Prior evaluations, their exceptions, and their evidence MUST remain readable after a revalidation; F5 MUST NOT update or delete rows belonging to an earlier evaluation, except to set the terminal `status` of an exception being resolved (which F6 performs).

**State transitions caused:**

| Precondition | Result |
|---|---|
| New case, ≥ 1 finding | `status = NEW`, `queued = true`, priority derived |
| New case, 0 findings | `status = NEW`, `queued = false`, `priority = LOW` |
| Existing case, any status | Status untouched by F5; `priority`, `open_exception_count`, `queued` recomputed |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Exception written with no evidence | 500 | `EXCEPTION_EVIDENCE_REQUIRED` | "Exception {rule_id} produced no evidence and cannot be persisted" |
| Missing-document exception with no MISSING evidence | 500 | `MISSING_INFORMATION_REQUIRED` | "Missing-document exception must record the missing document types" |
| Evaluation version collision | 409 | `EVALUATION_VERSION_CONFLICT` | "Concurrent evaluation detected; retry" |
| Priority derivation produced a non-canonical value | 500 | `PRIORITY_DERIVATION_FAILED` | "Derived priority {value} is not a supported priority" |
| Case not found for the entry | 404 | `RESOURCE_NOT_FOUND` | "Case for shipment {id} not found" |
| Attempt to mutate a superseded evaluation's evidence | 405 | `EVALUATION_HISTORY_IMMUTABLE` | "Historical evaluation data cannot be modified" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/queue` | CS, SUP, ADM(read-only) | Flagged shipments with exception summary, priority, status |
| GET | `/api/shipments/{id}/exceptions` | CS, SUP, ADM | Current-evaluation exceptions with full evidence |
| GET | `/api/shipments/{id}/evaluations` | CS, SUP, ADM | Evaluation history with per-version exception sets |
| GET | `/api/shipments/{id}/evaluations/{version}` | CS, SUP, ADM | One historical evaluation, for before/after comparison |

Full schemas: `Y1a-api-read.md` §Queue and §Exceptions.

**Schema Surface (this feature):** writes `evaluations`, `exceptions`, `evidence`, and the derived columns on `cases`; writes `audit_entries`. See `Y0a-schema-core.md` §Evaluation.
