/**
 * The available-actions projection (F09a §5). PURE.
 *
 * `computeAvailableActions` returns ALL FIVE actions — never a filtered subset —
 * each with `available`, `reason`, `reason_text`, `required_fields` and
 * `justification_min_length`. A hidden action explains nothing; PRD §6 requires
 * every unavailable action to state why.
 *
 * Availability is derived by calling `evaluateTransition` with a probe command
 * per action, so the projection and the write path share one decision function
 * and can never disagree.
 */

import type {
  AvailableAction,
  UnavailableReason,
  UserAction,
} from '../../shared/api/types.js';
import { USER_ACTIONS } from './types.js';
import type { TransitionContext } from './types.js';
import { evaluateTransition } from './stateMachine.js';
import type { ActionCommand } from '../../shared/api/types.js';
import { justificationMinLength } from './justification.js';

// The three reachable reason_text strings (FRD F09a §5), verbatim.
const REASON_TEXT: Record<UnavailableReason, string> = {
  TRANSITION_REDUNDANT: 'The case is already in this state.',
  CASE_TERMINAL: 'This shipment has been cleared and can no longer be changed.',
  NO_MISSING_DOCUMENTS: 'There are no outstanding document requirements to request.',
};

const REQUIRED_FIELDS: Record<UserAction, string[]> = {
  REQUEST_INFORMATION: ['justification', 'document_types'],
  SEND_FOR_SPECIALIST_REVIEW: ['justification'],
  CLEAR_EXCEPTION: ['justification', 'exception_ids', 'resolution_basis'],
  PLACE_ON_HOLD: ['justification', 'hold_reason'],
  ESCALATE_TO_SUPERVISOR: ['justification', 'escalation_reason'],
};

const PLACEHOLDER = 'x'.repeat(50); // a well-formed justification for the probe

/** A well-formed probe command per action, used only to test availability. */
function probeCommand(action: UserAction, context: TransitionContext): ActionCommand {
  switch (action) {
    case 'REQUEST_INFORMATION':
      return {
        action,
        justification: PLACEHOLDER,
        document_types: context.missing_document_types.length
          ? [context.missing_document_types[0] as string]
          : ['UNLISTED_DOCUMENT'],
        justify_unlisted_document: context.missing_document_types.length === 0,
      };
    case 'SEND_FOR_SPECIALIST_REVIEW':
      return { action, justification: PLACEHOLDER };
    case 'CLEAR_EXCEPTION':
      return {
        action,
        justification: PLACEHOLDER,
        exception_ids: [...context.open_exception_ids],
        resolution_basis: 'EXCEPTIONS_RESOLVED',
      };
    case 'PLACE_ON_HOLD':
      return { action, justification: PLACEHOLDER, hold_reason: 'RESOURCE_CONSTRAINT' };
    case 'ESCALATE_TO_SUPERVISOR':
      return { action, justification: PLACEHOLDER, escalation_reason: 'POLICY_AMBIGUITY' };
    default: {
      const never: never = action;
      throw new Error(`unhandled action ${String(never)}`);
    }
  }
}

/** Map the transition decision's error code to a projection reason, when one exists. */
function decisionReason(code: string): UnavailableReason | null {
  if (code === 'TRANSITION_REDUNDANT') return 'TRANSITION_REDUNDANT';
  if (code === 'CASE_TERMINAL') return 'CASE_TERMINAL';
  return null;
}

/**
 * Compute all five actions for a case context. `justification_min_length`
 * advertises the same number the write path enforces; for CLEAR_EXCEPTION the
 * caller may pass an accepted/mixed basis to see the 40-char floor.
 */
export function computeAvailableActions(
  context: TransitionContext,
  opts: { clearanceBasis?: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED' } = {},
): AvailableAction[] {
  return USER_ACTIONS.map((action) => {
    const decision = evaluateTransition(
      context.status,
      action,
      context,
      probeCommand(action, context),
    );

    let available = decision.ok;
    let reason: UnavailableReason | null = null;

    if (!decision.ok) {
      reason = decisionReason(decision.error.code);
    }

    // REQUEST_INFORMATION is additionally unavailable when nothing is missing
    // and nothing has been requested (NO_MISSING_DOCUMENTS).
    if (
      action === 'REQUEST_INFORMATION' &&
      context.status !== 'CLEARED' &&
      context.missing_document_types.length === 0 &&
      context.requested_document_types.length === 0
    ) {
      available = false;
      reason = 'NO_MISSING_DOCUMENTS';
    }

    const justification_min_length = justificationMinLength(action, opts.clearanceBasis ?? null);

    return {
      action,
      available,
      reason,
      reason_text: reason ? REASON_TEXT[reason] : null,
      required_fields: REQUIRED_FIELDS[action],
      justification_min_length,
    };
  });
}
