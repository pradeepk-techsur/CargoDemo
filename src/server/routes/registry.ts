/**
 * The route registry. `ROUTES` is an array of route definition objects and
 * NOTHING else — it declares no route path of its own, because the end-of-wave
 * inventory gate counts unique api path literals under `src/server/routes/` and
 * a stray one here would inflate the count.
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
import { shipmentRoutes } from './shipments.js';
import { caseRoutes } from './cases.js';

export const ROUTES: RouteDefinition[] = [queueListRoute, ...shipmentRoutes, ...caseRoutes];
