/**
 * The four applicable workflow guards (F09a §3, F09b). PURE.
 *
 * Each guard is a predicate over the pre-loaded `TransitionContext` and the
 * command. It returns null when the guard passes, a DomainError when it fails.
 * `GUARDS` is a map keyed by GuardId so `evaluateTransition` dispatches through
 * data rather than a switch.
 *
 * Guards gating on role, on a recommendation, or on an audit entry (G-AUTH,
 * G-SOD, G-WITHDRAW, G-AUDIT) are not applicable in this build — see the plan's
 * <scope_boundary>. G-DUP is evaluated against the case's action history rather
 * than against outstanding request rows, because the document-request lifecycle
 * is deferred.
 */

import { errors, type DomainError } from '../../shared/api/errors.js';
import type { ActionCommand } from '../../shared/api/types.js';
import type { GuardId, TransitionContext } from './types.js';

/** Upper-snake normalization for a document type token. */
export function normalizeDocumentType(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export type Guard = (
  context: TransitionContext,
  command: ActionCommand,
) => DomainError | null;

// G-DOC (REQUEST_INFORMATION): every requested type is either currently missing,
// or the caller flagged an unlisted request with a >= 20-char justification. A
// type already received is DOCUMENT_ALREADY_RECEIVED.
const gDoc: Guard = (context, command) => {
  if (command.action !== 'REQUEST_INFORMATION') return null;
  const missing = new Set(context.missing_document_types.map(normalizeDocumentType));
  const received = new Set(context.received_document_types.map(normalizeDocumentType));
  const justifyUnlisted = command.justify_unlisted_document === true;

  for (const rawType of command.document_types) {
    const type = normalizeDocumentType(rawType);
    if (received.has(type)) {
      return errors.DOCUMENT_ALREADY_RECEIVED(
        `Document type ${type} has already been received and cannot be requested`,
      );
    }
    if (!missing.has(type) && !justifyUnlisted) {
      return errors.DOCUMENT_TYPE_NOT_REQUIRED(
        `Document type ${type} is not required by any open exception; set justify_unlisted_document to request it anyway`,
        { details: { document_type: type } },
      );
    }
  }
  return null;
};

// G-DUP (REQUEST_INFORMATION from AWAITING_INFORMATION): a type already requested
// since the case entered AWAITING_INFORMATION is a duplicate request.
const gDup: Guard = (context, command) => {
  if (command.action !== 'REQUEST_INFORMATION') return null;
  const alreadyRequested = new Set(
    context.requested_document_types.map(normalizeDocumentType),
  );
  for (const rawType of command.document_types) {
    const type = normalizeDocumentType(rawType);
    if (alreadyRequested.has(type)) {
      return errors.DUPLICATE_DOCUMENT_REQUEST(
        `Document type ${type} has already been requested for this case`,
        { details: { document_type: type } },
      );
    }
  }
  return null;
};

// G-REC (CLEAR_EXCEPTION): the submitted exception id set must equal the case's
// current OPEN set exactly. A subset, superset or unknown id is EXCEPTION_SET_STALE.
const gRec: Guard = (context, command) => {
  if (command.action !== 'CLEAR_EXCEPTION') return null;
  const open = [...context.open_exception_ids].sort();
  const submitted = [...new Set(command.exception_ids)].sort();
  const equal =
    open.length === submitted.length && open.every((id, i) => id === submitted[i]);
  if (!equal) {
    return errors.EXCEPTION_SET_STALE(
      'The submitted exception set does not match the case\'s current open exceptions',
      { details: { expected: context.open_exception_ids, actual: command.exception_ids } },
    );
  }
  return null;
};

// G-ACK (CLEAR_EXCEPTION from AWAITING_INFORMATION): when a document type was
// requested and none has since been received, the caller must acknowledge the
// outstanding requests.
const gAck: Guard = (context, command) => {
  if (command.action !== 'CLEAR_EXCEPTION') return null;
  if (context.status !== 'AWAITING_INFORMATION') return null;
  const received = new Set(context.received_document_types.map(normalizeDocumentType));
  const outstanding = context.requested_document_types
    .map(normalizeDocumentType)
    .filter((t) => !received.has(t));
  if (outstanding.length > 0 && command.acknowledge_outstanding_requests !== true) {
    return errors.OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED(
      `There ${outstanding.length === 1 ? 'is' : 'are'} ${outstanding.length} outstanding document request${outstanding.length === 1 ? '' : 's'}; set acknowledge_outstanding_requests to clear anyway`,
      { details: { outstanding_document_types: outstanding } },
    );
  }
  return null;
};

export const GUARDS: Record<GuardId, Guard> = {
  'G-DOC': gDoc,
  'G-DUP': gDup,
  'G-REC': gRec,
  'G-ACK': gAck,
};
