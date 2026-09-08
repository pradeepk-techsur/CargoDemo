---

# 2. Data Model

## 2.1 Storage Conventions

SQLite dialect, file-backed at `CARGODEMO_DB_PATH` (default `./data/cargodemo.db`). These conventions are inherited verbatim from FRD `Y0a` §Preamble and are not restated per table.

| Convention | Value | Rationale |
|---|---|---|
| Primary keys | `TEXT` holding UUIDv4 or a prefixed identifier (`rule-<slug>`, `usr-cs-001`, `case-0007`) | Prefixed IDs make the seeded demo data readable on screen during the walkthrough; deterministic generation makes SD-03 pass |
| Timestamps | `TEXT`, ISO-8601 UTC with milliseconds — `YYYY-MM-DDTHH:MM:SS.sssZ` | Lexicographic and chronological ordering coincide, so `ORDER BY occurred_at` needs no casting and the audit monotonicity check is a string comparison |
| Money | `INTEGER` cents (`shipment_value_cents`) | No floating-point money anywhere; the API projects a decimal *string* (`"85000.00"`), never a JS number |
| Booleans | `INTEGER` `0`/`1` with a `CHECK` | SQLite has no boolean type; the `CHECK` prevents a third value |
| Enums | `TEXT` with a `CHECK … IN (…)` | The closed-enum `CHECK` on `exception_type` is what makes a fourth exception type structurally impossible (PRD §5.8) |
| JSON columns | `TEXT` suffixed `_json`, always non-null with a defined empty form (`'[]'`, `'{}'`) | "Absent" is recorded explicitly rather than as `NULL`, which is what lets the eight-field audit completeness rule be satisfiable |
| Per-connection pragmas | `foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000` | `foreign_keys` is **off by default in SQLite** and must be set on every connection or `ON DELETE RESTRICT` is inert |
| Deletes | `ON DELETE RESTRICT` on **every** foreign key; no cascade exists anywhere | No single delete can silently remove history (P5). The only bulk removal is the administrator reset |
| Migrations | Forward-only, numbered, checksum-verified at startup | A changed applied migration aborts with `MIGRATION_CHECKSUM_MISMATCH` rather than serving against a drifted schema |

**Schema integrity self-check (startup, blocking).** After migrations the server asserts that `foreign_keys` is on, that the four governance `CHECK` constraints are present (`cases` clearance, `approvals` SoD, `approvals` role, `notifications` transmitted), and that the three append-only triggers exist. A failure aborts with `SCHEMA_INTEGRITY_FAILED` and exit code 1. **The application never serves requests against a database whose audit triggers it has not verified.**

## 2.2 Entity-Relationship Model

```
                          ┌──────────┐
                          │  users   │──────────< sessions
                          └────┬─────┘
                               │ (assigned_to, escalated_to, approving_official,
                               │  actor on every action/approval/audit row)
                               ▼
  ┌───────────────┐  1:1  ┌─────────┐  1:n   ┌──────────────┐
  │ cargo_entries │───────│  cases  │────────│ case_actions │
  └───┬───────┬───┘       └────┬────┘        └──────────────┘
      │       │                │  1:n   ┌──────────────────┐  1:n  ┌───────────┐
      │       │                ├────────│ recommendations  │───────│ approvals │
      │       │                │        └──────────────────┘       └───────────┘
      │       │                │  1:n   ┌───────────────────┐ 1:0..1 ┌──────────────┐
      │       │                ├────────│  audit_entries    │────────│notifications │
      │       │                │        └───────────────────┘        └──────┬───────┘
      │       │                │             (mutual reference)             │ 1:n
      │       │                │  1:n   ┌──────────────┐                    ▼
      │       │                ├────────│  ai_outputs  │           notification_reads
      │       │                │        └──────────────┘
      │       │                │  1:n   ┌───────────────────┐ 0..1  ┌───────────┐
      │       │                └────────│ document_requests │───────│ documents │
      │       │                         └───────────────────┘       └─────┬─────┘
      │       │  1:n                                                      │
      │       └──────────────────────────────────────────────────────────►│
      │  1:n
      ▼
  ┌─────────────┐  1:n   ┌────────────┐  1:n   ┌──────────┐
  │ evaluations │────────│ exceptions │────────│ evidence │
  └─────────────┘        └─────┬──────┘        └──────────┘
                               │ n:1
                         ┌─────▼─────┐
                         │   rules   │
                         └───────────┘

  ingestion_batches ──< cargo_entries        idempotency_keys, request_log (standalone)
```

