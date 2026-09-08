## Interaction Patterns

These are the reusable behaviours that make the four screens coherent. Each is defined once and consumed by every screen chunk. Implementations map to the shared components in FRD F16 §Shared component contracts.

---

### Pattern: Authorship Banding

**When to use:** Any time content is rendered whose author matters — which, on these four screens, is all content.
**User Stories:** US-2.2, US-6.1, US-9.9, US-12.1
**Requirement:** *AI-authored content must be visually distinguishable from human-authored content and from deterministic system output at a glance. Never let an AI summary look like an official finding.*

Three bands. Every content block belongs to exactly one, and bands never nest **except** for the one deliberate case documented below.

```
┌─ SYSTEM BAND ────────────────────────────────────────────────┐
│ ⚙ SYSTEM · VALIDATION RESULTS                                │  solid thin border
│ ──────────────────────────────────────────────────────────── │  label-value / tabular
│ hts_code    raw "8541.40"  →  norm "854140" (6 digits)       │  monospace values
│ rule.expected_digit_count = 10                                │  NO prose
└──────────────────────────────────────────────────────────────┘

┃┌─ HUMAN BAND ────────────────────────────────────────────────┐
┃│ 👤 HUMAN DECISION · Marisol Reyes (Cargo Specialist)         │  SOLID 3px left rule
┃│ ──────────────────────────────────────────────────────────── │  neutral surface
┃│ "Certificate of origin received 6 Sep resolves the           │  verbatim quotation
┃│  documentary gap…"                                            │
┃└─────────────────────────────────────────────────────────────┘

╎┌─ AI BAND ───────────────────────────────────────────────────┐
╎│ ✦ AI-GENERATED · ADVISORY                                    │  DASHED 3px left rule
╎│ ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨ │  hatched header strip
╎│ AI suggests: Escalate to supervisor                           │  tinted surface
╎│ Model confidence: MEDIUM                                      │
╎│ ──────────────────────────────────────────────────────────── │
╎│ AI-generated · not a finding · no action has been taken       │  MANDATORY footer
╎│ Provider: openai · Model: gpt-4o · Mode: LIVE · 14:22:14 UTC  │  MANDATORY provenance
╎│ Evidence inputs: 2 exceptions, 5 evidence rows, evaluation v2 │
╎└─────────────────────────────────────────────────────────────┘
```

**Behaviour:**

| Rule | Detail |
|---|---|
| Four simultaneous signals | Icon (`⚙` / `👤` / `✦`), text label, border style (solid / solid-thick-left / **dashed**-thick-left), and surface treatment (plain / neutral / tinted + hatched header). **No band is identified by colour alone**, so the distinction survives a colour-blind reader, a projector, and a monochrome print (PRD §6 Accessibility). |
| Mandatory AI header chip | `AI-GENERATED · ADVISORY`. An AI block without it is a defect. |
| Mandatory AI footer | The words *"AI-generated · not a finding"* plus provider, model, generation mode, timestamp, and evidence inputs. Provenance is not a tooltip and not a disclosure — it is always rendered (PRD §6 Explainability; US-2.2). |
| Vocabulary discipline | AI blocks use *suggests*, *recommends*, *advisory*, *rationale*. They must **never** use *finding*, *determination*, *decision*, *conclusion*, *result*, *verdict*, or *approved*. Those words belong to system findings and human decisions respectively. |
| Never wrap human text in the AI band, and never wrap AI text in the human band | `AiContentLabel` must never wrap human-authored text (FRD F16). A justification is human, always, even when it agrees with the model. |
| Never render AI prose and human prose in the same container | Adjacent, yes. Same card, no. |
| The one permitted nesting | On the audit screen, field 3 of a **human decision** entry is the AI recommendation that was on screen at decision time. It renders as a nested AI band **inside** the human entry, with its own full provenance and the concurrence verdict. This is required: the record must show what the human was advised, and it must be unmistakable which part of the entry is the machine's (FRD F20 §Process step 4). |
| Loading state carries the band | An AI panel loading renders its **skeleton inside the AI band with the label already visible**. A half-loaded screen must not be able to present machine text as a finding. |
| Fallback mode adds, never replaces | `OFFLINE FALLBACK` renders as an additional sub-chip and `Mode: FALLBACK_DETERMINISTIC` in the provenance line. The `AI-GENERATED · ADVISORY` chip stays. |

