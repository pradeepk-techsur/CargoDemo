/**
 * The case workflow state machine as pure DATA (F09a §2). PURE — no clock, no
 * database, no HTTP. `evaluateTransition` never mutates its arguments.
 *
 * TRANSITIONS is one row per (from, action) pair over the seven statuses and the
 * five actions, keeping the FRD's T01-T33 ids so the table stays reviewable
 * against the spec. The modifications recorded in the plan's <scope_boundary>
 * each carry a `note` naming the deviation:
 *   - The role dimension collapses (access control is out of scope), so rows
 *     that differed only by role become permitted for the single actor.
 *   - CLEAR_EXCEPTION goes directly to CLEARED and records the acting user as the
 *     approving official — the two-person approval step is deferred.
 *   - PENDING_APPROVAL is a seed-only inbound status; its outbound rows are
 *     permitted rather than blocked on a pending recommendation that never exists.
 */

import { errors } from '../../shared/api/errors.js';
import type { ActionCommand, CaseStatus, UserAction } from '../../shared/api/types.js';
import { CASE_STATUSES, USER_ACTIONS } from './types.js';
import type { TransitionContext, TransitionDecision, TransitionRow } from './types.js';
import { validateJustification } from './justification.js';
import { GUARDS } from './guards.js';

export { CASE_STATUSES, USER_ACTIONS } from './types.js';

const CLEARED_NOTE =
  'CLEAR_EXCEPTION reaches CLEARED directly, recording the acting user as approving official; the two-person approval step is deferred';
const PENDING_NOTE =
  'PENDING_APPROVAL is a seed-only inbound status; this outbound row is permitted because its FRD block referenced a pending recommendation this build never creates';
const ROLE_NOTE =
  'role dimension dropped (access control out of scope), so this row is permitted for the single actor';

function row(
  id: string,
  from: CaseStatus,
  action: UserAction,
  to: CaseStatus | null,
  guards: TransitionRow['guards'] = [],
  invalid_reason: TransitionRow['invalid_reason'] = null,
  note: string | null = null,
): TransitionRow {
  return { id, from, action, to, guards, invalid_reason, note };
}

/**
 * The complete transition table. The T-ids preserve FRD F09a §2 numbering; T31
 * and T32 are the two CLEARED-terminal rows folded into the single T33 group in
 * the FRD prose (every action on a cleared case is terminal).
 */
export const TRANSITIONS: TransitionRow[] = [
  // NEW
  row('T01', 'NEW', 'REQUEST_INFORMATION', 'AWAITING_INFORMATION', ['G-DOC']),
  row('T02', 'NEW', 'SEND_FOR_SPECIALIST_REVIEW', 'IN_REVIEW'),
  row('T03', 'NEW', 'CLEAR_EXCEPTION', 'CLEARED', ['G-REC'], null, CLEARED_NOTE),
  row('T04', 'NEW', 'PLACE_ON_HOLD', 'ON_HOLD'),
  row('T05', 'NEW', 'ESCALATE_TO_SUPERVISOR', 'ESCALATED'),

  // IN_REVIEW
  row('T06', 'IN_REVIEW', 'REQUEST_INFORMATION', 'AWAITING_INFORMATION', ['G-DOC']),
  row('T07', 'IN_REVIEW', 'SEND_FOR_SPECIALIST_REVIEW', null, [], 'TRANSITION_REDUNDANT'),
  row('T08', 'IN_REVIEW', 'CLEAR_EXCEPTION', 'CLEARED', ['G-REC'], null, CLEARED_NOTE),
  row('T09', 'IN_REVIEW', 'PLACE_ON_HOLD', 'ON_HOLD'),
  row('T10', 'IN_REVIEW', 'ESCALATE_TO_SUPERVISOR', 'ESCALATED'),

  // AWAITING_INFORMATION
  row('T11', 'AWAITING_INFORMATION', 'REQUEST_INFORMATION', 'AWAITING_INFORMATION', ['G-DOC', 'G-DUP']),
  row('T12', 'AWAITING_INFORMATION', 'SEND_FOR_SPECIALIST_REVIEW', 'IN_REVIEW'),
  row('T13', 'AWAITING_INFORMATION', 'CLEAR_EXCEPTION', 'CLEARED', ['G-REC', 'G-ACK'], null, CLEARED_NOTE),
  row('T14', 'AWAITING_INFORMATION', 'PLACE_ON_HOLD', 'ON_HOLD'),
  row('T15', 'AWAITING_INFORMATION', 'ESCALATE_TO_SUPERVISOR', 'ESCALATED'),

  // ON_HOLD
  row('T16', 'ON_HOLD', 'REQUEST_INFORMATION', 'AWAITING_INFORMATION', ['G-DOC']),
  row('T17', 'ON_HOLD', 'SEND_FOR_SPECIALIST_REVIEW', 'IN_REVIEW'),
  row('T18', 'ON_HOLD', 'CLEAR_EXCEPTION', 'CLEARED', ['G-REC'], null, `${CLEARED_NOTE}; ${ROLE_NOTE}`),
  row('T19', 'ON_HOLD', 'PLACE_ON_HOLD', null, [], 'TRANSITION_REDUNDANT'),
  row('T20', 'ON_HOLD', 'ESCALATE_TO_SUPERVISOR', 'ESCALATED'),

  // ESCALATED
  row('T21', 'ESCALATED', 'REQUEST_INFORMATION', 'AWAITING_INFORMATION', ['G-DOC'], null, ROLE_NOTE),
  row('T22', 'ESCALATED', 'SEND_FOR_SPECIALIST_REVIEW', 'IN_REVIEW', [], null, ROLE_NOTE),
  row('T23', 'ESCALATED', 'CLEAR_EXCEPTION', 'CLEARED', ['G-REC'], null, `${CLEARED_NOTE}; ${ROLE_NOTE}`),
  row('T24', 'ESCALATED', 'PLACE_ON_HOLD', 'ON_HOLD', [], null, ROLE_NOTE),
  row('T25', 'ESCALATED', 'ESCALATE_TO_SUPERVISOR', null, [], 'TRANSITION_REDUNDANT'),

  // PENDING_APPROVAL (seed-only inbound; outbound rows permitted)
  row('T26', 'PENDING_APPROVAL', 'REQUEST_INFORMATION', 'AWAITING_INFORMATION', ['G-DOC'], null, PENDING_NOTE),
  row('T27', 'PENDING_APPROVAL', 'SEND_FOR_SPECIALIST_REVIEW', 'IN_REVIEW', [], null, PENDING_NOTE),
  row('T28', 'PENDING_APPROVAL', 'CLEAR_EXCEPTION', 'CLEARED', ['G-REC'], null, `${CLEARED_NOTE}; ${PENDING_NOTE}`),
  row('T29', 'PENDING_APPROVAL', 'PLACE_ON_HOLD', 'ON_HOLD', [], null, PENDING_NOTE),
  row('T30', 'PENDING_APPROVAL', 'ESCALATE_TO_SUPERVISOR', 'ESCALATED', [], null, PENDING_NOTE),

  // CLEARED — terminal for all five actions (T33 group)
  row('T33a', 'CLEARED', 'REQUEST_INFORMATION', null, [], 'CASE_TERMINAL'),
  row('T33b', 'CLEARED', 'SEND_FOR_SPECIALIST_REVIEW', null, [], 'CASE_TERMINAL'),
  row('T33c', 'CLEARED', 'CLEAR_EXCEPTION', null, [], 'CASE_TERMINAL'),
  row('T33d', 'CLEARED', 'PLACE_ON_HOLD', null, [], 'CASE_TERMINAL'),
  row('T33e', 'CLEARED', 'ESCALATE_TO_SUPERVISOR', null, [], 'CASE_TERMINAL'),
];

