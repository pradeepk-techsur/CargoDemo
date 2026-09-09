/**
 * One row per DocumentView. Missing documents render as an EXPLICIT ABSENCE,
 * never as a gap in the list — a missing certificate is the finding, so it must be
 * as visible as a received one. There is no upload control and no download link:
 * that lifecycle is deferred and not in this plan.
 */

import type { DocumentView } from '../../../shared/api';
import { Panel } from '../../components/ui';
import styles from './Review.module.css';

const PROVENANCE_LABEL: Record<string, string> = {
  SEEDED: 'Seeded',
  INGESTED: 'Ingested',
  SIMULATED_UPLOAD: 'Uploaded this session',
};

function statusLabelFor(status: DocumentView['status']): string {
  return status === 'RECEIVED' ? 'Received' : 'Not received';
}

export function DocumentsPanel(props: { documents: DocumentView[] }): JSX.Element {
  return (
    <Panel title="Documents" systemFinding testId="documents-panel">
      <ul className={styles.documentList}>
        {props.documents.map((doc) => (
          <li
            key={doc.document_type}
            className={styles.documentRow}
            data-testid="document-row"
            data-document-type={doc.document_type}
            data-document-status={doc.status}
          >
            <div
              className={styles.documentRowInner}
              data-testid={`document-row-${doc.document_type}`}
            >
              <span className={styles.documentName}>{doc.display_name}</span>
              <span
                className={`usa-tag ${styles.documentStatus}`}
                data-testid="document-status"
                data-status={doc.status}
              >
                {statusLabelFor(doc.status)}
              </span>
            </div>
            <div className={styles.documentMeta}>
              {doc.provenance ? (
                <span className={styles.metaItem}>
                  {PROVENANCE_LABEL[doc.provenance] ?? doc.provenance}
                </span>
              ) : null}
              {doc.filename ? (
                <span className={styles.metaItem}>{doc.filename}</span>
              ) : null}
              {doc.received_at ? (
                <span className={styles.metaItem}>Received {doc.received_at}</span>
              ) : null}
              {doc.status === 'NOT_RECEIVED' && doc.required_by_rules.length ? (
                <span className={styles.metaItem}>
                  Required by {doc.required_by_rules.join(', ')}
                </span>
              ) : null}
              {doc.requested ? (
                <span className={styles.metaItem}>
                  Requested by {doc.requested.requested_by.name} on{' '}
                  {doc.requested.requested_at}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.standingNote}>
        Every document is either seeded with the demo data or recorded against a
        request. No importer correspondence path exists.
      </p>
    </Panel>
  );
}
