---

# Y1a: API — Read Endpoints

Conventions inherited from F3: `X-CargoDemo-Session` on every protected route; list responses wrapped in `{ data, page, applied }`; single resources unwrapped with `_links`; timestamps ISO-8601 UTC ms; money as decimal strings; enums as canonical codes.

## §1 Queue

### `GET /api/queue` — CS, SUP, ADM

Query: `status[]`, `exception_type[]`, `priority[]`, `assignment` (`any|me|unassigned`), `pending_approval_only`, `include_clean`, `include_cleared`, `sort`, `page`, `page_size`.

```jsonc
{
  "data": [
    {
      "shipment_id": "SHP-2026-0007",
      "case_id": "case-0007",
      "importer_name": "Helios Grid Supply",
      "carrier_name": "Pacific Blue Lines",
      "priority": "CRITICAL",
      "priority_basis_summary": "Critical rule severity; value ≥ $50,000; 3 open exceptions",
      "status": "NEW",
      "open_exception_count": 3,
      "exception_types": [
        { "type": "MISSING_REQUIRED_DOCUMENT", "count": 1 },
        { "type": "INVALID_HTS_CODE", "count": 1 },
        { "type": "CONFLICTING_COUNTRY_OF_ORIGIN", "count": 1 }
      ],
      "exception_summary": "Missing certificate of origin; incomplete HTS code; origin conflict",
      "oldest_exception_opened_at": "2026-09-01T08:00:00.000Z",
      "age_days": 7,
      "assigned_to": null,
      "pending_approval": null,
      "shipment_value_usd": "85000.00",
      "updated_at": "2026-09-08T13:59:02.771Z"
    }
  ],
  "page": { "page": 1, "page_size": 25, "total": 11, "total_pages": 1 },
  "applied": { "filters": { "include_clean": false, "include_cleared": false }, "sort": "priority:desc,age:desc" }
}
```

Default exclusions: zero-exception cases and `CLEARED` cases (F17 §Validation).

## §2 Shipments

### `GET /api/shipments/{shipment_id}` — CS, SUP, ADM

```jsonc
{
  "shipment_id": "SHP-2026-0007",
  "case_id": "case-0007",
  "importer_name": "Helios Grid Supply",
  "carrier_name": "Pacific Blue Lines",
  "product_description": "Photovoltaic solar panels, monocrystalline, 400W",
  "hts_code": "8541.40",
  "hts_code_normalized": "854140",
  "hts_digit_count": 6,
  "country_of_origin": "Malaysia",
  "country_of_origin_iso2": "MY",
  "manufacturer": {
    "name": "Selat Solar Manufacturing Sdn Bhd",
    "address": { "line1": "88 Jalan Industri", "city": "Shenzhen", "region": "Guangdong",
                 "postal_code": "518000", "country": "China", "country_iso2": "CN" }
  },
  "shipment_value_usd": "85000.00",
  "entry_date": "2026-08-28",
  "case": {
    "status": "NEW", "priority": "CRITICAL",
    "priority_basis": [
      { "factor": "BASE_SEVERITY", "detail": "rule-origin-manufacturer is CRITICAL", "from": null, "to": "CRITICAL" },
      { "factor": "VALUE_ESCALATION", "detail": "$85,000.00 ≥ $50,000", "from": "CRITICAL", "to": "CRITICAL" },
      { "factor": "MULTIPLICITY_ESCALATION", "detail": "3 open exceptions", "from": "CRITICAL", "to": "CRITICAL" }
    ],
    "open_exception_count": 3,
    "current_evaluation": { "id": "eval-0007-1", "version": 1, "evaluated_at": "2026-09-01T08:00:00.000Z",
                            "trigger": "SEED", "rule_set_fingerprint": "sha256:…" },
    "assigned_to": null, "hold_reason": null, "escalated_to": null,
    "approving_official": null, "cleared_at": null,
    "case_version": 1757340382104
  },
  "ingestion": { "source": "seed", "batch_id": "batch-seed-1" },
  "_links": { "exceptions": "/api/shipments/SHP-2026-0007/exceptions",
              "documents": "/api/shipments/SHP-2026-0007/documents",
              "ai_summary": "/api/shipments/SHP-2026-0007/ai/summary",
              "ai_recommendation": "/api/shipments/SHP-2026-0007/ai/recommendation",
              "audit": "/api/cases/case-0007/audit",
              "available_actions": "/api/cases/case-0007/available-actions" }
}
```

## §3 Exceptions and evidence

### `GET /api/shipments/{id}/exceptions` — CS, SUP, ADM

