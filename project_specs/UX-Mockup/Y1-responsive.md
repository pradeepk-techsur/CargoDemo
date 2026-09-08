## Responsive Considerations

### The governing constraint: an iframe in a sandboxed preview

The application is embedded in an **iframe inside a sandboxed preview environment**. This is not a normal responsive-web problem; it changes what the layout may assume:

| Assumption normally safe | Why it fails here | Design response |
|---|---|---|
| The viewport is the browser window | The frame is a sub-region of someone else's page, of unknown and changeable size | Layout responds to the **container**, not the viewport. Use container queries or a measured root width; never `100vw`/`100vh` for structural sizing |
| A popup or new tab is available | `window.open` and `target="_blank"` may be blocked by the sandbox; a popup that does open lands outside the demo frame and derails a live walkthrough | **All overlays are in-frame.** The printable view is an in-frame route, not a new tab |
| Fullscreen is available | The Fullscreen API is commonly disabled in sandboxed frames | No fullscreen affordance anywhere; density is solved by layout, not by escaping the frame |
| `position: fixed` pins to the window | Inside a frame it pins to the frame, which is usually what is wanted — but nested scroll containers make it unreliable | Sticky headers use `position: sticky` within an explicitly scoped scroll container |
| The frame is tall | Embedded previews are frequently 600–700px tall | The **primary content region owns the vertical scroll**; the shell header, banners, and navigation do not scroll away the operator's identity |
| Browser zoom / OS text scaling is the user's business | A presenter may zoom to make a projector readable, which shrinks the effective container | Layout must survive 200% zoom at the design baseline without horizontal scrolling of the primary content region |

**Design baseline: 1280 × 720 container.** **Supported range: 1024–1920px wide, 600px+ tall.** FRD F16 §Validation requires responsiveness from 1024px to 1920px and usability in an embedded iframe **with no horizontal scrolling of the primary content region**. Below 1024px the layout degrades gracefully rather than breaking (see Narrow below), but 1024px is the supported floor because these are desk-browser, keyboard-first personas (PER-01: *"She works from a desk browser, keyboard-first"*).

---

### Desktop / wide (≥ 1440px container)

- **Shell:** persistent left navigation rail at 240px, expanded with section labels.
- **Queue:** all seven columns visible — Shipment ID, Importer, Exception(s), Priority, Status, Age, Assigned to. Shipment value in a row disclosure.
- **Shipment Review:** two columns. Left (≈45%): entry data, documents. Right (≈55%): AI summary above validation results. All four panels visible without scrolling at 900px+ height.
- **Recommended Resolution:** two columns. Left: exception cards. Right: AI recommendation. Authority Chain rail full width above both. Decision panel full width below.
- **Audit Record:** single-column timeline at a max content width of 960px, so long justifications stay readable; header blocks in a three-across row.
- **Rule Administration:** editor and impact preview side by side.

### Standard (1024–1440px container) — **the design baseline**

- **Shell:** navigation rail at 200px; section labels retained.
- **Queue:** `Assigned to` collapses into a row disclosure. The five PRD-mandated columns plus Age are **never** dropped at any width — a build that omits any of the five fails acceptance (FRD F17 §Validation).
- **Shipment Review:** two columns retained, ratio shifts to 40/60 to protect the validation-results panel, which is the panel the 30-second comprehension target depends on.
- **Recommended Resolution:** two columns retained down to 1100px, then the AI recommendation block moves **beneath** the exception cards and above the governance notice. Reading order is preserved: findings → advice → governance notice → decision panel. The AI block must never end up below the decision panel, where it would read as a justification for a choice already made.
- **Audit Record:** header blocks stack to two-across; timeline unchanged.
- **Rule Administration:** impact preview moves beneath the definition form and auto-scrolls into view when it resolves.

### Narrow (< 1024px container) — graceful degradation, not a supported target

- **Shell:** navigation rail collapses to an icon rail with an in-frame expand drawer. The **acting-user chip and role remain visible at every width** — a screen that renders without them is a defect (FRD F16 §Validation), so the identity block wraps to a second header line rather than truncating or hiding behind a menu.
- **Queue:** the table becomes a **stacked card list**, one card per shipment, each carrying all five mandated fields as labelled rows. It does **not** become a horizontally scrolling table — a presenter cannot discover a column that is off-screen.
- **Shipment Review / Recommended Resolution:** single column in the fixed order: header → banners → Authority Chain (Resolution) → system findings → AI block → governance notice → decision panel / action bar.
- **Audit Record:** single column; evidence disclosures stay collapsed by default; the eight fields stack as label-above-value pairs.
- **Rule Administration:** single column; **Apply** remains gated on a preview having been run.

### Mobile (< 768px)

**Not a supported target.** PRD §5.8 excludes mobile-native applications and the product is web-first for desk-based specialists. The narrow layout above prevents a catastrophic render if a frame is unexpectedly small, but no design work is committed below 768px and no acceptance criterion is evaluated there.

---

### Vertical space discipline

Embedded frames are short. Priority order for scarce vertical space:

1. Shell header with the acting user and role — **never scrolls away**.
2. Non-dismissible banners (AI fallback, degraded subsystem) — pinned beneath the header.
3. The case header on case-scoped screens — `position: sticky` within the content scroll container, so the operator never loses which shipment they are looking at while scrolling evidence.
4. On Recommended Resolution: the Authority Chain rail is sticky **with** the case header at heights ≥ 700px; below that it scrolls, because the decision panel must be reachable.
5. Everything else scrolls.

The Demo Guide strip is collapsible precisely so a short frame can reclaim its two lines, and the collapse state persists for the session.

### Reflow prohibitions (live-demo requirements)

- **No layout shift on data arrival.** Skeletons reserve final dimensions. A presenter must never mis-click a row that moves under the cursor (FRD F16 §Validation).
- **No content-dependent column widths** on the queue. Column widths are fixed proportions so row order and cell positions are stable across reloads and across demo runs — the visual companion to deterministic server-side sorting.
- **No auto-scroll except one case:** the impact-preview panel on Rule Administration scrolls into view when it resolves, because it appears below the fold on the baseline layout and is the whole point of the interaction.
- **Long values wrap, never truncate silently.** Manufacturer addresses, policy references, and justifications wrap. Justifications are **never** truncated with an ellipsis anywhere in the product (FRD F20 §Validation).
- **Tables never scroll horizontally.** If a column will not fit, it moves into a row disclosure or the layout switches to stacked cards.

### Print

The only print target is `/shipments/:shipmentId/audit/print`.

- `@media print`: shell, navigation, toolbar, and the Back link are hidden; the demo-artefact banner repeats on every page.
- All disclosures render **expanded** — collapsed evidence in a printed record would be an omission.
- Authorship is carried by **words and rule-lines only**. Background tints must not be relied on, because a monochrome print or a low-toner printer would erase the AI/human distinction — the single most important thing on the page.
- Page breaks avoid splitting an audit entry card; `break-inside: avoid` per entry.
- Triggered by `window.print()` **from this route only**, after in-frame navigation. No popup, no new tab, no PDF toolchain (there is none in this environment, and none is to be installed).

---
