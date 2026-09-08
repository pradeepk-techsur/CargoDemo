### Screen 4: Decision & Audit Record

**Feature:** F20 · **Walkthrough step:** 10 · **Route:** `/shipments/:shipmentId/audit`
**Purpose:** Replay the complete, attributed, timestamped history of a case so a decision can be defended months later — from the record, without adding a word to it.
**User Stories:** US-9.9, US-6.1, US-6.3, US-6.4, US-6.5, US-6.6, US-7.2, US-2.2, US-12.4, US-11.10
**Personas:** PER-02 (primary), PER-04 (primary), PER-01 (secondary)

#### Layout — cleared case, full timeline

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to Shipment Review                                        Step 10 of 10 ⓘ    │
│ Decision & Audit Record                              READ-ONLY · APPEND-ONLY          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SHP-2026-0007 · Helios Grid Supply · ⬤🔒 Cleared · ▮▮▮▮ Critical                      │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DISPOSITION                                                                        │ │
│ │ Cleared 6 Sep 2026 14:41:52 UTC                                                    │ │
│ │ Approving official   Dwayne Okafor (Supervisor)                                    │ │
│ │ On the recommendation of   Marisol Reyes (Cargo Specialist), 6 Sep 14:31:07 UTC    │ │
│ │ Resolution basis   MIXED · 2 exceptions closed as CLEARED_BY_DECISION              │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ COMPLETENESS                                                                       │ │
│ │ 12 events recorded. 5 decisions, all 5 complete against the 8 required fields.     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ INTEGRITY            Audit chain verified: 12 of 12 entries intact.   [ Re-verify ]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SHOW  ● All events  ○ Decisions only  ○ AI outputs  ○ System events  ○ Access denials │
│       ⓘ Filtering changes what is displayed. The record itself is always complete.    │
│                                            [ Export JSON ]   [ Print / Save ]         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  #1  ⚙ SYSTEM · CARGO ENTRY INGESTED                          31 Aug 2026 09:04:11   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            System (ingestion, cargo-entry JSON)                            │ │
│  │ Status change    — → ⬡ New                                                       │ │
│  │ Exception        Not applicable                                                  │ │
│  │ Evidence         cargo-entries-v1.json, record 7 of 14                           │ │
│  │ AI recommendation  No AI recommendation had been generated at this point.        │ │
│  │ User decision    Not applicable — no human action                                │ │
│  │ Justification    Not applicable                                                  │ │
│  │ Approving official  Not applicable                                               │ │
│  │ Notification     ⓘ Generated, not transmitted                                    │ │
│  │                  To: Cargo Specialist · "New cargo entry received"               │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #2  ⚙ SYSTEM · SHIPMENT FLAGGED — 3 EXCEPTIONS                31 Aug 2026 09:04:12   │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            System (rule evaluation, evaluation v1)                         │ │
│  │ Exception        ⬡ Origin conflict CRITICAL · rule-origin-manufacturer v2        │ │
│  │                  ⬡ Incomplete HTS MEDIUM · rule-hts-completeness v3              │ │
│  │                  ⬡ Missing document HIGH · rule-doc-highvalue-coo v1             │ │
│  │ Evidence reviewed                                                                │ │
│  │   country_of_origin "Malaysia" → MY                                              │ │
│  │   manufacturer.address.country "China" → CN                                      │ │
│  │   hts_code "8541.40" → 854140 (6 digits; 10 expected)                            │ │
│  │   ▸ Show all evidence (7 rows)                                                   │ │
│  │ AI recommendation  No AI recommendation had been generated at this point.        │ │
│  │ User decision / Justification / Approving official   Not applicable              │ │
│  │ Notification     ⓘ Generated, not transmitted · To: Cargo Specialist             │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #3  ╎✦ AI-GENERATED · PLAIN-LANGUAGE SUMMARY (v1)             31 Aug 2026 09:04:15   │
│  ╎┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  ╎│ Author         AI assistance — not a human, not a finding                       │ │
│  ╎│ Provenance     openai · gpt-4o · mode LIVE · 31 Aug 09:04:15 UTC                │ │
│  ╎│ Evidence inputs  3 exceptions, 7 evidence rows, evaluation v1                    │ │
│  ╎│ Content        "This shipment of photovoltaic solar panels valued at $85,000…"  │ │
│  ╎│ User decision  Not applicable — AI output takes no action                        │ │
│  ╎│ Justification  Not applicable                                                    │ │
│  ╎│ Approving official  Not applicable                                               │ │
│  ╎│ Notification   None generated for AI output                                      │ │
│  ╎└─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #5  👤 HUMAN DECISION · REQUEST ADDITIONAL INFORMATION          6 Sep 2026 13:58:02  │
│  ┃┌──────────────────────────────────────────────────────────────────────────────────┐│
│  ┃│ Actor            Marisol Reyes (Cargo Specialist)                                ││
│  ┃│ Status change    ⬡ New → ⧗ Awaiting information                                  ││
│  ┃│ Exception        ⬡ Missing document HIGH · rule-doc-highvalue-coo v1             ││
│  ┃│ Evidence reviewed  documents.CERTIFICATE_OF_ORIGIN = absent                      ││
│  ┃│                    shipment_value_usd = 85000 (threshold 50000)                  ││
│  ┃│ AI recommendation  ╎✦ AI suggested: Escalate to supervisor                       ││
│  ┃│                    ╎ confidence MEDIUM · basis: an open exception at CRITICAL    ││
│  ┃│                    ╎ severity is present                                         ││
│  ┃│                    ╎ openai · gpt-4o · LIVE · 31 Aug 09:04:17 UTC                ││
│  ┃│                    ╎ CONCURRENCE: the decision DIVERGED from the AI advice        ││
│  ┃│ User decision    REQUEST_INFORMATION · document type CERTIFICATE_OF_ORIGIN       ││
│  ┃│ Justification    "Required certificate of origin is absent and the shipment      ││
│  ┃│                   value is above the documentary threshold. Requesting the        ││
│  ┃│                   certificate before assessing the origin conflict."             ││
│  ┃│                   (verbatim, in full)                                             ││
│  ┃│ Timestamp        6 Sep 2026 13:58:02 UTC                                          ││
│  ┃│ Approving official  Not applicable                                                ││
│  ┃│ Notification     ⓘ Generated, not transmitted                                     ││
│  ┃│                  To: Cargo Specialist · "Document requested: certificate of      ││
│  ┃│                  origin" · body: "A certificate of origin has been requested…"   ││
│  ┃└──────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                        │
│  #7  ⚙ SYSTEM · REVALIDATED — EVALUATION v2                      6 Sep 2026 14:22:09  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            System (revalidation, trigger DOCUMENT_UPLOAD)                  │ │
│  │ Status change    ⧗ Awaiting information → ▷ In review                            │ │
│  │ Before → after   3 open → 2 open                                                 │ │
│  │   RESOLVED_BY_REVALIDATION  ⬡ Missing document                                   │ │
│  │   RETAINED                  ⬡ Origin conflict (evidence set grew by 1 row)       │ │
│  │   RETAINED                  ⬡ Incomplete HTS                                     │ │
│  │   NEW                       none                                                 │ │
│  │ ⓘ Resolved, not deleted. The exception and its evidence remain on this record.   │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│  #10 👤 HUMAN DECISION · CLEARANCE RECOMMENDED                    6 Sep 2026 14:31:07 │
│  ┃  ... all eight fields ... resolution_basis MIXED ... 2 exceptions enumerated ...   │
│  ┃  Approving official  Not applicable — recommendation awaiting supervisor decision  │
│                                                                                        │
│  #11 👤 HUMAN DECISION · CLEARANCE APPROVED                       6 Sep 2026 14:41:52 │
│  ┃┌──────────────────────────────────────────────────────────────────────────────────┐│
│  ┃│ Actor            Dwayne Okafor (Supervisor)                                      ││
│  ┃│ Status change    ◫ Pending approval → ⬤🔒 Cleared                                ││
│  ┃│ Exception        ⬡ Origin conflict CRITICAL → CLEARED_BY_DECISION                ││
│  ┃│                  ⬡ Incomplete HTS HIGH → CLEARED_BY_DECISION                     ││
│  ┃│ Evidence reviewed  evaluation v3 snapshot · ▸ Show all evidence (5 rows)         ││
│  ┃│ AI recommendation  ╎✦ AI suggested: no new action while approval is outstanding   ││
│  ┃│                    ╎ CONCURRENCE: NOT_APPLICABLE — the AI never advises approval  ││
│  ┃│ User decision    APPROVE_CLEARANCE                                                ││
│  ┃│ Justification    "Reviewed the retained origin conflict against the certificate.  ││
│  ┃│                   The specialist's reading is supported by the commercial         ││
│  ┃│                   documents and the incomplete HTS does not affect admissibility  ││
│  ┃│                   for this commodity. Approving on that basis."                   ││
│  ┃│ Timestamp        6 Sep 2026 14:41:52 UTC                                          ││
│  ┃│ APPROVING OFFICIAL  Approved by Dwayne Okafor (Supervisor)          ← prominent   ││
│  ┃│ Notification     ⓘ Generated, not transmitted                                     ││
│  ┃│                  To: Cargo Specialist · "Clearance approved — SHP-2026-0007"     ││
│  ┃└──────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                        │
│  End of record. 12 of 12 entries shown.                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### An access-denial entry (the entry that proves the control)

