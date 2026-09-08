---

## F20: Decision & Audit Record Screen

**Priority:** P0 · **Category:** User Interface · **Walkthrough step:** 10

**Description:** F20 is the accountability view and the final walkthrough step: a chronological replay of the complete, attributed history of a case. Every event — ingestion, flagging, AI summary and recommendation, document request, upload, revalidation, recommendation, approval, and the notification each produced — is shown with its exception, evidence reviewed, AI recommendation, human decision, justification, timestamp, acting user and role, and approving official. AI-generated content is visually separated from human-authored decisions. The record can be exported or printed. The screen is read-only by construction: it contains no edit or delete affordance anywhere.

**Terminology:**
- **Timeline entry:** One rendered audit entry with its presentation block from F12 §5.
- **Authorship band:** The visual treatment distinguishing `HUMAN`, `AI`, and `SYSTEM` authored entries. Not color alone — each carries an explicit text label and a distinct icon (PRD §6 Accessibility).
- **Completeness assertion:** The header block reporting that every decision entry carries all eight required fields, so the claim can be shown on camera rather than asserted verbally.
- **Chain verification:** The on-demand hash-chain check (F12 §3.4) surfaced as a control on this screen.

**Sub-features:**
- Chronological timeline of every event
- Per-entry display of the eight audit fields plus actor attribution
- AI vs human visual separation
- Notifications shown alongside the decisions that produced them
- Completeness summary and chain verification
- Export as JSON and printable view
- Read-only construction

**Process:**
1. On mount the screen calls `GET /api/cases/{case_id}/audit?page_size=100` and `GET /api/cases/{case_id}/audit/verify`.
2. The **case header** renders: shipment ID, importer, current status, priority, and — when cleared — the disposition block naming the approving official, the clearance timestamp, and the recommender. This block is the one-glance answer to "who cleared this and on whose recommendation".
3. The **completeness block** renders `{ total_entries, decision_entries, decision_entries_complete, missing_fields }` as a plain statement: *"12 events recorded. 5 decisions, all 5 complete against the 8 required fields."* When `missing_fields` is non-empty it renders as a prominent failure, because an incomplete record is the failure mode the whole feature exists to prevent.
4. The **timeline** renders entries in ascending `sequence_no`, each as a card containing:
   - Header: sequence number, event type as human copy, `occurred_at` (absolute UTC plus relative), the authorship band label, and the actor as *"{name} ({role})"* or *"System"* / *"AI assistance"*.
   - Status change: `{before} → {after}` rendered with `StatusBadge` on each side, omitted when there is no change.
   - **Exception** (field 1): the exception snapshot as chips with type, severity, and rule name.
   - **Evidence reviewed** (field 2): the evidence snapshot via `EvidenceRow`, collapsed by default beyond three rows with a "Show all evidence" disclosure — collapsed, never omitted.
   - **AI recommendation** (field 3): inside `AiContentLabel`, showing the recommended action, confidence and basis, provenance, and the concurrence verdict (*"The decision agreed with / diverged from the AI recommendation"*). When absent, it renders the explicit *"No AI recommendation had been generated at this point"* rather than nothing.
   - **User decision** (field 4) and **justification** (field 5): in the human authorship band, the decision as human copy and the justification verbatim, never truncated.
   - **Timestamp** (field 6): in the card header.
   - **Approving official** (field 7): rendered prominently on approval entries as *"Approved by {name} ({role})"*; on other entries rendered as *"Not applicable"* rather than blank.
   - **Generated notification** (field 8): the notification's recipient, subject, and body in a distinct sub-block with the fixed label *"Generated, not transmitted"*.
5. A **filter bar** offers entry-class filters (all / decisions only / AI outputs / system events / access denials) and a "decisions only" quick toggle for a focused replay. Filtering is presentational; the underlying record is always complete.
6. **Verify chain** renders the verification result as *"Audit chain verified: 12 of 12 entries intact"* or, on failure, names the first invalid sequence number.
7. **Export** offers JSON download (`GET .../audit/export?format=json`) and Printable view (`format=printable`, opened in a new tab and triggering the browser print dialog). No PDF toolchain is used; the printable HTML is the offline artifact.
8. The screen registers no mutating handlers of any kind. There is no edit control, no delete control, no inline editing, and no context menu — read-only by construction rather than by permission check.

**Inputs:**
- Route parameter `shipmentId` (resolved to `case_id`)
- `GET /api/cases/{id}/audit` with `entry_class` filter, `page`, `page_size`
- `GET /api/cases/{id}/audit/verify`
- `GET /api/cases/{id}/audit/export?format=json|printable`
- `GET /api/cases/{id}/notifications` (embedded in the audit projection; fetched separately only for the standalone notification list)

**Outputs:**
- Rendered chronological timeline with all eight fields per decision entry
- Completeness summary and chain-verification result
- JSON export file `audit-{shipment_id}.json`
- Printable HTML view

**Validation:**
- Every one of the eight fields MUST be rendered for every decision entry. A field that is not applicable MUST render an explicit "Not applicable" — the reader must never have to infer whether a field was empty or simply not shown.
- AI-authored content MUST be visually separated from human-authored decisions, with a text label in addition to any styling.
- Generated notifications MUST be shown alongside the decisions that produced them, with the "generated, not transmitted" label.
- The screen MUST contain zero mutating affordances. An F21 test asserts that no `POST`/`PATCH`/`PUT`/`DELETE` request originates from this route during a full render and interaction pass.
- The timeline MUST cover the whole case history including ingestion and flagging, not only human decisions. Walkthrough step 10 requires replaying every step.
- Entries MUST be ordered by `sequence_no` ascending, and the ordering MUST be identical on every load.
- Justifications MUST be rendered verbatim and in full — never truncated, summarized, or paraphrased.
- The export MUST contain every field of every entry plus the hash chain (F12 §Validation).
- The screen MUST be keyboard navigable with semantic headings per entry, and the timeline MUST use a semantic list structure rather than presentational `div`s.
- For the pre-cleared seeded shipment `SHP-2026-0009`, this screen MUST render a complete history of at least 8 entries with a named approving official — the fallback demonstration target if the live walkthrough case is not yet cleared.

**State transitions caused:** None. F20 is read-only by construction.

**Error States:**

| Scenario | UI behavior | Error code |
|---|---|---|
| Case not found | 404 view with a link back to the queue | `RESOURCE_NOT_FOUND` |
| Audit fetch failed | Error panel with Retry and `request_id` | `INTERNAL_ERROR` |
| Chain verification failed | Prominent red banner naming the first invalid sequence number; the timeline still renders | `AUDIT_CHAIN_INVALID` |
| A decision entry is missing a required field | Prominent failure in the completeness block naming the entry and the field | — (should be unreachable; the write-time gate prevents it) |
| Export failed | Toast with Retry; the timeline is unaffected | `INTERNAL_ERROR` |
| Empty history | Empty state: "No events recorded for this case yet" | — |
| Cross-case audit attempted by a specialist | Not offered in the UI; the server denies the route | `FORBIDDEN_ROLE` |

**API Surface (this feature):** consumes matrix rows 37–40 and 44. Full schemas in `Y1a-api-read.md` §Audit.

**Schema Surface (this feature):** reads `audit_entries`, `notifications`, `cases`, `cargo_entries`, `recommendations`, `approvals`. No writes.
