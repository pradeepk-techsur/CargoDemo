/**
 * Rule-supplied dot-path resolution (T-02-01).
 *
 * Rule params carry dot-paths (`manufacturer.address.country`,
 * `documents.CERTIFICATE_OF_ORIGIN.stated_country`). Those cross a trust
 * boundary — rule config is editable data — so they are resolved through an
 * EXPLICIT allow-list of path shapes, never a generic recursive property walk.
 * An unrecognized path is a rule-definition error, not a crash and not a silent
 * pass. Paths containing `__proto__`/`constructor`/`prototype` are rejected.
 */

import type { EntrySnapshot } from './types.js';
import { normalizeDocumentType } from './normalize.js';

export type FieldPathResult =
  | { ok: true; value: string | null }
  | { ok: false; code: 'RULE_PARAM_PATH_UNKNOWN' };

const FORBIDDEN = /(^|\.)(__proto__|constructor|prototype)(\.|$)/;

const DOCUMENTS_PREFIX = 'documents.';
const DOCUMENTS_SUFFIX = '.stated_country';

/**
 * Resolve `path` against `entry` through the allow-list below. Returns the
 * resolved value (which may legitimately be `null`) or a
 * `RULE_PARAM_PATH_UNKNOWN` error for any unrecognized shape.
 *
 * | Path                                    | Resolves to |
 * |-----------------------------------------|-------------|
 * | country_of_origin                       | entry.country_of_origin |
 * | manufacturer.address.country            | entry.manufacturer_address_country |
 * | product_description                     | entry.product_description |
 * | hts_code                                | entry.hts_code |
 * | documents.<TYPE>.stated_country         | stated_country of first non-superseded RECEIVED doc of <TYPE>; null if absent |
 */
export function resolveFieldPath(entry: EntrySnapshot, path: string): FieldPathResult {
  if (typeof path !== 'string' || path.length === 0 || FORBIDDEN.test(path)) {
    return { ok: false, code: 'RULE_PARAM_PATH_UNKNOWN' };
  }

  switch (path) {
    case 'country_of_origin':
      return { ok: true, value: entry.country_of_origin };
    case 'manufacturer.address.country':
      return { ok: true, value: entry.manufacturer_address_country };
    case 'product_description':
      return { ok: true, value: entry.product_description };
    case 'hts_code':
      return { ok: true, value: entry.hts_code };
    default:
      break;
  }

  if (path.startsWith(DOCUMENTS_PREFIX) && path.endsWith(DOCUMENTS_SUFFIX)) {
    const type = path.slice(DOCUMENTS_PREFIX.length, path.length - DOCUMENTS_SUFFIX.length);
    if (type.length === 0 || type.includes('.')) {
      return { ok: false, code: 'RULE_PARAM_PATH_UNKNOWN' };
    }
    const wanted = normalizeDocumentType(type);
    const doc = entry.documents.find(
      (d) =>
        d.superseded !== 1 &&
        d.status === 'RECEIVED' &&
        normalizeDocumentType(d.document_type) === wanted,
    );
    return { ok: true, value: doc ? doc.stated_country : null };
  }

  return { ok: false, code: 'RULE_PARAM_PATH_UNKNOWN' };
}