**Where used:** Shipment Review (AI summary), Recommended Resolution (AI recommendation), Decision & Audit Record (every AI entry plus field 3 of human decision entries).

---

### Pattern: Confidence Display

**When to use:** Wherever an AI recommendation is shown.
**User Stories:** US-2.4, US-9.7, US-12.1
**Requirement:** *Confidence level must be shown without implying the AI has authority.*

```
╎ Model confidence: MEDIUM
╎ Basis: the origin conflict is supported by two independent field values, but the
╎  certificate of origin does not reconcile them, so the disposition depends on
╎  judgment the model cannot make.
╎ Contributing factors
╎  · 2 exceptions retained at evaluation v2
╎  · required document now received
╎  · shipment value above threshold
╎ ──────────────────────────────────────────────────────────────────────────────
╎ ⓘ Confidence describes the model's own certainty about its own output. It confers
╎   no authority, carries no approval weight, and does not change what you may do.
```

**Behaviour:**

| Rule | Detail |
|---|---|
| Always inside the AI band | Confidence never appears in a screen header, a case header, a queue row, or a status badge. It is not a property of the shipment; it is a property of a model output. |
| Always with its basis | A confidence badge without its `confidence_basis` sentence is a defect (FRD F19 §Validation). |
| Always with the fixed caption | The caption above is fixed copy, rendered every time, in both roles. |
| Words, not a dial | `HIGH` / `MEDIUM` / `LOW` as text plus a three-step rank glyph. **No percentage**, no gauge, no progress bar, no traffic-light. A numeric score invites arithmetic on a judgment. |
| Never green-for-go | Confidence must not be encoded on a good/bad axis. High confidence in *"escalate"* is not a positive outcome. Use the same neutral treatment for all three levels; distinguish them by label and rank glyph only. |
| Never gates a control | No action is enabled, disabled, defaulted, pre-selected, emphasised, or de-emphasised as a function of confidence. Availability comes from role and state, never from the model. |
| Never aggregated | No "average confidence" anywhere. No confidence column in the queue. Confidence does not roll up. |
| Recorded, not scored | On the audit record, confidence is reproduced as it stood at decision time, inside the nested AI band, with the concurrence verdict beside it and the explicit note that concurrence is not a quality signal. |

---

### Pattern: Disabled Action with Visible Reason

**When to use:** Any control the acting role or the current state forbids.
**User Stories:** US-3.7, US-8.2, US-8.3, US-12.6 · **PRD §6 Usability**
**Requirement:** *Actions the current role may not take must be visibly disabled with the reason stated — not hidden.*

```
  ○ Send for specialist review                              [ UNAVAILABLE 🔒 ]
      The case is already in this state.

  ○ Recommend clearance                                     [ UNAVAILABLE 🔒 ]
      This case has been escalated; only a Supervisor can act on it.
```

**Behaviour:**

