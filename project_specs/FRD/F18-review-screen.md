---

## F18: Shipment Review Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough steps:** 2, 3, 5, 6, 7

**Description:** F18 is the full case detail view. It presents importer, carrier, product description, HTS code, country of origin, manufacturer (name and address), and shipment value; a documents-received panel with per-document state and provenance; a validation-results panel listing every detected exception with its rule and severity; and the AI-generated plain-language summary, clearly labeled with attribution. From this screen the specialist requests additional information, uploads a simulated document, revalidates, and navigates to Recommended Resolution. It shows inline what changed after a revalidation. Four of the ten walkthrough steps happen here.

**Terminology:**
- **Shipment header:** The identity block — shipment ID, importer, status, priority, value — pinned above the panels so the operator never loses context while scrolling.
- **Documents panel:** Required and received documents together, so a missing document is visible as an absence rather than inferable from a gap.
- **Validation results panel:** The exception list rendered independently of the AI summary, so a reviewer can verify the machine narrative against the machine findings (PRD §8 risk mitigation).
- **Change indication:** The post-revalidation banner and per-exception markers showing what resolved, what was retained, and what is new.

**Sub-features:**
- Shipment attribute display (all eight PRD-required fields plus entry date)
- Documents-received panel with state, provenance, and request linkage
- Validation results panel with rule, severity, policy reference, and evidence
- AI summary panel with attribution and AI labeling
- Actions: request information, upload simulated document, revalidate, go to Recommended Resolution
- Post-revalidation change indication
- Evaluation history access

**Process:**
1. On mount the screen calls, in parallel: `GET /api/shipments/{id}`, `GET /api/shipments/{id}/exceptions`, `GET /api/shipments/{id}/documents`, `GET /api/shipments/{id}/document-requests`, `GET /api/cases/{case_id}/available-actions`, and `GET /api/shipments/{id}/ai/summary`. The first five render the verifiable facts; the AI summary renders when it arrives, so a slow provider never delays the evidence. *(Walkthrough step 2 completes when the first five resolve.)*
2. The **shipment panel** renders: importer, carrier, product description, HTS code (raw, with the normalized digit count annotated when an HTS exception exists), country of origin, manufacturer name and full address with the country emphasized, shipment value formatted as USD, entry date, and the case's status and priority with derivation basis.
3. The **documents panel** renders one row per document type known to the case — every type required by any applicable rule plus every document actually present. Each row shows: type (display name), state (`Received` / `Missing` / `Requested`), provenance (`Seeded` / `Ingested` / `Uploaded this session`), filename with a download link, received timestamp, and, for requested items, the requester and request time. Uploaded-this-session documents are visually marked, satisfying PRD F10's provenance requirement.
4. The **validation results panel** renders one card per `OPEN` exception in the deterministic evaluation order (F4 §Process step 3): exception type chip, severity, rule name, rule description, policy reference, the `assertion` sentence, the evidence rows via `EvidenceRow`, and the missing-information list. Resolved exceptions from the current and prior evaluations are available under a "Resolved (n)" disclosure, so history is present but not noisy.
5. The **AI summary panel** renders the F7 output inside `AiContentLabel` with provider, model, generation mode, and timestamp. In fallback mode it additionally shows the offline-fallback label and the shell banner is active. A Regenerate control is available to CS and SUP. *(Walkthrough step 3 completes here.)*
6. **Request additional information** opens a dialog listing the document types named in open exceptions' missing information as checkboxes, plus an "other type" field gated by `justify_unlisted_document`, plus the mandatory `JustificationInput` (min 10 chars). Submitting posts the `REQUEST_INFORMATION` action (F09b §2). *(Walkthrough step 5.)*
7. **Upload simulated document** appears on each outstanding request row. It offers the seeded upload-ready fixtures for this shipment (`GET /api/shipments/{id}/upload-fixtures`) and a file picker. Submitting posts to `POST /api/document-requests/{id}/upload`. *(Walkthrough step 6.)*
8. On upload success the response embeds the `RevalidationResult`. The screen refetches and renders the **change indication**: a banner reading *"Revalidated: {n} exception(s) resolved, {m} retained, {k} new"*, a green "Resolved by revalidation" marker on each resolved exception card as it moves into the Resolved disclosure, and an "Updated" marker on retained exceptions whose missing-information list shrank. *(Walkthrough step 7.)*
9. **Revalidate** is a distinct control that posts `POST /api/shipments/{id}/revalidate` and produces the same change indication. It is available whenever the case is not `CLEARED`.
10. **Go to Recommended Resolution** navigates to F19 with the case context preserved.
11. Every action control that is unavailable renders as `DisabledActionButton` with the reason text from `GET /api/cases/{id}/available-actions` (F09a §5).

