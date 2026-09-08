/**
 * Deterministic, idempotent synthetic seed (FRD F2).
 *
 * The seed writes rows into ONLY: users, rules, cargo_entries, documents, cases.
 * It writes zero rows into evaluations/exceptions/evidence/audit/notifications/
 * approvals/recommendations/document_requests/case_actions — those are wave 2+
 * work. Case statuses are seeded declaratively from each fixture's `case_status`
 * (the workflow state machine arrives in a later wave); `SHP-2026-0009` is seeded
 * CLEARED with a populated approving official purely to satisfy the `cases`
 * clearance CHECK, and no approval/recommendation row is written.
 *
 * Determinism: ids come from the fixtures, timestamps from a fixed SeedClock, so
 * two runs (or a reseed) produce byte-identical rows. Idempotency: every insert
 * is an ON CONFLICT(id) DO UPDATE upsert, and the whole seed runs in one txn.
 *
 * Wave 2 fills in the optional `evaluate` hook so seeded shipments gain
 * evaluations/exceptions/evidence and their case projections (priority, queued,
 * open_exception_count, exception_type_summary, current_evaluation_id) are
 * recomputed authoritatively. Those seeded projection values are the declared
 * expectation, not a computed truth.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Db } from '../infra/db/connection.js';
import { SeedClock } from '../infra/clock.js';
import { config } from '../server/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, '..', '..', 'fixtures');

export type SeedMode = 'SEED_IF_EMPTY' | 'FORCE_RESEED';

export interface SeedOptions {
  mode: SeedMode;
  /**
   * Wave 2 (F4/F5) passes its evaluator here so seeded shipments get
   * evaluations/exceptions/evidence rows. When omitted (wave 1), the seed writes
   * NO evaluations, exceptions or evidence rows and says so in SeedReport.
   */
  evaluate?: (db: Db, cargoEntryId: string) => void;
}

export interface SeedReport {
  mode: SeedMode | 'SKIPPED_NON_EMPTY';
  users_created: number;
  rules_created: number;
  entries_created: number;
  cases_created: number;
  documents_created: number;
  evaluations_created: number;
  exceptions_created: number;
  coverage: {
    exception_types: string[];
    statuses: string[];
    multi_exception_shipments: string[];
    precleared_shipments: string[];
  };
  seed_clock: string;
  duration_ms: number;
  evaluate_hook_present: boolean;
}

export class SeedError extends Error {
  constructor(code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'SeedError';
  }
}

// --- Fixture shapes ----------------------------------------------------------

interface UserFixture {
  id: string;
  name: string;
  role: string;
}

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

interface DocumentFixture {
  document_type: string;
  status: 'RECEIVED' | 'NOT_RECEIVED';
  filename?: string;
  stated_country?: string;
}

interface CargoEntryFixture {
  id: string;
  shipment_id: string;
  importer_name: string;
  carrier_name: string;
  product_description: string;
  hts_code: string | null;
  hts_code_normalized: string | null;
  country_of_origin: string;
  country_of_origin_iso2: string | null;
  manufacturer_name: string;
  manufacturer_address_line1: string;
  manufacturer_address_city: string | null;
  manufacturer_address_region: string | null;
  manufacturer_address_postal_code: string | null;
  manufacturer_address_country: string;
  manufacturer_address_country_iso2: string | null;
  shipment_value_cents: number;
  entry_date: string;
  declared_priority_hint: string | null;
  declared_priority: string;
  case_status: string;
  expected_exception_types: string[];
  documents: DocumentFixture[];
}

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8')) as T;
}

// --- PII deny-list -----------------------------------------------------------

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const US_PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;

function screenPii(path: string, value: unknown): void {
  if (typeof value !== 'string') return;
  if (EMAIL_RE.test(value) || US_PHONE_RE.test(value) || SSN_RE.test(value)) {
    throw new SeedError('SEED_PII_SUSPECTED', `Seed data failed PII screen at ${path}`);
  }
}

function screenObjectPii(prefix: string, obj: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') screenPii(`${prefix}.${k}`, v);
  }
}

// --- Reset order (Y0b §10, reverse dependency) -------------------------------

