## Accessibility Notes

**Target:** WCAG 2.1 AA (PRD §6 Accessibility). Keyboard-navigable across all four primary screens; semantic headings and table markup; status and priority conveyed by text/label, not colour alone; 4.5:1 body contrast and 3:1 for large text and UI boundaries.

Accessibility here is not only a compliance obligation — it is load-bearing for the demo. PER-01 is keyboard-first by habit. The walkthrough will be shown on a projector where colour fidelity is poor. And the authorship distinction (`Y0-patterns.md` §Authorship Banding) is the product's central governance claim, so it **must not depend on colour** or it can be destroyed by a bad projector.

---

### Colour and contrast

| Requirement | Detail |
|---|---|
| Body text | ≥ 4.5:1 against its surface, including text on the **tinted AI band surface** — the tint must be light enough to keep the AI prose readable, which is a constraint on the tint, not on the text |
| Large text and UI boundaries | ≥ 3:1, including all band borders, focus rings, badge outlines, table row separators, and disabled-control borders |
| Disabled controls | Disabled action buttons must still meet **4.5:1 for their reason text**. The reason is information, not decoration, and must not be washed out by disabled styling — this is the most commonly failed detail in a disabled-with-reason pattern |
| **Nothing encoded by colour alone** | Every state carries text and/or shape: `StatusBadge` = label + distinct shape; `PriorityIndicator` = label + rank glyph; `ExceptionTypeChip` = type name; authorship = icon + text label + border style + surface treatment; resolved/retained/new = words plus markers; concurrence = the sentence *"AGREED with"* / *"DIVERGED from"*, never a green/red dot |
| Severity | `HIGH` / `MEDIUM` / `LOW` as words. No colour-only severity |
| Confidence | `HIGH` / `MEDIUM` / `LOW` as words plus a rank glyph, and explicitly **not** on a good/bad colour axis (`Y0-patterns.md` §Confidence Display) |
| Error, warning, success | Icon + text label + copy. `✔`, `⚠`, `✕`, `🔒`, `⛔` each paired with words |
| Projector test | The queue and the audit timeline must remain fully interpretable in greyscale. This is a release check, not an aspiration: screenshot both screens desaturated and confirm every status, priority, exception type, and authorship band is still identifiable |

---

### Keyboard navigation

FRD F16 §Validation: visible focus rings, logical tab order, skip-to-content link, `Escape` closing overlays, `Enter`/`Space` activating controls. All four primary screens must be fully operable without a pointer.

| Surface | Keyboard behaviour |
|---|---|
| Shell | Skip-to-content is the **first** tab stop, jumping to `<main>`. Tab order: skip link → header (demo chip is not focusable; notification bell → acting-user chip → role switcher) → banners' Retry if present → Demo Guide collapse → navigation rail → main content |
| Navigation rail | `Tab` into the rail, arrow keys move within the link group, `Enter` activates. Disabled case-scoped entries are focusable with `aria-disabled="true"` and announce the group-level reason |
| Queue table | `Tab` moves to the table, then `↑`/`↓` move between rows with a **visible focus ring on the row itself**, not only on an inner link. `Enter` or `Space` opens the focused row. `Home`/`End` jump to first/last row. Column sort controls are buttons with `aria-sort` on the `<th>` |
| Filters | Popovers open on `Enter`/`Space`, trap focus, close on `Escape` returning focus to the trigger. Checkbox groups navigate with arrows. Applied-filter chips are buttons; their `⊗` is reachable and labelled *"Remove filter: Priority High"* |
| Shipment Review | Panels are `<section>` landmarks with headings, reachable via heading navigation. Document rows are list items; the upload control on an outstanding request is a normal tab stop |
| Upload / request dialogs | Focus moves to the dialog's first interactive element on open; focus is **trapped**; `Escape` closes and returns focus to the trigger; the submit control's disabled state and reason are announced |
| Recommended Resolution — action cards | A **single radio group**. `Tab` enters the group at the selected item, or the first available item when nothing is selected. Arrow keys move within the group; `Space` selects. Unavailable cards are **focusable but not selectable**, with `aria-disabled="true"` and the reason associated via `aria-describedby`, so a screen-reader user hears *why* rather than skipping past silently |
| Justification textarea | Normal tab stop; the live character count is associated via `aria-describedby` and updates are **not** announced on every keystroke (`aria-live="off"` on the counter); the under-minimum error is announced once on blur |
| Clear-exception confirmation | Focus moves to the dialog; `Back` returns focus to the decision panel with input intact |
| Approval controls | Own radio group beneath the pending-recommendation panel; the evidence-changed acknowledgement checkbox is a tab stop and its requirement is announced via the submit control's `aria-describedby` |
| Audit timeline | A semantic `<ol>` of `<li>` entries — **not** presentational `<div>`s (FRD F20 §Validation). Each entry has an `<h3>` so heading navigation walks the case history. `Show all evidence` is a `<button aria-expanded>` |
| Printable view | `Back to record` is the first tab stop; `Print / Save` the second |
| Drawers | Right-edge drawers behave as dialogs: focus trapped, `Escape` closes, focus restored |
| No keyboard traps | Every overlay is escapable; no component captures `Tab` without a documented exit |
| No pointer-only interaction anywhere | Row selection, sorting, filtering, action selection, disclosure, upload, export, print — all keyboard-reachable |

