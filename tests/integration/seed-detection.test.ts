import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDb, type Db } from '../../src/infra/db/connection.js';
import { runMigrations } from '../../src/infra/db/migrate.js';
import { runSchemaSelfCheck } from '../../src/infra/db/schemaSelfCheck.js';
import {
  runSeed,
  SeedError,
  loadCargoEntriesFixture,
  assertDetectionCoverage,
} from '../../src/app/seedService.js';
import { createEvaluateHook } from '../../src/app/evaluationService.js';
import { SeedClock } from '../../src/infra/clock.js';
import { DeterministicIdGenerator } from '../../src/infra/ids.js';

function count(db: Db, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

function makeHook() {
  return createEvaluateHook({
    trigger: 'SEED',
    clock: new SeedClock(),
    ids: new DeterministicIdGenerator('evd-seed-'),
  });
}

function snapshot(db: Db): string {
  const out: Record<string, unknown[]> = {};
  for (const t of ['evaluations', 'exceptions', 'evidence']) {
    out[t] = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
  }
  return JSON.stringify(out);
}

describe('seed with detection hook', () => {
  let dir: string;
  let db: Db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-seeddetect-'));
    db = openDb(join(dir, 'test.db'));
    runMigrations(db);
    runSchemaSelfCheck(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('leaves real exceptions and evidence behind, one evaluation per shipment', () => {
    const report = runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate: makeHook() });
    expect(report.evaluate_hook_present).toBe(true);
    expect(count(db, 'evaluations')).toBe(12);
    expect(count(db, 'exceptions')).toBeGreaterThan(0);
    expect(count(db, 'evidence')).toBeGreaterThan(0);
    const orphans = count(db, 'evidence') === 0 ? 1 : (
      db
        .prepare(
          'SELECT COUNT(*) AS c FROM exceptions x WHERE NOT EXISTS (SELECT 1 FROM evidence v WHERE v.exception_id = x.id)',
        )
        .get() as { c: number }
    ).c;
    expect(orphans).toBe(0);
    expect(report.exceptions_created).toBe(count(db, 'exceptions'));
    expect(report.evidence_created).toBe(count(db, 'evidence'));
  });

  it('SHP-2026-0007 has exactly 3 OPEN exceptions and a CRITICAL, queued case', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate: makeHook() });
    const c = db
      .prepare(
        `SELECT c.* FROM cases c JOIN cargo_entries e ON e.id = c.cargo_entry_id
         WHERE e.shipment_id = 'SHP-2026-0007'`,
      )
      .get() as {
      queued: number;
      open_exception_count: number;
      priority: string;
      current_evaluation_id: string | null;
      exception_type_summary: string;
    };
    expect(c.queued).toBe(1);
    expect(c.open_exception_count).toBe(3);
    expect(c.priority).toBe('CRITICAL');
    expect(c.current_evaluation_id).not.toBeNull();
    expect(c.exception_type_summary.split(',').sort()).toEqual([
      'CONFLICTING_COUNTRY_OF_ORIGIN',
      'INVALID_HTS_CODE',
      'MISSING_REQUIRED_DOCUMENT',
    ]);
  });

  it('SHP-2026-0011 has 0 exceptions and queued=0', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate: makeHook() });
    const c = db
      .prepare(
        `SELECT c.queued, c.open_exception_count FROM cases c
         JOIN cargo_entries e ON e.id = c.cargo_entry_id WHERE e.shipment_id = 'SHP-2026-0011'`,
      )
      .get() as { queued: number; open_exception_count: number };
    expect(c.queued).toBe(0);
    expect(c.open_exception_count).toBe(0);
  });

  it('all seven case statuses survive detection (status never overwritten)', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate: makeHook() });
    const statuses = new Set(
      (db.prepare('SELECT DISTINCT status FROM cases').all() as Array<{ status: string }>).map(
        (r) => r.status,
      ),
    );
    for (const s of [
      'NEW',
      'IN_REVIEW',
      'AWAITING_INFORMATION',
      'ON_HOLD',
      'ESCALATED',
      'PENDING_APPROVAL',
      'CLEARED',
    ]) {
      expect(statuses.has(s), s).toBe(true);
    }
  });

  it('FORCE_RESEED twice produces byte-identical evaluation/exception/evidence rows', () => {
    runSeed(db, { mode: 'FORCE_RESEED', evaluate: makeHook() });
    const first = snapshot(db);
    runSeed(db, { mode: 'FORCE_RESEED', evaluate: makeHook() });
    const second = snapshot(db);
    expect(second).toBe(first);
  });

  it('SEED_IF_EMPTY twice does not duplicate evaluations or exceptions', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate: makeHook() });
    const evals = count(db, 'evaluations');
    const exc = count(db, 'exceptions');
    const skip = runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate: makeHook() });
    expect(skip.mode).toBe('SKIPPED_NON_EMPTY');
    expect(count(db, 'evaluations')).toBe(evals);
    expect(count(db, 'exceptions')).toBe(exc);
  });

  it('runSeed WITHOUT the hook still succeeds and leaves the three tables empty', () => {
    const report = runSeed(db, { mode: 'SEED_IF_EMPTY' });
    expect(report.evaluate_hook_present).toBe(false);
    expect(count(db, 'evaluations')).toBe(0);
    expect(count(db, 'exceptions')).toBe(0);
    expect(count(db, 'evidence')).toBe(0);
    expect(count(db, 'cargo_entries')).toBe(12);
  });

  it('the detection-coverage guard throws SEED_COVERAGE_FAILED when a fixture expectation diverges', () => {
    // Seed for real (with the hook) so exceptions/evidence exist and match.
    runSeed(db, { mode: 'FORCE_RESEED', evaluate: makeHook() });

    // A fixture mutated in-memory so its declared expectations no longer match
    // what the rules actually produced — the check that keeps the fixtures and
    // the engine honest as later waves edit either one.
    const mutated = loadCargoEntriesFixture() as Array<Record<string, unknown>>;
    const clean = mutated.find((e) => e.shipment_id === 'SHP-2026-0011')!;
    clean.expected_exception_types = ['INVALID_HTS_CODE']; // it truly has none

    expect(() => assertDetectionCoverage(db, mutated)).toThrow(SeedError);
    expect(() => assertDetectionCoverage(db, mutated)).toThrow(/SEED_COVERAGE_FAILED/);
  });
});