**Four relationships carry the governance weight of the whole system:**

1. `cargo_entries 1──n evaluations ──n exceptions ──n evidence` — history is a chain of *versions*, not a mutable current state. Revalidation appends a new `evaluations` row; nothing upstream is edited (AD-12).
2. `recommendations 1──n approvals` with `approvals.recommended_by_user_id` **copied** onto the approval row — a copy is required because `CHECK (approver_user_id <> recommended_by_user_id)` cannot reach across tables in SQLite. This is separation of duties expressed as a column-level constraint.
3. `audit_entries 1──0..1 notifications` is a *mutual* reference, resolved by inserting the audit entry, inserting the notification, then performing the single trigger-permitted `notification_id` update inside the same transaction (`01-components` §1.5 step 8).
4. `rules 1──n exceptions` with `rule_version` **stamped onto the exception** — so an audit reader can prove which version of which rule produced a finding, even after the administrator has edited the rule.

## 2.3 Migrations

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  checksum    TEXT NOT NULL,
  applied_at  TEXT NOT NULL
);
```

## 2.4 Cargo Entries

```sql
CREATE TABLE cargo_entries (
  id                                TEXT PRIMARY KEY,
  shipment_id                       TEXT NOT NULL UNIQUE,
  importer_name                     TEXT NOT NULL,
  carrier_name                      TEXT NOT NULL,
  product_description               TEXT NOT NULL,
  hts_code                          TEXT,                      -- declared, may be null/incomplete
  hts_code_normalized               TEXT,                      -- digits only, F4 §4 step 2
  country_of_origin                 TEXT NOT NULL,             -- declared text
  country_of_origin_iso2            TEXT,                      -- normalized, null when unmappable
  manufacturer_name                 TEXT NOT NULL,
  manufacturer_address_line1        TEXT NOT NULL,
  manufacturer_address_city         TEXT,
  manufacturer_address_region       TEXT,
  manufacturer_address_postal_code  TEXT,
  manufacturer_address_country      TEXT NOT NULL,
  manufacturer_address_country_iso2 TEXT,
  shipment_value_cents              INTEGER NOT NULL CHECK (shipment_value_cents >= 0),
  entry_date                        TEXT NOT NULL,             -- YYYY-MM-DD
  declared_priority_hint            TEXT CHECK (declared_priority_hint IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  ingestion_source                  TEXT NOT NULL,             -- 'seed' | 'file:<name>' | 'api'
  ingestion_batch_id                TEXT REFERENCES ingestion_batches(id),
  created_at                        TEXT NOT NULL,
  updated_at                        TEXT NOT NULL,
  CHECK (shipment_id GLOB '[A-Z][A-Z][A-Z]-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]')
);
CREATE INDEX idx_cargo_entries_importer ON cargo_entries(importer_name);
CREATE INDEX idx_cargo_entries_value    ON cargo_entries(shipment_value_cents);
```

Both the raw and the normalized value are stored for HTS and for both country fields. The rule evaluators compare normalized values; the evidence rows display **both**, so a specialist sees `Malaysia` and `MY` side by side and can judge the normalization itself. `ingestion_source` keeps the ACE-simulation boundary visible on every shipment (`Y3` §2).

## 2.5 Documents

```sql
CREATE TABLE documents (
  id                     TEXT PRIMARY KEY,
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  document_type          TEXT NOT NULL,                       -- upper snake case, normalized
  status                 TEXT NOT NULL CHECK (status IN ('RECEIVED','NOT_RECEIVED')),
  filename               TEXT,
  storage_path           TEXT,
  content_hash           TEXT,                                -- sha256 hex
  file_size_bytes        INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 5242880),
  mime_type              TEXT CHECK (mime_type IS NULL OR mime_type IN
                           ('application/pdf','image/png','image/jpeg','text/plain','text/csv')),
  provenance             TEXT NOT NULL CHECK (provenance IN ('SEEDED','INGESTED','SIMULATED_UPLOAD')),
  stated_country         TEXT,                                -- declarative, for origin rules reading documents.*
  note                   TEXT,
  superseded             INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0,1)),
  duplicate_of_document_id TEXT REFERENCES documents(id),
  source_request_id      TEXT REFERENCES document_requests(id),
  uploaded_by_user_id    TEXT REFERENCES users(id),
  received_at            TEXT,
  created_at             TEXT NOT NULL,
  -- F10 §Validation: a RECEIVED document must have a file when it is expected to satisfy a rule
  CHECK (status <> 'RECEIVED' OR filename IS NOT NULL)
);
CREATE INDEX idx_documents_entry_type ON documents(cargo_entry_id, document_type, status);
CREATE UNIQUE INDEX idx_documents_active_type
  ON documents(cargo_entry_id, document_type)
  WHERE superseded = 0 AND status = 'RECEIVED';
