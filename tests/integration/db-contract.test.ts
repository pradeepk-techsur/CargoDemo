import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initDatabase, type Db, type Repositories } from '../../src/infra/db/index.js';

/**
 * The exact column-name set of each contract table, written out literally. A
 * renamed or dropped column in a later wave fails this test immediately — that
 * is the whole point of pinning the contract here.
 */
const TABLE_COLUMNS: Record<string, string[]> = {
  users: ['id', 'name', 'role', 'active', 'created_at', 'updated_at'],
  cargo_entries: [
    'id',
    'shipment_id',
    'importer_name',
    'carrier_name',
    'product_description',
    'hts_code',
    'hts_code_normalized',
    'country_of_origin',
    'country_of_origin_iso2',
    'manufacturer_name',
    'manufacturer_address_line1',
    'manufacturer_address_city',
    'manufacturer_address_region',
    'manufacturer_address_postal_code',
    'manufacturer_address_country',
    'manufacturer_address_country_iso2',
    'shipment_value_cents',
    'entry_date',
    'declared_priority_hint',
    'ingestion_source',
    'ingestion_batch_id',
    'created_at',
    'updated_at',
  ],
  documents: [
    'id',
    'cargo_entry_id',
    'document_type',
    'status',
    'filename',
    'storage_path',
    'content_hash',
    'file_size_bytes',
    'mime_type',
    'provenance',
    'stated_country',
    'note',
    'superseded',
    'duplicate_of_document_id',
    'source_request_id',
    'uploaded_by_user_id',
    'received_at',
    'created_at',
  ],
  rules: [
    'id',
    'name',
    'name_lower',
    'exception_type',
    'description',
    'policy_reference',
    'severity',
    'priority_mapping',
    'conditions_json',
    'params_json',
    'enabled',
    'version',
    'created_by_user_id',
    'updated_by_user_id',
    'created_at',
    'updated_at',
  ],
  evaluations: [
    'id',
    'cargo_entry_id',
    'case_id',
    'version',
    'trigger',
    'rule_set_fingerprint',
    'skipped_rules_json',
    'invalid_rules_json',
    'finding_count',
    'duration_ms',
    'actor_kind',
    'actor_user_id',
    'evaluated_at',
  ],
  exceptions: [
    'id',
    'evaluation_id',
    'cargo_entry_id',
    'case_id',
    'rule_id',
    'rule_version',
    'exception_type',
    'sub_reason',
    'severity',
    'status',
    'assertion',
    'missing_information_json',
    'first_detected_evaluation_id',
    'opened_at',
    'resolved_at',
    'resolved_by_evaluation_id',
    'resolution_reason',
    'superseded_by_exception_id',
    'cleared_by_approval_id',
    'created_at',
  ],
  evidence: [
    'id',
    'exception_id',
    'kind',
    'field_path',
    'raw_value',
    'normalized_value',
    'comparison_field_path',
    'comparison_raw_value',
    'comparison_normalized_value',
    'expected',
    'observed',
    'assertion',
    'truncated',
    'display_order',
    'created_at',
  ],
  cases: [
    'id',
    'cargo_entry_id',
    'shipment_id',
    'status',
    'priority',
    'priority_basis_json',
    'queued',
    'current_evaluation_id',
    'open_exception_count',
    'exception_type_summary',
    'assigned_to_user_id',
    'hold_reason',
    'hold_reason_detail',
    'hold_placed_by_user_id',
    'hold_placed_at',
    'escalation_reason',
    'escalated_by_user_id',
    'escalated_to_user_id',
    'escalated_at',
    'approving_official_user_id',
    'approving_official_name',
    'approving_official_role',
    'cleared_at',
    'last_action_id',
    'created_at',
    'updated_at',
  ],
  case_actions: [
    'id',
    'case_id',
    'cargo_entry_id',
    'action',
    'status_before',
    'status_after',
    'justification',
    'parameters_json',
    'evaluation_id',
    'actor_user_id',
    'actor_name',
    'actor_role',
    'audit_entry_id',
    'idempotency_key',
    'occurred_at',
  ],
};

