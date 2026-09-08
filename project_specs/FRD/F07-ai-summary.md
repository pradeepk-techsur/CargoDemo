---

## F7: AI Plain-Language Shipment Summary

**Priority:** P0 · **Category:** AI Assistance · **Walkthrough step:** 3

**Description:** F7 produces a request-time, plain-language narrative explaining what the shipment is and why it was flagged, so a specialist understands the case without reconstructing it from raw fields. Every claim is grounded in the captured evidence (F5), every summary carries provider/model attribution and generation timestamp, and every summary is cached against the evaluation version that produced it and regenerated on revalidation. A deterministic offline generator produces a complete, correct summary whenever the AI provider is disabled, unreachable, or slow — so the walkthrough completes with the provider off.

**Terminology:**
- **Evaluation-bound cache:** A summary is stored against `(cargo_entry_id, evaluation_id)`. A new evaluation version invalidates the previous summary rather than mutating it; prior summaries stay readable in the audit trail.
- **Grounding set:** The exact structured input given to the generator — shipment attributes, the open exception list, and the evidence rows. The generator has no other information source and no database access.
- **Fallback generator:** A pure, template-driven function that renders a summary from the grounding set with no network call. Deterministic: identical grounding set → byte-identical text.
- **Provenance:** `{ provider, model, generation_mode, generated_at, evaluation_version, grounding_fingerprint, latency_ms }` recorded on every summary and displayed with it.
- **Generation mode:** `LLM` | `FALLBACK_PROVIDER_DISABLED` | `FALLBACK_PROVIDER_ERROR` | `FALLBACK_TIMEOUT` | `FALLBACK_VALIDATION_FAILED`.

**Sub-features:**
- Grounding-set assembly from current evaluation state
- LLM generation with a constrained prompt
- Output validation (grounding check) before persistence
- Deterministic offline fallback generator
- Evaluation-version caching and regeneration
- Attribution metadata and AI labeling

**Process:**
1. The client requests `GET /api/shipments/{id}/ai/summary`. The service loads the case and its current evaluation.
2. If a cached `ai_outputs` row exists with `kind = 'SUMMARY'` and `evaluation_id` equal to the current evaluation, it is returned immediately with `cached = true`. This makes walkthrough step 3 instant on re-display and stable across a demo.
3. Otherwise the service assembles the grounding set:
   - Shipment: `shipment_id`, `importer_name`, `carrier_name`, `product_description`, `hts_code` (raw and normalized), `country_of_origin` (raw and ISO), `manufacturer.name`, `manufacturer.address.country` (raw and ISO), `shipment_value_usd`, `entry_date`.
   - Documents: received and missing types with provenance.
   - For each `OPEN` exception: `exception_type`, `sub_reason`, `severity`, rule `name`, rule `description`, `policy_reference`, and the full evidence rows with raw and normalized values.
   - Case: `status`, `priority`, `priority_basis`.
   - A `grounding_fingerprint` (SHA-256 of the canonically serialized grounding set) is computed and stored, so a reader can prove which state the text describes.
4. If `CARGODEMO_AI_PROVIDER` is `none`, the service goes straight to step 8 with `generation_mode = FALLBACK_PROVIDER_DISABLED`. No network call is attempted and no error is logged — disabled is a supported operating mode, not a failure.
5. Otherwise the service issues one provider call with the constrained prompt (§Prompt contract), a 10-second hard timeout, and no retries. A retry would risk exceeding the walkthrough's patience budget; the fallback is faster and always available.
6. On a provider response, the service validates the output (§Validation, grounding check). A response that fails validation is discarded and the fallback is used with `generation_mode = FALLBACK_VALIDATION_FAILED`; the rejected text is logged (without PII, of which there is none) for diagnosis but is never shown to a user.
7. On timeout or provider error, the fallback is used with the corresponding mode.
8. The fallback generator renders the summary from the grounding set (§Fallback algorithm).
9. The service persists an `ai_outputs` row: `{ kind: 'SUMMARY', cargo_entry_id, evaluation_id, content_json, provenance_json, grounding_fingerprint, generated_at }` and returns it. `ai_outputs` rows are append-only in the same sense as audit rows: superseded summaries are marked `superseded_by` rather than overwritten.
10. The UI renders the summary inside an "AI-generated" container with the provider, model, generation mode, and timestamp visible, and — when any fallback mode is active — a distinct "offline fallback summary" label plus the global degradation banner from F22.

