import { describe, it, expect } from 'vitest';

import {
  TRANSITIONS,
  evaluateTransition,
  allStatusActionPairs,
} from '../../src/domain/workflow/stateMachine.js';
import type { CaseStatus, UserAction, TransitionContext } from '../../src/domain/workflow/types.js';
import type { ActionCommand } from '../../src/shared/api/types.js';

// A context with the canonical shipment's shape: three open exceptions, a
// missing certificate of origin, three received documents.
function baseContext(status: CaseStatus): TransitionContext {
  return {
    status,
    open_exception_ids: ['exc-1', 'exc-2', 'exc-3'],
    missing_document_types: ['CERTIFICATE_OF_ORIGIN'],
    received_document_types: ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST'],
    requested_document_types: [],
    now: '2026-09-08T12:00:00.000Z',
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

// The literal expectation table for the full 35-pair cross-product. Each cell is
// either 'ok' or the error code returned. A future edit that quietly permits
// something must change this table too.
type Expect = 'ok' | string;
const EXPECT: Record<CaseStatus, Record<UserAction, Expect>> = {
  NEW: {
    REQUEST_INFORMATION: 'ok',
    SEND_FOR_SPECIALIST_REVIEW: 'ok',
    CLEAR_EXCEPTION: 'ok',
    PLACE_ON_HOLD: 'ok',
    ESCALATE_TO_SUPERVISOR: 'ok',
  },
  IN_REVIEW: {
    REQUEST_INFORMATION: 'ok',
    SEND_FOR_SPECIALIST_REVIEW: 'TRANSITION_REDUNDANT',
    CLEAR_EXCEPTION: 'ok',
    PLACE_ON_HOLD: 'ok',
    ESCALATE_TO_SUPERVISOR: 'ok',
  },
  AWAITING_INFORMATION: {
    REQUEST_INFORMATION: 'ok',
    SEND_FOR_SPECIALIST_REVIEW: 'ok',
    CLEAR_EXCEPTION: 'ok',
    PLACE_ON_HOLD: 'ok',
    ESCALATE_TO_SUPERVISOR: 'ok',
  },
  ON_HOLD: {
    REQUEST_INFORMATION: 'ok',
    SEND_FOR_SPECIALIST_REVIEW: 'ok',
    CLEAR_EXCEPTION: 'ok',
    PLACE_ON_HOLD: 'TRANSITION_REDUNDANT',
    ESCALATE_TO_SUPERVISOR: 'ok',
  },
  ESCALATED: {
    REQUEST_INFORMATION: 'ok',
    SEND_FOR_SPECIALIST_REVIEW: 'ok',
    CLEAR_EXCEPTION: 'ok',
    PLACE_ON_HOLD: 'ok',
    ESCALATE_TO_SUPERVISOR: 'TRANSITION_REDUNDANT',
  },
  PENDING_APPROVAL: {
    REQUEST_INFORMATION: 'ok',
    SEND_FOR_SPECIALIST_REVIEW: 'ok',
    CLEAR_EXCEPTION: 'ok',
    PLACE_ON_HOLD: 'ok',
    ESCALATE_TO_SUPERVISOR: 'ok',
  },
  CLEARED: {
    REQUEST_INFORMATION: 'CASE_TERMINAL',
    SEND_FOR_SPECIALIST_REVIEW: 'CASE_TERMINAL',
    CLEAR_EXCEPTION: 'CASE_TERMINAL',
    PLACE_ON_HOLD: 'CASE_TERMINAL',
    ESCALATE_TO_SUPERVISOR: 'CASE_TERMINAL',
  },
};

describe('state machine — the full 35-pair cross-product', () => {
  it('covers exactly 35 (status, action) pairs with no undefined outcome', () => {
    const pairs = allStatusActionPairs();
    expect(pairs).toHaveLength(35);
    for (const { status, action } of pairs) {
      const context = baseContext(status);
      const decision = evaluateTransition(status, action, context, wellFormed(action, context));
      const expected = EXPECT[status][action];
      if (expected === 'ok') {
        expect(decision.ok, `${status} + ${action} should be ok`).toBe(true);
      } else {
        expect(decision.ok, `${status} + ${action} should be rejected`).toBe(false);
        if (!decision.ok) expect(decision.error.code).toBe(expected);
      }
    }
  });

  it('CLEARED plus each of the five actions is 409 CASE_TERMINAL', () => {
    const context = baseContext('CLEARED');
    for (const action of Object.keys(EXPECT.CLEARED) as UserAction[]) {
      const decision = evaluateTransition('CLEARED', action, context, wellFormed(action, context));
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.error.code).toBe('CASE_TERMINAL');
        expect(decision.error.httpStatus).toBe(409);
      }
    }
  });

  it('redundant transitions carry the current status in the message', () => {
    const cases: Array<[CaseStatus, UserAction]> = [
      ['IN_REVIEW', 'SEND_FOR_SPECIALIST_REVIEW'],
      ['ON_HOLD', 'PLACE_ON_HOLD'],
      ['ESCALATED', 'ESCALATE_TO_SUPERVISOR'],
    ];
    for (const [status, action] of cases) {
      const context = baseContext(status);
      const decision = evaluateTransition(status, action, context, wellFormed(action, context));
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.error.code).toBe('TRANSITION_REDUNDANT');
        expect(decision.error.message).toContain(status);
      }
    }
  });

  it('exactly six rows target CLEARED, all of them CLEAR_EXCEPTION', () => {
    const clearing = TRANSITIONS.filter((r) => r.to === 'CLEARED');
    expect(clearing).toHaveLength(6);
    expect(clearing.every((r) => r.action === 'CLEAR_EXCEPTION')).toBe(true);
  });
});

