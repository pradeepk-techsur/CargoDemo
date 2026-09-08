/**
 * The route registry. `ROUTES` is an array of route definition objects and
 * NOTHING else — it contains no `url:` literal of its own, because the
 * end-of-wave inventory gate counts unique `url: '/api/…'` literals under
 * `src/server/routes/`.
 *
 * Task 2 registers one route (queue); Task 3 appends the other five.
 */

import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';

export interface RouteDefinition {
  routeId: string;
  method: 'GET' | 'POST';
  url: string;
  schema: Record<string, unknown>;
  handler: RouteHandlerMethod;
}

export type { FastifyReply, FastifyRequest };

import { queueListRoute } from './queue.js';

export const ROUTES: RouteDefinition[] = [queueListRoute];
