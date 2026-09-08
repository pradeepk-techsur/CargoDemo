/**
 * Response header policy — the iframe contract.
 *
 * No framing header is ever emitted and the CSP contains no framing directive of
 * any kind; see the plan's scope boundary. A security-header middleware is
 * deliberately NOT installed, because its defaults reintroduce the framing header
 * that blanks the Pivota Preview iframe.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
  "script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'";

/** The header set for a given path. `/api/*` responses are never cached. */
export function buildResponseHeaders(path: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (path.startsWith('/api/') || path === '/api') {
    headers['Cache-Control'] = 'no-store';
  }
  return headers;
}

/** Register the onSend hook that applies the header set to every response. */
export function registerHeaders(app: FastifyInstance): void {
  app.addHook(
    'onSend',
    async (req: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      const headers = buildResponseHeaders(req.url.split('?')[0] ?? req.url);
      for (const [name, value] of Object.entries(headers)) {
        reply.header(name, value);
      }
      return payload;
    },
  );
}