---

### Semantic structure

| Requirement | Detail |
|---|---|
| Landmarks | `<header>`, `<nav>`, `<main>`, and a `<footer>` where present. One `<main>` per route, the skip-link target |
| Heading hierarchy | No skipped levels. `<h1>` = screen name (*"Cargo Exception Queue"*, *"Shipment Review — SHP-2026-0007"*); `<h2>` = panel titles; `<h3>` = exception cards and audit entries; `<h4>` = field groups within an entry |
| Tables | Real `<table>` with `<caption>`, `<thead>`, and `<th scope="col">` on the queue; `aria-sort` on the active sort column. Row selection is implemented as an accessible row, not a `<div>` grid |
| Lists | Documents panel, exception lists, evidence rows, and the audit timeline are semantic lists. Evidence rows are a description list (`<dl>`) of field path → value, so the label/value relationship is programmatic rather than visual |
| Forms | Every input has a real `<label>`. Required fields carry `aria-required="true"` and a visible *(required)*, not an asterisk alone. Errors use `aria-invalid` plus `aria-describedby` pointing at the message |
| Buttons vs links | Navigation is `<a href>` (so deep links work and are copyable); actions are `<button>`. Never a `<div onclick>` |
| Icons | All glyphs are decorative (`aria-hidden="true"`) and accompanied by text. **No icon-only controls anywhere in the product** |
| Language | `lang="en"` on the root |

---

### Screen-reader considerations

| Requirement | Detail |
|---|---|
| Authorship must be announced, not inferred | The band label is **real text**, first in the block's reading order: *"AI-generated, advisory"* / *"Human decision, Marisol Reyes, Cargo Specialist"* / *"System finding, deterministic rule evaluation"*. A sighted user gets the border and the tint; a screen-reader user gets the same information as words, in the same position |
| AI provenance is read, not hidden | The provider/model/mode/timestamp footer is in the accessibility tree, not `aria-hidden` decoration. It may be visually compact but must be readable |
| `aria-live="polite"` regions | The notification indicator's unread count; post-action confirmations; the revalidation change banner; filter result counts; chain-verification results (FRD F16, F18, F20 §Validation) |
| Never `aria-live="assertive"` | Nothing in this product warrants interrupting a screen-reader user mid-sentence |
| Loading | `aria-busy="true"` on the loading region, removed on resolve. Skeletons are `aria-hidden`; the region carries an accessible name such as *"Loading queue"* |
| Disabled reasons | Associated via `aria-describedby` so they are announced with the control, satisfying the requirement that the reason is *stated* rather than merely present in the DOM near the button |
| Status changes in the audit record | Announced as words: *"Status changed from Pending approval to Cleared"*, not as two adjacent badges with an arrow glyph |
| Confidence | Announced as *"Model confidence: Medium"* followed by the basis sentence and the authority caption. The rank glyph is `aria-hidden` |
| Counts | *"2 open exceptions, 1 resolved"* as text, not as a bare numeral in a badge |
| Justifications | Read in full. Never truncated in the DOM with the remainder behind a control, because a screen-reader user must be able to read the record linearly (US-6.4) |
| Empty states | Announced with their explanatory copy and their remedial action, not as an empty region |