```
│  #6  ⛔ ACCESS DENIED · APPROVE_CLEARANCE                        6 Sep 2026 14:33:41  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Actor            Marisol Reyes (Cargo Specialist)                                │ │
│  │ Attempted action APPROVE_CLEARANCE                                               │ │
│  │ Case status at attempt   ◫ Pending approval                                      │ │
│  │ Outcome          REFUSED · SELF_APPROVAL_BLOCKED                                 │ │
│  │ Reason           "You cannot approve your own recommendation."                   │ │
│  │ Status change    None — the case did not leave Pending approval                  │ │
│  │ ⓘ The attempt was refused and recorded. A rejected action is governance-relevant │ │
│  │   information, not a silent no-op.                                               │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
```

*"It's in the log. The attempt was refused* and *recorded — that's the part that matters"* (JRN-02.1 stage 6). This entry class has its own filter option so an evaluator can ask for it directly.

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|---|---|---|---|
| Primary | Disposition block: approving official, clearance timestamp, recommender | Case header | The one-glance answer to *"who cleared this and on whose recommendation"* |
| Primary | Completeness block: `n events, m decisions, all m complete against the 8 required fields` | Header, second block | The claim is **shown on camera**, not narrated (FRD F20 §Terminology) |
| Primary | Authorship band per entry — text label + icon + container treatment | Every entry | Removes a category of professional risk PER-01 has lived with |
| Primary | The eight fields on every decision entry | Entry body, fixed order | An absent field is the failure mode the whole feature exists to prevent |
| Primary | `READ-ONLY · APPEND-ONLY` chip | Toolbar | States the property in words (P6) |
| Secondary | Chain-verification result | Header, third block | On-demand integrity check |
| Secondary | Justification, **verbatim and in full** | Human-band entries | Never truncated, summarised, or paraphrased |
| Secondary | Generated notification, in a distinct sub-block beside its decision | Every entry that produced one | Notifications live with the decision that caused them |
| Secondary | Entry-class filter | Toolbar | Focused replay for a live demo; presentational only |
| Tertiary | Evidence beyond three rows | Behind **Show all evidence** disclosure — collapsed, **never omitted** | Density without loss |
| Tertiary | Export / Print | Toolbar, right | One action produces the whole record |
| Tertiary | Sequence numbers | Entry header | Ordering is stated, not implied |

