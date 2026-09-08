/**
 * Mandatory justification validation (F09b). PURE.
 *
 * Every action requires a justification: 10-2000 characters after trimming,
 * never whitespace-only. For CLEAR_EXCEPTION with a resolution_basis of
 * EXCEPTIONS_ACCEPTED or MIXED the floor rises to 40 — accepting a still-firing
 * exception demands a fuller stated reason than confirming a resolved one.
 *
 * `justificationMinLength` is exported so the available-actions projection
 * advertises the SAME number the write path enforces — one source, never two.
 */

import { errors, type DomainError } from '../../shared/api/errors.js';
import type { ActionCommand, UserAction } from '../../shared/api/types.js';

const MIN_DEFAULT = 10;
const MIN_ACCEPTED_OR_MIXED = 40;
const MAX = 2000;

type ResolutionBasis = 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';

/**
 * The minimum justification length for an action. CLEAR_EXCEPTION with an
 * accepted or mixed basis requires 40; everything else requires 10.
 */
export function justificationMinLength(
  action: UserAction,
  resolutionBasis?: ResolutionBasis | null,
): number {
  if (
    action === 'CLEAR_EXCEPTION' &&
    (resolutionBasis === 'EXCEPTIONS_ACCEPTED' || resolutionBasis === 'MIXED')
  ) {
    return MIN_ACCEPTED_OR_MIXED;
  }
  return MIN_DEFAULT;
}

/**
 * Validate the command's justification. Returns null on success, a DomainError
 * on failure. Whitespace-only, missing, and under-length justifications are all
 * rejected as 422 JUSTIFICATION_REQUIRED.
 */
export function validateJustification(
  action: UserAction,
  command: ActionCommand,
): DomainError | null {
  const resolutionBasis =
    command.action === 'CLEAR_EXCEPTION' ? command.resolution_basis : null;
  const min = justificationMinLength(action, resolutionBasis);

  const raw = (command as { justification?: unknown }).justification;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  if (trimmed.length < min) {
    return errors.JUSTIFICATION_REQUIRED(
      `A justification of at least ${min} characters is required`,
    );
  }
  if (trimmed.length > MAX) {
    return errors.JUSTIFICATION_REQUIRED(
      `A justification may be at most ${MAX} characters`,
    );
  }

  // REQUEST_INFORMATION with an unlisted document type demands >= 20 chars.
  if (
    command.action === 'REQUEST_INFORMATION' &&
    command.justify_unlisted_document === true &&
    trimmed.length < 20
  ) {
    return errors.JUSTIFICATION_REQUIRED(
      'Justifying an unlisted document type requires a justification of at least 20 characters',
    );
  }

  return null;
}
