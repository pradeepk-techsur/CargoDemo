---

## F10: Document Request & Simulated Upload

**Priority:** P0 · **Category:** Workflow, Approvals & Governance · **Walkthrough steps:** 5, 6

**Description:** F10 lets a specialist request a specific missing document, then accept a simulated upload of that document against the open request, which attaches it to the shipment's document set and automatically triggers revalidation. It tracks the request lifecycle with requester, fulfiller, and timestamps, and it displays provenance so a viewer can always tell whether a document was seeded or uploaded during the session. No real importer correspondence exists and nothing is transmitted; the simulation boundary is documented in `Y3-integrations.md`.

**Terminology:**
- **Document request:** A `document_requests` row created by the `REQUEST_INFORMATION` action (F09b §2). One row per requested document type.
- **Request lifecycle:** `OUTSTANDING → FULFILLED` (a matching document was uploaded or ingested) or `OUTSTANDING → CANCELLED` (superseded by a review/clearance action). Terminal states are never reopened; a new need produces a new request.
- **Simulated upload:** Attaching a synthetic file to an outstanding request through `POST /api/document-requests/{id}/upload`. The file is stored in local document storage and the shipment gains a `documents` row with `provenance = 'SIMULATED_UPLOAD'`.
- **Provenance:** `SEEDED` (present at seed time), `INGESTED` (declared by a cargo-entry payload), or `SIMULATED_UPLOAD` (attached during a session). Displayed on F18 next to every document.
- **Fixture allow-list:** The set of synthetic files the system will accept. Uploads are restricted to synthetic content by size, MIME type, extension, and a content sanity check.

**Sub-features:**
- Document request creation tied to a missing-document exception and its rule
- Request lifecycle tracking with full attribution
- Simulated upload against an outstanding request
- Document attachment with provenance
- Automatic revalidation on successful upload
- Provenance display and request history

**Process:**
1. A specialist (or supervisor) executes `REQUEST_INFORMATION` (F09b §2). One `document_requests` row is created per requested type with `status = 'OUTSTANDING'`, `requested_by_user_id`, `requested_by_name`, `requested_at`, `linked_exception_id`, `linked_rule_id`, and `requested_from`. The case moves to `AWAITING_INFORMATION` and an audit entry plus notification are written. *(Walkthrough step 5 completes here.)*
2. The Shipment Review screen (F18) shows the outstanding request with an Upload control. The control is enabled only for `CARGO_SPECIALIST` and `SUPERVISOR`, and only while the request is `OUTSTANDING`.
3. The user selects a synthetic fixture. In the demo the UI offers the seeded upload-ready fixtures for the shipment (F2), so no file needs to be sourced from the presenter's machine; an arbitrary file may still be chosen and is subject to the same validation.
4. The client posts `multipart/form-data` to `POST /api/document-requests/{request_id}/upload` with the file part and a JSON `metadata` part.
5. The server validates the request state (`OUTSTANDING`), the case state (not `CLEARED`), the acting role, and the file (§Validation). Any failure aborts before anything is written to disk.
6. The server writes the file to `CARGODEMO_DOC_STORAGE_DIR/{shipment_id}/{request_id}-{sanitized_filename}`, computes its SHA-256, and records `file_size_bytes`, `mime_type`, and `content_hash`. A file whose hash already exists for the same shipment and document type is accepted but flagged `duplicate_of_document_id` so a re-upload during a repeated demo is visible rather than confusing.
7. The server inserts a `documents` row: `{ cargo_entry_id, document_type (copied from the request, not from client input), status: 'RECEIVED', filename, storage_path, content_hash, file_size_bytes, mime_type, provenance: 'SIMULATED_UPLOAD', uploaded_by_user_id, received_at, source_request_id }`. Taking the document type from the request rather than the payload is what makes it impossible to satisfy a certificate-of-origin requirement by uploading a file labelled as something else.
8. The server marks the request `FULFILLED` with `fulfilled_by_user_id`, `fulfilled_at`, and `fulfilling_document_id`.
9. The server **automatically triggers revalidation** (F6) with `trigger = DOCUMENT_UPLOAD`, inside the same transaction, so an upload can never leave the exception set stale. *(Walkthrough steps 6 and 7 complete here.)*
10. The server writes a `DOCUMENT_UPLOADED` audit entry (distinct from the `REVALIDATED` entry that F6 appends) and generates a notification.
11. The server responds with the created document, the updated request, and the embedded `RevalidationResult`, so the UI can render the "what changed" indication immediately without a second round trip.

