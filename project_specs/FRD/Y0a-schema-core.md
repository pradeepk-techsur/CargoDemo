---

# Y0a: Consolidated Database Schema — Core Domain

SQLite dialect. All tables use `TEXT` primary keys holding UUIDv4 or prefixed identifiers. Timestamps are `TEXT` in ISO-8601 UTC with milliseconds (`YYYY-MM-DDTHH:MM:SS.sssZ`) so lexicographic and chronological ordering coincide. Monetary values are stored as `INTEGER` cents. Booleans are `INTEGER` `0`/`1`. Every connection sets `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` (F0 §Process step 3).

This chunk covers cargo entries, documents, requests, rules, evaluations, exceptions, evidence, and ingestion. Workflow, governance, and transport tables are in `Y0b-schema-workflow-audit.md`.

## §1 Migrations

```sql
CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  checksum    TEXT NOT NULL,
  applied_at  TEXT NOT NULL
);
```

## §2 Cargo entries

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

## §3 Documents

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

## §4 Document requests

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

## §5 Rules

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

There is deliberately **no** `DELETE` path for `rules` (F15 §Validation); retirement is `enabled = 0`.

## §6 Evaluations

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

`actor_kind` here can never be `'AI'` — the rule engine is not an AI surface (`00-header.md` §0.4.7).

## §7 Exceptions

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

No application code path issues `DELETE FROM exceptions` (F6 §Validation, test RV-03).

## §8 Evidence

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

Evidence rows are insert-only. F5 §Validation requires ≥ 1 row per exception and type-specific kinds; the constraint is enforced in the repository's transactional write (a `CHECK` cannot span tables in SQLite) and asserted by test RE-18.

## §9 Ingestion batches

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

## §10 Entity relationships

```
users ──< sessions
users ──< cases (assigned_to, escalated_to, approving_official)
cargo_entries 1──1 cases
cargo_entries 1──n documents
cargo_entries 1──n evaluations ──n exceptions ──n evidence
rules 1──n exceptions
cases 1──n document_requests ──0..1 documents (fulfilling)
cases 1──n case_actions, recommendations, approvals, audit_entries, notifications, ai_outputs
recommendations 1──n approvals
audit_entries 1──0..1 notifications  (mutual reference, F09b §1 step 15)
```

## §11 Referential and lifecycle rules

- Every foreign key uses `ON DELETE RESTRICT`. No cascade exists anywhere, so no single delete can silently remove history. The only bulk removal is the administrator reset (F2 §Process step 2), which truncates in reverse-dependency order inside one transaction.
- `cargo_entries.shipment_id` is the only business key exposed in URLs and the UI; all joins use surrogate IDs.
- `documents` uniqueness is scoped to active received rows, so a superseded document and its replacement coexist.
- `document_requests` uniqueness on `(cargo_entry_id, document_type) WHERE status = 'OUTSTANDING'` is the database-level expression of guard G-DUP.
- `exceptions` uniqueness on `(evaluation_id, rule_id)` guarantees one exception per firing rule per evaluation (F4 §Process step 6).
- `evaluations` uniqueness on `(cargo_entry_id, version)` plus in-transaction version assignment prevents concurrent evaluation collisions (F5 §Process step 2).
