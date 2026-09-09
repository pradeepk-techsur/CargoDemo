/**
 * The queue table: mandated columns, one chip per distinct exception type, and
 * row navigation by pointer and keyboard. The row is the selectable region — it
 * is the ONLY inbound navigation to the review screen.
 *
 * There are no action controls anywhere on this screen: every disposition happens
 * on the review screen, so a shipment can never be dispositioned without its
 * evidence being read.
 */

import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { QueueRow } from '../../../shared/api';
import { reviewPath } from '../../routes';
import { formatUsd, priorityLabel, statusLabel } from '../../api/enums';
import {
  ExceptionTypeChip,
  PriorityIndicator,
  StatusBadge,
} from '../../components/ui';
import styles from './Queue.module.css';

export function QueueTable(props: {
  rows: QueueRow[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
}): JSX.Element {
  const navigate = useNavigate();

  function open(shipmentId: string): void {
    navigate(reviewPath(shipmentId));
  }

  function onKey(e: KeyboardEvent<HTMLTableRowElement>, shipmentId: string): void {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      open(shipmentId);
    }
  }

  /**
   * `aria-sort` is emitted ONLY for the column actually in effect, and omitted
   * entirely elsewhere — an absent attribute already means "not sorted by this
   * column". Two reasons this is not `'none'`:
   *
   *  - Semantics: `aria-sort="none"` advertises a column as sortable-but-unsorted.
   *    These headers are not controls; sorting is driven by the sidebar select.
   *    Claiming otherwise sends keyboard users hunting for a control that is not
   *    there.
   *  - Rendering: USWDS styles `.usa-table thead th[aria-sort]` with a cyan
   *    highlight to mark THE sorted column. Emitting `none` on the rest would
   *    highlight four of seven headers and destroy the signal.
   */
  const ariaSortFor = (field: string): 'ascending' | 'descending' | undefined => {
    if (field !== props.sortField) return undefined;
    return props.sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <table
      className={`usa-table usa-table--borderless ${styles.table}`}
      data-testid="queue-table"
    >
      <caption className="visually-hidden">
        Flagged cargo shipments. Activate a row to review the shipment.
      </caption>
      <thead>
        <tr>
          <th scope="col" className={styles.colShipment} aria-sort={ariaSortFor('shipment_id')}>
            Shipment ID
          </th>
          <th scope="col" className={styles.colImporter}>
            Importer
          </th>
          <th scope="col" className={styles.colExceptions}>
            Exception(s)
          </th>
          <th scope="col" className={styles.colPriority} aria-sort={ariaSortFor('priority')}>
            Priority
          </th>
          <th scope="col" className={styles.colStatus} aria-sort={ariaSortFor('status')}>
            Status
          </th>
          <th scope="col" className={styles.colAge} aria-sort={ariaSortFor('age')}>
            Age
          </th>
          <th scope="col" className={styles.colValue}>
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row) => {
          const ariaLabel =
            `Shipment ${row.shipment_id}, importer ${row.importer_name}, ` +
            `${priorityLabel(row.priority)} priority, ${statusLabel(row.status)}, ` +
            `${row.open_exception_count} open exception(s). Activate to review.`;
          return (
            <tr
              key={row.shipment_id}
              className={styles.row}
              data-testid="queue-row"
              data-shipment-id={row.shipment_id}
              tabIndex={0}
              role="link"
              aria-label={ariaLabel}
              onClick={() => open(row.shipment_id)}
              onKeyDown={(e) => onKey(e, row.shipment_id)}
            >
              <td data-testid="queue-row-shipment-id">
                <span
                  className={styles.shipmentId}
                  data-testid={`queue-row-${row.shipment_id}`}
                >
                  {row.shipment_id}
                </span>
              </td>
              <td data-testid="queue-row-importer">{row.importer_name}</td>
              <td data-testid="queue-row-exceptions">
                <span className={styles.exceptionsCell}>
                  {row.exception_types.map((et) => (
                    <ExceptionTypeChip
                      key={et.type}
                      type={et.type}
                      count={et.count}
                      testId="queue-row-exception-chip"
                    />
                  ))}
                  <span className={styles.openCount}>
                    {row.open_exception_count} open
                  </span>
                </span>
              </td>
              <td data-testid="queue-row-priority">
                <PriorityIndicator
                  priority={row.priority}
                  basis={row.priority_basis_summary}
                  basisDisplay="tooltip"
                />
              </td>
              <td data-testid="queue-row-status">
                <StatusBadge status={row.status} />
              </td>
              <td className={styles.numericCell} data-testid="queue-row-age">
                {row.age_days}d
              </td>
              <td className={styles.numericCell}>{formatUsd(row.shipment_value_usd)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
