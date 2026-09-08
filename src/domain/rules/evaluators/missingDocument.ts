/**
 * MISSING_REQUIRED_DOCUMENT evaluator (F04 §6). PURE.
 *
 * `required_document_types`, `match_mode`, `accept_statuses`,
 * `require_file_present` and `ignore_superseded` all come from `rule.params`.
 * A rule produces at most one finding. A CONTEXT evidence row is emitted for
 * each applicability condition that made the rule apply, so a reviewer can see
 * *why this rule applied to this shipment*.
 */

import type {
  EntrySnapshot,
  EvidenceDraft,
  Finding,
  MissingInformationItem,
  RuleDefinition,
} from '../types.js';
import { normalizeDocumentType } from '../normalize.js';

interface DocumentParams {
  required_document_types: string[];
  match_mode: 'ALL' | 'ANY_ONE_OF';
  accept_statuses: string[];
  require_file_present: boolean;
  ignore_superseded: boolean;
}

// sub_reason precedence: most specific first.
const SUBREASON_RANK: Record<string, number> = {
  DOCUMENT_FILE_MISSING: 3,
  DOCUMENT_NOT_RECEIVED: 2,
  DOCUMENT_NOT_DECLARED: 1,
};

function humanizeType(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Determine the sub-reason for a single missing required type. */
function subReasonFor(
  entry: EntrySnapshot,
  wantedType: string,
  p: DocumentParams,
): string {
  const rows = entry.documents.filter(
    (d) => normalizeDocumentType(d.document_type) === wantedType,
  );
  if (rows.length === 0) return 'DOCUMENT_NOT_DECLARED';

  // A row exists but did not satisfy. Determine why for the most specific one.
  const accepted = rows.filter((d) => {
    if (p.ignore_superseded && d.superseded === 1) return false;
    return p.accept_statuses.includes(d.status);
  });
  if (accepted.length === 0) return 'DOCUMENT_NOT_RECEIVED';

  // status is accepted but file is missing under require_file_present.
  if (p.require_file_present) {
    const hasFile = accepted.some(
      (d) => (d.filename != null && d.filename !== '') || (d.storage_path != null && d.storage_path !== ''),
    );
    if (!hasFile) return 'DOCUMENT_FILE_MISSING';
  }
  return 'DOCUMENT_NOT_RECEIVED';
}

export function evaluateMissingDocument(
  entry: EntrySnapshot,
  rule: RuleDefinition,
): Finding | null {
  const p = rule.params as unknown as DocumentParams;

  // Build the received set: accepted status, not superseded (when configured),
  // file present (when configured).
  const received = new Set<string>();
  for (const d of entry.documents) {
    if (p.ignore_superseded && d.superseded === 1) continue;
    if (!p.accept_statuses.includes(d.status)) continue;
    if (p.require_file_present) {
      const hasFile =
        (d.filename != null && d.filename !== '') ||
        (d.storage_path != null && d.storage_path !== '');
      if (!hasFile) continue;
    }
    received.add(normalizeDocumentType(d.document_type));
  }

  const required = p.required_document_types.map((t) => normalizeDocumentType(t));

  let missing: string[];
  if (p.match_mode === 'ANY_ONE_OF') {
    const satisfied = required.some((t) => received.has(t));
    if (satisfied) return null;
    // None of the alternatives present — list them all.
    missing = [...required];
  } else {
    // ALL
    missing = required.filter((t) => !received.has(t));
    if (missing.length === 0) return null;
  }

  const missingInfo: MissingInformationItem[] = [];
  const missingEvidence: EvidenceDraft[] = [];
  let bestSub = 'DOCUMENT_NOT_DECLARED';
  let bestRank = 0;
  let order = 0;

  // OBSERVED: the documents that were received (context on what IS present).
  const receivedList = [...received].sort();
  const observed: EvidenceDraft = {
    kind: 'OBSERVED',
    field_path: 'documents',
    raw_value: receivedList.join(', '),
    normalized_value: receivedList.join(','),
    comparison_field_path: null,
    comparison_raw_value: null,
    comparison_normalized_value: null,
    expected: required.join(', '),
    observed: receivedList.join(', '),
    assertion:
      p.match_mode === 'ANY_ONE_OF'
        ? `None of the acceptable documents (${required.join(', ')}) have been received`
        : `${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} not been received`,
    display_order: order++,
  };

  for (const type of missing) {
    const sub = p.match_mode === 'ANY_ONE_OF' ? 'DOCUMENT_NOT_DECLARED' : subReasonFor(entry, type, p);
    const rank = SUBREASON_RANK[sub] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestSub = sub;
    }
    missingInfo.push({
      field_path: null,
      document_type: type,
      requirement: `${humanizeType(type)} is required for this shipment`,
      required_by_rule: rule.id,
      policy_reference: rule.policy_reference,
      observed_digits: null,
      missing_digits: null,
    });
    missingEvidence.push({
      kind: 'MISSING',
      field_path: 'documents',
      raw_value: type,
      normalized_value: type,
      comparison_field_path: null,
      comparison_raw_value: null,
      comparison_normalized_value: null,
      expected: 'RECEIVED',
      observed: null,
      assertion: `${humanizeType(type)} (${sub}) is required but not present`,
      display_order: order++,
    });
  }

  // CONTEXT: applicability conditions that made this rule apply.
  const contextEvidence = buildContextEvidence(entry, rule, order);

  const evidence = [observed, ...missingEvidence, ...contextEvidence];

  return {
    rule_id: rule.id,
    rule_version: rule.version,
    exception_type: 'MISSING_REQUIRED_DOCUMENT',
    severity: rule.severity,
    sub_reason: bestSub,
    assertion: observed.assertion ?? 'Required documents are missing',
    evidence,
    missing_information: missingInfo,
  };
}

/** Emit a CONTEXT row per applicability condition that made the rule apply. */
function buildContextEvidence(
  entry: EntrySnapshot,
  rule: RuleDefinition,
  startOrder: number,
): EvidenceDraft[] {
  const out: EvidenceDraft[] = [];
  let order = startOrder;
  const conditions = rule.conditions;

  if ('min_shipment_value_usd' in conditions) {
    const threshold = Number(conditions.min_shipment_value_usd);
    const valueUsd = (entry.shipment_value_cents / 100).toFixed(2);
    out.push({
      kind: 'CONTEXT',
      field_path: 'shipment_value_usd',
      raw_value: valueUsd,
      normalized_value: valueUsd,
      comparison_field_path: null,
      comparison_raw_value: null,
      comparison_normalized_value: null,
      expected: `>= ${threshold}`,
      observed: valueUsd,
      assertion: `shipment_value_usd = ${valueUsd} >= ${threshold} threshold`,
      display_order: order++,
    });
  }

  if ('commodity_keywords' in conditions) {
    const keywords = (conditions.commodity_keywords as unknown[]).map((k) => String(k));
    out.push({
      kind: 'CONTEXT',
      field_path: 'product_description',
      raw_value: entry.product_description,
      normalized_value: null,
      comparison_field_path: null,
      comparison_raw_value: null,
      comparison_normalized_value: null,
      expected: `contains any of [${keywords.join(', ')}]`,
      observed: entry.product_description,
      assertion: `product_description matched commodity keyword`,
      display_order: order++,
    });
  }

  return out;
}
