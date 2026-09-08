---

## F4: Configurable Business Rule Engine

**Priority:** P0 · **Category:** Rules & Validation · **Walkthrough steps:** 4, 7

**Description:** F4 is a configuration-driven evaluator that validates a cargo entry against the persisted, enabled rule set and emits zero or more exception findings with field-level evidence. It supports **exactly three** exception types — missing required document, invalid/incomplete HTS code, and conflicting country of origin. The check *logic* for each type is implemented once as a typed evaluator; every threshold, document list, digit count, comparison field, severity, and condition is data in `rules.params_json`, so the System Administrator (F15) changes behavior without a code change or redeploy. Evaluation is deterministic: the same entry plus the same rule set always yields the same findings, in the same order, with the same evidence.

**Terminology:**
- **Evaluator:** The code implementing one `exception_type`. Exactly three exist and no mechanism for registering a fourth is exposed.
- **Rule definition:** A `rules` row: `{ id, name, exception_type, description, policy_reference, params_json, severity, priority_mapping, enabled, version, created_at, updated_at }`.
- **Finding:** The evaluator's in-memory output for one firing rule — `{ rule_id, exception_type, severity, sub_reason, evidence[], missing_information[], assertion }`. F5 persists findings as `exceptions` rows.
- **Sub-reason:** A machine-readable discriminator explaining *how* the rule failed (e.g. `INCOMPLETE_DIGITS` vs `NON_NUMERIC`). Drives the fallback recommendation (F8) and the resolution screen copy (F19).
- **Applicability condition:** A rule-level gate (value threshold, commodity keyword, HTS prefix, origin country) evaluated before the check itself. A rule whose conditions do not match is *not applicable* and produces no finding — which is distinct from being applicable and passing.
- **Normalization:** Deterministic canonicalization of input values (country → ISO alpha-2; HTS → digit string; document type → upper snake case) performed before comparison. Both the raw and the normalized value are recorded in evidence.

**Sub-features:**
- Rule loading, caching, and cache invalidation on rule change
- Applicability condition evaluation (shared across all three evaluators)
- `MISSING_REQUIRED_DOCUMENT` evaluator
- `INVALID_HTS_CODE` evaluator
- `CONFLICTING_COUNTRY_OF_ORIGIN` evaluator
- Deterministic multi-rule evaluation with stable ordering
- Rule-definition schema validation (shared with F15)

**Process:**
1. The engine is invoked with `(cargo_entry_id, trigger, actor)` where `trigger ∈ { INGESTION, MANUAL_REVALIDATION, DOCUMENT_UPLOAD, RULE_CHANGE, SEED }`.
2. The engine loads the cargo entry, its documents, and the enabled rule set. The rule set is cached in process and the cache is invalidated whenever any `rules` row is created, updated, enabled, or disabled (F15), so a rule change takes effect on the next evaluation with no restart.
3. The engine sorts the rule set deterministically by `(exception_type ASC, severity DESC, rule_id ASC)`. This ordering is the persisted order of findings and therefore the display order on F18/F19 — it never varies between runs.
4. For each rule, the engine evaluates applicability conditions (§3). Non-applicable rules are skipped and recorded in the evaluation's `skipped_rules[]` with the failing condition, so an administrator can see *why* a rule did not fire.
5. For each applicable rule, the engine dispatches to the evaluator for its `exception_type` and collects the finding, if any. An evaluator MUST NOT throw for ordinary bad data; malformed input is a finding, not a crash. Only a malformed *rule definition* raises, and it raises as `RULE_CONFIG_INVALID` attributed to that rule while the remaining rules still evaluate.
6. All findings are retained. No suppression, deduplication across rules, or "highest severity only" filtering occurs — a shipment with three firing rules yields three findings (PRD F4: "all firing rules are retained, none suppressed").
7. The engine returns an `EvaluationResult` to F5, which persists the evaluation version, the exceptions, and the evidence, and derives priority and status.

### §2 Rule definition schema (validated on save by F15 and on load by F4)

| Field | Type | Rules |
|---|---|---|
| `id` | string | `^rule-[a-z0-9-]{3,40}$`, immutable after creation |
| `name` | string | 3–120 chars, unique |
| `exception_type` | enum | exactly one of the three canonical codes |
| `description` | string | 10–500 chars, shown on F19 as the human-readable rule statement |
| `policy_reference` | string | 3–120 chars, e.g. `19 CFR 141.86` — displayed as the triggering authority |
| `severity` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |
| `priority_mapping` | object | optional override `{ "LOW":"LOW", ... }` mapping this rule's severity to a case-priority contribution; default is identity |
| `enabled` | boolean | disabled rules are never evaluated and never produce findings |
| `conditions` | object | applicability conditions, §3 |
| `params_json` | object | type-specific parameters, §4–§6. Validated against the JSON Schema for its `exception_type`. |
| `version` | integer | incremented on every save; stamped onto findings so an exception records the rule version that produced it |

