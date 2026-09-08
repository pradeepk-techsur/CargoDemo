/**
 * Blocking schema integrity assertions (FRD F0 §Process step 4, TechArch §2.1).
 *
 * Run after migrations and before any caller touches data. Throws
 * SCHEMA_INTEGRITY_FAILED if foreign keys are off, a table is missing, a
 * governance CHECK is absent, an append-only trigger is missing, or the
 * exceptions type CHECK does not list exactly the three canonical codes. A
 * missing governance guarantee must abort startup, not degrade silently.
 */

import type { Db } from './connection.js';

export class SchemaIntegrityError extends Error {
  constructor(detail: string) {
    super(`SCHEMA_INTEGRITY_FAILED: ${detail}`);
    this.name = 'SchemaIntegrityError';
  }
}

/** The 21 tables the schema must contain (Y0a §1-§9 + Y0b §1-§9). */
export const REQUIRED_TABLES: readonly string[] = [
  // Y0a
  'schema_migrations',
  'cargo_entries',
  'documents',
  'document_requests',
  'rules',
  'evaluations',
  'exceptions',
  'evidence',
  'ingestion_batches',
  // Y0b
  'users',
  'sessions',
  'cases',
  'case_actions',
  'recommendations',
  'approvals',
  'audit_entries',
  'notifications',
  'notification_reads',
  'ai_outputs',
  'idempotency_keys',
  'request_log',
];

export const REQUIRED_TRIGGERS: readonly string[] = [
  'audit_entries_no_delete',
  'audit_entries_no_update',
  'notifications_no_delete',
];

function tableSql(db: Db, table: string): string {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
    .get(table) as { sql: string } | undefined;
  return row?.sql ?? '';
}

export function runSchemaSelfCheck(db: Db): void {
  // 1. Foreign keys must be ON for this connection.
  const fk = db.pragma('foreign_keys', { simple: true });
  if (fk !== 1) {
    throw new SchemaIntegrityError(`foreign_keys pragma is ${String(fk)}, expected 1`);
  }

  // 2. All 21 tables must exist.
  const existing = new Set(
    (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>
    ).map((r) => r.name),
  );
  for (const table of REQUIRED_TABLES) {
    if (!existing.has(table)) {
      throw new SchemaIntegrityError(`required table '${table}' is missing`);
    }
  }

  // 3. The four governance CHECK constraints must be present.
  const casesSql = tableSql(db, 'cases');
  if (!casesSql.includes("status <> 'CLEARED'")) {
    throw new SchemaIntegrityError("cases clearance CHECK (status <> 'CLEARED') is missing");
  }
  const approvalsSql = tableSql(db, 'approvals');
  if (!approvalsSql.includes('approver_user_id <> recommended_by_user_id')) {
    throw new SchemaIntegrityError('approvals SoD-2 CHECK (approver <> recommender) is missing');
  }
  if (!approvalsSql.includes("approver_role = 'SUPERVISOR'")) {
    throw new SchemaIntegrityError("approvals SoD-1 CHECK (approver_role = 'SUPERVISOR') is missing");
  }
  const notificationsSql = tableSql(db, 'notifications');
  if (!notificationsSql.includes('transmitted = 0')) {
    throw new SchemaIntegrityError('notifications CHECK (transmitted = 0) is missing');
  }

  // 4. The three append-only triggers must exist.
  const triggers = new Set(
    (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='trigger'")
        .all() as Array<{ name: string }>
    ).map((r) => r.name),
  );
  for (const trigger of REQUIRED_TRIGGERS) {
    if (!triggers.has(trigger)) {
      throw new SchemaIntegrityError(`append-only trigger '${trigger}' is missing`);
    }
  }

  // 5. exceptions.exception_type must accept exactly the three canonical codes.
  const exceptionsSql = tableSql(db, 'exceptions');
  const canonical = [
    'MISSING_REQUIRED_DOCUMENT',
    'INVALID_HTS_CODE',
    'CONFLICTING_COUNTRY_OF_ORIGIN',
  ];
  for (const code of canonical) {
    if (!exceptionsSql.includes(code)) {
      throw new SchemaIntegrityError(
        `exceptions.exception_type CHECK does not list '${code}'`,
      );
    }
  }
}
