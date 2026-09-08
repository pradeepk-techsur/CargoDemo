---

## F1: Cargo Entry Ingestion

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** prerequisite to 1

**Description:** F1 loads simulated cargo entries into the system from a versioned cargo-entry JSON file or a local ingestion API endpoint using the same schema. It validates each entry independently, reports rejected entries without aborting the batch, is idempotent on `shipment_id`, and automatically triggers rule evaluation (F4) on every entry it accepts. It is explicitly not an ACE integration; the simulation boundary is documented in `Y3-integrations.md`.

**Terminology:**
- **Batch:** One ingestion invocation, whether file-driven or API-driven. Produces one `IngestionReport`.
- **Per-entry isolation:** A malformed entry fails alone. The batch continues, and the report distinguishes `created`, `updated`, and `rejected` entries with reasons.
- **Idempotent upsert:** Re-ingesting an entry with an existing `shipment_id` updates the mutable attributes of that entry rather than creating a duplicate, then re-evaluates it (producing a new evaluation version, not a duplicated case).
- **Cargo-entry schema version:** `schema_version` on the envelope, currently `"1.0"`. An unsupported version rejects the whole batch, because field semantics cannot be assumed.

**Sub-features:**
- File ingestion from a known path
- API ingestion of a single entry or an array of entries
- Per-entry schema validation with structured rejection reporting
- Idempotent upsert keyed on `shipment_id`
- Automatic evaluation trigger and case creation/refresh
- Ingestion audit entries

**Process:**
1. The caller invokes ingestion either by starting the app with `CARGODEMO_INGEST_FILE` set, by running the ingestion CLI (`npm run ingest -- <path>`), or by POSTing to `/api/ingest/cargo-entries`.
2. The envelope is parsed. If JSON parsing fails or `schema_version` is absent/unsupported, the batch is rejected in full with `INGEST_SCHEMA_VERSION_UNSUPPORTED` or `INGEST_MALFORMED_JSON`; nothing is written.
3. Each `entries[]` element is validated against the cargo-entry schema (see §Inputs). Validation failures are collected per entry with `shipment_id` (if readable), JSON pointer path, and reason. Invalid entries are skipped.
4. For each valid entry, the ingester normalizes derived fields: `country_of_origin_iso2` and `manufacturer_address_country_iso2` (via the country alias table in F4 §5), `hts_code_normalized` (digits only, per F4 §4), and `shipment_value_cents`.
5. The ingester looks up `shipment_id`. If absent, it inserts a `cargo_entries` row, inserts its `documents` rows, and creates a `cases` row with `status = NEW`. If present, it updates the mutable entry attributes and reconciles documents: declared documents not previously present are inserted with `provenance = 'INGESTED'`; documents already received via `SIMULATED_UPLOAD` are preserved and never overwritten.
6. The ingester writes a `SYSTEM`-actor audit entry per entry: `ENTRY_INGESTED` (new) or `ENTRY_REINGESTED` (updated), capturing the field-level diff for updates.
7. The ingester invokes the rule engine (F4) for the entry, which creates a new evaluation version and its exception set (F5), and recomputes case priority.
8. Case status after ingestion: a newly created case is `NEW`. A re-ingested case retains its current status unless it is `CLEARED`, in which case re-ingestion is refused with `CASE_TERMINAL` — a cleared shipment cannot be silently reopened by a data load.
9. The ingester returns an `IngestionReport` and logs a one-line summary (`ingested=N created=N updated=N rejected=N`).

**Inputs:**

Envelope:
- `schema_version` (string, required): MUST equal `"1.0"`.
- `source` (string, optional): free-text provenance label, e.g. `"seed-file"`, `"demo-api"`. Default `"api"` for API ingestion, the filename for file ingestion.
- `entries` (array, required): 1–500 cargo-entry objects.

Cargo-entry object:
- `shipment_id` (string, required): `^[A-Z]{3}-\d{4}-\d{4}$`.
- `importer_name` (string, required): 1–200 chars.
- `carrier_name` (string, required): 1–200 chars.
- `product_description` (string, required): 1–500 chars.
- `hts_code` (string, required, may be incomplete): 1–20 chars as declared. An empty string is rejected at ingestion; a *missing* HTS code is represented as `null`, which is valid input and produces an `INVALID_HTS_CODE` exception with sub-reason `MISSING`.
- `country_of_origin` (string, required): declared origin as text, 1–100 chars.
- `manufacturer` (object, required):
  - `name` (string, required): 1–200 chars.
  - `address` (object, required): `line1` (string, required), `city` (string, optional), `region` (string, optional), `postal_code` (string, optional), `country` (string, required, 1–100 chars).
- `shipment_value_usd` (number, required): `>= 0`, at most 2 decimals, `<= 1e9`.
- `entry_date` (string, required): ISO-8601 date (`YYYY-MM-DD`).
- `declared_priority_hint` (string, optional): one of `LOW`,`MEDIUM`,`HIGH`,`CRITICAL`. Advisory only; the authoritative priority is derived in F5 and this hint is recorded as evidence input, never used as the final value.
- `documents` (array, optional, default `[]`): objects with `document_type` (string, required, `^[A-Z0-9_]{3,60}$`), `status` (`RECEIVED` | `NOT_RECEIVED`, required), `filename` (string, optional), `received_at` (ISO-8601 datetime, optional).

