### Screen 2: Shipment Review

**Feature:** F18 · **Walkthrough steps:** 2, 3, 5, 6, 7 · **Route:** `/shipments/:shipmentId/review`
**Purpose:** Establish the whole case on one screen, and let a first-time specialist state *why* this shipment was flagged in under 30 seconds without leaving it.
**User Stories:** US-9.5, US-9.6, US-2.1, US-2.2, US-4.5, US-1.5, US-11.2, US-11.3, US-11.6, US-11.7
**Personas:** PER-01 (primary), PER-02 (secondary), PER-03 (read-only, actions disabled with role reason)

#### Layout — post-revalidation state (evaluation v2)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to queue                                            Steps 2, 3, 5–7 of 10 ⓘ  │
│ SHP-2026-0007  ·  Helios Grid Supply  ·  ▷ In review  ·  ▮▮▮▮ Critical ⓘ  ·  $85,000 USD │
│ Evaluation v2   ·   [ View audit record ]                                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ⟳ Revalidated 6 Sep 14:22 UTC — evaluation v2                                         │
│   1 exception resolved · 2 retained · 0 new              [ Compare v1 → v2 ]          │
├───────────────────────────────────────────────┬────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ │ ⚙ SYSTEM · ENTRY DATA                     │ │ │ ╎✦ AI-GENERATED · ADVISORY        │ │
│ │───────────────────────────────────────────│ │ │ ╎  Plain-language summary          │ │
│ │ Importer          Helios Grid Supply      │ │ │ ╎────────────────────────────────  │ │
│ │ Carrier           Pacific Star Lines      │ │ │ ╎ This shipment is a consignment  │ │
│ │ Product           Photovoltaic solar      │ │ │ ╎ of photovoltaic solar panels    │ │
│ │                   panels, 480 units       │ │ │ ╎ valued at $85,000 imported by   │ │
│ │ HTS code          8541.40                 │ │ │ ╎ Helios Grid Supply. Two issues  │ │
│ │                   ⚠ 6 digits normalized;  │ │ │ ╎ remain open.                    │ │
│ │                   rule expects 10         │ │ │ ╎                                  │ │
│ │ Country of origin MALAYSIA                │ │ │ ╎ The declared country of origin  │ │
│ │ Manufacturer      Sunfield Industrial Ltd │ │ │ ╎ (country_of_origin) is Malaysia, │ │
│ │ Mfr. address      No. 88 Jinhu Road,      │ │ │ ╎ but the manufacturer's address   │ │
│ │                   Suzhou, Jiangsu,        │ │ │ ╎ (manufacturer.address.country)   │ │
│ │                   **CHINA**               │ │ │ ╎ is in China. A certificate of    │ │
│ │ Shipment value    $85,000.00 USD          │ │ │ ╎ origin was received on 6 Sep and │ │
│ │ Entry date        31 Aug 2026             │ │ │ ╎ resolved the missing-document    │ │
│ │ Status            ▷ In review             │ │ │ ╎ issue. The HTS code 8541.40 is   │ │
│ │ Priority          ▮▮▮▮ Critical ⓘ derivation   │ │ │ ╎ shorter than the 10 digits the   │ │
│ └───────────────────────────────────────────┘ │ │ ╎ classification rule expects.     │ │
│                                               │ │ ╎────────────────────────────────  │ │
│ ┌───────────────────────────────────────────┐ │ │ ╎ AI-generated · not a finding     │ │
│ │ ⚙ SYSTEM · DOCUMENTS RECEIVED             │ │ │ ╎ Provider: openai · Model: gpt-4o │ │
│ │───────────────────────────────────────────│ │ │ ╎ Mode: LIVE · 6 Sep 14:22:11 UTC │ │
│ │ Commercial invoice     ✔ Received         │ │ │ ╎ Evidence inputs: 3 exceptions,   │ │
│ │   Seeded · inv-0007.pdf · 31 Aug          │ │ │ ╎ 7 evidence rows, evaluation v2   │ │
│ │───────────────────────────────────────────│ │ │ ╎           [ Regenerate summary ] │ │
│ │ Packing list           ✔ Received         │ │ └────────────────────────────────────┘ │
│ │   Seeded · pkl-0007.pdf · 31 Aug          │ │                                        │
│ │───────────────────────────────────────────│ │ ┌────────────────────────────────────┐ │
│ │ Certificate of origin  ✔ Received         │ │ │ ⚙ SYSTEM · VALIDATION RESULTS      │ │
│ │   ⬆ UPLOADED THIS SESSION                 │ │ │ 2 open · Resolved (1) ▸            │ │
│ │   coo-shp-2026-0007.pdf                   │ │ │────────────────────────────────────│ │
│ │   by Marisol Reyes · 6 Sep 14:22           │ │ │ ⬡ ORIGIN CONFLICT   Sev: CRITICAL  │ │
│ │   Requested by Marisol Reyes 6 Sep 13:58   │ │ │   ⓘ Updated at v2                  │ │
│ │   ⬇ download                              │ │ │ Rule: Declared origin must match   │ │
│ │───────────────────────────────────────────│ │ │       manufacturer address country │ │
│ │ ⓘ Every document is either seeded with    │ │ │ Authority: 19 CFR 134.1            │ │
│ │   the demo data or uploaded against a     │ │ │ [ View triggering rule ]           │ │
│ │   request. No importer correspondence     │ │ │ Assertion: Declared country of     │ │
│ │   path exists.                            │ │ │  origin conflicts with the         │ │
│ └───────────────────────────────────────────┘ │ │  manufacturer's address country.   │ │
│                                               │ │ EVIDENCE                            │ │
│                                               │ │  country_of_origin                 │ │
│                                               │ │    raw "Malaysia" → norm "MY"      │ │
│                                               │ │  manufacturer.address.country      │ │
│                                               │ │    raw "China" → norm "CN"         │ │
│                                               │ │  documents.CERTIFICATE_OF_ORIGIN   │ │
│                                               │ │    .stated_country                 │ │
│                                               │ │    raw "China" → norm "CN"   ⓘ new │ │
│                                               │ │  compare: MY ≠ CN                  │ │
│                                               │ │ MISSING INFORMATION: none          │ │
│                                               │ │────────────────────────────────────│ │
│                                               │ │ ⬡ INCOMPLETE HTS    Sev: HIGH      │ │
│                                               │ │ Rule: HTS code completeness        │ │
│                                               │ │ Authority: 19 CFR 152.11           │ │
│                                               │ │ [ View triggering rule ]           │ │
│                                               │ │ Assertion: HTS code has 6 digits;  │ │
│                                               │ │  10 are expected.                  │ │
│                                               │ │ EVIDENCE                            │ │
│                                               │ │  hts_code raw "8541.40"            │ │
│                                               │ │    → norm "854140" (6 digits)      │ │
│                                               │ │  rule.expected_digit_count = 10    │ │
│                                               │ │ MISSING INFORMATION:                │ │
│                                               │ │  full 10-digit classification      │ │
│                                               │ └────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ACTIONS   [ Request additional information ]  [ Revalidate ]                           │
│                                       [ Go to Recommended Resolution → ]  (primary)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### The "Resolved (1)" disclosure, expanded

