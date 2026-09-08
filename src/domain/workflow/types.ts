/**
 * Workflow-local types (F09a). PURE — this module imports no database driver, no
 * filesystem module and no HTTP framework. It re-exports the canonical
 * vocabularies so domain code has one import path.
 */

import type { DomainError } from '../../shared/api/errors.js';
import type { ActionCommand } from '../../shared/api/types.js';

export { CASE_STATUSES, USER_ACTIONS } from '../../shared/api/types.js';
export type { CaseStatus, UserAction } from '../../shared/api/types.js';

import type { CaseStatus, UserAction } from '../../shared/api/types.js';

export type GuardId = 'G-DOC' | 'G-DUP' | 'G-REC' | 'G-ACK';

export interface TransitionRow {
  id: string; // 'T01' … 'T33', preserving the FRD numbering
  from: CaseStatus;
  action: UserAction;
  to: CaseStatus | null; // null => the row is an explicit invalid row
  guards: GuardId[];
  invalid_reason: 'TRANSITION_REDUNDANT' | 'CASE_TERMINAL' | null;
  note: string | null; // records a deviation from the FRD row, when there is one
}

export interface TransitionContext {
  status: CaseStatus;
  open_exception_ids: string[]; // current OPEN set, in evaluation order
  missing_document_types: string[]; // union of open exceptions' missing_information
  received_document_types: string[]; // documents RECEIVED and not superseded
  requested_document_types: string[]; // requested since the case last entered AWAITING_INFORMATION
  now: string; // ISO-8601 UTC ms — injected, never read here
}

export type TransitionDecision =
  | { ok: true; row: TransitionRow; to: CaseStatus }
  | { ok: false; error: DomainError };

export type { ActionCommand };
