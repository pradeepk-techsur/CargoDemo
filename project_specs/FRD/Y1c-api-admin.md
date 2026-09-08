---

# Y1c: API — Session, AI, Rules, Ingestion & Demo Operations

## §1 Session and roles

### `GET /api/users` — open · `200`
`[{ "id": "usr-cs-001", "name": "Marisol Reyes", "role": "CARGO_SPECIALIST", "active": true }, …]`
Open so the role selector can render before a session exists (F16 §Process step 1).

### `POST /api/session` — open · `201`
Request `{ "user_id": "usr-cs-001" }`
```jsonc
{ "session_token": "…", 
  "user": { "id": "usr-cs-001", "name": "Marisol Reyes", "role": "CARGO_SPECIALIST" },
  "permissions_summary": { "can_adjudicate": true, "can_approve": false,
                           "can_edit_rules": false, "can_reset": false } }
```
Errors: `404 RESOURCE_NOT_FOUND`, `403 USER_INACTIVE`. An existing session is implicitly ended and a `ROLE_SWITCHED` system audit entry is written (F14 §1 step 8).

### `GET /api/session` — CS, SUP, ADM · `200` / `401 UNAUTHENTICATED`
### `DELETE /api/session` — CS, SUP, ADM · `204`

### `GET /api/rbac/matrix` — CS, SUP, ADM · `200`
`[{ "route_id": "cases.actions.create", "method": "POST", "path": "/api/cases/{id}/actions", "allowed_roles": ["CARGO_SPECIALIST","SUPERVISOR"], "predicates": ["state_machine","escalation_authority"] }, …]`
Generated from the enforcement declarations, not hand-maintained (F14 §Validation).

### `POST /api/users` — ADM · `201` · `{ name, role, active }`
### `PATCH /api/users/{id}` — ADM · `200` · `{ name?, role?, active? }`
Errors: `422 INVALID_ENUM_VALUE`, `403 SELF_ROLE_CHANGE_BLOCKED`.

## §2 AI assistance

### `GET /api/shipments/{id}/ai/summary` — CS, SUP, ADM · `200`
Query: `regenerate` (boolean, default `false`).
Response: the F7 §Outputs object. **Always `200`** — provider failures produce a fallback, never an error (F7 §Validation).

### `POST /api/shipments/{id}/ai/summary/regenerate` — CS, SUP · `200`
Same response with `cached: false` and `regenerated_by_user_id` recorded.

### `GET /api/shipments/{id}/ai/recommendation` — CS, SUP, ADM · `200`
Response: the F8 §Outputs object, including `recommended_action`, `confidence` with `level`/`score`/`basis`/`factors`, `rationale`, `available_to_current_role`, the `presentation` bundle with rule and evidence per exception, the `governance_notice`, and `provenance` with `action_source: "DETERMINISTIC"`.

### `POST /api/shipments/{id}/ai/recommendation/regenerate` — CS, SUP · `200`

### `GET /api/shipments/{id}/ai/outputs` — CS, SUP, ADM · `200`
All AI outputs across evaluation versions: `[{ id, kind, evaluation_version, generation_mode, generated_at, superseded_by, provenance, content_summary }]`. Used by F20 to show what the decider was advised at each point in history.

Errors for all AI routes: `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `409 NO_EVALUATION`, `403 FORBIDDEN_ROLE` (regenerate only, ADM denied).

## §3 Rules

### `GET /api/rules` — CS, SUP, ADM · `200`
Query: `exception_type`, `enabled`, `severity`, `page`, `page_size`.
```jsonc
{ "data": [ { "id": "rule-origin-manufacturer", "name": "Origin vs manufacturer address",
              "exception_type": "CONFLICTING_COUNTRY_OF_ORIGIN", "severity": "CRITICAL",
              "enabled": true, "policy_reference": "19 CFR 134.1", "description": "…",
              "version": 1, "updated_at": "…", "updated_by_name": "Priya Raghavan",
              "open_exception_count": 4, "affected_shipment_count": 4 } ],
  "page": { "…": "…" } }
