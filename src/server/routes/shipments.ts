/**
 * GET /api/shipments/:shipment_id
 * GET /api/shipments/:shipment_id/exceptions
 * GET /api/shipments/:shipment_id/documents
 *
 * The `:shipment_id` parameter name is verbatim (contract greps depend on it).
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Database } from 'better-sqlite3';

import {
  getShipmentDetail,
  getExceptions,
  getDocuments,
} from '../../app/shipmentService.js';
import type { RouteDefinition } from './registry.js';

function db(req: FastifyRequest): Database {
  return (req.server as unknown as { db: Database }).db;
}

const shipmentParams = {
  type: 'object',
  additionalProperties: false,
  required: ['shipment_id'],
  properties: { shipment_id: { type: 'string' } },
} as const;

export const shipmentDetailRoute: RouteDefinition = {
  routeId: 'shipments.detail',
  method: 'GET' as const,
  url: '/api/shipments/:shipment_id',
  schema: { params: shipmentParams },
  handler(req: FastifyRequest, reply: FastifyReply) {
    const { shipment_id } = req.params as { shipment_id: string };
    reply
      .type('application/json; charset=utf-8')
      .send(getShipmentDetail(db(req), shipment_id));
  },
};

export const shipmentExceptionsRoute: RouteDefinition = {
  routeId: 'shipments.exceptions',
  method: 'GET' as const,
  url: '/api/shipments/:shipment_id/exceptions',
  schema: { params: shipmentParams },
  handler(req: FastifyRequest, reply: FastifyReply) {
    const { shipment_id } = req.params as { shipment_id: string };
    reply
      .type('application/json; charset=utf-8')
      .send(getExceptions(db(req), shipment_id));
  },
};

export const shipmentDocumentsRoute: RouteDefinition = {
  routeId: 'shipments.documents',
  method: 'GET' as const,
  url: '/api/shipments/:shipment_id/documents',
  schema: { params: shipmentParams },
  handler(req: FastifyRequest, reply: FastifyReply) {
    const { shipment_id } = req.params as { shipment_id: string };
    reply
      .type('application/json; charset=utf-8')
      .send(getDocuments(db(req), shipment_id));
  },
};

export const shipmentRoutes: RouteDefinition[] = [
  shipmentDetailRoute,
  shipmentExceptionsRoute,
  shipmentDocumentsRoute,
];
