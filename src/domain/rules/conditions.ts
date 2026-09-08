/**
 * Applicability condition evaluation (F04 §3), shared across all three
 * evaluators. PURE.
 *
 * All present conditions AND together; an empty object is always applicable. A
 * non-applicable rule is skipped and recorded with the failing condition so an
 * administrator can see *why* a rule did not fire — distinct from "applied and
 * passed". An unknown condition key is a rule-definition error.
 */

import type { EntrySnapshot } from './types.js';
import { normalizeCountry } from './normalize.js';

export type ConditionResult =
  | { applicable: true }
  | {
      applicable: false;
      condition: string;
      expected: string;
      actual: string;
      result: 'NOT_APPLICABLE';
    }
  | { error: true; condition: string; detail: string };

const KNOWN_CONDITION_KEYS = new Set([
  'min_shipment_value_usd',
  'max_shipment_value_usd',
  'commodity_keywords',
  'hts_prefixes',
  'country_of_origin_in',
  'country_of_origin_not_in',
]);

// Default separators used to normalize the HTS for prefix matching. This is the
// applicability layer, not the HTS evaluator; the evaluator reads its own params.
const DEFAULT_HTS_SEPARATORS = ['.', '-', ' '];

function stripSeparators(raw: string): string {
  let out = '';
  for (const ch of raw) {
    if (!DEFAULT_HTS_SEPARATORS.includes(ch)) out += ch;
  }
  return out.trim();
}

function notApplicable(
  condition: string,
  expected: string,
  actual: string,
): ConditionResult {
  return { applicable: false, condition, expected, actual, result: 'NOT_APPLICABLE' };
}

/**
 * Evaluate `conditions` against `entry`. Returns `{ applicable: true }`,
 * `{ applicable: false, ... }` with the first failing condition named, or
 * `{ error: true, ... }` for an unknown condition key.
 */
export function evaluateConditions(
  entry: EntrySnapshot,
  conditions: Record<string, unknown>,
): ConditionResult {
  const keys = Object.keys(conditions);

  // Validate keys first — an unknown condition is a rule-definition error.
  for (const key of keys) {
    if (!KNOWN_CONDITION_KEYS.has(key)) {
      return { error: true, condition: key, detail: `unknown condition '${key}'` };
    }
  }

  const valueUsd = entry.shipment_value_cents / 100;

  if ('min_shipment_value_usd' in conditions) {
    const min = Number(conditions.min_shipment_value_usd);
    if (!(valueUsd >= min)) {
      return notApplicable(
        'min_shipment_value_usd',
        `shipment_value_usd >= ${min}`,
        `${valueUsd}`,
      );
    }
  }

  if ('max_shipment_value_usd' in conditions) {
    const max = Number(conditions.max_shipment_value_usd);
    if (!(valueUsd <= max)) {
      return notApplicable(
        'max_shipment_value_usd',
        `shipment_value_usd <= ${max}`,
        `${valueUsd}`,
      );
    }
  }

  if ('commodity_keywords' in conditions) {
    const keywords = (conditions.commodity_keywords as unknown[]).map((k) =>
      String(k).toLowerCase(),
    );
    const desc = (entry.product_description ?? '').toLowerCase();
    const hit = keywords.some((k) => desc.includes(k));
    if (!hit) {
      return notApplicable(
        'commodity_keywords',
        `product_description contains any of [${keywords.join(', ')}]`,
        entry.product_description ?? '',
      );
    }
  }

  if ('hts_prefixes' in conditions) {
    const prefixes = (conditions.hts_prefixes as unknown[]).map((p) => String(p));
    const normalized = entry.hts_code == null ? '' : stripSeparators(entry.hts_code);
    const hit = prefixes.some((p) => (p === '' ? normalized === '' : normalized.startsWith(p)));
    if (!hit) {
      return notApplicable(
        'hts_prefixes',
        `hts starts with any of [${prefixes.join(', ')}]`,
        normalized,
      );
    }
  }

  if ('country_of_origin_in' in conditions) {
    const list = (conditions.country_of_origin_in as unknown[]).map((c) => String(c));
    const iso2 = normalizeCountry(entry.country_of_origin);
    if (iso2 == null || !list.includes(iso2)) {
      return notApplicable(
        'country_of_origin_in',
        `country_of_origin_iso2 in [${list.join(', ')}]`,
        iso2 ?? String(entry.country_of_origin),
      );
    }
  }

  if ('country_of_origin_not_in' in conditions) {
    const list = (conditions.country_of_origin_not_in as unknown[]).map((c) => String(c));
    const iso2 = normalizeCountry(entry.country_of_origin);
    if (iso2 != null && list.includes(iso2)) {
      return notApplicable(
        'country_of_origin_not_in',
        `country_of_origin_iso2 not in [${list.join(', ')}]`,
        iso2,
      );
    }
  }

  return { applicable: true };
}
