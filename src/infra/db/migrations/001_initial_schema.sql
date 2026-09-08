-- CargoDemo consolidated database schema.
--
-- This file is copied VERBATIM from the FRD schema masters:
--   project_specs/FRD/Y0a-schema-core.md          §1-§9  (core domain)
--   project_specs/FRD/Y0b-schema-workflow-audit.md §1-§9  (workflow/governance/transport)
--
-- Ordering: Y0a first, then Y0b. Tables in Y0a reference tables defined in Y0b
-- (cases, users, approvals) and vice-versa; SQLite resolves foreign-key targets
-- at DML time, not DDL time, so a single file in this order is correct.
--
-- Do NOT rename a column, relax a CHECK, drop an index, reorder columns, or
-- convert a partial index into a full one. These constraints are the product's
-- governance claims expressed in SQL.

-- ===========================================================================
-- Y0a §1 Migrations
-- ===========================================================================

CREATE TABLE schema_migrations (
  version     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  checksum    TEXT NOT NULL,
  applied_at  TEXT NOT NULL
);

-- ===========================================================================
-- Y0a §2 Cargo entries
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §3 Documents
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §4 Document requests
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §5 Rules
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §6 Evaluations
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §7 Exceptions
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §8 Evidence
-- ===========================================================================

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

-- ===========================================================================
-- Y0a §9 Ingestion batches
-- ===========================================================================

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

-- ===========================================================================
-- Y0b §1 Users and sessions
-- ===========================================================================

CREATE TABLE users (
  id          TEXT PRIMARY KEY,                                -- 'usr-cs-001'
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  role        TEXT NOT NULL CHECK (role IN
                ('CARGO_SPECIALIST','SUPERVISOR','SYSTEM_ADMINISTRATOR')),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  token_hash    TEXT NOT NULL UNIQUE,                          -- sha256 of a 32-byte random token
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  ended_at      TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id, ended_at);

-- ===========================================================================
-- Y0b §2 Cases
-- ===========================================================================

CREATE TABLE cases (
  id                            TEXT PRIMARY KEY,
  cargo_entry_id                TEXT NOT NULL UNIQUE REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  shipment_id                   TEXT NOT NULL,                 -- denormalized for queue/audit readability
  status                        TEXT NOT NULL CHECK (status IN
                                  ('NEW','IN_REVIEW','AWAITING_INFORMATION','ON_HOLD',
                                   'ESCALATED','PENDING_APPROVAL','CLEARED')),
  priority                      TEXT NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  priority_basis_json           TEXT NOT NULL DEFAULT '[]',    -- F5 §Process step 6
  queued                        INTEGER NOT NULL DEFAULT 0 CHECK (queued IN (0,1)),
  current_evaluation_id         TEXT REFERENCES evaluations(id),
  open_exception_count          INTEGER NOT NULL DEFAULT 0,
  exception_type_summary        TEXT NOT NULL DEFAULT '',      -- sorted, comma-joined distinct open types
  assigned_to_user_id           TEXT REFERENCES users(id),
  hold_reason                   TEXT CHECK (hold_reason IS NULL OR hold_reason IN
                                  ('AWAITING_EXTERNAL_INPUT','PENDING_POLICY_GUIDANCE','RESOURCE_CONSTRAINT','OTHER')),
  hold_reason_detail            TEXT,
  hold_placed_by_user_id        TEXT REFERENCES users(id),
  hold_placed_at                TEXT,
  escalation_reason             TEXT,
  escalated_by_user_id          TEXT REFERENCES users(id),
  escalated_to_user_id          TEXT REFERENCES users(id),
  escalated_at                  TEXT,
  approving_official_user_id    TEXT REFERENCES users(id),
  approving_official_name       TEXT,
  approving_official_role       TEXT,
  cleared_at                    TEXT,
  last_action_id                TEXT REFERENCES case_actions(id),
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL,
  -- the schema-level expression of "no clearance without a named approving official" (F11 SoD-1)
  CHECK (status <> 'CLEARED' OR (approving_official_user_id IS NOT NULL AND cleared_at IS NOT NULL))
);
CREATE INDEX idx_cases_status_priority ON cases(status, priority, updated_at DESC);
CREATE INDEX idx_cases_queued          ON cases(queued, priority);

-- ===========================================================================
-- Y0b §3 Case actions
-- ===========================================================================

