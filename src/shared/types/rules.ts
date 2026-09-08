/**
 * Public rule-engine types re-exported for later waves.
 *
 * Wave 3 imports the engine's I/O contract from here rather than reaching into
 * `src/domain/rules/*` — keeping the domain layer's import graph closed. These
 * are the exact interfaces `src/domain/rules/engine.ts` produces.
 */

export type {
  ExceptionType,
  Severity,
  EvidenceKind,
  RuleDefinition,
  DocumentSnapshot,
  EntrySnapshot,
  MissingInformationItem,
  EvidenceDraft,
  Finding,
  SkippedRule,
  InvalidRule,
  InvalidRuleCode,
  EvaluationResult,
  Evaluator,
} from '../../domain/rules/types.js';
