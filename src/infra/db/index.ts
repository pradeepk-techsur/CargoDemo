/**
 * The public database entrypoint. Every later wave imports the database ONLY
 * from `src/infra/db` — do not reach into connection.ts, migrate.ts, the
 * repositories or the fixtures directly from feature code.
 *
 * This module re-exports the connection/migration/self-check/seed surface, the
 * typed row contract, and a `repositories(db)` factory. `initDatabase` composes
 * the wave-5 boot sequence (open → migrate → self-check → seed) into one call.
 */

import { openDb, type Db } from './connection.js';
import { runMigrations } from './migrate.js';
import { runSchemaSelfCheck } from './schemaSelfCheck.js';
import { runSeed, type SeedReport, type SeedOptions } from '../../app/seedService.js';
import { createCargoRepository, type CargoRepository } from './repositories/cargoRepository.js';
import { createCaseRepository, type CaseRepository } from './repositories/caseRepository.js';
import { createRuleRepository, type RuleRepository } from './repositories/ruleRepository.js';
import {
  createDocumentRepository,
  type DocumentRepository,
} from './repositories/documentRepository.js';
import { createUserRepository, type UserRepository } from './repositories/userRepository.js';
import {
  createEvaluationRepository,
  type EvaluationRepository,
} from './repositories/evaluationRepository.js';
import {
  createExceptionRepository,
  type ExceptionRepository,
} from './repositories/exceptionRepository.js';
import {
  createEvidenceRepository,
  type EvidenceRepository,
} from './repositories/evidenceRepository.js';

// --- re-exports --------------------------------------------------------------

export { openDb, type Db } from './connection.js';
export { runMigrations, type MigrationResult } from './migrate.js';
export { runSchemaSelfCheck } from './schemaSelfCheck.js';
export { runSeed, type SeedReport, type SeedOptions } from '../../app/seedService.js';
export * from '../../shared/types/db.js';

export type {
  CargoRepository,
  CaseRepository,
  RuleRepository,
  DocumentRepository,
  UserRepository,
  EvaluationRepository,
  ExceptionRepository,
  EvidenceRepository,
};
export type { CaseProjectionUpdate } from './repositories/caseRepository.js';

export interface Repositories {
  cargo: CargoRepository;
  cases: CaseRepository;
  rules: RuleRepository;
  documents: DocumentRepository;
  users: UserRepository;
  evaluations: EvaluationRepository;
  exceptions: ExceptionRepository;
  evidence: EvidenceRepository;
}

/** Build the repository set bound to a database handle. */
export function repositories(db: Db): Repositories {
  return {
    cargo: createCargoRepository(db),
    cases: createCaseRepository(db),
    rules: createRuleRepository(db),
    documents: createDocumentRepository(db),
    users: createUserRepository(db),
    evaluations: createEvaluationRepository(db),
    exceptions: createExceptionRepository(db),
    evidence: createEvidenceRepository(db),
  };
}

export interface InitDatabaseOptions {
  path?: string;
  seedMode?: SeedOptions['mode'];
}

export interface InitDatabaseResult {
  db: Db;
  repositories: Repositories;
  schemaVersion: number;
  seedReport: SeedReport;
}

/**
 * Wave-5 boot sequence in one call: open the database, run migrations, run the
 * blocking schema self-check, then seed (SEED_IF_EMPTY by default).
 */
export function initDatabase(opts: InitDatabaseOptions = {}): InitDatabaseResult {
  const db = openDb(opts.path);
  const { schemaVersion } = runMigrations(db);
  runSchemaSelfCheck(db);
  const seedReport = runSeed(db, { mode: opts.seedMode ?? 'SEED_IF_EMPTY' });
  return { db, repositories: repositories(db), schemaVersion, seedReport };
}
