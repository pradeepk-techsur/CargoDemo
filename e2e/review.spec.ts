import { test, expect } from '@playwright/test';

/**
 * The review screen's own contract, READ-ONLY. It must not mutate a case, so it
 * is order-independent from the mutating cross-screen spec. It works on the
 * canonical SHP-2026-0007 and leaves it untouched.
 */

test.describe('Shipment Review', () => {
  test('is reached by clicking a queue row and renders', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="queue-row-SHP-2026-0007"]').click();
    await expect(page).toHaveURL(/\/shipments\/SHP-2026-0007$/);
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
  });

  test('renders the whole case on one screen, conflict readable side by side', async ({
    page,
  }) => {
    await page.goto('/shipments/SHP-2026-0007');
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

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
      await expect(page.locator(`[data-testid="entry-field-${f}"]`)).not.toBeEmpty();
    }
    await expect(page.locator('[data-testid="entry-field-country-of-origin"]')).toContainText(
      'Malaysia',
    );
    await expect(page.locator('[data-testid="entry-field-manufacturer-address"]')).toContainText(
      'China',
    );
  });

  test('lists documents including a missing one as an explicit absence', async ({ page }) => {
    await page.goto('/shipments/SHP-2026-0007');
    await expect(page.locator('[data-testid="documents-panel"]')).toBeVisible();
    expect(
      await page.locator('[data-document-status="RECEIVED"]').count(),
    ).toBeGreaterThanOrEqual(1);
    const cert = page.locator('[data-testid="document-row-CERTIFICATE_OF_ORIGIN"]');
    // The status attribute lives on the outer <li>.
    const certRow = page.locator(
      '[data-testid="document-row"][data-document-type="CERTIFICATE_OF_ORIGIN"]',
    );
    await expect(certRow).toHaveAttribute('data-document-status', 'NOT_RECEIVED');
    await expect(cert).toContainText('Not received');
  });

  test('renders every open exception with evidence', async ({ page }) => {
    await page.goto('/shipments/SHP-2026-0007');
    const cards = page.locator('[data-testid="exception-card"]');
    await expect(cards).toHaveCount(3);

    const types = await cards.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-exception-type')),
    );
    expect(new Set(types)).toEqual(
      new Set(['MISSING_REQUIRED_DOCUMENT', 'INVALID_HTS_CODE', 'CONFLICTING_COUNTRY_OF_ORIGIN']),
    );

    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      await expect(card.locator('[data-testid="exception-rule-name"]')).not.toBeEmpty();
      await expect(card.locator('[data-testid="exception-policy-reference"]')).not.toBeEmpty();
      await expect(card.locator('[data-testid="exception-assertion"]')).not.toBeEmpty();
      expect(await card.locator('[data-testid="evidence-row"]').count()).toBeGreaterThanOrEqual(1);
    }

    const originCard = page.locator(
      '[data-testid="exception-card"][data-exception-type="CONFLICTING_COUNTRY_OF_ORIGIN"]',
    );
    await expect(originCard).toContainText('Malaysia');
    await expect(originCard).toContainText('China');

    const htsCard = page.locator(
      '[data-testid="exception-card"][data-exception-type="INVALID_HTS_CODE"]',
    );
    await expect(htsCard).toContainText('8541.40');

    const docCard = page.locator(
      '[data-testid="exception-card"][data-exception-type="MISSING_REQUIRED_DOCUMENT"]',
    );
    await expect(docCard.locator('[data-testid="exception-missing-information"]')).toContainText(
      'CERTIFICATE_OF_ORIGIN',
    );
  });

  test('renders all five actions, always, with reasons for unavailable ones', async ({
    page,
  }) => {
    await page.goto('/shipments/SHP-2026-0007');
    const options = page.locator('[data-testid^="action-option-"]');
    await expect(options).toHaveCount(5);

    const unavailable = page.locator('[data-testid^="action-option-"][data-available="false"]');
    const un = await unavailable.count();
    for (let i = 0; i < un; i++) {
      const reason = unavailable.nth(i).locator('[data-testid="action-unavailable-reason"]');
      await expect(reason).toBeVisible();
      await expect(reason).not.toBeEmpty();
    }
  });

  test('justification gates the submit in three steps, without submitting', async ({
    page,
  }) => {
    await page.goto('/shipments/SHP-2026-0007');

    // Pick an available action that is NOT CLEAR_EXCEPTION.
    const preferred = ['PLACE_ON_HOLD', 'SEND_FOR_SPECIALIST_REVIEW', 'ESCALATE_TO_SUPERVISOR'];
    let chosen: string | null = null;
    for (const a of preferred) {
      const opt = page.locator(`[data-testid="action-option-${a}"][data-available="true"]`);
      if ((await opt.count()) > 0) {
        chosen = a;
        break;
      }
    }
    expect(chosen).not.toBeNull();

    await page.locator(`[data-testid="action-option-${chosen}"] input[type="radio"]`).check();

    const textarea = page.locator('[data-testid="justification-input"]');
    await expect(textarea).toHaveValue(''); // empty on arrival

    const submit = page.locator('[data-testid="action-submit"]');
    await expect(submit).toBeDisabled();

    await textarea.fill('abc');
    await expect(submit).toBeDisabled();
    await expect(page.locator('[data-testid="justification-counter"]')).toContainText('minimum');

    await textarea.fill('x'.repeat(60));
    await expect(submit).toBeEnabled();

    // Leave the canonical shipment untouched — reload instead of submitting.
    await page.reload();
  });

  test('a missing shipment renders the not-found view with a back link', async ({ page }) => {
    await page.goto('/shipments/SHP-9999-0000');
    await expect(page.locator('[data-testid="review-not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-queue"]')).toBeVisible();
  });

  test('nothing deferred is on screen', async ({ page }) => {
    await page.goto('/shipments/SHP-2026-0007');
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(
      /AI[- ]generated|Recommended action|Model confidence|Revalidate|Audit (record|trail)|Upload|Approve clearance|Supervisor approval/i,
    );
  });
});
