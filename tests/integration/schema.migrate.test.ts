import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDb, type Db } from '../../src/infra/db/connection.js';
import { runMigrations, MigrationChecksumMismatchError } from '../../src/infra/db/migrate.js';
import {
  runSchemaSelfCheck,
  REQUIRED_TABLES,
  REQUIRED_TRIGGERS,
} from '../../src/infra/db/schemaSelfCheck.js';

describe('schema migration + self-check', () => {
  let dir: string;
  let dbPath: string;
  let db: Db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-migrate-'));
    dbPath = join(dir, 'test.db');
    db = openDb(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('migrates a fresh database and passes the self-check', () => {
    const result = runMigrations(db);
    expect(result.schemaVersion).toBe(1);
    expect(result.applied).toEqual([1]);

    const rows = db
      .prepare('SELECT version, checksum FROM schema_migrations')
      .all() as Array<{ version: number; checksum: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.version).toBe(1);
    expect(rows[0]!.checksum).toMatch(/^[0-9a-f]{64}$/);

    expect(() => runSchemaSelfCheck(db)).not.toThrow();
  });

  it('is idempotent: a second migrate applies nothing', () => {
    runMigrations(db);
    const before = (
      db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }
    ).c;

    const second = runMigrations(db);
    expect(second.applied).toEqual([]);

    const after = (
      db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }
    ).c;
    expect(after).toBe(before);
  });

  it('detects a tampered checksum', () => {
    runMigrations(db);
    db.prepare("UPDATE schema_migrations SET checksum='deadbeef' WHERE version=1").run();
    expect(() => runMigrations(db)).toThrow(MigrationChecksumMismatchError);
  });

  it('creates all 21 tables and 3 triggers', () => {
    runMigrations(db);

    const tables = new Set(
      (
        db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{
          name: string;
        }>
      ).map((r) => r.name),
    );
    for (const t of REQUIRED_TABLES) expect(tables.has(t), `table ${t}`).toBe(true);
    expect(REQUIRED_TABLES).toHaveLength(21);

    const triggers = new Set(
      (
        db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as Array<{
          name: string;
        }>
      ).map((r) => r.name),
    );
    for (const tr of REQUIRED_TRIGGERS) expect(triggers.has(tr), `trigger ${tr}`).toBe(true);
  });

  describe('governance constraints bite', () => {
    beforeEach(() => {
      runMigrations(db);
      // Minimal parent rows so FK-valid inserts can be attempted.
      db.prepare(
        "INSERT INTO users (id, name, role, active, created_at, updated_at) VALUES ('u1','Test User','CARGO_SPECIALIST',1,'t','t')",
      ).run();
      db.prepare(
        `INSERT INTO cargo_entries
         (id, shipment_id, importer_name, carrier_name, product_description,
          country_of_origin, manufacturer_name, manufacturer_address_line1,
          manufacturer_address_country, shipment_value_cents, entry_date,
          ingestion_source, created_at, updated_at)
         VALUES ('e1','SHP-2026-0001','Imp','Car','Desc','Malaysia','Man','Line1','China',
                 1000,'2026-01-01','seed','t','t')`,
      ).run();
      db.prepare(
        `INSERT INTO cases (id, cargo_entry_id, shipment_id, status, priority, created_at, updated_at)
         VALUES ('c1','e1','SHP-2026-0001','NEW','LOW','t','t')`,
      ).run();
    });

    it('rejects a CLEARED case with no approving official', () => {
      expect(() =>
        db
          .prepare(
            `INSERT INTO cases (id, cargo_entry_id, shipment_id, status, priority, created_at, updated_at)
             VALUES ('c2','e1','SHP-2026-0001','CLEARED','LOW','t','t')`,
          )
          .run(),
      ).toThrow();
    });

    it('rejects a case_actions row with a too-short justification', () => {
      expect(() =>
        db
          .prepare(
            `INSERT INTO case_actions
             (id, case_id, cargo_entry_id, action, status_before, status_after, justification,
              actor_user_id, actor_name, actor_role, audit_entry_id, occurred_at)
             VALUES ('ca1','c1','e1','PLACE_ON_HOLD','NEW','ON_HOLD','short','u1','Test User',
                     'CARGO_SPECIALIST','ae1','t')`,
          )
          .run(),
      ).toThrow();
    });

    it('rejects a notification with transmitted=1', () => {
      expect(() =>
        db
          .prepare(
            `INSERT INTO notifications
             (id, case_id, audit_entry_id, event_type, recipient_role, subject, body, transmitted, generated_at)
             VALUES ('n1','c1','ae1','X','SUPERVISOR','Sub','Body',1,'t')`,
          )
          .run(),
      ).toThrow();
    });

    it('enforces foreign keys: a document for a missing entry is rejected', () => {
      expect(() =>
        db
          .prepare(
            `INSERT INTO documents
             (id, cargo_entry_id, document_type, status, provenance, created_at)
             VALUES ('d1','no-such-entry','COMMERCIAL_INVOICE','NOT_RECEIVED','SEEDED','t')`,
          )
          .run(),
      ).toThrow();
    });

    it('append-only trigger blocks deleting an audit entry', () => {
      db.prepare(
        `INSERT INTO audit_entries
         (id, case_id, sequence_no, entry_class, event_type,
          exceptions_json, evidence_reviewed_json, ai_recommendation_json,
          occurred_at, actor_kind, prev_hash, entry_hash)
         VALUES ('ae1','c1',1,'SYSTEM_EVENT','SEED','[]','[]','{"present":false}',
                 't','SYSTEM','p','h')`,
      ).run();
      expect(() => db.prepare("DELETE FROM audit_entries WHERE id='ae1'").run()).toThrow(
        /AUDIT_IMMUTABLE/,
      );
    });
  });
});
