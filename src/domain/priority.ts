/**
 * Deterministic priority derivation (F05 §Process step 6). PURE — a pure
 * function of its inputs. Never reads the clock; `now` is a parameter (the
 * SeedClock instant during seeding, keeping seeded priorities deterministic).
 *
 * Algorithm, in order:
 *  1. base = max severity across OPEN exceptions by SEVERITY_RANK; none => LOW
 *  2. VALUE_ESCALATION:        shipment_value_cents >= 5000000  ($50,000) => +1
 *  3. MULTIPLICITY_ESCALATION: open_exception_count >= 3                  => +1
 *  4. AGE_ESCALATION:          oldest opened_at > 7 days before `now`     => +1
 *  5. clamp at CRITICAL; every applied step (incl an absorbed CLAMP) is recorded
 */

import type { CasePriority, Severity } from '../shared/types/db.js';
import type { PriorityBasisEntry } from '../shared/types/detection.js';
import { SEVERITY_RANK } from './rules/engine.js';

const LADDER: CasePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALUE_THRESHOLD_CENTS = 5_000_000; // $50,000
const MULTIPLICITY_THRESHOLD = 3;
const AGE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DerivePriorityInput {
  /** severities of OPEN exceptions, AFTER each rule's priority_mapping */
  severities: Severity[];
  shipment_value_cents: number;
  open_exception_count: number;
  oldest_opened_at: string | null; // ISO-8601 UTC
  now: string; // ISO-8601 UTC (SeedClock during seeding)
}

export interface DerivePriorityResult {
  priority: CasePriority;
  basis: PriorityBasisEntry[];
}

function rankToPriority(rank: number): CasePriority {
  const clamped = Math.max(0, Math.min(LADDER.length - 1, rank));
  return LADDER[clamped]!;
}

function priorityRank(p: CasePriority): number {
  return LADDER.indexOf(p);
}

export function derivePriority(input: DerivePriorityInput): DerivePriorityResult {
  const basis: PriorityBasisEntry[] = [];

  // 1. base severity
  if (input.severities.length === 0) {
    return {
      priority: 'LOW',
      basis: [
        {
          factor: 'BASE_SEVERITY',
          detail: 'No open exceptions',
          from: 'LOW',
          to: 'LOW',
        },
      ],
    };
  }

  let current = input.severities.reduce<Severity>((acc, s) => {
    return SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc;
  }, input.severities[0]!);

  let priority: CasePriority = current as CasePriority;
  basis.push({
    factor: 'BASE_SEVERITY',
    detail: `Highest open-exception severity is ${current}`,
    from: priority,
    to: priority,
  });

  const escalate = (factor: PriorityBasisEntry['factor'], detail: string): void => {
    const from = priority;
    const targetRank = priorityRank(priority) + 1;
    if (targetRank > LADDER.length - 1) {
      // absorbed by the CRITICAL ceiling
      basis.push({ factor, detail, from, to: 'CRITICAL' });
      basis.push({
        factor: 'CLAMP',
        detail: `${factor} absorbed by CRITICAL ceiling`,
        from: 'CRITICAL',
        to: 'CRITICAL',
      });
      priority = 'CRITICAL';
      return;
    }
    const to = rankToPriority(targetRank);
    basis.push({ factor, detail, from, to });
    priority = to;
  };

  // 2. value escalation
  if (input.shipment_value_cents >= VALUE_THRESHOLD_CENTS) {
    escalate(
      'VALUE_ESCALATION',
      `Shipment value ${(input.shipment_value_cents / 100).toFixed(2)} >= 50000`,
    );
  }

  // 3. multiplicity escalation
  if (input.open_exception_count >= MULTIPLICITY_THRESHOLD) {
    escalate(
      'MULTIPLICITY_ESCALATION',
      `${input.open_exception_count} open exceptions >= ${MULTIPLICITY_THRESHOLD}`,
    );
  }

  // 4. age escalation
  if (input.oldest_opened_at != null) {
    const opened = Date.parse(input.oldest_opened_at);
    const nowMs = Date.parse(input.now);
    if (!Number.isNaN(opened) && !Number.isNaN(nowMs) && nowMs - opened > AGE_THRESHOLD_MS) {
      escalate('AGE_ESCALATION', `Oldest exception opened more than 7 days before ${input.now}`);
    }
  }

  return { priority, basis };
}
