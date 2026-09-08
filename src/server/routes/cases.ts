/**
 * GET  /api/cases/:case_id/available-actions
 * POST /api/cases/:case_id/actions
 *
 * The action body is a discriminated union on `action` with
 * additionalProperties: false on every variant, so a property belonging to a
 * different action's schema is a loud 422, never silently ignored.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Database } from 'better-sqlite3';

import { getAvailableActions, executeAction } from '../../app/workflowService.js';
import type { ActionCommand } from '../../shared/api/types.js';
import type { RouteDefinition } from './registry.js';

function db(req: FastifyRequest): Database {
  return (req.server as unknown as { db: Database }).db;
}

const justification = { type: 'string', minLength: 1, maxLength: 2000 } as const;

const requestInformation = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'justification', 'document_types'],
  properties: {
    action: { const: 'REQUEST_INFORMATION' },
    justification,
    document_types: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
    requested_from: { type: ['string', 'null'], maxLength: 200 },
    due_by: { type: ['string', 'null'] },
    justify_unlisted_document: { type: 'boolean' },
  },
};

const sendForReview = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'justification'],
  properties: {
    action: { const: 'SEND_FOR_SPECIALIST_REVIEW' },
    justification,
    assign_to_user_id: { type: ['string', 'null'] },
  },
};

const clearException = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'justification', 'exception_ids', 'resolution_basis'],
  properties: {
    action: { const: 'CLEAR_EXCEPTION' },
    justification,
    exception_ids: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    resolution_basis: { enum: ['EXCEPTIONS_RESOLVED', 'EXCEPTIONS_ACCEPTED', 'MIXED'] },
    acknowledge_outstanding_requests: { type: 'boolean' },
  },
};

const placeOnHold = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'justification', 'hold_reason'],
  properties: {
    action: { const: 'PLACE_ON_HOLD' },
    justification,
    hold_reason: {
      enum: ['AWAITING_EXTERNAL_INPUT', 'PENDING_POLICY_GUIDANCE', 'RESOURCE_CONSTRAINT', 'OTHER'],
    },
    hold_reason_detail: { type: ['string', 'null'], maxLength: 500 },
    review_by: { type: ['string', 'null'] },
  },
};

const escalate = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'justification', 'escalation_reason'],
  properties: {
    action: { const: 'ESCALATE_TO_SUPERVISOR' },
    justification,
    escalation_reason: {
      enum: [
        'POLICY_AMBIGUITY',
        'HIGH_VALUE',
        'REPEAT_OFFENDER_PATTERN',
        'CONFLICTING_EVIDENCE',
        'OTHER',
      ],
    },
    escalation_reason_detail: { type: ['string', 'null'], maxLength: 500 },
    escalate_to_user_id: { type: ['string', 'null'] },
  },
};

const actionBody = {
  oneOf: [requestInformation, sendForReview, clearException, placeOnHold, escalate],
};

const caseParams = {
  type: 'object',
  additionalProperties: false,
  required: ['case_id'],
  properties: { case_id: { type: 'string' } },
} as const;

export const availableActionsRoute: RouteDefinition = {
  routeId: 'cases.availableActions',
  method: 'GET' as const,
  url: '/api/cases/:case_id/available-actions',
  schema: { params: caseParams },
  handler(req: FastifyRequest, reply: FastifyReply) {
    const { case_id } = req.params as { case_id: string };
    const response = getAvailableActions(db(req), case_id);
    reply.type('application/json; charset=utf-8').send(response);
  },
};

export const submitActionRoute: RouteDefinition = {
  routeId: 'cases.actions',
  method: 'POST' as const,
  url: '/api/cases/:case_id/actions',
  schema: {
    params: caseParams,
    headers: {
      type: 'object',
      properties: {
        'idempotency-key': { type: 'string', maxLength: 128 },
        'if-match-case-version': { type: 'string' },
      },
    },
    body: actionBody,
  },
  handler(req: FastifyRequest, reply: FastifyReply) {
    const { case_id } = req.params as { case_id: string };
    const headers = req.headers as Record<string, string | undefined>;
    const idempotencyKey = headers['idempotency-key'] ?? null;
    const ifMatchRaw = headers['if-match-case-version'];
    let ifMatchCaseVersion: number | null = null;
    if (ifMatchRaw !== undefined) {
      const n = Number(ifMatchRaw);
      ifMatchCaseVersion = Number.isFinite(n) ? n : null;
    }

    const output = executeAction(db(req), {
      caseId: case_id,
      command: req.body as ActionCommand,
      idempotencyKey,
      ifMatchCaseVersion,
    });

    reply
      .code(output.statusCode)
      .type('application/json; charset=utf-8')
      .header('X-Case-Version', String(output.caseVersion))
      .header('Location', `/api/shipments/${output.result.shipment_id}`)
      .send(output.result);
  },
};

export const caseRoutes: RouteDefinition[] = [availableActionsRoute, submitActionRoute];
