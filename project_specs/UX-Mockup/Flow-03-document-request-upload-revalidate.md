### Flow 3: Document Request → Simulated Upload → Revalidation

**Trigger:** An open missing-document exception names `CERTIFICATE_OF_ORIGIN` in its missing information.
**User Stories:** US-3.2, US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-1.6, US-9.6, US-11.5, US-11.6, US-11.7
**Journeys:** JRN-01.1 steps 5–7, JRN-01.3 (unhappy path) · **Persona:** PER-01

This is the flow that decides whether Marisol ever trusts a revalidation result again. Two failure modes must be visibly impossible: a permissive upload that lets any file close any requirement, and a "paperwork complete = problem solved" reading.

```
       ┌─────────────────────────────────────────────────┐
       │ REQUEST  (Resolution screen, in-frame dialog)   │
       │ Document types are CHECKBOXES sourced from open │
       │ exceptions' missing_information — not free text │
       │  [✓] Certificate of origin                      │
       │  [ ] Other type ▸ requires justify_unlisted_    │
       │      document + justification ≥ 20 chars        │
       │  Justification (required, min 10) ──────────────│
       │  [ Cancel ]                    [ Submit request]│
       └────────────────┬────────────────────────────────┘
                        │
        ┌───────────────┼──────────────────────────┐
        ▼               ▼                          ▼
  justification    duplicate OUTSTANDING     type not in any
  too short        request for same type     missing_information
  submit stays     409 DUPLICATE_DOCUMENT_   422 DOCUMENT_TYPE_
  DISABLED,        REQUEST — dialog error    NOT_REQUIRED
  inline error     names the existing        with the accepted list
                   request
        │
        ▼  valid submit
  dr-0007-coo = OUTSTANDING · requester + timestamp recorded
  NEW → AWAITING_INFORMATION · audit entry + notification written
  confirmation: "Request recorded against this case."
  forward affordance: [ Back to Shipment Review ]
                        │
                        ▼
       ┌─────────────────────────────────────────────────┐
       │ UPLOAD  (Review screen, documents panel row)    │
       │ The "Upload simulated document" control exists  │
       │ ONLY on an OUTSTANDING request row. There is no │
       │ free-floating "attach a document" affordance.   │
       │                                                 │
       │ Document type: Certificate of origin            │
       │   ← taken from the REQUEST, never from the file │
       │   ← rendered as read-only text, not a selector  │
       │                                                 │
       │ ○ Seeded fixture: coo-shp-2026-0007.pdf         │
       │ ○ Choose a file…                                │
       │ [ Cancel ]                        [ Upload ]    │
       └────────────────┬────────────────────────────────┘
                        │
    ┌───────────────────┼──────────────────┬──────────────────┐
    ▼                   ▼                  ▼                  ▼
 UNSUPPORTED_        PAYLOAD_          FILE_CONTENT_      PII_SUSPECTED
 MEDIA_TYPE          TOO_LARGE         MISMATCH           inline error:
 "…accepted types:   size limit        "File content does  "This file appears
  PDF, PNG, JPEG"    named             not match its       to contain personal
                                       declared type"      data. Synthetic
                                                           fixtures only."
    └───────────────────┴──────────────────┴──────────────────┘
                        │
              ALL REJECTIONS ARE NON-DESTRUCTIVE:
              no document row, no revalidation, request stays
              OUTSTANDING, case stays AWAITING_INFORMATION.
              The dialog stays open with the reason inline —
              never a generic "upload failed" toast.
                        │
                        ▼  accepted
  document attached · provenance = SIMULATED_UPLOAD · uploader named
  request → FULFILLED · DOCUMENT_UPLOADED audit entry + notification
                        │
                        │  same transaction (US-4.4)
                        ▼
       ┌─────────────────────────────────────────────────┐
       │ REVALIDATION at evaluation v2                    │
       │ Change-indication banner, ABOVE the panels:      │
       │                                                  │
       │  ⟳ Revalidated at 14:22 UTC — evaluation v2      │
       │    1 exception resolved · 2 retained · 0 new     │
       │    [ Compare v1 → v2 ]                           │
       │                                                  │
       │ Missing-document card → RESOLVED_BY_REVALIDATION │
       │   moves into "Resolved (1)" disclosure carrying  │
       │   a "Resolved by revalidation" marker            │
       │ Origin-conflict card → RETAINED, evidence intact │
       │ Incomplete-HTS card → RETAINED, evidence intact  │
       │ AWAITING_INFORMATION → IN_REVIEW                 │
       │ AI summary + recommendation regenerate at v2     │
       └─────────────────────────────────────────────────┘
```

**Steps:**