**Inputs:**

*Request creation* — via the `REQUEST_INFORMATION` action (F09b §2), not a separate endpoint.

*Upload* — `POST /api/document-requests/{request_id}/upload`, `multipart/form-data`:
- `file` (binary, required): the synthetic document
- `metadata` (JSON part, required):
  - `original_filename` (string, required, 1–255 chars, `^[A-Za-z0-9._ -]+$`)
  - `note` (string, optional, ≤ 500 chars): free-text note recorded on the document and the audit entry
  - `stated_country` (string, optional, ≤ 100 chars): for certificate-type documents, the origin the document asserts. Recorded on the document so the optional `rule-origin-certificate` rule (F4 §7) has a field to read. Purely declarative — no document parsing exists.
- Headers: `X-CargoDemo-Session`, `Idempotency-Key`, `If-Match-Case-Version`

*Cancellation* — `POST /api/document-requests/{request_id}/cancel` with `{ reason: string (10–500 chars) }`.

**Outputs:**
- `UploadResult`:
  - `document`: `{ id, document_type, filename, provenance, content_hash, file_size_bytes, mime_type, received_at, uploaded_by: { id, name, role }, duplicate_of_document_id }`
  - `request`: `{ id, document_type, status: "FULFILLED", requested_by, requested_at, fulfilled_by, fulfilled_at }`
  - `revalidation`: the full `RevalidationResult` from F6
  - `audit_entry_id`, `notification_id`, `case_version`
- Persisted file in document storage; `documents`, `document_requests`, `evaluations`, `exceptions`, `evidence`, `cases`, `audit_entries`, `notifications` rows

**Validation:**
- The request MUST exist and be `OUTSTANDING`; `FULFILLED` or `CANCELLED` requests reject with `REQUEST_NOT_OUTSTANDING`.
- The case MUST NOT be `CLEARED` (`CASE_TERMINAL`).
- Acting role MUST be `CARGO_SPECIALIST` or `SUPERVISOR`; `SYSTEM_ADMINISTRATOR` is denied (F14) — the administrator does not participate in adjudication evidence.
- **File size:** 1 byte – 5 MB. Empty files reject with `FILE_EMPTY`; oversize with `413 PAYLOAD_TOO_LARGE`.
- **MIME type:** allow-list `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`. Anything else rejects with `415 UNSUPPORTED_MEDIA_TYPE`.
- **Extension:** MUST match the declared MIME type (`.pdf`, `.png`, `.jpg`/`.jpeg`, `.txt`, `.csv`); a mismatch rejects with `FILE_EXTENSION_MISMATCH`.
- **Magic-byte check:** the first bytes MUST be consistent with the declared MIME type (`%PDF-` for PDF, PNG/JPEG signatures for images; text types are checked for valid UTF-8 and the absence of NUL bytes). A mismatch rejects with `FILE_CONTENT_MISMATCH`. This is what enforces "restricted to synthetic fixtures" in practice: an executable or archive cannot be smuggled in under a permitted extension.
- **Filename sanitization:** path separators, `..`, control characters, and leading dots are stripped before storage. The stored path is always inside `CARGODEMO_DOC_STORAGE_DIR`; a computed path that escapes it aborts with `STORAGE_PATH_INVALID`.
- **PII screen:** for `text/plain` and `text/csv`, the content is screened against the PII deny-list patterns used by F2 (email, US phone, SSN-shaped digits). A match rejects with `PII_SUSPECTED` — the demo must remain safely public.
- `document_type` is NEVER read from client input on this endpoint; it is copied from the request row.
- Upload MUST trigger exactly one revalidation. Two concurrent uploads against the same case serialize on the case row; the second sees the first's evaluation and produces its own subsequent version.
- Idempotency-Key replay MUST return the original `UploadResult` without creating a second document, a second revalidation, or a second audit entry.
- A request MUST NOT be fulfilled by a document whose type differs from the requested type — structurally guaranteed by step 7.
- Cancellation is permitted only from `OUTSTANDING`, requires a reason, and does not by itself change the case status (the case status changes only through the F9 actions that cancel requests as a side effect).

**State transitions caused:**

