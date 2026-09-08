/**
 * TanStack Query hooks over the six wave 3 routes and the query-key factory.
 *
 * Only these six calls will ever exist; there is no hook for an AI, audit,
 * notification, upload, revalidation or session route, because no such route
 * exists. Task 3 extends this file with the shipment reads and the action
 * mutation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ActionCommand,
  ActionResult,
  AvailableActionsResponse,
  DocumentsResponse,
  ExceptionsResponse,
  QueueQuery,
  QueueResponse,
  ShipmentDetail,
} from '../../shared/api';
import { apiGet, apiPost, type QueryParams } from './client';

export const qk = {
  queue: (q: QueueQuery) => ['queue', q] as const,
  shipment: (id: string) => ['shipment', id] as const,
  exceptions: (id: string) => ['exceptions', id] as const,
  documents: (id: string) => ['documents', id] as const,
  actions: (caseId: string) => ['available-actions', caseId] as const,
};

/**
 * Build the query params for GET /api/queue. Values are forwarded to the server
 * VERBATIM — never intersected with the frozen enums. The server is the
 * validator.
 */
function queueParams(q: QueueQuery): QueryParams {
  return {
    status: q.status,
    exception_type: q.exception_type,
    priority: q.priority,
    include_clean: q.include_clean,
    include_cleared: q.include_cleared,
    sort: q.sort,
    page: q.page,
    page_size: q.page_size,
  };
}

export function useQueue(query: QueueQuery) {
  return useQuery({
    queryKey: qk.queue(query),
    queryFn: () => apiGet<QueueResponse>('/api/queue', queueParams(query)),
  });
}

export function useShipment(shipmentId: string) {
  return useQuery({
    queryKey: qk.shipment(shipmentId),
    queryFn: () =>
      apiGet<ShipmentDetail>(`/api/shipments/${encodeURIComponent(shipmentId)}`),
  });
}

export function useExceptions(shipmentId: string) {
  return useQuery({
    queryKey: qk.exceptions(shipmentId),
    queryFn: () =>
      apiGet<ExceptionsResponse>(
        `/api/shipments/${encodeURIComponent(shipmentId)}/exceptions`,
      ),
  });
}

export function useDocuments(shipmentId: string) {
  return useQuery({
    queryKey: qk.documents(shipmentId),
    queryFn: () =>
      apiGet<DocumentsResponse>(
        `/api/shipments/${encodeURIComponent(shipmentId)}/documents`,
      ),
  });
}

export function useAvailableActions(caseId: string | undefined) {
  return useQuery({
    queryKey: qk.actions(caseId ?? ''),
    enabled: Boolean(caseId),
    queryFn: () =>
      apiGet<AvailableActionsResponse>(
        `/api/cases/${encodeURIComponent(caseId as string)}/available-actions`,
      ),
  });
}

/**
 * Submit an action. On success invalidates the queue, shipment, exceptions,
 * documents and available-actions keys, so no screen re-derives state locally.
 */
export function useSubmitAction(caseId: string, shipmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { command: ActionCommand; caseVersion: number }) =>
      apiPost<ActionResult>(
        `/api/cases/${encodeURIComponent(caseId)}/actions`,
        input.command,
        { caseVersion: input.caseVersion },
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['queue'] });
      client.invalidateQueries({ queryKey: qk.shipment(shipmentId) });
      client.invalidateQueries({ queryKey: qk.exceptions(shipmentId) });
      client.invalidateQueries({ queryKey: qk.documents(shipmentId) });
      client.invalidateQueries({ queryKey: qk.actions(caseId) });
    },
  });
}
