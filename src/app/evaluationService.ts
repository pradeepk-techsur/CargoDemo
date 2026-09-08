/**
 * Exception detection service (F05). Turns the rule engine's findings into
 * persisted `evaluations`, `exceptions` and `evidence` rows, derives priority
 * and queue membership, and publishes the case projection — all inside ONE
 * transaction so a failure leaves nothing partial (T-02-08).
 *
 * Recorded scope deviations (see 02-PLAN.md <scope_boundary>): no audit row, no
 * AI-cache invalidation, forward-only reconciliation (prior OPEN exceptions are
 * marked SUPERSEDED_BY_EVALUATION; RESOLVED_BY_REVALIDATION is never written),
 * and detection never mutates cases.status.
 */

import type { Db } from '../infra/db/connection.js';
import { repositories } from '../infra/db/index.js';
import type {
  CargoEntryRow,
  DocumentRow,
  EvaluationRow,
  ExceptionRow,
  EvidenceRow,
  RuleRow,
  Severity,
  CasePriority,
} from '../shared/types/db.js';
import type {
  EntrySnapshot,
  RuleDefinition,
  Finding,
  EvidenceDraft,
  EvaluationResult,
} from '../shared/types/rules.js';
import type { PriorityBasisEntry } from '../shared/types/detection.js';
import { evaluateEntry } from '../domain/rules/engine.js';
import { derivePriority } from '../domain/priority.js';
import { SystemClock, type Clock } from '../infra/clock.js';
import { UuidGenerator, DeterministicIdGenerator, type IdGenerator } from '../infra/ids.js';

const MAX_RAW_VALUE = 2000;
const TRUNCATION_MARKER = '…(truncated)';
const VALID_PRIORITIES = new Set<string>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export class DetectionError extends Error {
  constructor(code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'DetectionError';
  }
}

export interface DetectionActor {
  user_id: string | null;
  role: 'CARGO_SPECIALIST' | 'SUPERVISOR' | 'SYSTEM_ADMINISTRATOR' | null;
  actor_kind: 'HUMAN' | 'SYSTEM';
}

export interface DetectionInput {
  cargoEntryId: string;
  trigger: 'INGESTION' | 'MANUAL_REVALIDATION' | 'DOCUMENT_UPLOAD' | 'RULE_CHANGE' | 'SEED';
  actor: DetectionActor;
}

export interface DetectionDeps {
  clock?: Clock;
  ids?: IdGenerator;
}

export interface DetectionResult {
  evaluation_id: string;
  version: number;
  opened: string[];
  retained: string[];
  resolved: string[];
  superseded: string[];
  priority: CasePriority;
  priority_basis: PriorityBasisEntry[];
  open_exception_count: number;
  exception_type_summary: string;
  queued: 0 | 1;
  skipped_rules: EvaluationResult['skipped_rules'];
  invalid_rules: EvaluationResult['invalid_rules'];
}

const SEED_ACTOR: DetectionActor = { user_id: null, role: null, actor_kind: 'SYSTEM' };

// --- helpers -----------------------------------------------------------------

function toSnapshot(entry: CargoEntryRow, documents: DocumentRow[]): EntrySnapshot {
  return {
    id: entry.id,
    shipment_id: entry.shipment_id,
    product_description: entry.product_description,
    hts_code: entry.hts_code,
    country_of_origin: entry.country_of_origin,
    manufacturer_address_country: entry.manufacturer_address_country,
    shipment_value_cents: entry.shipment_value_cents,
    documents: documents.map((d) => ({
      document_type: d.document_type,
      status: d.status,
      filename: d.filename,
      storage_path: d.storage_path,
      superseded: d.superseded,
      stated_country: d.stated_country,
    })),
  };
}

function parseJson<T>(raw: string | null, fallback: T): { value: T; ok: boolean } {
  if (raw == null) return { value: fallback, ok: true };
  try {
    return { value: JSON.parse(raw) as T, ok: true };
  } catch {
    return { value: fallback, ok: false };
  }
}

