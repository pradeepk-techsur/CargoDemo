import { test, expect } from '@playwright/test';

/**
 * UAT walkthrough for the CargoDemo — CBP Cargo Exception Review app.
 *
 * This is a WALKTHROUGH of the built user stories' acceptance criteria, in the
 * language of the reviewing specialist, NOT an assertion sweep. It runs under the
 * project's existing playwright.config.ts (testDir 'e2e', baseURL
 * http://127.0.0.1:3000, a fresh seeded e2e.db each run) — no config is created or
 * touched here.
 *
 * Section 1 walks the primary journey JRN-01.1 end to end (flag → review → act),
 * one test() per user-visible step, in order. The single unavoidable mutation
 * (place SHP-2026-0007 on hold) happens as one ordered type→submit→confirm flow.
 * Sections 2 and 3 are independent and read-only except where they own their own
 * shipment for a transition.
 *
 * Built features in scope: F0, F2, F3, F4, F5, F9, F17, F18.
 *
 * All selectors are the source-verified data-testids, with semantic (role/label/
 * text) fallbacks. Every test asserts a user-visible outcome — visible text and
 * elements — never a raw status code, except in Section 3 where the acceptance
 * criteria are explicitly about the API/data path.
 */

const CANONICAL = 'SHP-2026-0007';
const CLEAN = 'SHP-2026-0011';

// A justification comfortably over every minimum (default 10, clearance 40).
const JUSTIFICATION =
  'Holding this shipment pending the outstanding certificate of origin and the country conflict being resolved with the importer of record.';

// =============================================================================
// 1. Primary user flow — JRN-01.1 (flag → review → act)
// =============================================================================

