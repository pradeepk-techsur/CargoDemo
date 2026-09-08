import { describe, expect, it } from 'vitest';

import type { EntrySnapshot, RuleDefinition } from '../../src/domain/rules/types.js';
import { evaluateHtsCode } from '../../src/domain/rules/evaluators/htsCode.js';
import { evaluateCountryOfOrigin } from '../../src/domain/rules/evaluators/countryOfOrigin.js';
import { evaluateMissingDocument } from '../../src/domain/rules/evaluators/missingDocument.js';
import { validateParams } from '../../src/domain/rules/schemas.js';

// --- helpers -----------------------------------------------------------------

function entry(overrides: Partial<EntrySnapshot> = {}): EntrySnapshot {
  return {
    id: 'ent-0007',
    shipment_id: 'SHP-2026-0007',
    product_description: 'Monocrystalline solar panels',
    hts_code: '8541.40',
    country_of_origin: 'Malaysia',
    manufacturer_address_country: 'China',
    shipment_value_cents: 8500000,
    documents: [
      { document_type: 'COMMERCIAL_INVOICE', status: 'RECEIVED', filename: 'i.pdf', storage_path: null, superseded: 0, stated_country: null },
      { document_type: 'PACKING_LIST', status: 'RECEIVED', filename: 'p.pdf', storage_path: null, superseded: 0, stated_country: null },
      { document_type: 'BILL_OF_LADING', status: 'RECEIVED', filename: 'b.pdf', storage_path: null, superseded: 0, stated_country: null },
      { document_type: 'CERTIFICATE_OF_ORIGIN', status: 'NOT_RECEIVED', filename: null, storage_path: null, superseded: 0, stated_country: null },
    ],
    ...overrides,
  };
}

function htsRule(params: Record<string, unknown> = {}): RuleDefinition {
  const validated = validateParams('INVALID_HTS_CODE', params);
  if (!validated.ok) throw new Error(validated.detail);
  return {
    id: 'rule-hts-completeness',
    name: 'HTS',
    exception_type: 'INVALID_HTS_CODE',
    description: 'x',
    policy_reference: '19 CFR 152.11',
    severity: 'HIGH',
    priority_mapping: null,
    conditions: {},
    params: validated.params,
    enabled: true,
    version: 1,
  };
}

function originRule(params: Record<string, unknown> = {}): RuleDefinition {
  const validated = validateParams('CONFLICTING_COUNTRY_OF_ORIGIN', params);
  if (!validated.ok) throw new Error(validated.detail);
  return {
    id: 'rule-origin-manufacturer',
    name: 'Origin',
    exception_type: 'CONFLICTING_COUNTRY_OF_ORIGIN',
    description: 'x',
    policy_reference: '19 CFR 134.1',
    severity: 'CRITICAL',
    priority_mapping: null,
    conditions: {},
    params: validated.params,
    enabled: true,
    version: 1,
  };
}

function docRule(params: Record<string, unknown>): RuleDefinition {
  const validated = validateParams('MISSING_REQUIRED_DOCUMENT', params);
  if (!validated.ok) throw new Error(validated.detail);
  return {
    id: 'rule-doc-baseline',
    name: 'Docs',
    exception_type: 'MISSING_REQUIRED_DOCUMENT',
    description: 'x',
    policy_reference: '19 CFR 141.81',
    severity: 'MEDIUM',
    priority_mapping: null,
    conditions: {},
    params: validated.params,
    enabled: true,
    version: 1,
  };
}

// --- HTS ---------------------------------------------------------------------

