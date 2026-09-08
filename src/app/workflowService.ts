/**
 * The transactional action write (F09b) — the single uniform mutating skeleton
 * (TechArch §1.5). Everything from step 4 onward runs inside ONE db.transaction,
 * so a throw anywhere rolls the whole thing back: there is no state in which a
 * case moved but its action record did not.
 *
 * `executeAction` is the only reachable path that changes cases.status, and it
 * cannot be reached without a resolved human actor and a justification the human
 * wrote. The destination status comes from the pure `evaluateTransition`
 * decision, never from the request.
 */

import type { Db } from '../infra/db/connection.js';
import { repositories } from '../infra/db/index.js';
import { errors, type DomainError } from '../shared/api/errors.js';
import type {
  ActionCommand,
  ActionResult,
  AvailableAction,
  AvailableActionsResponse,
  CaseStatus,
  UserRef,
} from '../shared/api/types.js';
import type { CaseActionRow, CaseRow } from '../shared/types/db.js';
import { evaluateTransition } from '../domain/workflow/stateMachine.js';
import { validateJustification } from '../domain/workflow/justification.js';
import { computeAvailableActions } from '../domain/workflow/availableActions.js';
import { normalizeDocumentType } from '../domain/workflow/guards.js';
import type { TransitionContext } from '../domain/workflow/types.js';
import { resolveActor } from './actorService.js';
import { hashRequestBody } from '../infra/db/repositories/idempotencyRepository.js';
import { SystemClock, type Clock } from '../infra/clock.js';
import { UuidGenerator, type IdGenerator } from '../infra/ids.js';

const AUDIT_SENTINEL = 'AUDIT_NOT_IN_SCOPE';
const FIVE_ACTIONS = new Set([
  'REQUEST_INFORMATION',
  'SEND_FOR_SPECIALIST_REVIEW',
  'CLEAR_EXCEPTION',
  'PLACE_ON_HOLD',
  'ESCALATE_TO_SUPERVISOR',
]);

export interface ExecuteActionInput {
  caseId: string;
  command: ActionCommand;
  idempotencyKey?: string | null;
  ifMatchCaseVersion?: number | null;
}

export interface ExecuteActionDeps {
  clock?: Clock;
  ids?: IdGenerator;
}

export interface ExecuteActionOutput {
  statusCode: number;
  result: ActionResult;
  caseVersion: number;
  replayed: boolean;
}

function buildContext(db: Db, caseRow: CaseRow, now: string): TransitionContext {
  const ctx = repositories(db).workflow.buildTransitionContext(caseRow.id);
  return {
    status: caseRow.status,
    open_exception_ids: ctx.open_exception_ids,
    missing_document_types: ctx.missing_document_types,
    received_document_types: ctx.received_document_types,
    requested_document_types: ctx.requested_document_types,
    now,
  };
}

/**
 * Execute an action. Returns the ActionResult plus the new case version. Throws a
 * DomainError on any rejection; the caller maps it to the envelope.
 */
