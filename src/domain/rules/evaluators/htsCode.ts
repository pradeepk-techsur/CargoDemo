/**
 * INVALID_HTS_CODE evaluator (F04 §4). PURE.
 *
 * Every threshold, separator set, digit count and character list is read from
 * `rule.params` — no literal `10`, no literal separators. Checks run in the
 * exact order below; the first failing check produces the finding and stops.
 * Never throws on bad shipment data — bad data is a finding.
 */

import type { EntrySnapshot, EvidenceDraft, Finding, MissingInformationItem, RuleDefinition } from '../types.js';
import { normalizeHts } from '../normalize.js';

interface HtsParams {
  expected_digit_count: number;
  min_digit_count: number;
  allowed_separators: string[];
  allow_partial: boolean;
  treat_missing_as_exception: boolean;
  check_known_codes: boolean;
  known_code_prefix_length: number;
  known_codes: string[];
  placeholder_characters: string[];
}

function finding(
  rule: RuleDefinition,
  sub_reason: string,
  assertion: string,
  evidence: EvidenceDraft[],
  missing_information: MissingInformationItem[] = [],
): Finding {
  return {
    rule_id: rule.id,
    rule_version: rule.version,
    exception_type: 'INVALID_HTS_CODE',
    severity: rule.severity,
    sub_reason,
    assertion,
    evidence,
    missing_information,
  };
}

