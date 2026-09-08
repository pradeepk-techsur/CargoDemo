---

## F19: Recommended Resolution Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough steps:** 4, 8, 9

**Description:** F19 is the decision-support view. It shows the exception detected, the triggering rule and policy with its reference, the supporting evidence, and the missing information required to resolve it; the AI-recommended action with its confidence level and rationale; and all five user actions, with unavailable ones visibly disabled and explained. Justification is mandatory before any action is submitted, nothing is pre-selected, nothing auto-submits, and the screen states explicitly that the AI recommends and the human decides. For supervisors it additionally presents the approve/reject controls for a pending recommendation.

**Terminology:**
- **Decision panel:** The action area holding the five actions, the justification input, and the submit control.
- **Governance notice:** The fixed statement rendered above the decision panel: *"The AI recommends. A named official decides. No action has been taken."*
- **Pending recommendation panel:** The supervisor-facing block showing a specialist's recommendation awaiting decision (F11 §3).
- **Authority Chain rail:** The persistent, non-interactive rail rendered directly beneath the case header showing `Recommend → Supervisor approval → Cleared`, with the acting user's position marked and any step outside their authority labelled as such. It is how the clearance boundary is *communicated* to a Cargo Specialist, for whom the approve/reject controls are not rendered at all. It is display only and causes no transition.
- **Concurrence:** Whether the human's selected action matches the AI recommendation. Displayed after submission and recorded on the audit entry (F8 §Process step 11).

**Sub-features:**
- Exception + triggering rule + evidence display
- Missing information display
- AI recommendation with confidence level, basis, and rationale
- All five actions with per-action availability and reasons
- Mandatory justification capture with action-specific minimums
- Explicit AI-recommends/human-decides framing
- Authority Chain rail (the clearance boundary made visible for every role)
- Supervisor approve/reject/return controls

**Process:**
1. On mount the screen calls `GET /api/shipments/{id}/ai/recommendation`, `GET /api/shipments/{id}/exceptions`, `GET /api/cases/{id}/available-actions`, and — when the case is `PENDING_APPROVAL` — `GET /api/cases/{id}/recommendations`.
2. The **exception block** renders one card per `OPEN` exception, each containing: the exception type chip and severity; the triggering rule's name, description, and `policy_reference` rendered as the authority; the evidence rows; and the missing-information list. This block is populated from the exception API, **not** from the AI response, so the evidence a reviewer sees is the system's finding rather than the model's retelling (PRD §8). *(Walkthrough step 4 completes here.)*
3. The **AI recommendation block** renders inside `AiContentLabel`: the recommended action as a labeled statement (*"AI suggests: Escalate to supervisor"* — a statement, never a pre-selected control), the confidence badge with its level, the `confidence_basis` sentence, the contributing factors, the rationale text, and full provenance. In fallback mode the offline label is shown and the shell banner is active.
4. The **governance notice** renders between the AI block and the decision panel, always, in both roles. The **Authority Chain rail** renders directly beneath the case header on every visit, for every role: `① Recommend → ② Supervisor approval → ③ Cleared`. For a Cargo Specialist, step ② is marked *"Not your authority — Supervisor role required; a supervisor other than you must approve"* and the rail carries the sentence *"Your role cannot set this shipment to Cleared. There is no action on this screen, and no path anywhere in the application, that does so."* For a Supervisor viewing a pending recommendation, step ② is marked *"You are here"* with the note that approving makes them the recorded approving official.
5. The **decision panel** renders all five actions as radio-style selectable cards, none selected initially. Each unavailable action renders as `DisabledActionButton` with its reason from `available-actions` — the operator sees all five and learns why two of them are closed, rather than seeing a shortened list.
6. Selecting an action reveals its action-specific fields: document types for `REQUEST_INFORMATION`; assignee for `SEND_FOR_SPECIALIST_REVIEW`; exception confirmation, `resolution_basis`, and the outstanding-request acknowledgement for `CLEAR_EXCEPTION`; `hold_reason` for `PLACE_ON_HOLD`; `escalation_reason` and optional target for `ESCALATE_TO_SUPERVISOR`.
7. The `JustificationInput` is always required. Its minimum is 10 characters, raised to 40 for `CLEAR_EXCEPTION` with `resolution_basis ∈ { EXCEPTIONS_ACCEPTED, MIXED }` (F09b §4). The submit control stays disabled until every required field is valid.
8. `CLEAR_EXCEPTION` submission shows a confirmation step restating: the exceptions being proposed for clearance, that this creates a **recommendation** and not a clearance, and that a supervisor distinct from the submitter must approve. Submitting posts the action; the case moves to `PENDING_APPROVAL`. *(Walkthrough step 8.)*
9. For a supervisor viewing a `PENDING_APPROVAL` case, the **pending recommendation panel** renders above the decision panel: recommender name and role, submission time, `resolution_basis`, enumerated exceptions, the specialist's justification verbatim, and the AI recommendation with concurrence. If the recommendation's evaluation version differs from the current one, the evidence-changed warning renders with a link to the version diff and an acknowledgement checkbox.
10. The supervisor's controls are **Approve**, **Reject**, and **Request more information**, each with its own mandatory justification (40-character minimum for Reject) and, for Reject, a reason code. Submitting posts `POST /api/cases/{id}/approval`. *(Walkthrough step 9.)*
11. If the acting user **is a Supervisor and is the recommender** (the supervisor-authored-recommendation path, F11 SoD-2 — a specialist never reaches this panel because the controls are not rendered for that role at all), the approve/reject controls render disabled with *"You submitted this recommendation and cannot decide on it"* — and the server rejects the request anyway if it is somehow issued.
12. After any successful submission the screen shows a confirmation summarizing the recorded decision, the resulting status, whether it agreed with the AI recommendation, and a link to the Decision & Audit Record screen.