A rule whose `params_json` fails its type schema is rejected on save (F15) and, if already persisted and later found invalid on load, is skipped with a `RULE_CONFIG_INVALID` entry in the evaluation result rather than silently ignored.

### §3 Applicability conditions (shared)

`conditions` is an object; all present conditions must match (logical AND). An empty object means always applicable.

| Condition | Type | Semantics |
|---|---|---|
| `min_shipment_value_usd` | number | applicable when `shipment_value_usd >= value` |
| `max_shipment_value_usd` | number | applicable when `shipment_value_usd <= value` |
| `commodity_keywords` | string[] | applicable when `product_description`, lowercased, contains any keyword lowercased as a substring |
| `hts_prefixes` | string[] | applicable when `hts_code_normalized` starts with any listed digit prefix. A null/empty HTS matches only if `""` is listed. |
| `country_of_origin_in` | string[] | applicable when `country_of_origin_iso2` is in the list |
| `country_of_origin_not_in` | string[] | applicable when `country_of_origin_iso2` is not in the list |

Evidence for a skipped rule records `{ condition, expected, actual, result: "NOT_APPLICABLE" }`.

### §4 `INVALID_HTS_CODE` — concrete validation logic

**Parameters (`params_json`):**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `expected_digit_count` | integer 6–12 | `10` | The number of significant digits a complete code must have |
| `min_digit_count` | integer 4–12 | `6` | Below this, the code is `INCOMPLETE_DIGITS` at elevated confidence; between `min` and `expected` it is still `INCOMPLETE_DIGITS` |
| `allowed_separators` | string[] | `[".", "-", " "]` | Characters stripped before digit counting |
| `allow_partial` | boolean | `false` | When `true`, a code with ≥ `min_digit_count` digits passes the length check (used to demonstrate a configuration change in F15) |
| `treat_missing_as_exception` | boolean | `true` | When `false`, a null/absent HTS produces no finding from this rule |
| `check_known_codes` | boolean | `false` | Enables the reference-list check |
| `known_code_prefix_length` | integer 4–10 | `6` | Number of leading digits compared against the reference list |
| `known_codes` | string[] | `[]` | Reference list of valid digit prefixes, supplied as configuration |
| `placeholder_characters` | string[] | `["X","x","*","?","#"]` | Any occurrence makes the code a placeholder, not a classification |

**Algorithm (executed in this exact order; the first failing check produces the finding and stops):**

1. **MISSING** — If `hts_code` is `null`, empty, or whitespace-only:
   - If `treat_missing_as_exception = false` → no finding.
   - Else → finding with `sub_reason = "MISSING"`, `missing_information = [{ field_path: "hts_code", requirement: "A complete {expected_digit_count}-digit HTS classification is required" }]`.
2. **Normalize** — Strip every character in `allowed_separators`; trim. Retain the result as `hts_code_normalized`.
3. **PLACEHOLDER** — If the normalized string contains any character in `placeholder_characters` → `sub_reason = "PLACEHOLDER"`. A code such as `8541.40.XX` is a placeholder, not merely incomplete, and is reported as such because the missing digits are unknown rather than merely absent.
4. **NON_NUMERIC** — If the normalized string contains any character that is not `0`–`9` → `sub_reason = "NON_NUMERIC"`. Evidence records the offending characters and their zero-based positions in the normalized string.
5. **ODD_STRUCTURE** — If the *raw* code contains a separator run of length > 1 (`8541..40`), a leading separator, or a trailing separator → `sub_reason = "ODD_STRUCTURE"`. This is checked after digit-content so that a genuinely non-numeric code reports the more specific reason.
6. **Digit count** — Let `d = normalized.length`.
   - If `d > expected_digit_count` → `sub_reason = "TOO_MANY_DIGITS"`.
   - If `d < expected_digit_count`:
     - If `allow_partial = true` **and** `d >= min_digit_count` → continue to step 7 (length accepted).
     - Else → `sub_reason = "INCOMPLETE_DIGITS"`, with `missing_information = [{ field_path: "hts_code", requirement: "{expected_digit_count}-digit classification required", observed_digits: d, missing_digits: expected_digit_count - d }]`.
   - If `d == expected_digit_count` → continue to step 7.
