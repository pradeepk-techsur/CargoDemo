/**
 * Server startup: migrate → self-check → seed-if-empty → default-actor check →
 * listen 0.0.0.0:3000. Any failure before `listen` prints the error to stderr
 * and exits 1. A port already in use exits 1 with no automatic fallback: a
 * shifting URL breaks an embedded preview.
 */

import { openDb } from '../infra/db/connection.js';
import { runMigrations } from '../infra/db/migrate.js';
import { runSchemaSelfCheck } from '../infra/db/schemaSelfCheck.js';
import { runSeed } from '../app/seedService.js';
import { createEvaluateHook } from '../app/evaluationService.js';
import { SeedClock } from '../infra/clock.js';
import { DeterministicIdGenerator } from '../infra/ids.js';
import { resolveActor } from '../app/actorService.js';
import { config } from './config.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const db = openDb();

  const { schemaVersion } = runMigrations(db);
  runSchemaSelfCheck(db);

  // Seed-if-empty with wave 2's detection hook, so a fresh boot has a populated
  // queue. Deterministic clock + ids keep the seed byte-identical across runs.
  const evaluate = createEvaluateHook({
    trigger: 'SEED',
    clock: new SeedClock(config.CARGODEMO_SEED_CLOCK),
    ids: new DeterministicIdGenerator('evd-seed-'),
  });
  const seedReport = runSeed(db, { mode: 'SEED_IF_EMPTY', evaluate });

  // A missing default actor is a boot failure, not a runtime surprise mid-demo.
  const actor = resolveActor(db);

  const app = await buildApp({ db });

  // The literal 0.0.0.0 must appear in this file.
  const host = config.CARGODEMO_HOST || '0.0.0.0';
  await app.listen({ host, port: config.CARGODEMO_PORT });

  const queued = (db.prepare('SELECT COUNT(*) AS c FROM cases WHERE queued = 1').get() as {
    c: number;
  }).c;
  process.stdout.write(
    `CargoDemo listening on http://${host}:${config.CARGODEMO_PORT} ` +
      `(schema v${schemaVersion}, actor ${actor.id}, ${queued} queued cases, ` +
      `${seedReport.exceptions_created ?? 0} exceptions seeded)\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