---

### ARIA inventory

| Element | ARIA |
|---|---|
| Skip link | `<a href="#main" class="visually-hidden-focusable">` |
| Navigation rail | `<nav aria-label="Primary">`; active route `aria-current="page"`; disabled entries `aria-disabled="true" aria-describedby="case-scope-reason"` |
| Acting-user chip / role switcher | `<button aria-haspopup="dialog" aria-expanded>`; drawer `role="dialog" aria-modal="true" aria-labelledby` |
| Notification bell | `<button aria-haspopup="menu" aria-expanded>`; count in an `aria-live="polite"` span with an accessible name *"3 unread notifications"* |
| Banners | `role="status"` for the AI-fallback and demo banners (not `role="alert"` — they are persistent conditions, not events); `role="alert"` for the API-unreachable banner |
| Queue table | `<table>` + `<caption class="visually-hidden">`; sortable `<th aria-sort="descending">`; rows `tabindex="0"` with `aria-label` summarising the row |
| Filter popovers | `<button aria-haspopup="true" aria-expanded>`; `role="group" aria-label="Filter by status"` |
| Applied-filter chip remove | `<button aria-label="Remove filter: Priority High">` |
| Panels | `<section aria-labelledby="panel-heading-id">` |
| AI band | `<section aria-labelledby="ai-label-id">` where the label element contains the literal text *"AI-generated · advisory"* |
| Exception card | `<article aria-labelledby="exc-heading-id">` |
| Evidence rows | `<dl>` with `<dt>` field path and `<dd>` value |
| Action radio group | `role="radiogroup" aria-labelledby="decision-heading"`; items `role="radio" aria-checked`; unavailable items `aria-disabled="true" aria-describedby="reason-id"` |
| Justification | `<textarea aria-required="true" aria-describedby="count-id note-id error-id" aria-invalid>` |
| Submit | `<button aria-disabled="true" aria-describedby="blocking-reason-id">` when gated, so the blocker is announced rather than the user guessing |
| Dialogs / drawers | `role="dialog" aria-modal="true" aria-labelledby aria-describedby`; focus trapped; `Escape` bound |
| Audit timeline | `<ol>` / `<li>` with `<h3>` per entry; disclosures `<button aria-expanded aria-controls>` |
| Read-only chip | Plain text in the accessibility tree — *"Read-only, append-only"* |
| Print route | `<main>` with the record; toolbar `aria-hidden` under `@media print` |

---

### Motion and timing

- **No auto-advancing content.** No carousels, no auto-dismissing content that carries decision-relevant information. Post-action confirmations are **panels, not toasts**, precisely so they cannot vanish before a presenter finishes a sentence or before a screen-reader user reaches them.
- **No time limits** on any interaction. Justification fields do not time out; sessions do not expire on a timer during a walkthrough.
- **Respect `prefers-reduced-motion`:** the only motion in the product is the loading progress line, the disclosure expand, and the drawer slide. All are reduced to instant state changes under that query.
- **Polling is silent.** The 20-second notification poll and the 30-second queue refetch must not move focus, must not reorder rows under a keyboard user's cursor position, and must not announce anything except a genuine unread-count change.

---

### Accessibility acceptance checks

Tie these to the F21 suite or a documented manual pass:

