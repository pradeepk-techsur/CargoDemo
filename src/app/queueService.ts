/**
 * The exception-queue read (F17). One indexed read over `cases` joined to
 * `cargo_entries`, plus an aggregate over OPEN `exceptions`.
 *
 * Priority ordering is built from wave 2's `SEVERITY_RANK` as a generated
 * `CASE priority WHEN … THEN <rank> END` expression, so the ranking exists once
 * in the codebase — `ORDER BY priority DESC` as raw text yields the wrong order
 * (MEDIUM > LOW > HIGH > CRITICAL) and is a defect. The only dynamic SQL fragment
 * is the ORDER BY, and it is assembled from a closed allow-list, never from the
 * raw query string.
 */

import type { Db } from '../infra/db/connection.js';
import { SEVERITY_RANK } from '../domain/rules/engine.js';
import { errors } from '../shared/api/errors.js';
import type {
  CaseStatus,
  ExceptionType,
  Priority,
  QueueResponse,
  QueueRow,
  UserRef,
} from '../shared/api/types.js';
import type { CaseRow, CargoEntryRow, UserRow } from '../shared/types/db.js';
import type { PriorityBasisEntry } from '../shared/types/detection.js';
import { centsToUsdString } from './money.js';

const CASE_STATUS_VALUES = new Set<string>([
  'NEW',
  'IN_REVIEW',
  'AWAITING_INFORMATION',
  'ON_HOLD',
  'ESCALATED',
  'PENDING_APPROVAL',
  'CLEARED',
]);
const EXCEPTION_TYPE_VALUES = new Set<string>([
  'MISSING_REQUIRED_DOCUMENT',
  'INVALID_HTS_CODE',
  'CONFLICTING_COUNTRY_OF_ORIGIN',
]);
const PRIORITY_VALUES = new Set<string>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const SORT_FIELDS = new Set(['priority', 'age', 'updated_at', 'shipment_id', 'status']);

// The exception_summary label map (server-rendered, deterministic).
const EXCEPTION_TYPE_LABEL: Record<ExceptionType, string> = {
  MISSING_REQUIRED_DOCUMENT: 'Missing documents',
  INVALID_HTS_CODE: 'HTS code issue',
  CONFLICTING_COUNTRY_OF_ORIGIN: 'Origin conflict',
};

/** A parsed, validated queue query. */
export interface ParsedQueueQuery {
  status: CaseStatus[];
  exception_type: ExceptionType[];
  priority: Priority[];
  include_clean: boolean;
  include_cleared: boolean;
  sort: Array<{ field: string; dir: 'asc' | 'desc' }>;
  sortRaw: string;
  page: number;
  page_size: number;
}

function asArray(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function validateEnum(
  values: string[],
  allowed: Set<string>,
  param: string,
): string[] {
  for (const value of values) {
    if (!allowed.has(value)) {
      throw errors.INVALID_QUERY_PARAM(`Query parameter ${param} has invalid value '${value}'`, {
        details: { parameter: param, value },
      });
    }
  }
  return values;
}

function parseBool(v: unknown, param: string, fallback: boolean): boolean {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v);
  if (s === 'true') return true;
  if (s === 'false') return false;
  throw errors.INVALID_QUERY_PARAM(`Query parameter ${param} must be 'true' or 'false', got '${s}'`);
}

function parseInteger(v: unknown, param: string, fallback: number, min: number, max: number): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw errors.INVALID_QUERY_PARAM(
      `Query parameter ${param} must be an integer between ${min} and ${max}, got '${String(v)}'`,
    );
  }
  return n;
}

function parseSort(raw: string): ParsedQueueQuery['sort'] {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const out: ParsedQueueQuery['sort'] = [];
  for (const part of parts) {
    const [field, dirRaw] = part.split(':');
    const dir = (dirRaw ?? 'asc').toLowerCase();
    if (!field || !SORT_FIELDS.has(field)) {
      throw errors.INVALID_QUERY_PARAM(`Unknown sort field '${field ?? ''}'`, {
        details: { allowed: [...SORT_FIELDS] },
      });
    }
    if (dir !== 'asc' && dir !== 'desc') {
      throw errors.INVALID_QUERY_PARAM(`Sort direction must be asc or desc, got '${dir}'`);
    }
    out.push({ field, dir });
  }
  return out;
}

