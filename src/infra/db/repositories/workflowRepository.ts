/**
 * Workflow repository — thin named prepared statements, bound parameters only.
 * No ORM, no template-literal SQL, no caller string concatenated into a query
 * (TechArch §5.3, T-03-03).
 *
 * `applyTransition` holds THE ONLY statement in the entire codebase that writes
 * the case status column (T-03-02) — nothing else does. Do not add a second
 * status-writing statement anywhere. The human-authority test asserts exactly one
 * such statement across src/, so the phrase is never repeated in prose here.
 */

import type { Db } from '../connection.js';
import type { CaseRow, CaseActionRow } from '../../../shared/types/db.js';
import type { CaseActionView, UserRef } from '../../../shared/api/types.js';

export interface BuildTransitionContextResult {
  open_exception_ids: string[];
  missing_document_types: string[];
  received_document_types: string[];
  requested_document_types: string[];
}

export interface ApplyTransitionInput {
  case_id: string;
  status: string;
  updated_at: string;
  last_action_id: string;
  assigned_to_user_id?: string | null;
  hold_reason?: string | null;
  hold_reason_detail?: string | null;
  hold_placed_by_user_id?: string | null;
  hold_placed_at?: string | null;
  escalation_reason?: string | null;
  escalated_by_user_id?: string | null;
  escalated_to_user_id?: string | null;
  escalated_at?: string | null;
  approving_official_user_id?: string | null;
  approving_official_name?: string | null;
  approving_official_role?: string | null;
  cleared_at?: string | null;
  open_exception_count?: number | null;
  queued?: 0 | 1 | null;
  exception_type_summary?: string | null;
}

export interface WorkflowRepository {
  loadCaseForUpdate(caseId: string): CaseRow | undefined;
  buildTransitionContext(caseId: string): BuildTransitionContextResult;
  insertCaseAction(row: CaseActionRow): void;
  applyTransition(input: ApplyTransitionInput): void;
  clearOpenExceptions(caseId: string, exceptionIds: string[], at: string): void;
  listCaseActions(caseId: string, limit: number): CaseActionView[];
}

interface OpenExceptionRow {
  id: string;
  missing_information_json: string;
}

interface MissingInfoItem {
  document_type: string | null;
}

interface CaseActionQueryRow {
  id: string;
  action: CaseActionView['action'];
  status_before: string;
  status_after: string;
  justification: string;
  parameters_json: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  occurred_at: string;
}

