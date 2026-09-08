---

## F15: Rule Administration

**Priority:** P1 · **Category:** Access Control & Administration

**Description:** F15 is the System Administrator surface for managing business rules as configuration, proving the generated application remains adaptable without regeneration. It lists rules with type, severity, enabled state, and policy reference; creates, edits, enables, and disables rules within the three supported exception types; validates definitions on save with clear rejection messages; previews the effect of a change before applying it; and records every change in the audit trail with the administrator's identity and timestamp. It exists to support the four primary screens, not to expand the demo (PRD §5.8).

**Terminology:**
- **Rule version:** `rules.version`, incremented on every save. Exceptions record the rule version that produced them, so a finding remains explicable after the rule changes.
- **Impact preview:** A dry-run evaluation of the proposed rule set against all non-cleared shipments, reporting which exceptions would appear, disappear, or change severity — with **no writes**.
- **Apply with revalidation:** Saving a rule change and immediately revalidating affected shipments (F6 with `trigger = RULE_CHANGE`), so the effect is visible on the queue without a restart.
- **Rule history:** The append-only sequence of `RULE_CREATED` / `RULE_UPDATED` / `RULE_ENABLED` / `RULE_DISABLED` audit entries with before/after parameter diffs.

**Sub-features:**
- Rule list with type, severity, enabled state, policy reference, and current impact count
- Rule creation and editing within the three exception types
- Enable / disable toggling
- Parameter editing per exception type
- Definition validation on save with field-level messages
- Impact preview and apply-with-revalidation
- Change auditing with parameter diffs

