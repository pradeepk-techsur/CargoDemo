/**
 * The typed row contract for CargoDemo.
 *
 * One interface per table this build reads or writes. Property names are
 * IDENTICAL to the SQL column names (snake_case, no camelCase translation);
 * types follow the storage conventions (TEXT -> string, nullable -> `| null`,
 * INTEGER boolean -> `0 | 1`, cents -> number). Waves 2-5 import these types and
 * MUST NOT rename a column — a type file that drifts from the schema produces SQL
 * that fails at runtime.
 */

// --- Closed string-literal unions (consumed by later waves) ------------------

export type ExceptionType =
  | 'MISSING_REQUIRED_DOCUMENT'
  | 'INVALID_HTS_CODE'
  | 'CONFLICTING_COUNTRY_OF_ORIGIN';

export type CaseStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'AWAITING_INFORMATION'
  | 'ON_HOLD'
  | 'ESCALATED'
  | 'PENDING_APPROVAL'
  | 'CLEARED';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type UserRole = 'CARGO_SPECIALIST' | 'SUPERVISOR' | 'SYSTEM_ADMINISTRATOR';

export type CaseAction =
  | 'REQUEST_INFORMATION'
  | 'SEND_FOR_SPECIALIST_REVIEW'
  | 'CLEAR_EXCEPTION'
  | 'PLACE_ON_HOLD'
  | 'ESCALATE_TO_SUPERVISOR';

export type DocumentStatus = 'RECEIVED' | 'NOT_RECEIVED';

export type DocumentProvenance = 'SEEDED' | 'INGESTED' | 'SIMULATED_UPLOAD';

export type EvaluationTrigger =
  | 'INGESTION'
  | 'MANUAL_REVALIDATION'
  | 'DOCUMENT_UPLOAD'
  | 'RULE_CHANGE'
  | 'SEED';

export type ExceptionStatus =
  | 'OPEN'
  | 'RESOLVED_BY_REVALIDATION'
  | 'CLEARED_BY_DECISION'
  | 'SUPERSEDED_BY_EVALUATION';

// --- Row interfaces ----------------------------------------------------------

export interface UserRow {
  id: string;
  name: string;
  role: UserRole;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface CargoEntryRow {
  id: string;
  shipment_id: string;
  importer_name: string;
  carrier_name: string;
  product_description: string;
  hts_code: string | null;
  hts_code_normalized: string | null;
  country_of_origin: string;
  country_of_origin_iso2: string | null;
  manufacturer_name: string;
  manufacturer_address_line1: string;
  manufacturer_address_city: string | null;
  manufacturer_address_region: string | null;
  manufacturer_address_postal_code: string | null;
  manufacturer_address_country: string;
  manufacturer_address_country_iso2: string | null;
  shipment_value_cents: number;
  entry_date: string;
  declared_priority_hint: CasePriority | null;
  ingestion_source: string;
  ingestion_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  cargo_entry_id: string;
  document_type: string;
  status: DocumentStatus;
  filename: string | null;
  storage_path: string | null;
  content_hash: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  provenance: DocumentProvenance;
  stated_country: string | null;
  note: string | null;
  superseded: 0 | 1;
  duplicate_of_document_id: string | null;
  source_request_id: string | null;
  uploaded_by_user_id: string | null;
  received_at: string | null;
  created_at: string;
}

export interface RuleRow {
  id: string;
  name: string;
  name_lower: string;
  exception_type: ExceptionType;
  description: string;
  policy_reference: string;
  severity: Severity;
  priority_mapping: string | null;
  conditions_json: string;
  params_json: string;
  enabled: 0 | 1;
  version: number;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationRow {
  id: string;
  cargo_entry_id: string;
  case_id: string;
  version: number;
  trigger: EvaluationTrigger;
  rule_set_fingerprint: string;
  skipped_rules_json: string;
  invalid_rules_json: string;
  finding_count: number;
  duration_ms: number | null;
  actor_kind: 'HUMAN' | 'SYSTEM';
  actor_user_id: string | null;
  evaluated_at: string;
}

export interface ExceptionRow {
  id: string;
  evaluation_id: string;
  cargo_entry_id: string;
  case_id: string;
  rule_id: string;
  rule_version: number;
  exception_type: ExceptionType;
  sub_reason: string;
  severity: Severity;
  status: ExceptionStatus;
  assertion: string;
  missing_information_json: string;
  first_detected_evaluation_id: string;
  opened_at: string;
  resolved_at: string | null;
  resolved_by_evaluation_id: string | null;
  resolution_reason: string | null;
  superseded_by_exception_id: string | null;
  cleared_by_approval_id: string | null;
  created_at: string;
}

export interface EvidenceRow {
  id: string;
  exception_id: string;
  kind: 'OBSERVED' | 'COMPARISON' | 'MISSING' | 'CONTEXT';
  field_path: string;
  raw_value: string | null;
  normalized_value: string | null;
  comparison_field_path: string | null;
  comparison_raw_value: string | null;
  comparison_normalized_value: string | null;
  expected: string | null;
  observed: string | null;
  assertion: string | null;
  truncated: 0 | 1;
  display_order: number;
  created_at: string;
}

export interface CaseRow {
  id: string;
  cargo_entry_id: string;
  shipment_id: string;
  status: CaseStatus;
  priority: CasePriority;
  priority_basis_json: string;
  queued: 0 | 1;
  current_evaluation_id: string | null;
  open_exception_count: number;
  exception_type_summary: string;
  assigned_to_user_id: string | null;
  hold_reason: string | null;
  hold_reason_detail: string | null;
  hold_placed_by_user_id: string | null;
  hold_placed_at: string | null;
  escalation_reason: string | null;
  escalated_by_user_id: string | null;
  escalated_to_user_id: string | null;
  escalated_at: string | null;
  approving_official_user_id: string | null;
  approving_official_name: string | null;
  approving_official_role: string | null;
  cleared_at: string | null;
  last_action_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseActionRow {
  id: string;
  case_id: string;
  cargo_entry_id: string;
  action: CaseAction;
  status_before: string;
  status_after: string;
  justification: string;
  parameters_json: string;
  evaluation_id: string | null;
  actor_user_id: string;
  actor_name: string;
  actor_role: 'CARGO_SPECIALIST' | 'SUPERVISOR';
  audit_entry_id: string;
  idempotency_key: string | null;
  occurred_at: string;
}
