
## Epic 0: Platform & Data Foundation (F0)

The canonical domain model, the simulated ingestion path, the deterministic seed dataset, and the HTTP contract that the four screens are built on. Nothing in the walkthrough is demonstrable without this epic.

### US-0.1: Persist the Full Cargo Exception Domain
**As a** Priya Raghavan (System Administrator), **I want to** have every cargo entry, document, rule, exception, evidence row, case state, decision, approval, notification and audit record persisted in one migrated schema, **so that** the application starts clean in a fresh sandbox and every screen reads from the same source of truth.

**Acceptance Criteria:**
- [ ] A cargo entry row stores shipment ID, importer, carrier, product description, HTS code, country of origin, manufacturer name, manufacturer address, shipment value and priority
- [ ] Document rows store type, required/received state, filename, provenance (`SEEDED` / `INGESTED` / `SIMULATED_UPLOAD`) and received timestamp
- [ ] Exception rows link a shipment to the rule that fired, the exception type, severity and captured evidence rows
- [ ] Case rows carry exactly one of the seven canonical statuses (`NEW`, `IN_REVIEW`, `AWAITING_INFORMATION`, `ON_HOLD`, `ESCALATED`, `PENDING_APPROVAL`, `CLEARED`) at all times — never null or intermediate
- [ ] Decision, recommendation, approval, notification and audit-record rows all carry actor attribution (user ID, name, role) and a server-generated timestamp
- [ ] Running migrations against an empty database produces the full schema with no manual step
- [ ] Re-running migrations is idempotent and produces an identical schema fingerprint

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Ingest Simulated Cargo Entries from a JSON File
**As a** Priya Raghavan (System Administrator), **I want to** load cargo entries from a versioned cargo-entry JSON file at a known path, **so that** the demo has realistic data without any ACE integration.

**Acceptance Criteria:**
- [ ] Ingestion reads the cargo-entry JSON file from the configured path and creates or updates one cargo entry per record
- [ ] Ingestion is idempotent on shipment ID — re-ingesting the same entry updates it and never creates a duplicate
- [ ] Payloads are validated against the cargo-entry schema before persistence
- [ ] A malformed or incomplete entry is reported with its index and the failing field, and the remaining entries in the batch still ingest
- [ ] Every successfully ingested entry automatically triggers rule validation (F4)
- [ ] An `ENTRY_INGESTED` (or `ENTRY_REINGESTED`) audit entry is written for each entry with `actor_kind = SYSTEM`
- [ ] No ACE endpoint, credential or client library exists anywhere in the codebase

**Priority:** P0 | **Feature Ref:** F1

---

### US-0.3: Post Cargo Entries to a Local Ingestion Endpoint
**As a** Priya Raghavan (System Administrator), **I want to** post cargo entries to a lightweight local API endpoint using the same schema as the file, **so that** I can refresh or add entries mid-session without restarting the application.

**Acceptance Criteria:**
- [ ] The ingestion endpoint accepts a single entry or a batch using the identical cargo-entry schema as the file loader
- [ ] The endpoint returns a per-entry result of accepted / updated / rejected with the rejection reason
- [ ] Rejections use the consistent error contract and do not abort the accepted entries in the batch
- [ ] Ingestion via the endpoint triggers the same validation and audit behaviour as file ingestion
- [ ] The endpoint is restricted to the System Administrator role and rejects Cargo Specialist and Supervisor with `FORBIDDEN_ROLE`
- [ ] Re-ingesting an entry whose case is `CLEARED` is rejected with `CASE_TERMINAL` rather than mutating a closed case

**Priority:** P0 | **Feature Ref:** F1, F14

---

### US-0.4: Start with a Seeded, Deterministic Demo Dataset
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** see the application already populated with realistic flagged shipments when the walkthrough begins, **so that** no step depends on someone typing data in front of me.

**Acceptance Criteria:**
- [ ] The database seeds 10–15 synthetic shipments on first start and on explicit reset
- [ ] All three exception types (missing required document, invalid/incomplete HTS code, conflicting country-of-origin) are represented in the seed data
- [ ] At least one shipment carries multiple simultaneous exceptions
- [ ] All seven queue statuses are represented, including at least one already-`CLEARED` shipment with a complete historical audit record of at least 8 entries and a named approving official
- [ ] At least one clean shipment exists with zero exceptions and does not appear on the default queue
- [ ] The canonical scenario is present verbatim: solar panels, country of origin Malaysia, manufacturer address in China, incomplete HTS code, $85,000 invoice value, required certificate missing
- [ ] Synthetic document fixtures exist for both pre-attached documents and the step-6 simulated upload
- [ ] The seed script is safe to re-run and produces identical IDs, identical timestamps and identical row counts every time
- [ ] Seed data contains no real importer/carrier names and no PII — verified by an automated deny-list scan over seed data, fixtures and prompts

**Priority:** P0 | **Feature Ref:** F2

---

### US-0.5: Consume One Consistent Backend API from the UI
**As a** Marisol Reyes (Cargo Specialist), **I want to** every screen I use to be backed by a predictable HTTP contract with server-side authorisation, **so that** the interface never shows me an action the server would refuse and never hides one it would allow.

**Acceptance Criteria:**
- [ ] Read endpoints exist for the exception queue (filter and sort by status, exception type and priority) and for full shipment detail
- [ ] Action endpoints exist for the five user actions, document request, document upload, revalidation and approval decisions
- [ ] Endpoints exist to retrieve the AI summary and the AI recommended resolution
- [ ] Rule CRUD endpoints exist and are restricted to the System Administrator role
- [ ] Audit and notification read endpoints exist and are readable by all three roles (cross-case audit search is restricted to Supervisor and Administrator)
- [ ] Every mutating endpoint enforces role authorisation server-side, independently of any UI state
- [ ] Every error response uses the consistent error contract with an error code, human-readable message and `request_id`
- [ ] Request bodies are schema-validated and unknown properties are rejected rather than ignored
- [ ] Mutating action and approval endpoints honour `Idempotency-Key` replay by returning the original result without producing a second write

**Priority:** P0 | **Feature Ref:** F3, F14

---
