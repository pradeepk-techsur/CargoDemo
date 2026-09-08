/**
 * Idempotency-key repository over `idempotency_keys` (primary key (key, scope)).
 * Scope is `case:<case_id>:action`; the request hash is the SHA-256 of the
 * canonically serialized body (sorted keys, no whitespace).
 */

import { createHash } from 'node:crypto';

import type { Db } from '../connection.js';

export interface IdempotencyRecord {
  key: string;
  scope: string;
  request_hash: string;
  response_json: string;
  status_code: number;
  created_at: string;
}

export interface IdempotencyRepository {
  find(key: string, scope: string): IdempotencyRecord | undefined;
  save(record: IdempotencyRecord): void;
}

/** Canonical JSON with recursively sorted object keys, then SHA-256 hex. */
export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(canonicalize(body)).digest('hex');
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export function createIdempotencyRepository(db: Db): IdempotencyRepository {
  const findStmt = db.prepare('SELECT * FROM idempotency_keys WHERE key = ? AND scope = ?');
  const saveStmt = db.prepare(
    `INSERT INTO idempotency_keys (key, scope, request_hash, response_json, status_code, created_at)
     VALUES (@key, @scope, @request_hash, @response_json, @status_code, @created_at)`,
  );

  return {
    find: (key, scope) => findStmt.get(key, scope) as IdempotencyRecord | undefined,
    save: (record) => {
      saveStmt.run(record);
    },
  };
}
