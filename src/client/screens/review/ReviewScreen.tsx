/**
 * The Shipment Review screen: composition and data orchestration.
 *
 * The reads fire in parallel; each panel resolves independently with its own
 * skeleton at final dimensions, so a slow panel never gates the others. The
 * sticky case header and the "Back to queue" link render on EVERY state,
 * including loading, error and not-found. There is no forward link — the screen it
 * would point at is deferred and out of scope.
 */

import { Link, useParams } from 'react-router-dom';

import { QUEUE_PATH } from '../../routes';
import { ApiError } from '../../api/client';
import { formatUsd } from '../../api/enums';
import {
  useAvailableActions,
  useDocuments,
  useExceptions,
  useShipment,
} from '../../api/hooks';
import { ErrorPanel, PriorityIndicator, Skeleton, StatusBadge } from '../../components/ui';
import { EntryDataPanel } from './EntryDataPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { ValidationResultsPanel } from './ValidationResultsPanel';
import { ActionPanel } from './ActionPanel';
import styles from './Review.module.css';

/**
 * Rendered as a USWDS breadcrumb rather than a bare link: the review screen is
 * one level below the queue, and the breadcrumb states that relationship instead
 * of leaving an arrow glyph to imply it. The `back-to-queue` test id stays on the
 * anchor, which is still the only route out.
 */
function BackLink(): JSX.Element {
  return (
    <nav className={`usa-breadcrumb ${styles.breadcrumb}`} aria-label="Breadcrumb">
      <ol className="usa-breadcrumb__list">
        <li className="usa-breadcrumb__list-item">
          <Link
            to={QUEUE_PATH}
            className="usa-breadcrumb__link"
            data-testid="back-to-queue"
          >
            <span>Cargo Exception Queue</span>
          </Link>
        </li>
        <li
          className="usa-breadcrumb__list-item usa-current"
          aria-current="page"
        >
          <span>Shipment Review</span>
        </li>
      </ol>
    </nav>
  );
}

export function ReviewScreen(): JSX.Element {
  const params = useParams();
  const shipmentId = params.shipmentId ?? '';

  const shipment = useShipment(shipmentId);
  const exceptions = useExceptions(shipmentId);
  const documents = useDocuments(shipmentId);
  const caseId = shipment.data?.case_id;
  const availableActions = useAvailableActions(caseId);

  // Not-found: a 404 RESOURCE_NOT_FOUND on the shipment detail.
  if (
    shipment.isError &&
    shipment.error instanceof ApiError &&
    shipment.error.code === 'RESOURCE_NOT_FOUND'
  ) {
    return (
      <main className={styles.screen} data-testid="review-screen">
        <BackLink />
        <div data-testid="review-not-found" className={styles.notFound}>
          <h1>Shipment not found</h1>
          <p>{shipment.error.message}</p>
        </div>
      </main>
    );
  }

  // Any other shipment-load failure.
  if (shipment.isError) {
    return (
      <main className={styles.screen} data-testid="review-screen">
        <BackLink />
        <ErrorPanel
          error={shipment.error as ApiError}
          onRetry={() => shipment.refetch()}
          testId="review-error"
        />
      </main>
    );
  }

  // Loading the case header.
  if (shipment.isLoading || !shipment.data) {
    return (
      <main className={styles.screen} data-testid="review-screen">
        <BackLink />
        <div data-testid="review-loading" aria-busy="true">
          <Skeleton rows={3} height="3rem" />
          <Skeleton rows={4} height="4rem" />
        </div>
      </main>
    );
  }

  const s = shipment.data;

  return (
    <main className={styles.screen} data-testid="review-screen">
      <header className={styles.caseHeader}>
        <BackLink />
        <h1 data-testid="review-shipment-id">Shipment Review — {s.shipment_id}</h1>
        <div className={styles.caseHeaderMeta}>
          <span className={styles.metaImporter}>{s.importer_name}</span>
          <StatusBadge status={s.case.status} testId="review-status" />
          {/* The indicator is the compact label here; the derivation basis gets
              its own full-width line below rather than being squeezed into a
              flex item, where it wrapped into an unreadable narrow column. It is
              deliberately NOT also passed as `basis`, which would render the same
              sentence a second time for screen readers. */}
          <span data-testid="review-priority">
            <PriorityIndicator priority={s.case.priority} />
          </span>
          <span className={styles.metaValue} data-testid="review-value">
            {formatUsd(s.shipment_value_usd)}
          </span>
        </div>
        {s.case.priority_basis.length > 0 ? (
          <p className={styles.priorityBasisLine}>
            <span className={styles.priorityBasisLabel}>Priority basis</span>{' '}
            {s.case.priority_basis.map((b) => b.detail).join('; ')}
          </p>
        ) : null}
      </header>

      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <EntryDataPanel shipment={s} />
          {documents.isLoading ? (
            <Skeleton rows={4} height="3rem" />
          ) : documents.isError ? (
            <ErrorPanel
              error={documents.error as ApiError}
              onRetry={() => documents.refetch()}
            />
          ) : documents.data ? (
            <DocumentsPanel documents={documents.data.data} />
          ) : null}
        </div>

        <div className={styles.rightColumn}>
          {exceptions.isLoading ? (
            <Skeleton rows={5} height="4rem" />
          ) : exceptions.isError ? (
            <ErrorPanel
              error={exceptions.error as ApiError}
              onRetry={() => exceptions.refetch()}
            />
          ) : exceptions.data ? (
            <ValidationResultsPanel data={exceptions.data} />
          ) : null}
        </div>
      </div>

      <div className={styles.actionRow}>
        {availableActions.isLoading || exceptions.isLoading ? (
          <Skeleton rows={5} height="3rem" />
        ) : availableActions.isError ? (
          <ErrorPanel
            error={availableActions.error as ApiError}
            onRetry={() => availableActions.refetch()}
          />
        ) : availableActions.data && exceptions.data ? (
          <ActionPanel
            shipment={s}
            availableActions={availableActions.data}
            exceptions={exceptions.data}
          />
        ) : null}
      </div>
    </main>
  );
}