1. **The request binds to the exception, not to an inbox.** The dialog's document-type list is derived from open exceptions' `missing_information`, so the request is traceable to the rule that requires it. Anyone opening the case later sees what was asked and why (JRN-01.1 step 5 Opportunity).
2. **The document type comes from the request.** On the upload dialog the type is read-only text, not a dropdown. A certificate requirement cannot be closed by a file labelled as something else — *"an upload flow that let any file satisfy any requirement would make the whole exercise theatre"* (JRN-01.1 step 6).
3. **Rejections name their reason and leave nothing behind.** All four rejection classes render inline in the open dialog with the specific reason and, where applicable, the accepted types. A refusal that names its reason and leaves no partial state is worth more to Marisol's confidence than a dozen happy-path steps (JRN-01.3 Key Moments; US-4.3).
4. **The revalidation result is a reconciliation, never a tick.** The banner counts resolved / retained / new. Resolved exceptions are *moved and marked*, never deleted. Retained exceptions keep their evidence in place. A silent refresh is a defect — visible reconciliation is the entire purpose of step 7 (FRD F18 §Validation; US-9.6).
5. **A document can make things worse, and the UI must permit that reading.** In JRN-01.3 the accepted certificate asserts China as the stated country: the missing-document exception resolves while the origin exception's evidence set *grows* to include `documents.CERTIFICATE_OF_ORIGIN.stated_country = "China"`. The retained origin card renders an **"Updated"** marker and the new evidence row appears alongside the original. Nothing anywhere says the shipment is now clean.

**Manual revalidate control.** A distinct **Revalidate** button in the Review action bar produces the identical change indication. Available whenever the case is not `CLEARED`; disabled with *"This shipment has been cleared and can no longer be changed"* when it is. This exists so Angela can ask for step 7 out of sequence and get it (US-11.11).

**State design for this flow:**

| State | Documents panel | Validation panel | Action bar |
|---|---|---|---|
| No request yet | `CERTIFICATE_OF_ORIGIN` row: state **Missing**, provenance —, no upload control | 3 open exception cards | Request additional information enabled |
| Request outstanding | Row: state **Requested**, requester + request time, **Upload simulated document** control | unchanged | Request additional information enabled (second type); duplicate blocked |
| Upload in flight | Row shows inline progress with the eventual layout reserved | unchanged (not optimistically cleared) | Controls disabled with *"Upload in progress"* |
| Upload rejected | Row unchanged, still **Requested** | unchanged | Dialog remains open with the reason |
| Upload accepted | Row: state **Received**, provenance **Uploaded this session**, uploader named, filename with download link | change banner + reconciled cards | Revalidate + Go to Resolution |

---

### Flow 4: Escalation — Authority Actually Leaves Her Hands

**Trigger:** After revalidation two exceptions still fire and the certificate contradicts the entry. Recommending clearance would be indefensible.
**User Stories:** US-3.5, US-3.7, US-3.6, US-12.6, US-2.5
**Journey:** JRN-01.3 stages 6–7 · **Persona:** PER-01 → PER-02

```
   /shipments/SHP-2026-0007/resolution  (IN_REVIEW, v2)
                    │
                    ▼
   AI recommendation block: "AI suggests: Escalate to supervisor"
   Model confidence: Medium · basis stated
   ── rendered as a STATEMENT, inside the AI band.
   ── NOT pre-selected. NOT highlighted as the default.
   ── The five action cards are all unselected on arrival.
                    │
   Marisol diverges from the machine. The screen treats this as
   normal: the governance notice says so, and no styling marks
   her choice as a deviation.
                    │
                    ▼
   select "Escalate to supervisor"
   ├── escalation_reason (required)
   ├── optional target supervisor
   ├── justification (required, min 10)
                    ▼
   submit ──▶ IN_REVIEW → ESCALATED
             audit entry + Supervisor-addressed notification
             confirmation states the CONCURRENCE VERDICT:
             "Your decision diverged from the AI recommendation.
              This is recorded."          (US-2.5)
                    │
                    ▼
   She reloads the same screen. Now:
   ┌────────────────────────────────────────────────────────────┐
   │ ⚑ This case has been escalated. Authority has transferred. │
   │                                                            │
   │ Request additional information   [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Send for specialist review       [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Recommend clearance              [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Place on hold                    [ UNAVAILABLE 🔒 ]        │
   │   This case has been escalated; only a Supervisor can      │
   │   act on it.                                               │
   │ Escalate to supervisor           [ UNAVAILABLE 🔒 ]        │
   │   The case is already in this state.                       │
   └────────────────────────────────────────────────────────────┘
   All five still rendered. All five explained. None hidden.
   If she calls the endpoint anyway: 403 ESCALATED_REQUIRES_
   SUPERVISOR and the denial is written to the audit trail (I10).
```

**Why this flow is a UX requirement and not just a server rule.** *"Discovering that escalation actually removes her ability to act tells her that the role boundaries elsewhere are probably real too"* (JRN-01.3 Delight Opportunity). The design consequence: after an escalation the five action cards must **re-render in place, still five, now closed, each with its reason** — not disappear, and not be replaced by a single "no actions available" message. The learning happens because the shape of her authority is drawn and then visibly redrawn.

---
