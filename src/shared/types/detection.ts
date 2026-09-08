/**
 * The detection projection waves 3-5 read.
 *
 * BINDING contract. Wave 3 serves `ExceptionRecord` from
 * `GET /api/shipments/{id}/exceptions`; wave 4 renders it. Property names equal
 * the SQL column names (src/shared/types/db.ts) — do NOT rename a field into
 * camelCase.
 */

import type { ExceptionType, Severity, ExceptionStatus, CasePriority } from './db.js';
import type { MissingInformationItem } from './rules.js';

export type { MissingInformationItem } from './rules.js';

export interface EvidenceRecord {
  id: string;
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
}

export interface ExceptionRecord {
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
  missing_information: MissingInformationItem[];
  first_detected_evaluation_id: string;
  opened_at: string;
  created_at: string;
  evidence: EvidenceRecord[]; // ordered by display_order ASC; ALWAYS length >= 1
  // Rule presentation fields, joined from `rules`:
  rule_name: string;
  rule_description: string;
  policy_reference: string;
}

export interface PriorityBasisEntry {
  factor:
    | 'BASE_SEVERITY'
    | 'VALUE_ESCALATION'
    | 'MULTIPLICITY_ESCALATION'
    | 'AGE_ESCALATION'
    | 'CLAMP';
  detail: string;
  from: CasePriority;
  to: CasePriority;
}
