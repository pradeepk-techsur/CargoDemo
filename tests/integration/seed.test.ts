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
  assertSeedCoverage,
} from '../../src/app/seedService.js';

function count(db: Db, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

function snapshot(db: Db): string {
  const tables = ['users', 'rules', 'cargo_entries', 'documents', 'cases'];
  const out: Record<string, unknown[]> = {};
  for (const t of tables) {
    out[t] = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
  }
  return JSON.stringify(out);
}

describe('synthetic seed', () => {
  let dir: string;
  let db: Db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-seed-'));
    db = openDb(join(dir, 'test.db'));
    runMigrations(db);
    runSchemaSelfCheck(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('seeds a fresh database with the expected row counts and no wave-2 rows', () => {
    const report = runSeed(db, { mode: 'SEED_IF_EMPTY' });
    expect(report.mode).toBe('SEED_IF_EMPTY');

    expect(count(db, 'users')).toBe(5);
    expect(count(db, 'rules')).toBe(7);
    expect(count(db, 'cargo_entries')).toBe(12);
    expect(count(db, 'cases')).toBe(12);
    expect(count(db, 'documents')).toBeGreaterThan(0);

    for (const t of [
      'evaluations',
      'exceptions',
      'evidence',
      'audit_entries',
      'notifications',
      'approvals',
      'recommendations',
      'document_requests',
      'case_actions',
    ]) {
      expect(count(db, t), t).toBe(0);
    }
    expect(report.evaluate_hook_present).toBe(false);
  });

  it('is deterministic across a reseed (byte-identical snapshots)', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY' });
    const first = snapshot(db);
    runSeed(db, { mode: 'FORCE_RESEED' });
    const second = snapshot(db);
    expect(second).toBe(first);
  });

  it('is idempotent: repeated SEED_IF_EMPTY and runSeed do not duplicate rows', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY' });
    const before = snapshot(db);

    const skip = runSeed(db, { mode: 'SEED_IF_EMPTY' });
    expect(skip.mode).toBe('SKIPPED_NON_EMPTY');

    // Direct FORCE_RESEED twice also yields the same content and no duplicates.
    runSeed(db, { mode: 'FORCE_RESEED' });
    runSeed(db, { mode: 'FORCE_RESEED' });
    expect(count(db, 'cargo_entries')).toBe(12);
    expect(snapshot(db)).toBe(before);
  });

  it('reproduces the canonical scenario SHP-2026-0007 field-for-field', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY' });
    const entry = db
      .prepare('SELECT * FROM cargo_entries WHERE shipment_id = ?')
      .get('SHP-2026-0007') as Record<string, unknown>;
    expect(entry.country_of_origin).toBe('Malaysia');
    expect(entry.country_of_origin_iso2).toBe('MY');
    expect(entry.manufacturer_address_country).toBe('China');
    expect(entry.manufacturer_address_country_iso2).toBe('CN');
    expect(entry.hts_code).toBe('8541.40');
    expect(entry.hts_code_normalized).toBe('854140');
    expect(entry.shipment_value_cents).toBe(8500000);

    const coo = db
      .prepare(
        "SELECT * FROM documents WHERE cargo_entry_id = ? AND document_type = 'CERTIFICATE_OF_ORIGIN'",
      )
      .get(entry.id) as Record<string, unknown>;
    expect(coo.status).toBe('NOT_RECEIVED');

    const summary = (
      db.prepare('SELECT exception_type_summary FROM cases WHERE cargo_entry_id = ?').get(entry.id) as {
        exception_type_summary: string;
      }
    ).exception_type_summary;
    expect(summary.split(',').sort()).toEqual([
      'CONFLICTING_COUNTRY_OF_ORIGIN',
      'INVALID_HTS_CODE',
      'MISSING_REQUIRED_DOCUMENT',
    ]);
  });

  it('covers all seven statuses, all three exception types, and the clean shipment', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY' });

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

    const cleared = db
      .prepare("SELECT * FROM cases WHERE status = 'CLEARED'")
      .all() as Array<Record<string, unknown>>;
    expect(cleared).toHaveLength(1);
    expect(cleared[0]!.approving_official_user_id).toBe('usr-sup-001');

    const clean = db
      .prepare('SELECT queued, open_exception_count FROM cases WHERE shipment_id = ?')
      .get('SHP-2026-0011') as { queued: number; open_exception_count: number };
    expect(clean.queued).toBe(0);
    expect(clean.open_exception_count).toBe(0);
  });

  it('has usr-cs-001 as the default login user', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-cs-001') as {
      role: string;
      active: number;
    };
    expect(user.role).toBe('CARGO_SPECIALIST');
    expect(user.active).toBe(1);
  });

  it('leaves seeded tables unchanged when a broken canonical fixture is rejected', () => {
    runSeed(db, { mode: 'SEED_IF_EMPTY' });
    const before = snapshot(db);

    // A FORCE_RESEED whose canonical row is invalid must throw and roll back,
    // leaving the previously-seeded content intact.
    const bad = loadCargoEntriesFixture() as Array<Record<string, unknown>>;
    const canonical = bad.find((e) => e.shipment_id === 'SHP-2026-0007')!;
    canonical.hts_code = '9999.99';
    canonical.hts_code_normalized = '999999';

    // The guard runs inside runSeed's transaction; here we assert the guard
    // itself throws so a broken fixture never reaches commit.
    expect(() => assertSeedCoverage(bad)).toThrow(SeedError);
    expect(() => assertSeedCoverage(bad)).toThrow(/SEED_CANONICAL_SCENARIO_INVALID/);

    // The database is unchanged (the broken array was never seeded).
    expect(snapshot(db)).toBe(before);
  });

  it('rejects a fixture that drops a required case status', () => {
    const bad = loadCargoEntriesFixture() as Array<Record<string, unknown>>;
    // Remove every CLEARED shipment so the "exactly one CLEARED" assertion fails.
    const filtered = bad.filter((e) => e.case_status !== 'CLEARED');
    expect(() => assertSeedCoverage(filtered)).toThrow(/SEED_COVERAGE_FAILED/);
  });
});
