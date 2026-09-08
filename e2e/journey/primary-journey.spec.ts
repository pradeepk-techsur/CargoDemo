import { test, expect, type Page } from '@playwright/test';

/**
 * The one end-to-end proof of the in-scope journey slice, driven against the
 * PRODUCTION path — the built bundle served by the single start command on a
 * throwaway ./data/journey.db that did not exist when the run began.
 *
 * It proves ONLY the front portion of JRN-01.1 that this build implements:
 *   1. the queue loads and lists flagged shipments;
 *   2. the canonical solar-panel shipment SHP-2026-0007 opens;
 *   3. its three exceptions render with triggering rule, authority and
 *      field-level evidence;
 *   4. PLACE_ON_HOLD is submitted with a mandatory justification the test types;
 *   5. the resulting state change is visible on the review screen and the queue.
 *
 * It asserts NOTHING about the deferred, out-of-scope surfaces (AI summary,
 * recommendation, confidence, document request/upload, revalidation, supervisor
 * approval, audit trail) except a single negative assertion that none renders.
 */

const CANONICAL = 'SHP-2026-0007';

// The deferred surface names appear exactly once, here, for the final negative
// assertion in Stage 6.
const DEFERRED_SURFACES =
  /AI[- ]generated|Recommended action|Model confidence|Revalidate|Audit (record|trail)|Upload|Approve clearance|Supervisor approval/i;

const THREE_EXCEPTION_TYPES = [
  'MISSING_REQUIRED_DOCUMENT',
  'INVALID_HTS_CODE',
  'CONFLICTING_COUNTRY_OF_ORIGIN',
].sort();

