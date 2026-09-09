/**
 * The shared component kit — one module so the file count stays reviewable.
 *
 * StatusBadge and PriorityIndicator always convey meaning by text label plus a
 * shape or glyph, never by colour alone. Skeleton reserves the final layout
 * dimensions, never a centred spinner that collapses to zero height.
 */

import type { ReactNode } from 'react';
import { useId } from 'react';

import type { CaseStatus, Priority, ExceptionType } from '../../shared/api';
import type { ApiError } from '../api/client';
import {
  statusLabel,
  priorityLabel,
  priorityGlyph,
  exceptionTypeLabel,
} from '../api/enums';
import styles from './ui.module.css';

// --- Panel (system band container) -------------------------------------------

export function Panel(props: {
  title: string;
  count?: string;
  systemFinding?: boolean;
  testId?: string;
  loading?: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
  isLoading?: boolean;
  children?: ReactNode;
}): JSX.Element {
  const headingId = useId();
  const body = props.isLoading
    ? props.loading
    : props.error ?? props.empty ?? props.children;
  return (
    <section
      className={styles.panel}
      aria-labelledby={headingId}
      aria-busy={props.isLoading ? 'true' : undefined}
      data-testid={props.testId}
    >
      <div className={styles.panelHeader}>
        <h2 id={headingId} className={styles.panelTitle}>
          {props.title}
        </h2>
        {props.count ? <span className={styles.panelCount}>{props.count}</span> : null}
        {props.systemFinding ? (
          <span className={styles.systemLabel}>
            <span className={styles.glyph} aria-hidden="true">
              ⚙
            </span>
            System finding — deterministic rule evaluation
          </span>
        ) : null}
      </div>
      {body}
    </section>
  );
}

// --- StatusBadge -------------------------------------------------------------

const STATUS_SHAPE: Record<CaseStatus, string | undefined> = {
  NEW: styles.shapeNew,
  IN_REVIEW: styles.shapeReview,
  AWAITING_INFORMATION: styles.shapeAwaiting,
  ON_HOLD: styles.shapeHold,
  ESCALATED: styles.shapeEscalated,
  PENDING_APPROVAL: styles.shapePending,
  CLEARED: styles.shapeCleared,
};

export function StatusBadge(props: {
  status: CaseStatus;
  testId?: string;
}): JSX.Element {
  return (
    <span className={styles.statusBadge} data-testid={props.testId} data-status={props.status}>
      <span className={`${styles.statusShape} ${STATUS_SHAPE[props.status] ?? ''}`} aria-hidden="true" />
      {statusLabel(props.status)}
    </span>
  );
}

// --- PriorityIndicator -------------------------------------------------------

export function PriorityIndicator(props: {
  priority: Priority;
  basis?: string;
  /**
   * How the derivation basis is presented. `inline` stacks it as wrapping text
   * beneath the label (review header, where there is room). `tooltip` keeps it
   * out of flow — native tooltip plus screen-reader text — for narrow table
   * cells where the long basis string would otherwise overflow the column and
   * paint over neighbouring cells (FRD F17: "basis in its tooltip").
   */
  basisDisplay?: 'inline' | 'tooltip';
  testId?: string;
}): JSX.Element {
  const basisDisplay = props.basisDisplay ?? 'inline';
  return (
    <span
      className={styles.priority}
      data-testid={props.testId}
      data-priority={props.priority}
      title={props.basis && basisDisplay === 'tooltip' ? props.basis : undefined}
    >
      <span className={styles.priorityMain}>
        <span className={styles.priorityGlyph} aria-hidden="true">
          {priorityGlyph(props.priority)}
        </span>
        <span className={styles.priorityLabel}>{priorityLabel(props.priority)}</span>
      </span>
      {props.basis ? (
        <span
          className={basisDisplay === 'tooltip' ? 'visually-hidden' : styles.priorityBasis}
        >
          {props.basis}
        </span>
      ) : null}
    </span>
  );
}

// --- ExceptionTypeChip -------------------------------------------------------

export function ExceptionTypeChip(props: {
  type: ExceptionType;
  count?: number;
  testId?: string;
}): JSX.Element {
  return (
    <span
      className={styles.chip}
      data-testid={props.testId}
      data-exception-type={props.type}
    >
      {exceptionTypeLabel(props.type)}
      {props.count && props.count > 1 ? (
        <span className={styles.chipCount}> ×{props.count}</span>
      ) : null}
    </span>
  );
}

// --- ErrorPanel --------------------------------------------------------------

export function ErrorPanel(props: {
  error: ApiError;
  onRetry?: () => void;
  testId?: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.errorPanel} role="alert" data-testid={props.testId}>
      <p className={styles.errorMessage}>{props.error.message}</p>
      <p className={styles.errorRef}>Reference: {props.error.request_id}</p>
      {props.children}
      {props.onRetry ? (
        <button type="button" className={styles.retryButton} onClick={props.onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

// --- EmptyState --------------------------------------------------------------

export function EmptyState(props: {
  message: string;
  testId?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.emptyState} data-testid={props.testId}>
      <p>{props.message}</p>
      {props.action}
    </div>
  );
}

// --- Skeleton ----------------------------------------------------------------

export function Skeleton(props: { rows?: number; height?: string }): JSX.Element {
  const rows = props.rows ?? 3;
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${styles.skeletonRow}`}
          style={props.height ? { height: props.height } : undefined}
        />
      ))}
    </div>
  );
}
