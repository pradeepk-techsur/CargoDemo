/**
 * Only the filters the QueueQuery contract declares: status, exception type and
 * priority multi-selects, the two include toggles, and the sort field/direction.
 * There is no assignment filter and no pending-approval toggle: QueueQuery
 * declares neither, and the role feature they belong to is deferred.
 *
 * The applied-filter chips render from the server's `applied` block — the UI
 * shows the server's interpretation, never optimistic client state.
 */

import type { CaseStatus, ExceptionType, Priority, QueueQuery } from '../../../shared/api';
import {
  STATUS_VALUES,
  PRIORITY_VALUES,
  EXCEPTION_TYPE_VALUES,
  statusLabel,
  priorityLabel,
  exceptionTypeLabel,
} from '../../api/enums';
import styles from './Queue.module.css';

const SORT_FIELDS = ['priority', 'age', 'updated_at', 'shipment_id', 'status'] as const;
const SORT_FIELD_LABEL: Record<string, string> = {
  priority: 'Priority',
  age: 'Age',
  updated_at: 'Updated',
  shipment_id: 'Shipment ID',
  status: 'Status',
};

export interface AppliedChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function QueueFilters(props: {
  query: QueueQuery;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  appliedChips: AppliedChip[];
  hasAnyFilter: boolean;
  onToggleStatus: (v: CaseStatus) => void;
  onToggleExceptionType: (v: ExceptionType) => void;
  onTogglePriority: (v: Priority) => void;
  onToggleIncludeClean: (v: boolean) => void;
  onToggleIncludeCleared: (v: boolean) => void;
  onSortFieldChange: (v: string) => void;
  onSortDirectionChange: (v: 'asc' | 'desc') => void;
  onClearAll: () => void;
}): JSX.Element {
  const selectedStatus = new Set(props.query.status ?? []);
  const selectedType = new Set(props.query.exception_type ?? []);
  const selectedPriority = new Set(props.query.priority ?? []);

  return (
    <aside className={styles.filters} aria-label="Queue filters">
      {props.appliedChips.length > 0 ? (
        <div className={styles.appliedFilters} data-testid="queue-applied-filters">
          {props.appliedChips.map((chip) => (
            <span key={chip.key} className={styles.appliedChip}>
              {chip.label}
              <button
                type="button"
                className={styles.removeChip}
                aria-label={`Remove filter: ${chip.label}`}
                onClick={chip.onRemove}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {props.hasAnyFilter ? (
        <button
          type="button"
          className={styles.clearAll}
          data-testid="queue-clear-filters"
          onClick={props.onClearAll}
        >
          Clear all filters
        </button>
      ) : null}

      <fieldset className={styles.fieldset} data-testid="queue-filter-status">
        <legend className={styles.legend}>Status</legend>
        {STATUS_VALUES.map((s) => (
          <label key={s} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedStatus.has(s)}
              onChange={() => props.onToggleStatus(s)}
            />
            {statusLabel(s)}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset} data-testid="queue-filter-exception-type">
        <legend className={styles.legend}>Exception type</legend>
        {EXCEPTION_TYPE_VALUES.map((t) => (
          <label key={t} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedType.has(t)}
              onChange={() => props.onToggleExceptionType(t)}
            />
            {exceptionTypeLabel(t)}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset} data-testid="queue-filter-priority">
        <legend className={styles.legend}>Priority</legend>
        {PRIORITY_VALUES.map((p) => (
          <label key={p} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedPriority.has(p)}
              onChange={() => props.onTogglePriority(p)}
            />
            {priorityLabel(p)}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Include</legend>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={props.query.include_clean ?? false}
            onChange={(e) => props.onToggleIncludeClean(e.target.checked)}
          />
          Clean entries
        </label>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={props.query.include_cleared ?? false}
            onChange={(e) => props.onToggleIncludeCleared(e.target.checked)}
          />
          Cleared cases
        </label>
      </fieldset>

      <div className={styles.selectRow}>
        <label htmlFor="sort-field">Sort by</label>
        <select
          id="sort-field"
          className={styles.select}
          data-testid="queue-sort-field"
          value={props.sortField}
          onChange={(e) => props.onSortFieldChange(e.target.value)}
        >
          {SORT_FIELDS.map((f) => (
            <option key={f} value={f}>
              {SORT_FIELD_LABEL[f]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.selectRow}>
        <label htmlFor="sort-direction">Direction</label>
        <select
          id="sort-direction"
          className={styles.select}
          data-testid="queue-sort-direction"
          value={props.sortDirection}
          onChange={(e) => props.onSortDirectionChange(e.target.value as 'asc' | 'desc')}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </aside>
  );
}