```

### `GET /api/rules/{id}` — CS, SUP, ADM · `200`
Adds `conditions`, `params_json`, and `params_schema` (the JSON Schema for its `exception_type`, so the admin form renders generically).

### `POST /api/rules` — ADM · `201`
```jsonc
{ "definition": {
    "id": "rule-doc-battery-cert",
    "name": "Battery safety certificate for lithium consignments",
    "exception_type": "MISSING_REQUIRED_DOCUMENT",
    "description": "Lithium cell consignments require a battery safety certificate.",
    "policy_reference": "49 CFR 173.185",
    "severity": "HIGH",
    "conditions": { "commodity_keywords": ["lithium", "battery"] },
    "params_json": { "required_document_types": ["BATTERY_SAFETY_CERTIFICATE"],
                     "match_mode": "ALL", "accept_statuses": ["RECEIVED"],
                     "require_file_present": true, "ignore_superseded": true } },
  "change_note": "Adding the certificate requirement flagged by the commodity team.",
  "revalidate_affected": true }
```

### `PATCH /api/rules/{id}` — ADM · `200`
Same body; `exception_type` MUST NOT change (`422 RULE_TYPE_IMMUTABLE`).

### `POST /api/rules/{id}/enable` / `POST /api/rules/{id}/disable` — ADM · `200`
`{ "change_note": "…", "revalidate_affected": true }`

### `POST /api/rules/{id}/preview-impact` — ADM · `200`
Body `{ "definition": { … } }`. Performs **zero writes** (F15 §Validation, test asserted).
```jsonc
{ "valid": true, "evaluated_shipments": 11,
  "would_add":    [ { "shipment_id": "SHP-2026-0002", "exception_type": "MISSING_REQUIRED_DOCUMENT",
                      "severity": "HIGH" } ],
  "would_remove": [ { "shipment_id": "SHP-2026-0007", "exception_id": "exc-0007-hts",
                      "exception_type": "INVALID_HTS_CODE" } ],
  "would_change_severity": [],
  "would_change_priority": [ { "shipment_id": "SHP-2026-0007", "from": "CRITICAL", "to": "HIGH" } ],
  "summary": { "added": 1, "removed": 1, "unchanged": 9, "priority_changes": 1 },
  "skipped_cleared": ["SHP-2026-0009"],
  "truncated": false }
```

### `GET /api/rules/{id}/history` — CS, SUP, ADM · `200`
`[{ audit_entry_id, event_type, occurred_at, actor, change_note, before, after, diff: [{ path, before, after }] }]`

**Rule save response** (`RuleSaveResult`):
```jsonc
{ "rule": { "…": "…" }, "previous_version": 1,
  "diff": [ { "path": "params_json.expected_digit_count", "before": 10, "after": 6 } ],
  "revalidation": { "shipments_revalidated": 6, "exceptions_added": 0,
                    "exceptions_resolved": 2, "priorities_changed": 1, "failures": [] },
  "audit_entry_id": "aud-rule-014" }
```

Errors: `403 FORBIDDEN_ROLE`; `404 RESOURCE_NOT_FOUND`; `405 RULE_DELETE_NOT_SUPPORTED`; `409 RULE_NAME_CONFLICT | TRANSITION_REDUNDANT`; `422 RULE_TYPE_IMMUTABLE | RULE_CONFIG_INVALID | RULE_PARAM_PATH_UNKNOWN | CHANGE_NOTE_REQUIRED | PREVIEW_TOO_LARGE | VALIDATION_FAILED`; `207 PARTIAL_REVALIDATION_FAILURE`.

## §4 Ingestion

### `POST /api/ingest/cargo-entries` — ADM · `201` / `207`
```jsonc
{ "schema_version": "1.0", "source": "demo-api",
  "entries": [ { "shipment_id": "SHP-2026-0013",
                 "importer_name": "Northwind Trading Co",
                 "carrier_name": "Cascade Freight Lines",
                 "product_description": "Ceramic floor tile, glazed",
                 "hts_code": "6907.21.10.00",
                 "country_of_origin": "Vietnam",
                 "manufacturer": { "name": "Mekong Ceramics JSC",
                                   "address": { "line1": "12 Industrial Road", "city": "Bien Hoa",
                                                "country": "Vietnam" } },
                 "shipment_value_usd": 42500.00,
                 "entry_date": "2026-09-05",
                 "documents": [ { "document_type": "COMMERCIAL_INVOICE", "status": "RECEIVED",
                                  "filename": "inv-13.pdf", "received_at": "2026-09-05T10:00:00.000Z" },
                                { "document_type": "PACKING_LIST", "status": "NOT_RECEIVED" } ] } ] }
