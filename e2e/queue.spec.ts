import { test, expect } from '@playwright/test';

/**
 * F17's acceptance criteria as browser assertions. This spec is read-only: it
 * never mutates a case, so it is order-independent from the mutating cross-screen
 * spec, and it never asserts an exact total row count.
 */

test.describe('Cargo Exception Queue', () => {
  test('lands at the root with the flagged shipments — no login, no redirect', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="queue-screen"]')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Cargo Exception Queue');
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    const rows = page.locator('[data-testid="queue-row"]');
    expect(await rows.count()).toBeGreaterThan(0);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('renders the mandated columns', async ({ page }) => {
    await page.goto('/');
    const headers = page.locator('[data-testid="queue-table"] thead th');
    const texts = await headers.allInnerTexts();
    const joined = texts.join(' | ').toLowerCase();
    for (const col of ['shipment id', 'importer', 'exception(s)', 'priority', 'status']) {
      expect(joined).toContain(col);
    }
  });

  test('a multi-exception shipment shows one chip per type, never a count', async ({
    page,
  }) => {
    await page.goto('/');
    const row = page.locator('[data-testid="queue-row-SHP-2026-0007"]');
    await expect(row).toBeVisible();
    const tr = page.locator('[data-testid="queue-row"]', {
      has: page.locator('[data-testid="queue-row-SHP-2026-0007"]'),
    });
    const chips = tr.locator('[data-testid="queue-row-exception-chip"]');
    await expect(chips).toHaveCount(3);
    const types = await chips.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-exception-type')),
    );
    expect(new Set(types).size).toBe(3);
    await expect(tr).not.toContainText(/3 exceptions/);
  });

  test('clean entries stay off the queue by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="queue-row-SHP-2026-0011"]')).toHaveCount(0);

    // Enable the include-clean toggle and the clean shipment appears.
    await page
      .locator('[data-testid="queue-filter-status"]')
      .waitFor(); // filters mounted
    await page.getByLabel('Clean entries').check();
    await expect(page.locator('[data-testid="queue-row-SHP-2026-0011"]')).toBeVisible();
  });

  test('priority ordering is deterministic and non-increasing', async ({ page }) => {
    await page.goto('/?sort=priority:desc');
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    const rank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };
    const labels = await page
      .locator('[data-testid="queue-row-priority"]')
      .allInnerTexts();
    const ranks = labels.map((t) => {
      const match = Object.keys(rank).find((k) => t.includes(k));
      return match ? rank[match] : -1;
    });
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
    }
  });

  test('filtering goes through the server and clearing restores the set', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    const beforeCount = await page.locator('[data-testid="queue-row"]').count();

    // Select the INVALID_HTS_CODE exception-type filter ("Incomplete HTS").
    await page.getByLabel('Incomplete HTS').check();
    await expect(page.locator('[data-testid="queue-applied-filters"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();

    const filteredCount = await page.locator('[data-testid="queue-row"]').count();
    expect(filteredCount).toBeLessThanOrEqual(beforeCount);

    // Every remaining row carries a chip of that type.
    const rows = page.locator('[data-testid="queue-row"]');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const types = await rows
        .nth(i)
        .locator('[data-testid="queue-row-exception-chip"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-exception-type')));
      expect(types).toContain('INVALID_HTS_CODE');
    }

    await page.locator('[data-testid="queue-clear-filters"]').first().click();
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    expect(await page.locator('[data-testid="queue-row"]').count()).toBe(beforeCount);
  });

  test('a rejected filter surfaces the server error — it never silently widens', async ({
    page,
  }) => {
    await page.goto('/?priority=URGENT');
    await expect(page.locator('[data-testid="queue-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-error"]')).toContainText(/req[-_]/);
    await expect(page.locator('[data-testid="queue-table"]')).toHaveCount(0);
  });

  test('a row navigates to the review URL by pointer', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="queue-row-SHP-2026-0007"]').click();
    await expect(page).toHaveURL(/\/shipments\/SHP-2026-0007$/);
  });

  test('a row navigates to the review URL by keyboard', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('[data-testid="queue-row"]', {
      has: page.locator('[data-testid="queue-row-SHP-2026-0007"]'),
    });
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/shipments\/SHP-2026-0007$/);
  });

  test('the queue screen has no action controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    const buttons = page.locator('[data-testid="queue-screen"] button');
    const names = await buttons.allInnerTexts();
    for (const name of names) {
      expect(name).not.toMatch(/approve|clear exception|hold|escalate|request info/i);
    }
  });
});
