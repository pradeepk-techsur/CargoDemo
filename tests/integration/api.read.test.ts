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

describe('read surface', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-read-'));
    db = seededDb(dir);
    app = await buildApp({ db });
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('ROUTES equals exactly the six documented (method,url) pairs and each has a schema', () => {
    const expected = new Set([
      'GET /api/queue',
      'GET /api/shipments/:shipment_id',
      'GET /api/shipments/:shipment_id/exceptions',
      'GET /api/shipments/:shipment_id/documents',
      'GET /api/cases/:case_id/available-actions',
      'POST /api/cases/:case_id/actions',
    ]);
    expect(ROUTES).toHaveLength(6);
    const actual = new Set(ROUTES.map((r) => `${r.method} ${r.url}`));
    expect(actual).toEqual(expected);
    for (const r of ROUTES) expect(Object.keys(r.schema).length).toBeGreaterThan(0);
  });

  it('GET /api/shipments/SHP-2026-0007 returns the full, correctly-typed detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shipments/SHP-2026-0007' });
    expect(res.statusCode).toBe(200);
    const d = res.json();
    expect(d.manufacturer.address.country).toBe('China');
    expect(d.country_of_origin).toBe('Malaysia');
    expect(d.hts_code).toBe('8541.40');
    expect(d.hts_digit_count).toBe(6);
    expect(d.shipment_value_usd).toBe('85000.00');
    expect(typeof d.shipment_value_usd).toBe('string');
    expect(typeof d.case.case_version).toBe('number');
    expect(d.case.case_version).toBeGreaterThan(0);
    expect(Array.isArray(d.case.action_history)).toBe(true);
    expect(Object.keys(d._links).sort()).toEqual(
      ['actions', 'available_actions', 'documents', 'exceptions'],
    );
  });

  it('GET an unknown shipment → 404 RESOURCE_NOT_FOUND in the envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shipments/SHP-9999-0000' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('GET exceptions returns three OPEN with field-level evidence', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/shipments/SHP-2026-0007/exceptions',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.open).toHaveLength(3);
    for (const ex of body.open) {
      expect(ex.evidence.length).toBeGreaterThanOrEqual(1);
      expect(ex.rule.name.length).toBeGreaterThan(0);
      expect(ex.rule.policy_reference.length).toBeGreaterThan(0);
    }
    const origin = body.open.find((e: any) => e.exception_type === 'CONFLICTING_COUNTRY_OF_ORIGIN');
    const observed = origin.evidence.find((ev: any) => ev.kind === 'OBSERVED');
    const comparison = origin.evidence.find((ev: any) => ev.kind === 'COMPARISON');
    expect(observed.field_path).toBe('country_of_origin');
    expect(observed.raw_value).toBe('Malaysia');
    expect(observed.normalized_value).toBe('MY');
    expect(comparison.comparison_field_path).toBe('manufacturer.address.country');
    expect(comparison.comparison_raw_value).toBe('China');
    expect(comparison.comparison_normalized_value).toBe('CN');

    const hts = body.open.find((e: any) => e.exception_type === 'INVALID_HTS_CODE');
    const htsObserved = hts.evidence.find((ev: any) => ev.kind === 'OBSERVED');
    expect(htsObserved.expected).toBe('10 digits');
    expect(htsObserved.observed).toBe('6 digits');

    const doc = body.open.find((e: any) => e.exception_type === 'MISSING_REQUIRED_DOCUMENT');
    const mi = doc.missing_information.find((m: any) => m.document_type === 'CERTIFICATE_OF_ORIGIN');
    expect(mi).toBeTruthy();
    expect(mi.requirement.length).toBeGreaterThan(0);
    expect(mi.policy_reference.length).toBeGreaterThan(0);
  });

  it('GET documents shows received + missing certificate, Title Cased, requested null before any action', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/shipments/SHP-2026-0007/documents',
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as any[];
    const received = data.filter((d) => d.status === 'RECEIVED');
    expect(received.length).toBeGreaterThanOrEqual(3);
    for (const r of received) expect(r.filename).toBeTruthy();

    const coo = data.find((d) => d.document_type === 'CERTIFICATE_OF_ORIGIN');
    expect(coo.status).toBe('NOT_RECEIVED');
    expect(coo.display_name).toBe('Certificate Of Origin');
    expect(coo.required_by_rules.length).toBeGreaterThan(0);
    expect(coo.requested).toBeNull();
  });

  it('GET available-actions returns five entries, actor usr-cs-001, positive case_version; unknown case → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/case-0007/available-actions',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.actions).toHaveLength(5);
    expect(body.actor.id).toBe('usr-cs-001');
    expect(body.case_version).toBeGreaterThan(0);

    const unknown = await app.inject({
      method: 'GET',
      url: '/api/cases/case-9999/available-actions',
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('every response carries JSON content type and X-Request-Id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shipments/SHP-2026-0007' });
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-type']).toContain('charset=utf-8');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
