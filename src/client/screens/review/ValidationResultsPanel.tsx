/**
 * The panel the 30-second comprehension target depends on. One card per OPEN
 * exception, in the server's persisted evaluation order (never re-sorted
 * client-side). There is no "View triggering rule" drawer and no evaluation-diff
 * link: both deferred. The rule name, description and authority are already on the
 * card, which is what the comprehension target requires.
 */

import { useState } from 'react';

import type { ExceptionView, ExceptionsResponse } from '../../../shared/api';
import { severityLabel } from '../../api/enums';
import { EvidenceRow } from '../../components/EvidenceRow';
import { ExceptionTypeChip, Panel } from '../../components/ui';
import styles from './Review.module.css';

function ExceptionCard(props: { exception: ExceptionView }): JSX.Element {
  const x = props.exception;
  return (
    <article
      className={styles.exceptionCard}
      data-testid="exception-card"
      data-exception-type={x.exception_type}
      data-exception-id={x.exception_id}
    >
      <div className={styles.exceptionHead}>
        <ExceptionTypeChip type={x.exception_type} />
        <span className={styles.severity} data-testid="exception-severity">
          {severityLabel(x.severity)}
        </span>
      </div>

      <h3 className={styles.ruleName} data-testid="exception-rule-name">
        {x.rule.name}
      </h3>
      <p className={styles.ruleDescription}>{x.rule.description}</p>

      <p className={styles.authority}>
        <span className={styles.authorityLabel}>Authority</span>{' '}
        <span data-testid="exception-policy-reference">{x.rule.policy_reference}</span>
      </p>

      <p className={styles.assertion} data-testid="exception-assertion">
        {x.assertion}
      </p>

      <div className={styles.evidenceBlock}>
        <h4 className={styles.subheading}>Evidence</h4>
        {x.evidence.map((ev) => (
          <EvidenceRow key={ev.id} evidence={ev} />
        ))}
      </div>

      <div className={styles.missingBlock} data-testid="exception-missing-information">
        <h4 className={styles.subheading}>Missing information</h4>
        {x.missing_information.length === 0 ? (
          <p>None</p>
        ) : (
          <ul className={`usa-list ${styles.missingList}`}>
            {x.missing_information.map((mi, i) => (
              <li key={i}>
                {mi.document_type ?? mi.field_path ?? mi.requirement}: {mi.requirement}{' '}
                <span className={styles.policyRef}>({mi.policy_reference})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function ValidationResultsPanel(props: {
  data: ExceptionsResponse;
}): JSX.Element {
  const [showResolved, setShowResolved] = useState(false);
  const { open, resolved, evaluation } = props.data;

  if (evaluation === null) {
    return (
      <Panel title="Validation results" systemFinding testId="validation-results-panel">
        <p>Not yet evaluated</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Validation results"
      systemFinding
      testId="validation-results-panel"
      count={`${open.length} open · Resolved (${resolved.length})`}
    >
      {open.map((x) => (
        <ExceptionCard key={x.exception_id} exception={x} />
      ))}

      {resolved.length > 0 ? (
        <div className={styles.resolvedDisclosure}>
          <button
            type="button"
            className={`usa-button usa-button--outline ${styles.disclosureButton}`}
            data-testid="resolved-exceptions-disclosure"
            aria-expanded={showResolved}
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? 'Hide' : 'Show'} resolved ({resolved.length}) — resolved, not
            deleted
          </button>
          {showResolved
            ? resolved.map((x) => <ExceptionCard key={x.exception_id} exception={x} />)
            : null}
        </div>
      ) : null}
    </Panel>
  );
}