**Inputs:**
- Route parameter `shipmentId`
- `GET /api/shipments/{id}/ai/recommendation`, `GET /api/shipments/{id}/exceptions`, `GET /api/cases/{id}/available-actions`, `GET /api/cases/{id}/recommendations`
- Action form fields per F09b §2–§6
- Approval form fields per F11 §Inputs

**Outputs:**
- Rendered decision-support view
- Posted action (`POST /api/cases/{id}/actions`) or approval (`POST /api/cases/{id}/approval`)
- Post-submission confirmation with the new status, concurrence, and audit link

**Validation:**
- All five actions MUST be presented, always. Filtering the list to only available actions is a defect — the requirement is that unavailable actions are *visibly disabled and explained* (PRD F19).
- No action MUST be pre-selected, and no form MUST auto-submit. An AI recommendation MUST NOT set the initial selection; it is rendered as text next to the controls, never as a default. This is the screen-level expression of "the AI never decides".
- The governance notice MUST be present on every render for every role.
- Justification MUST be captured before submission, MUST meet the action-specific minimum, and MUST NOT be prefilled from the AI rationale. A submission whose justification exactly matches the AI rationale is rejected server-side (`JUSTIFICATION_NOT_AUTHORED`) and surfaced inline.
- The triggering rule's `policy_reference` MUST be displayed for every exception. A recommendation without a visible authority is not defensible.
- Evidence and missing information MUST come from the exception API, not from the AI response.
- The confidence level MUST always be displayed with its basis; a confidence badge without a basis is a defect.
- Approve/reject controls MUST be hidden from specialists entirely — not rendered, not rendered-disabled — with the server enforcing the boundary regardless. This is a deliberate and bounded exception to the disabled-with-reason rule above: that rule governs **the five workflow actions**, which are the operator's action space and are always all five rendered. `APPROVE_CLEARANCE` is **not** one of the five (`00-header.md` §0.4.3, F09a T31), so rendering it to a specialist even in a disabled state would misrepresent the action space as six-wide and imply approval is something the specialist might one day be permitted on this case. The boundary is instead communicated by the **Authority Chain rail** (§Process step 4), which states in words that step ② belongs to the Supervisor role. A specialist who sees a shortened list of the five is a defect; a specialist who sees a disabled Approve button is also a defect.
- For a **Supervisor who authored the pending recommendation**, the approve/reject controls ARE rendered and disabled with the SoD-2 reason (§Process step 11), because approval is genuinely within that role's action space and is closed only for this case.
- The evidence-changed acknowledgement MUST be required when the versions differ; the submit control stays disabled until it is checked.
- The screen MUST be fully keyboard operable, including action selection (arrow keys within the radio group) and the confirmation step, with `aria-live` announcements on submission results.
- Every rejected submission MUST leave the entered justification intact so the operator does not retype it — a live demo cannot afford lost input.

**State transitions caused:** every transition in F09a is reachable from this screen, subject to role and state:

| Control | Transition |
|---|---|
| Request additional information | → `AWAITING_INFORMATION` |
| Send for specialist review | → `IN_REVIEW` |
| Clear exception | → `PENDING_APPROVAL` (never `CLEARED`) |
| Place on hold | → `ON_HOLD` |
| Escalate to supervisor | → `ESCALATED` |
| Approve (SUP) | → `CLEARED` |
| Reject (SUP) | → `IN_REVIEW` |
| Request more information (SUP) | → `AWAITING_INFORMATION` |

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| No open exceptions | Exception block shows "No open exceptions"; `CLEAR_EXCEPTION` is available with an empty set | — |
| AI recommendation in fallback | Rendered normally with the offline label; the recommended action is identical to the online path (F8 `action_source: DETERMINISTIC`) | — |
| Action unavailable for role/state | Disabled control with the visible reason | `ROLE_NOT_PERMITTED`, `ESCALATED_REQUIRES_SUPERVISOR`, `TRANSITION_REDUNDANT`, `APPROVAL_PENDING` |
| Justification too short / copied from AI | Inline field error; submit disabled | `JUSTIFICATION_REQUIRED`, `JUSTIFICATION_NOT_AUTHORED` |
| Exception set changed since load | Banner "The evidence changed; review and resubmit" plus refetch; the selection is preserved | `EXCEPTION_SET_STALE` |
| Recommendation already pending | Decision panel replaced by the pending recommendation panel | `RECOMMENDATION_ALREADY_PENDING` |
| Self-approval attempted | Inline error on the disabled control | `SELF_APPROVAL_BLOCKED` |
| Evidence changed, unacknowledged | Submit disabled until the checkbox is set; server rejection surfaced if bypassed | `EVIDENCE_CHANGED_UNACKNOWLEDGED` |
| Approval blocked by audit completeness | Prominent error: "Clearance blocked: the audit record would be incomplete ({field})" | `AUDIT_INCOMPLETE` |
| Case cleared | Whole panel replaced by a read-only disposition summary with an audit link | `CASE_TERMINAL` |

**API Surface (this feature):** consumes matrix rows 10, 18, 20–24, 29, 30, 34, 35. Full schemas in `Y1b-api-actions.md` §Workflow actions and §Approvals, `Y1c-api-admin.md` §AI assistance.

**Schema Surface (this feature):** reads `exceptions`, `evidence`, `rules`, `ai_outputs`, `recommendations`, `cases`; writes indirectly via actions and approvals.
