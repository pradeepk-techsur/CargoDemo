/**
 * The display vocabularies.
 *
 * Each frozen array exists to (a) render the filter controls and (b) map a
 * server code to a display label — that is its ENTIRE job. A `QueueQuery` value
 * restored from the URL is forwarded to the server VERBATIM; it is never filtered,
 * sanitised, dropped or coerced against these arrays. The server is the only
 * validator. See the scope boundary in 04-PLAN.md.
 */

import type {
  CaseStatus,
  Priority,
  ExceptionType,
  Severity,
  UserAction,
} from '../../shared/api';

// --- Statuses ----------------------------------------------------------------

export const STATUS_VALUES: readonly CaseStatus[] = Object.freeze([
  'NEW',
  'IN_REVIEW',
  'AWAITING_INFORMATION',
  'ON_HOLD',
  'ESCALATED',
  'PENDING_APPROVAL',
  'CLEARED',
]);

const STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: 'New',
  IN_REVIEW: 'In review',
  AWAITING_INFORMATION: 'Awaiting information',
  ON_HOLD: 'On hold',
  ESCALATED: 'Escalated',
  PENDING_APPROVAL: 'Pending approval',
  CLEARED: 'Cleared',
};

export function statusLabel(status: CaseStatus): string {
  return STATUS_LABELS[status] ?? status;
}

// --- Priorities --------------------------------------------------------------

export const PRIORITY_VALUES: readonly Priority[] = Object.freeze([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const PRIORITY_GLYPHS: Record<Priority, string> = {
  LOW: '▮',
  MEDIUM: '▮▮',
  HIGH: '▮▮▮',
  CRITICAL: '▮▮▮▮',
};

// Rank drives deterministic non-string ordering assertions in the browser test.
const PRIORITY_RANK: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function priorityGlyph(priority: Priority): string {
  return PRIORITY_GLYPHS[priority] ?? '';
}

export function priorityRank(priority: Priority): number {
  return PRIORITY_RANK[priority] ?? -1;
}

// --- Exception types ---------------------------------------------------------

export const EXCEPTION_TYPE_VALUES: readonly ExceptionType[] = Object.freeze([
  'MISSING_REQUIRED_DOCUMENT',
  'INVALID_HTS_CODE',
  'CONFLICTING_COUNTRY_OF_ORIGIN',
]);

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  MISSING_REQUIRED_DOCUMENT: 'Missing document',
  INVALID_HTS_CODE: 'Incomplete HTS',
  CONFLICTING_COUNTRY_OF_ORIGIN: 'Origin conflict',
};

export function exceptionTypeLabel(type: ExceptionType): string {
  return EXCEPTION_TYPE_LABELS[type] ?? type;
}

// --- Severities --------------------------------------------------------------

const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function severityLabel(severity: Severity): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

// --- Action codes ------------------------------------------------------------

export const ACTION_ORDER: readonly UserAction[] = Object.freeze([
  'REQUEST_INFORMATION',
  'SEND_FOR_SPECIALIST_REVIEW',
  'CLEAR_EXCEPTION',
  'PLACE_ON_HOLD',
  'ESCALATE_TO_SUPERVISOR',
]);

const ACTION_LABELS: Record<UserAction, string> = {
  REQUEST_INFORMATION: 'Request information',
  SEND_FOR_SPECIALIST_REVIEW: 'Send for specialist review',
  // Never "Approve" and never anything implying a supervisor approved it: the
  // acting user is recorded as the approving official on their own decision, and
  // the two-person approval chain is deferred and out of scope.
  CLEAR_EXCEPTION: 'Clear exception',
  PLACE_ON_HOLD: 'Place on hold',
  ESCALATE_TO_SUPERVISOR: 'Escalate to supervisor',
};

export function actionLabel(action: UserAction): string {
  return ACTION_LABELS[action] ?? action;
}

// --- Money -------------------------------------------------------------------

/**
 * Format a decimal string like "85000.00" into "$85,000.00" using STRING
 * operations only — never `Number()`, because money crossing a float is a defect
 * waiting for a demo.
 */
export function formatUsd(decimalString: string): string {
  if (typeof decimalString !== 'string' || decimalString.length === 0) return '';
  const negative = decimalString.startsWith('-');
  const unsigned = negative ? decimalString.slice(1) : decimalString;
  const dot = unsigned.indexOf('.');
  const intPart = dot === -1 ? unsigned : unsigned.slice(0, dot);
  const fracPart = dot === -1 ? '00' : unsigned.slice(dot + 1);
  // Group the integer part with thousands separators.
  let grouped = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) grouped += ',';
    grouped += intPart[i];
  }
  const cents = (fracPart + '00').slice(0, 2);
  return `${negative ? '-' : ''}$${grouped || '0'}.${cents}`;
}
