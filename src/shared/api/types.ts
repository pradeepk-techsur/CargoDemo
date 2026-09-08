/**
 * The whole request/response contract wave 4 imports verbatim.
 *
 * Field names are BINDING. Wave 4 imports these types and MUST NOT invent,
 * rename or infer a field. Wave 2's detection shapes (`EvidenceRecord`,
 * `MissingInformationItem`, `PriorityBasisEntry`) are RE-EXPORTED here, never
 * redeclared, so the two cannot drift.
 *
 * This file owns the canonical vocabularies (`CASE_STATUSES`, `USER_ACTIONS`)
 * because it is the lowest layer both the domain and the client can import.
 */

import type { ExceptionType, Severity } from '../types/db.js';
import type {
  EvidenceRecord,
  MissingInformationItem,
  PriorityBasisEntry,
} from '../types/detection.js';

// Re-export wave 2's shapes unchanged — one declaration, never a second copy.
export type {
  EvidenceRecord,
  MissingInformationItem,
  PriorityBasisEntry,
} from '../types/detection.js';
export type { ExceptionType, Severity } from '../types/db.js';

// --- Canonical vocabularies --------------------------------------------------

export const CASE_STATUSES = [
  'NEW',
  'IN_REVIEW',
  'AWAITING_INFORMATION',
  'ON_HOLD',
  'ESCALATED',
  'PENDING_APPROVAL',
  'CLEARED',
] as const;

export const USER_ACTIONS = [
  'REQUEST_INFORMATION',
  'SEND_FOR_SPECIALIST_REVIEW',
  'CLEAR_EXCEPTION',
  'PLACE_ON_HOLD',
  'ESCALATE_TO_SUPERVISOR',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];
export type UserAction = (typeof USER_ACTIONS)[number];

/** priority is severity's twin enum (TechArch 03a §3.2). */
export type Priority = Severity;

// --- Shared references -------------------------------------------------------

export interface UserRef {
  id: string;
  name: string;
  role: string;
}

export interface PageInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

// --- GET /api/queue ----------------------------------------------------------

export interface QueueQuery {
  status?: CaseStatus[]; // repeatable: ?status=NEW&status=IN_REVIEW
  exception_type?: ExceptionType[];
  priority?: Priority[];
  include_clean?: boolean; // default false — zero-exception cases are off the queue
  include_cleared?: boolean; // default false
  sort?: string; // default 'priority:desc,age:desc'
  // allowed fields: priority | age | updated_at | shipment_id | status
  page?: number; // default 1
  page_size?: number; // default 25, max 100 (101 => 422, never clamped)
}

export interface QueueRow {
  shipment_id: string; // "SHP-2026-0007"
  case_id: string; // "case-0007"
  importer_name: string;
  carrier_name: string;
  priority: Priority; // 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
  priority_basis_summary: string; // cases.priority_basis_json details joined by '; '
  status: CaseStatus;
  open_exception_count: number;
  exception_types: Array<{ type: ExceptionType; count: number }>; // multi-exception stays multi
  exception_summary: string; // server-rendered labels joined by '; '
  oldest_exception_opened_at: string | null; // ISO-8601 UTC ms
  age_days: number; // floor((now - oldest_exception_opened_at)/86400000); 0 when null
  assigned_to: UserRef | null;
  shipment_value_usd: string; // decimal STRING from shipment_value_cents, e.g. "85000.00"
  updated_at: string; // ISO-8601 UTC ms
}

export interface QueueResponse {
  data: QueueRow[];
  page: PageInfo;
  applied: { filters: Record<string, unknown>; sort: string };
}

// --- GET /api/shipments/:shipment_id -----------------------------------------

export interface CaseActionView {
  action_id: string;
  action: UserAction;
  status_before: CaseStatus;
  status_after: CaseStatus;
  justification: string; // verbatim, human-authored
  parameters: Record<string, unknown>; // parsed from case_actions.parameters_json
  actor: UserRef;
  occurred_at: string;
}

