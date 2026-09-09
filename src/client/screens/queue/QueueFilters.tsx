/**
 * Only the filters the QueueQuery contract declares: status, exception type and
 * priority multi-selects, the two include toggles, and the sort field/direction.
 * There is no assignment filter and no pending-approval toggle: QueueQuery
 * declares neither, and the role feature they belong to is deferred.
 *
 * The applied-filter chips render from the server's `applied` block — the UI
 * shows the server's interpretation, never optimistic client state.
 *
 * Controls follow the USWDS form contract. That contract is structural, not just
 * cosmetic: `usa-checkbox__input` moves the native input out of view and the box
 * is drawn by `usa-checkbox__label`'s pseudo-elements, so the input MUST be a
 * SIBLING of a label bound by id — a label-wrapped input renders no visible box
 * at all. Ids are minted from `useId()` so several instances cannot collide.
 */

import { useId } from 'react';

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
  const uid = useId();
  const selectedStatus = new Set(props.query.status ?? []);
  const selectedType = new Set(props.query.exception_type ?? []);
  const selectedPriority = new Set(props.query.priority ?? []);

  /** One USWDS checkbox: input and label as siblings, bound by a unique id. */
  function Check(p: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }): JSX.Element {
    const inputId = `${uid}-${p.id}`;
    return (
      <div className="usa-checkbox">
        <input
          className="usa-checkbox__input"
          id={inputId}
          type="checkbox"
          checked={p.checked}
          onChange={(e) => p.onChange(e.target.checked)}
        />
        <label className="usa-checkbox__label" htmlFor={inputId}>
          {p.label}
        </label>
      </div>
    );
  }

  return (
    <aside className={styles.filters} aria-label="Queue filters">
      {props.appliedChips.length > 0 ? (
        <div className={styles.appliedFilters} data-testid="queue-applied-filters">
          {props.appliedChips.map((chip) => (
            <span key={chip.key} className={`usa-tag ${styles.appliedChip}`}>
              {chip.label}
              <button
                type="button"
                className={`usa-button usa-button--unstyled ${styles.removeChip}`}
                aria-label={`Remove filter: ${chip.label}`}
                onClick={chip.onRemove}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {props.hasAnyFilter ? (
        <button
          type="button"
          className={`usa-button usa-button--outline ${styles.clearAll}`}
          data-testid="queue-clear-filters"
          onClick={props.onClearAll}
        >
          Clear all filters
        </button>
      ) : null}

      <fieldset className="usa-fieldset" data-testid="queue-filter-status">
        <legend className="usa-legend">Status</legend>
        {STATUS_VALUES.map((s) => (
          <Check
            key={s}
            id={`status-${s}`}
            label={statusLabel(s)}
            checked={selectedStatus.has(s)}
            onChange={() => props.onToggleStatus(s)}
          />
        ))}
      </fieldset>

      <fieldset className="usa-fieldset" data-testid="queue-filter-exception-type">
        <legend className="usa-legend">Exception type</legend>
        {EXCEPTION_TYPE_VALUES.map((t) => (
          <Check
            key={t}
            id={`type-${t}`}
            label={exceptionTypeLabel(t)}
            checked={selectedType.has(t)}
            onChange={() => props.onToggleExceptionType(t)}
          />
        ))}
      </fieldset>

      <fieldset className="usa-fieldset" data-testid="queue-filter-priority">
        <legend className="usa-legend">Priority</legend>
        {PRIORITY_VALUES.map((p) => (
          <Check
            key={p}
            id={`priority-${p}`}
            label={priorityLabel(p)}
            checked={selectedPriority.has(p)}
            onChange={() => props.onTogglePriority(p)}
          />
        ))}
      </fieldset>

      <fieldset className="usa-fieldset">
        <legend className="usa-legend">Include</legend>
        <Check
          id="include-clean"
          label="Clean entries"
          checked={props.query.include_clean ?? false}
          onChange={props.onToggleIncludeClean}
        />
        <Check
          id="include-cleared"
          label="Cleared cases"
          checked={props.query.include_cleared ?? false}
          onChange={props.onToggleIncludeCleared}
        />
      </fieldset>

      <div className={styles.selectRow}>
        <label className="usa-label" htmlFor="sort-field">
          Sort by
        </label>
        <select
          id="sort-field"
          className="usa-select"
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
        <label className="usa-label" htmlFor="sort-direction">
          Direction
        </label>
        <select
          id="sort-direction"
          className="usa-select"
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