#### States

| State | Appearance | User feedback |
|---|---|---|
| Loading | Timeline skeleton: header blocks + 6 entry cards at final height | `aria-busy` on the list |
| Ready | Timeline as wireframed, ascending `sequence_no`, identical on every load | *"12 of 12 entries shown."* |
| Empty history | Panel, no timeline | *"No events recorded for this case yet."* |
| Filtered to a class | Only matching entries; footer states the reduction | *"Showing 5 of 12 entries (decisions only). The record itself is complete."* |
| Fetch failed | Error panel + **Retry** + `request_id`; header blocks hidden | *"The audit record could not be loaded. Reference: req_11a4."* |
| Chain verification failed | **Prominent red banner** naming the first invalid sequence number; **the timeline still renders** | *"Audit chain verification failed at entry #7. The record is displayed unmodified."* |
| Decision entry missing a required field | Prominent failure in the completeness block naming the entry and the field (should be unreachable — the write-time gate prevents it) | *"Entry #10 is missing: approving_official."* |
| Verification in flight | Integrity block shows inline progress | *"Verifying chain…"* |
| Export in flight | Button shows inline progress | *"Preparing export…"* |
| Export failed | Toast + **Retry**; the timeline is unaffected | *"Export failed. The record is unchanged."* |
| Case not found | Inline 404 + **Back to queue** | — |
| Cross-case audit denied (CS) | Not offered in the UI; direct route renders the inline 403 | *"This case is outside your assigned scope."* |
| Not-yet-cleared case | Disposition block reads the current status instead of a clearance | *"Not cleared. Current status: Pending approval, awaiting supervisor decision."* |

