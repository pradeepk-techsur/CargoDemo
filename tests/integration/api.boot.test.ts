import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { openDb, type Db } from '../../src/infra/db/connection.js';
import { runMigrations } from '../../src/infra/db/migrate.js';
import { runSchemaSelfCheck } from '../../src/infra/db/schemaSelfCheck.js';
import { runSeed } from '../../src/app/seedService.js';
import { createEvaluateHook } from '../../src/app/evaluationService.js';
import { SeedClock } from '../../src/infra/clock.js';
import { DeterministicIdGenerator } from '../../src/infra/ids.js';
import { buildApp } from '../../src/server/app.js';
import { ROUTES } from '../../src/server/routes/registry.js';

function seededDb(dir: string): Db {
  const db = openDb(join(dir, 'test.db'));
  runMigrations(db);
  runSchemaSelfCheck(db);
  runSeed(db, {
    mode: 'SEED_IF_EMPTY',
    evaluate: createEvaluateHook({
      trigger: 'SEED',
      clock: new SeedClock(),
      ids: new DeterministicIdGenerator('evd-seed-'),
    }),
  });
  return db;
}

describe('api boot + context wiring', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-boot-'));
    db = seededDb(dir);
    app = await buildApp({ db });
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('buildApp builds and is ready without throwing', () => {
    expect(app).toBeTruthy();
  });

  it('ROUTES contains GET /api/queue; every route has a schema and a unique (method,url); all /api', () => {
    const hasQueue = ROUTES.some((r) => r.method === 'GET' && r.url === '/api/queue');
    expect(hasQueue).toBe(true);

    const seen = new Set<string>();
    for (const r of ROUTES) {
      expect(r.schema, `${r.url} schema`).toBeTruthy();
      expect(Object.keys(r.schema).length, `${r.url} schema non-empty`).toBeGreaterThan(0);
      expect(r.url.startsWith('/api/'), `${r.url} starts with /api/`).toBe(true);
      const key = `${r.method} ${r.url}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('GET /api/nope → 404 RESOURCE_NOT_FOUND with a request_id matching X-Request-Id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(body.error.request_id).toBe(res.headers['x-request-id']);
  });

  it('a non-/api path → 200 SPA fallback, not 404 and not 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/dashboard' });
    expect(res.statusCode).toBe(200);
    // Two valid shapes: the "client bundle not built" text/plain notice when
    // dist/client is absent, or the built SPA index.html once wave 4 has run
    // `npm run build:client`. Either is a 200 (never a 404 or 500).
    const servedBundle =
      (res.headers['content-type'] as string | undefined)?.includes('text/html') ?? false;
    if (servedBundle) {
      expect(res.body).toContain('<div id="root">');
    } else {
      expect(res.body).toContain('CargoDemo API is running');
    }
  });

  describe('iframe safety — no framing header, ever', () => {
    const targets = ['/api/queue', '/api/nope', '/dashboard'];
    it('no response carries X-Frame-Options and the CSP has no frame-ancestors directive', async () => {
      for (const url of targets) {
        const res = await app.inject({ method: 'GET', url });
        // The framing header must be ABSENT, not merely permissive.
        expect(res.headers['x-frame-options'], `x-frame-options on ${url}`).toBeUndefined();
        const csp = res.headers['content-security-policy'] as string | undefined;
        expect(csp, `CSP present on ${url}`).toBeTruthy();
        expect(csp!.toLowerCase()).not.toContain('frame-ancestors');
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self'");
        expect(csp).toContain("connect-src 'self'");
        // no HSTS, no CORS
        expect(res.headers['strict-transport-security']).toBeUndefined();
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      }
    });

    it('/api/* responses carry Cache-Control: no-store', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/queue' });
      expect(res.headers['cache-control']).toBe('no-store');
    });
  });
});
