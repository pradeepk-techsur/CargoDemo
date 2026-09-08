
## Epic 6: Decision & Audit Record (F12)

Eight required fields on every decision, snapshots rather than references, append-only storage, and completeness enforced at write time.

### US-6.1: Have Every Decision Recorded with All Eight Required Fields
**As a** Dwayne Okafor (Supervisor), **I want to** every decision to record the exception, the evidence reviewed, the AI recommendation, the human decision, the justification, the timestamp, the approving official and the generated notification, **so that** a decision I approved can be defended months later.

**Acceptance Criteria:**
- [ ] Field 1 — **Exception**: a snapshot of every exception in scope with type, sub-reason, severity, status, rule ID, rule name, rule version, policy reference and opened-at; never null (an empty case records `[]` with a zero count)
- [ ] Field 2 — **Evidence reviewed**: a snapshot of every evidence row on the in-scope exceptions plus the documents present and documents missing at that instant
- [ ] Field 3 — **AI recommendation**: recommended action, confidence level and basis, rationale, provenance and concurrence — or the explicit `{ present: false, reason: "NOT_GENERATED" }`; never null
- [ ] Field 4 — **User decision**: the action or disposition code plus its action-specific parameters
- [ ] Field 5 — **Decision justification**: the human's free text stored verbatim, never generated, prefilled or defaulted
- [ ] Field 6 — **Timestamp**: server-generated, never client-supplied, and monotonic per case
- [ ] Field 7 — **Approving official**: user ID, name and role, non-null on every approval decision and on any entry transitioning the case to `CLEARED`; on other entries present as an explicit null with an "not applicable" marker
- [ ] Field 8 — **Generated notification**: the notification's ID and a snapshot of its recipient, subject, body, generation timestamp and `transmitted: false`
- [ ] Every entry additionally carries case, shipment, sequence number, entry class, event type, actor kind, actor name and role, status before and after, evaluation version and rule-set fingerprint

**Priority:** P0 | **Feature Ref:** F12

---

### US-6.2: Be Blocked from Finalising an Incomplete Decision
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** a clearance to be impossible when any required audit field would be missing, **so that** an undefendable decision cannot exist in the system.

**Acceptance Criteria:**
- [ ] Completeness rules are applied per entry class before commit, inside the caller's transaction
- [ ] An approval-decision entry requires all eight fields non-null, including a named approving official
- [ ] A human-action entry requires fields 1, 2, 3, 4, 5, 6 and 8
- [ ] A missing required field aborts the enclosing transaction with `AUDIT_INCOMPLETE`, naming the field
- [ ] When an approval is blocked by the completeness gate, the case does **not** move to `CLEARED`
- [ ] The Recommended Resolution screen surfaces the block prominently as "Clearance blocked: the audit record would be incomplete ({field})"
- [ ] There is no path that writes an audit entry in a separate transaction from the state change it records
- [ ] An automated test enumerates every approval entry in seeded and test-generated data and asserts all eight fields are present

**Priority:** P0 | **Feature Ref:** F12, F21

---

### US-6.3: Rely on the Record Being Append-Only
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** audit entries to be impossible to edit or delete through the application, **so that** the record cannot be quietly improved after the fact.

**Acceptance Criteria:**
- [ ] No `PATCH`, `PUT` or `DELETE` route exists for audit entries or notifications — the routes are not defined at all
- [ ] The audit repository exposes only append and read methods; no update or delete method exists to call
- [ ] Database triggers on update and delete raise `AUDIT_IMMUTABLE`
- [ ] The single permitted update is a null-to-non-null write of the notification linkage, within the inserting transaction, once; every other update including a second attempt is rejected
- [ ] Entries form a hash chain in which each entry hashes its own canonical content plus its predecessor's hash
- [ ] A verification endpoint recomputes the chain and reports validity, entries checked and the first invalid sequence number
- [ ] A test that tampers with a row via direct SQL causes verification to fail
- [ ] Sequence numbers are gap-free per case; a gap is reported as a verification failure
- [ ] The only removal path is the administrator-gated full environment reset, which truncates and reseeds everything and writes a `DEMO_RESET` entry as the first row of the new chain
- [ ] Selective deletion of a single entry or a single case's history is not expressible through any surface

**Priority:** P0 | **Feature Ref:** F12, F22

---

### US-6.4: Read the Complete Case Timeline in Chronological Order
**As a** Dwayne Okafor (Supervisor), **I want to** replay the whole history of a case from ingestion to disposition in one view, **so that** I can reconstruct what happened without assembling it by hand.

**Acceptance Criteria:**
- [ ] The timeline spans ingestion, flagging, AI summary and recommendation generation, document request, upload, revalidation, recommendation, approval and every generated notification
- [ ] Entries are ordered by ascending sequence number and the ordering is identical on every load
- [ ] Each entry is returned with a presentation block carrying headline, actor label, authorship (`HUMAN` / `AI` / `SYSTEM`), status change, decision label, justification, exception summary, evidence rows, AI block, approving-official label and notification block
- [ ] Authorship drives visual separation: AI content is never rendered inside a human-decision container
- [ ] The response includes a completeness block reporting total entries, decision entries, decision entries complete and any missing fields
- [ ] Justifications are returned and rendered verbatim and in full, never truncated or paraphrased
- [ ] Access denials and rejected transitions appear in the timeline as their own entry class
- [ ] Audit reads are permitted to all three roles; there is no client-initiated audit write endpoint

**Priority:** P0 | **Feature Ref:** F12, F20

---

### US-6.5: Export a Case Record for Offline Review
**As a** Dwayne Okafor (Supervisor), **I want to** download or print the full audit record for a case in one action, **so that** I can defend a decision in a setting where I do not have the application in front of me.

**Acceptance Criteria:**
- [ ] A JSON export returns every field of every entry plus the hash chain and a verification block
- [ ] The export file is named for the shipment (e.g. `audit-SHP-2026-0007.json`)
- [ ] A printable export returns server-rendered HTML with the same content, suitable for the browser print dialog
- [ ] No PDF toolchain is required or used
- [ ] An export that omits the AI recommendation or the evidence snapshot is a defect
- [ ] An unknown export format is rejected with `INVALID_QUERY_PARAM`
- [ ] An export failure surfaces as a retryable toast and leaves the timeline unaffected

**Priority:** P0 | **Feature Ref:** F12, F20

---

### US-6.6: Read the Evidence as It Was at Decision Time
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** each entry to show the evidence and AI advice as they stood when the decision was made, **so that** later revalidations cannot rewrite what the decider was looking at.

**Acceptance Criteria:**
- [ ] Evidence and AI recommendation are stored as JSON copies on the audit entry, not as foreign keys
- [ ] Revalidating a case after a decision leaves the earlier entry's evidence snapshot byte-identical
- [ ] An implementation that stores only references fails the corresponding automated test
- [ ] The entry records the evaluation version and rule-set fingerprint in force at that moment
- [ ] No entry may carry an AI actor together with a non-null human decision

**Priority:** P0 | **Feature Ref:** F12, F21

---