/** Parse a RuleRow into a RuleDefinition; unparseable JSON => null (invalid). */
function toRuleDefinition(row: RuleRow): RuleDefinition | null {
  const conditions = parseJson<Record<string, unknown>>(row.conditions_json, {});
  const params = parseJson<Record<string, unknown>>(row.params_json, {});
  const mapping = parseJson<Partial<Record<Severity, Severity>> | null>(row.priority_mapping, null);
  if (!conditions.ok || !params.ok || !mapping.ok) return null;
  return {
    id: row.id,
    name: row.name,
    exception_type: row.exception_type,
    description: row.description,
    policy_reference: row.policy_reference,
    severity: row.severity,
    priority_mapping: mapping.value,
    conditions: conditions.value,
    params: params.value,
    enabled: row.enabled === 1,
    version: row.version,
  };
}

function truncate(raw: string | null): { value: string | null; truncated: 0 | 1 } {
  if (raw == null) return { value: null, truncated: 0 };
  if (raw.length <= MAX_RAW_VALUE) return { value: raw, truncated: 0 };
  const keep = MAX_RAW_VALUE - TRUNCATION_MARKER.length;
  return { value: raw.slice(0, keep) + TRUNCATION_MARKER, truncated: 1 };
}

/** Apply a rule's priority_mapping to a severity (identity when absent). */
function mappedSeverity(
  severity: Severity,
  mapping: Partial<Record<Severity, Severity>> | null,
): Severity {
  if (mapping && mapping[severity]) return mapping[severity]!;
  return severity;
}

// --- write-time validation gates (F05 §Validation) ---------------------------

function assertEvidenceGates(finding: Finding, evidence: EvidenceDraft[]): void {
  if (evidence.length === 0) {
    throw new DetectionError(
      'EXCEPTION_EVIDENCE_REQUIRED',
      `Exception ${finding.rule_id} produced no evidence and cannot be persisted`,
    );
  }
  if (finding.exception_type === 'MISSING_REQUIRED_DOCUMENT') {
    if (!evidence.some((e) => e.kind === 'MISSING')) {
      throw new DetectionError(
        'MISSING_INFORMATION_REQUIRED',
        'Missing-document exception must record the missing document types',
      );
    }
  }
  if (
    finding.exception_type === 'CONFLICTING_COUNTRY_OF_ORIGIN' &&
    finding.sub_reason === 'ORIGIN_MISMATCH'
  ) {
    const observed = evidence.find((e) => e.kind === 'OBSERVED' && e.normalized_value != null);
    const comparison = evidence.find(
      (e) => e.kind === 'COMPARISON' && e.comparison_normalized_value != null,
    );
    if (!observed || !comparison) {
      throw new DetectionError(
        'EXCEPTION_EVIDENCE_REQUIRED',
        'Origin-mismatch exception requires OBSERVED and COMPARISON rows with normalized values',
      );
    }
  }
  if (finding.exception_type === 'INVALID_HTS_CODE') {
    const observed = evidence.find((e) => e.kind === 'OBSERVED');
    if (!observed || observed.expected == null || observed.observed == null) {
      throw new DetectionError(
        'EXCEPTION_EVIDENCE_REQUIRED',
        'HTS exception requires an OBSERVED row with expected and observed populated',
      );
    }
  }
}

// --- detection ---------------------------------------------------------------

/**
 * Run detection for one cargo entry. Everything runs inside one transaction;
 * throws on failure, committing nothing partial.
 */
