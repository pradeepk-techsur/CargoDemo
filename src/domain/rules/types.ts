/**
 * Rule-engine I/O types (F04). PURE — this file imports nothing from the
 * database, filesystem, clock or network. The engine's public surface (the
 * subset waves 3-5 consume) is re-exported from `src/shared/types/rules.ts` so
 * feature code never reaches into `domain/`.
 *
 * `EntrySnapshot` / `RuleDefinition` are the engine's inputs; `Finding`,
 * `EvidenceDraft`, `MissingInformationItem`, `EvaluationResult` are its outputs.
 */

import type { ExceptionType, Severity } from '../../shared/types/db.js';

export type { ExceptionType, Severity } from '../../shared/types/db.js';

/** Evidence kinds — mirrors `evidence.kind` (Y0a). */
export type EvidenceKind = 'OBSERVED' | 'COMPARISON' | 'MISSING' | 'CONTEXT';

/**
 * A rule row parsed into engine-facing shape. `conditions` / `params` /
 * `priority_mapping` are the parsed JSON of the corresponding `_json` columns.
 */
export interface RuleDefinition {
  id: string;
  name: string;
  exception_type: ExceptionType;
  description: string;
  policy_reference: string;
  severity: Severity;
  /** parsed from rules.priority_mapping; identity when null */
  priority_mapping: Partial<Record<Severity, Severity>> | null;
  /** parsed from rules.conditions_json */
  conditions: Record<string, unknown>;
  /** parsed from rules.params_json */
  params: Record<string, unknown>;
  enabled: boolean;
  version: number;
}

export interface DocumentSnapshot {
  document_type: string;
  status: string;
  filename: string | null;
  storage_path: string | null;
  superseded: 0 | 1;
  stated_country: string | null;
}

export interface EntrySnapshot {
  id: string;
  shipment_id: string;
  product_description: string;
  hts_code: string | null;
  country_of_origin: string | null;
  manufacturer_address_country: string | null;
  shipment_value_cents: number;
  documents: DocumentSnapshot[];
}

/** One structured piece of "what is missing" (F04 §4/§6). */
export interface MissingInformationItem {
  field_path: string | null; // "hts_code" for HTS; null for a document item
  document_type: string | null; // "CERTIFICATE_OF_ORIGIN"; null otherwise
  requirement: string;
  required_by_rule: string;
  policy_reference: string;
  observed_digits: number | null; // HTS only
  missing_digits: number | null; // HTS only
}

/** A single evidence row the engine wants persisted (F05 §Process step 4). */
export interface EvidenceDraft {
  kind: EvidenceKind;
  field_path: string;
  raw_value: string | null;
  normalized_value: string | null;
  comparison_field_path: string | null;
  comparison_raw_value: string | null;
  comparison_normalized_value: string | null;
  expected: string | null;
  observed: string | null;
  assertion: string | null;
  display_order: number;
}

/** An evaluator's in-memory output for one firing rule (F04 §Terminology). */
export interface Finding {
  rule_id: string;
  rule_version: number;
  exception_type: ExceptionType;
  severity: Severity;
  sub_reason: string;
  assertion: string;
  evidence: EvidenceDraft[];
  missing_information: MissingInformationItem[];
}

export interface SkippedRule {
  rule_id: string;
  condition: string;
  expected: string;
  actual: string;
  result: 'NOT_APPLICABLE';
}

export type InvalidRuleCode =
  | 'RULE_CONFIG_INVALID'
  | 'RULE_PARAM_PATH_UNKNOWN'
  | 'EXCEPTION_TYPE_UNSUPPORTED';

export interface InvalidRule {
  rule_id: string;
  code: InvalidRuleCode;
  detail: string;
}

export interface EvaluationResult {
  cargo_entry_id: string;
  findings: Finding[];
  skipped_rules: SkippedRule[];
  invalid_rules: InvalidRule[];
  rule_set_fingerprint: string;
  duration_ms: number;
}

/** The signature every evaluator implements. Returns a finding or null. */
export type Evaluator = (entry: EntrySnapshot, rule: RuleDefinition) => Finding | null;
