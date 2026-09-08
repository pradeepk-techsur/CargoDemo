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
import { createEvaluateHook } from '../src/app/evaluationService.js';
import { SeedClock } from '../src/infra/clock.js';
import { DeterministicIdGenerator } from '../src/infra/ids.js';
import { config } from '../src/server/config.js';

function main(): void {
  const forceReseed = process.argv.includes('--force-reseed');
  const mode: SeedMode = forceReseed ? 'FORCE_RESEED' : 'SEED_IF_EMPTY';

  // Wave 2 fills the seed's evaluate hook so a fresh migrate+seed leaves real
  // evaluations/exceptions/evidence behind. The same fixed SeedClock and
  // DeterministicIdGenerator the seed uses make detection output byte-identical
  // across runs.
  const seedClock = new SeedClock(config.CARGODEMO_SEED_CLOCK);
  const deterministicIds = new DeterministicIdGenerator('evd-seed-');
  const evaluate = createEvaluateHook({
    trigger: 'SEED',
    clock: seedClock,
    ids: deterministicIds,
  });

  const db = openDb();
  try {
    runMigrations(db);
    runSchemaSelfCheck(db);
    const report = runSeed(db, { mode, evaluate });
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
