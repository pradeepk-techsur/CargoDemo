import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { EntrySnapshot, RuleDefinition } from '../../src/domain/rules/types.js';
import { evaluateEntry, ruleSetFingerprint, SEVERITY_RANK } from '../../src/domain/rules/engine.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures');

interface RuleFixture {
  id: string;
  name: string;
  exception_type: string;
  description: string;
  policy_reference: string;
  severity: string;
  enabled: 0 | 1;
  conditions: Record<string, unknown>;
  params: Record<string, unknown>;
}

function loadRules(): RuleDefinition[] {
  const raw = JSON.parse(readFileSync(join(FIXTURES, 'rules.seed.json'), 'utf8')) as RuleFixture[];
  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    exception_type: r.exception_type as RuleDefinition['exception_type'],
    description: r.description,
    policy_reference: r.policy_reference,
    severity: r.severity as RuleDefinition['severity'],
    priority_mapping: null,
    conditions: r.conditions ?? {},
    params: r.params ?? {},
    enabled: r.enabled === 1,
    version: 1,
  }));
}

const canonical: EntrySnapshot = {
  id: 'ent-0007',
  shipment_id: 'SHP-2026-0007',
  product_description: 'Monocrystalline solar panels, 450W photovoltaic modules',
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
};

describe('evaluateEntry — canonical scenario', () => {
  it('produces exactly three findings in the binding order', () => {
    const result = evaluateEntry(canonical, loadRules());
    expect(result.findings).toHaveLength(3);
    expect(result.findings.map((f) => f.exception_type)).toEqual([
      'CONFLICTING_COUNTRY_OF_ORIGIN',
      'INVALID_HTS_CODE',
      'MISSING_REQUIRED_DOCUMENT',
    ]);
    expect(result.findings.map((f) => f.rule_id)).toEqual([
      'rule-origin-manufacturer',
      'rule-hts-completeness',
      'rule-doc-highvalue-coo',
    ]);
    expect(result.invalid_rules).toHaveLength(0);
  });

  it('never fires disabled rules; enabling the solar cert rule adds a fourth finding', () => {
    const rules = loadRules();
    const three = evaluateEntry(canonical, rules);
    expect(three.findings).toHaveLength(3);

    const enabledSolar = rules.map((r) =>
      r.id === 'rule-doc-solar-cert' ? { ...r, enabled: true } : r,
    );
    const four = evaluateEntry(canonical, enabledSolar);
    expect(four.findings).toHaveLength(4);
  });
});

describe('evaluateEntry — invalid & skipped rules', () => {
  it('records a typo\'d param key in invalid_rules[] while other rules still fire', () => {
    const rules = loadRules().map((r) =>
      r.id === 'rule-hts-completeness'
        ? { ...r, params: { ...r.params, expected_digitz: 10 } }
        : r,
    );
    const result = evaluateEntry(canonical, rules);
    expect(result.invalid_rules.some((i) => i.rule_id === 'rule-hts-completeness')).toBe(true);
    expect(result.invalid_rules[0]!.code).toBe('RULE_CONFIG_INVALID');
    // origin + doc still fire
    expect(result.findings.map((f) => f.exception_type)).toEqual([
      'CONFLICTING_COUNTRY_OF_ORIGIN',
      'MISSING_REQUIRED_DOCUMENT',
    ]);
  });

  it('records a rule whose condition excludes the entry in skipped_rules[]', () => {
    // A high-value COO rule against a low-value shipment is skipped.
    const lowValue: EntrySnapshot = { ...canonical, shipment_value_cents: 100000 };
    const result = evaluateEntry(lowValue, loadRules());
    const skipped = result.skipped_rules.find((s) => s.rule_id === 'rule-doc-highvalue-coo');
    expect(skipped).toBeDefined();
    expect(skipped!.condition).toBe('min_shipment_value_usd');
    expect(skipped!.result).toBe('NOT_APPLICABLE');
  });
});

describe('evaluateEntry — determinism & fingerprint', () => {
  it('produces byte-identical findings across two runs', () => {
    const a = evaluateEntry(canonical, loadRules());
    const b = evaluateEntry(canonical, loadRules());
    expect(JSON.stringify(b.findings)).toBe(JSON.stringify(a.findings));
  });

  it('fingerprint changes when a rule enabled or version changes, stable otherwise', () => {
    const rules = loadRules();
    const base = ruleSetFingerprint(rules);
    expect(ruleSetFingerprint(loadRules())).toBe(base);

    const toggled = rules.map((r) =>
      r.id === 'rule-doc-solar-cert' ? { ...r, enabled: true } : r,
    );
    expect(ruleSetFingerprint(toggled)).not.toBe(base);

    const bumped = rules.map((r) =>
      r.id === 'rule-hts-completeness' ? { ...r, version: 2 } : r,
    );
    expect(ruleSetFingerprint(bumped)).not.toBe(base);
  });
});

describe('evaluateEntry — severity ordering', () => {
  it('orders CRITICAL before MEDIUM within the same exception_type (rank, not string)', () => {
    // string sort would give MEDIUM before CRITICAL; rank must not.
    expect(SEVERITY_RANK.CRITICAL).toBeGreaterThan(SEVERITY_RANK.MEDIUM);

    const critical: RuleDefinition = {
      id: 'rule-origin-b-critical',
      name: 'crit',
      exception_type: 'CONFLICTING_COUNTRY_OF_ORIGIN',
      description: 'x',
      policy_reference: 'p',
      severity: 'CRITICAL',
      priority_mapping: null,
      conditions: {},
      params: { comparison_fields: ['manufacturer.address.country'] },
      enabled: true,
      version: 1,
    };
    const medium: RuleDefinition = {
      ...critical,
      id: 'rule-origin-a-medium',
      severity: 'MEDIUM',
    };
    const result = evaluateEntry(canonical, [medium, critical]);
    // both fire; CRITICAL must be first despite 'a' < 'b' rule_id on the medium.
    expect(result.findings[0]!.severity).toBe('CRITICAL');
    expect(result.findings[1]!.severity).toBe('MEDIUM');
  });
});