CREATE TABLE case_actions (
  id                    TEXT PRIMARY KEY,
  case_id               TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id        TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  action                TEXT NOT NULL CHECK (action IN
                          ('REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW','CLEAR_EXCEPTION',
                           'PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR')),
  status_before         TEXT NOT NULL,
  status_after          TEXT NOT NULL,
  justification         TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
  parameters_json       TEXT NOT NULL DEFAULT '{}',            -- action-specific fields
  evaluation_id         TEXT REFERENCES evaluations(id),
  actor_user_id         TEXT NOT NULL REFERENCES users(id),
  actor_name            TEXT NOT NULL,
  actor_role            TEXT NOT NULL CHECK (actor_role IN ('CARGO_SPECIALIST','SUPERVISOR')),
  audit_entry_id        TEXT NOT NULL,
  idempotency_key       TEXT,
  occurred_at           TEXT NOT NULL
);
CREATE INDEX idx_case_actions_case ON case_actions(case_id, occurred_at);
CREATE UNIQUE INDEX idx_case_actions_idem ON case_actions(case_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ===========================================================================
-- Y0b §4 Recommendations
-- ===========================================================================

CREATE TABLE recommendations (
  id                          TEXT PRIMARY KEY,
  case_id                     TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluation_id               TEXT NOT NULL REFERENCES evaluations(id),
  action_id                   TEXT NOT NULL REFERENCES case_actions(id),
  recommended_action          TEXT NOT NULL DEFAULT 'CLEAR' CHECK (recommended_action = 'CLEAR'),
  resolution_basis            TEXT NOT NULL CHECK (resolution_basis IN
                                ('EXCEPTIONS_RESOLVED','EXCEPTIONS_ACCEPTED','MIXED')),
  exception_ids_json          TEXT NOT NULL,
  justification               TEXT NOT NULL,
  ai_recommendation_snapshot_json TEXT NOT NULL,
  concurrence                 TEXT NOT NULL CHECK (concurrence IN
                                ('AGREED','DIVERGED','NO_RECOMMENDATION_PRESENT')),
  status                      TEXT NOT NULL CHECK (status IN
                                ('PENDING','APPROVED','REJECTED','WITHDRAWN','RETURNED_FOR_INFORMATION')),
  withdrawal_reason           TEXT,
  recommended_by_user_id      TEXT NOT NULL REFERENCES users(id),
  recommended_by_name         TEXT NOT NULL,
  recommended_by_role         TEXT NOT NULL,
  recommended_at              TEXT NOT NULL,
  closed_at                   TEXT
);
CREATE UNIQUE INDEX idx_recommendations_pending ON recommendations(case_id)
  WHERE status = 'PENDING';                                    -- enforces guard G-REC (F09a §3)

-- ===========================================================================
-- Y0b §5 Approvals
-- ===========================================================================

CREATE TABLE approvals (
  id                              TEXT PRIMARY KEY,
  case_id                         TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  recommendation_id               TEXT NOT NULL REFERENCES recommendations(id),
  decision                        TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT','REQUEST_INFO')),
  rejection_reason                TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN
                                    ('INSUFFICIENT_JUSTIFICATION','EVIDENCE_INCOMPLETE',
                                     'EXCEPTION_NOT_RESOLVED','POLICY_DISAGREEMENT','OTHER')),
  justification                   TEXT NOT NULL CHECK (length(trim(justification)) >= 10),
  approver_user_id                TEXT NOT NULL REFERENCES users(id),
  approver_name                   TEXT NOT NULL,
  approver_role                   TEXT NOT NULL CHECK (approver_role = 'SUPERVISOR'),
  recommended_by_user_id          TEXT NOT NULL REFERENCES users(id),   -- copied for the SoD-2 constraint
  recommendation_evaluation_version INTEGER NOT NULL,
  current_evaluation_version      INTEGER NOT NULL,
  evidence_changed                INTEGER NOT NULL DEFAULT 0 CHECK (evidence_changed IN (0,1)),
  acknowledged_evidence_changed   INTEGER NOT NULL DEFAULT 0 CHECK (acknowledged_evidence_changed IN (0,1)),
  audit_entry_id                  TEXT NOT NULL,
  idempotency_key                 TEXT,
  decided_at                      TEXT NOT NULL,
  -- SoD-1: only a supervisor approves (approver_role CHECK above)
  -- SoD-2: the approver is never the recommender
  CHECK (approver_user_id <> recommended_by_user_id),
  CHECK (decision <> 'REJECT' OR rejection_reason IS NOT NULL),
  CHECK (evidence_changed = 0 OR acknowledged_evidence_changed = 1)
);
CREATE INDEX idx_approvals_case ON approvals(case_id, decided_at);

