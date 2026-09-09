import { test, expect } from '@playwright/test';

/**
 * The loop that only exists when both screens are built. The ONLY spec in this
 * plan that mutates state — it acts on SHP-2026-0001, never the canonical
 * SHP-2026-0007, so every other spec (and wave 5) sees the canonical row at its
 * seeded state.
 */

test.describe.serial('cross-screen — submit, propagate, reject', () => {
  let statusBefore = '';

  test('submit an action with a justification, confirmation names the change', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('[data-testid="queue-row-SHP-2026-0001"]').click();
    await expect(page).toHaveURL(/\/shipments\/SHP-2026-0001$/);
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

    statusBefore = (await page.locator('[data-testid="review-status"]').innerText()).trim();

    // Prefer PLACE_ON_HOLD; else the first available non-clearing action.
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

    // PLACE_ON_HOLD and ESCALATE default to a non-OTHER reason, so no detail is
    // required. Just fill the justification comfortably above the minimum.
    const justification =
      'Documented reasoning for this disposition, entered by the reviewing specialist for the audit record.';
    await page.locator('[data-testid="justification-input"]').fill(justification);

    const submit = page.locator('[data-testid="action-submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    const confirmation = page.locator('[data-testid="action-confirmation"]');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(justification);
    await expect(confirmation).toContainText('→');
  });

  test('the new status is visible on the review screen', async ({ page }) => {
    await page.goto('/shipments/SHP-2026-0001');
    await expect(page.locator('[data-testid="review-status"]')).toBeVisible();
    const now = (await page.locator('[data-testid="review-status"]').innerText()).trim();
    expect(now).not.toBe(statusBefore);
  });

  test('the new status propagates to the queue', async ({ page }) => {
    await page.goto('/shipments/SHP-2026-0001');
    const now = (await page.locator('[data-testid="review-status"]').innerText()).trim();

    await page.locator('[data-testid="back-to-queue"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();

    const row = page.locator('[data-testid="queue-row"]', {
      has: page.locator('[data-testid="queue-row-SHP-2026-0001"]'),
    });
    await expect(row.locator('[data-testid="queue-row-status"]')).toContainText(now);
  });

  test('a rejection is surfaced and the input survives', async ({ page }) => {
    await page.goto('/shipments/SHP-2026-0001');
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();

    // Pick any available action; fill the required fields and a justification.
    const anyAvail = page.locator('[data-testid^="action-option-"][data-available="true"]');
    expect(await anyAvail.count()).toBeGreaterThan(0);
    let chosen = await anyAvail.first().getAttribute('data-testid');
    chosen = chosen?.replace('action-option-', '') ?? null;
    expect(chosen).not.toBeNull();

    await page.locator(`[data-testid="action-option-${chosen}"] input[type="radio"]`).check();
    if (chosen === 'CLEAR_EXCEPTION') {
      // resolution_basis defaults to EXCEPTIONS_RESOLVED (min length 40 accepted).
    }

    const typed =
      'Re-submitting after the case changed out from under me, to prove the server rejection is surfaced and my typed text is preserved verbatim.';
    await page.locator('[data-testid="justification-input"]').fill(typed);

    // Mutate the case out-of-band so the panel's held case_version goes stale.
    // The next submit must produce 409 CASE_VERSION_CONFLICT rather than a silent
    // retry — the rejection this test exists to prove.
    const caseId = 'case-0001';
    const detail = await (await page.request.get('/api/shipments/SHP-2026-0001')).json();
    const staleVersion = detail.case.case_version;
    await page.request.post(`/api/cases/${caseId}/actions`, {
      headers: {
        'Content-Type': 'application/json',
        'If-Match-Case-Version': String(staleVersion),
      },
      data: {
        action: 'SEND_FOR_SPECIALIST_REVIEW',
        justification:
          'Out-of-band transition to advance the case version before the UI resubmits.',
      },
    });

    const submit = page.locator('[data-testid="action-submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    const error = page.locator('[data-testid="action-error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/req[-_]/);

    // The typed justification survives the rejection.
    await expect(page.locator('[data-testid="justification-input"]')).toHaveValue(typed);
  });

  test('no orphan navigation — every href resolves to a served route', async ({ page }) => {
    /**
     * Two kinds of link are legitimate, and both are checked:
     *
     *  - ROUTE links must address one of the two served routes, so no control can
     *    navigate to a deferred screen.
     *  - IN-PAGE FRAGMENT links (the shell's WCAG 2.4.1 "Skip to main content")
     *    are not route navigation at all. They are held to the equivalent
     *    standard for their own kind: the element they target must exist on the
     *    page, or the link is just as orphaned as a bad route.
     */
    const collect = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map((a) => {
          const href = a.getAttribute('href') ?? '';
          return {
            href,
            fragmentTargetExists: href.startsWith('#')
              ? Boolean(document.getElementById(href.slice(1)))
              : null,
          };
        }),
      );

    const assertAll = (links: Awaited<ReturnType<typeof collect>>) => {
      for (const link of links) {
        if (link.href.startsWith('#')) {
          expect(
            link.fragmentTargetExists,
            `in-page link ${link.href} points at no element on this page`,
          ).toBe(true);
          continue;
        }
        expect(
          link.href === '/' || /^\/shipments\/[^/]+$/.test(link.href),
          `unexpected route href: ${link.href}`,
        ).toBe(true);
      }
    };

    // Queue.
    await page.goto('/');
    await expect(page.locator('[data-testid="queue-table"]')).toBeVisible();
    assertAll(await collect());

    // Review.
    await page.goto('/shipments/SHP-2026-0007');
    await expect(page.locator('[data-testid="review-screen"]')).toBeVisible();
    assertAll(await collect());
  });
});