const ALLOWED_QUERY_KEYS = new Set([
  'status',
  'exception_type',
  'priority',
  'include_clean',
  'include_cleared',
  'sort',
  'page',
  'page_size',
]);

export function parseQueueQuery(query: Record<string, unknown>): ParsedQueueQuery {
  // Reject any unknown query parameter — silent absorption is how a filter
  // quietly stops filtering. Fastify's querystring schema does not enforce this
  // on its own, so the allow-list check lives here.
  for (const key of Object.keys(query)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      throw errors.INVALID_QUERY_PARAM(`Unknown query parameter '${key}'`, {
        details: { parameter: key },
      });
    }
  }

  const status = validateEnum(asArray(query.status), CASE_STATUS_VALUES, 'status') as CaseStatus[];
  const exception_type = validateEnum(
    asArray(query.exception_type),
    EXCEPTION_TYPE_VALUES,
    'exception_type',
  ) as ExceptionType[];
  const priority = validateEnum(asArray(query.priority), PRIORITY_VALUES, 'priority') as Priority[];

  const sortRaw =
    typeof query.sort === 'string' && query.sort.length > 0 ? query.sort : 'priority:desc,age:desc';

  return {
    status,
    exception_type,
    priority,
    include_clean: parseBool(query.include_clean, 'include_clean', false),
    include_cleared: parseBool(query.include_cleared, 'include_cleared', false),
    sort: parseSort(sortRaw),
    sortRaw,
    page: parseInteger(query.page, 'page', 1, 1, Number.MAX_SAFE_INTEGER),
    page_size: parseInteger(query.page_size, 'page_size', 25, 1, 100),
  };
}

// Generated once from SEVERITY_RANK so there is exactly one ranking in the code.
const PRIORITY_RANK_SQL = `CASE cs.priority ${Object.entries(SEVERITY_RANK)
  .map(([sev, rank]) => `WHEN '${sev}' THEN ${rank}`)
  .join(' ')} ELSE -1 END`;

interface JoinedRow extends CaseRow {
  importer_name: string;
  carrier_name: string;
  shipment_value_cents: number;
  oldest_exception_opened_at: string | null;
}

function buildOrderBy(sort: ParsedQueueQuery['sort']): string {
  const clauses: string[] = [];
  for (const { field, dir } of sort) {
    const d = dir.toUpperCase();
    switch (field) {
      case 'priority':
        clauses.push(`${PRIORITY_RANK_SQL} ${d}`);
        break;
      case 'age':
        // Older ranks higher for desc: oldest_exception_opened_at ASC when desc.
        clauses.push(`oldest_exception_opened_at ${d === 'DESC' ? 'ASC' : 'DESC'}`);
        break;
      case 'updated_at':
        clauses.push(`cs.updated_at ${d}`);
        break;
      case 'shipment_id':
        clauses.push(`cs.shipment_id ${d}`);
        break;
      case 'status':
        clauses.push(`cs.status ${d}`);
        break;
      default:
        break;
    }
  }
  // Stable tiebreaker.
  clauses.push('cs.shipment_id ASC');
  return clauses.join(', ');
}