Query: `include_resolved` (boolean, default `true`), `evaluation_version` (integer, default = current).

```jsonc
{
  "evaluation": { "id": "eval-0007-1", "version": 1, "trigger": "SEED",
                  "evaluated_at": "2026-09-01T08:00:00.000Z", "rule_set_fingerprint": "sha256:…" },
  "open": [
    {
      "exception_id": "exc-0007-origin",
      "exception_type": "CONFLICTING_COUNTRY_OF_ORIGIN",
      "sub_reason": "ORIGIN_MISMATCH",
      "severity": "CRITICAL",
      "status": "OPEN",
      "assertion": "Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)",
      "opened_at": "2026-09-01T08:00:00.000Z",
      "rule": { "id": "rule-origin-manufacturer", "name": "Origin vs manufacturer address",
                "version": 1, "description": "…", "policy_reference": "19 CFR 134.1", "severity": "CRITICAL" },
      "evidence": [
        { "kind": "OBSERVED",   "field_path": "country_of_origin",
          "raw_value": "Malaysia", "normalized_value": "MY", "display_order": 1 },
        { "kind": "COMPARISON", "field_path": "manufacturer.address.country",
          "raw_value": "China", "normalized_value": "CN", "display_order": 2 }
      ],
      "missing_information": []
    },
    {
      "exception_id": "exc-0007-hts",
      "exception_type": "INVALID_HTS_CODE",
      "sub_reason": "INCOMPLETE_DIGITS",
      "severity": "HIGH",
      "status": "OPEN",
      "assertion": "HTS code has 6 significant digits; a complete classification requires 10",
      "rule": { "id": "rule-hts-completeness", "policy_reference": "19 CFR 152.11", "…": "…" },
      "evidence": [
        { "kind": "OBSERVED", "field_path": "hts_code", "raw_value": "8541.40",
          "normalized_value": "854140", "expected": "10 digits", "observed": "6 digits", "display_order": 1 }
      ],
      "missing_information": [
        { "field_path": "hts_code", "requirement": "10-digit classification required",
          "observed_digits": 6, "missing_digits": 4 }
      ]
    },
    {
      "exception_id": "exc-0007-doc",
      "exception_type": "MISSING_REQUIRED_DOCUMENT",
      "sub_reason": "DOCUMENT_NOT_RECEIVED",
      "severity": "HIGH",
      "status": "OPEN",
      "rule": { "id": "rule-doc-highvalue-coo", "policy_reference": "19 CFR 102.0", "…": "…" },
      "evidence": [
        { "kind": "OBSERVED", "field_path": "documents",
          "raw_value": "COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING", "display_order": 1 },
        { "kind": "MISSING",  "field_path": "documents.CERTIFICATE_OF_ORIGIN", "display_order": 2 },
        { "kind": "CONTEXT",  "field_path": "shipment_value_usd", "raw_value": "85000.00",
          "assertion": "Rule applies to shipments valued at or above $50,000", "display_order": 3 }
      ],
      "missing_information": [
        { "document_type": "CERTIFICATE_OF_ORIGIN",
          "requirement": "Certificate of Origin is required for shipments valued at or above $50,000",
          "required_by_rule": "rule-doc-highvalue-coo", "policy_reference": "19 CFR 102.0" }
      ]
    }
  ],
  "resolved": [],
  "counts": { "open": 3, "resolved_by_revalidation": 0, "cleared_by_decision": 0 }
}
```

Exception order is the deterministic evaluation order from F4 §Process step 3.

### `GET /api/shipments/{id}/evaluations` — CS, SUP, ADM
Returns `[{ id, version, trigger, evaluated_at, actor, finding_count, rule_set_fingerprint, exception_summary }]`, newest first.

### `GET /api/shipments/{id}/evaluations/{version}` — CS, SUP, ADM
Returns one historical evaluation with its full exception and evidence set, in the same shape as §3.

### `GET /api/shipments/{id}/evaluations/{a}/diff/{b}` — CS, SUP, ADM
```jsonc
{ "from": { "version": 1 }, "to": { "version": 2 },
  "resolved": [ { "exception_id": "exc-0007-doc", "rule_id": "rule-doc-highvalue-coo",
                  "exception_type": "MISSING_REQUIRED_DOCUMENT",
                  "resolution_reason": "DOCUMENT_RECEIVED", "was_open_since": "2026-09-01T08:00:00.000Z" } ],
  "retained": [ { "exception_id": "exc-0007-hts-v2", "prior_exception_id": "exc-0007-hts",
                  "rule_id": "rule-hts-completeness", "open_since": "2026-09-01T08:00:00.000Z",
                  "missing_information_before": [ "…" ], "missing_information_after": [ "…" ],
                  "evidence_changed": false } ],
  "new": [],
  "priority": { "before": "CRITICAL", "after": "CRITICAL" },
  "status": { "before": "AWAITING_INFORMATION", "after": "IN_REVIEW" },
  "open_exception_count": { "before": 3, "after": 2 } }
```