export function executeAction(
  db: Db,
  input: ExecuteActionInput,
  deps: ExecuteActionDeps = {},
): ExecuteActionOutput {
  const clock: Clock = deps.clock ?? new SystemClock();
  const ids: IdGenerator = deps.ids ?? new UuidGenerator();
  const repos = repositories(db);
  const command = input.command;
  const scope = `case:${input.caseId}:action`;

  // 1. The action must be one of the five (schema also enforces this, but a
  //    non-user action code is a distinct, explicit error).
  if (!FIVE_ACTIONS.has(command.action)) {
    throw errors.ACTION_NOT_A_USER_ACTION(`${command.action} is not one of the five user actions`);
  }

  // 2. Justification is mandatory on every action, before anything that could
  //    partially succeed.
  const justificationError = validateJustification(command.action, command);
  if (justificationError) throw justificationError;

  // 3. Idempotency replay (read outside the write transaction).
  if (input.idempotencyKey) {
    const existing = repos.idempotency.find(input.idempotencyKey, scope);
    if (existing) {
      const hash = hashRequestBody(command);
      if (existing.request_hash !== hash) {
        throw errors.IDEMPOTENCY_KEY_REUSED(
          'This idempotency key was already used with a different request body',
        );
      }
      const result = JSON.parse(existing.response_json) as ActionResult;
      return {
        statusCode: existing.status_code,
        result,
        caseVersion: result.case_version,
        replayed: true,
      };
    }
  }

  const run = db.transaction((): ExecuteActionOutput => {
    const now = clock.now();

    // 4. Load the case for update. The enclosing transaction runs BEGIN
    //    IMMEDIATE (see `.immediate()` below), so the writer is serialized for
    //    the whole use case.
    const caseRow = repos.workflow.loadCaseForUpdate(input.caseId);
    if (!caseRow) throw errors.RESOURCE_NOT_FOUND(`Case ${input.caseId} not found`);

    // 5. Optimistic concurrency check.
    if (
      input.ifMatchCaseVersion != null &&
      Date.parse(caseRow.updated_at) !== input.ifMatchCaseVersion
    ) {
      throw errors.CASE_VERSION_CONFLICT('Case was modified by another user; reload and retry');
    }

    // 6. Resolve the actor — a human with a name and role, read from the database.
    const actor = resolveActor(db);

    // 7. Decide (the only decision point, pure).
    const context = buildContext(db, caseRow, now);
    const decision = evaluateTransition(caseRow.status, command.action, context, command);
    if (!decision.ok) throw decision.error;
    const toStatus = decision.to;

    // 8. Apply the action's side effects as columns + parameters_json.
    const actionId = ids.next();
    const sideEffects = applySideEffects(db, {
      caseRow,
      command,
      actor,
      now,
      toStatus,
      context,
    });

    // 9. Write the case_actions row, then applyTransition, then last_action_id.
    const actionRow: CaseActionRow = {
      id: actionId,
      case_id: caseRow.id,
      cargo_entry_id: caseRow.cargo_entry_id,
      action: command.action,
      status_before: caseRow.status,
      status_after: toStatus,
      justification: command.justification,
      parameters_json: JSON.stringify(sideEffects.parameters),
      evaluation_id: caseRow.current_evaluation_id,
      actor_user_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      audit_entry_id: AUDIT_SENTINEL,
      idempotency_key: input.idempotencyKey ?? null,
      occurred_at: now,
    };
    repos.workflow.insertCaseAction(actionRow);

    repos.workflow.applyTransition({
      case_id: caseRow.id,
      status: toStatus,
      updated_at: now,
      last_action_id: actionId,
      ...sideEffects.columns,
    });

    // Recompute the context for the new state for the refreshed available actions.
    const reloaded = repos.workflow.loadCaseForUpdate(caseRow.id) as CaseRow;
    const newContext = buildContext(db, reloaded, now);
    const availableActions = computeAvailableActions(newContext);

    const caseVersion = Date.parse(now);

    const result: ActionResult = {
      action_id: actionId,
      case_id: caseRow.id,
      shipment_id: caseRow.shipment_id,
      action: command.action,
      status: { before: caseRow.status, after: toStatus },
      acting_user: actor,
      justification: command.justification,
      occurred_at: now,
      side_effects: sideEffects.result,
      available_actions: availableActions,
      case_version: caseVersion,
    };

    // 10. Persist the idempotency record within the same transaction.
    if (input.idempotencyKey) {
      repos.idempotency.save({
        key: input.idempotencyKey,
        scope,
        request_hash: hashRequestBody(command),
        response_json: JSON.stringify(result),
        status_code: 201,
        created_at: now,
      });
    }

    return { statusCode: 201, result, caseVersion, replayed: false };
  });

  // better-sqlite3 runs the transaction with BEGIN; use immediate mode for a
  // write lock across the whole use case.
  return (run as unknown as { immediate: () => ExecuteActionOutput }).immediate();
}

interface SideEffectContext {
  caseRow: CaseRow;
  command: ActionCommand;
  actor: UserRef & { role: 'CARGO_SPECIALIST' | 'SUPERVISOR' };
  now: string;
  toStatus: CaseStatus;
  context: TransitionContext;
}

interface SideEffects {
  columns: Record<string, unknown>;
  parameters: Record<string, unknown>;
  result: ActionResult['side_effects'];
}

function activeUserRef(db: Db, userId: string): UserRef | null {
  const u = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(userId) as
    | { id: string; name: string; role: string }
    | undefined;
  return u ? { id: u.id, name: u.name, role: u.role } : null;
}

