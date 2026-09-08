/**
 * The three shipment read projections (F18): full detail, exceptions with
 * field-level evidence, and the documents panel. All read-only; none mutates
 * state. Evidence is passed through verbatim — the whole point is that a reviewer
 * sees country_of_origin = "Malaysia" beside manufacturer.address.country =
 * "China".
 */

import type { Db } from '../infra/db/connection.js';
import { repositories } from '../infra/db/index.js';
import { errors } from '../shared/api/errors.js';
import type {
  DocumentsResponse,
  DocumentView,
  ExceptionsResponse,
  ExceptionView,
  ShipmentDetail,
  UserRef,
} from '../shared/api/types.js';
import type { CaseStatus } from '../shared/api/types.js';
import type { CaseRow, DocumentRow, UserRow } from '../shared/types/db.js';
import type { ExceptionRecord, PriorityBasisEntry } from '../shared/types/detection.js';
import { centsToUsdString } from './money.js';

/** Title Case a document type: CERTIFICATE_OF_ORIGIN → Certificate Of Origin. */
export function titleCase(documentType: string): string {
  return documentType
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function userRef(db: Db, userId: string | null): UserRef | null {
  if (!userId) return null;
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  return u ? { id: u.id, name: u.name, role: u.role } : null;
}

function parseBasis(json: string): PriorityBasisEntry[] {
  try {
    const parsed = JSON.parse(json) as PriorityBasisEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function digitCount(normalized: string | null): number | null {
  if (normalized == null) return null;
  return (normalized.match(/\d/g) ?? []).length;
}

export function getShipmentDetail(db: Db, shipmentId: string): ShipmentDetail {
  const repos = repositories(db);
  const entry = repos.cargo.getByShipmentId(shipmentId);
  if (!entry) throw errors.RESOURCE_NOT_FOUND(`Shipment ${shipmentId} not found`);
  const caseRow = repos.cases.getByCargoEntryId(entry.id);
  if (!caseRow) throw errors.RESOURCE_NOT_FOUND(`Case for shipment ${shipmentId} not found`);

  const currentEval = caseRow.current_evaluation_id
    ? repos.evaluations.getById(caseRow.current_evaluation_id)
    : undefined;

  const actionHistory = repos.workflow.listCaseActions(caseRow.id, 20);

  const base = `/api/shipments/${shipmentId}`;

  return {
    shipment_id: entry.shipment_id,
    case_id: caseRow.id,
    importer_name: entry.importer_name,
    carrier_name: entry.carrier_name,
    product_description: entry.product_description,
    hts_code: entry.hts_code,
    hts_code_normalized: entry.hts_code_normalized,
    hts_digit_count: digitCount(entry.hts_code_normalized),
    country_of_origin: entry.country_of_origin,
    country_of_origin_iso2: entry.country_of_origin_iso2,
    manufacturer: {
      name: entry.manufacturer_name,
      address: {
        line1: entry.manufacturer_address_line1,
        city: entry.manufacturer_address_city,
        region: entry.manufacturer_address_region,
        postal_code: entry.manufacturer_address_postal_code,
        country: entry.manufacturer_address_country,
        country_iso2: entry.manufacturer_address_country_iso2,
      },
    },
    shipment_value_usd: centsToUsdString(entry.shipment_value_cents),
    entry_date: entry.entry_date,
    case: {
      status: caseRow.status,
      priority: caseRow.priority,
      priority_basis: parseBasis(caseRow.priority_basis_json),
      open_exception_count: caseRow.open_exception_count,
      current_evaluation: currentEval
        ? {
            id: currentEval.id,
            version: currentEval.version,
            evaluated_at: currentEval.evaluated_at,
            trigger: currentEval.trigger,
            rule_set_fingerprint: currentEval.rule_set_fingerprint,
          }
        : null,
      assigned_to: userRef(db, caseRow.assigned_to_user_id),
      hold_reason: caseRow.hold_reason,
      hold_reason_detail: caseRow.hold_reason_detail,
      escalation_reason: caseRow.escalation_reason,
      escalated_to: userRef(db, caseRow.escalated_to_user_id),
      approving_official: userRef(db, caseRow.approving_official_user_id),
      cleared_at: caseRow.cleared_at,
      case_version: Date.parse(caseRow.updated_at),
      action_history: actionHistory,
    },
    _links: {
      exceptions: `${base}/exceptions`,
      documents: `${base}/documents`,
      available_actions: `/api/cases/${caseRow.id}/available-actions`,
      actions: `/api/cases/${caseRow.id}/actions`,
    },
  };
}

function toExceptionView(record: ExceptionRecord): ExceptionView {
  return {
    exception_id: record.id,
    exception_type: record.exception_type,
    sub_reason: record.sub_reason,
    severity: record.severity,
    status: record.status,
    assertion: record.assertion,
    opened_at: record.opened_at,
    rule: {
      id: record.rule_id,
      name: record.rule_name,
      version: record.rule_version,
      description: record.rule_description,
      policy_reference: record.policy_reference,
      severity: record.severity,
    },
    evidence: record.evidence,
    missing_information: record.missing_information,
  };
}

export function getExceptions(db: Db, shipmentId: string): ExceptionsResponse {
  const repos = repositories(db);
  const entry = repos.cargo.getByShipmentId(shipmentId);
  if (!entry) throw errors.RESOURCE_NOT_FOUND(`Shipment ${shipmentId} not found`);
  const caseRow = repos.cases.getByCargoEntryId(entry.id) as CaseRow | undefined;
  if (!caseRow) throw errors.RESOURCE_NOT_FOUND(`Case for shipment ${shipmentId} not found`);

  const records = repos.exceptions.listByCaseWithEvidence(caseRow.id);

  const open: ExceptionView[] = [];
  const resolved: ExceptionView[] = [];
  let clearedByDecision = 0;
  let resolvedByRevalidation = 0;

  for (const record of records) {
    const view = toExceptionView(record);
    if (record.status === 'OPEN') {
      open.push(view);
    } else {
      resolved.push(view);
      if (record.status === 'CLEARED_BY_DECISION') clearedByDecision += 1;
      if (record.status === 'RESOLVED_BY_REVALIDATION') resolvedByRevalidation += 1;
    }
  }

  const currentEval = caseRow.current_evaluation_id
    ? repos.evaluations.getById(caseRow.current_evaluation_id)
    : undefined;

  return {
    evaluation: currentEval
      ? {
          id: currentEval.id,
          version: currentEval.version,
          trigger: currentEval.trigger,
          evaluated_at: currentEval.evaluated_at,
          rule_set_fingerprint: currentEval.rule_set_fingerprint,
        }
      : null,
    open,
    resolved,
    counts: {
      open: open.length,
      resolved_by_revalidation: resolvedByRevalidation,
      cleared_by_decision: clearedByDecision,
    },
  };
}

interface RequestedInfo {
  requested_at: string;
  requested_by: UserRef;
  action_id: string;
  requested_from: string | null;
}

export function getDocuments(db: Db, shipmentId: string): DocumentsResponse {
  const repos = repositories(db);
  const entry = repos.cargo.getByShipmentId(shipmentId);
  if (!entry) throw errors.RESOURCE_NOT_FOUND(`Shipment ${shipmentId} not found`);
  const caseRow = repos.cases.getByCargoEntryId(entry.id) as CaseRow | undefined;
  if (!caseRow) throw errors.RESOURCE_NOT_FOUND(`Case for shipment ${shipmentId} not found`);

  const docRows = repos.documents.listByEntry(entry.id) as DocumentRow[];

  // Collect required_by_rules per document type from open exceptions' missing_information.
  const requiredByType = new Map<string, Set<string>>();
  const missingWithoutRow = new Set<string>();
  const records = repos.exceptions.listByCaseWithEvidence(caseRow.id);
  const existingTypes = new Set(docRows.map((d) => d.document_type));
  for (const rec of records) {
    if (rec.status !== 'OPEN') continue;
    for (const item of rec.missing_information) {
      if (!item.document_type) continue;
      if (!requiredByType.has(item.document_type)) requiredByType.set(item.document_type, new Set());
      requiredByType.get(item.document_type)!.add(item.required_by_rule);
      if (!existingTypes.has(item.document_type)) missingWithoutRow.add(item.document_type);
    }
  }

  // Requested info per document type, derived from REQUEST_INFORMATION history.
  const requestedByType = new Map<string, RequestedInfo>();
  const history = repos.workflow.listCaseActions(caseRow.id, 100);
  for (const action of history) {
    if (action.action !== 'REQUEST_INFORMATION') continue;
    const params = action.parameters as {
      document_types?: unknown;
      requested_from?: unknown;
    };
    const types = Array.isArray(params.document_types) ? params.document_types : [];
    for (const t of types) {
      if (typeof t !== 'string') continue;
      // most recent request wins (history is ascending)
      requestedByType.set(t, {
        requested_at: action.occurred_at,
        requested_by: action.actor,
        action_id: action.action_id,
        requested_from:
          typeof params.requested_from === 'string' ? params.requested_from : null,
      });
    }
  }

  const data: DocumentView[] = docRows.map((d) => ({
    id: d.id,
    document_type: d.document_type,
    display_name: titleCase(d.document_type),
    status: d.status,
    provenance: d.provenance,
    filename: d.filename,
    mime_type: d.mime_type,
    file_size_bytes: d.file_size_bytes,
    received_at: d.received_at,
    required_by_rules: [...(requiredByType.get(d.document_type) ?? [])],
    requested: requestedByType.get(d.document_type) ?? null,
  }));

  // Synthetic NOT_RECEIVED rows for required-but-absent types with no document row.
  for (const type of missingWithoutRow) {
    data.push({
      id: null,
      document_type: type,
      display_name: titleCase(type),
      status: 'NOT_RECEIVED',
      provenance: null,
      filename: null,
      mime_type: null,
      file_size_bytes: null,
      received_at: null,
      required_by_rules: [...(requiredByType.get(type) ?? [])],
      requested: requestedByType.get(type) ?? null,
    });
  }

  return { data };
}
