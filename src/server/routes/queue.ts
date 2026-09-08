/**
 * GET /api/queue — the exception queue read.
 *
 * The querystring schema declares every accepted parameter with
 * additionalProperties: false, so an unknown query parameter is a 422 rather than
 * a silently absorbed filter. Enum-value and page_size validation happens in
 * `queueService`, which returns INVALID_QUERY_PARAM (never a clamp).
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { listQueue } from '../../app/queueService.js';
import type { RouteDefinition } from './registry.js';

// A repeatable param arrives as a string (once) or an array of strings (many);
// `status`/`exception_type`/`priority` accept either. additionalProperties:false
// makes an unknown query parameter a 422 rather than a silently absorbed filter.
const repeatable = {
  anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
};

const querystring = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: repeatable,
    exception_type: repeatable,
    priority: repeatable,
    include_clean: { type: 'string' },
    include_cleared: { type: 'string' },
    sort: { type: 'string' },
    page: { type: 'string' },
    page_size: { type: 'string' },
  },
} as const;

export const queueListRoute: RouteDefinition = {
  routeId: 'queue.list',
  method: 'GET' as const,
  url: '/api/queue', // single-quoted literal, verbatim — contracts grep for it
  schema: { querystring },
  handler(this: unknown, req: FastifyRequest, reply: FastifyReply) {
    const db = (req.server as unknown as { db: import('better-sqlite3').Database }).db;
    const result = listQueue(db, (req.query ?? {}) as Record<string, unknown>);
    reply.type('application/json; charset=utf-8').send(result);
  },
};
