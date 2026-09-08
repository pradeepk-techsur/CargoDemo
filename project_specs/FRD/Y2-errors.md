---

# Y2: Cross-Feature Error Catalog

Every non-2xx response uses the uniform envelope from F3:

```jsonc
{ "error": { "code": "EXCEPTION_SET_STALE",
             "message": "The exception set changed; reload the shipment and resubmit",
             "details": { "expected": ["exc-a","exc-b"], "actual": ["exc-b"] },
             "field_errors": [ { "path": "exception_ids", "code": "STALE", "message": "…" } ],
             "request_id": "req-8f2a…" } }
```

Clients branch on `code`, never on `message`. Messages are user-facing copy; `details` is diagnostic; `field_errors` drives inline form annotation.

## §1 Transport and authentication (F3, F14)

| Code | HTTP | Retryable | Meaning / operator guidance |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | after login | No acting user; select a role |
| `SESSION_INVALID` | 401 | after login | Session unknown, ended, or the user was deactivated |
| `FORBIDDEN_ROLE` | 403 | no | The acting role may not perform the operation |
| `SELF_ROLE_CHANGE_BLOCKED` | 403 | no | A user cannot change their own role |
| `USER_INACTIVE` | 403 | no | The selected user is deactivated |
| `RESOURCE_NOT_FOUND` | 404 | no | The path resource does not exist |
| `MALFORMED_JSON` | 400 | after fix | Body is not valid JSON |
| `VALIDATION_FAILED` | 422 | after fix | Schema violation; see `field_errors` |
| `INVALID_ENUM_VALUE` | 422 | after fix | Value outside a canonical enum |
| `INVALID_QUERY_PARAM` | 422 | after fix | Unsupported filter or sort field |
| `PAYLOAD_TOO_LARGE` | 413 | no | Body or file exceeds its limit |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | no | Content type not in the upload allow-list |
| `IDEMPOTENCY_KEY_REUSED` | 409 | no | Key reused with a different payload |
| `CASE_VERSION_CONFLICT` | 409 | after reload | The case changed concurrently |
| `INTERNAL_ERROR` | 500 | maybe | Unhandled fault; quote `request_id` |

## §2 Ingestion and seed (F1, F2)

| Code | HTTP | Meaning |
|---|---|---|
| `INGEST_MALFORMED_JSON` | 400 | Payload unparseable |
| `INGEST_SCHEMA_VERSION_UNSUPPORTED` | 422 | Envelope `schema_version` not `"1.0"`; whole batch rejected |
| `INGEST_BATCH_SIZE_INVALID` | 422 | `entries` outside 1–500 |
| `INGEST_ENTRY_INVALID` | 207/422 | One entry failed field validation; others proceed |
| `INGEST_DUPLICATE_IN_BATCH` | 207 | Same `shipment_id` twice in one batch |
| `INGEST_DOCUMENT_FILENAME_REQUIRED` | 207/422 | `RECEIVED` document without a filename |
| `INGEST_FILE_NOT_FOUND` | exit 1 | CLI/file ingestion path missing |
| `SEED_DB_NOT_EMPTY` | 409 | Seed attempted on populated DB without `FORCE_RESEED` |
| `SEED_COVERAGE_FAILED` | 500 | A coverage assertion failed; seeding rolled back |
| `SEED_CANONICAL_SCENARIO_INVALID` | 500 | The solar-panel shipment does not match required values |
| `SEED_FIXTURE_MISSING` | 500 | A document fixture is absent from the repository |
| `SEED_PII_SUSPECTED` | 500 | Seed content matched a PII deny-list pattern |
| `SEED_WORKFLOW_SCRIPT_INVALID` | 500 | A scripted seed transition was rejected by the state machine |

## §3 Rules and evaluation (F4, F5, F15)