## §4 Documents

### `GET /api/shipments/{id}/documents` — CS, SUP, ADM
```jsonc
{ "data": [
    { "id": "doc-0007-inv", "document_type": "COMMERCIAL_INVOICE", "display_name": "Commercial Invoice",
      "status": "RECEIVED", "provenance": "SEEDED", "filename": "invoice_SHP-2026-0007.pdf",
      "mime_type": "application/pdf", "file_size_bytes": 20481, "content_hash": "sha256:…",
      "received_at": "2026-09-01T08:00:00.000Z", "uploaded_by": null,
      "source_request_id": null, "required_by_rules": ["rule-doc-baseline"],
      "_links": { "content": "/api/documents/doc-0007-inv/content" } },
    { "document_type": "CERTIFICATE_OF_ORIGIN", "display_name": "Certificate of Origin",
      "status": "NOT_RECEIVED", "provenance": null, "required_by_rules": ["rule-doc-highvalue-coo"],
      "outstanding_request": { "id": "dr-0007-coo", "requested_by": "Marisol Reyes",
                               "requested_at": "2026-09-08T14:06:22.104Z" } }
  ] }
```

### `GET /api/shipments/{id}/document-requests` — CS, SUP, ADM
Returns the full lifecycle per request: `{ id, document_type, status, requested_by, requested_at, requested_from, due_by, fulfilled_by, fulfilled_at, fulfilling_document_id, cancellation_reason, cancelled_by, cancelled_at, linked_exception_id, linked_rule_id }`.

### `GET /api/documents/{id}/content` — CS, SUP, ADM
Streams the stored synthetic file with `Content-Type` from `mime_type` and `Content-Disposition: attachment`.

### `GET /api/shipments/{id}/upload-fixtures` — CS, SUP
`[{ fixture_id, document_type, filename, mime_type, size_bytes, description }]` — the seeded upload-ready fixtures offered by F18's upload dialog.

## §5 Audit

### `GET /api/cases/{id}/audit` — CS, SUP, ADM
Query: `entry_class`, `since_sequence_no`, `page`, `page_size` (1–500, default 100).

```jsonc
{
  "case": { "id": "case-0007", "shipment_id": "SHP-2026-0007", "status": "CLEARED",
            "approving_official": { "id": "usr-sup-001", "name": "Dwayne Okafor", "role": "SUPERVISOR" },
            "cleared_at": "2026-09-08T14:22:09.883Z" },
  "completeness": { "total_entries": 12, "decision_entries": 5,
                    "decision_entries_complete": 5, "missing_fields": [] },
  "data": [
    {
      "id": "aud-0007-011", "sequence_no": 11,
      "entry_class": "APPROVAL_DECISION", "event_type": "CLEARANCE_APPROVED",
      "occurred_at": "2026-09-08T14:22:09.883Z",
      "actor": { "kind": "HUMAN", "user_id": "usr-sup-001", "name": "Dwayne Okafor", "role": "SUPERVISOR" },
      "status_change": { "before": "PENDING_APPROVAL", "after": "CLEARED" },
      "exceptions": [ { "exception_id": "exc-0007-hts-v2", "exception_type": "INVALID_HTS_CODE",
                        "severity": "HIGH", "status": "CLEARED_BY_DECISION",
                        "rule_id": "rule-hts-completeness", "policy_reference": "19 CFR 152.11" } ],
      "evidence_reviewed": [ { "exception_id": "exc-0007-hts-v2", "kind": "OBSERVED",
                               "field_path": "hts_code", "raw_value": "8541.40",
                               "normalized_value": "854140", "expected": "10 digits", "observed": "6 digits" } ],
      "ai_recommendation": { "present": true, "recommended_action": "ESCALATE_TO_SUPERVISOR",
                             "confidence_level": "MEDIUM", "confidence_basis": "…", "rationale": "…",
                             "provenance": { "provider": "deterministic-fallback",
                                             "model": "cargodemo-fallback-recommendation@1",
                                             "generation_mode": "FALLBACK_PROVIDER_DISABLED",
                                             "generated_at": "…", "grounding_fingerprint": "sha256:…" },
                             "concurrence": "DIVERGED" },
      "user_decision": "APPROVE",
      "user_decision_detail": { "recommendation_id": "rec-0007-1", "resolution_basis": "MIXED",
                                "evidence_changed": false },
      "justification": "Certificate of origin received and consistent with the entry. Residual HTS and origin findings reviewed and accepted with an annotation for the classification unit.",
      "approving_official": { "user_id": "usr-sup-001", "name": "Dwayne Okafor", "role": "SUPERVISOR" },
      "notification": { "id": "ntf-0007-011", "recipient_role": "CARGO_SPECIALIST",
                        "subject": "Clearance approved for SHP-2026-0007 by Dwayne Okafor",
                        "body": "…", "generated_at": "…", "transmitted": false },
      "evaluation_version": 2, "rule_set_fingerprint": "sha256:…",
      "prev_hash": "sha256:…", "entry_hash": "sha256:…",
      "presentation": { "headline": "Clearance approved", "authorship": "HUMAN",
                        "actor_label": "Dwayne Okafor (Supervisor)",
                        "decision_label": "Approved the clearance recommendation" }
    }
  ],
  "page": { "page": 1, "page_size": 100, "total": 12, "total_pages": 1 }
}
```

