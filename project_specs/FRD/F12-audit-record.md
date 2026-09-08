---

## F12: Decision & Audit Record

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough step:** 10

**Description:** F12 is the immutable, complete, append-only record of everything that happened to a case — sufficient to defend the decision after the fact. Every audit entry captures the **eight required fields**: the exception(s) involved, the evidence reviewed, the AI recommendation, the human decision, the decision justification, the timestamp, the approving official, and the generated notification. Entries cannot be edited or deleted through the application, they form a hash chain, and a decision cannot be finalized if any required field is absent. F12 also produces the chronological case timeline, distinguishes AI-authored from human-authored content, and exports the record for offline review.

**Terminology:**
- **Audit entry:** One `audit_entries` row. Immutable after commit (with the single, structurally constrained exception described in §3).
- **Entry class:** The category of event an entry records, which determines the completeness rules applied to it: `SYSTEM_EVENT`, `AI_OUTPUT`, `HUMAN_ACTION`, `APPROVAL_DECISION`, `ACCESS_DENIED`.
- **The eight fields:** The PRD-mandated audit content, specified field-by-field in §1.
- **Snapshot, not reference:** Evidence and AI recommendation are stored as JSON **copies** taken at decision time, not as foreign keys. A later revalidation changes the live exception set; the audit entry must still show what the decider actually saw.
- **Hash chain:** `entry_hash = SHA256(canonical_json(entry_without_hashes) || prev_hash)`, with `prev_hash` being the previous entry's hash for the same case (or the genesis constant for the first). Tampering with any historical row breaks verification for every subsequent row.
- **Completeness gate:** The pre-commit check that blocks a write whose entry class requires a field that is absent.

**Sub-features:**
- Eight-field audit entry capture
- Append-only enforcement at the application and database layers
- Hash chaining and verification
- Chronological case timeline assembly
- AI vs human content distinction
- Completeness enforcement at write time
- JSON and printable export

### §1 The eight required fields

| # | Field | Column | Type | Content |
|---|---|---|---|---|
| 1 | **Exception** | `exceptions_json` | JSON array | Snapshot of every exception in scope at the moment of the event: `{ exception_id, exception_type, sub_reason, severity, status, rule_id, rule_name, rule_version, policy_reference, opened_at }`. For a case-level action this is the full open set; for a resolution event it also includes the exceptions being resolved or closed. Never null — an empty case records `[]` with `exceptions_in_scope_count: 0`. |
| 2 | **Evidence reviewed** | `evidence_reviewed_json` | JSON array | Snapshot of every evidence row attached to the in-scope exceptions: `{ exception_id, kind, field_path, raw_value, normalized_value, comparison_field_path, comparison_raw_value, comparison_normalized_value, expected, observed, assertion }`, plus `documents_present[]` and `documents_missing[]` at that instant. This is what makes the decision reconstructable. |
| 3 | **AI recommendation** | `ai_recommendation_json` | JSON object | `{ present, recommended_action, confidence_level, confidence_basis, rationale, provenance: { provider, model, generation_mode, generated_at, grounding_fingerprint }, concurrence }` or the explicit `{ present: false, reason: "NOT_GENERATED" }`. Never null. `concurrence` is `AGREED | DIVERGED | NO_RECOMMENDATION_PRESENT` on `HUMAN_ACTION` entries and `NOT_APPLICABLE` on `APPROVAL_DECISION` entries, because the AI never recommends `APPROVE_CLEARANCE` (F8 §Process step 11). |
| 4 | **User decision** | `user_decision` + `user_decision_detail_json` | string + JSON | The action or disposition code (`REQUEST_INFORMATION`, `CLEAR_EXCEPTION`, `APPROVE`, `REJECT`, …) plus its action-specific parameters (`document_types`, `hold_reason`, `resolution_basis`, `rejection_reason`). Null only for `SYSTEM_EVENT` and `AI_OUTPUT` classes, which record no human decision. |
| 5 | **Decision justification** | `justification` | text | The human-authored free text, verbatim, 10–2 000 chars. Never generated, never defaulted. Null only for `SYSTEM_EVENT` and `AI_OUTPUT` classes. |
| 6 | **Timestamp** | `occurred_at` | ISO-8601 UTC ms | The server clock at commit. Never client-supplied. Monotonic per case: an entry whose `occurred_at` precedes its predecessor's is rejected. |
| 7 | **Approving official** | `approving_official_user_id`, `approving_official_name`, `approving_official_role` | string ×3 | The named approver. Non-null and required on `APPROVAL_DECISION` entries and on any entry transitioning the case to `CLEARED`. On other classes the field is present as an explicit `null` with `approving_official_applicable: false`, so absence is recorded rather than merely missing. |
| 8 | **Generated notification** | `notification_id` + `notification_snapshot_json` | string + JSON | The notification produced by this event: `{ id, recipient_role, recipient_user_id, subject, body, generated_at, transmitted: false }`. Required on every `HUMAN_ACTION` and `APPROVAL_DECISION` entry. |