7. **UNKNOWN_CODE** — If `check_known_codes = true`: take the first `known_code_prefix_length` digits of the normalized code. If that prefix is not present in `known_codes` → `sub_reason = "UNKNOWN_CODE"`. If `known_codes` is empty while `check_known_codes = true`, the rule definition is invalid (`RULE_CONFIG_INVALID`) rather than passing everything.
8. If no check failed → no finding; the HTS code is valid and complete under this rule.

**Evidence emitted:** `{ field_path: "hts_code", raw_value: "8541.40", normalized_value: "854140", assertion: "HTS code has 6 significant digits; a complete classification requires 10", expected: "10 digits", observed: "6 digits", sub_reason: "INCOMPLETE_DIGITS" }`.

**Canonical scenario:** `"8541.40"` → normalized `"854140"`, `d = 6`, `expected_digit_count = 10`, `allow_partial = false` → `INCOMPLETE_DIGITS`, severity `HIGH`.

### §5 `CONFLICTING_COUNTRY_OF_ORIGIN` — concrete validation logic

**Parameters (`params_json`):**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `declared_field` | string | `"country_of_origin"` | The declared-origin field path |
| `comparison_fields` | string[] | `["manufacturer.address.country"]` | Origin-bearing fields compared against the declared origin, in order |
| `treat_missing_declared_as_conflict` | boolean | `true` | An undeclarable/unmappable declared origin is itself a finding |
| `treat_missing_comparison_as_conflict` | boolean | `false` | A null comparison field produces no finding, only an `insufficient_evidence` note |
| `allowed_pairs` | object[] | `[]` | Explicitly tolerated mismatches, `[{ declared: "MY", comparison: "SG" }]` |
| `case_sensitive` | boolean | `false` | Retained for completeness; normalization makes this irrelevant by default |

**Country normalization (deterministic, table-driven):**
1. Trim, collapse internal whitespace, uppercase.
2. Strip a trailing period and leading articles (`THE `).
3. Look up in the alias table, which maps ISO alpha-2 codes, ISO alpha-3 codes, official names, and a curated synonym list to alpha-2. Examples: `MALAYSIA → MY`, `MY → MY`, `MYS → MY`, `CHINA → CN`, `PEOPLE'S REPUBLIC OF CHINA → CN`, `PRC → CN`, `HONG KONG → HK` (distinct from `CN` by design), `TAIWAN → TW`, `VIET NAM`/`VIETNAM → VN`.
4. On lookup failure the normalized value is `null` and the raw value is retained.

The alias table is application data (not per-rule configuration) so that all three evaluators normalize identically; F15 does not expose it for editing.

**Algorithm:**
1. Normalize the declared origin: `declared_iso2 = normalize(entry[declared_field])`.
2. If `declared_iso2` is `null`:
   - If `treat_missing_declared_as_conflict = false` → no finding.
   - Else → finding with `sub_reason = "UNRESOLVABLE_DECLARED_ORIGIN"`, evidence recording the raw declared value and the assertion that it could not be resolved to a recognized country.