const RESET_ORDER: readonly string[] = [
  'notification_reads',
  'notifications',
  'audit_entries',
  'approvals',
  'recommendations',
  'case_actions',
  'ai_outputs',
  'evidence',
  'exceptions',
  'evaluations',
  'document_requests',
  'documents',
  'cases',
  'cargo_entries',
  'ingestion_batches',
  'rules',
  'sessions',
  'users',
  'idempotency_keys',
  'request_log',
];

const CANONICAL_SHIPMENT = 'SHP-2026-0007';
const CLEARED_SHIPMENT = 'SHP-2026-0009';

/**
 * Run the seed. Returns a SeedReport. Coverage assertions are checked before the
 * transaction commits; a failure throws and rolls back rather than leaving a
 * half-seeded demo.
 */
export function runSeed(db: Db, opts: SeedOptions): SeedReport {
  const started = Date.now();
  const clock = new SeedClock(config.CARGODEMO_SEED_CLOCK);

  const existing = (
    db.prepare('SELECT COUNT(*) AS c FROM cargo_entries').get() as { c: number }
  ).c;

  if (opts.mode === 'SEED_IF_EMPTY' && existing > 0) {
    return emptyReport('SKIPPED_NON_EMPTY', clock.now(), Date.now() - started, !!opts.evaluate);
  }

  const users = loadFixture<UserFixture[]>('users.seed.json');
  const rules = loadFixture<RuleFixture[]>('rules.seed.json');
  const entries = loadFixture<CargoEntryFixture[]>('cargo-entries.seed.json');

  let report!: SeedReport;

  const seedTxn = db.transaction(() => {
    if (opts.mode === 'FORCE_RESEED') {
      for (const table of RESET_ORDER) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
    }

    const createdAt = clock.now();

    // --- users ---
    const insertUser = db.prepare(
      `INSERT INTO users (id, name, role, active, created_at, updated_at)
       VALUES (@id, @name, @role, 1, @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, role = excluded.role, active = excluded.active,
         updated_at = excluded.updated_at`,
    );
    for (const u of users) {
      screenObjectPii(`users.${u.id}`, u as unknown as Record<string, unknown>);
      insertUser.run({ ...u, created_at: createdAt, updated_at: createdAt });
    }

    // --- rules ---
    const insertRule = db.prepare(
      `INSERT INTO rules
         (id, name, name_lower, exception_type, description, policy_reference, severity,
          priority_mapping, conditions_json, params_json, enabled, version,
          created_at, updated_at)
       VALUES
         (@id, @name, @name_lower, @exception_type, @description, @policy_reference, @severity,
          NULL, @conditions_json, @params_json, @enabled, 1,
          @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, name_lower = excluded.name_lower,
         exception_type = excluded.exception_type, description = excluded.description,
         policy_reference = excluded.policy_reference, severity = excluded.severity,
         conditions_json = excluded.conditions_json, params_json = excluded.params_json,
         enabled = excluded.enabled, updated_at = excluded.updated_at`,
    );
    for (const r of rules) {
      screenPii(`rules.${r.id}.name`, r.name);
      screenPii(`rules.${r.id}.description`, r.description);
      insertRule.run({
        id: r.id,
        name: r.name,
        name_lower: r.name.toLowerCase(),
        exception_type: r.exception_type,
        description: r.description,
        policy_reference: r.policy_reference,
        severity: r.severity,
        conditions_json: JSON.stringify(r.conditions ?? {}),
        params_json: JSON.stringify(r.params ?? {}),
        enabled: r.enabled,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    // --- cargo_entries + documents + cases ---
    const insertEntry = db.prepare(
      `INSERT INTO cargo_entries
         (id, shipment_id, importer_name, carrier_name, product_description,
          hts_code, hts_code_normalized, country_of_origin, country_of_origin_iso2,
          manufacturer_name, manufacturer_address_line1, manufacturer_address_city,
          manufacturer_address_region, manufacturer_address_postal_code,
          manufacturer_address_country, manufacturer_address_country_iso2,
          shipment_value_cents, entry_date, declared_priority_hint, ingestion_source,
          ingestion_batch_id, created_at, updated_at)
       VALUES
         (@id, @shipment_id, @importer_name, @carrier_name, @product_description,
          @hts_code, @hts_code_normalized, @country_of_origin, @country_of_origin_iso2,
          @manufacturer_name, @manufacturer_address_line1, @manufacturer_address_city,
          @manufacturer_address_region, @manufacturer_address_postal_code,
          @manufacturer_address_country, @manufacturer_address_country_iso2,
          @shipment_value_cents, @entry_date, @declared_priority_hint, 'seed',
          NULL, @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         shipment_id = excluded.shipment_id, importer_name = excluded.importer_name,
         carrier_name = excluded.carrier_name, product_description = excluded.product_description,
         hts_code = excluded.hts_code, hts_code_normalized = excluded.hts_code_normalized,
         country_of_origin = excluded.country_of_origin,
         country_of_origin_iso2 = excluded.country_of_origin_iso2,
         manufacturer_name = excluded.manufacturer_name,
         manufacturer_address_line1 = excluded.manufacturer_address_line1,
         manufacturer_address_city = excluded.manufacturer_address_city,
         manufacturer_address_region = excluded.manufacturer_address_region,
         manufacturer_address_postal_code = excluded.manufacturer_address_postal_code,
         manufacturer_address_country = excluded.manufacturer_address_country,
         manufacturer_address_country_iso2 = excluded.manufacturer_address_country_iso2,
         shipment_value_cents = excluded.shipment_value_cents, entry_date = excluded.entry_date,
         declared_priority_hint = excluded.declared_priority_hint,
         updated_at = excluded.updated_at`,
    );

    const insertDoc = db.prepare(
      `INSERT INTO documents
         (id, cargo_entry_id, document_type, status, filename, storage_path, content_hash,
          file_size_bytes, mime_type, provenance, stated_country, note, superseded,
          received_at, created_at)
       VALUES
         (@id, @cargo_entry_id, @document_type, @status, @filename, NULL, NULL,
          NULL, NULL, 'SEEDED', @stated_country, NULL, 0,
          @received_at, @created_at)
       ON CONFLICT(id) DO UPDATE SET
         cargo_entry_id = excluded.cargo_entry_id, document_type = excluded.document_type,
         status = excluded.status, filename = excluded.filename,
         stated_country = excluded.stated_country, received_at = excluded.received_at`,
    );

    const insertCase = db.prepare(
      `INSERT INTO cases
         (id, cargo_entry_id, shipment_id, status, priority, priority_basis_json, queued,
          current_evaluation_id, open_exception_count, exception_type_summary,
          approving_official_user_id, approving_official_name, approving_official_role,
          cleared_at, created_at, updated_at)
       VALUES
         (@id, @cargo_entry_id, @shipment_id, @status, @priority, '[]', @queued,
          NULL, @open_exception_count, @exception_type_summary,
          @approving_official_user_id, @approving_official_name, @approving_official_role,
          @cleared_at, @created_at, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         cargo_entry_id = excluded.cargo_entry_id, shipment_id = excluded.shipment_id,
         status = excluded.status, priority = excluded.priority, queued = excluded.queued,
         open_exception_count = excluded.open_exception_count,
         exception_type_summary = excluded.exception_type_summary,
         approving_official_user_id = excluded.approving_official_user_id,
         approving_official_name = excluded.approving_official_name,
         approving_official_role = excluded.approving_official_role,
         cleared_at = excluded.cleared_at, updated_at = excluded.updated_at`,
    );

    let documentsCreated = 0;

    for (const e of entries) {
      // PII screen over the entry's string fields and its documents.
      screenObjectPii(`cargo_entries.${e.id}`, e as unknown as Record<string, unknown>);

      insertEntry.run({
        id: e.id,
        shipment_id: e.shipment_id,
        importer_name: e.importer_name,
        carrier_name: e.carrier_name,
        product_description: e.product_description,
        hts_code: e.hts_code,
        hts_code_normalized: e.hts_code_normalized,
        country_of_origin: e.country_of_origin,
        country_of_origin_iso2: e.country_of_origin_iso2,
        manufacturer_name: e.manufacturer_name,
        manufacturer_address_line1: e.manufacturer_address_line1,
        manufacturer_address_city: e.manufacturer_address_city ?? null,
        manufacturer_address_region: e.manufacturer_address_region ?? null,
        manufacturer_address_postal_code: e.manufacturer_address_postal_code ?? null,
        manufacturer_address_country: e.manufacturer_address_country,
        manufacturer_address_country_iso2: e.manufacturer_address_country_iso2,
        shipment_value_cents: e.shipment_value_cents,
        entry_date: e.entry_date,
        declared_priority_hint: e.declared_priority_hint ?? null,
        created_at: createdAt,
        updated_at: createdAt,
      });

      for (const d of e.documents) {
        screenObjectPii(`documents.${e.id}`, d as unknown as Record<string, unknown>);
        const docId = `doc-${e.id.replace(/^ent-/, '')}-${d.document_type.toLowerCase()}`;
        const received = d.status === 'RECEIVED';
        insertDoc.run({
          id: docId,
          cargo_entry_id: e.id,
          document_type: d.document_type,
          status: d.status,
          filename: received ? (d.filename ?? `${d.document_type.toLowerCase()}.pdf`) : (d.filename ?? null),
          stated_country: d.stated_country ?? null,
          received_at: received ? createdAt : null,
          created_at: createdAt,
        });
        documentsCreated += 1;
      }

      // Case: declarative projection from the fixture's expectation.
      const expected = e.expected_exception_types;
      const isCleared = e.shipment_id === CLEARED_SHIPMENT;
      const summary = [...new Set(expected)].sort().join(',');
      insertCase.run({
        id: `case-${e.id.replace(/^ent-/, '')}`,
        cargo_entry_id: e.id,
        shipment_id: e.shipment_id,
        status: e.case_status,
        priority: e.declared_priority,
        queued: expected.length > 0 ? 1 : 0,
        open_exception_count: expected.length,
        exception_type_summary: summary,
        approving_official_user_id: isCleared ? 'usr-sup-001' : null,
        approving_official_name: isCleared ? 'Dwayne Okafor' : null,
        approving_official_role: isCleared ? 'SUPERVISOR' : null,
        cleared_at: isCleared ? clock.plusMinutes(120) : null,
        created_at: createdAt,
        updated_at: createdAt,
      });

      // Wave 2 hook: when present, produce evaluations/exceptions/evidence.
      if (opts.evaluate) opts.evaluate(db, e.id);
    }

    // --- coverage assertions (before commit) ---
    assertCoverage(entries);

    const evaluationsCreated = (
      db.prepare('SELECT COUNT(*) AS c FROM evaluations').get() as { c: number }
    ).c;
    const exceptionsCreated = (
      db.prepare('SELECT COUNT(*) AS c FROM exceptions').get() as { c: number }
    ).c;

    const multiException = entries
      .filter((e) => e.expected_exception_types.length >= 2)
      .map((e) => e.shipment_id);

    report = {
      mode: opts.mode,
      users_created: users.length,
      rules_created: rules.length,
      entries_created: entries.length,
      cases_created: entries.length,
      documents_created: documentsCreated,
      evaluations_created: evaluationsCreated,
      exceptions_created: exceptionsCreated,
      coverage: {
        exception_types: [
          ...new Set(entries.flatMap((e) => e.expected_exception_types)),
        ].sort(),
        statuses: [...new Set(entries.map((e) => e.case_status))].sort(),
        multi_exception_shipments: multiException,
        precleared_shipments: entries
          .filter((e) => e.case_status === 'CLEARED')
          .map((e) => e.shipment_id),
      },
      seed_clock: config.CARGODEMO_SEED_CLOCK,
      duration_ms: 0, // filled after commit
      evaluate_hook_present: !!opts.evaluate,
    };
  });

  seedTxn();
  report.duration_ms = Date.now() - started;
  return report;
}

function emptyReport(
  mode: SeedReport['mode'],
  seedClock: string,
  durationMs: number,
  hookPresent: boolean,
): SeedReport {
  return {
    mode,
    users_created: 0,
    rules_created: 0,
    entries_created: 0,
    cases_created: 0,
    documents_created: 0,
    evaluations_created: 0,
    exceptions_created: 0,
    coverage: {
      exception_types: [],
      statuses: [],
      multi_exception_shipments: [],
      precleared_shipments: [],
    },
    seed_clock: seedClock,
    duration_ms: durationMs,
    evaluate_hook_present: hookPresent,
  };
}

const ALL_EXCEPTION_TYPES = [
  'MISSING_REQUIRED_DOCUMENT',
  'INVALID_HTS_CODE',
  'CONFLICTING_COUNTRY_OF_ORIGIN',
];
const ALL_STATUSES = [
  'NEW',
  'IN_REVIEW',
  'AWAITING_INFORMATION',
  'ON_HOLD',
  'ESCALATED',
  'PENDING_APPROVAL',
  'CLEARED',
];

/**
 * Load the raw cargo-entries fixture. Exposed so tests can exercise the coverage
 * and canonical-scenario guards against a mutated copy without touching disk.
 */
export function loadCargoEntriesFixture(): unknown[] {
  return loadFixture<unknown[]>('cargo-entries.seed.json');
}

/**
 * Run the coverage + canonical-scenario assertions over a fixture array. Throws
 * SeedError on any violation. Exported for negative-path testing.
 */
export function assertSeedCoverage(entries: unknown[]): void {
  assertCoverage(entries as CargoEntryFixture[]);
}

function assertCoverage(entries: CargoEntryFixture[]): void {
  if (entries.length < 10 || entries.length > 15) {
    throw new SeedError(
      'SEED_COVERAGE_FAILED',
      `entry count ${entries.length} not in [10,15]`,
    );
  }

  const seenTypes = new Set(entries.flatMap((e) => e.expected_exception_types));
  for (const t of ALL_EXCEPTION_TYPES) {
    if (!seenTypes.has(t)) {
      throw new SeedError('SEED_COVERAGE_FAILED', `exception type ${t} not represented`);
    }
  }

  const seenStatuses = new Set(entries.map((e) => e.case_status));
  for (const s of ALL_STATUSES) {
    if (!seenStatuses.has(s)) {
      throw new SeedError('SEED_COVERAGE_FAILED', `case status ${s} not represented`);
    }
  }

  const multi = entries.filter((e) => e.expected_exception_types.length >= 2);
  if (multi.length === 0) {
    throw new SeedError('SEED_COVERAGE_FAILED', 'no shipment with >= 2 expected types');
  }
  const triple = entries.filter((e) => e.expected_exception_types.length === 3);
  if (triple.length === 0) {
    throw new SeedError('SEED_COVERAGE_FAILED', 'no shipment with exactly 3 expected types');
  }

  const cleared = entries.filter((e) => e.case_status === 'CLEARED');
  if (cleared.length !== 1) {
    throw new SeedError(
      'SEED_COVERAGE_FAILED',
      `expected exactly one CLEARED shipment, got ${cleared.length}`,
    );
  }

  const cleanZero = entries.filter(
    (e) => e.expected_exception_types.length === 0,
  );
  if (cleanZero.length === 0) {
    throw new SeedError('SEED_COVERAGE_FAILED', 'no shipment with zero expected types');
  }

  assertCanonicalScenario(entries);
}

function assertCanonicalScenario(entries: CargoEntryFixture[]): void {
  const c = entries.find((e) => e.shipment_id === CANONICAL_SHIPMENT);
  if (!c) {
    throw new SeedError('SEED_CANONICAL_SCENARIO_INVALID', 'SHP-2026-0007 is absent');
  }
  const fail = (field: string): never => {
    throw new SeedError(
      'SEED_CANONICAL_SCENARIO_INVALID',
      `SHP-2026-0007 field ${field} does not match required value`,
    );
  };

  if (!/solar/i.test(c.product_description)) fail('product_description');
  if (c.country_of_origin !== 'Malaysia') fail('country_of_origin');
  if (c.country_of_origin_iso2 !== 'MY') fail('country_of_origin_iso2');
  if (c.manufacturer_address_country !== 'China') fail('manufacturer_address_country');
  if (c.manufacturer_address_country_iso2 !== 'CN') fail('manufacturer_address_country_iso2');
  if (c.hts_code !== '8541.40') fail('hts_code');
  if (c.hts_code_normalized !== '854140') fail('hts_code_normalized');
  if (c.shipment_value_cents !== 8500000) fail('shipment_value_cents');

  const coo = c.documents.find((d) => d.document_type === 'CERTIFICATE_OF_ORIGIN');
  if (!coo || coo.status !== 'NOT_RECEIVED') fail('CERTIFICATE_OF_ORIGIN.status');

  const three = ['MISSING_REQUIRED_DOCUMENT', 'INVALID_HTS_CODE', 'CONFLICTING_COUNTRY_OF_ORIGIN'];
  const set = new Set(c.expected_exception_types);
  if (set.size !== 3 || !three.every((t) => set.has(t))) fail('expected_exception_types');
}
