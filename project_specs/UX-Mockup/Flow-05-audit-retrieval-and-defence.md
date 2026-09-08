### Flow 5: Retrieving and Defending a Decision Months Later

**Trigger:** A clearance is challenged weeks after the fact by someone who was not in the room.
**User Stories:** US-6.4, US-6.5, US-6.6, US-6.1, US-6.3, US-2.2, US-7.2, US-9.9, US-12.4
**Journeys:** JRN-01.4 (specialist defends her own call), JRN-02.2 (supervisor produces the record) · **Personas:** PER-01, PER-02, PER-04

```
        /queue
          │
          ├── filter Status = Cleared   (include_cleared = true)
          │     Cleared cases do NOT vanish from the working surface.
          │     If they did, she would assume the record is gone too
          │     and stop looking (JRN-01.4 Risk of Abandonment).
          │
          ├── row shows status CLEARED (filled badge + lock glyph)
          │     and the approving official's name
          │
          ▼  row overflow → "Audit record"   (or row click → Review → header link)
        /shipments/SHP-2026-0007/audit
          │
          ├── CASE HEADER
          │     shipment · importer · status CLEARED · priority
          │     DISPOSITION BLOCK:
          │       "Cleared 2026-09-08 14:41 UTC.
          │        Approving official: Dwayne Okafor (Supervisor).
          │        On the recommendation of: Marisol Reyes
          │        (Cargo Specialist)."
          │     ← the one-glance answer to "who cleared this and
          │       on whose recommendation"
          │
          ├── COMPLETENESS BLOCK
          │     "12 events recorded. 5 decisions, all 5 complete
          │      against the 8 required fields."
          │     ← the claim is shown on camera, not narrated
          │     ── if missing_fields is non-empty it renders as a
          │        PROMINENT FAILURE naming the entry and the field
          │
          ├── CHAIN VERIFICATION
          │     "Audit chain verified: 12 of 12 entries intact."
          │     ── on failure: red banner naming the first invalid
          │        sequence number; the timeline STILL renders
          │
          ▼
        TIMELINE — ascending sequence_no, identical on every load
          │
          ├── each entry banded by authorship:
          │     SYSTEM  ⚙  ingestion, flagging, revalidation
          │     AI      ✦  summary v1, recommendation v1/v2
          │     HUMAN   👤 request, upload, recommendation, approval
          │
          ├── VERIFY AUTHORSHIP (JRN-01.4 stage 3)
          │     "That paragraph wasn't mine — and it's labeled,
          │      so nobody can claim it was."
          │     Every AI entry carries provider, model, generation
          │     mode, timestamp, and evidence inputs.
          │     Every human entry carries acting user and role.
          │
          ├── filter bar: all / decisions only / AI outputs /
          │   system events / access denials
          │     ── filtering is PRESENTATIONAL; the underlying
          │        record is always complete
          │
          ▼
        HAND IT OVER — one action, complete record
          ├── [ Export JSON ]  → audit-SHP-2026-0007.json via blob
          │     download; contains every field of every entry
          │     plus the hash chain
          └── [ Print / Save ] → /shipments/:id/audit/print rendered
                IN-FRAME (full-bleed print-styled route), then
                window.print(). NO new window, NO popup, NO PDF
                toolchain. A "Back to record" link returns.
```

**Steps:**

1. **Locate.** Cleared cases remain retrievable and openable from the queue behind the `Cleared` status filter, with the approving official on the row. This is a deliberate deviation from "the queue is a work list": the default view excludes cleared cases, the filter restores them, and nothing is deleted from view (FRD F17 §Terminology, §Validation).
2. **Replay.** The timeline covers the whole case history — ingestion and flagging included, not only human decisions. Step 10's requirement is to replay *every* step (FRD F20 §Validation).
3. **Verify authorship.** Machine text quoted back at a human as though she had written it is a category of professional risk PER-01 has simply lived with. The authorship band plus explicit text label plus icon removes it permanently (JRN-01.4 Delight Opportunity; US-2.2).
4. **Read the eight fields.** Every decision entry renders all eight. A non-applicable field renders the explicit words **"Not applicable"** — never blank, never omitted. *The reader must never have to infer whether a field was empty or simply not shown* (FRD F20 §Validation; US-6.1).
5. **Check the notifications.** Each generated notification renders in a distinct sub-block **beside the decision that produced it**, with the fixed label *"Generated, not transmitted"*. Dwayne's line: *"Nobody is going to accuse us of having emailed an importer"* (JRN-02.2 stage 4; US-7.2).
6. **Hand it over.** One action produces the whole chronological attributed history. No assembly, no screenshot set (US-6.5).

**Read-only by construction (US-12.4, P6).** The screen registers no mutating handlers of any kind. Concretely, in UX terms:

