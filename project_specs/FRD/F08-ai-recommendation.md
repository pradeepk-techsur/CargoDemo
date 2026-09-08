---

## F8: AI Recommended Resolution with Confidence Level

**Priority:** P0 · **Category:** AI Assistance · **Walkthrough steps:** 4, 8

**Description:** F8 produces an advisory recommendation for how to resolve the exception: one of the five user actions, presented alongside the exception detected, the triggering rule and policy reference, the supporting evidence, the missing information, a plain-language rationale, and an explicit confidence level with a stated basis. The recommendation is inert — it is never executed, never pre-selected in the UI, and never recorded as a decision. It is recorded on the case so the audit record can show what the human was advised. A deterministic offline generator derives the recommendation from rule severity and sub-reason whenever the AI provider is unavailable, and the deterministic path is authoritative for the recommended *action* even in LLM mode.

**Terminology:**
- **Recommended action:** One of the five `00-header.md` §0.4.3 action codes. Never `APPROVE_CLEARANCE` — approval is a supervisor prerogative that the system does not recommend.
- **Confidence level:** `HIGH` | `MEDIUM` | `LOW`, always accompanied by a `confidence_basis` string stating *why* that level was assigned. A confidence level without a basis is invalid.
- **Deterministic action derivation:** The precedence table in §Action derivation. This runs in both LLM and fallback mode; the LLM may author the rationale prose but MUST NOT change the recommended action. This is what makes the recommendation reproducible and testable, and it means the demo behaves identically with the provider on or off.
- **Advisory record:** The persisted `ai_outputs` row with `kind = 'RECOMMENDATION'`, snapshotted onto every audit entry as the `ai_recommendation` field (F12).

**Sub-features:**
- Deterministic recommended-action derivation from the open exception set
- Confidence-level computation with stated basis
- Rationale generation (LLM-authored prose or fallback template)
- Presentation bundle: exception, rule, evidence, missing information
- Evaluation-version caching and regeneration
- Inertness guarantees and audit snapshotting

**Process:**
1. The client requests `GET /api/shipments/{id}/ai/recommendation`. The service loads the case and its current evaluation.
2. A cached `ai_outputs` row with `kind = 'RECOMMENDATION'` bound to the current evaluation is returned immediately with `cached = true`.
3. Otherwise the service assembles the same grounding set as F7 (F7 §Process step 3) plus the case's workflow context: current status, whether an open document request exists, whether a recommendation is already pending, and the acting user's role (so unavailable actions are not recommended).
4. The service computes the recommended action deterministically (§Action derivation). This step never calls the provider.
5. The service computes the confidence level deterministically (§Confidence derivation).
6. If the provider is enabled, the service requests a rationale only: the prompt supplies the grounding set **and the already-decided recommended action and confidence**, and asks for a plain-language justification traceable to the evidence. Timeout 10 s, no retries, temperature `0.2`.
7. The LLM rationale is validated with the same grounding check as F7, plus a check that it does not contradict the recommended action (it must not advocate a different action code, and must not use approval language). On failure, the fallback rationale template is used.
8. If the provider is disabled, times out, errors, or fails validation, the fallback rationale template renders the rationale from the evidence. The recommended action and confidence are unchanged, because they never came from the provider.
9. The service assembles the presentation bundle: for each `OPEN` exception, `{ exception_type, sub_reason, severity, rule_name, rule_description, policy_reference, evidence[], missing_information[] }`.
10. The service persists the `ai_outputs` row and returns it. The UI (F19) renders it with an AI-generated label, the confidence badge and basis, and an explicit statement that the AI recommends and the human decides. No action control is pre-selected and nothing is auto-submitted.
11. When a human subsequently takes an action (F9), the workflow service snapshots the current recommendation — action, confidence, basis, rationale, provenance, and `grounding_fingerprint` — into the audit entry's `ai_recommendation` field, including whether the human's chosen action **agreed** with it (`concurrence: AGREED | DIVERGED | NO_RECOMMENDATION_PRESENT | NOT_APPLICABLE`). Divergence is not an error; it is the point of the design, and recording it is what makes human authority demonstrable. `NOT_APPLICABLE` is recorded on `APPROVAL_DECISION` entries (F11 approve / reject / request-info): the recommended action is always one of the five user actions and never `APPROVE_CLEARANCE`, so an approval can neither agree nor disagree with it. The snapshot itself is still recorded in full, so the record still shows what the approver was advised.

### §Action derivation (deterministic, evaluated top-down; first match wins)