**Prompt contract (LLM mode):**
- System instruction: the assistant explains a flagged cargo shipment to a CBP cargo specialist; it MUST use only the supplied structured facts; it MUST NOT invent regulations, values, dates, parties, or conclusions; it MUST NOT recommend or take an action (recommendations belong to F8); it MUST NOT state that the shipment is compliant or non-compliant as a legal conclusion.
- User content: the grounding set serialized as JSON.
- Requested output: strict JSON matching the summary schema (§Outputs). Temperature `0.2`, max output tokens `700`.
- No shipment data leaves the process in fallback mode, and no real or personal data exists to leave in LLM mode (PRD §6 Privacy).

**Fallback algorithm (deterministic, no network):**
1. **Overview sentence** — templated from shipment attributes: *"Shipment {shipment_id} is a consignment of {product_description} imported by {importer_name} via {carrier_name}, declared with a value of {value_formatted} and a country of origin of {country_of_origin}."*
2. **Flag sentence** — *"This shipment was flagged by {n} validation rule(s) and is currently {status} at {priority} priority."*
3. **Per-exception paragraph**, emitted in the deterministic exception order from F4 §Process step 3. Each paragraph is produced by the template registered for `(exception_type, sub_reason)`:
   - `MISSING_REQUIRED_DOCUMENT / DOCUMENT_NOT_RECEIVED`: *"{Rule name}: the following required document(s) have not been received — {missing list}. {Rule description} (Authority: {policy_reference}.)"*
   - `INVALID_HTS_CODE / INCOMPLETE_DIGITS`: *"{Rule name}: the declared HTS code {raw} resolves to {observed} significant digits, but a complete classification requires {expected}. The classification is incomplete, so duty treatment cannot be determined. (Authority: {policy_reference}.)"*
   - `INVALID_HTS_CODE / NON_NUMERIC` | `PLACEHOLDER` | `ODD_STRUCTURE` | `TOO_MANY_DIGITS` | `UNKNOWN_CODE` | `MISSING`: one dedicated template each, each naming the raw value and the specific defect.
   - `CONFLICTING_COUNTRY_OF_ORIGIN / ORIGIN_MISMATCH`: *"{Rule name}: the declared country of origin is {declared_raw} ({declared_iso}), but {comparison_field_label} states {comparison_raw} ({comparison_iso}). These do not agree, which calls the declared origin into question. (Authority: {policy_reference}.)"*
   - `CONFLICTING_COUNTRY_OF_ORIGIN / UNRESOLVABLE_DECLARED_ORIGIN` and `MISSING_COMPARISON_ORIGIN`: dedicated templates.
4. **Evidence sentence** — *"The evidence reviewed for these findings is: {field_path} = {raw_value}{, comparison}…"* rendered from the evidence rows in `display_order`.
5. **Closing sentence** — *"A cargo specialist must review this shipment and decide how to proceed. This summary was generated offline from the recorded evidence and does not include a recommendation."*
6. Every template renders only values present in the grounding set. A template with an unresolved placeholder is a defect; the renderer asserts that no `{…}` token survives and fails loudly rather than emitting a broken sentence.

Because a template exists for every `(exception_type, sub_reason)` pair defined in F4, and F4's sub-reason set is closed, the fallback can always produce a complete summary. An F21 test enumerates the cross-product and asserts template coverage.

**Inputs:**
- `shipment_id` (path, required)
- `regenerate` (query, boolean, optional, default `false`): forces regeneration even when a cached summary matches the current evaluation. Available to CS and SUP; recorded on the `ai_outputs` row as `regenerated_by_user_id`.
- Environment: `CARGODEMO_AI_PROVIDER` (`openai` | `anthropic` | `none`, default `none`), `CARGODEMO_AI_MODEL`, `CARGODEMO_AI_API_KEY`, `CARGODEMO_AI_TIMEOUT_MS` (default `10000`).

**Outputs:**