export function detectExceptions(
  db: Db,
  input: DetectionInput,
  deps: DetectionDeps = {},
): DetectionResult {
  const clock: Clock = deps.clock ?? new SystemClock();
  const ids: IdGenerator = deps.ids ?? new UuidGenerator();
  const deterministic = deps.ids instanceof DeterministicIdGenerator;
  const repos = repositories(db);

  const run = db.transaction((): DetectionResult => {
    const now = clock.now();

    // 1. Load entry, documents, rules and build the snapshot + RuleDefinitions.
    const entry = repos.cargo.getById(input.cargoEntryId);
    if (!entry) {
      throw new DetectionError('RESOURCE_NOT_FOUND', `Shipment ${input.cargoEntryId} not found`);
    }
    const documents = repos.documents.listByEntry(input.cargoEntryId);
    const ruleRows = repos.rules.listAll();

    const jsonInvalid: EvaluationResult['invalid_rules'] = [];
    const rules: RuleDefinition[] = [];
    const mappingById = new Map<string, Partial<Record<Severity, Severity>> | null>();
    for (const row of ruleRows) {
      const def = toRuleDefinition(row);
      if (def == null) {
        jsonInvalid.push({
          rule_id: row.id,
          code: 'RULE_CONFIG_INVALID',
          detail: 'rule JSON columns did not parse',
        });
        continue;
      }
      rules.push(def);
      mappingById.set(def.id, def.priority_mapping);
    }

    const snapshot = toSnapshot(entry, documents);

    // 2. Evaluate.
    const result = evaluateEntry(snapshot, rules);
    const invalidRules = [...jsonInvalid, ...result.invalid_rules];

    // 3. Resolve the case.
    const caseRow = repos.cases.getByCargoEntryId(input.cargoEntryId);
    if (!caseRow) {
      throw new DetectionError(
        'RESOURCE_NOT_FOUND',
        `Case for shipment ${entry.shipment_id} not found`,
      );
    }

    // Prior evaluation (for supersede + carry-forward).
    const priorEval = repos.evaluations.getCurrentForEntry(input.cargoEntryId);
    const priorOpen: ExceptionRow[] = priorEval
      ? repos.exceptions
          .listByEvaluation(priorEval.id)
          .filter((x) => x.status === 'OPEN')
      : [];
    const priorByRule = new Map<string, ExceptionRow>();
    for (const x of priorOpen) priorByRule.set(x.rule_id, x);

    // 4. Version (inside txn).
    const version = repos.evaluations.nextVersion(input.cargoEntryId);

    // Deterministic id sequencing derives from the entry so ids are stable
    // regardless of iteration order.
    const entrySeq = entry.id.replace(/^ent-/, '');
    const evaluationId = deterministic ? `eval-${entrySeq}-${version}` : ids.next();

    // 5. Insert the evaluation row.
    const evaluationRow: EvaluationRow = {
      id: evaluationId,
      cargo_entry_id: entry.id,
      case_id: caseRow.id,
      version,
      trigger: input.trigger,
      rule_set_fingerprint: result.rule_set_fingerprint,
      skipped_rules_json: JSON.stringify(result.skipped_rules),
      invalid_rules_json: JSON.stringify(invalidRules),
      finding_count: result.findings.length,
      // Under deterministic mode (seed/tests) the wall-independent duration is
      // pinned to 0 so two reseeds produce byte-identical evaluation rows
      // (the must-have determinism contract). Live evaluations record the real
      // measured duration.
      duration_ms: deterministic ? 0 : result.duration_ms,
      actor_kind: input.actor.actor_kind,
      actor_user_id: input.actor.user_id,
      evaluated_at: now,
    };
    repos.evaluations.insert(evaluationRow);

    // 6. Supersede prior OPEN exceptions (history preserved).
    const superseded: string[] = [];
    for (const x of priorOpen) {
      repos.exceptions.markSuperseded(x.id, null, now);
      superseded.push(x.id);
    }

    // 7 + 8. Insert exceptions and their evidence.
    const opened: string[] = [];
    const retained: string[] = [];
    const openSeverities: Severity[] = [];
    const openTypes = new Set<string>();
    let oldestOpenedAt: string | null = null;

    result.findings.forEach((finding, findingIndex) => {
      const exceptionId = deterministic
        ? `exc-${entrySeq}-${version}-${findingIndex}`
        : ids.next();

      const prior = priorByRule.get(finding.rule_id);
      const firstDetected = prior ? prior.first_detected_evaluation_id : evaluationId;
      const openedAt = prior ? prior.opened_at : now;

      // 9. Write-time gates (before insert so a bad finding rolls everything back).
      assertEvidenceGates(finding, finding.evidence);

      const exceptionRow: ExceptionRow = {
        id: exceptionId,
        evaluation_id: evaluationId,
        cargo_entry_id: entry.id,
        case_id: caseRow.id,
        rule_id: finding.rule_id,
        rule_version: finding.rule_version,
        exception_type: finding.exception_type,
        sub_reason: finding.sub_reason,
        severity: finding.severity,
        status: 'OPEN',
        assertion: finding.assertion,
        missing_information_json: JSON.stringify(finding.missing_information),
        first_detected_evaluation_id: firstDetected,
        opened_at: openedAt,
        resolved_at: null,
        resolved_by_evaluation_id: null,
        resolution_reason: null,
        superseded_by_exception_id: null,
        cleared_by_approval_id: null,
        created_at: now,
      };
      repos.exceptions.insert(exceptionRow);
      opened.push(exceptionId);
      if (prior) retained.push(exceptionId);

      finding.evidence.forEach((draft, order) => {
        const t = truncate(draft.raw_value);
        const evidenceId = deterministic
          ? `evd-${entrySeq}-${version}-${findingIndex}-${draft.display_order}`
          : ids.next();
        const evidenceRow: EvidenceRow = {
          id: evidenceId,
          exception_id: exceptionId,
          kind: draft.kind,
          field_path: draft.field_path,
          raw_value: t.value,
          normalized_value: draft.normalized_value,
          comparison_field_path: draft.comparison_field_path,
          comparison_raw_value: draft.comparison_raw_value,
          comparison_normalized_value: draft.comparison_normalized_value,
          expected: draft.expected,
          observed: draft.observed,
          assertion: draft.assertion,
          truncated: t.truncated,
          display_order: draft.display_order,
          created_at: now,
        };
        void order;
        repos.evidence.insert(evidenceRow);
      });

      // Accumulate for priority derivation (mapped severity).
      openSeverities.push(mappedSeverity(finding.severity, mappingById.get(finding.rule_id) ?? null));
      openTypes.add(finding.exception_type);
      if (oldestOpenedAt == null || openedAt < oldestOpenedAt) oldestOpenedAt = openedAt;
    });

    // 10. Derive priority and publish the case projection.
    const openExceptionCount = opened.length;
    const { priority, basis } = derivePriority({
      severities: openSeverities,
      shipment_value_cents: entry.shipment_value_cents,
      open_exception_count: openExceptionCount,
      oldest_opened_at: oldestOpenedAt,
      now,
    });

    if (!VALID_PRIORITIES.has(priority)) {
      throw new DetectionError(
        'PRIORITY_DERIVATION_FAILED',
        `Derived priority ${priority} is not a supported priority`,
      );
    }

    const exceptionTypeSummary = [...openTypes].sort().join(',');
    const queued: 0 | 1 = openExceptionCount > 0 ? 1 : 0;

    repos.cases.updateProjection({
      case_id: caseRow.id,
      priority,
      queued,
      open_exception_count: openExceptionCount,
      exception_type_summary: exceptionTypeSummary,
      current_evaluation_id: evaluationId,
      priority_basis_json: JSON.stringify(basis),
      updated_at: now,
    });

    // 11. Return.
    return {
      evaluation_id: evaluationId,
      version,
      opened,
      retained,
      resolved: [],
      superseded,
      priority,
      priority_basis: basis,
      open_exception_count: openExceptionCount,
      exception_type_summary: exceptionTypeSummary,
      queued,
      skipped_rules: result.skipped_rules,
      invalid_rules: invalidRules,
    };
  });

  return run();
}

/**
 * The hook wave 1's seed accepts. Closes over the trigger (default 'SEED'), the
 * clock and the id generator and returns `(db, cargoEntryId) => void` — the
 * exact shape SeedOptions.evaluate declares.
 */
export function createEvaluateHook(opts: {
  trigger?: DetectionInput['trigger'];
  clock?: Clock;
  ids?: IdGenerator;
} = {}): (db: Db, cargoEntryId: string) => void {
  const trigger = opts.trigger ?? 'SEED';
  return (db: Db, cargoEntryId: string): void => {
    detectExceptions(
      db,
      { cargoEntryId, trigger, actor: SEED_ACTOR },
      { clock: opts.clock, ids: opts.ids },
    );
  };
}
