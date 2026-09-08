/**
 * Seed entrypoint: `npm run seed` (SEED_IF_EMPTY) and
 * `npm run seed:reset` / `npm run seed -- --force-reseed` (FORCE_RESEED).
 *
 * Runs migrate + schema self-check first (so seeding works on a fresh database),
 * then runSeed, then prints the SeedReport as one JSON line. Exits 1 with the
 * error code on any failure.
 */

import { openDb } from '../src/infra/db/connection.js';
import { runMigrations } from '../src/infra/db/migrate.js';
import { runSchemaSelfCheck } from '../src/infra/db/schemaSelfCheck.js';
import { runSeed, type SeedMode } from '../src/app/seedService.js';

function main(): void {
  const forceReseed = process.argv.includes('--force-reseed');
  const mode: SeedMode = forceReseed ? 'FORCE_RESEED' : 'SEED_IF_EMPTY';

  const db = openDb();
  try {
    runMigrations(db);
    runSchemaSelfCheck(db);
    const report = runSeed(db, { mode });
    process.stdout.write(`${JSON.stringify(report)}\n`);
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
