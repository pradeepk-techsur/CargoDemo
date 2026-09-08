/**
 * Migration entrypoint: `npm run migrate`.
 *
 * Loads config, opens the database, runs migrations, runs the blocking schema
 * self-check, then prints one readiness line and exits 0. Any failure prints the
 * error code/message to stderr and exits 1. This script never serves or seeds.
 */

import { openDb } from '../src/infra/db/connection.js';
import { runMigrations } from '../src/infra/db/migrate.js';
import { runSchemaSelfCheck, REQUIRED_TRIGGERS } from '../src/infra/db/schemaSelfCheck.js';

function main(): void {
  const db = openDb();
  try {
    const { applied, schemaVersion } = runMigrations(db);
    runSchemaSelfCheck(db);
    process.stdout.write(
      `schema_version=${schemaVersion} applied=[${applied.join(',')}] foreign_keys=on triggers=${REQUIRED_TRIGGERS.length}\n`,
    );
  } finally {
    db.close();
  }
}

try {
  main();
  process.exit(0);
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