| # | Condition on the current `OPEN` exception set and case state | Recommended action |
|---|---|---|
| 1 | Case status is `PENDING_APPROVAL` | `SEND_FOR_SPECIALIST_REVIEW` *(rendered as "awaiting supervisor decision"; no new action is advised while approval is outstanding)* |
| 2 | Zero `OPEN` exceptions | `CLEAR_EXCEPTION` |
| 3 | ≥ 1 `OPEN` exception with `severity = CRITICAL` **and** case status ∉ {`ESCALATED`} | `ESCALATE_TO_SUPERVISOR` |
| 4 | ≥ 1 `OPEN` `MISSING_REQUIRED_DOCUMENT` exception with an unfulfilled requirement **and** no outstanding document request already covering every missing type | `REQUEST_INFORMATION` |
| 5 | ≥ 1 `OPEN` `MISSING_REQUIRED_DOCUMENT` exception **and** an outstanding request already covers every missing type | `PLACE_ON_HOLD` |
| 6 | Only `INVALID_HTS_CODE` exceptions remain, all with `sub_reason ∈ { INCOMPLETE_DIGITS, MISSING, PLACEHOLDER }` | `REQUEST_INFORMATION` |
| 7 | Only `INVALID_HTS_CODE` exceptions remain, other sub-reasons | `SEND_FOR_SPECIALIST_REVIEW` |
| 8 | Only `CONFLICTING_COUNTRY_OF_ORIGIN` exceptions remain, non-critical | `SEND_FOR_SPECIALIST_REVIEW` |
| 9 | Any other combination of ≥ 2 exception types | `SEND_FOR_SPECIALIST_REVIEW` |

*Canonical scenario at evaluation v1:* three open exceptions including `rule-origin-manufacturer` at `CRITICAL` → rule 3 matches → **`ESCALATE_TO_SUPERVISOR`**. The specialist in the walkthrough diverges from this advice by requesting the missing document instead, and the audit record captures `concurrence: DIVERGED` — a live, unscripted demonstration that the human decides. *(If a demo prefers the AI to advise the document request, the administrator can lower `rule-origin-manufacturer` severity to `HIGH` via F15, after which rule 4 matches and the recommendation becomes `REQUEST_INFORMATION`. Both paths are supported and neither is hardcoded.)*

**Role filtering:** if the derived action is not available to the acting user's role from the current state (F9's transition table), the recommendation is still returned with the derived action, but `available_to_current_role: false` and `unavailable_reason` are set, and the UI shows the action disabled with the reason. The recommendation is never silently rewritten to suit the viewer.

### §Confidence derivation (deterministic)

A score in `[0,1]` is computed and mapped to a level. Each factor contributes as stated; the score starts at `0.5`.

| Factor | Adjustment |
|---|---|
| Exactly one `OPEN` exception | `+0.20` |
| ≥ 3 `OPEN` exceptions | `−0.10` |
| Every `OPEN` exception has complete evidence (all required evidence kinds present per F5 §Validation) | `+0.15` |
| Any `OPEN` exception has `sub_reason` in the "unresolvable/ambiguous" set (`UNRESOLVABLE_DECLARED_ORIGIN`, `UNRESOLVABLE_COMPARISON_ORIGIN`, `MISSING_COMPARISON_ORIGIN`, `ODD_STRUCTURE`, `UNKNOWN_CODE`) | `−0.20` |
| The missing information is fully enumerable (every missing item names a concrete document type or a concrete digit count) | `+0.15` |
| Any exception at `CRITICAL` severity | `−0.05` (a critical finding warrants human scrutiny regardless of machine certainty) |
| An outstanding document request already exists for the same information | `−0.10` |
| Evidence changed since the current recommendation's grounding fingerprint | `−0.15` |

Mapping: `score >= 0.75 → HIGH`; `0.45 <= score < 0.75 → MEDIUM`; `score < 0.45 → LOW`.

`confidence_basis` is composed from the applied factors, e.g. *"Medium — three exceptions are open and one is critical, though all supporting evidence is complete and the missing information is fully enumerated."* The basis MUST name the factors that moved the score, so the confidence is inspectable rather than decorative.

**Inputs:**
- `shipment_id` (path, required)
- `regenerate` (query, boolean, optional, default `false`)
- Acting user from session (role affects `available_to_current_role`, never the derived action)
- Environment: same AI variables as F7

**Outputs:**

