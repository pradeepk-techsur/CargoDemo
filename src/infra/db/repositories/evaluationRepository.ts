/**
 * Evaluation repository — named prepared statements, bound parameters only.
 * `nextVersion` is called inside the detection transaction so concurrent
 * evaluations cannot collide on the UNIQUE (cargo_entry_id, version) index.
 */

import type { Db } from '../connection.js';
import type { EvaluationRow } from '../../../shared/types/db.js';

export interface EvaluationRepository {
  nextVersion(cargoEntryId: string): number;
  insert(row: EvaluationRow): void;
  getById(id: string): EvaluationRow | undefined;
  getCurrentForEntry(cargoEntryId: string): EvaluationRow | undefined;
  listByEntry(cargoEntryId: string): EvaluationRow[];
}

export function createEvaluationRepository(db: Db): EvaluationRepository {
  const nextVersionStmt = db.prepare(
    'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM evaluations WHERE cargo_entry_id = ?',
  );
  const insertStmt = db.prepare(
    `INSERT INTO evaluations
       (id, cargo_entry_id, case_id, version, trigger, rule_set_fingerprint,
        skipped_rules_json, invalid_rules_json, finding_count, duration_ms,
        actor_kind, actor_user_id, evaluated_at)
     VALUES
       (@id, @cargo_entry_id, @case_id, @version, @trigger, @rule_set_fingerprint,
        @skipped_rules_json, @invalid_rules_json, @finding_count, @duration_ms,
        @actor_kind, @actor_user_id, @evaluated_at)`,
  );
  const getByIdStmt = db.prepare('SELECT * FROM evaluations WHERE id = ?');
  const getCurrentStmt = db.prepare(
    'SELECT * FROM evaluations WHERE cargo_entry_id = ? ORDER BY version DESC LIMIT 1',
  );
  const listByEntryStmt = db.prepare(
    'SELECT * FROM evaluations WHERE cargo_entry_id = ? ORDER BY version ASC',
  );

  return {
    nextVersion: (cargoEntryId) =>
      (nextVersionStmt.get(cargoEntryId) as { v: number }).v,
    insert: (row) => {
      insertStmt.run(row);
    },
    getById: (id) => getByIdStmt.get(id) as EvaluationRow | undefined,
    getCurrentForEntry: (cargoEntryId) =>
      getCurrentStmt.get(cargoEntryId) as EvaluationRow | undefined,
    listByEntry: (cargoEntryId) => listByEntryStmt.all(cargoEntryId) as EvaluationRow[],
  };
}