-- ===========================================================================
-- Y0b §6 Audit entries
-- ===========================================================================

CREATE TABLE audit_entries (
  id                          TEXT PRIMARY KEY,
  case_id                     TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id              TEXT REFERENCES cargo_entries(id),
  shipment_id                 TEXT,
  sequence_no                 INTEGER NOT NULL,
  entry_class                 TEXT NOT NULL CHECK (entry_class IN
                                ('SYSTEM_EVENT','AI_OUTPUT','HUMAN_ACTION','APPROVAL_DECISION','ACCESS_DENIED')),
  event_type                  TEXT NOT NULL,

  -- the eight required fields (F12 §1)
  exceptions_json             TEXT NOT NULL,                   -- 1
  evidence_reviewed_json      TEXT NOT NULL,                   -- 2
  ai_recommendation_json      TEXT NOT NULL,                   -- 3  (explicit {present:false} when absent)
  user_decision               TEXT,                            -- 4
  user_decision_detail_json   TEXT,                            -- 4
  justification               TEXT,                            -- 5
  occurred_at                 TEXT NOT NULL,                   -- 6
  approving_official_user_id  TEXT REFERENCES users(id),       -- 7
  approving_official_name     TEXT,                            -- 7
  approving_official_role     TEXT,                            -- 7
  notification_id             TEXT REFERENCES notifications(id), -- 8
  notification_snapshot_json  TEXT,                            -- 8

  -- attribution and integrity
  actor_kind                  TEXT NOT NULL CHECK (actor_kind IN ('HUMAN','SYSTEM','AI')),
  actor_user_id               TEXT REFERENCES users(id),
  actor_name                  TEXT,
  actor_role                  TEXT,
  system_actor_label          TEXT,
  case_status_before          TEXT,
  case_status_after           TEXT,
  evaluation_version          INTEGER,
  rule_set_fingerprint        TEXT,
  request_id                  TEXT,
  prev_hash                   TEXT NOT NULL,
  entry_hash                  TEXT NOT NULL,

  UNIQUE (case_id, sequence_no),
  -- "the AI never decides" as a storage constraint (00-header §0.4.7)
  CHECK (actor_kind <> 'AI' OR user_decision IS NULL),
  -- human and approval entries must be attributable and justified
  CHECK (entry_class NOT IN ('HUMAN_ACTION','APPROVAL_DECISION')
         OR (actor_user_id IS NOT NULL AND justification IS NOT NULL AND user_decision IS NOT NULL)),
  -- an approval decision must name the approving official and its notification
  CHECK (entry_class <> 'APPROVAL_DECISION'
         OR (approving_official_user_id IS NOT NULL AND approving_official_name IS NOT NULL))
);
CREATE INDEX idx_audit_case_seq  ON audit_entries(case_id, sequence_no);
CREATE INDEX idx_audit_actor     ON audit_entries(actor_user_id, occurred_at);
CREATE INDEX idx_audit_event     ON audit_entries(event_type, occurred_at);

CREATE TRIGGER audit_entries_no_delete
BEFORE DELETE ON audit_entries
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_IMMUTABLE: audit records cannot be deleted');
END;

-- The single narrow exemption: notification_id / notification_snapshot_json may go null -> non-null once.
CREATE TRIGGER audit_entries_no_update
BEFORE UPDATE ON audit_entries
WHEN NOT (
     OLD.notification_id IS NULL
 AND NEW.notification_id IS NOT NULL
 AND OLD.id                         IS NEW.id
 AND OLD.case_id                    IS NEW.case_id
 AND OLD.sequence_no                IS NEW.sequence_no
 AND OLD.entry_class                IS NEW.entry_class
 AND OLD.event_type                 IS NEW.event_type
 AND OLD.exceptions_json            IS NEW.exceptions_json
 AND OLD.evidence_reviewed_json     IS NEW.evidence_reviewed_json
 AND OLD.ai_recommendation_json     IS NEW.ai_recommendation_json
 AND OLD.user_decision              IS NEW.user_decision
 AND OLD.user_decision_detail_json  IS NEW.user_decision_detail_json
 AND OLD.justification              IS NEW.justification
 AND OLD.occurred_at                IS NEW.occurred_at
 AND OLD.approving_official_user_id IS NEW.approving_official_user_id
 AND OLD.actor_kind                 IS NEW.actor_kind
 AND OLD.actor_user_id              IS NEW.actor_user_id
 AND OLD.prev_hash                  IS NEW.prev_hash
 AND OLD.entry_hash                 IS NEW.entry_hash
)
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_IMMUTABLE: audit records are append-only');
END;