export function createWorkflowRepository(db: Db): WorkflowRepository {
  const loadCaseStmt = db.prepare('SELECT * FROM cases WHERE id = ?');

  const openExceptionsStmt = db.prepare(
    "SELECT id, missing_information_json FROM exceptions WHERE case_id = ? AND status = 'OPEN' ORDER BY created_at ASC, id ASC",
  );

  const receivedDocsStmt = db.prepare(
    `SELECT DISTINCT d.document_type AS document_type
       FROM documents d
       JOIN cases c ON c.cargo_entry_id = d.cargo_entry_id
      WHERE c.id = ? AND d.status = 'RECEIVED' AND d.superseded = 0`,
  );

  // The most recent transition INTO AWAITING_INFORMATION (status_after is
  // AWAITING_INFORMATION and status_before is not).
  const lastAwaitingEntryStmt = db.prepare(
    `SELECT occurred_at FROM case_actions
      WHERE case_id = ? AND status_after = 'AWAITING_INFORMATION' AND status_before <> 'AWAITING_INFORMATION'
      ORDER BY occurred_at DESC, id DESC LIMIT 1`,
  );
  const requestActionsStmt = db.prepare(
    `SELECT parameters_json FROM case_actions
      WHERE case_id = ? AND action = 'REQUEST_INFORMATION' AND occurred_at >= ?
      ORDER BY occurred_at ASC`,
  );
  const allRequestActionsStmt = db.prepare(
    `SELECT parameters_json FROM case_actions
      WHERE case_id = ? AND action = 'REQUEST_INFORMATION'
      ORDER BY occurred_at ASC`,
  );

  const insertActionStmt = db.prepare(
    `INSERT INTO case_actions
       (id, case_id, cargo_entry_id, action, status_before, status_after, justification,
        parameters_json, evaluation_id, actor_user_id, actor_name, actor_role,
        audit_entry_id, idempotency_key, occurred_at)
     VALUES
       (@id, @case_id, @cargo_entry_id, @action, @status_before, @status_after, @justification,
        @parameters_json, @evaluation_id, @actor_user_id, @actor_name, @actor_role,
        @audit_entry_id, @idempotency_key, @occurred_at)`,
  );

  // THE ONLY statement in the codebase that writes the case status column.
  const applyTransitionStmt = db.prepare(
    `UPDATE cases
        SET status = @status,
            updated_at = @updated_at,
            last_action_id = @last_action_id,
            assigned_to_user_id = COALESCE(@assigned_to_user_id, assigned_to_user_id),
            hold_reason = COALESCE(@hold_reason, hold_reason),
            hold_reason_detail = COALESCE(@hold_reason_detail, hold_reason_detail),
            hold_placed_by_user_id = COALESCE(@hold_placed_by_user_id, hold_placed_by_user_id),
            hold_placed_at = COALESCE(@hold_placed_at, hold_placed_at),
            escalation_reason = COALESCE(@escalation_reason, escalation_reason),
            escalated_by_user_id = COALESCE(@escalated_by_user_id, escalated_by_user_id),
            escalated_to_user_id = COALESCE(@escalated_to_user_id, escalated_to_user_id),
            escalated_at = COALESCE(@escalated_at, escalated_at),
            approving_official_user_id = COALESCE(@approving_official_user_id, approving_official_user_id),
            approving_official_name = COALESCE(@approving_official_name, approving_official_name),
            approving_official_role = COALESCE(@approving_official_role, approving_official_role),
            cleared_at = COALESCE(@cleared_at, cleared_at),
            open_exception_count = COALESCE(@open_exception_count, open_exception_count),
            queued = COALESCE(@queued, queued),
            exception_type_summary = COALESCE(@exception_type_summary, exception_type_summary)
      WHERE id = @case_id`,
  );

  // A decision clearance sets status to CLEARED_BY_DECISION and stamps resolved_at.
  // resolution_reason stays NULL — its enum is for revalidation-based resolution,
  // not for a human clearance decision. cleared_by_approval_id stays NULL because
  // the approval chain is deferred (see the plan's scope boundary).
  const clearExceptionStmt = db.prepare(
    `UPDATE exceptions
        SET status = 'CLEARED_BY_DECISION', resolved_at = @at
      WHERE id = @id AND case_id = @case_id`,
  );

  const listActionsStmt = db.prepare(
    `SELECT ca.id, ca.action, ca.status_before, ca.status_after, ca.justification,
            ca.parameters_json, ca.actor_user_id, ca.actor_name, ca.actor_role, ca.occurred_at
       FROM case_actions ca
      WHERE ca.case_id = ?
      ORDER BY ca.occurred_at DESC, ca.id DESC
      LIMIT ?`,
  );

  function collectRequestedTypes(rows: Array<{ parameters_json: string }>): string[] {
    const out = new Set<string>();
    for (const r of rows) {
      try {
        const params = JSON.parse(r.parameters_json) as { document_types?: unknown };
        if (Array.isArray(params.document_types)) {
          for (const t of params.document_types) {
            if (typeof t === 'string') out.add(t);
          }
        }
      } catch {
        // ignore malformed parameters
      }
    }
    return [...out];
  }

  return {
    loadCaseForUpdate: (caseId) => loadCaseStmt.get(caseId) as CaseRow | undefined,

    buildTransitionContext: (caseId) => {
      const openRows = openExceptionsStmt.all(caseId) as OpenExceptionRow[];
      const open_exception_ids = openRows.map((r) => r.id);
      const missingSet = new Set<string>();
      for (const r of openRows) {
        try {
          const items = JSON.parse(r.missing_information_json) as MissingInfoItem[];
          for (const item of items) {
            if (item.document_type) missingSet.add(item.document_type);
          }
        } catch {
          // ignore
        }
      }
      const received = (receivedDocsStmt.all(caseId) as Array<{ document_type: string }>).map(
        (r) => r.document_type,
      );

      const lastAwaiting = lastAwaitingEntryStmt.get(caseId) as { occurred_at: string } | undefined;
      const requestRows = lastAwaiting
        ? (requestActionsStmt.all(caseId, lastAwaiting.occurred_at) as Array<{ parameters_json: string }>)
        : (allRequestActionsStmt.all(caseId) as Array<{ parameters_json: string }>);

      return {
        open_exception_ids,
        missing_document_types: [...missingSet],
        received_document_types: received,
        requested_document_types: collectRequestedTypes(requestRows),
      };
    },

    insertCaseAction: (row) => {
      insertActionStmt.run(row);
    },

    applyTransition: (input) => {
      applyTransitionStmt.run({
        case_id: input.case_id,
        status: input.status,
        updated_at: input.updated_at,
        last_action_id: input.last_action_id,
        assigned_to_user_id: input.assigned_to_user_id ?? null,
        hold_reason: input.hold_reason ?? null,
        hold_reason_detail: input.hold_reason_detail ?? null,
        hold_placed_by_user_id: input.hold_placed_by_user_id ?? null,
        hold_placed_at: input.hold_placed_at ?? null,
        escalation_reason: input.escalation_reason ?? null,
        escalated_by_user_id: input.escalated_by_user_id ?? null,
        escalated_to_user_id: input.escalated_to_user_id ?? null,
        escalated_at: input.escalated_at ?? null,
        approving_official_user_id: input.approving_official_user_id ?? null,
        approving_official_name: input.approving_official_name ?? null,
        approving_official_role: input.approving_official_role ?? null,
        cleared_at: input.cleared_at ?? null,
        open_exception_count: input.open_exception_count ?? null,
        queued: input.queued ?? null,
        exception_type_summary: input.exception_type_summary ?? null,
      });
    },

    clearOpenExceptions: (caseId, exceptionIds, at) => {
      for (const id of exceptionIds) {
        clearExceptionStmt.run({ id, case_id: caseId, at });
      }
    },

    listCaseActions: (caseId, limit) => {
      const rows = listActionsStmt.all(caseId, limit) as CaseActionQueryRow[];
      // Ascending by occurred_at for the history view; the query fetched the most
      // recent `limit` rows descending, so reverse.
      return rows.reverse().map((r) => {
        let parameters: Record<string, unknown> = {};
        try {
          parameters = JSON.parse(r.parameters_json) as Record<string, unknown>;
        } catch {
          parameters = {};
        }
        const actor: UserRef = { id: r.actor_user_id, name: r.actor_name, role: r.actor_role };
        return {
          action_id: r.id,
          action: r.action,
          status_before: r.status_before as CaseActionView['status_before'],
          status_after: r.status_after as CaseActionView['status_after'],
          justification: r.justification,
          parameters,
          actor,
          occurred_at: r.occurred_at,
        };
      });
    },
  };
}