**Inputs:**
- Route parameter `shipmentId`
- `GET /api/shipments/{id}` → shipment attributes, case status, priority and basis, current evaluation version, assignment
- `GET /api/shipments/{id}/exceptions` → open and resolved exceptions with rule, severity, evidence, missing information
- `GET /api/shipments/{id}/documents`, `.../document-requests`, `.../upload-fixtures`
- `GET /api/shipments/{id}/ai/summary`
- `GET /api/cases/{id}/available-actions`
- User interactions: request information (document types + justification), upload (file + metadata), revalidate, regenerate summary, navigate

**Outputs:**
- Rendered detail view with four panels and the action bar
- Posted actions: `REQUEST_INFORMATION`, document upload, revalidation, summary regeneration
- Change indication after any revalidation
- Navigation to F19 and F20

**Validation:**
- All eight PRD-mandated attributes MUST be displayed: importer, carrier, product description, HTS code, country of origin, manufacturer name, manufacturer address, shipment value. A build omitting any of them fails acceptance.
- The documents panel MUST show missing documents explicitly, not merely omit them.
- The validation results panel MUST render independently of the AI summary and MUST remain fully usable when the AI summary is absent, loading, or in fallback — the human must be able to verify the finding without the narrative (PRD §8).
- The AI summary MUST be inside `AiContentLabel` with complete provenance; it MUST NOT be rendered in the same container as human-authored text, and it MUST NOT be presented as a finding.
- Every action button MUST be either enabled or disabled-with-a-visible-reason. There is no hidden-without-explanation state, satisfying PRD §6 Usability.
- Justification MUST be captured before any action is submitted; the submit control stays disabled until the minimum length is met.
- Upload MUST be offered only against an `OUTSTANDING` request; there is no free-floating "attach a document" affordance, because every document in the demo has a requested provenance or a seeded one.
- After a revalidation the screen MUST show what changed. A silent refresh is a defect — walkthrough step 7's entire purpose is visible reconciliation.
- Shipment detail MUST load in < 1 s with the seeded dataset (PRD §6), measured on the five non-AI calls.
- The screen MUST be fully keyboard operable, including the upload dialog, and MUST announce post-action results via `aria-live`.
- A first-time specialist MUST be able to identify why the shipment was flagged within 30 seconds without leaving this screen (PRD §6 Usability) — met by the validation results panel sitting above the fold alongside the summary, with the triggering rule and evidence in the same card.

**State transitions caused (via the actions it invokes):**

| Control | Transition |
|---|---|
| Request additional information | → `AWAITING_INFORMATION` (F09a T01/T06/T11/T16/T21) |
| Upload simulated document | No direct transition; the triggered revalidation may move `AWAITING_INFORMATION → IN_REVIEW` (F6) |
| Revalidate | Per F6's status table; never to `CLEARED` or `PENDING_APPROVAL` |
| Regenerate summary | None (F7 is inert) |

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| Shipment not found | 404 view with a link back to the queue | `RESOURCE_NOT_FOUND` |
| Shipment never evaluated | Validation panel shows "Not yet evaluated" with a Revalidate control | `NO_EVALUATION` |
| AI summary slow or failed | Panel shows the fallback summary with the offline label; never blocks the screen | — (F7 always returns) |
| Action rejected by the state machine | Inline dialog error naming the reason; the case refetches | `INVALID_TRANSITION`, `TRANSITION_REDUNDANT` |
| Action rejected by role | Inline error; the control becomes disabled with the reason | `FORBIDDEN_ROLE`, `ESCALATED_REQUIRES_SUPERVISOR` |
| Justification too short | Inline field error; submit stays disabled | `JUSTIFICATION_REQUIRED` |
| Duplicate document request | Dialog error naming the existing outstanding request | `DUPLICATE_DOCUMENT_REQUEST` |
| Upload rejected (type, size, content, PII) | Dialog error with the specific reason and the accepted types | `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`, `FILE_CONTENT_MISMATCH`, `PII_SUSPECTED` |
| Case changed concurrently | Toast plus automatic refetch; the action is not retried silently | `CASE_VERSION_CONFLICT` |
| Case cleared | All action controls disabled with "This shipment has been cleared" | `CASE_TERMINAL` |

**API Surface (this feature):** consumes matrix rows 9–17, 18, 20, 26, 27, 32, 33. Full schemas in `Y1a-api-read.md` §Shipments and `Y1b-api-actions.md`.

**Schema Surface (this feature):** reads `cargo_entries`, `cases`, `documents`, `document_requests`, `evaluations`, `exceptions`, `evidence`, `rules`, `ai_outputs`; writes indirectly via the actions it invokes.
