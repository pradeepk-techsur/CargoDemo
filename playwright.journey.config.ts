import { defineConfig, devices } from '@playwright/test';

/**
 * The journey harness. It drives the PRODUCTION path — the single start command
 * an operator types — against a throwaway ./data/journey.db, so the one
 * end-to-end proof always begins from a freshly seeded canonical shipment.
 *
 * `retries: 0` is deliberate: a flaky pass on the headline proof is worse than a
 * red run, because it would be believed. The webServer command is `npm start`
 * and nothing else — prestart builds the bundle and the readiness probe is the
 * real queue endpoint.
 */
export default defineConfig({
  testDir: 'e2e/journey',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: 'rm -f ./data/journey.db ./data/journey.db-wal ./data/journey.db-shm && npm start',
    url: 'http://127.0.0.1:3000/api/queue',
    env: { CARGODEMO_DB_PATH: './data/journey.db', CARGODEMO_SEED_ON_EMPTY: 'true' },
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
