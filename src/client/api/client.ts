/**
 * The only place `fetch` is called.
 *
 * Every URL is relative and same-origin, beginning `/api/`. No base URL, no
 * absolute host, no CORS, no credentials, no Authorization header. The client
 * never sends an actor id or a role — identity is resolved server-side, and a
 * client-claimed actor would be a 422 anyway (schemas are additionalProperties:
 * false).
 */

import type { ApiErrorCode, ErrorEnvelope, FieldError } from '../../shared/api';

/**
 * The single error type the UI sees. It exposes `message` and `request_id`; it
 * never surfaces a raw response body, a stack or an absolute path.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;
  readonly field_errors?: FieldError[];
  readonly request_id: string;

  constructor(init: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    field_errors?: FieldError[];
    request_id: string;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.field_errors = init.field_errors;
    this.request_id = init.request_id;
  }
}

/** A value that may appear in a query string. */
export type QueryParams = Record<
  string,
  string | number | boolean | Array<string> | undefined | null
>;

function buildQueryString(params?: QueryParams): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      // Omit empty arrays; append one entry per value (repeatable params).
      for (const item of value) usp.append(key, String(item));
    } else {
      usp.append(key, String(value));
    }
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object' &&
    (body as { error: unknown }).error !== null &&
    'code' in (body as { error: Record<string, unknown> }).error
  );
}

async function toApiError(res: Response): Promise<ApiError> {
  const requestIdHeader = res.headers.get('X-Request-Id') ?? '';
  let body: unknown = undefined;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (isErrorEnvelope(body)) {
    const e = body.error;
    return new ApiError({
      status: res.status,
      code: e.code,
      message: e.message,
      details: e.details,
      field_errors: e.field_errors,
      request_id: e.request_id || requestIdHeader,
    });
  }
  // Non-envelope body: synthesize an INTERNAL_ERROR carrying the HTTP status.
  return new ApiError({
    status: res.status,
    code: 'INTERNAL_ERROR',
    message: `Request failed with status ${res.status}`,
    request_id: requestIdHeader,
  });
}

async function parseOk<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * GET a same-origin `/api/` path. Repeatable params (status, exception_type,
 * priority) append once per value; undefined values and empty arrays are
 * omitted. It does NOT validate values — the server is the validator.
 */
export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const res = await fetch(`${path}${buildQueryString(params)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw await toApiError(res);
  return parseOk<T>(res);
}

/**
 * POST a same-origin `/api/` path with a JSON body. When `opts.caseVersion` is
 * given, sends the `If-Match-Case-Version` header carrying the optimistic
 * version. On a version conflict the caller refetches and asks the user to
 * resubmit, never retries silently.
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  opts?: { caseVersion?: number; idempotencyKey?: string },
): Promise<T> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (opts?.caseVersion !== undefined) {
    requestHeaders['If-Match-Case-Version'] = String(opts.caseVersion);
  }
  if (opts?.idempotencyKey !== undefined) {
    requestHeaders['Idempotency-Key'] = opts.idempotencyKey;
  }
  const res = await fetch(path, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return parseOk<T>(res);
}
