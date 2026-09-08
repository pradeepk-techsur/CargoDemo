import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { openDb, type Db } from '../../src/infra/db/connection.js';
import { runMigrations } from '../../src/infra/db/migrate.js';
import { runSchemaSelfCheck } from '../../src/infra/db/schemaSelfCheck.js';
import { runSeed } from '../../src/app/seedService.js';
import { createEvaluateHook } from '../../src/app/evaluationService.js';
import { SeedClock } from '../../src/infra/clock.js';
import { DeterministicIdGenerator } from '../../src/infra/ids.js';
import { buildApp } from '../../src/server/app.js';

function seededDb(dir: string): Db {
  const db = openDb(join(dir, 'test.db'));
  runMigrations(db);
  runSchemaSelfCheck(db);
  runSeed(db, {
    mode: 'SEED_IF_EMPTY',
    evaluate: createEvaluateHook({
      trigger: 'SEED',
      clock: new SeedClock(),
      ids: new DeterministicIdGenerator('evd-seed-'),
    }),
  });
  return db;
}

const J = 'This is a valid justification for the action.'; // > 10 chars
const J40 = 'This is a sufficiently long justification!'; // 41 chars

describe('action write surface', () => {
  let dir: string;
  let db: Db;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'cargodemo-actions-'));
    db = seededDb(dir);
    app = await buildApp({ db });
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function statusOf(caseId: string): string {
    return (db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId) as { status: string })
      .status;
  }
  function actionCount(caseId: string): number {
    return (
      db.prepare('SELECT COUNT(*) c FROM case_actions WHERE case_id = ?').get(caseId) as {
        c: number;
      }
    ).c;
  }
  async function post(caseId: string, payload: unknown, headers: Record<string, string> = {}) {
    return app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/actions`,
      payload: payload as object,
      headers,
    });
  }

  it('happy path: SEND_FOR_SPECIALIST_REVIEW on a NEW case', async () => {
    const before = actionCount('case-0001');
    const res = await post('case-0001', { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status.before).toBe('NEW');
    expect(body.status.after).toBe('IN_REVIEW');
    expect(body.acting_user.id).toBe('usr-cs-001');
    expect(body.acting_user.role).toBe('CARGO_SPECIALIST');
    expect(body.justification).toBe(J);
    expect(statusOf('case-0001')).toBe('IN_REVIEW');
    expect(actionCount('case-0001')).toBe(before + 1);

    const detail = await app.inject({ method: 'GET', url: '/api/shipments/SHP-2026-0001' });
    expect(detail.json().case.status).toBe('IN_REVIEW');
    expect(detail.json().case.action_history.length).toBeGreaterThan(0);
  });

  it('happy path: PLACE_ON_HOLD, ESCALATE_TO_SUPERVISOR, REQUEST_INFORMATION each transition correctly', async () => {
    const hold = await post('case-0001', {
      action: 'PLACE_ON_HOLD',
      justification: J,
      hold_reason: 'RESOURCE_CONSTRAINT',
    });
    expect(hold.statusCode).toBe(201);
    expect(statusOf('case-0001')).toBe('ON_HOLD');

    const esc = await post('case-0003', {
      action: 'ESCALATE_TO_SUPERVISOR',
      justification: J,
      escalation_reason: 'POLICY_AMBIGUITY',
    });
    expect(esc.statusCode).toBe(201);
    expect(statusOf('case-0003')).toBe('ESCALATED');

    const ri = await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: J,
      document_types: ['CERTIFICATE_OF_ORIGIN'],
    });
    expect(ri.statusCode).toBe(201);
    expect(statusOf('case-0007')).toBe('AWAITING_INFORMATION');
  });

  it('mandatory justification: missing/empty/whitespace/9-char all rejected, case unchanged', async () => {
    const cases = [
      { action: 'SEND_FOR_SPECIALIST_REVIEW' },
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: '' },
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: '         ' },
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: 'x'.repeat(9) },
    ];
    const before = actionCount('case-0001');
    for (const payload of cases) {
      const res = await post('case-0001', payload);
      expect([422]).toContain(res.statusCode);
      expect(['JUSTIFICATION_REQUIRED', 'VALIDATION_FAILED']).toContain(res.json().error.code);
    }
    expect(statusOf('case-0001')).toBe('NEW');
    expect(actionCount('case-0001')).toBe(before);
  });

  it('illegal / redundant transitions rejected, database untouched', async () => {
    const redundant: Array<[string, any, string]> = [
      ['case-0004', { action: 'PLACE_ON_HOLD', justification: J, hold_reason: 'OTHER', hold_reason_detail: 'ten chars min' }, 'ON_HOLD'],
      ['case-0003', { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J }, 'IN_REVIEW'],
      ['case-0005', { action: 'ESCALATE_TO_SUPERVISOR', justification: J, escalation_reason: 'POLICY_AMBIGUITY' }, 'ESCALATED'],
    ];
    for (const [caseId, payload, status] of redundant) {
      const before = actionCount(caseId);
      const res = await post(caseId, payload);
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('TRANSITION_REDUNDANT');
      expect(res.json().error.message).toContain(status);
      expect(res.json().error.request_id).toBeTruthy();
      expect(statusOf(caseId)).toBe(status);
      expect(actionCount(caseId)).toBe(before);
    }
  });

  it('terminal immutability: every action on the CLEARED shipment → 409 CASE_TERMINAL', async () => {
    const payloads: any[] = [
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J },
      { action: 'PLACE_ON_HOLD', justification: J, hold_reason: 'RESOURCE_CONSTRAINT' },
      { action: 'ESCALATE_TO_SUPERVISOR', justification: J, escalation_reason: 'HIGH_VALUE' },
      { action: 'REQUEST_INFORMATION', justification: J, document_types: ['CERTIFICATE_OF_ORIGIN'], justify_unlisted_document: true },
      { action: 'CLEAR_EXCEPTION', justification: J40, exception_ids: [], resolution_basis: 'EXCEPTIONS_RESOLVED' },
    ];
    const before = actionCount('case-0009');
    for (const payload of payloads) {
      const res = await post('case-0009', payload);
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CASE_TERMINAL');
    }
    expect(statusOf('case-0009')).toBe('CLEARED');
    expect(actionCount('case-0009')).toBe(before);
  });

  it('malformed JSON → 400 MALFORMED_JSON; oversized body → 413', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/api/cases/case-0001/actions',
      headers: { 'content-type': 'application/json' },
      payload: '{"action":',
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('MALFORMED_JSON');
    expect(bad.json().error.request_id).toBeTruthy();

    const huge = 'x'.repeat(1024 * 1024 + 100);
    const big = await app.inject({
      method: 'POST',
      url: '/api/cases/case-0001/actions',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ action: 'SEND_FOR_SPECIALIST_REVIEW', justification: huge }),
    });
    expect(big.statusCode).toBe(413);
    expect(big.json().error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('clearance end to end: canonical shipment clears, CHECK satisfied, drops off default queue', async () => {
    const res = await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: 'Reviewed all evidence; exceptions accepted and resolved for clearance.',
      exception_ids: ['exc-0007-1-0', 'exc-0007-1-1', 'exc-0007-1-2'],
      resolution_basis: 'MIXED',
    });
    expect(res.statusCode).toBe(201);
    const row = db.prepare('SELECT * FROM cases WHERE id = ?').get('case-0007') as any;
    expect(row.status).toBe('CLEARED');
    expect(row.approving_official_user_id).toBe('usr-cs-001');
    expect(row.cleared_at).toBeTruthy();
    expect(row.queued).toBe(0);
    const cleared = db
      .prepare("SELECT COUNT(*) c FROM exceptions WHERE case_id='case-0007' AND status='CLEARED_BY_DECISION'")
      .get() as { c: number };
    expect(cleared.c).toBe(3);

    const q = await app.inject({ method: 'GET', url: '/api/queue?page_size=100' });
    expect(q.json().data.find((r: any) => r.shipment_id === 'SHP-2026-0007')).toBeUndefined();
    const qCleared = await app.inject({
      method: 'GET',
      url: '/api/queue?include_cleared=true&page_size=100',
    });
    expect(qCleared.json().data.find((r: any) => r.shipment_id === 'SHP-2026-0007')).toBeTruthy();
  });

  it('G-REC: subset / made-up / extra id → 409 EXCEPTION_SET_STALE, nothing written', async () => {
    const before = actionCount('case-0007');
    for (const ids of [
      ['exc-0007-1-0', 'exc-0007-1-1'],
      ['exc-0007-1-0', 'exc-0007-1-1', 'made-up'],
      ['exc-0007-1-0', 'exc-0007-1-1', 'exc-0007-1-2', 'extra'],
    ]) {
      const res = await post('case-0007', {
        action: 'CLEAR_EXCEPTION',
        justification: J40,
        exception_ids: ids,
        resolution_basis: 'EXCEPTIONS_RESOLVED',
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('EXCEPTION_SET_STALE');
      expect(res.json().error.details).toHaveProperty('expected');
      expect(res.json().error.details).toHaveProperty('actual');
    }
    expect(statusOf('case-0007')).toBe('NEW');
    expect(actionCount('case-0007')).toBe(before);
  });

  it('40-char floor: EXCEPTIONS_ACCEPTED with 39 chars → 422, with 40 → 201', async () => {
    const ids = ['exc-0007-1-0', 'exc-0007-1-1', 'exc-0007-1-2'];
    const j39 = 'x'.repeat(39);
    const short = await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: j39,
      exception_ids: ids,
      resolution_basis: 'EXCEPTIONS_ACCEPTED',
    });
    expect(short.statusCode).toBe(422);
    expect(short.json().error.code).toBe('JUSTIFICATION_REQUIRED');

    const ok = await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: 'x'.repeat(40),
      exception_ids: ids,
      resolution_basis: 'EXCEPTIONS_ACCEPTED',
    });
    expect(ok.statusCode).toBe(201);
  });

  it('G-DOC and G-DUP and G-ALREADY-RECEIVED, plus requested populated after request', async () => {
    // successful request moves case to AWAITING_INFORMATION
    const req1 = await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: J,
      document_types: ['CERTIFICATE_OF_ORIGIN'],
    });
    expect(req1.statusCode).toBe(201);
    expect(statusOf('case-0007')).toBe('AWAITING_INFORMATION');

    // unlisted type rejected
    const unlisted = await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: J,
      document_types: ['SOME_UNLISTED_DOC'],
    });
    expect(unlisted.statusCode).toBe(422);
    expect(unlisted.json().error.code).toBe('DOCUMENT_TYPE_NOT_REQUIRED');

    // unlisted with justify + 25 chars passes
    const unlistedOk = await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: 'x'.repeat(25),
      document_types: ['ANOTHER_UNLISTED_DOC'],
      justify_unlisted_document: true,
    });
    expect(unlistedOk.statusCode).toBe(201);

    // requesting CERTIFICATE_OF_ORIGIN again → duplicate
    const dup = await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: J,
      document_types: ['CERTIFICATE_OF_ORIGIN'],
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('DUPLICATE_DOCUMENT_REQUEST');

    // requesting an already-received type → already received
    const received = await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: J,
      document_types: ['BILL_OF_LADING'],
    });
    expect(received.statusCode).toBe(409);
    expect(received.json().error.code).toBe('DOCUMENT_ALREADY_RECEIVED');

    // documents panel shows requested on the certificate
    const docs = await app.inject({ method: 'GET', url: '/api/shipments/SHP-2026-0007/documents' });
    const coo = docs.json().data.find((d: any) => d.document_type === 'CERTIFICATE_OF_ORIGIN');
    expect(coo.requested).toBeTruthy();
    expect(coo.requested.requested_by.id).toBe('usr-cs-001');
  });

  it('G-ACK: clear from AWAITING_INFORMATION with an outstanding request needs acknowledgement', async () => {
    await post('case-0007', {
      action: 'REQUEST_INFORMATION',
      justification: J,
      document_types: ['CERTIFICATE_OF_ORIGIN'],
    });
    const ids = ['exc-0007-1-0', 'exc-0007-1-1', 'exc-0007-1-2'];
    const noAck = await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: J40,
      exception_ids: ids,
      resolution_basis: 'EXCEPTIONS_RESOLVED',
    });
    expect(noAck.statusCode).toBe(422);
    expect(noAck.json().error.code).toBe('OUTSTANDING_REQUESTS_NOT_ACKNOWLEDGED');

    const withAck = await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: J40,
      exception_ids: ids,
      resolution_basis: 'EXCEPTIONS_RESOLVED',
      acknowledge_outstanding_requests: true,
    });
    expect(withAck.statusCode).toBe(201);
  });

  it('wrong-shape bodies: non-user action, cross-schema property, unknown property', async () => {
    const notAction = await post('case-0001', { action: 'APPROVE_CLEARANCE', justification: J });
    expect(notAction.statusCode).toBe(422);
    expect(['ACTION_NOT_A_USER_ACTION', 'VALIDATION_FAILED']).toContain(notAction.json().error.code);

    const crossSchema = await post('case-0001', {
      action: 'ESCALATE_TO_SUPERVISOR',
      justification: J,
      escalation_reason: 'POLICY_AMBIGUITY',
      hold_reason: 'RESOURCE_CONSTRAINT',
    });
    expect(crossSchema.statusCode).toBe(422);
    expect(crossSchema.json().error.code).toBe('VALIDATION_FAILED');

    const unknownProp = await post('case-0001', {
      action: 'SEND_FOR_SPECIALIST_REVIEW',
      justification: J,
      wat: 1,
    });
    expect(unknownProp.statusCode).toBe(422);
  });

  it('concurrency + replay', async () => {
    // stale case version
    const stale = await post(
      'case-0001',
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J },
      { 'if-match-case-version': '1' },
    );
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('CASE_VERSION_CONFLICT');
    expect(statusOf('case-0001')).toBe('NEW');

    // idempotent replay: same key + body returns the original, creates no 2nd row
    const before = actionCount('case-0001');
    const first = await post(
      'case-0001',
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J },
      { 'idempotency-key': 'demo-key-1' },
    );
    expect(first.statusCode).toBe(201);
    const replay = await post(
      'case-0001',
      { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J },
      { 'idempotency-key': 'demo-key-1' },
    );
    expect(replay.statusCode).toBe(201);
    expect(replay.json().action_id).toBe(first.json().action_id);
    expect(actionCount('case-0001')).toBe(before + 1);

    // same key, different body → reuse conflict
    const conflict = await post(
      'case-0001',
      { action: 'PLACE_ON_HOLD', justification: J, hold_reason: 'RESOURCE_CONSTRAINT' },
      { 'idempotency-key': 'demo-key-1' },
    );
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('available-actions track state; cleared case is all-terminal', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/cases/case-0007/available-actions',
    });
    expect(before.json().actions).toHaveLength(5);

    await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: J40,
      exception_ids: ['exc-0007-1-0', 'exc-0007-1-1', 'exc-0007-1-2'],
      resolution_basis: 'MIXED',
    });
    const after = await app.inject({
      method: 'GET',
      url: '/api/cases/case-0007/available-actions',
    });
    const actions = after.json().actions;
    expect(actions).toHaveLength(5);
    for (const a of actions) {
      expect(a.available).toBe(false);
      expect(a.reason).toBe('CASE_TERMINAL');
      expect(a.reason_text).toBeTruthy();
    }
  });

  it('human authority: exactly one UPDATE cases SET status across src/, in workflowRepository', () => {
    const root = join(process.cwd(), 'src');
    let matches = 0;
    let matchFile = '';
    const walk = (path: string): void => {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const full = join(path, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.ts')) {
          const content = readFileSync(full, 'utf8');
          const found = content.match(/UPDATE\s+cases\s+SET\s+status/gi);
          if (found) {
            matches += found.length;
            matchFile = full;
          }
        }
      }
    };
    walk(root);
    expect(matches).toBe(1);
    expect(matchFile.replace(/\\/g, '/')).toContain(
      'src/infra/db/repositories/workflowRepository.ts',
    );
  });

  it('scope check: excluded tables all have 0 rows after the action suite', async () => {
    await post('case-0001', { action: 'SEND_FOR_SPECIALIST_REVIEW', justification: J });
    await post('case-0007', {
      action: 'CLEAR_EXCEPTION',
      justification: J40,
      exception_ids: ['exc-0007-1-0', 'exc-0007-1-1', 'exc-0007-1-2'],
      resolution_basis: 'MIXED',
    });
    for (const t of [
      'audit_entries',
      'notifications',
      'approvals',
      'recommendations',
      'document_requests',
      'ai_outputs',
      'sessions',
    ]) {
      const c = (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c;
      expect(c, t).toBe(0);
    }
  });
});