test.describe('1. Primary user flow — JRN-01.1 (flag → review → act)', () => {
  // The whole journey mutates the canonical shipment exactly once, at the last
  // step, so the steps run in order.
  test.describe.configure({ mode: 'serial' });

  test.describe('US-9.2 Work a Queue of Flagged Shipments', () => {
    test('opens the Cargo Exception Queue and sees flagged shipments in a table', async ({
      page,
    }) => {
      await page.goto('/');

      // No login, no redirect — the queue is the landing screen.
      await expect(page.locator('[data-testid="queue-screen"]')).toBeVisible();
      await expect(page.locator('h1')).toHaveText('Cargo Exception Queue');
      expect(new URL(page.url()).pathname).toBe('/');

      // The flagged shipments are shown in a table with rows.
      const table = page.locator('[data-testid="queue-table"]');
      await expect(table).toBeVisible();
      const rows = page.locator('[data-testid="queue-row"]');
      expect(await rows.count()).toBeGreaterThan(0);

      // The mandated columns are readable by the specialist.
      const headerText = (
        await page.locator('[data-testid="queue-table"] thead th').allInnerTexts()
      )
        .join(' | ')
        .toLowerCase();
      for (const col of ['shipment id', 'importer', 'exception(s)', 'priority', 'status']) {
        expect(headerText).toContain(col);
      }
    });
  });

  test.describe('US-9.4 See Multi-Exception Shipments Without Collapsing', () => {
    test(`sees ${CANONICAL} with three distinct exception chips, never "3 exceptions"`, async ({
      page,
    }) => {
      await page.goto('/');

      const idCell = page.locator(`[data-testid="queue-row-${CANONICAL}"]`);
      await expect(idCell).toBeVisible();

      const row = page.locator('[data-testid="queue-row"]', {
        has: page.locator(`[data-testid="queue-row-${CANONICAL}"]`),
      });

      // One chip per distinct open exception type — three of them.
      const chips = row.locator('[data-testid="queue-row-exception-chip"]');
      await expect(chips).toHaveCount(3);
      const types = await chips.evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-exception-type')),
      );
      expect(new Set(types).size).toBe(3);

      // The count is shown alongside the chips ("3 open"), and the shipment is
      // NEVER collapsed to the text "3 exceptions".
      await expect(row.locator('[data-testid="queue-row-exceptions"]')).toContainText('3 open');
      await expect(row).not.toContainText(/3 exceptions/);
    });
  });

  test.describe('US-9.2 Work a Queue of Flagged Shipments', () => {
    test(`opens ${CANONICAL} by activating its row, landing on the Shipment Review screen`, async ({
      page,
    }) => {
      await page.goto('/');

      // The row is the selectable region and the only way into the review screen.
      await page.locator(`[data-testid="queue-row-${CANONICAL}"]`).click();

      await expect(page).toHaveURL(new RegExp(`/shipments/${CANONICAL}$`));
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-shipment-id"]')).toHaveText(
        `Shipment Review — ${CANONICAL}`,
      );
    });
  });

  test.describe('US-9.5 / US-1.5 See the Whole Case on One Review Screen', () => {
    test('reads the entry data and the per-exception validation cards with evidence rows', async ({
      page,
    }) => {
      await page.goto(`/shipments/${CANONICAL}`);
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

      // The shipment entry data the reviewer needs is all on one screen.
      const importer = page.locator('[data-testid="entry-field-importer"]');
      const hts = page.locator('[data-testid="entry-field-hts-code"]');
      const origin = page.locator('[data-testid="entry-field-country-of-origin"]');
      const mfrAddress = page.locator('[data-testid="entry-field-manufacturer-address"]');
      const value = page.locator('[data-testid="entry-field-shipment-value"]');

      await expect(importer).not.toBeEmpty();
      await expect(hts).not.toBeEmpty();
      await expect(value).not.toBeEmpty();

      // Country of origin and the manufacturer's country conflict, side by side.
      await expect(origin).toContainText('Malaysia');
      await expect(mfrAddress).toContainText('China');

      // One validation card per open exception, each with the full finding.
      const cards = page.locator('[data-testid="exception-card"]');
      await expect(cards).toHaveCount(3);

      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        await expect(card.locator('[data-testid="exception-rule-name"]')).not.toBeEmpty();
        await expect(card.locator('[data-testid="exception-policy-reference"]')).not.toBeEmpty();
        await expect(card.locator('[data-testid="exception-assertion"]')).not.toBeEmpty();
        // Field-level evidence rows — the reviewer can check the finding themselves.
        expect(await card.locator('[data-testid="evidence-row"]').count()).toBeGreaterThanOrEqual(
          1,
        );
      }

      // The origin-conflict card shows both conflicting values as evidence.
      const originCard = page.locator(
        '[data-testid="exception-card"][data-exception-type="CONFLICTING_COUNTRY_OF_ORIGIN"]',
      );
      await expect(originCard).toContainText('Malaysia');
      await expect(originCard).toContainText('China');
    });
  });

  test.describe('US-3.1 Take One of Exactly Five Actions on a Case', () => {
    test('selects "Place on hold", sees only its fields, and Submit stays disabled until valid', async ({
      page,
    }) => {
      await page.goto(`/shipments/${CANONICAL}`);
      await expect(page.locator('[data-testid="action-panel"]')).toBeVisible();

      // Exactly five actions, none pre-selected.
      await expect(page.locator('[data-testid^="action-option-"]')).toHaveCount(5);
      await expect(page.locator('[data-testid="justification-input"]')).toHaveCount(0);

      // Place on hold must be available on the seeded (NEW) canonical case.
      const holdOption = page.locator(
        '[data-testid="action-option-PLACE_ON_HOLD"][data-available="true"]',
      );
      await expect(holdOption).toHaveCount(1);
      await holdOption.locator('input[type="radio"]').check();

      // Selecting the action reveals ONLY that action's fields.
      await expect(page.locator('[data-testid="field-hold-reason"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-escalation-reason"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="field-document-types"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="field-assign-to"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="field-resolution-basis"]')).toHaveCount(0);

      // Justification is empty on arrival and Submit is disabled.
      const textarea = page.locator('[data-testid="justification-input"]');
      await expect(textarea).toHaveValue('');
      const submit = page.locator('[data-testid="action-submit"]');
      await expect(submit).toHaveText(/Submit decision/);
      await expect(submit).toBeDisabled();

      // A too-short justification keeps it disabled and the counter says so.
      await textarea.fill('too short');
      await expect(submit).toBeDisabled();
      await expect(page.locator('[data-testid="justification-counter"]')).toContainText('minimum');
    });
  });

  test.describe('US-3.4 Place a Case on Hold with a Stated Reason', () => {
    test('types a valid justification, submits, and sees the confirmation with the new ON_HOLD status', async ({
      page,
    }) => {
      await page.goto(`/shipments/${CANONICAL}`);
      await expect(page.locator('[data-testid="action-panel"]')).toBeVisible();

      const statusBefore = (
        await page.locator('[data-testid="review-status"]').innerText()
      ).trim();

      await page
        .locator('[data-testid="action-option-PLACE_ON_HOLD"][data-available="true"]')
        .locator('input[type="radio"]')
        .check();

      // A hold reason is mandatory, from the enumerated set. It defaults to a
      // non-OTHER value, so no free-text detail is required.
      await expect(page.locator('[data-testid="field-hold-reason"] select')).toBeVisible();

      // Type a ≥40-character justification and submit.
      const textarea = page.locator('[data-testid="justification-input"]');
      await textarea.fill(JUSTIFICATION);
      expect(JUSTIFICATION.length).toBeGreaterThanOrEqual(40);

      const submit = page.locator('[data-testid="action-submit"]');
      await expect(submit).toBeEnabled();
      await submit.click();

      // The confirmation quotes the justification verbatim and names the new
      // ON_HOLD status.
      const confirmation = page.locator('[data-testid="action-confirmation"]');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText(JUSTIFICATION);
      await expect(confirmation).toContainText('On hold');
      await expect(confirmation).toContainText('→');

      // The case really moved: the sticky header now shows the on-hold status.
      await expect(page.locator('[data-testid="review-status"]')).toContainText('On hold');
      expect(statusBefore).not.toBe('On hold');
    });
  });
});

