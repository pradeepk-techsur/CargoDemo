/**
 * Case repository — named prepared statements, bound parameters only.
 *
 * `updateProjection` is the single write path wave 2's detection layer uses to
 * publish recomputed derived fields (priority, queued, open_exception_count,
 * exception_type_summary, current_evaluation_id, priority_basis_json). It always
 * advances updated_at, which doubles as the X-Case-Version for optimistic
 * concurrency (Y0b §2).
 */

import type { Db } from '../connection.js';
import type { CaseRow, CasePriority } from '../../../shared/types/db.js';

export interface CaseProjectionUpdate {
  case_id: string;
  priority: CasePriority;
  queued: 0 | 1;
  open_exception_count: number;
  exception_type_summary: string;
  current_evaluation_id: string | null;
  priority_basis_json: string;
  updated_at: string;
}

export interface CaseRepository {
  getById(id: string): CaseRow | undefined;
  getByCargoEntryId(cargoEntryId: string): CaseRow | undefined;
  listQueued(): CaseRow[];
  loadForUpdate(id: string): CaseRow | undefined;
  upsert(row: CaseRow): void;
  updateProjection(update: CaseProjectionUpdate): void;
}

const SEVERITY_RANK_SQL = `CASE priority
  WHEN 'CRITICAL' THEN 4
  WHEN 'HIGH' THEN 3
  WHEN 'MEDIUM' THEN 2
  WHEN 'LOW' THEN 1
  ELSE 0 END`;

export function createCaseRepository(db: Db): CaseRepository {
  const getByIdStmt = db.prepare('SELECT * FROM cases WHERE id = ?');
  const getByEntryStmt = db.prepare('SELECT * FROM cases WHERE cargo_entry_id = ?');
  const listQueuedStmt = db.prepare(
    `SELECT * FROM cases WHERE queued = 1
     ORDER BY ${SEVERITY_RANK_SQL} DESC, updated_at DESC`,
  );
  // A plain row read used inside a BEGIN IMMEDIATE transaction by wave 3.
  const loadForUpdateStmt = db.prepare('SELECT * FROM cases WHERE id = ?');

  const upsertStmt = db.prepare(
    `INSERT INTO cases
       (id, cargo_entry_id, shipment_id, status, priority, priority_basis_json, queued,
        current_evaluation_id, open_exception_count, exception_type_summary,
        assigned_to_user_id, hold_reason, hold_reason_detail, hold_placed_by_user_id,
        hold_placed_at, escalation_reason, escalated_by_user_id, escalated_to_user_id,
        escalated_at, approving_official_user_id, approving_official_name,
        approving_official_role, cleared_at, last_action_id, created_at, updated_at)
     VALUES
       (@id, @cargo_entry_id, @shipment_id, @status, @priority, @priority_basis_json, @queued,
        @current_evaluation_id, @open_exception_count, @exception_type_summary,
        @assigned_to_user_id, @hold_reason, @hold_reason_detail, @hold_placed_by_user_id,
        @hold_placed_at, @escalation_reason, @escalated_by_user_id, @escalated_to_user_id,
        @escalated_at, @approving_official_user_id, @approving_official_name,
        @approving_official_role, @cleared_at, @last_action_id, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       cargo_entry_id = excluded.cargo_entry_id, shipment_id = excluded.shipment_id,
       status = excluded.status, priority = excluded.priority,
       priority_basis_json = excluded.priority_basis_json, queued = excluded.queued,
       current_evaluation_id = excluded.current_evaluation_id,
       open_exception_count = excluded.open_exception_count,
       exception_type_summary = excluded.exception_type_summary,
       assigned_to_user_id = excluded.assigned_to_user_id, hold_reason = excluded.hold_reason,
       hold_reason_detail = excluded.hold_reason_detail,
       hold_placed_by_user_id = excluded.hold_placed_by_user_id,
       hold_placed_at = excluded.hold_placed_at, escalation_reason = excluded.escalation_reason,
       escalated_by_user_id = excluded.escalated_by_user_id,
       escalated_to_user_id = excluded.escalated_to_user_id, escalated_at = excluded.escalated_at,
       approving_official_user_id = excluded.approving_official_user_id,
       approving_official_name = excluded.approving_official_name,
       approving_official_role = excluded.approving_official_role,
       cleared_at = excluded.cleared_at, last_action_id = excluded.last_action_id,
       updated_at = excluded.updated_at`,
  );

  const updateProjectionStmt = db.prepare(
    `UPDATE cases SET
       priority = @priority, queued = @queued, open_exception_count = @open_exception_count,
       exception_type_summary = @exception_type_summary,
       current_evaluation_id = @current_evaluation_id,
       priority_basis_json = @priority_basis_json, updated_at = @updated_at
     WHERE id = @case_id`,
  );

  return {
    getById: (id) => getByIdStmt.get(id) as CaseRow | undefined,
    getByCargoEntryId: (cargoEntryId) => getByEntryStmt.get(cargoEntryId) as CaseRow | undefined,
    listQueued: () => listQueuedStmt.all() as CaseRow[],
    loadForUpdate: (id) => loadForUpdateStmt.get(id) as CaseRow | undefined,
    upsert: (row) => {
      upsertStmt.run(row);
    },
    updateProjection: (update) => {
      updateProjectionStmt.run(update);
    },
  };
}