**Process:**
1. The administrator opens the Rule Administration surface (reachable only from the administrator navigation, F16). It calls `GET /api/rules` and renders the list with, for each rule, the number of shipments currently carrying an `OPEN` exception from it.
2. Creating or editing a rule opens a type-aware form. Selecting an `exception_type` renders exactly the parameters that type accepts (F4 §4–§6); no free-form JSON editing is required, though the raw `params_json` is shown read-only for transparency.
3. On submit, the client calls `POST /api/rules/{id}/preview-impact` with the proposed definition. The server validates the definition, runs the rule set — with the proposed rule substituted in memory — against every non-cleared shipment, and returns the projected differences. **Nothing is written.** This satisfies PRD F15's "show the effect of a rule change".
4. The administrator reviews the preview: shipments that would gain an exception, lose one, or change priority, with counts and a per-shipment list capped at 100 entries.
5. On confirm, the client calls `POST /api/rules` (create) or `PATCH /api/rules/{id}` (edit) with `{ definition, change_note, revalidate_affected }`.
6. The server revalidates the definition, persists it with `version = version + 1`, invalidates the rule cache (F4 §Process step 2), and writes a `RULE_CREATED`/`RULE_UPDATED` audit entry containing the full before and after definitions, the computed parameter diff, the administrator's identity, the timestamp, and the change note.
7. If `revalidate_affected = true`, the server revalidates every non-cleared shipment whose exception set could be affected — determined as the union of (shipments with an `OPEN` exception from this rule) and (shipments matching the new definition's applicability conditions). Each revalidation is a normal F6 run with `trigger = RULE_CHANGE`, producing its own evaluation version and audit entry.
8. Enable/disable are dedicated endpoints rather than a `PATCH` field, because they are the most consequential single-click change and deserve their own audit event type and their own confirmation copy.
9. The response reports the saved rule, the revalidation summary, and a link to the rule history.

**Inputs:**

`POST /api/rules` / `PATCH /api/rules/{id}` body:
- `definition` (object, required): the rule definition per F4 §2 — `name`, `exception_type` (create only; immutable on edit), `description`, `policy_reference`, `severity`, `priority_mapping`, `conditions`, `params_json`
- `change_note` (string, required, 10–500 chars): why the change is being made. Recorded on the audit entry.
- `revalidate_affected` (boolean, optional, default `true`)

`POST /api/rules/{id}/preview-impact` body: `{ definition }` (the proposed definition; for an existing rule the ID is taken from the path)

`POST /api/rules/{id}/enable` / `.../disable` body: `{ change_note (required, 10–500 chars), revalidate_affected (boolean, default true) }`

`GET /api/rules` query: `exception_type`, `enabled`, `severity`, `page`, `page_size`

**Outputs:**
- Rule list projection: `{ id, name, exception_type, severity, enabled, policy_reference, description, version, updated_at, updated_by_name, open_exception_count, affected_shipment_count }`
- Rule detail adding `conditions`, `params_json`, and `params_schema` (the JSON Schema for its type, so the UI can render the form generically)
- `ImpactPreview`: `{ valid, evaluated_shipments, would_add: [{ shipment_id, exception_type, severity }], would_remove: [{ shipment_id, exception_id, exception_type }], would_change_severity: [...], would_change_priority: [{ shipment_id, from, to }], summary: { added, removed, unchanged, priority_changes }, truncated: boolean }`
- `RuleSaveResult`: `{ rule, previous_version, diff: [{ path, before, after }], revalidation: { shipments_revalidated, exceptions_added, exceptions_resolved, priorities_changed }, audit_entry_id }`
- Rule history: the audit entries for the rule with before/after definitions

**Validation:**
- `exception_type` MUST be one of exactly three values and is **immutable after creation** — changing a rule's type would orphan the exceptions it produced. Attempting it returns `422 RULE_TYPE_IMMUTABLE`.
- `params_json` MUST validate against the JSON Schema for its `exception_type`, with `additionalProperties: false`. Unknown parameters are rejected with a field-level message naming the parameter and listing the accepted ones — a typo must never silently disable a check.
- Type-specific cross-field validation:
  - HTS: `min_digit_count <= expected_digit_count`; `check_known_codes = true` requires a non-empty `known_codes`; every `known_codes` entry must be a digit string of length ≥ `known_code_prefix_length`.
  - Origin: `comparison_fields` MUST be non-empty and every entry MUST be a recognized origin-bearing path (`manufacturer.address.country`, `documents.{TYPE}.stated_country`); an unrecognized path returns `RULE_PARAM_PATH_UNKNOWN`.
  - Missing document: `required_document_types` MUST be non-empty, ≤ 20 items, each matching `^[A-Z0-9_]{3,60}$` after normalization, with no duplicates.
- `severity` MUST be one of the four canonical values; `conditions` MUST validate against the shared conditions schema (F4 §3).
- `name` MUST be unique across rules (case-insensitive), 3–120 chars.
- `policy_reference` and `description` are **required**, because F19 must always be able to display the triggering authority and a human-readable statement of the rule. A rule without them cannot be defended on screen.
- `change_note` is required on every mutation, including enable/disable. Rule changes are governance events and carry the same justification discipline as case actions.
- Only `SYSTEM_ADMINISTRATOR` may create, edit, enable, disable, or preview (F14 rows 49–53). All roles may read rules and rule history (rows 47–48, 54) — a specialist must be able to see the rule that flagged their shipment.
- Rule changes MUST NOT modify existing `exceptions` rows. Historical exceptions keep their `rule_version` and their original evidence; the effect of a change appears only in new evaluations (F6 resolved-not-deleted semantics, with `resolution_reason = RULE_PARAMS_CHANGED` or `RULE_DISABLED`).
- A rule MUST NOT be deletable. Disabling is the supported retirement path, so the rule that produced a historical exception remains readable forever. `DELETE /api/rules/{id}` is not defined.
- Impact preview MUST perform zero writes; asserted by an F21 test that snapshots row counts and `updated_at` values across a preview call.
- Preview and apply MUST use the same evaluator code path as production evaluation — a divergent "simulation" implementation would make the preview untrustworthy.
- A rule change MUST NOT affect a `CLEARED` case (F09a I6); such cases are excluded from the revalidation set and reported as `skipped_cleared` in the summary.

**State transitions caused:** None directly. Revalidation triggered by a rule change follows F6's status table, which never moves a case to `CLEARED` or `PENDING_APPROVAL`. A rule change can therefore change what a case is flagged for, and its priority, but never its disposition.

**Demonstration path (PRD §7 "Rule configurability"):** an administrator opens `rule-hts-completeness`, changes `expected_digit_count` from 10 to 6, previews (the preview reports that `SHP-2026-0007` and `SHP-2026-0001` would lose their HTS exception), applies with revalidation, and the queue immediately shows the reduced exception counts — with zero code changes and zero redeploys. Reverting the parameter restores the prior state, and both changes are in the rule history with the administrator's name.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Non-administrator attempts a mutation | 403 | `FORBIDDEN_ROLE` | "Only a System Administrator may manage rules" |
| Rule not found | 404 | `RESOURCE_NOT_FOUND` | "Rule {id} not found" |
| `exception_type` changed on edit | 422 | `RULE_TYPE_IMMUTABLE` | "A rule's exception type cannot be changed" |
| Unknown parameter in `params_json` | 422 | `RULE_CONFIG_INVALID` | "Unknown parameter '{param}' for {exception_type}; accepted: {list}" |
| Cross-field parameter violation | 422 | `RULE_CONFIG_INVALID` | "{detail}" (e.g. "min_digit_count cannot exceed expected_digit_count") |
| Unrecognized origin comparison path | 422 | `RULE_PARAM_PATH_UNKNOWN` | "Field path {path} is not a recognized origin-bearing field" |
| Empty `known_codes` with `check_known_codes` | 422 | `RULE_CONFIG_INVALID` | "known_codes must be non-empty when check_known_codes is enabled" |
| Duplicate rule name | 409 | `RULE_NAME_CONFLICT` | "A rule named '{name}' already exists" |
| Missing `change_note` | 422 | `CHANGE_NOTE_REQUIRED` | "A change note is required for rule changes" |
| Missing `policy_reference` or `description` | 422 | `VALIDATION_FAILED` | "policy_reference and description are required" |
| Enable/disable a rule already in that state | 409 | `TRANSITION_REDUNDANT` | "Rule {id} is already {state}" |
| Attempt to delete a rule | 405 | `RULE_DELETE_NOT_SUPPORTED` | "Rules cannot be deleted; disable the rule instead" |
| Revalidation failed after a successful save | 207 | `PARTIAL_REVALIDATION_FAILURE` | "Rule saved; {n} shipment(s) failed revalidation" |
| Preview exceeded the evaluation budget | 422 | `PREVIEW_TOO_LARGE` | "Impact preview limited to 500 shipments" |

A save and its revalidation are separate transactions by design: the rule change is durable even if a subsequent shipment revalidation fails, and the failure is reported rather than silently rolling back a valid configuration change. The affected shipments can be revalidated individually from F18.

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/rules` | CS, SUP, ADM | Rule list with impact counts |
| GET | `/api/rules/{id}` | CS, SUP, ADM | Rule detail plus its params JSON Schema |
| POST | `/api/rules` | ADM | Create a rule |
| PATCH | `/api/rules/{id}` | ADM | Edit a rule |
| POST | `/api/rules/{id}/enable` | ADM | Enable |
| POST | `/api/rules/{id}/disable` | ADM | Disable |
| POST | `/api/rules/{id}/preview-impact` | ADM | Dry-run impact analysis |
| GET | `/api/rules/{id}/history` | CS, SUP, ADM | Change history with diffs |

Full schemas: `Y1c-api-admin.md` §Rules.

**Schema Surface (this feature):** writes `rules`, `audit_entries`, `notifications`; triggers writes to `evaluations`/`exceptions`/`evidence`/`cases` via F6. See `Y0a-schema-core.md` §Rules.
