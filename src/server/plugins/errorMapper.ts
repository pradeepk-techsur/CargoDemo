/**
 * Error mapping into the uniform envelope. Maps `DomainError`, Fastify schema
 * validation failures (into 422 VALIDATION_FAILED with `field_errors` collecting
 * EVERY failure in one response) and any unhandled throw (500 INTERNAL_ERROR).
 * SQL, stack traces, absolute paths and environment values are stripped from
 * every message; diagnosis happens through `request_id`.
 *
 * An unmatched /api path is 404 RESOURCE_NOT_FOUND in the envelope, never
 * Fastify's default shape.
 */

import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  DomainError,
  ERROR_HTTP_STATUS,
  errors,
  type ErrorEnvelope,
  type FieldError,
} from '../../shared/api/errors.js';

function requestId(req: FastifyRequest): string {
  return (req as FastifyRequest & { requestId?: string }).requestId ?? 'req-unknown';
}

function sendEnvelope(reply: FastifyReply, status: number, body: ErrorEnvelope): void {
  reply.code(status).type('application/json; charset=utf-8').send(body);
}

/** Collect every Fastify validation error into field_errors. */
function toFieldErrors(validation: FastifyError['validation']): FieldError[] {
  if (!validation) return [];
  return validation.map((v) => {
    const instancePath = (v as { instancePath?: string }).instancePath ?? '';
    const missing = (v.params as { missingProperty?: string } | undefined)?.missingProperty;
    const path = missing ? `${instancePath}/${missing}` : instancePath || '/';
    return {
      path: path.replace(/^\//, '').replace(/\//g, '.') || '(root)',
      code: (v.keyword ?? 'invalid').toUpperCase(),
      message: v.message ?? 'is invalid',
    };
  });
}

/** Emit the RESOURCE_NOT_FOUND envelope for an unmatched /api path. */
export function sendApiNotFound(req: FastifyRequest, reply: FastifyReply): void {
  const err = errors.RESOURCE_NOT_FOUND(`No resource at ${req.method} ${req.url.split('?')[0]}`);
  sendEnvelope(reply, err.httpStatus, err.toEnvelope(requestId(req)));
}

export function registerErrorMapper(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
    const rid = requestId(req);

    // 1. Domain errors carry their own code and status.
    if (error instanceof DomainError) {
      sendEnvelope(reply, error.httpStatus, error.toEnvelope(rid));
      return;
    }

    // 2. Malformed JSON body.
    if (
      error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ||
      error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
      (typeof error.message === 'string' &&
        /JSON|Unexpected (token|end)/i.test(error.message) &&
        (error.statusCode === 400 || error.code?.startsWith('FST_ERR_CTP')))
    ) {
      const e = errors.MALFORMED_JSON('The request body is not valid JSON');
      sendEnvelope(reply, e.httpStatus, e.toEnvelope(rid));
      return;
    }

    // 3. Body too large.
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || error.statusCode === 413) {
      const e = errors.PAYLOAD_TOO_LARGE('The request body exceeds the 1 MB limit');
      sendEnvelope(reply, e.httpStatus, e.toEnvelope(rid));
      return;
    }

    // 4. Schema validation failures.
    if (error.validation) {
      const ctx = (error as FastifyError & { validationContext?: string }).validationContext;
      // Query/param problems are INVALID_QUERY_PARAM; body problems are
      // VALIDATION_FAILED with field_errors (FRD Y2 §1).
      if (ctx === 'querystring' || ctx === 'params') {
        const first = error.validation[0];
        const detail = first?.message ?? 'invalid query parameter';
        const e = errors.INVALID_QUERY_PARAM(`Invalid query parameter: ${detail}`, {
          details: { validation: toFieldErrors(error.validation) },
        });
        sendEnvelope(reply, e.httpStatus, e.toEnvelope(rid));
        return;
      }
      const e = errors.VALIDATION_FAILED('The request failed validation', {
        field_errors: toFieldErrors(error.validation),
      });
      sendEnvelope(reply, e.httpStatus, e.toEnvelope(rid));
      return;
    }

    // 5. A malformed JSON body sometimes surfaces as a 400 with no validation.
    if (error.statusCode === 400) {
      const e = errors.MALFORMED_JSON('The request body is not valid JSON');
      sendEnvelope(reply, e.httpStatus, e.toEnvelope(rid));
      return;
    }

    // 6. Anything else → INTERNAL_ERROR, with the detail hidden behind request_id.
    req.log?.error?.({ err: error }, 'unhandled error');
    const e = errors.INTERNAL_ERROR('An internal error occurred');
    sendEnvelope(reply, ERROR_HTTP_STATUS.INTERNAL_ERROR, e.toEnvelope(rid));
  });
}