1. Complete all ten walkthrough steps using **only** the keyboard, from role gate to audit record.
2. Screenshot the queue and the audit timeline **desaturated**; confirm every status, priority, exception type, severity, confidence level, and authorship band is still identifiable.
3. With a screen reader, confirm that the AI summary is announced as AI-generated **before** its content is read, on both Shipment Review and Recommended Resolution.
4. Confirm every disabled action announces its reason when focused.
5. Confirm the audit timeline is navigable by heading, that every decision entry exposes all eight fields as text, and that no justification is truncated.
6. Confirm no overlay traps focus and every overlay closes on `Escape`, returning focus to its trigger.
7. Confirm 200% browser zoom at the 1280px baseline produces no horizontal scrolling of the primary content region.
8. Confirm the printable audit view preserves the AI/human distinction in **monochrome**.

---

## Traceability

### Screen → Feature → Story

| Screen | Feature | Walkthrough steps | Primary stories |
|---|---|---|---|
| Application Shell | F16 | all | US-9.1, US-8.1, US-8.2, US-8.3, US-7.2, US-12.7 |
| Cargo Exception Queue | F17 | 1 | US-9.2, US-9.3, US-9.4, US-11.1, US-11.11, US-5.2 |
| Shipment Review | F18 | 2, 3, 5, 6, 7 | US-9.5, US-9.6, US-2.1, US-2.2, US-4.1–US-4.5, US-1.5, US-1.6, US-11.2, US-11.3, US-11.6, US-11.7 |
| Recommended Resolution | F19 | 4, 8, 9 | US-2.4, US-2.5, US-3.1–US-3.7, US-5.1, US-5.3–US-5.5, US-9.7, US-9.8, US-11.4, US-11.8, US-11.9, US-12.1–US-12.3, US-12.5 |
| Decision & Audit Record | F20 | 10 | US-6.1, US-6.3–US-6.6, US-7.2, US-9.9, US-11.10, US-12.4 |
| Rule Administration | F15 | — | US-8.5, US-8.6, US-12.6 |
| Environment & Reset | F22 | — | US-10.4, US-10.5, US-2.3, US-6.3 |

### Governance requirement → where it is expressed visually

| Requirement | Expressed by |
|---|---|
| AI content distinguishable from human and from system output at a glance | `Y0-patterns.md` §Authorship Banding — four simultaneous non-colour signals; Screen 2 §AI summary panel; Screen 3 §AI recommendation block; Screen 4 §nested AI band in human entries |
| An AI summary never looks like an official finding | Mandatory `AI-GENERATED · ADVISORY` chip, mandatory *"not a finding"* footer, banded loading skeleton, prohibited vocabulary list |
| Confidence shown without implying authority | `Y0-patterns.md` §Confidence Display — inside the AI band only, always with basis, fixed authority caption, words not percentages, never gates a control, never aggregated |
| Unavailable actions visibly disabled with the reason stated | `Y0-patterns.md` §Disabled Action with Visible Reason — reason occupies layout space, server-supplied copy, all five always rendered; Screen 3 §States; Flow 4 |
| A specialist can never reach Cleared; clearance routes through supervisor approval, visibly | `Y0-patterns.md` §Authority Chain Rail; Screen 3 §Authority Chain and §Governance checklist items 4–6; action titled *Recommend clearance*; confirmation step restating it |
| Audit records read-only / append-only, no edit or delete anywhere | `Y0-patterns.md` §Read-Only by Construction; Screen 4 §Interactive Elements (complete inventory) and §Governance expression; Screen 5 §reset copy |
| The 10-step walkthrough navigable without training | Principle P7; `Flow-00-ten-step-walkthrough.md`; per-screen step indicators; single forward affordance on every confirmation; Demo Guide strip |
| Constrained iframe viewport, no top-level-window dependencies | Principle P8; `Y1-responsive.md`; `Y0-patterns.md` §In-Frame Overlays; in-frame printable route |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-08*