3. For each `comparison_fields` entry in order, resolve the value by dot-path against the cargo entry (and, where the path begins `documents.`, against the document set — e.g. `documents.CERTIFICATE_OF_ORIGIN.stated_country`):
   - If the path resolves to `null`/absent: record an `insufficient_evidence` note for that field. If `treat_missing_comparison_as_conflict = true` → finding with `sub_reason = "MISSING_COMPARISON_ORIGIN"` and `missing_information` naming the absent field; otherwise continue to the next field.
   - Normalize to `comparison_iso2`. If normalization fails → finding with `sub_reason = "UNRESOLVABLE_COMPARISON_ORIGIN"`.
   - If `comparison_iso2 == declared_iso2` → this field agrees; continue.
   - If the pair `{ declared_iso2, comparison_iso2 }` appears in `allowed_pairs` → tolerated; record an `allowed_pair_applied` note and continue.
   - Otherwise → **finding**, `sub_reason = "ORIGIN_MISMATCH"`, and evaluation of this rule stops at the first genuine mismatch (the first mismatch is the exception; additional disagreeing fields are appended to the same finding's evidence array rather than producing extra findings, because one rule produces at most one exception).
4. If every comparison field agreed or was tolerated/insufficient → no finding.

**Evidence emitted (canonical scenario):**
```
[
  { field_path: "country_of_origin",             raw_value: "Malaysia", normalized_value: "MY" },
  { field_path: "manufacturer.address.country",  raw_value: "China",    normalized_value: "CN" }
]
assertion: "Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)"
sub_reason: "ORIGIN_MISMATCH"
```

**Why the walkthrough works:** because the default `comparison_fields` contains only `manufacturer.address.country`, attaching a certificate of origin in step 6 cannot change this rule's inputs. The origin exception therefore *persists* through revalidation while the missing-document exception resolves — exactly the behavior walkthrough step 7 must demonstrate.

### §6 `MISSING_REQUIRED_DOCUMENT` — concrete validation logic

**Parameters (`params_json`):**

| Param | Type | Default | Meaning |
|---|---|---|---|
| `required_document_types` | string[] | — (required, 1–20 items) | Document type codes that must be received |
| `match_mode` | enum | `"ALL"` | `ALL` = every listed type required; `ANY_ONE_OF` = at least one listed type satisfies the rule |
| `accept_statuses` | string[] | `["RECEIVED"]` | Document statuses that count as satisfying |
| `require_file_present` | boolean | `true` | A `RECEIVED` document with no `storage_path`/`filename` does not satisfy the requirement |
| `ignore_superseded` | boolean | `true` | Documents marked superseded do not satisfy the requirement |

**Algorithm:**
1. Build the received set: every `documents` row for the shipment whose `status` is in `accept_statuses`, whose `document_type` (normalized to upper snake case) is retained, excluding superseded rows when `ignore_superseded = true`, and excluding rows failing the `require_file_present` check.
2. Normalize `required_document_types` to upper snake case.
3. If `match_mode = "ALL"`: compute `missing = required \ received`. If `missing` is empty → no finding. Otherwise → **one** finding listing every missing type.
4. If `match_mode = "ANY_ONE_OF"`: if the intersection of `required` and `received` is non-empty → no finding. Otherwise → one finding listing all acceptable types as alternatives.
5. `missing_information` contains one entry per missing type: `{ document_type, requirement: "{Display name} is required for this shipment", required_by_rule: rule_id, policy_reference }`.
6. `sub_reason` is `DOCUMENT_NOT_RECEIVED` when the document row exists with `status = NOT_RECEIVED`, `DOCUMENT_NOT_DECLARED` when no row exists at all, and `DOCUMENT_FILE_MISSING` when a row claims `RECEIVED` but fails the file-present check. When multiple missing types have different sub-reasons, the finding's `sub_reason` is the most specific one in that precedence order and each `missing_information` entry keeps its own.

**Partial satisfaction is the key revalidation property:** a rule requiring three documents of which one arrives keeps its exception `OPEN` with a *shrunken* `missing_information` list. The exception resolves only when `missing` becomes empty. See F6 §Process step 6.

**Evidence emitted (canonical scenario):** `{ field_path: "documents", raw_value: "COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING", assertion: "CERTIFICATE_OF_ORIGIN has not been received", missing_information: [{ document_type: "CERTIFICATE_OF_ORIGIN", requirement: "Certificate of Origin is required for shipments valued at or above $50,000" }], sub_reason: "DOCUMENT_NOT_RECEIVED" }`.

### §7 Default rule set (seeded by F2, editable by F15)

| Rule ID | Type | Severity | Key params | Policy ref |
|---|---|---|---|---|
| `rule-doc-baseline` | `MISSING_REQUIRED_DOCUMENT` | `MEDIUM` | `required_document_types: [COMMERCIAL_INVOICE, PACKING_LIST, BILL_OF_LADING]` | `19 CFR 141.81` |
| `rule-doc-highvalue-coo` | `MISSING_REQUIRED_DOCUMENT` | `HIGH` | `required_document_types: [CERTIFICATE_OF_ORIGIN]`, `conditions.min_shipment_value_usd: 50000` | `19 CFR 102.0` |
| `rule-doc-solar-cert` | `MISSING_REQUIRED_DOCUMENT` | `HIGH` | `required_document_types: [CERTIFICATE_OF_ORIGIN]`, `conditions.commodity_keywords: ["solar","photovoltaic"]` | `19 CFR 102.0` |
| `rule-hts-completeness` | `INVALID_HTS_CODE` | `HIGH` | `expected_digit_count: 10`, `min_digit_count: 6`, `allow_partial: false` | `19 CFR 152.11` |
| `rule-hts-known-chapter` | `INVALID_HTS_CODE` | `MEDIUM` | `check_known_codes: true`, `known_code_prefix_length: 4`, `known_codes: [...]`, `enabled: false` | `HTSUS General Rules` |
| `rule-origin-manufacturer` | `CONFLICTING_COUNTRY_OF_ORIGIN` | `CRITICAL` | `comparison_fields: ["manufacturer.address.country"]` | `19 CFR 134.1` |
| `rule-origin-certificate` | `CONFLICTING_COUNTRY_OF_ORIGIN` | `HIGH` | `comparison_fields: ["documents.CERTIFICATE_OF_ORIGIN.stated_country"]`, `enabled: false` | `19 CFR 134.1` |

`rule-doc-highvalue-coo` and `rule-doc-solar-cert` both require `CERTIFICATE_OF_ORIGIN` and both fire on the canonical shipment. To keep the canonical scenario at exactly three exceptions, `rule-doc-solar-cert` is seeded **disabled**; it exists so an administrator can demonstrate enabling a rule and seeing a fourth exception appear (F15). The canonical shipment's three exceptions therefore come from `rule-doc-highvalue-coo`, `rule-hts-completeness`, and `rule-origin-manufacturer`.

**Inputs:**
- `cargo_entry_id` (uuid, required)
- `trigger` (enum, required): `INGESTION` | `MANUAL_REVALIDATION` | `DOCUMENT_UPLOAD` | `RULE_CHANGE` | `SEED`
- `actor` (object, required): `{ user_id | null, role | null, actor_kind }`
- Implicit: the enabled `rules` set, the shipment's `documents`, and the country alias table

**Outputs:**
- `EvaluationResult`: `{ evaluation_id, cargo_entry_id, version, evaluated_at, trigger, rule_set_fingerprint, findings[], skipped_rules[], invalid_rules[], duration_ms }`
- `rule_set_fingerprint`: a SHA-256 over the ordered `(rule_id, version, enabled)` tuples — recorded on the evaluation so an audit reader can prove which rule configuration produced a finding.
- Findings handed to F5 for persistence.

**Validation:**
- `exception_type` MUST be one of exactly three values; the evaluator registry is a closed map and has no registration API.
- A rule with `enabled = false` MUST NOT produce a finding under any circumstances.
- The same `(entry, rule set)` MUST produce identical findings, identical ordering, and identical evidence arrays across runs — asserted by an F21 determinism test that evaluates each seeded entry twice and compares serialized results.
- Evaluation of a single shipment MUST complete in < 500 ms with the seeded rule set (PRD §6).
- Evaluators MUST NOT mutate the cargo entry, its documents, or the rule set.
- An invalid rule definition MUST NOT prevent other rules from evaluating.
- `params_json` MUST validate against the JSON Schema for its `exception_type`; unknown params are rejected (`additionalProperties: false`) so a typo in a parameter name cannot silently disable a check.

**State transitions caused:** None directly; F4 produces findings. F5 sets the case's initial status and priority, and F6 reconciles status after a revalidation.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Cargo entry not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| Rule `params_json` fails its type schema on load | 200 (reported in result) | `RULE_CONFIG_INVALID` | "Rule {rule_id} configuration is invalid: {detail}" |
| `check_known_codes` true with empty `known_codes` | 200 (reported) / 422 on save | `RULE_CONFIG_INVALID` | "known_codes must be non-empty when check_known_codes is enabled" |
| `comparison_fields` contains an unresolvable path | 200 (reported) / 422 on save | `RULE_PARAM_PATH_UNKNOWN` | "Field path {path} is not a recognized origin-bearing field" |
| Unknown `exception_type` persisted in `rules` | 500 | `EXCEPTION_TYPE_UNSUPPORTED` | "Rule {rule_id} declares unsupported exception type {type}" |
| Evaluation exceeds the 2 s hard ceiling | 500 | `EVALUATION_TIMEOUT` | "Rule evaluation exceeded time limit" |
| Evaluator raised unexpectedly | 500 | `EVALUATION_FAILED` | "Rule {rule_id} evaluation failed: {detail}" |

**API Surface (this feature):** F4 has no public endpoint of its own; it is invoked by F1 (ingestion), F6 (`POST /api/shipments/{id}/revalidate`), F15 (rule change impact preview: `POST /api/rules/{id}/preview-impact`), and F2 (seeding). See `Y1b`/`Y1c`.

**Schema Surface (this feature):** reads `rules`, `cargo_entries`, `documents`; writes `evaluations` (with `rule_set_fingerprint`, `skipped_rules_json`, `invalid_rules_json`). Exception/evidence persistence is F5's. See `Y0a-schema-core.md` §Rules and §Evaluation.