```
{
  "kind": "RECOMMENDATION",
  "shipment_id": "SHP-2026-0007",
  "evaluation_version": 1,
  "recommended_action": "ESCALATE_TO_SUPERVISOR",
  "confidence": { "level": "MEDIUM", "score": 0.55, "basis": "…", "factors": [ { "factor": "…", "adjustment": -0.10 } ] },
  "rationale": "string",
  "available_to_current_role": true,
  "unavailable_reason": null,
  "presentation": {
    "exceptions": [
      {
        "exception_id": "…", "exception_type": "…", "sub_reason": "…", "severity": "…",
        "rule": { "id": "rule-origin-manufacturer", "name": "…", "description": "…", "policy_reference": "19 CFR 134.1" },
        "evidence": [ { "kind": "OBSERVED", "field_path": "country_of_origin", "raw_value": "Malaysia", "normalized_value": "MY" } ],
        "missing_information": [ ]
      }
    ]
  },
  "governance_notice": "This is an AI-generated recommendation. It has not been acted on. A named official must decide.",
  "provenance": { "provider": "…", "model": "…", "generation_mode": "…", "generated_at": "…", "grounding_fingerprint": "sha256:…", "action_source": "DETERMINISTIC", "rationale_source": "LLM|FALLBACK", "is_ai_generated": true },
  "cached": false
}
```

**Validation:**
- `recommended_action` MUST be one of the five action codes. It MUST NOT be `APPROVE_CLEARANCE`, `REJECT_RECOMMENDATION`, or any non-action string.
- `confidence.level` MUST be present with a non-empty `confidence_basis`; a recommendation without a basis is rejected before persistence (`CONFIDENCE_BASIS_REQUIRED`).
- `action_source` MUST always be `DETERMINISTIC`. An implementation that lets the provider choose the action is a defect; an F21 test runs the same shipment with the provider enabled and disabled and asserts identical `recommended_action` and `confidence.level`.
- The rationale MUST pass the F7 grounding check and MUST NOT advocate an action other than `recommended_action`.
- The response MUST always be produced; F8 never returns `503`. The full walkthrough MUST complete with `CARGODEMO_AI_PROVIDER=none`.
- The recommendation MUST be inert: F8 MUST NOT write to `cases`, `case_actions`, `recommendations`, or `approvals`, and MUST NOT enqueue any deferred execution. An F21 test asserts that requesting a recommendation leaves `cases.updated_at` and `cases.status` unchanged.
- No audit entry may have `actor_kind = 'AI'` together with a non-null `user_decision` (`00-header.md` §0.4.7).
- Every audit entry for a human action MUST carry the `ai_recommendation` snapshot with `concurrence` computed; when no recommendation had been generated at action time, the field is the explicit object `{ present: false, reason: "NOT_GENERATED" }` rather than `null`, so the eight-field completeness rule of F12 is satisfiable and the absence is itself recorded.
- Presentation bundle MUST include the triggering rule and its `policy_reference` for every open exception — the resolution screen must never show a recommendation without showing its authority.
- p95 latency ≤ 5 s; hard timeout 10 s; fallback path < 50 ms.

**State transitions caused:** None, by construction. F8 is read-only with respect to workflow state.

**Error States:**

| Scenario | HTTP Status | Error Code | Behavior |
|---|---|---|---|
| Provider disabled/timeout/error/invalid output | 200 | — | Deterministic action + fallback rationale, mode recorded |
| Shipment not found | 404 | `RESOURCE_NOT_FOUND` | "Shipment {id} not found" |
| Shipment never evaluated | 409 | `NO_EVALUATION` | "Shipment has not been evaluated" |
| Derived action not in the canonical five | 500 | `RECOMMENDATION_ACTION_INVALID` | "Derived recommendation is not a supported user action" |
| Confidence computed without a basis | 500 | `CONFIDENCE_BASIS_REQUIRED` | "Recommendation confidence requires a stated basis" |
| Rationale contradicts the derived action | 200 | — | Falls back to the template rationale; contradiction logged |
| Unauthenticated | 401 | `UNAUTHENTICATED` | "No acting user" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/shipments/{id}/ai/recommendation` | CS, SUP, ADM | Retrieve (cached or generate) the recommendation |
| POST | `/api/shipments/{id}/ai/recommendation/regenerate` | CS, SUP | Force regeneration against the current evaluation |

Full schemas: `Y1c-api-admin.md` §AI assistance.

**Schema Surface (this feature):** writes `ai_outputs` (`kind = 'RECOMMENDATION'`); reads the same tables as F7 plus `document_requests`, `recommendations`. Snapshotted into `audit_entries.ai_recommendation_json` by F9/F11. See `Y0b-schema-workflow-audit.md`.