export interface ShipmentDetail {
  shipment_id: string;
  case_id: string;
  importer_name: string;
  carrier_name: string;
  product_description: string;
  hts_code: string | null;
  hts_code_normalized: string | null;
  hts_digit_count: number | null;
  country_of_origin: string;
  country_of_origin_iso2: string | null;
  manufacturer: {
    name: string;
    address: {
      line1: string;
      city: string | null;
      region: string | null;
      postal_code: string | null;
      country: string;
      country_iso2: string | null;
    };
  };
  shipment_value_usd: string; // "85000.00" — decimal string, never a JS number
  entry_date: string; // "2026-08-28"
  case: {
    status: CaseStatus;
    priority: Priority;
    priority_basis: PriorityBasisEntry[]; // parsed from cases.priority_basis_json
    open_exception_count: number;
    current_evaluation: {
      id: string;
      version: number;
      evaluated_at: string;
      trigger: string;
      rule_set_fingerprint: string;
    } | null;
    assigned_to: UserRef | null;
    hold_reason: string | null;
    hold_reason_detail: string | null;
    escalation_reason: string | null;
    escalated_to: UserRef | null;
    approving_official: UserRef | null; // populated when status === 'CLEARED'
    cleared_at: string | null;
    case_version: number; // epoch millis of cases.updated_at
    action_history: CaseActionView[]; // ascending by occurred_at, most recent 20
  };
  _links: { exceptions: string; documents: string; available_actions: string; actions: string };
}

// --- GET /api/shipments/:shipment_id/exceptions ------------------------------

export interface ExceptionView {
  exception_id: string; // = exceptions.id
  exception_type: ExceptionType;
  sub_reason: string;
  severity: Severity;
  status: 'OPEN' | 'RESOLVED_BY_REVALIDATION' | 'CLEARED_BY_DECISION' | 'SUPERSEDED_BY_EVALUATION';
  assertion: string; // one sentence, rendered from the evidence values
  opened_at: string;
  rule: {
    id: string;
    name: string;
    version: number;
    description: string;
    policy_reference: string;
    severity: Severity;
  };
  evidence: EvidenceRecord[]; // wave 2 shape, ordered by display_order ASC, length >= 1
  missing_information: MissingInformationItem[]; // wave 2 shape
}

export interface ExceptionsResponse {
  evaluation: {
    id: string;
    version: number;
    trigger: string;
    evaluated_at: string;
    rule_set_fingerprint: string;
  } | null;
  open: ExceptionView[]; // deterministic evaluation order, never re-sorted client-side
  resolved: ExceptionView[]; // CLEARED_BY_DECISION / SUPERSEDED_BY_EVALUATION rows
  counts: { open: number; resolved_by_revalidation: number; cleared_by_decision: number };
}

// --- GET /api/shipments/:shipment_id/documents -------------------------------

export interface DocumentView {
  id: string | null; // null for a required-but-absent type
  document_type: string; // "CERTIFICATE_OF_ORIGIN"
  display_name: string; // "Certificate Of Origin" — Title Cased server-side
  status: 'RECEIVED' | 'NOT_RECEIVED';
  provenance: 'SEEDED' | 'INGESTED' | 'SIMULATED_UPLOAD' | null;
  filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  received_at: string | null;
  required_by_rules: string[]; // rule ids from open exceptions' missing_information
  requested: {
    requested_at: string;
    requested_by: UserRef;
    action_id: string;
    requested_from: string | null;
  } | null;
}

export interface DocumentsResponse {
  data: DocumentView[];
}

// --- GET /api/cases/:case_id/available-actions -------------------------------

export type UnavailableReason = 'TRANSITION_REDUNDANT' | 'CASE_TERMINAL' | 'NO_MISSING_DOCUMENTS';

