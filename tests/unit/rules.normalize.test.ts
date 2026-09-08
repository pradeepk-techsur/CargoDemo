import { describe, expect, it } from 'vitest';

import {
  normalizeCountry,
  normalizeHts,
  normalizeDocumentType,
} from '../../src/domain/rules/normalize.js';

describe('normalizeCountry', () => {
  it('maps Malaysia, MY and MYS to MY', () => {
    expect(normalizeCountry('Malaysia')).toBe('MY');
    expect(normalizeCountry('MY')).toBe('MY');
    expect(normalizeCountry('MYS')).toBe('MY');
  });

  it('maps China, PRC and CHN to CN', () => {
    expect(normalizeCountry('China')).toBe('CN');
    expect(normalizeCountry('PRC')).toBe('CN');
    expect(normalizeCountry('CHN')).toBe('CN');
    expect(normalizeCountry("People's Republic of China")).toBe('CN');
  });

  it('keeps Hong Kong distinct from China', () => {
    expect(normalizeCountry('Hong Kong')).toBe('HK');
    expect(normalizeCountry('HK')).toBe('HK');
    expect(normalizeCountry('Hong Kong')).not.toBe('CN');
  });

  it('keeps Taiwan distinct from China', () => {
    expect(normalizeCountry('Taiwan')).toBe('TW');
    expect(normalizeCountry('TW')).toBe('TW');
  });

  it('maps Vietnam and Viet Nam to VN', () => {
    expect(normalizeCountry('Vietnam')).toBe('VN');
    expect(normalizeCountry('Viet Nam')).toBe('VN');
    expect(normalizeCountry('VNM')).toBe('VN');
  });

  it('handles trailing period, leading THE, and internal whitespace', () => {
    expect(normalizeCountry('  the   united   states.  ')).toBe('US');
    expect(normalizeCountry('U.S.A')).toBe(null); // periods not in alias key
    expect(normalizeCountry('USA')).toBe('US');
  });

  it('returns null for unknown and empty inputs', () => {
    expect(normalizeCountry('Atlantis')).toBe(null);
    expect(normalizeCountry('')).toBe(null);
    expect(normalizeCountry(null)).toBe(null);
    expect(normalizeCountry(undefined)).toBe(null);
  });
});

describe('normalizeHts', () => {
  it('strips only the param-supplied separators', () => {
    expect(normalizeHts('8541.40', ['.', '-', ' '])).toBe('854140');
    expect(normalizeHts('8507-60-0010', ['.', '-', ' '])).toBe('8507600010');
    // a separator not in the set is retained
    expect(normalizeHts('8541.40', ['-'])).toBe('8541.40');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeHts(null, ['.'])).toBe('');
    expect(normalizeHts(undefined, ['.'])).toBe('');
  });
});

describe('normalizeDocumentType', () => {
  it('produces upper snake case', () => {
    expect(normalizeDocumentType('Certificate of Origin')).toBe('CERTIFICATE_OF_ORIGIN');
    expect(normalizeDocumentType('commercial-invoice')).toBe('COMMERCIAL_INVOICE');
    expect(normalizeDocumentType('BILL_OF_LADING')).toBe('BILL_OF_LADING');
  });
});
