import { defineConfig, devices } from '@playwright/test';

// The suite drives the PRODUCTION path — the built bundle served by the real
// start command on port 3000 — not the Vite dev server, because that is what
// the preview runs. It uses a throwaway database wiped before each run, so the
// one mutating spec (cross-screen) gets a fresh deterministic seed. The
// readiness probe is a real endpoint (GET /api/queue): there is no health
// endpoint, because that belongs to a deferred feature.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // one server, one SQLite file, mutating specs
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command:
      'rm -rf ./data/e2e.db ./data/e2e.db-wal ./data/e2e.db-shm && npm run build:client && npm start',
    url: 'http://127.0.0.1:3000/api/queue',
    env: { CARGODEMO_DB_PATH: './data/e2e.db', CARGODEMO_SEED_ON_EMPTY: 'true' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
