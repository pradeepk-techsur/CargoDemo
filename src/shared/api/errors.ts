/**
 * The uniform error envelope and its code catalog (FRD Y2).
 *
 * EVERY non-2xx response body is `{ error: { code, message, details?,
 * field_errors?, request_id } }`, without exception. Clients branch on `code`,
 * never on `message`. This file is the lowest layer both the server and the
 * client import: it declares the closed `ApiErrorCode` union, the `ErrorEnvelope`
 * shape, a `DomainError` carrying the HTTP status, and one factory per code so no
 * handler builds an error by hand.
 *
 * Waves 4 and 5 grep this file for `ErrorEnvelope`, `request_id`,
 * `RESOURCE_NOT_FOUND`, `INVALID_QUERY_PARAM` and `CASE_VERSION_CONFLICT`.
 */

export type ApiErrorCode =
  // transport (FRD Y2 §1)
  | 'RESOURCE_NOT_FOUND' // 404
  | 'MALFORMED_JSON' // 400
  | 'VALIDATION_FAILED' // 422 (with field_errors)
  | 'INVALID_QUERY_PARAM' // 422
  | 'PAYLOAD_TOO_LARGE' // 413
  | 'IDEMPOTENCY_KEY_REUSED' // 409
  | 'CASE_VERSION_CONFLICT' // 409
  | 'INTERNAL_ERROR' // 500
  // workflow (FRD Y2 §4)
  | 'INVALID_TRANSITION' // 409  "Cannot {action} a case in status {status}"
  | 'TRANSITION_REDUNDANT' // 409  "Case is already {status}"
  | 'CASE_TERMINAL' // 409  "Shipment {id} is Cleared and cannot be changed"
  | 'ACTION_NOT_A_USER_ACTION' // 422
  | 'JUSTIFICATION_REQUIRED' // 422
  | 'DOCUMENT_TYPE_NOT_REQUIRED' // 422
  | 'DUPLICATE_DOCUMENT_REQUEST' // 409
  | 'DOCUMENT_ALREADY_RECEIVED' // 409
  | 'OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED' // 422
  | 'EXCEPTION_SET_STALE' // 409
  | 'ASSIGNEE_INVALID' // 422
  | 'ESCALATION_TARGET_INVALID'; // 422

/** One field-level validation problem, collected into a single response. */
export interface FieldError {
  path: string;
  code: string;
  message: string;
}

/** The uniform error body carried by every non-2xx response. */
export interface ErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    field_errors?: FieldError[];
    request_id: string;
  };
}

/** The HTTP status mapping from FRD Y2, verbatim. */
export const ERROR_HTTP_STATUS: Record<ApiErrorCode, number> = {
  RESOURCE_NOT_FOUND: 404,
  MALFORMED_JSON: 400,
  VALIDATION_FAILED: 422,
  INVALID_QUERY_PARAM: 422,
  PAYLOAD_TOO_LARGE: 413,
  IDEMPOTENCY_KEY_REUSED: 409,
  CASE_VERSION_CONFLICT: 409,
  INTERNAL_ERROR: 500,
  INVALID_TRANSITION: 409,
  TRANSITION_REDUNDANT: 409,
  CASE_TERMINAL: 409,
  ACTION_NOT_A_USER_ACTION: 422,
  JUSTIFICATION_REQUIRED: 422,
  DOCUMENT_TYPE_NOT_REQUIRED: 422,
  DUPLICATE_DOCUMENT_REQUEST: 409,
  DOCUMENT_ALREADY_RECEIVED: 409,
  OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED: 422,
  EXCEPTION_SET_STALE: 409,
  ASSIGNEE_INVALID: 422,
  ESCALATION_TARGET_INVALID: 422,
};

/**
 * A domain-level error carrying its own code, HTTP status and user-facing
 * message. Thrown by the domain and app layers; the server's error mapper turns
 * it into the uniform envelope. A validation problem is 422, a state problem is
 * 409 (Y2 §9.1) — the mapping above encodes that distinction.
 */
export class DomainError extends Error {
  readonly code: ApiErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;
  readonly field_errors?: FieldError[];

  constructor(
    code: ApiErrorCode,
    message: string,
    opts: { details?: Record<string, unknown>; field_errors?: FieldError[] } = {},
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.details = opts.details;
    this.field_errors = opts.field_errors;
  }

  /** Serialize into the envelope body given a request id. */
  toEnvelope(requestId: string): ErrorEnvelope {
    const error: ErrorEnvelope['error'] = {
      code: this.code,
      message: this.message,
      request_id: requestId,
    };
    if (this.details) error.details = this.details;
    if (this.field_errors) error.field_errors = this.field_errors;
    return { error };
  }
}

type ErrorOpts = { details?: Record<string, unknown>; field_errors?: FieldError[] };

function make(code: ApiErrorCode) {
  return (message: string, opts: ErrorOpts = {}): DomainError =>
    new DomainError(code, message, opts);
}

/**
 * One factory per code, so no handler constructs a `DomainError` positionally.
 * `errors.RESOURCE_NOT_FOUND('Shipment X not found')`.
 */
export const errors = {
  RESOURCE_NOT_FOUND: make('RESOURCE_NOT_FOUND'),
  MALFORMED_JSON: make('MALFORMED_JSON'),
  VALIDATION_FAILED: make('VALIDATION_FAILED'),
  INVALID_QUERY_PARAM: make('INVALID_QUERY_PARAM'),
  PAYLOAD_TOO_LARGE: make('PAYLOAD_TOO_LARGE'),
  IDEMPOTENCY_KEY_REUSED: make('IDEMPOTENCY_KEY_REUSED'),
  CASE_VERSION_CONFLICT: make('CASE_VERSION_CONFLICT'),
  INTERNAL_ERROR: make('INTERNAL_ERROR'),
  INVALID_TRANSITION: make('INVALID_TRANSITION'),
  TRANSITION_REDUNDANT: make('TRANSITION_REDUNDANT'),
  CASE_TERMINAL: make('CASE_TERMINAL'),
  ACTION_NOT_A_USER_ACTION: make('ACTION_NOT_A_USER_ACTION'),
  JUSTIFICATION_REQUIRED: make('JUSTIFICATION_REQUIRED'),
  DOCUMENT_TYPE_NOT_REQUIRED: make('DOCUMENT_TYPE_NOT_REQUIRED'),
  DUPLICATE_DOCUMENT_REQUEST: make('DUPLICATE_DOCUMENT_REQUEST'),
  DOCUMENT_ALREADY_RECEIVED: make('DOCUMENT_ALREADY_RECEIVED'),
  OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED: make('OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED'),
  EXCEPTION_SET_STALE: make('EXCEPTION_SET_STALE'),
  ASSIGNEE_INVALID: make('ASSIGNEE_INVALID'),
  ESCALATION_TARGET_INVALID: make('ESCALATION_TARGET_INVALID'),
} as const;
