---

## F6: Shipment Revalidation

**Priority:** P0 · **Category:** Rules & Validation · **Walkthrough step:** 7

**Description:** F6 re-runs the rule engine against a shipment after its evidence changes — most importantly after a simulated document upload — and reconciles the resulting exception set against the previous one. Exceptions that no longer fire are marked `RESOLVED_BY_REVALIDATION` and retained, never deleted. Exceptions that still fire are carried forward with their original open-since timestamp. Newly firing exceptions are surfaced. Priority and status are recomputed, an audit entry with the complete before/after exception sets is appended, and the AI summary and recommendation are regenerated against the new evaluation version. This is the mechanic that makes walkthrough step 7 verifiable rather than cosmetic.

**Terminology:**
- **Revalidation:** One evaluation whose `trigger` is `MANUAL_REVALIDATION`, `DOCUMENT_UPLOAD`, `RULE_CHANGE`, or `INGESTION` on an existing case. Every revalidation creates a new evaluation version; nothing is evaluated in place.
- **Reconciliation:** The comparison of the prior evaluation's exception set against the new one, keyed on `rule_id`. Produces three disjoint sets: `resolved`, `retained`, `new`.
- **Resolved-by-revalidation:** The terminal status applied to a prior-evaluation exception whose rule no longer fires. The row is preserved with `resolved_at`, `resolved_by_evaluation_id`, and `resolution_reason`.
- **Carry-forward:** The mechanism by which a retained exception keeps `first_detected_evaluation_id` and `opened_at` from its original detection, so age and "open since" survive revalidation.
- **Partial satisfaction:** A missing-document exception whose `missing_information` list shrinks but does not empty. The exception is `retained`, not `resolved`, and its evidence is refreshed to the shorter list.

**Sub-features:**
- Manual revalidation from the Shipment Review screen
- Automatic revalidation on evidence-changing events
- Three-way exception reconciliation with resolved-not-deleted semantics
- Carry-forward of open-since metadata
- Status and priority recomputation
- Before/after audit entry
- AI regeneration and change highlighting

**Process:**
1. Revalidation is triggered by one of four paths: a human clicking Revalidate on F18 (`POST /api/shipments/{id}/revalidate`), a successful simulated document upload (F10 §Process step 8), a re-ingestion of the entry (F1 §Process step 7), or an administrator applying a rule change with `revalidate_affected = true` (F15).
2. The service loads the case, verifies it is not `CLEARED` (terminal cases are never revalidated), and takes a transaction on the `cases` row so concurrent revalidations serialize.
3. The service snapshots the **before** state: the current evaluation version, its exception set with `{ exception_id, rule_id, exception_type, severity, sub_reason, status, missing_information }`, the case status, and the case priority.
4. The service invokes F4 with the trigger, producing a fresh `EvaluationResult`, and F5 persists a new evaluation version with its exceptions and evidence.
5. **Reconciliation** is computed by joining the before-set and after-set on `rule_id`:
   - `resolved` = rules in before-set with no finding in the after-set.
   - `retained` = rules present in both.
   - `new` = rules with a finding in the after-set that were absent from the before-set.
