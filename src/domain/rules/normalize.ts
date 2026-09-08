/**
 * Deterministic, table-driven canonicalization (F04 §5 "Country normalization").
 *
 * PURE. The country alias table is application data — deliberately NOT per-rule
 * configuration and NOT exposed to F15 — so all three evaluators normalize
 * identically. Hong Kong and Taiwan are kept distinct from China by design.
 */

/**
 * Alias table: every key (ISO alpha-2, ISO alpha-3, official name, curated
 * synonym), pre-canonicalized (uppercased, trailing period and leading "THE "
 * stripped, internal whitespace collapsed), maps to an ISO alpha-2 code.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  // Malaysia
  MALAYSIA: 'MY',
  MY: 'MY',
  MYS: 'MY',
  // China (PRC) — Hong Kong and Taiwan are separate by design
  CHINA: 'CN',
  CN: 'CN',
  CHN: 'CN',
  "PEOPLE'S REPUBLIC OF CHINA": 'CN',
  'PEOPLES REPUBLIC OF CHINA': 'CN',
  PRC: 'CN',
  // Hong Kong (distinct from CN)
  'HONG KONG': 'HK',
  HK: 'HK',
  HKG: 'HK',
  // Taiwan
  TAIWAN: 'TW',
  TW: 'TW',
  TWN: 'TW',
  // Vietnam
  VIETNAM: 'VN',
  'VIET NAM': 'VN',
  VN: 'VN',
  VNM: 'VN',
  // United States
  US: 'US',
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  // Germany
  GERMANY: 'DE',
  DE: 'DE',
  DEU: 'DE',
  // Mexico
  MEXICO: 'MX',
  MX: 'MX',
  MEX: 'MX',
  // South Korea
  'SOUTH KOREA': 'KR',
  'KOREA, REPUBLIC OF': 'KR',
  'REPUBLIC OF KOREA': 'KR',
  KOREA: 'KR',
  KR: 'KR',
  KOR: 'KR',
  // India
  INDIA: 'IN',
  IN: 'IN',
  IND: 'IN',
  // Thailand
  THAILAND: 'TH',
  TH: 'TH',
  THA: 'TH',
  // Singapore
  SINGAPORE: 'SG',
  SG: 'SG',
  SGP: 'SG',
  // Japan
  JAPAN: 'JP',
  JP: 'JP',
  JPN: 'JP',
  // Italy
  ITALY: 'IT',
  IT: 'IT',
  ITA: 'IT',
  // Turkey
  TURKEY: 'TR',
  'TURKIYE': 'TR',
  TR: 'TR',
  TUR: 'TR',
  // Spain (SHP-2026-0003 manufacturer country)
  SPAIN: 'ES',
  ES: 'ES',
  ESP: 'ES',
  // Poland (SHP-2026-0011)
  POLAND: 'PL',
  PL: 'PL',
  POL: 'PL',
  // Ecuador (SHP-2026-0009)
  ECUADOR: 'EC',
  EC: 'EC',
  ECU: 'EC',
  // Saudi Arabia (SHP-2026-0010)
  'SAUDI ARABIA': 'SA',
  SA: 'SA',
  SAU: 'SA',
  // Switzerland (SHP-2026-0012)
  SWITZERLAND: 'CH',
  CH: 'CH',
  CHE: 'CH',
};

/**
 * Canonicalize a raw country string to ISO alpha-2, or `null` when unknown.
 * Trim, collapse internal whitespace, uppercase, strip a trailing period and a
 * leading "THE ", then look up in the alias table.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/\s+/g, ' ').toUpperCase();
  if (s.length === 0) return null;
  // strip trailing period(s)
  s = s.replace(/\.+$/, '');
  // strip leading article
  if (s.startsWith('THE ')) s = s.slice(4);
  s = s.trim();
  if (s.length === 0) return null;
  return COUNTRY_ALIASES[s] ?? null;
}

/**
 * Strip every character present in `allowedSeparators`, then trim. Separators
 * come from the rule params — never hardcoded here.
 */
export function normalizeHts(
  raw: string | null | undefined,
  allowedSeparators: string[],
): string {
  if (raw == null) return '';
  let out = '';
  const sepSet = new Set(allowedSeparators);
  for (const ch of raw) {
    if (!sepSet.has(ch)) out += ch;
  }
  return out.trim();
}

/** Upper snake case: uppercase, non-alphanumeric runs → single underscore. */
export function normalizeDocumentType(raw: string | null | undefined): string {
  if (raw == null) return '';
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
