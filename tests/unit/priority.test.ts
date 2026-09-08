import { describe, expect, it } from 'vitest';

import { derivePriority } from '../../src/domain/priority.js';

const NOW = '2026-09-01T08:00:00.000Z';

describe('derivePriority', () => {
  it('returns LOW with a single BASE_SEVERITY entry when there are no open exceptions', () => {
    const { priority, basis } = derivePriority({
      severities: [],
      shipment_value_cents: 100000,
      open_exception_count: 0,
      oldest_opened_at: null,
      now: NOW,
    });
    expect(priority).toBe('LOW');
    expect(basis).toHaveLength(1);
    expect(basis[0]!.factor).toBe('BASE_SEVERITY');
  });

  it('uses the severity rank not the string for the base', () => {
    // string max of ['MEDIUM','CRITICAL'] would be 'MEDIUM'; rank gives CRITICAL.
    const { priority } = derivePriority({
      severities: ['MEDIUM', 'CRITICAL'],
      shipment_value_cents: 0,
      open_exception_count: 1,
      oldest_opened_at: NOW,
      now: NOW,
    });
    expect(priority).toBe('CRITICAL');
  });

  it('escalates and clamps a HIGH base at $85,000 with 3 exceptions to CRITICAL with all factors', () => {
    const { priority, basis } = derivePriority({
      severities: ['HIGH', 'HIGH', 'MEDIUM'],
      shipment_value_cents: 8500000,
      open_exception_count: 3,
      oldest_opened_at: NOW,
      now: NOW,
    });
    expect(priority).toBe('CRITICAL');
    const factors = basis.map((b) => b.factor);
    expect(factors).toContain('BASE_SEVERITY');
    expect(factors).toContain('VALUE_ESCALATION');
    expect(factors).toContain('MULTIPLICITY_ESCALATION');
  });

  it('stays MEDIUM for a MEDIUM base, 1 exception, under $50k, fresh opened_at', () => {
    const { priority, basis } = derivePriority({
      severities: ['MEDIUM'],
      shipment_value_cents: 1800000,
      open_exception_count: 1,
      oldest_opened_at: NOW,
      now: NOW,
    });
    expect(priority).toBe('MEDIUM');
    expect(basis).toHaveLength(1);
    expect(basis[0]!.factor).toBe('BASE_SEVERITY');
  });

  it('adds AGE_ESCALATION for an 8-day-old exception', () => {
    const opened = '2026-08-24T08:00:00.000Z'; // 8 days before NOW
    const { priority, basis } = derivePriority({
      severities: ['LOW'],
      shipment_value_cents: 100000,
      open_exception_count: 1,
      oldest_opened_at: opened,
      now: NOW,
    });
    expect(basis.map((b) => b.factor)).toContain('AGE_ESCALATION');
    expect(priority).toBe('MEDIUM');
  });

  it('applies priority_mapping to the base by taking the mapped severity as input', () => {
    // The caller applies priority_mapping before calling; here we prove the base
    // is driven purely by the supplied severities.
    const low = derivePriority({
      severities: ['LOW'],
      shipment_value_cents: 0,
      open_exception_count: 1,
      oldest_opened_at: NOW,
      now: NOW,
    });
    const high = derivePriority({
      severities: ['HIGH'],
      shipment_value_cents: 0,
      open_exception_count: 1,
      oldest_opened_at: NOW,
      now: NOW,
    });
    expect(low.priority).toBe('LOW');
    expect(high.priority).toBe('HIGH');
  });

  it('records a CLAMP when an escalation is absorbed by the CRITICAL ceiling', () => {
    const { priority, basis } = derivePriority({
      severities: ['CRITICAL'],
      shipment_value_cents: 8500000, // triggers value escalation on an already-CRITICAL base
      open_exception_count: 1,
      oldest_opened_at: NOW,
      now: NOW,
    });
    expect(priority).toBe('CRITICAL');
    expect(basis.map((b) => b.factor)).toContain('CLAMP');
  });
});