| Code | HTTP | Meaning |
|---|---|---|
| `RULE_CONFIG_INVALID` | 422 on save / reported in result on load | `params_json` failed its type schema or a cross-field check |
| `RULE_PARAM_PATH_UNKNOWN` | 422 | `comparison_fields` names an unrecognized origin-bearing path |
| `RULE_TYPE_IMMUTABLE` | 422 | Attempt to change a rule's `exception_type` |
| `RULE_NAME_CONFLICT` | 409 | Rule name already used |
| `CHANGE_NOTE_REQUIRED` | 422 | Rule mutation without a change note |
| `RULE_DELETE_NOT_SUPPORTED` | 405 | Rules are disabled, never deleted |
| `PREVIEW_TOO_LARGE` | 422 | Impact preview beyond the 500-shipment budget |
| `PARTIAL_REVALIDATION_FAILURE` | 207 | Rule saved; some shipments failed to revalidate |
| `EXCEPTION_TYPE_UNSUPPORTED` | 500 | A persisted rule declares a fourth exception type |
| `EVALUATION_FAILED` | 500 | Rule evaluation raised |
| `EVALUATION_TIMEOUT` | 500 | Evaluation exceeded the 2 s ceiling |
| `EVALUATION_VERSION_CONFLICT` | 409 | Concurrent evaluation; retry |
| `EXCEPTION_EVIDENCE_REQUIRED` | 500 | An exception was written with no evidence |
| `MISSING_INFORMATION_REQUIRED` | 500 | A missing-document exception lacked its missing types |
| `PRIORITY_DERIVATION_FAILED` | 500 | Derived priority outside the canonical set |
| `EVALUATION_HISTORY_IMMUTABLE` | 405 | Attempt to modify a superseded evaluation |
| `NO_EVALUATION` | 409 | Operation requires an evaluated shipment |