function parseBasis(json: string): PriorityBasisEntry[] {
  try {
    const parsed = JSON.parse(json) as PriorityBasisEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ageDays(oldest: string | null, now: string): number {
  if (!oldest) return 0;
  const diff = Date.parse(now) - Date.parse(oldest);
  if (Number.isNaN(diff) || diff < 0) return 0;
  return Math.floor(diff / 86_400_000);
}

/**
 * Read the queue. `now` is injectable for age computation in tests.
 */
export function listQueue(
  db: Db,
  query: Record<string, unknown>,
  now: string = new Date().toISOString(),
): QueueResponse {
  const q = parseQueueQuery(query);

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  // The clean filter (zero-exception cases off the queue) applies to non-cleared
  // cases; a CLEARED case is governed by include_cleared alone, even though its
  // queued flag is 0. So: exclude clean cases unless include_clean, but never let
  // the clean rule hide a cleared case the caller asked to see.
  if (!q.include_clean) {
    if (q.include_cleared) {
      where.push("(cs.queued = 1 OR cs.status = 'CLEARED')");
    } else {
      where.push('cs.queued = 1');
    }
  }
  if (!q.include_cleared) where.push("cs.status <> 'CLEARED'");

  if (q.status.length) {
    where.push(`cs.status IN (${q.status.map((_, i) => `@status${i}`).join(', ')})`);
    q.status.forEach((s, i) => (params[`status${i}`] = s));
  }
  if (q.priority.length) {
    where.push(`cs.priority IN (${q.priority.map((_, i) => `@priority${i}`).join(', ')})`);
    q.priority.forEach((p, i) => (params[`priority${i}`] = p));
  }
  if (q.exception_type.length) {
    where.push(
      `EXISTS (SELECT 1 FROM exceptions ex WHERE ex.case_id = cs.id AND ex.status = 'OPEN' AND ex.exception_type IN (${q.exception_type
        .map((_, i) => `@etype${i}`)
        .join(', ')}))`,
    );
    q.exception_type.forEach((t, i) => (params[`etype${i}`] = t));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const baseSql = `
    SELECT cs.*, ce.importer_name AS importer_name, ce.carrier_name AS carrier_name,
           ce.shipment_value_cents AS shipment_value_cents,
           (SELECT MIN(ex.opened_at) FROM exceptions ex
              WHERE ex.case_id = cs.id AND ex.status = 'OPEN') AS oldest_exception_opened_at
    FROM cases cs
    JOIN cargo_entries ce ON ce.id = cs.cargo_entry_id
    ${whereSql}`;

  const countSql = `SELECT COUNT(*) AS c FROM (${baseSql}) t`;
  const total = (db.prepare(countSql).get(params) as { c: number }).c;

  const offset = (q.page - 1) * q.page_size;
  const pagedSql = `${baseSql} ORDER BY ${buildOrderBy(q.sort)} LIMIT @__limit OFFSET @__offset`;
  const rows = db
    .prepare(pagedSql)
    .all({ ...params, __limit: q.page_size, __offset: offset }) as JoinedRow[];

  const data = rows.map((row) => projectRow(db, row, now));

  return {
    data,
    page: {
      page: q.page,
      page_size: q.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / q.page_size)),
    },
    applied: {
      filters: {
        status: q.status,
        exception_type: q.exception_type,
        priority: q.priority,
        include_clean: q.include_clean,
        include_cleared: q.include_cleared,
      },
      sort: q.sortRaw,
    },
  };
}

interface TypeCountRow {
  exception_type: ExceptionType;
  count: number;
}

function projectRow(db: Db, row: JoinedRow, now: string): QueueRow {
  const typeCounts = db
    .prepare(
      `SELECT exception_type, COUNT(*) AS count FROM exceptions
       WHERE case_id = ? AND status = 'OPEN'
       GROUP BY exception_type ORDER BY exception_type`,
    )
    .all(row.id) as TypeCountRow[];

  const exception_types = typeCounts.map((t) => ({ type: t.exception_type, count: t.count }));
  const exception_summary = typeCounts
    .map((t) => EXCEPTION_TYPE_LABEL[t.exception_type])
    .join('; ');

  const basis = parseBasis(row.priority_basis_json);
  const priority_basis_summary = basis.map((b) => b.detail).join('; ');

  let assigned_to: UserRef | null = null;
  if (row.assigned_to_user_id) {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(row.assigned_to_user_id) as
      | UserRow
      | undefined;
    if (u) assigned_to = { id: u.id, name: u.name, role: u.role };
  }

  return {
    shipment_id: row.shipment_id,
    case_id: row.id,
    importer_name: row.importer_name,
    carrier_name: row.carrier_name,
    priority: row.priority,
    priority_basis_summary,
    status: row.status,
    open_exception_count: row.open_exception_count,
    exception_types,
    exception_summary,
    oldest_exception_opened_at: row.oldest_exception_opened_at,
    age_days: ageDays(row.oldest_exception_opened_at, now),
    assigned_to,
    shipment_value_usd: centsToUsdString(row.shipment_value_cents),
    updated_at: row.updated_at,
  };
}

// re-export for callers/tests that only want the parser
export { EXCEPTION_TYPE_LABEL };
export type { CargoEntryRow };