```
{
  "kind": "SUMMARY",
  "shipment_id": "SHP-2026-0007",
  "evaluation_version": 1,
  "content": {
    "overview": "string",
    "why_flagged": "string",
    "exception_narratives": [
      { "exception_id": "…", "exception_type": "…", "sub_reason": "…", "text": "string" }
    ],
    "evidence_reviewed": [
      { "field_path": "…", "raw_value": "…", "normalized_value": "…" }
    ],
    "closing": "string"
  },
  "provenance": {
    "provider": "deterministic-fallback",
    "model": "cargodemo-fallback-summary@1",
    "generation_mode": "FALLBACK_PROVIDER_DISABLED",
    "generated_at": "2026-09-08T14:03:11.412Z",
    "evaluation_version": 1,
    "grounding_fingerprint": "sha256:…",
    "latency_ms": 3,
    "is_ai_generated": true,
    "label": "AI-generated (offline fallback)"
  },
  "cached": false
}
```

**Validation:**
- The response MUST always carry a summary. F7 MUST NOT return `503`, an empty body, or a null summary under any provider condition — the fallback guarantees availability and an F21 test runs the entire walkthrough with `CARGODEMO_AI_PROVIDER=none`.
- **Grounding check (LLM output):** every numeric literal, currency amount, country name, HTS code, document type, and party name appearing in the generated text MUST appear in the grounding set. Detected by extracting candidate tokens (numbers, capitalized multi-word spans, ALL_CAPS codes) and matching them against the grounding set's value inventory plus a small allow-list of ordinary English words and rendered forms (e.g. `$85,000.00` matching `85000.00`). A single unmatched token fails validation and triggers the fallback.
- **Action-language check:** the generated text MUST NOT contain imperative resolution language reserved for F8 (`clear the shipment`, `approve`, `release`, `deny`, `seize`). A match fails validation.
- The summary MUST reference every `OPEN` exception; an exception narrative missing from the LLM output fails validation.
- Provenance MUST be complete: no summary is persisted or returned without `provider`, `model`, `generation_mode`, `generated_at`, and `grounding_fingerprint`.
- The summary MUST be visibly labeled as AI-generated wherever displayed (F16 shared component), and MUST NOT be rendered in the same visual container as human-authored justifications (F20).
- The cached summary MUST be invalidated when `cases.current_evaluation_id` changes; serving a summary whose `evaluation_id` differs from the case's current evaluation is a defect.
- p95 latency MUST be ≤ 5 s and the hard timeout MUST be 10 s (PRD §6); the fallback path MUST complete in < 50 ms.
- No summary text is ever treated as a decision, and `ai_outputs` rows MUST NOT be referenced as the `user_decision` field of any audit entry.

**State transitions caused:** None. F7 never changes case status, never creates an action, and cannot be invoked as an actor. Its outputs are inert.

**Error States:**

| Scenario | HTTP Status | Error Code | Behavior |
|---|---|---|---|
| Provider disabled | 200 | — | Fallback summary, `FALLBACK_PROVIDER_DISABLED` |
| Provider timeout (> 10 s) | 200 | — | Fallback summary, `FALLBACK_TIMEOUT` |
| Provider HTTP error / rate limit | 200 | — | Fallback summary, `FALLBACK_PROVIDER_ERROR`, provider status recorded in provenance |
| Provider returned unparseable JSON | 200 | — | Fallback summary, `FALLBACK_VALIDATION_FAILED` |
| Output failed the grounding check | 200 | — | Fallback summary, `FALLBACK_VALIDATION_FAILED`, rejected reason recorded |
| Shipment not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| No evaluation exists yet for the shipment | 409 | `NO_EVALUATION` | "Shipment has not been evaluated" |
| Fallback template missing for a sub-reason | 500 | `FALLBACK_TEMPLATE_MISSING` | "No summary template for {type}/{sub_reason}" *(prevented by the F21 coverage test)* |
| Unauthenticated | 401 | `UNAUTHENTICATED` | "No acting user" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/shipments/{id}/ai/summary` | CS, SUP, ADM | Retrieve (cached or generate) the summary |
| POST | `/api/shipments/{id}/ai/summary/regenerate` | CS, SUP | Force regeneration against the current evaluation |
| GET | `/api/shipments/{id}/ai/outputs` | CS, SUP, ADM | All AI outputs across evaluation versions, for the audit view |

Full schemas: `Y1c-api-admin.md` §AI assistance.

**Schema Surface (this feature):** writes `ai_outputs`; reads `cargo_entries`, `documents`, `evaluations`, `exceptions`, `evidence`, `rules`, `cases`. See `Y0b-schema-workflow-audit.md` §AI outputs.