| Rule | Detail |
|---|---|
| The reason occupies layout space | Rendered as a paragraph beneath the control. **Never tooltip-only**, never `title=`, never hover-revealed (FRD F16 `DisabledActionButton`). A projector audience and a keyboard user must both read it. |
| Three simultaneous signals | Disabled styling, the word `UNAVAILABLE`, and a lock glyph. Not greyness alone. |
| Reason text comes from the server | Drawn from `GET /api/cases/{id}/available-actions`, using the fixed reason strings in F09a §5. The client never invents copy, so the screen and the server can never disagree about why. |
| Focusable, not selectable | The control remains in the tab order with `aria-disabled="true"` and the reason associated via `aria-describedby`, so a screen-reader user hears the reason. `Space`/`Enter` do nothing. |
| The set never shrinks | All five workflow actions render on every visit, in the same order, in the same place. A shortened list is a defect. |
| Re-renders in place | After an escalation, the five cards stay five and become closed with reasons. They do not disappear or collapse into a single message. This is how the operator learns the boundary is real (Flow 4). |
| Applies to every role | Including the administrator: on Review and Resolution every action control is disabled with *"System Administrators do not adjudicate shipments."* Her boundary is as visible as the specialist's. |
| The one documented exception | `APPROVE_CLEARANCE` is **not** rendered as a disabled control for Cargo Specialists, because it is not one of the five and rendering it would misdescribe the action space. The boundary is carried by the Authority Chain rail instead. See `00-overview.md` §Role → Surface Matrix for the full reasoning. |

---

### Pattern: Authority Chain Rail

**When to use:** The Recommended Resolution screen, every render, every role.
**User Stories:** US-5.1, US-12.2, US-12.3
**Requirement:** *A specialist can never reach "Cleared"; the clearance path always routes through supervisor approval. Make that visible in the UI, not just enforced server-side.*

```
  ①  RECOMMEND              ②  SUPERVISOR APPROVAL         ③  CLEARED
     ▶ You are here            🔒 Not your authority          ⬤ Only reachable
     Marisol Reyes                Supervisor role required      through step ②
     (Cargo Specialist)           A supervisor other than
                                  you must approve.
  ────────────────────────▶  ─────────────────────────────▶

  Your role cannot set this shipment to Cleared. There is no action on this screen,
  and no path anywhere in the application, that does so.
```

**Behaviour:**

| Rule | Detail |
|---|---|
| Always three steps | The chain is a property of the system, not of the case. It renders identically for a `NEW` case and a `PENDING_APPROVAL` one; only the position marker moves. |
| The marker is the acting user, by name | `▶ You are here — Marisol Reyes (Cargo Specialist)`. Not "your role" in the abstract. |
| Closed steps state the requirement, not just the denial | *"Supervisor role required. A supervisor other than you must approve."* Two facts: the role, and the distinctness. |
| Supervisor view marks step ② as theirs and names the consequence | *"Approving makes you the recorded approving official on this clearance."* |
| Recommender-supervisor view marks step ② closed | Even for a supervisor, if they authored the recommendation the step reads `🔒 You submitted this recommendation and cannot decide on it.` |
| Post-clearance the rail is a history | `① ✔ Marisol Reyes → ② ✔ Dwayne Okafor → ③ ⬤ Cleared 6 Sep 14:41 UTC` |
| Never a progress bar the user can advance by clicking | The rail is not interactive. Steps are not buttons. |

---

### Pattern: Mandatory Justification

**When to use:** Every workflow action and every approval decision.
**User Stories:** US-12.5, US-3.1, US-5.4
**Component:** `JustificationInput` (FRD F16)

**Behaviour:**

| Rule | Detail |
|---|---|
| Never prefilled | Empty on arrival, always. No template, no placeholder that could be submitted, no "suggest a justification" affordance anywhere in the product. |
| Never populated from the AI rationale | There is no copy-from-AI control. A submission whose justification exactly matches the AI rationale is rejected server-side with `JUSTIFICATION_NOT_AUTHORED` and surfaced inline (FRD F19 §Validation). |
| Action-specific minimum, shown live | `0 / 40 minimum` counter, updating as she types. 10 characters default; **40** for `CLEAR_EXCEPTION` with `resolution_basis ∈ {EXCEPTIONS_ACCEPTED, MIXED}` and for supervisor `Reject`. |
| Submit disabled until valid | Not "submit and get an error". The gate is visible before the attempt. |
| Standing note beneath the field | *"Write your own reasoning. This text is recorded verbatim under your name and is not prefilled from the AI rationale."* |
| Preserved on every rejection | Any server rejection leaves the typed text intact. A live demo cannot afford retyping 400 characters (FRD F19 §Validation). |
| Rendered verbatim forever after | On the audit record and in the supervisor's pending-recommendation panel, never truncated, never summarised, never paraphrased. |