### `GET /api/cases/{id}/audit/{sequence_no}` — CS, SUP, ADM
One entry in the shape above.

### `GET /api/cases/{id}/audit/verify` — CS, SUP, ADM
`{ "valid": true, "entries_checked": 12, "first_invalid_sequence_no": null, "verified_at": "…" }`

### `GET /api/cases/{id}/audit/export` — CS, SUP, ADM
`format=json` → the full record with the chain and a `verification` block, `Content-Disposition: attachment; filename="audit-SHP-2026-0007.json"`. `format=printable` → server-rendered HTML.

### `GET /api/audit` — SUP, ADM
Cross-case search. Query: `actor_user_id`, `event_type`, `entry_class`, `shipment_id`, `from`, `to`, `page`, `page_size`.

## §6 Notifications

### `GET /api/notifications` — CS, SUP, ADM
Query: `unread_only`, `case_id`, `page`, `page_size`. Scoped to the acting role's addressing (F14 row 42).
```jsonc
{ "data": [ { "id": "ntf-0007-005", "case_id": "case-0007", "shipment_id": "SHP-2026-0007",
              "event_type": "REQUEST_INFORMATION", "recipient_role": "CARGO_SPECIALIST",
              "subject": "Document requested for SHP-2026-0007", "body": "…",
              "generated_at": "…", "transmitted": false, "read": false,
              "audit_entry_id": "aud-0007-005" } ],
  "unread_count": 4,
  "page": { "page": 1, "page_size": 25, "total": 9, "total_pages": 1 } }
```

### `GET /api/notifications/unread-count` — CS, SUP, ADM
`{ "unread_count": 4 }`

### `GET /api/cases/{id}/notifications` — CS, SUP, ADM
Per-case list in the same item shape, ordered by `generated_at` ascending.

## §7 Workflow reads

### `GET /api/cases/{id}/available-actions` — CS, SUP, ADM
```jsonc
{ "case_id": "case-0007", "status": "NEW", "acting_role": "CARGO_SPECIALIST",
  "actions": [
    { "action": "REQUEST_INFORMATION", "available": true,  "reason": null,
      "required_fields": ["justification","document_types"], "justification_min_length": 10 },
    { "action": "SEND_FOR_SPECIALIST_REVIEW", "available": true, "reason": null },
    { "action": "CLEAR_EXCEPTION", "available": true, "reason": null,
      "required_fields": ["justification","exception_ids","resolution_basis"] },
    { "action": "PLACE_ON_HOLD", "available": true, "reason": null },
    { "action": "ESCALATE_TO_SUPERVISOR", "available": true, "reason": null }
  ],
  "approval": { "available": false, "reason": "APPROVAL_PENDING_ABSENT" },
  "case_version": 1757340382104 }
```

### `GET /api/workflow/transitions` — CS, SUP, ADM
The F09a §2 table as data: `[{ id: "T01", from, action, allowed_roles, to, guards, invalid_reason }]`. Consumed by the UI and by tests WF-01 and WF-02.

### `GET /api/cases/{id}/actions` — CS, SUP, ADM
Action history: `[{ action_id, action, status_before, status_after, justification, parameters, actor, occurred_at, audit_entry_id }]`.

### `GET /api/cases/{id}/recommendations` / `GET /api/cases/{id}/approvals` — CS, SUP, ADM
As defined in F11 §Outputs, returned as lists ordered by time ascending.