#### Interactive Elements — the complete list

| Element | Type | Behaviour |
|---|---|---|
| Entry-class filter | Radio group | `all` / `decisions only` / `AI outputs` / `system events` / `access denials`. Presentational; re-issues the read with `entry_class` |
| **Show all evidence** | Disclosure per entry | Expands evidence rows beyond the first three. Collapsed, never omitted |
| **Re-verify** | Secondary button | Re-issues `GET /api/cases/{id}/audit/verify` |
| **Export JSON** | Secondary button | Blob download `audit-SHP-2026-0007.json`; every field of every entry plus the hash chain |
| **Print / Save** | Secondary button | Navigates in-frame to `/shipments/:id/audit/print`, a full-bleed print-styled route, then calls `window.print()`. **No `window.open`, no popup, no new tab, no PDF toolchain.** A **Back to record** link returns |
| **Back to Shipment Review** | Breadcrumb link | → `/shipments/:id/review` |
| Pagination | Prev / Next | `page_size` 100; the seeded canonical case fits on one page |

That is the entire control inventory. There is no other interactive element on this screen.

#### Printable view (`/shipments/:shipmentId/audit/print`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [ ‹ Back to record ]                              [ Print / Save PDF ]│  ← screen only
├════════════════════════════════════════════════════════════════════════┤
│ CargoDemo — Decision & Audit Record                                    │
│ DEMO ARTEFACT · SYNTHETIC DATA · SIMULATED LOGIN · NOTIFICATIONS NOT   │
│ TRANSMITTED                                                            │
│                                                                        │
│ Case SHP-2026-0007 · Helios Grid Supply · Cleared 6 Sep 2026 14:41 UTC │
│ Approving official: Dwayne Okafor (Supervisor)                         │
│ 12 events · 5 decisions · all 5 complete against the 8 required fields │
│ Audit chain verified: 12 of 12 entries intact                          │
│ Exported 8 Sep 2026 by Dwayne Okafor (Supervisor)                      │
│                                                                        │
│ [ linear, un-collapsed rendering of all 12 entries with all eight      │
│   fields, all evidence rows expanded, all justifications in full,      │
│   authorship stated as words — "AI-GENERATED", "HUMAN DECISION",       │
│   "SYSTEM" — because a printed page has no colour guarantee ]          │
└────────────────────────────────────────────────────────────────────────┘
```

Print rules: `@media print` hides the shell, the toolbar, and the Back link; all disclosures render expanded; authorship is carried by **words and rules-lines, never by background tint**, because a monochrome print must preserve the AI/human distinction. The demo-artefact banner prints on every page so an exported record can never be mistaken for a production record.

#### Governance expression on this screen

- **Zero verbs.** No edit, no delete, no inline editing, no context menu, no hover-revealed action tray, no multi-select, no drag handle. The read-only property is achieved by construction and stated in words (US-12.4, P6).
- **Eight fields, always, with explicit "Not applicable".** The reader never has to infer whether a field was empty or simply not shown (US-6.1).
- **AI content is banded and captioned even inside a human entry.** Field 3 of a human decision entry is the AI recommendation; it renders in a nested AI band with its own provenance and the concurrence verdict, so a quoted confidence level can never be attributed to the human (US-2.2, JRN-02.2 stage 3).
- **Evidence is the evidence as at decision time**, snapshotted, not re-derived from current state (US-6.6).
- **Notifications sit with their decisions**, labelled *"Generated, not transmitted"* (US-7.2).
- **The whole history, including ingestion and flagging**, not only the human decisions — step 10 requires replaying every step (US-11.10).
- **Denials are entries.** An `ACCESS_DENIED` entry with its own filter class is the difference between a control and evidence of a control (US-12.2, F09a I10).
- **Fallback demonstration target.** `SHP-2026-0009` (the pre-cleared seeded shipment) renders a complete history of at least 8 entries with a named approving official, so step 10 is demonstrable even if the live walkthrough case is not yet cleared (FRD F20 §Validation).

---
