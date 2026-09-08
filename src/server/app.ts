/**
 * Fastify assembly (buildApp). Registers hooks and plugins in a FIXED order —
 * the order is a property, not a preference: nothing that touches domain state
 * runs before validation.
 *
 *   1. request id (onRequest)          — assigns X-Request-Id, echoed everywhere
 *   2. response headers (onSend)       — CSP with no framing directive; no-store on /api
 *   3. body limit + JSON parser        — 413 / 400 before any handler runs
 *   4. error mapper                    — uniform envelope for every failure
 *   5. request_log (onResponse)        — routing/outcome metadata only, no bodies
 *   6. routes from ROUTES
 *   7. SPA fallback                    — LAST, so /api always wins
 *
 * `buildApp` returns a configured instance WITHOUT listening, so tests drive it
 * with `app.inject()` and no port.
 */

import { randomBytes } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

import type { Db } from '../infra/db/connection.js';
import { registerHeaders } from './plugins/headers.js';
import { registerErrorMapper } from './plugins/errorMapper.js';
import { registerSpa } from './plugins/spa.js';
import { ROUTES } from './routes/registry.js';

const BODY_LIMIT = 1024 * 1024; // 1 MB
const REQUEST_LOG_MAX_ROWS = 10_000;

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
  interface FastifyRequest {
    requestId: string;
    startHrTime: bigint;
  }
}

function newRequestId(): string {
  return `req-${randomBytes(4).toString('hex')}`;
}

export interface BuildAppOptions {
  db: Db;
}

/** Assemble the app. Aborts if any registered route lacks a schema. */
export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: BODY_LIMIT,
    logger: false,
    // Do NOT strip unknown properties: an unknown query param or an extra body
    // field must be a loud 422, never a silently absorbed value. coerceTypes is
    // kept so repeatable query params arrive as arrays.
    ajv: { customOptions: { removeAdditional: false, coerceTypes: 'array', allErrors: true, allowUnionTypes: true } },
  });
  app.decorate('db', opts.db);

  // Route-schema self-check: a route without a schema cannot validate.
  for (const route of ROUTES) {
    if (!route.schema || Object.keys(route.schema).length === 0) {
      throw new Error(`ROUTE_SCHEMA_MISSING: route ${route.routeId} (${route.url}) has no schema`);
    }
  }

  // 1. Request id.
  app.addHook('onRequest', async (req, reply) => {
    const rid = newRequestId();
    req.requestId = rid;
    req.startHrTime = process.hrtime.bigint();
    reply.header('X-Request-Id', rid);
  });

  // 2. Response headers (CSP with no framing directive, no-store on /api).
  registerHeaders(app);

  // 3. request_log onResponse (routing/outcome metadata only).
  const insertLog = opts.db.prepare(
    `INSERT INTO request_log
       (id, request_id, method, path, status_code, actor_user_id, actor_role, duration_ms, error_code, created_at)
     VALUES (@id, @request_id, @method, @path, @status_code, @actor_user_id, @actor_role, @duration_ms, @error_code, @created_at)`,
  );
  const trimLog = opts.db.prepare(
    `DELETE FROM request_log WHERE id NOT IN (
       SELECT id FROM request_log ORDER BY created_at DESC, id DESC LIMIT ${REQUEST_LOG_MAX_ROWS}
     )`,
  );
  app.addHook('onResponse', async (req, reply) => {
    try {
      const durationMs = Number((process.hrtime.bigint() - (req.startHrTime ?? 0n)) / 1_000_000n);
      const errorCode = (reply as unknown as { cargoErrorCode?: string }).cargoErrorCode ?? null;
      insertLog.run({
        id: newRequestId().replace('req-', 'log-') + randomBytes(2).toString('hex'),
        request_id: req.requestId ?? 'req-unknown',
        method: req.method,
        path: (req.url.split('?')[0] ?? req.url).slice(0, 500),
        status_code: reply.statusCode,
        actor_user_id: null,
        actor_role: null,
        duration_ms: Number.isFinite(durationMs) ? durationMs : 0,
        error_code: errorCode,
        created_at: new Date().toISOString(),
      });
      trimLog.run();
    } catch {
      // request logging must never break a response
    }
  });

  // 4. Error mapper (setErrorHandler only; notFound is owned by the SPA plugin).
  registerErrorMapper(app);

  // 6. Routes.
  for (const route of ROUTES) {
    app.route({
      method: route.method,
      url: route.url,
      schema: route.schema,
      handler: route.handler,
    });
  }

  // 7. SPA fallback last.
  await registerSpa(app);

  await app.ready();
  return app;
}