**Outputs:**
- `IngestionReport`:
  - `batch_id` (uuid), `source`, `received_count`, `created_count`, `updated_count`, `rejected_count`
  - `created[]` / `updated[]`: `{ shipment_id, case_id, evaluation_version, exception_count, priority, status }`
  - `rejected[]`: `{ index, shipment_id_or_null, errors: [{ path, code, message }] }`
- Persisted `cargo_entries`, `documents`, `cases` rows; a new `evaluations` row plus `exceptions`/`evidence` per accepted entry.
- One audit entry per accepted entry; one aggregate `INGEST_BATCH_COMPLETED` audit entry per batch with the counts.

**Validation:**
- Envelope `schema_version` MUST be `"1.0"`; otherwise the batch is rejected atomically.
- `entries` MUST contain between 1 and 500 elements.
- Duplicate `shipment_id` values *within one batch* are rejected after the first occurrence with `INGEST_DUPLICATE_IN_BATCH`, so batch-internal ordering can never produce a nondeterministic result.
- Unknown top-level properties on a cargo-entry object are rejected (`additionalProperties: false`) so silent field drift cannot occur.
- `document_type` values are normalized to upper snake case before comparison; a `RECEIVED` document with no `filename` is rejected with `INGEST_DOCUMENT_FILENAME_REQUIRED`.
- Ingestion MUST NOT create a second case for an existing shipment, and MUST NOT modify a case whose status is `CLEARED`.
- Ingestion MUST NOT downgrade a document from `RECEIVED` to `NOT_RECEIVED` when the existing document's provenance is `SIMULATED_UPLOAD`; the incoming value is ignored and the discrepancy is recorded on the audit diff.
- API ingestion is restricted to `SYSTEM_ADMINISTRATOR` (F14). File/CLI ingestion runs as the `SYSTEM` actor with `system_actor_label = 'ingestion'`.
- Ingestion MUST be deterministic: given the same input file and the same enabled rule set, the resulting exception sets, priorities, and statuses are byte-identical (excluding timestamps, which are taken from a fixed clock in seed mode — see F2).

**State transitions caused:**

| Precondition | Result |
|---|---|
| No case exists for `shipment_id` | Case created with `status = NEW`, priority derived (F5) |
| Case exists, status ∈ {`NEW`,`IN_REVIEW`,`AWAITING_INFORMATION`,`ON_HOLD`,`ESCALATED`,`PENDING_APPROVAL`} | Status unchanged; new evaluation version created; priority recomputed; exception set replaced per F6 reconciliation semantics |
| Case exists, status = `CLEARED` | Rejected with `CASE_TERMINAL`; no write occurs |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Body is not valid JSON | 400 | `INGEST_MALFORMED_JSON` | "Request body is not valid JSON" |
| `schema_version` missing or unsupported | 422 | `INGEST_SCHEMA_VERSION_UNSUPPORTED` | "Unsupported cargo-entry schema version: {value}" |
| `entries` empty or over 500 | 422 | `INGEST_BATCH_SIZE_INVALID` | "entries must contain between 1 and 500 items" |
| Entry fails field validation | 207 (batch) / 422 (single) | `INGEST_ENTRY_INVALID` | "Entry {index} rejected: {first_reason}" |
| Duplicate shipment ID inside one batch | 207 (batch) | `INGEST_DUPLICATE_IN_BATCH` | "Duplicate shipment_id {id} within batch" |
| Received document without filename | 207/422 | `INGEST_DOCUMENT_FILENAME_REQUIRED` | "Received documents must include a filename" |
| Target case already cleared | 207/409 | `CASE_TERMINAL` | "Shipment {id} is Cleared and cannot be re-ingested" |
| Ingestion file not found | n/a (CLI exit 1) | `INGEST_FILE_NOT_FOUND` | "Cargo entry file not found at {path}" |
| Caller lacks the administrator role | 403 | `FORBIDDEN_ROLE` | "Role {role} may not ingest cargo entries" |
| Rule evaluation fails for an accepted entry | 207/500 | `EVALUATION_FAILED` | "Entry stored but evaluation failed: {detail}" |

A batch containing both accepted and rejected entries returns HTTP `207 Multi-Status` with the full `IngestionReport`. A single-entry request returns `201` on success or `422`/`409` on failure.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/ingest/cargo-entries` | ADM | Ingest a batch or single entry |
| GET | `/api/ingest/reports/{batch_id}` | ADM | Retrieve a prior batch report |

Full request/response schemas: `Y1c-api-admin.md` §Ingestion.

**Schema Surface (this feature):** writes `cargo_entries`, `documents`, `cases`, `evaluations` (via F4), `exceptions`/`evidence` (via F5), `audit_entries`; reads `rules`. Ingestion reports are persisted in `ingestion_batches` — see `Y0a-schema-core.md` §Ingestion.