// Index by (from, action) for O(1) lookup.
const BY_KEY = new Map<string, TransitionRow>();
for (const r of TRANSITIONS) BY_KEY.set(`${r.from}::${r.action}`, r);

function lookupRow(from: CaseStatus, action: UserAction): TransitionRow | undefined {
  return BY_KEY.get(`${from}::${action}`);
}

/**
 * Decide a transition. Pure: reads no clock, touches no database, mutates
 * nothing. Order of checks matters — terminal is checked first so a cleared case
 * never reports a redundancy or a guard failure.
 */
export function evaluateTransition(
  status: CaseStatus,
  action: UserAction,
  context: TransitionContext,
  command: ActionCommand,
): TransitionDecision {
  // 1. Terminal case first.
  if (status === 'CLEARED') {
    return {
      ok: false,
      error: errors.CASE_TERMINAL('Shipment is Cleared and cannot be changed'),
    };
  }

  // 2. Look up the row.
  const rowFor = lookupRow(status, action);
  if (!rowFor) {
    return {
      ok: false,
      error: errors.INVALID_TRANSITION(`Cannot ${action} a case in status ${status}`),
    };
  }
  if (rowFor.invalid_reason) {
    if (rowFor.invalid_reason === 'CASE_TERMINAL') {
      return {
        ok: false,
        error: errors.CASE_TERMINAL('Shipment is Cleared and cannot be changed'),
      };
    }
    return {
      ok: false,
      error: errors.TRANSITION_REDUNDANT(`Case is already ${status}`),
    };
  }

  // 3. Justification is mandatory on every action, checked before guards.
  const justificationError = validateJustification(action, command);
  if (justificationError) return { ok: false, error: justificationError };

  // 4. Evaluate the row's guards in order; first failure wins.
  for (const guardId of rowFor.guards) {
    const guard = GUARDS[guardId];
    const guardError = guard(context, command);
    if (guardError) return { ok: false, error: guardError };
  }

  // 5. Permitted.
  return { ok: true, row: rowFor, to: rowFor.to as CaseStatus };
}

/** The full status × action cross-product, for exhaustive testing. */
export function allStatusActionPairs(): Array<{ status: CaseStatus; action: UserAction }> {
  const pairs: Array<{ status: CaseStatus; action: UserAction }> = [];
  for (const status of CASE_STATUSES) {
    for (const action of USER_ACTIONS) {
      pairs.push({ status, action });
    }
  }
  return pairs;
}