```
│ ⚙ SYSTEM · VALIDATION RESULTS      2 open · Resolved (1) ▾                            │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ⬡ MISSING DOCUMENT   Sev: HIGH        ✔ RESOLVED BY REVALIDATION at v2             │ │
│ │ Rule: Certificate of origin required above $50,000                                 │ │
│ │ Authority: 19 CFR 141.83                                                           │ │
│ │ Opened 31 Aug 09:04 UTC · Resolved 6 Sep 14:22 UTC                                 │ │
│ │ EVIDENCE AT OPENING                                                                │ │
│ │   documents.CERTIFICATE_OF_ORIGIN = absent                                         │ │
│ │   shipment_value_usd = 85000 (threshold 50000)                                     │ │
│ │ Resolved because: documents.CERTIFICATE_OF_ORIGIN received 6 Sep 14:22 UTC          │ │
│ │ ⓘ Resolved, not deleted. This exception and its evidence remain on the record.      │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
```

Resolved exceptions are **marked and moved, never deleted** — the disclosure keeps history present without making the working set noisy (FRD F18 §Process step 4; US-1.6).

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Pinned shipment header: ID, importer, status, priority, value | Sticky above the panels | Context must survive scrolling; the header never leaves |
| Primary | Validation results panel — exception + rule + authority + evidence in **one card** | Right column, above the fold | This is what makes the 30-second comprehension target achievable without leaving the screen (FRD F18 §Validation) |
| Primary | Change-indication banner after a revalidation | Full width, directly beneath the header | *"One down. Two to go — and I want to see the two, not a green tick"* |
| Primary | Documents panel with **missing rendered as an explicit absence** | Left column | A missing document must be visible as an absence, not inferable from a gap |
| Secondary | AI summary panel | Right column, above validation results | Read first, verified against the panel below it |
| Secondary | Entry data panel — all eight PRD-mandated attributes plus entry date | Left column | Establishes identity; historically six fields on four systems |
| Secondary | Document provenance (`Seeded` / `Ingested` / `Uploaded this session`) + uploader + request linkage | Per document row | US-4.5; Angela asks where every document came from |
| Tertiary | Resolved-exception disclosure | Collapsed by default | History present, not noisy |
| Tertiary | Priority derivation basis | Info disclosure on the priority indicator | Explains the ranking without occupying the header |
| Tertiary | Evaluation version + compare link | Header sub-line | Lets a supervisor see what moved |

#### Why the AI panel sits *above* the validation panel