```

Response — the `IngestionReport` of F1 §Outputs. `201` when every entry succeeded; `207 Multi-Status` when the batch was mixed.

Errors: `400 INGEST_MALFORMED_JSON`; `403 FORBIDDEN_ROLE`; `422 INGEST_SCHEMA_VERSION_UNSUPPORTED | INGEST_BATCH_SIZE_INVALID | INGEST_ENTRY_INVALID | INGEST_DOCUMENT_FILENAME_REQUIRED`; `409 CASE_TERMINAL | INGEST_DUPLICATE_IN_BATCH`.

### `GET /api/ingest/reports/{batch_id}` — ADM · `200`
Returns the stored `IngestionReport`.

## §5 Demo operations

### `GET /api/health` — open · `200`
Query: `verbose`. Response as specified in F22 §Outputs, with `status: "ok" | "degraded" | "failed"` and per-subsystem detail for `database`, `seed`, `rules`, `documents`, `ai`, `workflow`, `rbac`, plus the `demo` block with host, port, preview URL, and reset endpoint.

Never exposes the AI API key, database credentials, or absolute paths outside the project (F22 §Validation).

### `POST /api/admin/reset` — ADM · `200`
Request `{ "confirm": true }`. Response: the F2 `SeedReport` plus `reset_at` and `duration_ms`.
Errors: `403 FORBIDDEN_ROLE`; `422 CONFIRMATION_REQUIRED`; `500 SEED_COVERAGE_FAILED | SEED_CANONICAL_SCENARIO_INVALID | SEED_FIXTURE_MISSING | SEED_PII_SUSPECTED | SEED_WORKFLOW_SCRIPT_INVALID`.

### `GET /api/admin/seed-report` — ADM · `200`
The last `SeedReport` including the coverage block.

### `GET /api/openapi.json` — open · `200`
OpenAPI 3.1 document generated from the same schemas the middleware validates against, so specification drift is structurally impossible (F3 §Outputs).

## §6 Route inventory (60 routes)

| Group | Count | Routes |
|---|---|---|
| Session & users | 7 | `GET/POST/DELETE /api/session`, `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}`, `GET /api/rbac/matrix` |
| Queue & shipments | 6 | `/api/queue`, `/api/shipments/{id}`, `.../exceptions`, `.../evaluations`, `.../evaluations/{v}`, `.../evaluations/{a}/diff/{b}` |
| Documents | 6 | `.../documents`, `.../document-requests`, `.../upload-fixtures`, `/api/documents/{id}/content`, upload, cancel |
| Workflow | 5 | `POST/GET /api/cases/{id}/actions`, `/available-actions`, `/api/workflow/transitions`, `/api/shipments/{id}/revalidate` |
| Approvals | 3 | `POST /api/cases/{id}/approval`, `GET .../recommendations`, `GET .../approvals` |
| AI | 5 | summary, summary/regenerate, recommendation, recommendation/regenerate, outputs |
| Audit | 5 | `/audit`, `/audit/{seq}`, `/audit/verify`, `/audit/export`, `/api/audit` |
| Notifications | 5 | list, unread-count, per-case, read, read-all |
| Rules | 8 | list, detail, create, patch, enable, disable, preview-impact, history |
| Ingestion & demo | 5 | ingest, ingest report, health, reset, seed-report |
| OpenAPI | 1 | `/api/openapi.json` |
| **Total** | **60** | matches the F14 §2 matrix and the `health.subsystems.rbac.routes_registered` assertion |