| Event | Case status effect |
|---|---|
| Document request created (via `REQUEST_INFORMATION`) | → `AWAITING_INFORMATION` (F09a T01/T06/T11/T16/T21/T26) |
| Upload succeeds, all outstanding requests now fulfilled | Revalidation moves `AWAITING_INFORMATION → IN_REVIEW` (F6) |
| Upload succeeds, other requests still outstanding | Case remains `AWAITING_INFORMATION` |
| Upload succeeds while case is `ON_HOLD`/`ESCALATED`/`PENDING_APPROVAL` | Status unchanged; revalidation still runs and its result is recorded |
| Request cancelled | No direct status change |

**Walkthrough steps 5–7, worked:** Marisol Reyes (CS) requests `CERTIFICATE_OF_ORIGIN` on `SHP-2026-0007` with a justification → request `dr-0007-coo` is `OUTSTANDING`, case `NEW → AWAITING_INFORMATION`, audit + notification written. She uploads `CERTIFICATE_OF_ORIGIN_SHP-2026-0007.pdf` (the seeded upload-ready fixture) → document attached with `provenance = SIMULATED_UPLOAD`, request `FULFILLED`, revalidation runs at v2, the missing-document exception resolves, the HTS and origin exceptions are retained, the case moves to `IN_REVIEW`, and F18 renders "1 resolved, 2 retained".

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Request not found | 404 | `RESOURCE_NOT_FOUND` | "Document request {id} not found" |
| Request already fulfilled or cancelled | 409 | `REQUEST_NOT_OUTSTANDING` | "Request is {status} and cannot accept an upload" |
| Case cleared | 409 | `CASE_TERMINAL` | "Shipment {id} is Cleared" |
| Role not permitted | 403 | `FORBIDDEN_ROLE` | "Role {role} may not upload documents" |
| No file part | 422 | `FILE_REQUIRED` | "A file is required" |
| Empty file | 422 | `FILE_EMPTY` | "Uploaded file is empty" |
| File > 5 MB | 413 | `PAYLOAD_TOO_LARGE` | "File exceeds the 5 MB limit" |
| Disallowed MIME type | 415 | `UNSUPPORTED_MEDIA_TYPE` | "Content type {type} is not accepted" |
| Extension/MIME mismatch | 422 | `FILE_EXTENSION_MISMATCH` | "Extension {ext} does not match content type {type}" |
| Magic bytes inconsistent | 422 | `FILE_CONTENT_MISMATCH` | "File content does not match its declared type" |
| PII detected in text content | 422 | `PII_SUSPECTED` | "Uploaded content appears to contain personal data and was rejected" |
| Storage path escapes the storage directory | 500 | `STORAGE_PATH_INVALID` | "Invalid storage path" |
| Disk write failure | 500 | `STORAGE_WRITE_FAILED` | "Could not store the uploaded document" |
| Revalidation failed after attachment | 500 | `EVALUATION_FAILED` | "Upload rolled back: revalidation failed" |
| Cancel on a non-outstanding request | 409 | `REQUEST_NOT_OUTSTANDING` | "Only outstanding requests can be cancelled" |
| Cancel without a reason | 422 | `VALIDATION_FAILED` | "A cancellation reason is required" |

Because attachment and revalidation share one transaction, a revalidation failure rolls back the document row and the request status; the stored file is removed in the same cleanup path, so storage never diverges from the database.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/shipments/{id}/documents` | CS, SUP, ADM | Document set with provenance and request linkage |
| GET | `/api/shipments/{id}/document-requests` | CS, SUP, ADM | Request history with lifecycle and attribution |
| POST | `/api/document-requests/{id}/upload` | CS, SUP | Simulated upload (multipart) |
| POST | `/api/document-requests/{id}/cancel` | CS, SUP | Cancel an outstanding request |
| GET | `/api/documents/{id}/content` | CS, SUP, ADM | Download the stored synthetic file |
| GET | `/api/shipments/{id}/upload-fixtures` | CS, SUP | Seeded upload-ready fixtures offered by the UI |

Full schemas: `Y1b-api-actions.md` §Documents.

**Schema Surface (this feature):** writes `documents`, `document_requests`, `audit_entries`, `notifications`, and (via F6) `evaluations`/`exceptions`/`evidence`/`cases`. Files on the filesystem under `CARGODEMO_DOC_STORAGE_DIR`. See `Y0a-schema-core.md` §Documents.