describe('evaluateHtsCode', () => {
  const seeded = {
    expected_digit_count: 10,
    min_digit_count: 6,
    allowed_separators: ['.', '-', ' '],
    allow_partial: false,
    treat_missing_as_exception: true,
    check_known_codes: false,
    known_code_prefix_length: 6,
    known_codes: [],
    placeholder_characters: ['X', 'x', '*', '?', '#'],
  };

  it('flags the canonical 8541.40 as INCOMPLETE_DIGITS with expected/observed', () => {
    const f = evaluateHtsCode(entry(), htsRule(seeded));
    expect(f).not.toBeNull();
    expect(f!.sub_reason).toBe('INCOMPLETE_DIGITS');
    const observed = f!.evidence.find((e) => e.kind === 'OBSERVED')!;
    expect(observed.raw_value).toBe('8541.40');
    expect(observed.normalized_value).toBe('854140');
    expect(observed.expected).toBe('10 digits');
    expect(observed.observed).toBe('6 digits');
    expect(f!.evidence.some((e) => e.kind === 'MISSING')).toBe(true);
    expect(f!.missing_information[0]!.observed_digits).toBe(6);
    expect(f!.missing_information[0]!.missing_digits).toBe(4);
  });

  it('passes a complete 10-digit code', () => {
    const f = evaluateHtsCode(entry({ hts_code: '8541.40.10.00' }), htsRule(seeded));
    expect(f).toBeNull();
  });

  it('flags placeholder characters as PLACEHOLDER', () => {
    const f = evaluateHtsCode(entry({ hts_code: '8541.40.XX' }), htsRule(seeded));
    expect(f!.sub_reason).toBe('PLACEHOLDER');
  });

  it('flags non-numeric characters as NON_NUMERIC', () => {
    const f = evaluateHtsCode(entry({ hts_code: '85A1.40' }), htsRule(seeded));
    expect(f!.sub_reason).toBe('NON_NUMERIC');
  });

  it('flags a null code as MISSING, or nothing when treat_missing_as_exception is false', () => {
    expect(evaluateHtsCode(entry({ hts_code: null }), htsRule(seeded))!.sub_reason).toBe('MISSING');
    const lenient = evaluateHtsCode(
      entry({ hts_code: null }),
      htsRule({ ...seeded, treat_missing_as_exception: false }),
    );
    expect(lenient).toBeNull();
  });

  it('configurability proof: allow_partial + min_digit_count turns the finding off with no code change', () => {
    const strict = evaluateHtsCode(entry(), htsRule(seeded));
    expect(strict!.sub_reason).toBe('INCOMPLETE_DIGITS');
    const lenient = evaluateHtsCode(
      entry(),
      htsRule({ ...seeded, allow_partial: true, min_digit_count: 6 }),
    );
    expect(lenient).toBeNull();
  });
});

// --- Origin ------------------------------------------------------------------

describe('evaluateCountryOfOrigin', () => {
  const seeded = {
    declared_field: 'country_of_origin',
    comparison_fields: ['manufacturer.address.country'],
    treat_missing_declared_as_conflict: true,
    treat_missing_comparison_as_conflict: false,
    allowed_pairs: [],
    case_sensitive: false,
  };

  it('flags Malaysia vs China as ORIGIN_MISMATCH with two normalized evidence rows', () => {
    const f = evaluateCountryOfOrigin(entry(), originRule(seeded));
    expect(f!.sub_reason).toBe('ORIGIN_MISMATCH');
    const observed = f!.evidence.find((e) => e.kind === 'OBSERVED')!;
    const comparison = f!.evidence.find((e) => e.kind === 'COMPARISON')!;
    expect(observed.field_path).toBe('country_of_origin');
    expect(observed.raw_value).toBe('Malaysia');
    expect(observed.normalized_value).toBe('MY');
    expect(comparison.field_path).toBe('manufacturer.address.country');
    expect(comparison.comparison_raw_value).toBe('China');
    expect(comparison.comparison_normalized_value).toBe('CN');
    expect(f!.assertion).toBe(
      'Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)',
    );
  });

  it('does not flag when declared normalizes to the same country as comparison', () => {
    const f = evaluateCountryOfOrigin(
      entry({ country_of_origin: 'Malaysia', manufacturer_address_country: 'MYS' }),
      originRule(seeded),
    );
    expect(f).toBeNull();
  });

  it('tolerates a pair listed in allowed_pairs', () => {
    const f = evaluateCountryOfOrigin(
      entry(),
      originRule({ ...seeded, allowed_pairs: [{ declared: 'MY', comparison: 'CN' }] }),
    );
    expect(f).toBeNull();
  });

  it('does not flag a null comparison field by default', () => {
    const f = evaluateCountryOfOrigin(
      entry({ manufacturer_address_country: null }),
      originRule(seeded),
    );
    expect(f).toBeNull();
  });
});