describe('mandatory justification — all five actions', () => {
  const bad = ['', '   ', 'x'.repeat(9)] as const;
  it('missing / empty / whitespace / 9-char justifications are all rejected', () => {
    for (const action of Object.keys(EXPECT.NEW) as UserAction[]) {
      const context = baseContext('NEW');
      // missing
      const missing = { ...wellFormed(action, context) } as Record<string, unknown>;
      delete missing.justification;
      const d0 = evaluateTransition('NEW', action, context, missing as unknown as ActionCommand);
      expect(d0.ok).toBe(false);
      if (!d0.ok) expect(d0.error.code).toBe('JUSTIFICATION_REQUIRED');
      for (const j of bad) {
        const cmd = { ...wellFormed(action, context), justification: j } as ActionCommand;
        const d = evaluateTransition('NEW', action, context, cmd);
        expect(d.ok, `${action} with '${j}'`).toBe(false);
        if (!d.ok) expect(d.error.code).toBe('JUSTIFICATION_REQUIRED');
      }
    }
  });

  it('CLEAR_EXCEPTION: 39-char justification is rejected for MIXED, accepted for RESOLVED', () => {
    const context = baseContext('NEW');
    const j39 = 'x'.repeat(39);
    const mixed = {
      action: 'CLEAR_EXCEPTION',
      justification: j39,
      exception_ids: [...context.open_exception_ids],
      resolution_basis: 'MIXED',
    } as ActionCommand;
    const dMixed = evaluateTransition('NEW', 'CLEAR_EXCEPTION', context, mixed);
    expect(dMixed.ok).toBe(false);
    if (!dMixed.ok) expect(dMixed.error.code).toBe('JUSTIFICATION_REQUIRED');

    const resolved = { ...mixed, resolution_basis: 'EXCEPTIONS_RESOLVED' } as ActionCommand;
    const dResolved = evaluateTransition('NEW', 'CLEAR_EXCEPTION', context, resolved);
    expect(dResolved.ok).toBe(true);
  });
});