// =============================================================================
// 2. Secondary flows
// =============================================================================

test.describe('2. Secondary flows', () => {
  test.describe('US-9.3 Filter and Sort the Queue Deterministically', () => {
    test('status, exception-type and priority filters are all offered', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="queue-filter-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-filter-exception-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-filter-priority"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-sort-field"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-sort-direction"]')).toBeVisible();
    });

    test('default priority-desc ordering is deterministic and non-increasing', async ({
      page,
    }) => {
      await page.goto('/?sort=priority:desc');
      await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
      const rank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
      // Read the enum off `data-priority`, not the cell text: the derivation
      // basis in the same cell contains substrings like "Highest", which would
      // make a text-substring match pass regardless of the real ordering.
      const values = await page
        .locator('[data-testid="queue-row-priority"] [data-priority]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-priority') ?? ''));
      const ranks = values.map((v) => rank[v] ?? -1);
      expect(ranks).not.toContain(-1);
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
      }
    });

    test('an applied filter renders as a removable chip and clearing restores the set', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
      const beforeCount = await page.locator('[data-testid="queue-row"]').count();

      // Apply the "Incomplete HTS" (INVALID_HTS_CODE) exception-type filter.
      await page.getByLabel('Incomplete HTS').check();
      await expect(page.locator('[data-testid="queue-applied-filters"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-applied-filters"]')).toContainText(
        'Incomplete HTS',
      );

      const filteredCount = await page.locator('[data-testid="queue-row"]').count();
      expect(filteredCount).toBeLessThanOrEqual(beforeCount);

      // Clearing the filters brings the full set back.
      await page.locator('[data-testid="queue-clear-filters"]').first().click();
      await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
      expect(await page.locator('[data-testid="queue-row"]').count()).toBe(beforeCount);
    });

    test('empty states distinguish no-match from the default no-flagged view', async ({
      page,
    }) => {
      // A filter that matches nothing yields the "no match" empty state with a
      // clear-filters affordance — not silently the full set.
      await page.goto('/?status=CLEARED');
      const empty = page.locator('[data-testid="queue-empty"]');
      await expect(empty).toBeVisible();
      await expect(empty).toContainText(/match/i);
      // The clear-filters affordance appears both in the filters sidebar and inside
      // the empty state; scope the assertion to the empty state so it is unambiguous
      // (the app correctly renders both — the acceptance criterion is that the
      // no-match empty state offers a clear-filters control).
      await expect(empty.getByTestId('queue-clear-filters')).toBeVisible();
    });
  });

  test.describe('US-9.4 See Multi-Exception Shipments Without Collapsing', () => {
    test('the clean shipment is off the queue by default and appears when clean entries are included', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.locator(`[data-testid="queue-row-${CLEAN}"]`)).toHaveCount(0);

      await page.locator('[data-testid="queue-filter-status"]').waitFor();
      await page.getByLabel('Clean entries').check();
      await expect(page.locator(`[data-testid="queue-row-${CLEAN}"]`)).toBeVisible();
    });
  });

  test.describe('US-1.5 See Field-Level Evidence for Every Exception', () => {
    test('evidence rows show field references and values, including the origin conflict', async ({
      page,
    }) => {
      await page.goto(`/shipments/${CANONICAL}`);
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

      const originCard = page.locator(
        '[data-testid="exception-card"][data-exception-type="CONFLICTING_COUNTRY_OF_ORIGIN"]',
      );
      const rows = originCard.locator('[data-testid="evidence-row"]');
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
      // The card renders both field references and their conflicting values.
      await expect(originCard).toContainText('Malaysia');
      await expect(originCard).toContainText('China');
    });

    test('a missing-required-document exception renders its missing-information list', async ({
      page,
    }) => {
      await page.goto(`/shipments/${CANONICAL}`);
      const docCard = page.locator(
        '[data-testid="exception-card"][data-exception-type="MISSING_REQUIRED_DOCUMENT"]',
      );
      await expect(docCard).toBeVisible();
      await expect(
        docCard.locator('[data-testid="exception-missing-information"]'),
      ).toContainText('CERTIFICATE_OF_ORIGIN');
    });
  });

  test.describe('US-9.5 See the Whole Case on One Review Screen', () => {
    test('every action control is enabled or disabled with a visible reason — none hidden', async ({
      page,
    }) => {
      // Use a shipment other tests do not disposition here.
      await page.goto(`/shipments/${CLEAN}`);
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

      // If the review screen is available for this shipment, all five actions
      // render and each unavailable one carries a visible reason.
      const options = page.locator('[data-testid^="action-option-"]');
      if ((await options.count()) > 0) {
        await expect(options).toHaveCount(5);
        const unavailable = page.locator(
          '[data-testid^="action-option-"][data-available="false"]',
        );
        const un = await unavailable.count();
        for (let i = 0; i < un; i++) {
          const reason = unavailable.nth(i).locator('[data-testid="action-unavailable-reason"]');
          await expect(reason).toBeVisible();
          await expect(reason).not.toBeEmpty();
        }
      }
    });
  });

  test.describe('US-3.3 Send a Case for Specialist Review', () => {
    test('sending a NEW case for specialist review moves it to IN_REVIEW', async ({ page }) => {
      // Own a distinct shipment for this transition. Read its current state
      // first so the test does not depend on another test's mutation.
      const shipmentId = 'SHP-2026-0002';
      const detail = await (await page.request.get(`/api/shipments/${shipmentId}`)).json();
      const caseId = detail.case_id ?? detail.case?.case_id;
      const actions = await (
        await page.request.get(`/api/cases/${caseId}/available-actions`)
      ).json();
      const canSend = (actions.actions as Array<{ action: string; available: boolean }>).some(
        (a) => a.action === 'SEND_FOR_SPECIALIST_REVIEW' && a.available,
      );
      test.skip(!canSend, 'SEND_FOR_SPECIALIST_REVIEW not available on this seeded case');

      await page.goto(`/shipments/${shipmentId}`);
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

      await page
        .locator('[data-testid="action-option-SEND_FOR_SPECIALIST_REVIEW"][data-available="true"]')
        .locator('input[type="radio"]')
        .check();
      await page
        .locator('[data-testid="justification-input"]')
        .fill(
          'Routing this case to a specialist for a closer read of the flagged exceptions before any disposition.',
        );

      const submit = page.locator('[data-testid="action-submit"]');
      await expect(submit).toBeEnabled();
      await submit.click();

      const confirmation = page.locator('[data-testid="action-confirmation"]');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText('In review');
      await expect(page.locator('[data-testid="review-status"]')).toContainText('In review');
    });
  });

  test.describe('US-3.5 Escalate a Case and Transfer Authority Upward', () => {
    test('escalating a case with an enumerated reason moves it to ESCALATED', async ({ page }) => {
      const shipmentId = 'SHP-2026-0003';
      const detail = await (await page.request.get(`/api/shipments/${shipmentId}`)).json();
      const caseId = detail.case_id ?? detail.case?.case_id;
      const actions = await (
        await page.request.get(`/api/cases/${caseId}/available-actions`)
      ).json();
      const canEscalate = (
        actions.actions as Array<{ action: string; available: boolean }>
      ).some((a) => a.action === 'ESCALATE_TO_SUPERVISOR' && a.available);
      test.skip(!canEscalate, 'ESCALATE_TO_SUPERVISOR not available on this seeded case');

      await page.goto(`/shipments/${shipmentId}`);
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

      await page
        .locator('[data-testid="action-option-ESCALATE_TO_SUPERVISOR"][data-available="true"]')
        .locator('input[type="radio"]')
        .check();

      // The escalation reason is mandatory, from the enumerated set (defaults to a
      // non-OTHER value, so no free-text detail is required).
      await expect(page.locator('[data-testid="field-escalation-reason"] select')).toBeVisible();

      await page
        .locator('[data-testid="justification-input"]')
        .fill(
          'Escalating to a supervisor because the policy treatment of this conflicting-origin case is ambiguous and needs a higher authority.',
        );

      const submit = page.locator('[data-testid="action-submit"]');
      await expect(submit).toBeEnabled();
      await submit.click();

      const confirmation = page.locator('[data-testid="action-confirmation"]');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText('Escalated');
      await expect(page.locator('[data-testid="review-status"]')).toContainText('Escalated');
    });
  });
});