export function evaluateHtsCode(entry: EntrySnapshot, rule: RuleDefinition): Finding | null {
  const p = rule.params as unknown as HtsParams;
  const raw = entry.hts_code;

  // 1. MISSING
  if (raw == null || raw.trim().length === 0) {
    if (!p.treat_missing_as_exception) return null;
    const assertion = `HTS code is missing; a complete ${p.expected_digit_count}-digit classification is required`;
    const evidence: EvidenceDraft[] = [
      {
        kind: 'OBSERVED',
        field_path: 'hts_code',
        raw_value: raw ?? null,
        normalized_value: null,
        comparison_field_path: null,
        comparison_raw_value: null,
        comparison_normalized_value: null,
        expected: `${p.expected_digit_count} digits`,
        observed: '0 digits',
        assertion,
        display_order: 0,
      },
      {
        kind: 'MISSING',
        field_path: 'hts_code',
        raw_value: null,
        normalized_value: null,
        comparison_field_path: null,
        comparison_raw_value: null,
        comparison_normalized_value: null,
        expected: `${p.expected_digit_count} digits`,
        observed: null,
        assertion: `A complete ${p.expected_digit_count}-digit HTS classification is required`,
        display_order: 1,
      },
    ];
    const mi: MissingInformationItem[] = [
      {
        field_path: 'hts_code',
        document_type: null,
        requirement: `A complete ${p.expected_digit_count}-digit HTS classification is required`,
        required_by_rule: rule.id,
        policy_reference: rule.policy_reference,
        observed_digits: 0,
        missing_digits: p.expected_digit_count,
      },
    ];
    return finding(rule, 'MISSING', assertion, evidence, mi);
  }

  // 2. Normalize
  const normalized = normalizeHts(raw, p.allowed_separators);

  const observedEvidence = (
    sub_reason: string,
    assertion: string,
    expected: string | null,
    observed: string | null,
  ): EvidenceDraft => ({
    kind: 'OBSERVED',
    field_path: 'hts_code',
    raw_value: raw,
    normalized_value: normalized,
    comparison_field_path: null,
    comparison_raw_value: null,
    comparison_normalized_value: null,
    expected,
    observed,
    assertion,
    display_order: 0,
  });

  // 3. PLACEHOLDER
  const placeholderSet = new Set(p.placeholder_characters);
  const placeholderHit = [...normalized].some((ch) => placeholderSet.has(ch));
  if (placeholderHit) {
    const assertion = `HTS code "${raw}" contains placeholder characters and is not a complete classification`;
    return finding(rule, 'PLACEHOLDER', assertion, [
      observedEvidence('PLACEHOLDER', assertion, `${p.expected_digit_count} numeric digits`, normalized),
    ]);
  }

  // 4. NON_NUMERIC
  const offending: { char: string; position: number }[] = [];
  [...normalized].forEach((ch, i) => {
    if (ch < '0' || ch > '9') offending.push({ char: ch, position: i });
  });
  if (offending.length > 0) {
    const detail = offending.map((o) => `'${o.char}'@${o.position}`).join(', ');
    const assertion = `HTS code "${raw}" contains non-numeric characters (${detail})`;
    const ev = observedEvidence('NON_NUMERIC', assertion, 'numeric digits only', detail);
    return finding(rule, 'NON_NUMERIC', assertion, [ev]);
  }

  // 5. ODD_STRUCTURE (checked against the RAW code)
  const sepClass = p.allowed_separators.map((s) => escapeRegExp(s)).join('');
  if (sepClass.length > 0) {
    const runRe = new RegExp(`[${sepClass}]{2,}`);
    const leadRe = new RegExp(`^[${sepClass}]`);
    const trailRe = new RegExp(`[${sepClass}]$`);
    if (runRe.test(raw) || leadRe.test(raw) || trailRe.test(raw)) {
      const assertion = `HTS code "${raw}" has malformed separator structure`;
      return finding(rule, 'ODD_STRUCTURE', assertion, [
        observedEvidence('ODD_STRUCTURE', assertion, 'well-formed separators', raw),
      ]);
    }
  }

  // 6. Digit count
  const d = normalized.length;
  if (d > p.expected_digit_count) {
    const assertion = `HTS code has ${d} significant digits; a complete classification requires ${p.expected_digit_count}`;
    return finding(rule, 'TOO_MANY_DIGITS', assertion, [
      observedEvidence('TOO_MANY_DIGITS', assertion, `${p.expected_digit_count} digits`, `${d} digits`),
    ]);
  }
  if (d < p.expected_digit_count) {
    const lengthAccepted = p.allow_partial && d >= p.min_digit_count;
    if (!lengthAccepted) {
      const assertion = `HTS code has ${d} significant digits; a complete classification requires ${p.expected_digit_count}`;
      const evidence: EvidenceDraft[] = [
        observedEvidence('INCOMPLETE_DIGITS', assertion, `${p.expected_digit_count} digits`, `${d} digits`),
        {
          kind: 'MISSING',
          field_path: 'hts_code',
          raw_value: null,
          normalized_value: null,
          comparison_field_path: null,
          comparison_raw_value: null,
          comparison_normalized_value: null,
          expected: `${p.expected_digit_count} digits`,
          observed: `${d} digits`,
          assertion: `${p.expected_digit_count - d} of ${p.expected_digit_count} HTS digits are absent`,
          display_order: 1,
        },
      ];
      const mi: MissingInformationItem[] = [
        {
          field_path: 'hts_code',
          document_type: null,
          requirement: `${p.expected_digit_count}-digit classification required`,
          required_by_rule: rule.id,
          policy_reference: rule.policy_reference,
          observed_digits: d,
          missing_digits: p.expected_digit_count - d,
        },
      ];
      return finding(rule, 'INCOMPLETE_DIGITS', assertion, evidence, mi);
    }
  }

  // 7. UNKNOWN_CODE
  if (p.check_known_codes) {
    const prefix = normalized.slice(0, p.known_code_prefix_length);
    if (!p.known_codes.includes(prefix)) {
      const assertion = `HTS prefix "${prefix}" is not in the recognised reference list`;
      return finding(rule, 'UNKNOWN_CODE', assertion, [
        observedEvidence('UNKNOWN_CODE', assertion, 'a recognised code prefix', prefix),
      ]);
    }
  }

  // 8. valid & complete
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}