Additional non-PRD-mandated columns carried on every entry for attribution and integrity: `case_id`, `cargo_entry_id`, `shipment_id`, `sequence_no`, `entry_class`, `event_type`, `actor_kind`, `actor_user_id`, `actor_name`, `actor_role`, `case_status_before`, `case_status_after`, `evaluation_version`, `rule_set_fingerprint`, `prev_hash`, `entry_hash`, `request_id`.

### §2 Completeness rules by entry class

| Entry class | Event types | Required of the eight | Optional/`null`-permitted |
|---|---|---|---|
| `SYSTEM_EVENT` | `ENTRY_INGESTED`, `ENTRY_REINGESTED`, `EXCEPTIONS_DETECTED`, `EXCEPTIONS_REEVALUATED`, `REVALIDATED`, `SCHEMA_MIGRATED`, `DEMO_RESET`, `RULE_CREATED`, `RULE_UPDATED`, `RULE_ENABLED`, `RULE_DISABLED` | 1, 2, 3, 6 | 4, 5 (no human decision), 7, 8 (`REVALIDATED` does generate a notification and therefore carries 8) |
| `AI_OUTPUT` | `AI_SUMMARY_GENERATED`, `AI_RECOMMENDATION_GENERATED` | 1, 2, 3, 6 | 4, 5, 7, 8 |
| `HUMAN_ACTION` | the five actions, `DOCUMENT_UPLOADED`, `DOCUMENT_REQUEST_CANCELLED` | **1, 2, 3, 4, 5, 6, 8** | 7 (explicit null with `approving_official_applicable: false`) |
| `APPROVAL_DECISION` | `CLEARANCE_APPROVED`, `CLEARANCE_REJECTED`, `CLEARANCE_RETURNED_FOR_INFORMATION` | **all eight**, with 7 non-null | — |
| `ACCESS_DENIED` | `ACCESS_DENIED`, `TRANSITION_REJECTED` | 1, 4 (the attempted decision), 6 | 2, 3, 5, 7, 8 |

The gate that matters for the PRD's governance claim is the `APPROVAL_DECISION` row: **all eight fields non-null, including a named approving official.** A `CLEARANCE_APPROVED` entry that would be missing any of them aborts the transaction, so the case does not clear (F11 §Validation).

### §3 Append-only enforcement

1. **No API surface.** No `PATCH`, `PUT`, or `DELETE` route exists for `audit_entries` or `notifications`. The routes are not defined at all, so no client can express the request.
2. **Repository constraint.** The audit repository exposes only `append()` and read methods. There is no `update()` or `delete()` to call.
3. **Database triggers.** `BEFORE UPDATE` and `BEFORE DELETE` triggers on `audit_entries` raise `AUDIT_IMMUTABLE`. The `UPDATE` trigger carries a single narrow `WHEN` exemption: it permits an update that changes **only** `notification_id` and `notification_snapshot_json`, only from null to non-null, and only within the same transaction that inserted the row. This exists solely to resolve the audit↔notification circular reference described in F09b §1 step 15, and every other update — including a second attempt to set `notification_id` — is rejected.
4. **Hash chain.** Each entry stores `prev_hash` and `entry_hash`. `GET /api/cases/{id}/audit/verify` recomputes the chain and reports `{ valid, entries_checked, first_invalid_sequence_no }`. An F21 test tampers with a row via direct SQL and asserts that verification fails.
5. **Reset is the only removal path.** `POST /api/admin/reset` (F2/F22) truncates and reseeds the entire database. It is administrator-gated, is a whole-environment operation rather than a selective edit, and writes a `DEMO_RESET` entry as the first row of the new chain. Selective deletion of a single entry or a single case's history is not implementable through any surface.

### §4 Process — writing an entry

1. The caller (F1, F5, F6, F7, F8, F9, F10, F11, F15) invokes `audit.append(draft)` inside the caller's existing transaction. There is no path that writes an audit entry in a separate transaction from the state change it records.
2. The service resolves `sequence_no` as `max(sequence_no) + 1` for the case, under the case-row lock already held by the caller, guaranteeing gap-free ordering.
3. The service stamps `occurred_at` from the server clock and validates monotonicity against the previous entry.
4. The service applies the completeness rules for the entry class (§2). A missing required field aborts with `AUDIT_INCOMPLETE`, naming the field.
5. The service computes `prev_hash` and `entry_hash` over the canonical JSON serialization (keys sorted, no whitespace, timestamps in ISO-8601 UTC ms).
6. The service inserts the row. The caller then inserts the notification and performs the single permitted `notification_id` update (§3.3).
7. On commit, the entry is permanent.

### §5 Process — reading the timeline (walkthrough step 10)