export interface AvailableAction {
  action: UserAction;
  available: boolean;
  reason: UnavailableReason | null; // ALWAYS non-null when available === false
  reason_text: string | null; // the fixed display string for `reason`
  required_fields: string[]; // e.g. ['justification','document_types']
  justification_min_length: number; // 10, or 40 for CLEAR_EXCEPTION with accepted/mixed basis
}

export interface AvailableActionsResponse {
  case_id: string;
  shipment_id: string;
  status: CaseStatus;
  actor: UserRef; // the single default actor, resolved server-side
  actions: AvailableAction[]; // ALWAYS all five, never a filtered subset
  case_version: number;
}

// --- POST /api/cases/:case_id/actions — request bodies -----------------------

export interface ActionBase {
  justification: string;
}

export interface RequestInformationCommand extends ActionBase {
  action: 'REQUEST_INFORMATION';
  document_types: string[]; // 1-10 items, /^[A-Z0-9_]{3,60}$/ after upper-snake normalization
  requested_from?: string | null; // <= 200 chars, descriptive only; nothing is transmitted
  due_by?: string | null; // YYYY-MM-DD, informational only
  justify_unlisted_document?: boolean; // default false; true requires justification >= 20 chars
}

export interface SendForSpecialistReviewCommand extends ActionBase {
  action: 'SEND_FOR_SPECIALIST_REVIEW';
  assign_to_user_id?: string | null; // must resolve to an active user, else 422 ASSIGNEE_INVALID
}

export interface ClearExceptionCommand extends ActionBase {
  action: 'CLEAR_EXCEPTION';
  exception_ids: string[]; // 0-20; MUST equal the case's current OPEN set exactly
  resolution_basis: 'EXCEPTIONS_RESOLVED' | 'EXCEPTIONS_ACCEPTED' | 'MIXED';
  acknowledge_outstanding_requests?: boolean; // required true when AWAITING_INFORMATION and a doc requested & not received
}

export interface PlaceOnHoldCommand extends ActionBase {
  action: 'PLACE_ON_HOLD';
  hold_reason: 'AWAITING_EXTERNAL_INPUT' | 'PENDING_POLICY_GUIDANCE' | 'RESOURCE_CONSTRAINT' | 'OTHER';
  hold_reason_detail?: string | null; // required 10-500 chars when hold_reason === 'OTHER'
  review_by?: string | null; // YYYY-MM-DD, informational only
}

export interface EscalateToSupervisorCommand extends ActionBase {
  action: 'ESCALATE_TO_SUPERVISOR';
  escalation_reason:
    | 'POLICY_AMBIGUITY'
    | 'HIGH_VALUE'
    | 'REPEAT_OFFENDER_PATTERN'
    | 'CONFLICTING_EVIDENCE'
    | 'OTHER';
  escalation_reason_detail?: string | null; // required 10-500 chars when 'OTHER'
  escalate_to_user_id?: string | null; // must resolve to an active SUPERVISOR, else 422
}

export type ActionCommand =
  | RequestInformationCommand
  | SendForSpecialistReviewCommand
  | ClearExceptionCommand
  | PlaceOnHoldCommand
  | EscalateToSupervisorCommand;

// --- POST /api/cases/:case_id/actions — 201 response -------------------------

export interface ActionResult {
  action_id: string;
  case_id: string;
  shipment_id: string;
  action: UserAction;
  status: { before: CaseStatus; after: CaseStatus };
  acting_user: UserRef; // { id, name, role } — always a resolved human
  justification: string; // verbatim, as submitted
  occurred_at: string; // ISO-8601 UTC ms
  side_effects: {
    document_types_requested: string[];
    case_assigned_to: UserRef | null;
    escalated_to: UserRef | null;
    hold_reason: string | null;
    exceptions_cleared: string[]; // exception ids set to CLEARED_BY_DECISION
    approving_official: UserRef | null; // set only by CLEAR_EXCEPTION
    cleared_at: string | null;
  };
  available_actions: AvailableAction[]; // refreshed for the NEW state, so the UI needs no refetch
  case_version: number; // also returned as the X-Case-Version response header
}