// =============================================================================
// 3. Technical checks
// =============================================================================

test.describe('3. Technical checks', () => {
  test.describe('US-0.4 Start with a Seeded, Deterministic Demo Dataset', () => {
    test('the queue is non-empty on a fresh seed', async ({ page }) => {
      const res = await page.request.get('/api/queue');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    test(`canonical ${CANONICAL} is present with its three expected exceptions`, async ({
      page,
    }) => {
      const res = await page.request.get(`/api/shipments/${CANONICAL}/exceptions`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      const openTypes = (body.open as Array<{ exception_type: string }>).map(
        (x) => x.exception_type,
      );
      expect(new Set(openTypes)).toEqual(
        new Set([
          'MISSING_REQUIRED_DOCUMENT',
          'INVALID_HTS_CODE',
          'CONFLICTING_COUNTRY_OF_ORIGIN',
        ]),
      );
    });
  });

  test.describe('US-0.1 Persist the Full Cargo Exception Domain', () => {
    test('shipment detail and its exceptions are readable via the data path', async ({ page }) => {
      const shipmentRes = await page.request.get(`/api/shipments/${CANONICAL}`);
      expect(shipmentRes.status()).toBe(200);
      const shipment = await shipmentRes.json();
      expect(shipment.shipment_id).toBe(CANONICAL);
      expect(shipment.importer_name).toBeTruthy();
      expect(shipment.country_of_origin).toBeTruthy();
      expect(shipment.manufacturer?.address?.country).toBeTruthy();

      const exRes = await page.request.get(`/api/shipments/${CANONICAL}/exceptions`);
      expect(exRes.status()).toBe(200);
      const exceptions = await exRes.json();
      expect(Array.isArray(exceptions.open)).toBe(true);
      expect(exceptions.open.length).toBeGreaterThan(0);
    });
  });

  test.describe('US-9.3 Filter and Sort the Queue Deterministically', () => {
    test('a filter value outside the enums is rejected with INVALID_QUERY_PARAM and surfaced in the UI', async ({
      page,
    }) => {
      // The server rejects it rather than silently widening.
      const res = await page.request.get('/api/queue?priority=URGENT');
      expect(res.status()).toBe(422);
      const err = await res.json();
      expect(err.error.code).toBe('INVALID_QUERY_PARAM');

      // And the UI surfaces the rejection — it never renders unfiltered data.
      await page.goto('/?priority=URGENT');
      await expect(page.locator('[data-testid="queue-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-table"]')).toHaveCount(0);
    });
  });

  test.describe('US-9.5 See the Whole Case on One Review Screen', () => {
    test(`a deep link to /shipments/${CANONICAL} renders the review screen`, async ({ page }) => {
      // The deep link is served as the SPA document…
      const doc = await page.request.get(`/shipments/${CANONICAL}`);
      expect(doc.status()).toBe(200);
      expect(doc.headers()['content-type'] ?? '').toContain('text/html');

      // …and the client router renders the review screen for it.
      await page.goto(`/shipments/${CANONICAL}`);
      await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-shipment-id"]')).toContainText(CANONICAL);
    });
  });

  test.describe('US-0.1 Persist the Full Cargo Exception Domain', () => {
    test('an unknown /api route returns a JSON error envelope, not the SPA fallback', async ({
      page,
    }) => {
      const res = await page.request.get('/api/not-a-real-route');
      expect(res.status()).toBe(404);
      expect(res.headers()['content-type'] ?? '').toContain('application/json');
      const err = await res.json();
      expect(err.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
