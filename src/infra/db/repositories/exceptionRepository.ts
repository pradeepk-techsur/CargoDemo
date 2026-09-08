/**
 * Exception repository — named prepared statements, bound parameters only.
 *
 * `listByCaseWithEvidence` returns the ExceptionRecord[] projection waves 3-4
 * read: it joins `rules` for the presentation fields, parses
 * missing_information_json, and attaches evidence ordered by display_order ASC.
 */

import type { Db } from '../connection.js';
import type { ExceptionRow, EvidenceRow } from '../../../shared/types/db.js';
import type {
  ExceptionRecord,
  EvidenceRecord,
  MissingInformationItem,
} from '../../../shared/types/detection.js';

export interface ExceptionRepository {
  insert(row: ExceptionRow): void;
  listOpenByEntry(cargoEntryId: string): ExceptionRow[];
  listByEvaluation(evaluationId: string): ExceptionRow[];
  listByCaseWithEvidence(caseId: string): ExceptionRecord[];
  markSuperseded(
    exceptionId: string,
    supersededByExceptionId: string | null,
    at: string,
  ): void;
}

function toEvidenceRecord(row: EvidenceRow): EvidenceRecord {
  return {
    id: row.id,
    kind: row.kind,
    field_path: row.field_path,
    raw_value: row.raw_value,
    normalized_value: row.normalized_value,
    comparison_field_path: row.comparison_field_path,
    comparison_raw_value: row.comparison_raw_value,
    comparison_normalized_value: row.comparison_normalized_value,
    expected: row.expected,
    observed: row.observed,
    assertion: row.assertion,
    truncated: row.truncated,
    display_order: row.display_order,
  };
}

export function createExceptionRepository(db: Db): ExceptionRepository {
  const insertStmt = db.prepare(
    `INSERT INTO exceptions
       (id, evaluation_id, cargo_entry_id, case_id, rule_id, rule_version,
        exception_type, sub_reason, severity, status, assertion,
        missing_information_json, first_detected_evaluation_id, opened_at,
        resolved_at, resolved_by_evaluation_id, resolution_reason,
        superseded_by_exception_id, cleared_by_approval_id, created_at)
     VALUES
       (@id, @evaluation_id, @cargo_entry_id, @case_id, @rule_id, @rule_version,
        @exception_type, @sub_reason, @severity, @status, @assertion,
        @missing_information_json, @first_detected_evaluation_id, @opened_at,
        @resolved_at, @resolved_by_evaluation_id, @resolution_reason,
        @superseded_by_exception_id, @cleared_by_approval_id, @created_at)`,
  );
  const listOpenStmt = db.prepare(
    "SELECT * FROM exceptions WHERE cargo_entry_id = ? AND status = 'OPEN' ORDER BY created_at ASC, id ASC",
  );
  const listByEvalStmt = db.prepare(
    'SELECT * FROM exceptions WHERE evaluation_id = ? ORDER BY created_at ASC, id ASC',
  );
  const listByCaseStmt = db.prepare(
    `SELECT x.*, r.name AS rule_name, r.description AS rule_description,
            r.policy_reference AS rule_policy_reference
     FROM exceptions x
     JOIN rules r ON r.id = x.rule_id
     WHERE x.case_id = ?
     ORDER BY x.created_at ASC, x.id ASC`,
  );
  const evidenceStmt = db.prepare(
    'SELECT * FROM evidence WHERE exception_id = ? ORDER BY display_order ASC',
  );
  const markSupersededStmt = db.prepare(
    `UPDATE exceptions
     SET status = 'SUPERSEDED_BY_EVALUATION',
         superseded_by_exception_id = @superseded_by,
         resolved_at = @at
     WHERE id = @id`,
  );

  return {
    insert: (row) => {
      insertStmt.run(row);
    },
    listOpenByEntry: (cargoEntryId) => listOpenStmt.all(cargoEntryId) as ExceptionRow[],
    listByEvaluation: (evaluationId) => listByEvalStmt.all(evaluationId) as ExceptionRow[],
    listByCaseWithEvidence: (caseId) => {
      const rows = listByCaseStmt.all(caseId) as Array<
        ExceptionRow & {
          rule_name: string;
          rule_description: string;
          rule_policy_reference: string;
        }
      >;
      return rows.map((row) => {
        const evidenceRows = evidenceStmt.all(row.id) as EvidenceRow[];
        let missing_information: MissingInformationItem[] = [];
        try {
          missing_information = JSON.parse(row.missing_information_json) as MissingInformationItem[];
        } catch {
          missing_information = [];
        }
        const record: ExceptionRecord = {
          id: row.id,
          evaluation_id: row.evaluation_id,
          cargo_entry_id: row.cargo_entry_id,
          case_id: row.case_id,
          rule_id: row.rule_id,
          rule_version: row.rule_version,
          exception_type: row.exception_type,
          sub_reason: row.sub_reason,
          severity: row.severity,
          status: row.status,
          assertion: row.assertion,
          missing_information,
          first_detected_evaluation_id: row.first_detected_evaluation_id,
          opened_at: row.opened_at,
          created_at: row.created_at,
          evidence: evidenceRows.map(toEvidenceRecord),
          rule_name: row.rule_name,
          rule_description: row.rule_description,
          policy_reference: row.rule_policy_reference,
        };
        return record;
      });
    },
    markSuperseded: (exceptionId, supersededByExceptionId, at) => {
      markSupersededStmt.run({
        id: exceptionId,
        superseded_by: supersededByExceptionId,
        at,
      });
    },
  };
}
