/**
 * Per-exception-type parameter JSON Schemas (F04 §4/§5/§6), validated with Ajv
 * on EVERY load — not only on save (T-02-02). `additionalProperties: false` is
 * load-bearing: a typo'd parameter name is a loud `RULE_CONFIG_INVALID`, never a
 * silently ignored key that disables a check. `useDefaults: true` materializes
 * the documented defaults so evaluators read a complete params object.
 *
 * PURE (Ajv is a pure, in-process validator — no I/O).
 */

import Ajv, { type ValidateFunction } from 'ajv';

import type { ExceptionType } from './types.js';

const ajv = new Ajv({ useDefaults: true, allErrors: true, strict: false });

// --- INVALID_HTS_CODE (F04 §4) ----------------------------------------------

const htsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    expected_digit_count: { type: 'integer', minimum: 6, maximum: 12, default: 10 },
    min_digit_count: { type: 'integer', minimum: 4, maximum: 12, default: 6 },
    allowed_separators: {
      type: 'array',
      items: { type: 'string' },
      default: ['.', '-', ' '],
    },
    allow_partial: { type: 'boolean', default: false },
    treat_missing_as_exception: { type: 'boolean', default: true },
    check_known_codes: { type: 'boolean', default: false },
    known_code_prefix_length: { type: 'integer', minimum: 4, maximum: 10, default: 6 },
    known_codes: { type: 'array', items: { type: 'string' }, default: [] },
    placeholder_characters: {
      type: 'array',
      items: { type: 'string' },
      default: ['X', 'x', '*', '?', '#'],
    },
  },
} as const;

// --- CONFLICTING_COUNTRY_OF_ORIGIN (F04 §5) ---------------------------------

const originSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    declared_field: { type: 'string', default: 'country_of_origin' },
    comparison_fields: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      default: ['manufacturer.address.country'],
    },
    treat_missing_declared_as_conflict: { type: 'boolean', default: true },
    treat_missing_comparison_as_conflict: { type: 'boolean', default: false },
    allowed_pairs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          declared: { type: 'string' },
          comparison: { type: 'string' },
        },
        required: ['declared', 'comparison'],
      },
      default: [],
    },
    case_sensitive: { type: 'boolean', default: false },
  },
} as const;

// --- MISSING_REQUIRED_DOCUMENT (F04 §6) -------------------------------------

const documentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['required_document_types'],
  properties: {
    required_document_types: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 20,
    },
    match_mode: { type: 'string', enum: ['ALL', 'ANY_ONE_OF'], default: 'ALL' },
    accept_statuses: {
      type: 'array',
      items: { type: 'string' },
      default: ['RECEIVED'],
    },
    require_file_present: { type: 'boolean', default: true },
    ignore_superseded: { type: 'boolean', default: true },
  },
} as const;

const VALIDATORS: Record<ExceptionType, ValidateFunction> = {
  INVALID_HTS_CODE: ajv.compile(htsSchema),
  CONFLICTING_COUNTRY_OF_ORIGIN: ajv.compile(originSchema),
  MISSING_REQUIRED_DOCUMENT: ajv.compile(documentSchema),
};

export type ValidateParamsResult =
  | { ok: true; params: Record<string, unknown> }
  | { ok: false; detail: string };

/**
 * Validate (and default-fill) `params` for `exception_type`. Ajv mutates a copy
 * with defaults applied. Includes the F04 §4 step 7 cross-field check:
 * `check_known_codes: true` with empty `known_codes` is `RULE_CONFIG_INVALID`,
 * not a rule that passes everything.
 */
export function validateParams(
  exception_type: ExceptionType,
  params: Record<string, unknown>,
): ValidateParamsResult {
  const validate = VALIDATORS[exception_type];
  // Clone so defaults are applied to a fresh object (never mutate the caller's).
  const candidate: Record<string, unknown> = JSON.parse(JSON.stringify(params ?? {}));
  const valid = validate(candidate);
  if (!valid) {
    const detail = (validate.errors ?? [])
      .map((e) => `${e.instancePath || '(root)'} ${e.message ?? ''}`.trim())
      .join('; ');
    return { ok: false, detail: detail || 'params failed schema validation' };
  }

  // Cross-field check for HTS known-codes.
  if (exception_type === 'INVALID_HTS_CODE') {
    const checkKnown = candidate.check_known_codes === true;
    const knownCodes = (candidate.known_codes as unknown[]) ?? [];
    if (checkKnown && knownCodes.length === 0) {
      return {
        ok: false,
        detail: 'known_codes must be non-empty when check_known_codes is enabled',
      };
    }
  }

  return { ok: true, params: candidate };
}
