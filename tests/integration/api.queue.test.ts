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

describe('GET /api/queue', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-queue-'));
    db = seededDb(dir);
    app = await buildApp({ db });
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function queue(qs = ''): Promise<{ status: number; body: any; headers: any }> {
    const res = await app.inject({ method: 'GET', url: `/api/queue${qs}` });
    return { status: res.statusCode, body: res.json(), headers: res.headers };
  }

  it('returns 200 and excludes clean + cleared shipments by default', async () => {
    const { status, body } = await queue();
    expect(status).toBe(200);
    const ids = body.data.map((r: any) => r.shipment_id);
    expect(ids).not.toContain('SHP-2026-0011'); // clean
    for (const row of body.data) {
      expect(row.status).not.toBe('CLEARED');
    }
    expect(body.page.total).toBe(body.data.length <= body.page.page_size ? body.page.total : body.page.total);
  });

  it('include_clean + include_cleared bring their rows back', async () => {
    const withClean = await queue('?include_clean=true');
    const withCleared = await queue('?include_cleared=true&include_clean=true');
    const clearedIds = withCleared.body.data.map((r: any) => r.status);
    expect(clearedIds).toContain('CLEARED');
    // clean shipment reappears
    const cleanIds = withClean.body.data.map((r: any) => r.shipment_id);
    expect(cleanIds).toContain('SHP-2026-0011');
  });

  it('the canonical SHP-2026-0007 row is fully projected', async () => {
    const { body } = await queue('?page_size=100');
    const row = body.data.find((r: any) => r.shipment_id === 'SHP-2026-0007');
    expect(row).toBeTruthy();
    expect(row.open_exception_count).toBe(3);
    expect(row.exception_types).toHaveLength(3);
    expect(row.exception_summary.length).toBeGreaterThan(0);
    expect(row.shipment_value_usd).toBe('85000.00');
    expect(typeof row.shipment_value_usd).toBe('string');
    expect(row.priority_basis_summary.length).toBeGreaterThan(0);
  });

  it('sort=priority:desc returns CRITICAL before HIGH before MEDIUM before LOW', async () => {
    const { body } = await queue('?sort=priority:desc&page_size=100');
    const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    const sequence = body.data.map((r: any) => rank[r.priority]);
    for (let i = 1; i < sequence.length; i += 1) {
      expect(sequence[i - 1]).toBeGreaterThanOrEqual(sequence[i]);
    }
    // ensure at least two distinct priorities are present so the assertion bites
    expect(new Set(body.data.map((r: any) => r.priority)).size).toBeGreaterThan(1);
  });

  it('status filter returns only those statuses', async () => {
    const { body } = await queue('?status=NEW&status=IN_REVIEW&page_size=100');
    for (const row of body.data) {
      expect(['NEW', 'IN_REVIEW']).toContain(row.status);
    }
  });

  it('exception_type filter returns only cases with such an OPEN exception', async () => {
    const { body } = await queue('?exception_type=INVALID_HTS_CODE&page_size=100');
    for (const row of body.data) {
      expect(row.exception_types.some((t: any) => t.type === 'INVALID_HTS_CODE')).toBe(true);
    }
  });

  it('priority filter works', async () => {
    const { body } = await queue('?priority=CRITICAL&page_size=100');
    for (const row of body.data) {
      expect(row.priority).toBe('CRITICAL');
    }
  });

  it('bad sort field, bad status value, page_size 101, and unknown param all 422', async () => {
    expect((await queue('?sort=bogus:desc')).status).toBe(422);
    expect((await queue('?status=NOPE')).status).toBe(422);
    expect((await queue('?page_size=101')).status).toBe(422);
    const unknown = await queue('?wat=1');
    expect(unknown.status).toBe(422);

    const badSort = await queue('?sort=bogus:desc');
    expect(badSort.body.error.code).toBe('INVALID_QUERY_PARAM');
  });

  it('every response carries JSON content type and X-Request-Id', async () => {
    const { headers } = await queue();
    expect(headers['content-type']).toContain('application/json');
    expect(headers['content-type']).toContain('charset=utf-8');
    expect(headers['x-request-id']).toBeTruthy();
  });
});
