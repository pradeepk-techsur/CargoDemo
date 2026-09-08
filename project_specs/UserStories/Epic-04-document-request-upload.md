
## Epic 4: Document Request & Simulated Upload (F10)

The request → upload → revalidate loop, tracked with full attribution and visible provenance, restricted to synthetic files.

### US-4.1: Track the Lifecycle of a Document Request
**As a** Marisol Reyes (Cargo Specialist), **I want to** every document request to be tracked from requested to fulfilled or cancelled with who did what and when, **so that** I never lose track of what is outstanding on a shipment.

**Acceptance Criteria:**
- [ ] A request row carries document type, status, requester identity and timestamp, linked exception, linked rule and the descriptive addressee label
- [ ] Statuses are `OUTSTANDING`, `FULFILLED` and `CANCELLED`; terminal states are never reopened and a renewed need creates a new request
- [ ] Fulfilment records the fulfilling user, the fulfilment timestamp and the fulfilling document ID
- [ ] Cancellation is permitted only from `OUTSTANDING`, requires a reason of 10–500 characters, and does not by itself change the case status
- [ ] The Shipment Review screen lists request history with lifecycle state and full attribution
- [ ] A request whose document type becomes satisfied by revalidation is marked `FULFILLED` automatically

**Priority:** P0 | **Feature Ref:** F10

---

### US-4.2: Upload a Simulated Document Against an Open Request
**As a** Marisol Reyes (Cargo Specialist), **I want to** attach a synthetic document to the open request from within the Shipment Review screen, **so that** the requested evidence reaches the shipment record without any real importer correspondence.

**Acceptance Criteria:**
- [ ] The upload control appears only on rows whose request is `OUTSTANDING`, and only for Cargo Specialist and Supervisor
- [ ] The UI offers the seeded upload-ready fixtures for that shipment, so nothing needs sourcing from the presenter's machine
- [ ] An arbitrary file may still be chosen and is subject to identical validation
- [ ] The stored document's type is copied from the request row and is never read from client input
- [ ] A `documents` row is created with `status = RECEIVED`, `provenance = SIMULATED_UPLOAD`, filename, content hash, size, MIME type, uploading user and received timestamp
- [ ] The request transitions to `FULFILLED`
- [ ] Uploading to a `FULFILLED` or `CANCELLED` request is rejected with `REQUEST_NOT_OUTSTANDING`
- [ ] Uploading against a `CLEARED` case is rejected with `CASE_TERMINAL`
- [ ] A System Administrator attempting an upload is rejected with `FORBIDDEN_ROLE`
- [ ] Re-uploading identical content for the same shipment and type is accepted but flagged as a duplicate rather than silently overwriting

**Priority:** P0 | **Feature Ref:** F10, F14

---

### US-4.3: Be Prevented from Uploading Anything Other Than a Synthetic Document
**As a** Priya Raghavan (System Administrator), **I want to** uploads restricted to synthetic, safe content by type, size and inspection, **so that** the demo stays publicly presentable and no real or executable content can enter it.

**Acceptance Criteria:**
- [ ] File size must be between 1 byte and 5 MB; empty files reject with `FILE_EMPTY` and oversize with `413 PAYLOAD_TOO_LARGE`
- [ ] MIME type must be in the allow-list `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`; anything else rejects with `415 UNSUPPORTED_MEDIA_TYPE`
- [ ] The file extension must match the declared MIME type, otherwise `FILE_EXTENSION_MISMATCH`
- [ ] Magic bytes must be consistent with the declared type, otherwise `FILE_CONTENT_MISMATCH` — an archive or executable cannot be smuggled in under a permitted extension
- [ ] Text and CSV content is screened against the PII deny-list (email, US phone, SSN-shaped digits) and rejected with `PII_SUSPECTED` on a match
- [ ] Filenames are sanitised: path separators, `..`, control characters and leading dots are stripped
- [ ] A computed storage path that escapes the configured storage directory aborts with `STORAGE_PATH_INVALID`
- [ ] Every rejection happens before anything is written to disk

**Priority:** P0 | **Feature Ref:** F10

---

### US-4.4: Have an Upload Trigger Revalidation Atomically
**As a** Marisol Reyes (Cargo Specialist), **I want to** an upload to immediately re-run the rules and show me what changed, **so that** the exception set can never be stale after evidence arrives.

**Acceptance Criteria:**
- [ ] A successful upload triggers exactly one revalidation, in the same transaction as the attachment
- [ ] The upload response embeds the full revalidation result, so the UI renders "what changed" without a second round trip
- [ ] A `DOCUMENT_UPLOADED` audit entry is written, distinct from the `REVALIDATED` entry, plus a notification
- [ ] If revalidation fails, the document row, the request status change and the stored file are all rolled back together — storage never diverges from the database
- [ ] `Idempotency-Key` replay returns the original result without creating a second document, revalidation or audit entry
- [ ] Two concurrent uploads on the same case serialise on the case row, and the second produces its own subsequent evaluation version
- [ ] When all outstanding requests are fulfilled, the case moves from `AWAITING_INFORMATION` to `IN_REVIEW`; when others remain outstanding it stays `AWAITING_INFORMATION`
- [ ] An upload on an `ON_HOLD`, `ESCALATED` or `PENDING_APPROVAL` case leaves the status unchanged but still runs and records the revalidation

**Priority:** P0 | **Feature Ref:** F10, F6

---

### US-4.5: See Where Every Document Came From
**As a** Angela Pruitt (CBP Evaluating Stakeholder), **I want to** each document to declare whether it was seeded, ingested or uploaded during this session, **so that** I can tell live activity from pre-existing data.

**Acceptance Criteria:**
- [ ] Every document row displays provenance as `Seeded`, `Ingested` or `Uploaded this session`
- [ ] Documents uploaded during the session are visually marked as such on the Shipment Review screen
- [ ] The documents panel shows missing documents explicitly as an absence, not by omission
- [ ] Each row shows type, state (`Received` / `Missing` / `Requested`), filename with download link, received timestamp, and for requested items the requester and request time
- [ ] There is no free-floating "attach a document" affordance — every document has either a seeded provenance or a requested one

**Priority:** P0 | **Feature Ref:** F10, F18

---