-- ===========================================================================
-- Y0b §7 Notifications
-- ===========================================================================

CREATE TABLE notifications (
  id              TEXT PRIMARY KEY,
  case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  cargo_entry_id  TEXT REFERENCES cargo_entries(id),
  shipment_id     TEXT,
  audit_entry_id  TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  recipient_role  TEXT NOT NULL CHECK (recipient_role IN
                    ('CARGO_SPECIALIST','SUPERVISOR','SYSTEM_ADMINISTRATOR')),
  recipient_user_id TEXT REFERENCES users(id),
  subject         TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body            TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  transmitted     INTEGER NOT NULL DEFAULT 0 CHECK (transmitted = 0),   -- structurally never transmitted
  generated_at    TEXT NOT NULL
);
CREATE INDEX idx_notifications_role ON notifications(recipient_role, generated_at DESC);
CREATE INDEX idx_notifications_case ON notifications(case_id, generated_at);

CREATE TRIGGER notifications_no_delete
BEFORE DELETE ON notifications
BEGIN
  SELECT RAISE(ABORT, 'NOTIFICATION_IMMUTABLE: notifications cannot be deleted');
END;

CREATE TABLE notification_reads (
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  read_at         TEXT NOT NULL,
  PRIMARY KEY (notification_id, user_id)
);

-- ===========================================================================
-- Y0b §8 AI outputs
-- ===========================================================================

CREATE TABLE ai_outputs (
  id                     TEXT PRIMARY KEY,
  kind                   TEXT NOT NULL CHECK (kind IN ('SUMMARY','RECOMMENDATION')),
  cargo_entry_id         TEXT NOT NULL REFERENCES cargo_entries(id) ON DELETE RESTRICT,
  case_id                TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluation_id          TEXT NOT NULL REFERENCES evaluations(id),
  content_json           TEXT NOT NULL,
  provenance_json        TEXT NOT NULL,                        -- provider, model, mode, timestamps, latency
  grounding_fingerprint  TEXT NOT NULL,
  generation_mode        TEXT NOT NULL CHECK (generation_mode IN
                           ('LLM','FALLBACK_PROVIDER_DISABLED','FALLBACK_PROVIDER_ERROR',
                            'FALLBACK_TIMEOUT','FALLBACK_VALIDATION_FAILED')),
  recommended_action     TEXT,                                 -- RECOMMENDATION only; one of the five
  confidence_level       TEXT CHECK (confidence_level IS NULL OR confidence_level IN ('HIGH','MEDIUM','LOW')),
  confidence_basis       TEXT,
  superseded_by          TEXT REFERENCES ai_outputs(id),
  regenerated_by_user_id TEXT REFERENCES users(id),
  generated_at           TEXT NOT NULL,
  -- an AI output may never name an approval action, and confidence always carries a basis
  CHECK (recommended_action IS NULL OR recommended_action IN
         ('REQUEST_INFORMATION','SEND_FOR_SPECIALIST_REVIEW','CLEAR_EXCEPTION',
          'PLACE_ON_HOLD','ESCALATE_TO_SUPERVISOR')),
  CHECK (confidence_level IS NULL OR confidence_basis IS NOT NULL)
);
CREATE UNIQUE INDEX idx_ai_outputs_current ON ai_outputs(cargo_entry_id, kind, evaluation_id)
  WHERE superseded_by IS NULL;

-- ===========================================================================
-- Y0b §9 Transport support
-- ===========================================================================

CREATE TABLE idempotency_keys (
  key            TEXT NOT NULL,
  scope          TEXT NOT NULL,                                -- 'case:<id>:action' | 'request:<id>:upload' | …
  request_hash   TEXT NOT NULL,                                -- sha256 of the canonical request body
  response_json  TEXT NOT NULL,
  status_code    INTEGER NOT NULL,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (key, scope)
);

CREATE TABLE request_log (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL,
  method        TEXT NOT NULL,
  path          TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  actor_role    TEXT,
  duration_ms   INTEGER NOT NULL,
  error_code    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_request_log_created ON request_log(created_at DESC);