## §4 Workflow and state machine (F9)

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_TRANSITION` | 409 | `(status, action, role)` is absent from the transition table |
| `TRANSITION_REDUNDANT` | 409 | The case is already in the target state |
| `CASE_TERMINAL` | 409 | The case is `CLEARED` and immutable |
| `ESCALATED_REQUIRES_SUPERVISOR` | 403 | A specialist acted on an escalated case |
| `HOLD_REQUIRES_RELEASE` | 403 | A specialist tried to clear from `ON_HOLD` |
| `APPROVAL_PENDING` | 409 | The action is unavailable while approval is outstanding |
| `ACTION_NOT_A_USER_ACTION` | 422 | An approval code posted to the actions endpoint, or vice versa |
| `JUSTIFICATION_REQUIRED` | 422 | Missing or under-length justification |
| `JUSTIFICATION_NOT_AUTHORED` | 422 | Justification is an exact copy of the AI rationale |
| `DOCUMENT_TYPE_NOT_REQUIRED` | 422 | Requested type is not in any open exception's missing information |
| `OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED` | 422 | Clearance proposed with unacknowledged open requests |
| `ASSIGNEE_INVALID` / `ESCALATION_TARGET_INVALID` | 422 | Target user is not an active user of the required role |
| `ASSIGNMENT_NOT_PERMITTED` | 403 | A specialist tried to assign work to another specialist |
| `EXCEPTION_SET_STALE` | 409 | `exception_ids` no longer matches the open set |

## §5 Documents (F10)

| Code | HTTP | Meaning |
|---|---|---|
| `REQUEST_NOT_OUTSTANDING` | 409 | Upload or cancel against a fulfilled/cancelled request |
| `DUPLICATE_DOCUMENT_REQUEST` | 409 | An outstanding request for the type already exists |
| `DOCUMENT_ALREADY_RECEIVED` | 409 | The requested type is already on the shipment |
| `FILE_REQUIRED` | 422 | No file part in the multipart body |
| `FILE_EMPTY` | 422 | Zero-byte upload |
| `FILE_EXTENSION_MISMATCH` | 422 | Extension inconsistent with the declared MIME type |
| `FILE_CONTENT_MISMATCH` | 422 | Magic bytes inconsistent with the declared MIME type |
| `PII_SUSPECTED` | 422 | Text content matched a PII deny-list pattern |
| `STORAGE_PATH_INVALID` | 500 | Computed path escapes the storage directory |
| `STORAGE_WRITE_FAILED` | 500 | Disk write failed; the transaction rolled back |

## §6 Approvals and governance (F11, F12)

| Code | HTTP | Meaning |
|---|---|---|
| `SELF_APPROVAL_BLOCKED` | 403 | The recommender attempted to decide their own recommendation (SoD-2) |
| `RECOMMENDATION_ALREADY_PENDING` | 409 | A pending recommendation already exists (G-REC) |
| `RECOMMENDATION_NOT_PENDING` | 409 | The referenced recommendation is no longer pending |
| `EVIDENCE_CHANGED_UNACKNOWLEDGED` | 409 | Evidence changed since the recommendation and was not acknowledged |
| `AUDIT_INCOMPLETE` | 500 | A required audit field was absent; the whole transaction aborted |
| `AUDIT_IMMUTABLE` | 405 | Update or delete attempted against an audit entry |
| `AUDIT_TIMESTAMP_NONMONOTONIC` | 500 | Draft timestamp precedes the previous entry |
| `AUDIT_SEQUENCE_CONFLICT` | 409 | Concurrent audit write; retry |
| `AUDIT_CHAIN_INVALID` | 200 with `valid:false` | Hash-chain verification failed at a named sequence number |
| `NOTIFICATION_TEMPLATE_MISSING` | 500 | No template registered for the event type |
| `NOTIFICATION_GENERATION_FAILED` | 500 | Notification could not be generated; the action rolled back |
| `NOTIFICATION_IMMUTABLE` | 405 | Update or delete attempted against a notification |

## §7 AI assistance (F7, F8)

The AI endpoints are **fallback-first**: provider unavailability is never surfaced as an error to the client, because the walkthrough must complete with the provider disabled. The conditions below produce `200` with a `FALLBACK_*` generation mode.

| Condition | Client-visible outcome | Generation mode |
|---|---|---|
| `CARGODEMO_AI_PROVIDER=none` | `200` with a complete fallback output | `FALLBACK_PROVIDER_DISABLED` |
| Provider exceeded the 10 s timeout | `200` | `FALLBACK_TIMEOUT` |
| Provider returned an HTTP error or rate limit | `200` | `FALLBACK_PROVIDER_ERROR` |
| Provider output unparseable or failed the grounding check | `200` | `FALLBACK_VALIDATION_FAILED` |

Genuine AI-route errors:

| Code | HTTP | Meaning |
|---|---|---|
| `FALLBACK_TEMPLATE_MISSING` | 500 | No fallback template for an `(exception_type, sub_reason)` pair |
| `RECOMMENDATION_ACTION_INVALID` | 500 | Derived action is not one of the five |
| `CONFIDENCE_BASIS_REQUIRED` | 500 | Confidence computed without a stated basis |
| `AI_UNAVAILABLE` | 503 | Reserved; **never returned by `/ai/summary` or `/ai/recommendation`** |

## §8 Startup and environment (F0, F14, F22)

These abort startup with exit code 1 rather than serving a degraded application.

| Code | Meaning |
|---|---|
| `DB_UNAVAILABLE` | Database file or directory unwritable |
| `MIGRATION_CHECKSUM_MISMATCH` | An applied migration's content changed |
| `SCHEMA_INTEGRITY_FAILED` | A required CHECK or append-only trigger is missing |
| `ROUTE_SCHEMA_MISSING` | A route lacks a request schema declaration |
| `ROUTE_PERMISSION_MISSING` | A route lacks an `allowed_roles` declaration |
| `PORT_IN_USE` | The deterministic port is occupied; no automatic fallback |
| `STORAGE_UNAVAILABLE` | Document storage directory unwritable |
| `CONFIRMATION_REQUIRED` | Reset requested without `confirm: true` (runtime, `422`) |

## §9 Error-handling principles

1. **Distinguish authority from state.** `403` means "you may not"; `409` means "not from here". A specialist acting on an escalated case gets `403 ESCALATED_REQUIRES_SUPERVISOR`, not a generic transition error, because the two demand different operator responses.
2. **Never silently absorb.** Redundant transitions, unknown filters, and unknown parameters are rejected, not ignored. Silent absorption is how an audit trail acquires a no-op decision or a rule quietly stops checking.
3. **Fail the whole transaction.** Any error during a mutating action rolls back the domain write, the audit entry, and the notification together. There is no state in which a case moved but its record did not.
4. **Fall back rather than fail** — but only for AI assistance, and only with the fallback labeled. Nothing else in the system degrades silently.
5. **Record denials.** Every `403` and every rejected transition writes an audit entry (F09a I10). A blocked self-approval attempt is exactly the kind of event an oversight reviewer wants to see.
6. **Never leak.** Error messages contain no API keys, no absolute paths outside the project, no SQL, and no stack traces. Diagnosis happens through `request_id` and the server log.
