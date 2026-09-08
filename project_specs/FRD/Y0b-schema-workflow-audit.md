---

# Y0b: Consolidated Database Schema — Workflow, Governance & Transport

Conventions as in `Y0a-schema-core.md`. This chunk covers users and sessions, cases, actions, recommendations, approvals, audit entries, notifications, AI outputs, and transport-support tables.

## §1 Users and sessions

```sql
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
```

The token is never stored in plaintext and never encodes the role (F14 §Validation).

## §2 Cases

```sql
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
```

`cases.updated_at` in epoch-millis form is the `X-Case-Version` value used for optimistic concurrency (F3 §Process step 9).

## §3 Case actions

```sql
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
```

`actor_role` excludes `SYSTEM_ADMINISTRATOR` at the schema level — the administrator cannot adjudicate (F14 matrix rows 20–24).

## §4 Recommendations

```sql
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
```

## §5 Approvals

```sql
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
```

The three `CHECK` constraints are the database-level enforcement of F11's governance claims. Handler-level checks come first and produce friendly errors; these constraints make a bypass impossible even by a defective code path.

## §6 Audit entries

```sql
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
```

### Append-only triggers (F12 §3)

```sql
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
```

Any second attempt to set `notification_id` fails the `OLD.notification_id IS NULL` condition and aborts (test AU-05).

## §7 Notifications

```sql
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
```

`CHECK (transmitted = 0)` makes "generated, not transmitted" a schema guarantee rather than a convention (test AU-11).

## §8 AI outputs

```sql
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
```

## §9 Transport support

```sql
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
```

`request_log` stores no request bodies and no field values — only routing and outcome metadata — so it cannot become an accidental data sink (PRD §6 Privacy). It is bounded to the most recent 10 000 rows by a trim on insert.

## §10 Reset order

`POST /api/admin/reset` (F2, F22) truncates in this order inside one transaction, then reseeds:

`notification_reads → notifications → audit_entries → approvals → recommendations → case_actions → ai_outputs → evidence → exceptions → evaluations → document_requests → documents → cases → cargo_entries → ingestion_batches → rules → sessions → users → idempotency_keys → request_log`

The append-only delete triggers on `audit_entries` and `notifications` are dropped and recreated around the reset transaction by the migration-aware reset routine; this is the only code path permitted to do so, it is administrator-gated, and it operates on the whole database rather than any selected subset (F12 §3.5).