1. `GET /api/cases/{id}/audit` returns all entries ordered by `sequence_no` ascending, with `page_size` defaulting to 100 (a case timeline is meant to be read whole).
2. Each entry is projected with a `presentation` block the UI renders directly: `{ headline, actor_label, authorship: "HUMAN" | "AI" | "SYSTEM", status_change, decision_label, justification, exception_summary, evidence_rows, ai_block, approving_official_label, notification_block }`.
3. `authorship` drives the visual separation required by PRD F12 and F20: AI-authored content is never rendered inside a human-decision container, and every AI block carries its provenance.
4. The response includes a `completeness` block: `{ total_entries, decision_entries, decision_entries_complete, missing_fields: [] }`, so the screen can assert on-camera that the record is complete.
5. `GET /api/cases/{id}/audit/export?format=json` returns the full record including the hash chain and a `verification` block. `format=printable` returns the same content as server-rendered HTML suitable for the browser's print dialog. No PDF toolchain is required or used.

**Inputs:**
- `audit.append(draft)` internal call: `{ case_id, entry_class, event_type, actor, exceptions, evidence_reviewed, ai_recommendation, user_decision, user_decision_detail, justification, approving_official, case_status_before, case_status_after, evaluation_version, rule_set_fingerprint, request_id }`
- `GET /api/cases/{id}/audit` query: `page`, `page_size` (1–500, default 100), `entry_class` filter, `since_sequence_no`
- `GET /api/cases/{id}/audit/export` query: `format` = `json` | `printable`

**Outputs:**
- Persisted, hash-chained `audit_entries` rows
- Timeline projection with per-entry presentation blocks and the completeness summary
- `verification` result from the verify endpoint
- JSON or printable export of the full case record

**Validation:**
- Every write MUST satisfy the completeness rules for its entry class; failure aborts the enclosing transaction with `AUDIT_INCOMPLETE`.
- Every `APPROVAL_DECISION` entry MUST have all eight fields non-null. Asserted by an F21 test that enumerates every approval entry in the seeded and test-generated data.
- `occurred_at` MUST be server-generated and monotonic per case; a non-monotonic draft is rejected with `AUDIT_TIMESTAMP_NONMONOTONIC`.
- `sequence_no` MUST be gap-free per case; a gap is a verification failure.
- Evidence and AI recommendation MUST be stored as snapshots. An implementation that stores only foreign keys fails the F21 test that revalidates a case after a decision and asserts the earlier entry's evidence is unchanged.
- No audit entry may carry `actor_kind = 'AI'` together with a non-null `user_decision` (`00-header.md` §0.4.7).
- Audit entries MUST NOT be updated or deleted except by the narrowly scoped `notification_id` exemption; verified by trigger tests that attempt both and expect failure.
- The export MUST contain every field of every entry — an export that omits the AI recommendation or the evidence snapshot is a defect, because offline review is exactly the defensibility use case.
- Audit reads are permitted to all three roles; audit writes are never client-initiated (there is no "create audit entry" endpoint).

**State transitions caused:** None. F12 records transitions; it never causes them. Its only influence on state is negative: the completeness gate can *prevent* a transition (notably `PENDING_APPROVAL → CLEARED`).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Required field absent for the entry class | 500 | `AUDIT_INCOMPLETE` | "Audit record would be incomplete: {field} is required for {entry_class}" |
| Approval without an approving official | 500 | `AUDIT_INCOMPLETE` | "Clearance blocked: approving official is required" |
| Attempt to update or delete an entry | 405 | `AUDIT_IMMUTABLE` | "Audit records are append-only and cannot be modified" |
| Non-monotonic timestamp | 500 | `AUDIT_TIMESTAMP_NONMONOTONIC` | "Audit timestamp precedes the previous entry" |
| Sequence collision | 409 | `AUDIT_SEQUENCE_CONFLICT` | "Concurrent audit write detected; retry" |
| Hash chain verification failed | 200 (with `valid: false`) | `AUDIT_CHAIN_INVALID` | "Audit chain verification failed at entry {sequence_no}" |
| Case not found | 404 | `RESOURCE_NOT_FOUND` | "Case {id} not found" |
| Unknown export format | 422 | `INVALID_QUERY_PARAM` | "format must be json or printable" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/cases/{id}/audit` | CS, SUP, ADM | Chronological timeline with presentation blocks |
| GET | `/api/cases/{id}/audit/{sequence_no}` | CS, SUP, ADM | One entry in full |
| GET | `/api/cases/{id}/audit/verify` | CS, SUP, ADM | Hash-chain verification result |
| GET | `/api/cases/{id}/audit/export` | CS, SUP, ADM | Full record as JSON or printable HTML |
| GET | `/api/audit` | SUP, ADM | Cross-case audit search (filter by actor, event type, date range) |

Full schemas: `Y1a-api-read.md` §Audit.

**Schema Surface (this feature):** owns `audit_entries` and its immutability triggers; reads every other table for snapshotting. See `Y0b-schema-workflow-audit.md` §Audit.