describe('guards', () => {
  it('G-DOC: unlisted type rejected; passes with justify_unlisted_document + 25-char; fails with 15-char', () => {
    const context = baseContext('NEW');
    const unlisted = {
      action: 'REQUEST_INFORMATION',
      justification: 'x'.repeat(25),
      document_types: ['SOME_OTHER_DOC'],
    } as ActionCommand;
    const d0 = evaluateTransition('NEW', 'REQUEST_INFORMATION', context, unlisted);
    expect(d0.ok).toBe(false);
    if (!d0.ok) expect(d0.error.code).toBe('DOCUMENT_TYPE_NOT_REQUIRED');

    const ok = { ...unlisted, justify_unlisted_document: true } as ActionCommand;
    expect(evaluateTransition('NEW', 'REQUEST_INFORMATION', context, ok).ok).toBe(true);

    const short = { ...ok, justification: 'x'.repeat(15) } as ActionCommand;
    const dShort = evaluateTransition('NEW', 'REQUEST_INFORMATION', context, short);
    expect(dShort.ok).toBe(false);
    if (!dShort.ok) expect(dShort.error.code).toBe('JUSTIFICATION_REQUIRED');
  });

  it('G-DOC: an already-received type is DOCUMENT_ALREADY_RECEIVED', () => {
    const context = baseContext('NEW');
    const cmd = {
      action: 'REQUEST_INFORMATION',
      justification: JUST,
      document_types: ['BILL_OF_LADING'],
    } as ActionCommand;
    const d = evaluateTransition('NEW', 'REQUEST_INFORMATION', context, cmd);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error.code).toBe('DOCUMENT_ALREADY_RECEIVED');
  });

  it('G-DUP: an already-requested type from AWAITING_INFORMATION is a duplicate; a new type passes', () => {
    const context: TransitionContext = {
      ...baseContext('AWAITING_INFORMATION'),
      missing_document_types: ['CERTIFICATE_OF_ORIGIN', 'IMPORT_LICENSE'],
      requested_document_types: ['CERTIFICATE_OF_ORIGIN'],
    };
    const dup = {
      action: 'REQUEST_INFORMATION',
      justification: JUST,
      document_types: ['CERTIFICATE_OF_ORIGIN'],
    } as ActionCommand;
    const dDup = evaluateTransition('AWAITING_INFORMATION', 'REQUEST_INFORMATION', context, dup);
    expect(dDup.ok).toBe(false);
    if (!dDup.ok) expect(dDup.error.code).toBe('DUPLICATE_DOCUMENT_REQUEST');

    const fresh = { ...dup, document_types: ['IMPORT_LICENSE'] } as ActionCommand;
    expect(
      evaluateTransition('AWAITING_INFORMATION', 'REQUEST_INFORMATION', context, fresh).ok,
    ).toBe(true);
  });

  it('G-REC: subset, superset and unknown id are EXCEPTION_SET_STALE; the exact set passes', () => {
    const context = baseContext('NEW');
    const mk = (ids: string[]) =>
      ({
        action: 'CLEAR_EXCEPTION',
        justification: JUST,
        exception_ids: ids,
        resolution_basis: 'EXCEPTIONS_RESOLVED',
      }) as ActionCommand;

    for (const ids of [['exc-1'], ['exc-1', 'exc-2', 'exc-3', 'exc-4'], ['exc-1', 'exc-2', 'zzz']]) {
      const d = evaluateTransition('NEW', 'CLEAR_EXCEPTION', context, mk(ids));
      expect(d.ok, JSON.stringify(ids)).toBe(false);
      if (!d.ok) expect(d.error.code).toBe('EXCEPTION_SET_STALE');
    }
    expect(evaluateTransition('NEW', 'CLEAR_EXCEPTION', context, mk(['exc-1', 'exc-2', 'exc-3'])).ok).toBe(
      true,
    );
  });

  it('G-REC: an empty array with an empty open set passes', () => {
    const context: TransitionContext = { ...baseContext('NEW'), open_exception_ids: [] };
    const cmd = {
      action: 'CLEAR_EXCEPTION',
      justification: JUST,
      exception_ids: [],
      resolution_basis: 'EXCEPTIONS_RESOLVED',
    } as ActionCommand;
    expect(evaluateTransition('NEW', 'CLEAR_EXCEPTION', context, cmd).ok).toBe(true);
  });

  it('G-ACK: clearing from AWAITING_INFORMATION with an outstanding request needs acknowledgement', () => {
    const context: TransitionContext = {
      ...baseContext('AWAITING_INFORMATION'),
      requested_document_types: ['CERTIFICATE_OF_ORIGIN'],
      received_document_types: ['BILL_OF_LADING'],
    };
    const noAck = {
      action: 'CLEAR_EXCEPTION',
      justification: 'x'.repeat(40),
      exception_ids: [...context.open_exception_ids],
      resolution_basis: 'EXCEPTIONS_RESOLVED',
    } as ActionCommand;
    const dNo = evaluateTransition('AWAITING_INFORMATION', 'CLEAR_EXCEPTION', context, noAck);
    expect(dNo.ok).toBe(false);
    if (!dNo.ok) expect(dNo.error.code).toBe('OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED');

    const withAck = { ...noAck, acknowledge_outstanding_requests: true } as ActionCommand;
    expect(evaluateTransition('AWAITING_INFORMATION', 'CLEAR_EXCEPTION', context, withAck).ok).toBe(true);
  });
});

describe('purity', () => {
  it('evaluateTransition does not mutate its context or command', () => {
    const context = Object.freeze(baseContext('NEW'));
    const command = Object.freeze(wellFormed('SEND_FOR_SPECIALIST_REVIEW', context));
    expect(() =>
      evaluateTransition('NEW', 'SEND_FOR_SPECIALIST_REVIEW', context, command),
    ).not.toThrow();
  });
});