test.describe.serial('primary journey — flagged queue to a justified, propagated decision', () => {
  let page: Page;
  let statusBefore = '';

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Stage 1 — the queue loads and lists flagged shipments', async () => {
    const response = await page.goto('/');
    await expect(page.locator('[data-testid="queue-screen"]')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Cargo Exception Queue');

    // No login, no redirect: the root path IS the queue.
    expect(page.url().endsWith('/')).toBe(true);

    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    // The queue is not empty on first load, from a database that did not exist
    // 30 seconds ago.
    expect(await page.locator('[data-testid="queue-row"]').count()).toBeGreaterThanOrEqual(1);

    // The mandated columns are present. innerText reflects the CSS text-transform
    // (the header renders upper-cased), so compare case-insensitively.
    const headerText = (
      await page.locator('[data-testid="queue-table"] thead').innerText()
    ).toLowerCase();
    for (const col of ['shipment id', 'importer', 'exception', 'priority', 'status']) {
      expect(headerText).toContain(col);
    }

    // The document the iframe actually loads carries no frame-blocking header.
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers['x-frame-options']).toBeUndefined();
    const csp = headers['content-security-policy'];
    if (csp) expect(csp).not.toMatch(/frame-ancestors/i);
  });

  test('Stage 2 — the canonical solar-panel shipment is on the queue and opens', async () => {
    const canonicalId = page.locator(`[data-testid="queue-row-${CANONICAL}"]`);
    await expect(canonicalId).toBeVisible();

    // The row (the <tr>) carrying the canonical shipment.
    const row = page.locator('[data-testid="queue-row"]', {
      has: page.locator(`[data-testid="queue-row-${CANONICAL}"]`),
    });

    // Exactly three distinct exception chips — not collapsed into "3 exceptions".
    const chips = row.locator('[data-testid="queue-row-exception-chip"]');
    await expect(chips).toHaveCount(3);
    const chipTypes = (
      await chips.evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).getAttribute('data-exception-type')),
      )
    ).sort();
    expect(chipTypes).toEqual(THREE_EXCEPTION_TYPES);
    await expect(row.locator('[data-testid="queue-row-exceptions"]')).not.toContainText(
      /\b3 exceptions\b/,
    );

    // Critical / New at rest.
    await expect(row.locator('[data-testid="queue-row-priority"]')).toContainText('Critical');
    const statusCell = row.locator('[data-testid="queue-row-status"]');
    await expect(statusCell).toContainText('New');
    statusBefore = (await statusCell.innerText()).trim();

    // Clicking the row — the only inbound navigation to the review screen.
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/shipments/${CANONICAL}$`));
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
  });

  test('Stage 3 — the exceptions render with their triggering rule and field-level evidence', async () => {
    // Entry fields all render and are non-empty.
    const fields = [
      'importer',
      'carrier',
      'product-description',
      'hts-code',
      'country-of-origin',
      'manufacturer-name',
      'manufacturer-address',
      'shipment-value',
      'entry-date',
    ];
    for (const f of fields) {
      const el = page.locator(`[data-testid="entry-field-${f}"]`);
      await expect(el).toBeVisible();
      expect((await el.innerText()).trim().length).toBeGreaterThan(0);
    }
    // The conflict must be readable side by side.
    await expect(page.locator('[data-testid="entry-field-country-of-origin"]')).toContainText(
      'Malaysia',
    );
    await expect(page.locator('[data-testid="entry-field-manufacturer-address"]')).toContainText(
      'China',
    );

    // The missing certificate is shown as an absence. The <li> row carries
    // data-document-type + data-document-status; the inner block carries the
    // document-row-{TYPE} testid and the visible label.
    const cooRow = page.locator(
      '[data-testid="document-row"][data-document-type="CERTIFICATE_OF_ORIGIN"]',
    );
    await expect(cooRow).toBeVisible();
    await expect(cooRow).toHaveAttribute('data-document-status', 'NOT_RECEIVED');
    await expect(
      page.locator('[data-testid="document-row-CERTIFICATE_OF_ORIGIN"]'),
    ).toContainText(/Not received/i);

    // Exactly three exception cards, one per canonical type.
    const cards = page.locator('[data-testid="exception-card"]');
    await expect(cards).toHaveCount(3);
    const cardTypes = (
      await cards.evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).getAttribute('data-exception-type')),
      )
    ).sort();
    expect(cardTypes).toEqual(THREE_EXCEPTION_TYPES);

    // Every card carries rule name, authority, assertion and >= 1 evidence row.
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      expect((await card.locator('[data-testid="exception-rule-name"]').innerText()).trim().length).toBeGreaterThan(0);
      expect(
        (await card.locator('[data-testid="exception-policy-reference"]').innerText()).trim().length,
      ).toBeGreaterThan(0);
      expect((await card.locator('[data-testid="exception-assertion"]').innerText()).trim().length).toBeGreaterThan(0);
      expect(await card.locator('[data-testid="evidence-row"]').count()).toBeGreaterThanOrEqual(1);
    }

    // Field-level evidence, specifically.
    const originCard = page.locator(
      '[data-testid="exception-card"][data-exception-type="CONFLICTING_COUNTRY_OF_ORIGIN"]',
    );
    const originText = await originCard.innerText();
    expect(originText).toContain('Malaysia');
    expect(originText).toContain('China');

    const htsCard = page.locator(
      '[data-testid="exception-card"][data-exception-type="INVALID_HTS_CODE"]',
    );
    const htsText = await htsCard.innerText();
    expect(htsText).toContain('8541.40');
    expect(htsText).toContain('10');
    expect(htsText).toContain('6');

    const docCard = page.locator(
      '[data-testid="exception-card"][data-exception-type="MISSING_REQUIRED_DOCUMENT"]',
    );
    await expect(
      docCard.locator('[data-testid="exception-missing-information"]'),
    ).toContainText('CERTIFICATE_OF_ORIGIN');
  });

  test('Stage 4 — an action is submitted with a mandatory justification', async () => {
    // Exactly five action options render; unavailable ones show a visible reason.
    const options = page.locator('[data-testid^="action-option-"]');
    await expect(options).toHaveCount(5);
    const unavailable = page.locator('[data-testid^="action-option-"][data-available="false"]');
    const unavailableCount = await unavailable.count();
    for (let i = 0; i < unavailableCount; i++) {
      const reason = unavailable.nth(i).locator('[data-testid="action-unavailable-reason"]');
      await expect(reason).toBeVisible();
      expect((await reason.innerText()).trim().length).toBeGreaterThan(0);
    }

    // Select PLACE_ON_HOLD (available from NEW) and a non-OTHER hold reason.
    await page
      .locator('[data-testid="action-option-PLACE_ON_HOLD"] input[type="radio"]')
      .check();
    await page
      .locator('[data-testid="field-hold-reason"] select')
      .selectOption('AWAITING_EXTERNAL_INPUT');

    const justification = page.locator('[data-testid="justification-input"]');
    // The textarea was empty on arrival — nothing prefilled it.
    expect(await justification.inputValue()).toBe('');

    const submit = page.locator('[data-testid="action-submit"]');

    // Empty justification: submit disabled.
    await expect(submit).toBeDisabled();

    // Three characters: still disabled, and the counter shows the shortfall.
    await justification.fill('abc');
    await expect(submit).toBeDisabled();
    await expect(page.locator('[data-testid="justification-counter"]')).toBeVisible();

    // A full sentence of >= 40 characters: now enabled.
    const reason =
      'Placing on hold pending confirmation of the certificate of origin and HTS classification from the importer.';
    expect(reason.length).toBeGreaterThanOrEqual(40);
    await justification.fill(reason);
    await expect(submit).toBeEnabled();

    await submit.click();

    // The confirmation quotes the justification verbatim and names the change.
    const confirmation = page.locator('[data-testid="action-confirmation"]');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(reason);
    await expect(confirmation).toContainText(/On hold/i);
  });

  test('Stage 5 — the state change is visible on both screens', async () => {
    // Review screen now reads On hold and no longer reads the prior status.
    const reviewStatus = page.locator('[data-testid="review-status"]');
    await expect(reviewStatus).toContainText('On hold');
    expect((await reviewStatus.innerText()).trim()).not.toBe(statusBefore);

    // Back to the queue; the decision propagated to the list a colleague works.
    await page.locator('[data-testid="back-to-queue"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();

    const row = page.locator('[data-testid="queue-row"]', {
      has: page.locator(`[data-testid="queue-row-${CANONICAL}"]`),
    });
    await expect(row.locator('[data-testid="queue-row-status"]')).toContainText('On hold');
  });

  test('Stage 6 — integrity guards', async () => {
    // No dead nav target (runtime half) — on the queue.
    let hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    );
    for (const href of hrefs) {
      expect(href === '/' || /^\/shipments\/[^/]+$/.test(href ?? '')).toBe(true);
    }

    // And on the review screen.
    await page.goto(`/shipments/${CANONICAL}`);
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
    hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    );
    for (const href of hrefs) {
      expect(href === '/' || /^\/shipments\/[^/]+$/.test(href ?? '')).toBe(true);
    }

    // An unknown shipment renders the not-found view with a working back link,
    // not a blank page or a crash.
    await page.goto('/shipments/SHP-9999-0000');
    await expect(page.locator('[data-testid="review-not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-queue"]')).toBeVisible();

    // Nothing deferred rendered — on both screens.
    await page.goto('/');
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(DEFERRED_SURFACES);

    await page.goto(`/shipments/${CANONICAL}`);
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(DEFERRED_SURFACES);
  });
});
