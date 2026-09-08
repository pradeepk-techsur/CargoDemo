/**
 * One evidence record as a <dl> pair inside the system band — the smallest and
 * most important component on the review screen.
 *
 * NEVER summarize evidence into prose. The entire point is that a reviewer sees
 * `country_of_origin = "Malaysia"` beside `manufacturer.address.country = "China"`
 * and can check the finding themselves. All values render as text nodes, never as
 * markup.
 */

import type { EvidenceRecord } from '../../shared/api';
import styles from './EvidenceRow.module.css';

function valueText(raw: string | null, normalized: string | null): string {
  if (raw !== null && normalized !== null && raw !== normalized) {
    return `${raw} (normalized: ${normalized})`;
  }
  return raw ?? normalized ?? '—';
}

export function EvidenceRow(props: { evidence: EvidenceRecord }): JSX.Element {
  const e = props.evidence;
  const hasComparison =
    e.comparison_field_path !== null ||
    e.comparison_raw_value !== null ||
    e.comparison_normalized_value !== null;
  const hasExpectedObserved = e.expected !== null || e.observed !== null;

  return (
    <dl
      className={styles.evidenceRow}
      data-testid="evidence-row"
      data-field-path={e.field_path}
      data-kind={e.kind}
    >
      <div className={styles.pair}>
        <dt className={styles.fieldPath}>{e.field_path}</dt>
        <dd className={styles.value}>{valueText(e.raw_value, e.normalized_value)}</dd>
      </div>

      {hasComparison ? (
        <div className={styles.pair} data-comparison="true">
          <dt className={styles.fieldPath}>{e.comparison_field_path ?? 'comparison'}</dt>
          <dd className={styles.value}>
            {valueText(e.comparison_raw_value, e.comparison_normalized_value)}
          </dd>
        </div>
      ) : null}

      {hasExpectedObserved ? (
        <div className={styles.pair} data-expected-observed="true">
          <dt className={styles.fieldPath}>expected / observed</dt>
          <dd className={styles.value}>
            expected {e.expected ?? '—'} · observed {e.observed ?? '—'}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
