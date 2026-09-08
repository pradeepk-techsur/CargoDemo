/**
 * Forward-only, checksum-verified migration runner (FRD F0 §Process steps 2-3,
 * §Error States).
 *
 * Migrations are discovered from `src/infra/db/migrations/*.sql`, ordered by
 * their numeric prefix, and read from disk at runtime (not bundler-imported) so
 * the .sql file is the artifact whose checksum is recorded. Each unapplied
 * migration is applied inside its own transaction; an already-applied migration
 * whose file has changed on disk aborts with MIGRATION_CHECKSUM_MISMATCH before
 * any DML runs. There is no down/rollback path.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Db } from './connection.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, 'migrations');

export class MigrationChecksumMismatchError extends Error {
  constructor(version: number) {
    super(`MIGRATION_CHECKSUM_MISMATCH: Migration ${version} has changed after being applied`);
    this.name = 'MigrationChecksumMismatchError';
  }
}

interface Migration {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Discover migrations from disk, ordered by numeric prefix. */
function discoverMigrations(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => {
      const av = Number.parseInt(a.split('_')[0]!, 10);
      const bv = Number.parseInt(b.split('_')[0]!, 10);
      return av - bv;
    });

  return files.map((file) => {
    const version = Number.parseInt(file.split('_')[0]!, 10);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    return { version, name: file, sql, checksum: sha256Hex(sql) };
  });
}

function schemaMigrationsExists(db: Db): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
    )
    .get();
  return row !== undefined;
}

export interface MigrationResult {
  applied: number[];
  schemaVersion: number;
}

/**
 * Apply all unapplied migrations. Returns the versions applied in this run and
 * the resulting schema version (the highest applied version).
 */
export function runMigrations(db: Db): MigrationResult {
  const migrations = discoverMigrations();
  const applied: number[] = [];

  const bootstrap = !schemaMigrationsExists(db);

  // Map of already-applied version -> checksum. Empty on a fresh database.
  const appliedChecksums = new Map<number, string>();
  if (!bootstrap) {
    const rows = db
      .prepare('SELECT version, checksum FROM schema_migrations')
      .all() as Array<{ version: number; checksum: string }>;
    for (const r of rows) appliedChecksums.set(r.version, r.checksum);
  }

  for (const migration of migrations) {
    const priorChecksum = appliedChecksums.get(migration.version);

    if (priorChecksum !== undefined) {
      if (priorChecksum !== migration.checksum) {
        throw new MigrationChecksumMismatchError(migration.version);
      }
      continue; // already applied and unchanged
    }

    // Apply this migration inside a single transaction. The very first
    // migration also creates schema_migrations, so its INSERT happens in the
    // same transaction after the DDL has run.
    const applyOne = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)',
      ).run(migration.version, migration.name, migration.checksum, new Date().toISOString());
    });
    applyOne();
    applied.push(migration.version);
  }

  const versionRow = db
    .prepare('SELECT MAX(version) AS v FROM schema_migrations')
    .get() as { v: number | null };
  const schemaVersion = versionRow.v ?? 0;

  return { applied, schemaVersion };
}
