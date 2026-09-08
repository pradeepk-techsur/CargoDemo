/**
 * The configuration-driven rule engine (F04 §Process steps 3-7). PURE — no
 * database, no filesystem, no clock, no network. `node:crypto` is permitted for
 * the fingerprint.
 *
 * The ordering `(exception_type ASC, SEVERITY_RANK DESC, rule_id ASC)` is BINDING
 * — it is the persisted finding order and the display order and never varies
 * between runs. Severity is ranked, not string-sorted (see <scope_boundary> in
 * the plan: a string sort gives MEDIUM > LOW > HIGH > CRITICAL, which is wrong).
 */

import { createHash } from 'node:crypto';

import type {
  EntrySnapshot,
  EvaluationResult,
  Evaluator,
  Finding,
  InvalidRule,
  RuleDefinition,
  Severity,
  SkippedRule,
} from './types.js';
import type { ExceptionType } from '../../shared/types/db.js';
import { validateParams } from './schemas.js';
import { evaluateConditions } from './conditions.js';
import { evaluateHtsCode } from './evaluators/htsCode.js';
import { evaluateCountryOfOrigin, FieldPathError } from './evaluators/countryOfOrigin.js';
import { evaluateMissingDocument } from './evaluators/missingDocument.js';

export const SEVERITY_RANK: Record<Severity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

// Closed evaluator registry — no registration API. An unknown exception_type is
// recorded as EXCEPTION_TYPE_UNSUPPORTED, never dispatched.
const EVALUATORS: Record<ExceptionType, Evaluator> = {
  MISSING_REQUIRED_DOCUMENT: evaluateMissingDocument,
  INVALID_HTS_CODE: evaluateHtsCode,
  CONFLICTING_COUNTRY_OF_ORIGIN: evaluateCountryOfOrigin,
};

const SUPPORTED_TYPES = new Set<string>(Object.keys(EVALUATORS));

/** SHA-256 hex over the ordered (rule_id, version, enabled) tuples. */
export function ruleSetFingerprint(rules: RuleDefinition[]): string {
  const ordered = [...rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const material = ordered
    .map((r) => `${r.id}:${r.version}:${r.enabled ? 1 : 0}`)
    .join('\n');
  return createHash('sha256').update(material).digest('hex');
}

function compareRules(a: RuleDefinition, b: RuleDefinition): number {
  if (a.exception_type !== b.exception_type) {
    return a.exception_type < b.exception_type ? -1 : 1;
  }
  const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]; // DESC
  if (rankDiff !== 0) return rankDiff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Evaluate `entry` against `rules`. Never mutates `entry`, its documents or the
 * rule set. Disabled rules never fire; an invalid rule never prevents others
 * from evaluating.
 */
export function evaluateEntry(
  entry: EntrySnapshot,
  rules: RuleDefinition[],
): EvaluationResult {
  const started = hrNow();

  const fingerprint = ruleSetFingerprint(rules);

  const enabled = rules.filter((r) => r.enabled).sort(compareRules);

  const findings: Finding[] = [];
  const skipped_rules: SkippedRule[] = [];
  const invalid_rules: InvalidRule[] = [];

  for (const rule of enabled) {
    // Closed-map dispatch guard.
    if (!SUPPORTED_TYPES.has(rule.exception_type)) {
      invalid_rules.push({
        rule_id: rule.id,
        code: 'EXCEPTION_TYPE_UNSUPPORTED',
        detail: `unsupported exception type ${rule.exception_type}`,
      });
      continue;
    }

    // Parameter schema validation on load.
    const validated = validateParams(rule.exception_type, rule.params);
    if (!validated.ok) {
      invalid_rules.push({
        rule_id: rule.id,
        code: 'RULE_CONFIG_INVALID',
        detail: validated.detail,
      });
      continue;
    }
    const effectiveRule: RuleDefinition = { ...rule, params: validated.params };

    // Applicability conditions.
    const cond = evaluateConditions(entry, effectiveRule.conditions);
    if ('error' in cond) {
      invalid_rules.push({
        rule_id: rule.id,
        code: 'RULE_CONFIG_INVALID',
        detail: cond.detail,
      });
      continue;
    }
    if (!cond.applicable) {
      skipped_rules.push({
        rule_id: rule.id,
        condition: cond.condition,
        expected: cond.expected,
        actual: cond.actual,
        result: 'NOT_APPLICABLE',
      });
      continue;
    }

    // Dispatch.
    const evaluator = EVALUATORS[effectiveRule.exception_type];
    try {
      const finding = evaluator(entry, effectiveRule);
      if (finding) findings.push(finding);
    } catch (err) {
      if (err instanceof FieldPathError) {
        invalid_rules.push({
          rule_id: rule.id,
          code: 'RULE_PARAM_PATH_UNKNOWN',
          detail: `Field path ${err.path} is not a recognized origin-bearing field`,
        });
        continue;
      }
      throw err;
    }
  }

  // Findings are already in engine order because `enabled` is sorted and each
  // evaluator emits at most one finding per rule.
  const duration_ms = Math.max(0, hrNow() - started);

  return {
    cargo_entry_id: entry.id,
    findings,
    skipped_rules,
    invalid_rules,
    rule_set_fingerprint: fingerprint,
    duration_ms,
  };
}

function hrNow(): number {
  // Monotonic-ish millisecond reading. Not a wall clock — used only for
  // duration measurement, never persisted as a timestamp.
  return Number(process.hrtime.bigint() / 1_000_000n);
}