- No icon buttons in entry headers or on hover. Entry cards have **no hover state that reveals controls**.
- No inline-editable fields anywhere, including justification text.
- No context menu; right-click is the browser default.
- No drag handles, no reorder, no checkbox multi-select with a bulk action bar.
- Justifications render **verbatim and in full** — never truncated with a "…more" that could be mistaken for an editor.
- A `READ-ONLY · APPEND-ONLY` chip renders in the toolbar, adjacent to the export controls and nothing else.
- The only controls: entry-class filter, evidence disclosure, **Verify chain**, **Export JSON**, **Print / Save**.

An F21 test asserts no `POST`/`PATCH`/`PUT`/`DELETE` originates from this route during a full render-and-interaction pass. The UX contract is that there is nothing on the screen that *could* originate one.

---

### Flow 6: Administrator Changes a Rule as Configuration

**Trigger:** Policy moves — the HTS completeness rule needs a different expected digit count.
**User Stories:** US-8.5, US-8.6, US-8.1, US-12.6, US-10.4, US-10.5
**Journey:** JRN-03.1 · **Persona:** PER-03

```
[ Role gate → Priya Raghavan (System Administrator) ]
                    │
   ── Sidebar now shows: Exception Queue (read-only),
      Rule Administration, Environment & Reset.
   ── Adjudication surfaces are still reachable but every
      action control renders DISABLED with the reason
      "System Administrators do not adjudicate shipments."
      (visible boundary, not a hidden menu — P4)
                    │
                    ▼
        /admin/rules
          │  rule list: type · severity · enabled · policy ref
          │             · version · open_exception_count
          ▼  row click
        /admin/rules/rule-hts-completeness
          │
          │  TYPE-AWARE FORM — selecting exception_type renders
          │  exactly the parameters that type accepts. No free-form
          │  JSON editing required; raw params_json shown read-only
          │  beneath for transparency.
          │
          ├── malformed edit: expected_digit_count = "ten"
          │     ──▶ 422 RULE_CONFIG_INVALID
          │         FIELD-LEVEL message naming the parameter.
          │         The prior rule set REMAINS IN EFFECT.
          │         Banner: "No changes were applied."
          │         (JRN-03.1 stage 2 — she must not discover a
          │          bad config through a broken queue at 9am)
          │
          ├── change_note (required, 10–500 chars)
          │
          ▼  [ Preview impact ]   ← always before [ Apply ]
        IMPACT PREVIEW PANEL (zero writes)
          │  evaluated_shipments: 14
          │  would add (0) · would remove (2) · priority changes (2)
          │  ┌──────────────┬──────────────────┬─────────────────┐
          │  │ SHP-2026-0007│ Incomplete HTS   │ would be removed│
          │  │ SHP-2026-0001│ Incomplete HTS   │ would be removed│
          │  └──────────────┴──────────────────┴─────────────────┘
          │  truncated at 100 entries if larger
          │  [ Back to editing ]   [ Apply with revalidation ]
          ▼
        APPLY
          │  version += 1 · rule cache invalidated
          │  RULE_UPDATED audit entry with the full before/after
          │  definition, the computed parameter diff, her identity,
          │  timestamp, and the change note
          │  revalidate_affected = true ──▶ each affected shipment
          │  gets a normal F6 run with trigger = RULE_CHANGE
          │  CLEARED cases are excluded and reported as
          │  skipped_cleared — a rule change can never disturb a
          │  cleared disposition (F09a I6)
          ▼
        RESULT PANEL
          "Rule saved at version 4. 2 shipments revalidated,
           2 exceptions resolved, 1 priority changed,
           1 cleared case skipped."
          [ View rule history ]   [ Back to Exception Queue ]
                    │
                    ▼
        /queue shows the reduced exception counts immediately —
        0 code changes, 0 redeploys (PRD §7 Rule configurability)
```

**Steps:**

1. **The rule set must read as data on first glance.** *"If this is a code listing dressed up as a screen, I'll know in five seconds"* (JRN-03.1 stage 1). The list is a table of configuration with a policy reference column, not a syntax-highlighted blob.
2. **Validation names the parameter.** Field-level messages, the accepted parameter list on an unknown key, and cross-field messages spelled out (*"min_digit_count cannot exceed expected_digit_count"*). A typo must never silently disable a check (FRD F15 §Validation).
3. **Preview before apply, always.** `Apply with revalidation` is not reachable without a successful preview render in the same session on the same draft. The preview performs zero writes.
4. **Rules are never deletable.** The list has no delete affordance. Disable is the retirement path, so the rule that produced a historical exception stays readable forever. Attempting `DELETE` returns `405 RULE_DELETE_NOT_SUPPORTED`; the UI simply has no such control (FRD F15 §Validation).
5. **Enable/disable gets its own confirmation.** It is the most consequential single-click change, so it carries its own copy: *"Disabling this rule stops it firing on future evaluations. Existing exceptions keep their evidence and their rule version."*
6. **Her own boundary is visible too.** She opens a shipment out of habit and every action is disabled with a stated reason. Her inability to adjudicate is as real and as legible as the specialist's inability to approve (PER-03 Goals; US-12.6).

---
