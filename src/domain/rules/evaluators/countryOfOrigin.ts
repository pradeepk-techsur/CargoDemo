/**
 * CONFLICTING_COUNTRY_OF_ORIGIN evaluator (F04 §5). PURE.
 *
 * `declared_field`, `comparison_fields`, tolerance flags and `allowed_pairs` all
 * come from `rule.params`. ONE rule produces at most ONE finding — further
 * disagreeing comparison fields append evidence to the same finding rather than
 * producing extra findings. Never throws on bad shipment data.
 */

import type { EntrySnapshot, EvidenceDraft, Finding, MissingInformationItem, RuleDefinition } from '../types.js';
import { normalizeCountry } from '../normalize.js';
import { resolveFieldPath } from './../fieldPath.js';

interface OriginParams {
  declared_field: string;
  comparison_fields: string[];
  treat_missing_declared_as_conflict: boolean;
  treat_missing_comparison_as_conflict: boolean;
  allowed_pairs: { declared: string; comparison: string }[];
  case_sensitive: boolean;
}

/** A raised path-resolution error the engine must surface in invalid_rules[]. */
export class FieldPathError extends Error {
  constructor(public readonly path: string) {
    super(`RULE_PARAM_PATH_UNKNOWN: ${path}`);
    this.name = 'FieldPathError';
  }
}

function make(
  rule: RuleDefinition,
  sub_reason: string,
  assertion: string,
  evidence: EvidenceDraft[],
  missing_information: MissingInformationItem[] = [],
): Finding {
  return {
    rule_id: rule.id,
    rule_version: rule.version,
    exception_type: 'CONFLICTING_COUNTRY_OF_ORIGIN',
    severity: rule.severity,
    sub_reason,
    assertion,
    evidence,
    missing_information,
  };
}

export function evaluateCountryOfOrigin(
  entry: EntrySnapshot,
  rule: RuleDefinition,
): Finding | null {
  const p = rule.params as unknown as OriginParams;

  const declaredRaw = resolveDeclared(entry, p.declared_field);
  const declaredIso = normalizeCountry(declaredRaw);

  const declaredEvidence: EvidenceDraft = {
    kind: 'OBSERVED',
    field_path: p.declared_field,
    raw_value: declaredRaw,
    normalized_value: declaredIso,
    comparison_field_path: null,
    comparison_raw_value: null,
    comparison_normalized_value: null,
    expected: null,
    observed: null,
    assertion: null,
    display_order: 0,
  };

  // Declared origin unresolvable.
  if (declaredIso == null) {
    if (!p.treat_missing_declared_as_conflict) return null;
    const assertion = `Declared country of origin (${declaredRaw ?? 'none'}) could not be resolved to a recognized country`;
    return make(rule, 'UNRESOLVABLE_DECLARED_ORIGIN', assertion, [
      { ...declaredEvidence, assertion },
    ]);
  }

  const allowed = new Set(p.allowed_pairs.map((pr) => `${pr.declared}|${pr.comparison}`));

  let order = 1;
  for (const path of p.comparison_fields) {
    const res = resolveFieldPath(entry, path);
    if (!res.ok) {
      // A rule-definition error — surfaced by the engine into invalid_rules[].
      throw new FieldPathError(path);
    }
    const compRaw = res.value;

    if (compRaw == null || String(compRaw).trim().length === 0) {
      if (p.treat_missing_comparison_as_conflict) {
        const assertion = `Comparison origin field ${path} is absent`;
        const mi: MissingInformationItem[] = [
          {
            field_path: path,
            document_type: null,
            requirement: `${path} is required to confirm the declared country of origin`,
            required_by_rule: rule.id,
            policy_reference: rule.policy_reference,
            observed_digits: null,
            missing_digits: null,
          },
        ];
        return make(
          rule,
          'MISSING_COMPARISON_ORIGIN',
          assertion,
          [
            declaredEvidence,
            {
              kind: 'MISSING',
              field_path: path,
              raw_value: null,
              normalized_value: null,
              comparison_field_path: null,
              comparison_raw_value: null,
              comparison_normalized_value: null,
              expected: null,
              observed: null,
              assertion,
              display_order: order,
            },
          ],
          mi,
        );
      }
      // Insufficient evidence — continue to the next field.
      continue;
    }

    const compIso = normalizeCountry(compRaw);
    if (compIso == null) {
      const assertion = `Comparison origin (${compRaw}) at ${path} could not be resolved to a recognized country`;
      return make(rule, 'UNRESOLVABLE_COMPARISON_ORIGIN', assertion, [
        declaredEvidence,
        {
          kind: 'COMPARISON',
          field_path: path,
          raw_value: null,
          normalized_value: null,
          comparison_field_path: path,
          comparison_raw_value: compRaw,
          comparison_normalized_value: null,
          expected: null,
          observed: null,
          assertion,
          display_order: order,
        },
      ]);
    }

    if (compIso === declaredIso) {
      order += 1;
      continue; // agrees
    }

    if (allowed.has(`${declaredIso}|${compIso}`)) {
      order += 1;
      continue; // tolerated pair
    }

    // Genuine mismatch — the finding. Stop at the first genuine mismatch.
    const assertion = `Declared country of origin (${declaredRaw}/${declaredIso}) conflicts with the ${humanize(path)} (${compRaw}/${compIso})`;
    return make(rule, 'ORIGIN_MISMATCH', assertion, [
      { ...declaredEvidence, assertion },
      {
        kind: 'COMPARISON',
        field_path: path,
        raw_value: compRaw,
        normalized_value: compIso,
        comparison_field_path: path,
        comparison_raw_value: compRaw,
        comparison_normalized_value: compIso,
        expected: declaredIso,
        observed: compIso,
        assertion,
        display_order: order,
      },
    ]);
  }

  // All comparison fields agreed, were tolerated, or were insufficient.
  return null;
}

function resolveDeclared(entry: EntrySnapshot, declaredField: string): string | null {
  const res = resolveFieldPath(entry, declaredField);
  if (!res.ok) throw new FieldPathError(declaredField);
  return res.value;
}

function humanize(path: string): string {
  const DOCS = 'documents.';
  const STATED = '.stated_country';
  if (path.startsWith(DOCS) && path.endsWith(STATED)) {
    const type = path.slice(DOCS.length, path.length - STATED.length);
    return `${type.toLowerCase().replace(/_/g, ' ')} stated country`;
  }
  // Generic: dot/underscore separated path -> space separated label.
  return path.replace(/[._]/g, ' ');
}