```

The MIME allow-list and the 5 MB ceiling are enforced **three times** — by the multipart parser, by magic-byte inspection in `FsDocumentStore`, and by these `CHECK` constraints — so a bypass of the upload handler still cannot persist an unexpected file type. `provenance` is what the Shipment Review screen renders as "Seeded" vs "Uploaded this session", making the simulation boundary visible in walkthrough step 6.

## 2.6 Document Requests

```sql
CREATE TABLE document_requests (
  id                     TEXT PRIMARY KEY,
  case_id                TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  document_type          TEXT NOT NULL,
  status                 TEXT NOT NULL CHECK (status IN
                           ('OUTSTANDING','FULFILLED','CANCELLED','CANCELLED_BY_CLEARANCE')),
  linked_exception_id    TEXT REFERENCES exceptions(id),
  linked_rule_id         TEXT REFERENCES rules(id),
  requested_from         TEXT,
  due_by                 TEXT,
  requested_by_user_id   TEXT NOT NULL REFERENCES users(id),
  requested_by_name      TEXT NOT NULL,
  requested_at           TEXT NOT NULL,
  fulfilled_by_user_id   TEXT REFERENCES users(id),
  fulfilled_at           TEXT,
  fulfilling_document_id TEXT REFERENCES documents(id),
  cancellation_reason    TEXT,
  cancelled_by_user_id   TEXT REFERENCES users(id),
  cancelled_at           TEXT,
  created_at             TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_document_requests_outstanding
  ON document_requests(cargo_entry_id, document_type)
  WHERE status = 'OUTSTANDING';                                -- enforces guard G-DUP (F09a §3)
CREATE INDEX idx_document_requests_case ON document_requests(case_id, status);
```

The partial unique index **is** guard G-DUP. The handler check produces the friendly `DUPLICATE_DOCUMENT_REQUEST` error; the index guarantees that a race or a defective path cannot open two outstanding requests for the same document type.

## 2.7 Rules — Configuration Storage

```sql
CREATE TABLE rules (
  id                TEXT PRIMARY KEY,                          -- 'rule-<slug>'
  name              TEXT NOT NULL,
  name_lower        TEXT NOT NULL UNIQUE,                      -- case-insensitive uniqueness
  exception_type    TEXT NOT NULL CHECK (exception_type IN
                      ('MISSING_REQUIRED_DOCUMENT','INVALID_HTS_CODE','CONFLICTING_COUNTRY_OF_ORIGIN')),
  description       TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 500),
  policy_reference  TEXT NOT NULL CHECK (length(policy_reference) BETWEEN 3 AND 120),
  severity          TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority_mapping  TEXT,                                      -- JSON object, nullable = identity
  conditions_json   TEXT NOT NULL DEFAULT '{}',                -- F4 §3
  params_json       TEXT NOT NULL,                             -- F4 §4–§6, schema-validated per type
  enabled           INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  version           INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by_user_id TEXT REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_rules_enabled_type ON rules(enabled, exception_type);
```

**This table is the entirety of the rule configuration store.** There is deliberately **no** `DELETE` path for `rules` (F15 §Validation); retirement is `enabled = 0`, so a disabled rule remains referenceable by the historical exceptions it produced. The `params_json`/`conditions_json` contract, its Ajv validation, and the cache-invalidation model are specified in `06a-integrations-rules-ai` §2.

## 2.8 Evaluations

```sql
CREATE TABLE evaluations (
  id                    TEXT PRIMARY KEY,
  cargo_entry_id        TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id               TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  version               INTEGER NOT NULL CHECK (version >= 1),
  trigger               TEXT NOT NULL CHECK (trigger IN
                          ('INGESTION','MANUAL_REVALIDATION','DOCUMENT_UPLOAD','RULE_CHANGE','SEED')),
  rule_set_fingerprint  TEXT NOT NULL,                         -- sha256 over ordered (rule_id, version, enabled)
  skipped_rules_json    TEXT NOT NULL DEFAULT '[]',
  invalid_rules_json    TEXT NOT NULL DEFAULT '[]',
  finding_count         INTEGER NOT NULL DEFAULT 0,
  duration_ms           INTEGER,
  actor_kind            TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM')),
  actor_user_id         TEXT REFERENCES users(id),
  evaluated_at          TEXT NOT NULL,
  UNIQUE (cargo_entry_id, version)
);
CREATE INDEX idx_evaluations_entry ON evaluations(cargo_entry_id, version DESC);
```

`actor_kind` here can never be `'AI'` — the rule engine is not an AI surface (FRD `00-header` §0.4.7). `rule_set_fingerprint` is a SHA-256 over the ordered `(rule_id, version, enabled)` tuples, recorded so an audit reader can prove *which rule configuration* produced a finding months later. `skipped_rules_json` records rules that were not applicable **and why**, so an administrator can see the difference between "the rule passed" and "the rule did not apply".

## 2.9 Exceptions

```sql
CREATE TABLE exceptions (
  id                            TEXT PRIMARY KEY,
  evaluation_id                 TEXT NOT NULL REFERENCES evaluations(id) ON DELETE RESTRICT,
  cargo_entry_id                TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id                       TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  rule_id                       TEXT NOT NULL REFERENCES rules(id) ON DELETE RESTRICT,
  rule_version                  INTEGER NOT NULL,
  exception_type                TEXT NOT NULL CHECK (exception_type IN
                                  ('MISSING_REQUIRED_DOCUMENT','INVALID_HTS_CODE','CONFLICTING_COUNTRY_OF_ORIGIN')),
  sub_reason                    TEXT NOT NULL,
  severity                      TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status                        TEXT NOT NULL CHECK (status IN
                                  ('OPEN','RESOLVED_BY_REVALIDATION','CLEARED_BY_DECISION','SUPERSEDED_BY_EVALUATION')),
  assertion                     TEXT NOT NULL,
  missing_information_json      TEXT NOT NULL DEFAULT '[]',
  first_detected_evaluation_id  TEXT NOT NULL REFERENCES evaluations(id),
  opened_at                     TEXT NOT NULL,                 -- carried forward on retention (F6 §7)
  resolved_at                   TEXT,
  resolved_by_evaluation_id     TEXT REFERENCES evaluations(id),
  resolution_reason             TEXT CHECK (resolution_reason IS NULL OR resolution_reason IN
                                  ('DOCUMENT_RECEIVED','HTS_CORRECTED','ORIGIN_ALIGNED','RULE_DISABLED',
                                   'RULE_PARAMS_CHANGED','CONDITION_NO_LONGER_APPLICABLE')),
  superseded_by_exception_id    TEXT REFERENCES exceptions(id),
  cleared_by_approval_id        TEXT REFERENCES approvals(id),
  created_at                    TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_exceptions_eval_rule ON exceptions(evaluation_id, rule_id);
CREATE INDEX idx_exceptions_case_status     ON exceptions(case_id, status);
CREATE INDEX idx_exceptions_type_status     ON exceptions(exception_type, status);
```

No application code path issues `DELETE FROM exceptions` (F6 §Validation, test RV-03). `opened_at` and `first_detected_evaluation_id` are **carried forward** onto the successor row when an exception is retained across a revalidation, so the Shipment Review screen can honestly say "open since 1 September" even though the row itself was written during evaluation v2. The `(evaluation_id, rule_id)` unique index guarantees one exception per firing rule per evaluation.

## 2.10 Evidence

```sql
CREATE TABLE evidence (
  id                            TEXT PRIMARY KEY,
  exception_id                  TEXT NOT NULL REFERENCES exceptions(id) ON DELETE RESTRICT,
  kind                          TEXT NOT NULL CHECK (kind IN ('OBSERVED','COMPARISON','MISSING','CONTEXT')),
  field_path                    TEXT NOT NULL,
  raw_value                     TEXT,
  normalized_value              TEXT,
  comparison_field_path         TEXT,
  comparison_raw_value          TEXT,
  comparison_normalized_value   TEXT,
  expected                      TEXT,
  observed                      TEXT,
  assertion                     TEXT,
  truncated                     INTEGER NOT NULL DEFAULT 0 CHECK (truncated IN (0,1)),
  display_order                 INTEGER NOT NULL,
  created_at                    TEXT NOT NULL,
  CHECK (raw_value IS NULL OR length(raw_value) <= 2000)
);
CREATE INDEX idx_evidence_exception ON evidence(exception_id, display_order);
```

Evidence rows are insert-only and are **structured, never prose** — `field_path` + `raw_value` + `normalized_value`, not a sentence. The plain-language rendering is the AI summary's job (F7) and is stored separately in `ai_outputs`. That separation is what lets the Recommended Resolution screen display the evidence beside the AI text so a specialist can verify the machine's claim against the fields it claims to have read.

F5 §Validation requires ≥ 1 evidence row per exception and type-specific `kind`s. A SQLite `CHECK` cannot span tables, so the constraint is enforced in the repository's transactional write (`EXCEPTION_EVIDENCE_REQUIRED`) and asserted by test RE-18.

## 2.11 Ingestion Batches

```sql
CREATE TABLE ingestion_batches (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  schema_version  TEXT NOT NULL,
  received_count  INTEGER NOT NULL,
  created_count   INTEGER NOT NULL,
  updated_count   INTEGER NOT NULL,
  rejected_count  INTEGER NOT NULL,
  report_json     TEXT NOT NULL,
  actor_user_id   TEXT REFERENCES users(id),
  actor_kind      TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM')),
  created_at      TEXT NOT NULL
);
```

## 2.12 Referential and Lifecycle Rules

- Every foreign key uses `ON DELETE RESTRICT`. **No cascade exists anywhere**, so no single delete can silently remove history. The only bulk removal is the administrator reset (F2 §Process step 2), which truncates in reverse-dependency order inside one transaction (`02b` §11).
- `cargo_entries.shipment_id` is the only business key exposed in URLs and the UI; all joins use surrogate IDs.
- `documents` uniqueness is scoped to active received rows, so a superseded document and its replacement coexist.
- `document_requests` uniqueness on `(cargo_entry_id, document_type) WHERE status = 'OUTSTANDING'` is the database-level expression of guard G-DUP.
- `exceptions` uniqueness on `(evaluation_id, rule_id)` guarantees one exception per firing rule per evaluation (F4 §Process step 6).
- `evaluations` uniqueness on `(cargo_entry_id, version)` plus in-transaction version assignment prevents concurrent evaluation collisions (F5 §Process step 2).

## 2.13 Indexing Rationale

Every foreign key used in a query path carries an index; the seeded dataset is ~12 shipments, so these indexes exist for correctness of query plans and for honest architecture rather than for scale.

| Index | Serves |
|---|---|
| `idx_cases_status_priority`, `idx_cases_queued` | The queue screen's default sort (`priority:desc, age:desc`) and its default exclusions — PRD §6 target of < 1 s |
| `idx_exceptions_case_status` | Open-exception counts on every case projection and every audit snapshot |
| `idx_exceptions_type_status` | Queue filtering by exception type; rule impact preview |
| `idx_evaluations_entry (version DESC)` | "Current evaluation" lookup, which happens on every shipment read |
| `idx_evidence_exception (display_order)` | Deterministic evidence ordering — the display order is a *stored* property, never a client sort |
| `idx_documents_entry_type` | The missing-document evaluator's received-set construction |
| `idx_audit_case_seq` | Timeline read and `max(sequence_no)+1` assignment under the case lock |
| `idx_notifications_role`, `idx_notifications_case` | Role-scoped notification centre and the per-case notification list |
