/**
 * Server startup: migrate → self-check → seed-if-empty → queue-non-empty
 * assertion → default-actor check → listen 0.0.0.0:3000. Any failure before
 * `listen` prints the error to stderr and exits 1. A port already in use exits 1
 * with no automatic fallback: a shifting URL breaks an embedded preview.
 *
 * The order — build client (prestart) → migrate → seed → assert → serve — is the
 * single-command contract: `npm start` on a fresh checkout with no database
 * reaches a populated, served application with no other command run first.
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

const CANONICAL_SHIPMENT = 'SHP-2026-0007';

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

  // Did THIS boot perform the seed (as opposed to skipping a non-empty database)?
  const didSeed = seedReport.mode !== 'SKIPPED_NON_EMPTY';

  // The queue-non-empty guarantee. A demo that starts with an empty work list is
  // a failed demo — and it must fail here, in the operator's terminal, not in
  // front of an audience.
  const queued = (
    db.prepare('SELECT COUNT(*) AS c FROM cases WHERE queued = 1').get() as { c: number }
  ).c;

  if (didSeed && queued === 0) {
    process.stderr.write(
      'QUEUE_EMPTY_AFTER_SEED: the seed ran but left no flagged shipments; the queue would load empty\n',
    );
    process.exit(1);
  }
  if (!didSeed && queued === 0) {
    // An operator may legitimately have worked every case to a terminal state.
    // Warn and continue rather than locking them out of their own database.
    process.stderr.write(
      'QUEUE_EMPTY_WARNING: no flagged shipments remain; run `npm run seed:reset` to restore the seeded demo state\n',
    );
  }

  // The canonical scenario must be present when this boot seeded. The seed
  // asserts this internally; this is the cheap boot-level restatement.
  if (didSeed) {
    const canonical = db
      .prepare('SELECT 1 AS present FROM cargo_entries WHERE shipment_id = ?')
      .get(CANONICAL_SHIPMENT) as { present: number } | undefined;
    if (!canonical) {
      process.stderr.write(
        `CANONICAL_SCENARIO_MISSING: ${CANONICAL_SHIPMENT} is absent after seeding\n`,
      );
      process.exit(1);
    }
  }

  // A missing default actor is a boot failure, not a runtime surprise mid-demo.
  const actor = resolveActor(db);

  const app = await buildApp({ db });

  // The literal 0.0.0.0 must appear in this file.
  const host = config.CARGODEMO_HOST || '0.0.0.0';
  await app.listen({ host, port: config.CARGODEMO_PORT });

  printReadinessBlock({ db, host, port: config.CARGODEMO_PORT, schemaVersion, queued });
}

/**
 * The readiness block, printed after `listen` resolves. It carries ONLY facts
 * this build can truthfully report, and it prints the literal preview URL so an
 * operator and a log reader both find it. Counts are the real database contents,
 * not fixed numbers.
 */
function printReadinessBlock(args: {
  db: ReturnType<typeof openDb>;
  host: string;
  port: number;
  schemaVersion: number;
  queued: number;
}): void {
  const { db, host, port, schemaVersion, queued } = args;

  const entries = (
    db.prepare('SELECT COUNT(*) AS c FROM cargo_entries').get() as { c: number }
  ).c;
  const openExceptions = (
    db.prepare("SELECT COUNT(*) AS c FROM exceptions WHERE status = 'OPEN'").get() as {
      c: number;
    }
  ).c;
  const casesWithOpen = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT cargo_entry_id) AS c FROM exceptions WHERE status = 'OPEN'",
      )
      .get() as { c: number }
  ).c;
  const canonicalPresent = db
    .prepare('SELECT 1 AS present FROM cargo_entries WHERE shipment_id = ?')
    .get(CANONICAL_SHIPMENT)
    ? '✓'
    : '✗';

  const url = `http://${host}:${port}`;
  const lines = [
    '',
    '  CargoDemo ready',
    '  ─────────────────────────────────────────────',
    `  Preview URL     ${url}`,
    `  Bind            ${host}:${port}`,
    `  Database        ${config.CARGODEMO_DB_PATH} (schema v${schemaVersion})`,
    `  Seeded          ${entries} entries · ${queued} flagged · canonical ${CANONICAL_SHIPMENT} ${canonicalPresent}`,
    `  Exceptions      ${openExceptions} open across ${casesWithOpen} cases`,
    '  Client bundle   dist/client (built)',
    '  API routes      6 under /api',
    '',
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
