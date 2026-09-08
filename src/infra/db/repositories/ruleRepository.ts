/**
 * Rule repository — named prepared statements, bound parameters only.
 *
 * `listEnabled` returns enabled rules in the persisted evaluation order
 * `(exception_type ASC, severity DESC, rule_id ASC)` (F04 §Process step 3).
 * Severity is ordered by rank, not lexically, so CRITICAL > HIGH > MEDIUM > LOW.
 */

import type { Db } from '../connection.js';
import type { RuleRow } from '../../../shared/types/db.js';

export interface RuleRepository {
  listEnabled(): RuleRow[];
  listAll(): RuleRow[];
  getById(id: string): RuleRow | undefined;
  upsert(row: RuleRow): void;
}

// severity DESC by rank: CRITICAL(4) > HIGH(3) > MEDIUM(2) > LOW(1)
const SEVERITY_RANK_SQL = `CASE severity
  WHEN 'CRITICAL' THEN 4
  WHEN 'HIGH' THEN 3
  WHEN 'MEDIUM' THEN 2
  WHEN 'LOW' THEN 1
  ELSE 0 END`;

export function createRuleRepository(db: Db): RuleRepository {
  const listEnabledStmt = db.prepare(
    `SELECT * FROM rules WHERE enabled = 1
     ORDER BY exception_type ASC, ${SEVERITY_RANK_SQL} DESC, id ASC`,
  );
  const listAllStmt = db.prepare(
    `SELECT * FROM rules
     ORDER BY exception_type ASC, ${SEVERITY_RANK_SQL} DESC, id ASC`,
  );
  const getByIdStmt = db.prepare('SELECT * FROM rules WHERE id = ?');
  const upsertStmt = db.prepare(
    `INSERT INTO rules
       (id, name, name_lower, exception_type, description, policy_reference, severity,
        priority_mapping, conditions_json, params_json, enabled, version,
        created_by_user_id, updated_by_user_id, created_at, updated_at)
     VALUES
       (@id, @name, @name_lower, @exception_type, @description, @policy_reference, @severity,
        @priority_mapping, @conditions_json, @params_json, @enabled, @version,
        @created_by_user_id, @updated_by_user_id, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, name_lower = excluded.name_lower,
       exception_type = excluded.exception_type, description = excluded.description,
       policy_reference = excluded.policy_reference, severity = excluded.severity,
       priority_mapping = excluded.priority_mapping, conditions_json = excluded.conditions_json,
       params_json = excluded.params_json, enabled = excluded.enabled, version = excluded.version,
       updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at`,
  );

  return {
    listEnabled: () => listEnabledStmt.all() as RuleRow[],
    listAll: () => listAllStmt.all() as RuleRow[],
    getById: (id) => getByIdStmt.get(id) as RuleRow | undefined,
    upsert: (row) => {
      upsertStmt.run(row);
    },
  };
}
