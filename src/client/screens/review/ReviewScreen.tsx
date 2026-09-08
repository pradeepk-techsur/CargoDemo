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

function BackLink(): JSX.Element {
  return (
    <Link to={QUEUE_PATH} className={styles.backLink} data-testid="back-to-queue">
      ← Back to queue
    </Link>
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
          <span>{s.importer_name}</span>
          <StatusBadge status={s.case.status} testId="review-status" />
          <span data-testid="review-priority">
            <PriorityIndicator
              priority={s.case.priority}
              basis={s.case.priority_basis.map((b) => b.detail).join('; ')}
            />
          </span>
          <span data-testid="review-value">{formatUsd(s.shipment_value_usd)}</span>
        </div>
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
