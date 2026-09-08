import { test, expect } from '@playwright/test';

/**
 * The harness proof, and four assertions that stay true for the life of the
 * project — they are properties of the SERVED DOCUMENT, not of any screen, so
 * they hold now (only the not-found is routed) and after Tasks 2 and 3.
 */

test.describe('shell — the served document', () => {
  test('the document is served and the app mounts', async ({ page }) => {
    const res = await page.goto('/');
    expect(res).not.toBeNull();
    expect(res!.status()).toBe(200);
    expect(res!.headers()['content-type'] ?? '').toContain('text/html');

    // The bundle executed: #root is not empty.
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('nothing frame-blocking is on the wire', async ({ page }) => {
    const res = await page.goto('/');
    const headers = res!.headers(); // Playwright lowercases header names.

    expect(
      headers['x-frame-options'],
      'remove the header rather than relaxing this check — X-Frame-Options blanks the preview iframe',
    ).toBeUndefined();

    const csp = headers['content-security-policy'] ?? headers['content-security-policy-report-only'];
    if (csp) {
      expect(
        csp,
        'remove the frame-ancestors directive rather than relaxing this check — it blanks the preview iframe',
      ).not.toContain('frame-ancestors');
    }
  });

  test('the API is same-origin and owns /api', async ({ page }) => {
    const ok = await page.request.get('/api/queue');
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(Array.isArray(body.data)).toBe(true);

    // The SPA fallback is registered AFTER the API and cannot swallow an API 404.
    const notFound = await page.request.get('/api/not-a-route');
    expect(notFound.status()).toBe(404);
    expect(notFound.headers()['content-type'] ?? '').toContain('application/json');
    const err = await notFound.json();
    expect(err.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  test('a deep link returns the same SPA document', async ({ page }) => {
    const res = await page.request.get('/shipments/SHP-2026-0007');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('text/html');
  });
});