Marisol reads the narrative, then verifies it. Reading order is summary → findings. But the **loading order is inverted**: the five non-AI calls resolve first and render the verifiable facts; the AI panel occupies a reserved skeleton until it arrives (FRD F18 §Process step 1). Walkthrough step 2 completes without the AI. A slow provider therefore delays step 3 by a few seconds and never delays step 2, and the evidence is never gated behind the narrative.

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading (evidence) | Four panel skeletons at final dimensions; header renders as soon as the shipment call resolves | `aria-busy` per panel |
| Loading (AI only) | AI panel skeleton **inside the AI band with the label already visible** — so a half-loaded screen still can't present machine text as a finding | *"Generating summary…"* |
| Ready | As wireframed | — |
| AI in offline fallback | AI panel renders normally with an added `OFFLINE FALLBACK` sub-chip and the provenance line reading `Mode: FALLBACK_DETERMINISTIC`; shell banner active | Banner copy from Screen 0 |
| Never evaluated | Validation panel: *"Not yet evaluated"* + **Revalidate** control | — |
| Empty documents | Documents panel lists required-but-absent types; never an empty box | *"No documents have been received for this shipment."* |
| No open exceptions | Validation panel: *"No open exceptions"*; Resolved disclosure holds the history | — |
| Post-revalidation | Change banner + resolved/retained/new markers + `aria-live` announcement | *"Revalidated: 1 exception resolved, 2 retained, 0 new."* |
| Upload in flight | Inline progress on the request row; action controls disabled with *"Upload in progress"* | — |
| Upload rejected | Dialog stays open with the specific reason; **no panel state changes** | see Flow 3 |
| Action rejected by state machine | Inline dialog error naming the reason; the case refetches | *"Cannot request information on a case in status Cleared."* |
| Action rejected by role (ADM) | Every action control disabled with the visible reason | *"System Administrators do not adjudicate shipments."* |
| Case cleared | All action controls disabled; read-only chip in the header | *"This shipment has been cleared and can no longer be changed."* |
| Case changed concurrently | Toast + automatic refetch; the action is **not** retried silently | *"This case changed; reloading."* |
| Shipment not found | Inline 404 + **Back to queue** | — |

#### Interactive Elements

| Element | Type | Behaviour |
|---|---|---|
| **Request additional information** | Secondary button → in-frame dialog | Checkbox list from open exceptions' `missing_information`; "other type" gated by `justify_unlisted_document` (≥20 char justification); mandatory `JustificationInput` (min 10). Submit disabled until valid. Posts `REQUEST_INFORMATION` |
| **Upload simulated document** | Contextual button, **only on an `OUTSTANDING` request row** | Fixture radio list + file picker; document type is **read-only text taken from the request**. Posts to `/api/document-requests/{id}/upload` |
| **Revalidate** | Secondary button | Posts `/api/shipments/{id}/revalidate`; produces the identical change indication. Available whenever the case is not `CLEARED` |
| **Regenerate summary** | Tertiary button inside the AI band | Re-requests the summary. CS and SUP only. Causes no state transition |
| **View triggering rule** | Link per exception card → in-frame drawer | Read-only rule detail: name, description, policy reference, severity, parameters, version. Available to all roles — a specialist must be able to see the rule that flagged her shipment |
| **Compare v1 → v2** | Link → in-frame drawer | Evaluation diff: exceptions added / resolved / retained, with the evidence delta highlighted |
| **View audit record** | Header link | → `/shipments/{id}/audit` |
| **Go to Recommended Resolution** | Primary button | → `/shipments/{id}/resolution`, case context preserved. The single forward affordance, so the walkthrough's next step is never ambiguous |
| **Back to queue** | Breadcrumb link | → `/queue`; clears case context |
| Document **download** | Link per received document | Serves the synthetic fixture |

#### Governance expression on this screen

- **The AI panel can never be mistaken for a finding.** It lives in the AI band, it is introduced by the chip `AI-GENERATED · ADVISORY`, it is closed by the words *"AI-generated · not a finding"* plus full provenance, and it is never rendered in the same container as human-authored or system text (FRD F18 §Validation).
- **The findings render without the narrative.** The validation panel is populated from the exception API and stays fully usable when the AI panel is absent, loading, or in fallback. This is the mitigation for PRD §8's hallucination risk and the reason Marisol keeps reading the summary at all (JRN-01.1 Risk of Abandonment, stage 3).
- **Provenance on every document.** `SEEDED` / `INGESTED` / `SIMULATED_UPLOAD` with the uploader named, plus the standing note that no importer correspondence path exists (US-4.5, US-12.7).
- **Every action is enabled or disabled-with-a-visible-reason.** There is no hidden-without-explanation state on this screen.
- **Revalidation is reconciliation.** Resolved counts and retained counts are always both stated. There is no success state on this screen that reads as "clean".

---