describe('database contract (wave boundary)', () => {
  let dir: string;
  let dbPath: string;
  let db: Db;
  let repos: Repositories;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-contract-'));
    dbPath = join(dir, 'test.db');
    const init = initDatabase({ path: dbPath });
    db = init.db;
    repos = init.repositories;
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('pins the exact column-name set of all nine contract tables', () => {
    for (const [table, expected] of Object.entries(TABLE_COLUMNS)) {
      const actual = (
        db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
      ).map((r) => r.name);
      expect(actual, table).toEqual(expected);
    }
    expect(Object.keys(TABLE_COLUMNS)).toHaveLength(9);
  });

  it('listEnabled returns exactly 4 rules in (exception_type ASC, severity DESC, rule_id ASC) order', () => {
    const enabled = repos.rules.listEnabled();
    expect(enabled.map((r) => r.id)).toEqual([
      'rule-origin-manufacturer', // CONFLICTING_COUNTRY_OF_ORIGIN, CRITICAL
      'rule-hts-completeness', // INVALID_HTS_CODE, HIGH
      'rule-doc-highvalue-coo', // MISSING_REQUIRED_DOCUMENT, HIGH
      'rule-doc-baseline', // MISSING_REQUIRED_DOCUMENT, MEDIUM
    ]);
  });

  it('getByShipmentId returns the canonical row with a NOT_RECEIVED certificate of origin', () => {
    const entry = repos.cargo.getByShipmentId('SHP-2026-0007');
    expect(entry).toBeDefined();
    expect(entry!.country_of_origin).toBe('Malaysia');
    const docs = repos.cargo.listDocuments(entry!.id);
    const coo = docs.find((d) => d.document_type === 'CERTIFICATE_OF_ORIGIN');
    expect(coo?.status).toBe('NOT_RECEIVED');
  });

  it('listQueued excludes the clean shipment SHP-2026-0011', () => {
    const queued = repos.cases.listQueued();
    const shipmentIds = queued.map((c) => c.shipment_id);
    expect(shipmentIds).not.toContain('SHP-2026-0011');
    expect(shipmentIds).toContain('SHP-2026-0007');
  });

  it('updateProjection round-trips and advances updated_at', () => {
    const before = repos.cases.getByCargoEntryId('ent-0001')!;
    repos.cases.updateProjection({
      case_id: before.id,
      priority: 'CRITICAL',
      queued: 1,
      open_exception_count: 2,
      exception_type_summary: 'INVALID_HTS_CODE',
      current_evaluation_id: null,
      priority_basis_json: '["RULE_SEVERITY"]',
      updated_at: '2026-09-01T09:00:00.000Z',
    });
    const after = repos.cases.getById(before.id)!;
    expect(after.priority).toBe('CRITICAL');
    expect(after.open_exception_count).toBe(2);
    expect(after.priority_basis_json).toBe('["RULE_SEVERITY"]');
    expect(after.updated_at).toBe('2026-09-01T09:00:00.000Z');
    expect(after.updated_at).not.toBe(before.updated_at);
  });

  it('getById returns the default login user', () => {
    const user = repos.users.getById('usr-cs-001');
    expect(user).toBeDefined();
    expect(user!.role).toBe('CARGO_SPECIALIST');
    expect(user!.active).toBe(1);
  });

  it('initDatabase is safe to call twice against the same path', () => {
    db.close();
    const first = initDatabase({ path: dbPath });
    first.db.close();
    const second = initDatabase({ path: dbPath });
    expect(second.seedReport.mode).toBe('SKIPPED_NON_EMPTY');
    const entryCount = (
      second.db.prepare('SELECT COUNT(*) AS c FROM cargo_entries').get() as { c: number }
    ).c;
    expect(entryCount).toBe(12);
    second.db.close();
    // Re-open for afterEach teardown.
    db = initDatabase({ path: dbPath }).db;
  });
});