// --- Documents ---------------------------------------------------------------

describe('evaluateMissingDocument', () => {
  const baseline = {
    required_document_types: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING'],
    match_mode: 'ALL',
    accept_statuses: ['RECEIVED'],
    require_file_present: true,
    ignore_superseded: true,
  };

  it('does not flag when all three baseline documents are received', () => {
    const f = evaluateMissingDocument(entry(), docRule(baseline));
    expect(f).toBeNull();
  });

  it('flags one missing document with one missing_information item', () => {
    const e = entry({
      documents: [
        { document_type: 'COMMERCIAL_INVOICE', status: 'RECEIVED', filename: 'i.pdf', storage_path: null, superseded: 0, stated_country: null },
        { document_type: 'BILL_OF_LADING', status: 'RECEIVED', filename: 'b.pdf', storage_path: null, superseded: 0, stated_country: null },
        { document_type: 'PACKING_LIST', status: 'NOT_RECEIVED', filename: null, storage_path: null, superseded: 0, stated_country: null },
      ],
    });
    const f = evaluateMissingDocument(e, docRule(baseline));
    expect(f!.missing_information).toHaveLength(1);
    expect(f!.missing_information[0]!.document_type).toBe('PACKING_LIST');
    expect(f!.sub_reason).toBe('DOCUMENT_NOT_RECEIVED');
  });

  it('flags two missing documents as ONE finding with two items', () => {
    const e = entry({
      documents: [
        { document_type: 'COMMERCIAL_INVOICE', status: 'RECEIVED', filename: 'i.pdf', storage_path: null, superseded: 0, stated_country: null },
      ],
    });
    const f = evaluateMissingDocument(e, docRule(baseline));
    expect(f!.missing_information).toHaveLength(2);
    // one finding, not two
    expect(f!.exception_type).toBe('MISSING_REQUIRED_DOCUMENT');
  });

  it('flags a RECEIVED row with no file under require_file_present as DOCUMENT_FILE_MISSING', () => {
    const e = entry({
      documents: [
        { document_type: 'COMMERCIAL_INVOICE', status: 'RECEIVED', filename: 'i.pdf', storage_path: null, superseded: 0, stated_country: null },
        { document_type: 'PACKING_LIST', status: 'RECEIVED', filename: 'p.pdf', storage_path: null, superseded: 0, stated_country: null },
        { document_type: 'BILL_OF_LADING', status: 'RECEIVED', filename: null, storage_path: null, superseded: 0, stated_country: null },
      ],
    });
    const f = evaluateMissingDocument(e, docRule(baseline));
    expect(f!.sub_reason).toBe('DOCUMENT_FILE_MISSING');
  });

  it('ANY_ONE_OF is satisfied by one of two acceptable types', () => {
    const e = entry({
      documents: [
        { document_type: 'FORM_A', status: 'RECEIVED', filename: 'a.pdf', storage_path: null, superseded: 0, stated_country: null },
      ],
    });
    const rule = docRule({
      required_document_types: ['FORM_A', 'FORM_B'],
      match_mode: 'ANY_ONE_OF',
      accept_statuses: ['RECEIVED'],
      require_file_present: true,
      ignore_superseded: true,
    });
    expect(evaluateMissingDocument(e, rule)).toBeNull();
  });
});