6. For each `resolved` exception, the service updates the prior-evaluation row to `status = 'RESOLVED_BY_REVALIDATION'`, sets `resolved_at`, `resolved_by_evaluation_id`, and `resolution_reason` (a structured value: `DOCUMENT_RECEIVED`, `HTS_CORRECTED`, `ORIGIN_ALIGNED`, `RULE_DISABLED`, `RULE_PARAMS_CHANGED`, or `CONDITION_NO_LONGER_APPLICABLE`, derived from the trigger and the rule's applicability outcome). **The row is never deleted, and its evidence is never modified** — the historical record of why it once fired stays intact and readable.
7. For each `retained` exception, the new-evaluation row inherits `first_detected_evaluation_id` and `opened_at` from the prior row, and the prior row is closed with `status = 'SUPERSEDED_BY_EVALUATION'` pointing at its successor. The new row carries refreshed evidence — critically, a missing-document exception whose required list is now partially satisfied shows the *shorter* `missing_information` list, so the specialist sees exactly what remains outstanding.
8. For each `new` exception, the row is created fresh with `first_detected_evaluation_id` = the current evaluation.
9. Priority is recomputed by F5 §Process step 6 against the post-revalidation `OPEN` set.
10. **Status recomputation** follows the table in §State transitions. Revalidation never clears a case and never bypasses approval: even when every exception resolves, the case moves to `IN_REVIEW`, not `CLEARED`. A human must still act, and clearance still requires supervisor approval (F11).
11. Any open document request whose requested document type is now satisfied is marked `FULFILLED` (F10), and requests that remain unsatisfied stay `OUTSTANDING`.
12. The service appends a `REVALIDATED` audit entry containing the complete before/after exception sets, the reconciliation classification per rule, the prior and new priority with basis, the prior and new status, the trigger, the actor, and the rule-set fingerprint of each evaluation.
13. The service generates a notification (F13) describing what changed in plain language, e.g. "1 exception resolved, 2 remain open".
14. The service invalidates and regenerates the AI summary (F7) and recommendation (F8) against the new evaluation version. Regeneration is asynchronous with respect to the response only in the sense that the response includes the reconciliation result immediately; the AI outputs are fetched by the UI on the next render and always resolve — via fallback if necessary — so the walkthrough never blocks.
15. The service returns a `RevalidationResult` that the UI uses to render the inline "what changed" indication on F18.

**Inputs:**
- `shipment_id` or `case_id` (path parameter, required)
- `trigger` (enum, server-determined, not client-supplied): `MANUAL_REVALIDATION` | `DOCUMENT_UPLOAD` | `RULE_CHANGE` | `INGESTION`
- `justification` (string, optional for manual revalidation, 0–1 000 chars): revalidation is not one of the five actions and does not require a justification, but a supplied note is recorded on the audit entry. *(Rationale: revalidation asserts nothing and decides nothing; it re-reads the rules. Mandatory justification applies to the five decision actions, F9.)*
- `If-Match-Case-Version` (integer, optional)
- Acting user from session (CS or SUP; ADM may revalidate only via the rule-change path)

**Outputs:**
- `RevalidationResult`:
  - `evaluation: { id, version, evaluated_at, trigger, rule_set_fingerprint }`
  - `resolved[]`: `{ exception_id, rule_id, exception_type, resolution_reason, was_open_since }`
  - `retained[]`: `{ exception_id, prior_exception_id, rule_id, exception_type, open_since, missing_information_before, missing_information_after, evidence_changed: boolean }`
  - `new[]`: `{ exception_id, rule_id, exception_type, severity, sub_reason }`
  - `priority: { before, after, basis }`, `status: { before, after }`
  - `open_exception_count: { before, after }`
  - `ai_regeneration: { summary_status, recommendation_status }` where status ∈ `REGENERATED` | `PENDING` | `FALLBACK`
- One `REVALIDATED` audit entry; one notification
- Updated case, exception, evidence, and document-request rows

**Validation:**
- Revalidation MUST be rejected when `cases.status = 'CLEARED'` (`CASE_TERMINAL`).
- Revalidation MUST create a new evaluation version even when nothing changes; a no-op revalidation is still recorded, because "we re-checked and nothing changed" is itself auditable information.
- Revalidation MUST NOT delete any `exceptions` or `evidence` row. An F21 test asserts that the total row count in both tables is monotonically non-decreasing across a revalidation.
- A `resolved` exception MUST retain its original evidence rows unmodified; only status and resolution metadata may be written.
- A `retained` exception MUST preserve `opened_at` and `first_detected_evaluation_id`; an F21 test asserts age continuity across revalidation.
- Revalidation MUST NOT transition a case to `CLEARED` or `PENDING_APPROVAL` under any circumstances.
- Revalidation MUST NOT alter `recommendations` or `approvals` rows. If the case is `PENDING_APPROVAL` when revalidated, the pending recommendation remains pending, and the audit entry records that the evidence changed while an approval was outstanding so the supervisor sees a "evidence changed since recommendation" warning on F19.
- Round-trip latency MUST be < 2 s with the seeded dataset (PRD §6), excluding the AI regeneration which resolves independently.
- Automatic revalidation MUST be idempotent with respect to the triggering event: a single document upload produces exactly one revalidation, guarded by the upload's transaction.

**State transitions caused:**

| Case status before | Post-revalidation open exceptions | Case status after | Rationale |
|---|---|---|---|
| `NEW` | ≥ 1 | `NEW` | Untouched work stays untouched; revalidation is not review |
| `NEW` | 0 | `IN_REVIEW` | Evidence now clean, but a human must still dispose of it |
| `IN_REVIEW` | any | `IN_REVIEW` | No change |
| `AWAITING_INFORMATION` | any, **and** every open document request is now fulfilled | `IN_REVIEW` | The information arrived; the case is unblocked and returns to active review |
| `AWAITING_INFORMATION` | any, with ≥ 1 request still outstanding | `AWAITING_INFORMATION` | Still blocked |
| `ON_HOLD` | any | `ON_HOLD` | A hold is a deliberate human decision; new evidence does not release it |
| `ESCALATED` | any | `ESCALATED` | Authority has been transferred; only a supervisor action changes this |
| `PENDING_APPROVAL` | any | `PENDING_APPROVAL` | Recommendation stands; supervisor is warned that evidence changed |
| `CLEARED` | n/a | rejected | Terminal |

**Walkthrough step 7, worked:** `SHP-2026-0007` at evaluation v1 has three `OPEN` exceptions and status `AWAITING_INFORMATION` (set by the step-5 document request). The step-6 upload attaches `CERTIFICATE_OF_ORIGIN` and triggers revalidation. At v2: `rule-doc-highvalue-coo` no longer fires → `resolved` with `resolution_reason = DOCUMENT_RECEIVED`; `rule-hts-completeness` and `rule-origin-manufacturer` still fire → `retained` with original `opened_at`; `new` is empty. Open count 3 → 2, priority stays `CRITICAL` (origin rule is `CRITICAL`), the outstanding request is `FULFILLED`, so status moves `AWAITING_INFORMATION → IN_REVIEW`. The audit entry records both exception sets in full; F18 renders "1 resolved, 2 retained" inline.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Shipment/case not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| Case is `CLEARED` | 409 | `CASE_TERMINAL` | "Cleared shipments cannot be revalidated" |
| Case modified concurrently | 409 | `CASE_VERSION_CONFLICT` | "Case was modified by another user; reload and retry" |
| Role not permitted | 403 | `FORBIDDEN_ROLE` | "Role {role} may not revalidate shipments" |
| Rule engine failure during revalidation | 500 | `EVALUATION_FAILED` | "Revalidation failed; no changes were saved" |
| Evaluation version collision | 409 | `EVALUATION_VERSION_CONFLICT` | "Concurrent revalidation detected; retry" |
| Reconciliation produced an exception in two sets | 500 | `RECONCILIATION_INCONSISTENT` | "Internal error: exception classified in multiple sets" |
| Audit entry incomplete for the revalidation | 500 | `AUDIT_INCOMPLETE` | "Revalidation aborted: audit record would be incomplete" |

Because the entire revalidation runs in one transaction, any error above leaves the prior evaluation as the current one and no partial reconciliation persists.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/shipments/{id}/revalidate` | CS, SUP | Manual revalidation; returns `RevalidationResult` |
| GET | `/api/shipments/{id}/evaluations/{version}/diff/{other_version}` | CS, SUP, ADM | Before/after comparison of two evaluation versions |

Full schemas: `Y1b-api-actions.md` §Revalidation.

**Schema Surface (this feature):** writes `evaluations`, `exceptions` (new rows and terminal-status updates on prior rows), `evidence` (new rows only), `cases`, `document_requests`, `audit_entries`, `notifications`; invalidates `ai_outputs`. See `Y0a-schema-core.md` §Evaluation and `Y0b-schema-workflow-audit.md`.
