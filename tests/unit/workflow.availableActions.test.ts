import { describe, it, expect } from 'vitest';

import { computeAvailableActions } from '../../src/domain/workflow/availableActions.js';
import { evaluateTransition } from '../../src/domain/workflow/stateMachine.js';
import { CASE_STATUSES, USER_ACTIONS } from '../../src/domain/workflow/types.js';
import type { CaseStatus, UserAction, TransitionContext } from '../../src/domain/workflow/types.js';
import type { ActionCommand } from '../../src/shared/api/types.js';

function contextFor(status: CaseStatus, overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    status,
    open_exception_ids: ['exc-1', 'exc-2', 'exc-3'],
    missing_document_types: ['CERTIFICATE_OF_ORIGIN'],
    received_document_types: ['BILL_OF_LADING'],
    requested_document_types: [],
    now: '2026-09-08T12:00:00.000Z',
    ...overrides,
  };
}

const JUST = 'x'.repeat(20);
function wellFormed(action: UserAction, context: TransitionContext): ActionCommand {
  switch (action) {
    case 'REQUEST_INFORMATION':
      return { action, justification: JUST, document_types: ['CERTIFICATE_OF_ORIGIN'] };
    case 'SEND_FOR_SPECIALIST_REVIEW':
      return { action, justification: JUST };
    case 'CLEAR_EXCEPTION':
      return {
        action,
        justification: JUST,
        exception_ids: [...context.open_exception_ids],
        resolution_basis: 'EXCEPTIONS_RESOLVED',
      };
    case 'PLACE_ON_HOLD':
      return { action, justification: JUST, hold_reason: 'RESOURCE_CONSTRAINT' };
    case 'ESCALATE_TO_SUPERVISOR':
      return { action, justification: JUST, escalation_reason: 'POLICY_AMBIGUITY' };
  }
}

describe('computeAvailableActions', () => {
  it('returns exactly five entries in fixed order for every status, with reasons on unavailable ones', () => {
    for (const status of CASE_STATUSES) {
      const actions = computeAvailableActions(contextFor(status));
      expect(actions).toHaveLength(5);
      expect(actions.map((a) => a.action)).toEqual([...USER_ACTIONS]);
      for (const a of actions) {
        if (!a.available) {
          expect(a.reason, `${status}/${a.action} reason`).not.toBeNull();
          expect(a.reason_text, `${status}/${a.action} reason_text`).not.toBeNull();
        }
      }
    }
  });

  it('availability agrees with enforcement for all 35 pairs', () => {
    for (const status of CASE_STATUSES) {
      const context = contextFor(status);
      const projected = computeAvailableActions(context);
      for (const action of USER_ACTIONS) {
        const entry = projected.find((a) => a.action === action)!;
        const decision = evaluateTransition(status, action, context, wellFormed(action, context));
        // REQUEST_INFORMATION carries the extra NO_MISSING_DOCUMENTS rule, which
        // does not apply here (a certificate is missing), so the two agree.
        expect(entry.available, `${status}/${action}`).toBe(decision.ok);
      }
    }
  });

  it('NO_MISSING_DOCUMENTS appears when nothing is missing, not for the canonical context', () => {
    const nothingMissing = computeAvailableActions(
      contextFor('NEW', { missing_document_types: [], requested_document_types: [], open_exception_ids: [] }),
    );
    const ri = nothingMissing.find((a) => a.action === 'REQUEST_INFORMATION')!;
    expect(ri.available).toBe(false);
    expect(ri.reason).toBe('NO_MISSING_DOCUMENTS');

    const canonical = computeAvailableActions(contextFor('NEW'));
    const riCanonical = canonical.find((a) => a.action === 'REQUEST_INFORMATION')!;
    expect(riCanonical.reason).not.toBe('NO_MISSING_DOCUMENTS');
    expect(riCanonical.available).toBe(true);
  });

  it('justification_min_length is 10 everywhere and 40 for CLEAR_EXCEPTION with accepted/mixed basis', () => {
    const plain = computeAvailableActions(contextFor('NEW'));
    for (const a of plain) expect(a.justification_min_length).toBe(10);

    const accepted = computeAvailableActions(contextFor('NEW'), { clearanceBasis: 'EXCEPTIONS_ACCEPTED' });
    const clear = accepted.find((a) => a.action === 'CLEAR_EXCEPTION')!;
    expect(clear.justification_min_length).toBe(40);
    // other actions unaffected
    expect(accepted.find((a) => a.action === 'PLACE_ON_HOLD')!.justification_min_length).toBe(10);
  });

  it('no entry ever carries a role-derived reason', () => {
    const roleReasons = new Set([
      'ROLE_NOT_PERMITTED',
      'ESCALATED_REQUIRES_SUPERVISOR',
      'HOLD_REQUIRES_RELEASE',
      'SELF_APPROVAL_BLOCKED',
    ]);
    for (const status of CASE_STATUSES) {
      for (const a of computeAvailableActions(contextFor(status))) {
        if (a.reason) expect(roleReasons.has(a.reason)).toBe(false);
      }
    }
  });
});