---

### Pattern: Post-Action Confirmation with a Single Forward Affordance

**When to use:** After any successful workflow action, approval, upload, or revalidation.
**User Stories:** US-11.5 – US-11.9, US-11.11, US-2.5 · **Principle P7**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✔ Recorded.                                                                  │
│   SHP-2026-0007 is now ◫ Pending approval.                                   │
│   Your decision DIVERGED from the AI advice. This is recorded.                │
│   Audit entry #10 written · notification generated to the Supervisor role.    │
│   You have no further action on this case until a supervisor decides.         │
│                                                                              │
│   [ View audit record ]                          [ Back to Exception Queue ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Behaviour:** states **what was recorded**, **the resulting status**, **the concurrence verdict**, **the audit and notification side-effects**, and **what the operator can and cannot now do**. Then exactly one primary forward affordance, so the next walkthrough step is never ambiguous. Announced via `aria-live="polite"`. Never a toast that disappears before a presenter finishes a sentence — confirmations of state changes are panels, not transients. Toasts are reserved for non-decision events (refresh, concurrency reload, export failure).

---

### Pattern: Change Indication After Revalidation

**When to use:** After any revalidation, whether upload-triggered, manual, or rule-change-triggered.
**User Stories:** US-9.6, US-1.6, US-1.7, US-11.7

```
⟳ Revalidated 6 Sep 14:22 UTC — evaluation v2
  1 exception resolved · 2 retained · 0 new              [ Compare v1 → v2 ]
```

**Behaviour:** resolved / retained / new counts are **always all three stated**, even when a count is zero. Resolved exceptions are marked `Resolved by revalidation` and **moved** into the collapsed Resolved disclosure — never deleted. Retained exceptions stay in place with their evidence intact, and gain an `Updated` marker when their evidence set or missing-information list changed. A silent refresh is a defect. **There is no success state on any screen that reads as "clean"** while an exception is still firing — this is the failure mode that would kill Marisol's trust in the tool permanently (JRN-01.3 Risk of Abandonment).

---

### Pattern: In-Frame Overlays (no popups)

**When to use:** Dialogs, drawers, confirmations. Always.
**Constraint:** Principle P8 — embedded iframe, sandboxed preview.

| Overlay | Use | Behaviour |
|---|---|---|
| **Dialog** (centred, ≤560px, ≤80% frame height, internally scrollable) | Request information, upload, clear-exception confirmation, reset confirmation | Focus trapped; `Escape` closes; focus returns to the trigger; scroll locked on the content region only |
| **Drawer** (right-edge, ≤480px, full frame height) | View triggering rule, evaluation diff, rule history, role switcher, notification list | Same focus rules; does not obscure the case header |
| **Inline panel** | Impact preview, post-action confirmation, error views | Not an overlay at all — preferred whenever the content is part of the task rather than an interruption |

**Prohibited absolutely:** `window.open`, `target="_blank"`, `window.confirm`, `window.alert`, `window.prompt`, the Fullscreen API, `window.print()` on any route other than the dedicated printable view, and any pattern that assumes the visual viewport equals the browser window.

---

### Pattern: Skeleton Loading That Reserves Layout

**When to use:** Every data-backed view.
**Requirement:** FRD F16 §Validation — *"Loading states MUST reserve the eventual layout's space so content does not jump — a live demo cannot afford a mis-click caused by reflow."*

**Behaviour:** skeletons replicate the eventual structure at final dimensions — real column headers on the queue table with placeholder rows at final row height; four panel outlines at final size on Review; exception-card and decision-panel outlines on Resolution. **Never a centred spinner** that collapses to zero height and reflows on arrival. Regions carry `aria-busy="true"`. Panels resolve independently: on Shipment Review the five non-AI calls render as they arrive while the AI panel holds its labelled skeleton, so evidence is never gated behind the narrative.

---

### Pattern: Error Surfacing

**When to use:** Every failure.
**Requirement:** FRD F16 §Validation

| Failure class | Surface | Copy shape |
|---|---|---|
| Field validation | Inline, beneath the field; submit stays disabled | Names the field and the constraint: *"40 characters minimum for this action. 12 entered."* |
| Action rejected (state / role / guard) | Inline in the open dialog or on the control; the control becomes disabled with the reason | Names the status and the attempted action: *"Cannot request information on a case in status Cleared."* |
| Upload rejected | Inline in the open dialog; **dialog stays open**; no panel state changes | Names the specific reason and the accepted set: *"File content does not match its declared type. Accepted: PDF, PNG, JPEG."* |
| Fetch failed | Error panel replacing the region, with **Retry** | Error code as human copy + `request_id`: *"The queue could not be loaded. Reference: req_8f3c1a."* |
| Concurrency | Toast + automatic refetch; the action is **not** retried silently | *"This case changed; reloading."* |
| Authorisation | Inline 403 view naming the acting role and the required role; navigation stays usable | *"Rule Administration requires the System Administrator role. You are acting as Cargo Specialist."* |
| Integrity | Prominent banner; **the underlying content still renders** | *"Audit chain verification failed at entry #7. The record is displayed unmodified."* |

**Universal rules:** every error shows the server's `code` translated to human copy plus the `request_id`. **No raw stack traces, ever.** No generic *"Something went wrong"*. Every rejection is non-destructive and says so where a partial state would otherwise be suspected. Errors never clear user input.

---

### Pattern: Read-Only by Construction

**When to use:** The Decision & Audit Record screen; any cleared case; the printable view.
**User Stories:** US-6.3, US-12.4 · **Principle P6**

**Behaviour:** the property is achieved by **absence of affordances**, not by disabling them. Concretely: no icon buttons in entry headers, no hover states that reveal controls, no inline-editable fields, no context menu, no drag handles, no multi-select with a bulk action bar, no "…more" truncation on justifications that could read as an editor. The only controls are read controls — filter, disclose, verify, export, print — and a `READ-ONLY · APPEND-ONLY` chip states the property in words. On a **cleared case** the Review and Resolution screens replace their action panels with a read-only disposition summary rather than disabling twelve controls: at terminal state there is nothing to explain, only a disposition to report.

---

### Pattern: Simulation Boundary Labelling

**When to use:** Everywhere, permanently.
**User Stories:** US-7.2, US-12.7 · **PRD §8**

| Marker | Placement | Copy |
|---|---|---|
| Demo-mode chip | Shell header, non-dismissible | *"Demo — synthetic data, simulated login, notifications not transmitted"* |
| Simulated-login note | Role gate, beneath the user list | *"Simulated login. No PIV/CAC, no SSO. The selected identity is recorded on every action you take."* |
| Notification label | Every notification, in-app list and audit record | *"Generated, not transmitted"* |
| Document provenance | Every document row | `Seeded` / `Ingested` / `Uploaded this session` + the standing note that no importer correspondence path exists |
| AI-fallback banner | Shell, non-dismissible while the condition holds | *"AI assistance is running in offline fallback mode…"* |
| Print header | Every page of the printable view | *"DEMO ARTEFACT · SYNTHETIC DATA · SIMULATED LOGIN · NOTIFICATIONS NOT TRANSMITTED"* |

Angela must never mistake the demo for production, and an exported record must never be able to circulate as a production record (PER-04 success criteria).

---