function applySideEffects(db: Db, ctx: SideEffectContext): SideEffects {
  const { command, actor, now, caseRow } = ctx;
  const columns: Record<string, unknown> = {};
  const parameters: Record<string, unknown> = {};
  const result: ActionResult['side_effects'] = {
    document_types_requested: [],
    case_assigned_to: null,
    escalated_to: null,
    hold_reason: null,
    exceptions_cleared: [],
    approving_official: null,
    cleared_at: null,
  };

  switch (command.action) {
    case 'REQUEST_INFORMATION': {
      const normalized = command.document_types.map(normalizeDocumentType);
      parameters.document_types = normalized;
      parameters.requested_from = command.requested_from ?? null;
      parameters.due_by = command.due_by ?? null;
      parameters.justify_unlisted_document = command.justify_unlisted_document ?? false;
      result.document_types_requested = normalized;
      break;
    }
    case 'SEND_FOR_SPECIALIST_REVIEW': {
      if (command.assign_to_user_id) {
        const assignee = activeUserRef(db, command.assign_to_user_id);
        if (!assignee) {
          throw errors.ASSIGNEE_INVALID(
            `assign_to_user_id '${command.assign_to_user_id}' does not resolve to an active user`,
          );
        }
        columns.assigned_to_user_id = assignee.id;
        parameters.assign_to_user_id = assignee.id;
        result.case_assigned_to = assignee;
      }
      break;
    }
    case 'PLACE_ON_HOLD': {
      columns.hold_reason = command.hold_reason;
      columns.hold_reason_detail = command.hold_reason_detail ?? null;
      columns.hold_placed_by_user_id = actor.id;
      columns.hold_placed_at = now;
      parameters.hold_reason = command.hold_reason;
      parameters.hold_reason_detail = command.hold_reason_detail ?? null;
      parameters.review_by = command.review_by ?? null;
      result.hold_reason = command.hold_reason;
      break;
    }
    case 'ESCALATE_TO_SUPERVISOR': {
      columns.escalation_reason = command.escalation_reason;
      columns.escalated_by_user_id = actor.id;
      columns.escalated_at = now;
      parameters.escalation_reason = command.escalation_reason;
      parameters.escalation_reason_detail = command.escalation_reason_detail ?? null;
      if (command.escalate_to_user_id) {
        const target = activeUserRef(db, command.escalate_to_user_id);
        if (!target || target.role !== 'SUPERVISOR') {
          throw errors.ESCALATION_TARGET_INVALID(
            `escalate_to_user_id '${command.escalate_to_user_id}' does not resolve to an active supervisor`,
          );
        }
        columns.escalated_to_user_id = target.id;
        parameters.escalate_to_user_id = target.id;
        result.escalated_to = target;
      }
      break;
    }
    case 'CLEAR_EXCEPTION': {
      const ids = [...command.exception_ids];
      repositories(db).workflow.clearOpenExceptions(caseRow.id, ids, now);
      columns.approving_official_user_id = actor.id;
      columns.approving_official_name = actor.name;
      columns.approving_official_role = actor.role;
      columns.cleared_at = now;
      columns.open_exception_count = 0;
      columns.queued = 0 as const;
      columns.exception_type_summary = '';
      parameters.exception_ids = ids;
      parameters.resolution_basis = command.resolution_basis;
      parameters.acknowledge_outstanding_requests =
        command.acknowledge_outstanding_requests ?? false;
      result.exceptions_cleared = ids;
      result.approving_official = { id: actor.id, name: actor.name, role: actor.role };
      result.cleared_at = now;
      break;
    }
    default: {
      const never: never = command;
      throw new Error(`unhandled action ${String(never)}`);
    }
  }

  return { columns, parameters, result };
}

/**
 * The read-route projection: build the same context and call
 * computeAvailableActions, so the projection and the enforcement path share one
 * decision function and cannot disagree.
 */
export function getAvailableActions(db: Db, caseId: string): AvailableActionsResponse {
  const repos = repositories(db);
  const caseRow = repos.cases.getById(caseId);
  if (!caseRow) throw errors.RESOURCE_NOT_FOUND(`Case ${caseId} not found`);
  const actor = resolveActor(db);
  const now = new Date().toISOString();
  const context = buildContext(db, caseRow, now);
  const actions: AvailableAction[] = computeAvailableActions(context);
  return {
    case_id: caseRow.id,
    shipment_id: caseRow.shipment_id,
    status: caseRow.status,
    actor,
    actions,
    case_version: Date.parse(caseRow.updated_at),
  };
}

export type { DomainError };
