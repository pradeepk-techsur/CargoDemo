---
phase: express-wave-2
plan: 02
type: execute
wave: 2
domain: backend
depends_on: [1]
autonomous: true
files_modified:
  - package.json
  - src/shared/types/rules.ts
  - src/shared/types/detection.ts
  - src/domain/rules/types.ts
  - src/domain/rules/normalize.ts
  - src/domain/rules/fieldPath.ts
  - src/domain/rules/conditions.ts
  - src/domain/rules/schemas.ts
  - src/domain/rules/evaluators/missingDocument.ts
  - src/domain/rules/evaluators/htsCode.ts
  - src/domain/rules/evaluators/countryOfOrigin.ts
  - src/domain/rules/engine.ts
  - src/domain/priority.ts
  - src/infra/db/repositories/evaluationRepository.ts
  - src/infra/db/repositories/exceptionRepository.ts
  - src/infra/db/repositories/evidenceRepository.ts
  - src/infra/db/index.ts
  - src/app/evaluationService.ts
  - src/app/seedService.ts
  - scripts/seed.ts
  - tests/unit/rules.normalize.test.ts
  - tests/unit/rules.evaluators.test.ts
  - tests/unit/rules.engine.test.ts
  - tests/unit/priority.test.ts
  - tests/integration/detection.test.ts
  - tests/integration/seed-detection.test.ts

features:
  implements: ["F4", "F5"]
  depends_on: ["F0", "F2"]
  enables: ["F3", "F9", "F17", "F18"]

must_haves:
  truths:
    - "Every business rule is read from the `rules` table as data; changing a rule row changes validation output with no code change."
    - "Exactly three exception types can ever be produced; a rules row declaring a fourth is reported, not executed."
    - "The canonical shipment SHP-2026-0007 produces exactly three OPEN exceptions: one missing required document, one invalid/incomplete HTS code, one conflicting country-of-origin."
    - "Every persisted exception carries at least one evidence row with concrete field paths and values, never prose."
    - "A missing-document exception records which document types are missing, as structured missing_information."
    - "The clean shipment SHP-2026-0011 produces zero exceptions and stays off the queue (queued = 0)."
    - "After a fresh `npm run migrate && npm run seed`, the exceptions and evidence tables are non-empty and every seeded shipment's detected exception types equal its declared expected_exception_types."
    - "Two consecutive force-reseeds produce byte-identical evaluations, exceptions and evidence rows."
    - "A disabled rule never produces a finding; an invalid rule definition is recorded and the other rules still evaluate."
    - "Case priority is derived deterministically from severity, shipment value, exception count and age, and the derivation is explained in priority_basis_json."
  artifacts:
    - path: "src/domain/rules/engine.ts"
      provides: "Deterministic, configuration-driven evaluation with stable ordering and rule_set_fingerprint"
      exports: ["evaluateEntry", "ruleSetFingerprint", "SEVERITY_RANK"]
    - path: "src/domain/rules/evaluators/missingDocument.ts"
      provides: "MISSING_REQUIRED_DOCUMENT evaluator (FRD F04 §6)"
      exports: ["evaluateMissingDocument"]
    - path: "src/domain/rules/evaluators/htsCode.ts"
      provides: "INVALID_HTS_CODE ordered checks (FRD F04 §4)"
      exports: ["evaluateHtsCode"]
    - path: "src/domain/rules/evaluators/countryOfOrigin.ts"
      provides: "CONFLICTING_COUNTRY_OF_ORIGIN evaluator (FRD F04 §5)"
      exports: ["evaluateCountryOfOrigin"]
    - path: "src/domain/priority.ts"
      provides: "Pure priority derivation with recorded basis (FRD F05 §Process step 6)"
      exports: ["derivePriority"]
    - path: "src/app/evaluationService.ts"
      provides: "Detection: persists evaluation, exceptions, evidence and the case projection"
      exports: ["detectExceptions", "createEvaluateHook"]
    - path: "tests/integration/seed-detection.test.ts"
      provides: "Proof that migrate+seed leaves real exception rows behind, matching fixture expectations"
      contains: "SHP-2026-0007"
  key_links:
    - from: "scripts/seed.ts"
      to: "src/app/evaluationService.ts"
      via: "createEvaluateHook() passed as SeedOptions.evaluate so the seed populates exceptions"
      pattern: "createEvaluateHook"
    - from: "src/app/evaluationService.ts"
      to: "src/domain/rules/engine.ts"
      via: "detectExceptions calls evaluateEntry with rows loaded from the rules table"
      pattern: "evaluateEntry"
    - from: "src/domain/rules/engine.ts"
      to: "rules.params_json"
      via: "every threshold, list and field path is read from the rule row, never hardcoded"
      pattern: "params"
    - from: "src/app/evaluationService.ts"
      to: "caseRepository.updateProjection"
      via: "recomputed priority, queued, open_exception_count, exception_type_summary, current_evaluation_id"
      pattern: "updateProjection"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "src/infra/db/index.ts"
      exports: ["openDb", "runMigrations", "runSchemaSelfCheck", "runSeed", "initDatabase", "repositories"]
      verify: "grep -q 'runMigrations' src/infra/db/index.ts && grep -q 'runSeed' src/infra/db/index.ts && grep -q 'repositories' src/infra/db/index.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/infra/db/migrations/001_initial_schema.sql"
      exports:
        - "table evaluations(id, cargo_entry_id, case_id, version, trigger, rule_set_fingerprint, skipped_rules_json, invalid_rules_json, finding_count, duration_ms, actor_kind, actor_user_id, evaluated_at)"
        - "table exceptions(id, evaluation_id, cargo_entry_id, case_id, rule_id, rule_version, exception_type, sub_reason, severity, status, assertion, missing_information_json, first_detected_evaluation_id, opened_at, resolved_at, resolved_by_evaluation_id, resolution_reason, superseded_by_exception_id, cleared_by_approval_id, created_at)"
        - "table evidence(id, exception_id, kind, field_path, raw_value, normalized_value, comparison_field_path, comparison_raw_value, comparison_normalized_value, expected, observed, assertion, truncated, display_order, created_at)"
        - "table rules(id, name, name_lower, exception_type, description, policy_reference, severity, priority_mapping, conditions_json, params_json, enabled, version, created_at, updated_at)"
        - "table cargo_entries(... hts_code, hts_code_normalized, country_of_origin, country_of_origin_iso2, manufacturer_address_country, manufacturer_address_country_iso2, shipment_value_cents ...)"
        - "table documents(... document_type, status, filename, storage_path, superseded, stated_country ...)"
        - "table cases(... status, priority, priority_basis_json, queued, current_evaluation_id, open_exception_count, exception_type_summary ...)"
      verify: "grep -q 'CREATE TABLE evaluations' src/infra/db/migrations/001_initial_schema.sql && grep -q 'rule_set_fingerprint' src/infra/db/migrations/001_initial_schema.sql && grep -q 'missing_information_json' src/infra/db/migrations/001_initial_schema.sql && grep -q 'CREATE TABLE evidence' src/infra/db/migrations/001_initial_schema.sql && grep -q 'shipment_value_cents' src/infra/db/migrations/001_initial_schema.sql && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/app/seedService.ts — the optional evaluate hook"
      exports: ["SeedOptions.evaluate?: (db: Database, cargoEntryId: string) => void", "runSeed", "SeedReport"]
      verify: "grep -q 'evaluate?:' src/app/seedService.ts && grep -q 'FORCE_RESEED' src/app/seedService.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "fixtures/rules.seed.json"
      exports: ["7 rule rows; 4 enabled (rule-doc-baseline, rule-doc-highvalue-coo, rule-hts-completeness, rule-origin-manufacturer); 3 disabled"]
      verify: "node -e \"const r=require('./fixtures/rules.seed.json');const a=Array.isArray(r)?r:r.rules;if(a.length!==7)process.exit(1);const on=a.filter(x=>x.enabled===1||x.enabled===true);if(on.length!==4)process.exit(1);if(!a.find(x=>x.id==='rule-origin-manufacturer'))process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "fixtures/cargo-entries.seed.json"
      exports: ["12 shipments with expected_exception_types[] — the contract this wave must reproduce", "SHP-2026-0007 canonical scenario", "SHP-2026-0011 clean shipment"]
      verify: "node -e \"const e=require('./fixtures/cargo-entries.seed.json');const a=Array.isArray(e)?e:e.shipments;const c=a.find(x=>x.shipment_id==='SHP-2026-0007');if(!c||!Array.isArray(c.expected_exception_types)||c.expected_exception_types.length!==3)process.exit(1);if(!a.every(x=>Array.isArray(x.expected_exception_types)))process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/infra/db/repositories/caseRepository.ts"
      exports: ["updateProjection", "getByCargoEntryId", "listQueued"]
      verify: "grep -q 'updateProjection' src/infra/db/repositories/caseRepository.ts && grep -q 'getByCargoEntryId' src/infra/db/repositories/caseRepository.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/shared/types/db.ts"
      exports: ["ExceptionType", "Severity", "CaseStatus", "CasePriority", "EvaluationTrigger", "ExceptionStatus", "CargoEntryRow", "DocumentRow", "RuleRow"]
      verify: "grep -q 'ExceptionType' src/shared/types/db.ts && grep -q 'CasePriority' src/shared/types/db.ts && grep -q 'EvaluationTrigger' src/shared/types/db.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json scripts"
      exports: ["npm run migrate", "npm run seed", "npm run seed:reset", "npm test"]
      verify: "node -e \"const s=require('./package.json').scripts; if(!s.migrate||!s.seed||!s['seed:reset']||!s.test) process.exit(1)\" && echo CONTRACT_OK"

  provides:
    - artifact: "src/domain/rules/engine.ts — the configuration-driven rule engine (pure)"
      exports: ["evaluateEntry", "ruleSetFingerprint", "SEVERITY_RANK"]
      shape: |
        // PURE. No database, no filesystem, no clock, no network. Import path: src/domain/rules/engine
        export const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;

        export function evaluateEntry(
          entry: EntrySnapshot,
          rules: RuleDefinition[],
        ): EvaluationResult;

        export function ruleSetFingerprint(rules: RuleDefinition[]): string; // sha256 hex over ordered (rule_id, version, enabled)

        // Ordering is BINDING and is the persisted + display order:
        //   (exception_type ASC alphabetical, severity DESC by SEVERITY_RANK, rule_id ASC)

        export interface EvaluationResult {
          cargo_entry_id: string;
          findings: Finding[];
          skipped_rules: { rule_id: string; condition: string; expected: string; actual: string; result: 'NOT_APPLICABLE' }[];
          invalid_rules: { rule_id: string; code: 'RULE_CONFIG_INVALID' | 'RULE_PARAM_PATH_UNKNOWN' | 'EXCEPTION_TYPE_UNSUPPORTED'; detail: string }[];
          rule_set_fingerprint: string;
          duration_ms: number;
        }

        export interface Finding {
          rule_id: string;
          rule_version: number;
          exception_type: 'MISSING_REQUIRED_DOCUMENT' | 'INVALID_HTS_CODE' | 'CONFLICTING_COUNTRY_OF_ORIGIN';
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          sub_reason: string;      // e.g. INCOMPLETE_DIGITS | ORIGIN_MISMATCH | DOCUMENT_NOT_RECEIVED
          assertion: string;       // one human-readable sentence, generated from evidence values
          evidence: EvidenceDraft[];
          missing_information: MissingInformationItem[];
        }
      verify: "grep -qE 'export function evaluateEntry' src/domain/rules/engine.ts && grep -q 'ruleSetFingerprint' src/domain/rules/engine.ts && grep -q 'SEVERITY_RANK' src/domain/rules/engine.ts && echo CONTRACT_OK"

    - artifact: "src/app/evaluationService.ts — the detection service waves 3-5 call"
      exports: ["detectExceptions", "createEvaluateHook"]
      shape: |
        // Import path: src/app/evaluationService
        import type { Database } from 'better-sqlite3';

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

        export interface DetectionDeps {           // omitted in production; injected for seeding/tests
          clock?: Clock;                            // SeedClock during seeding => deterministic timestamps
          ids?: IdGenerator;                        // DeterministicIdGenerator during seeding
        }

        // Runs inside ONE db.transaction(...)(). Throws on failure; nothing partial is committed.
        export function detectExceptions(
          db: Database,
          input: DetectionInput,
          deps?: DetectionDeps,
        ): DetectionResult;

        export interface DetectionResult {
          evaluation_id: string;
          version: number;
          opened: string[];        // exception ids created by this evaluation
          retained: string[];      // subset of `opened` whose rule_id also fired in the prior evaluation
          resolved: string[];      // always [] in this build — revalidation reconciliation is out of scope
          superseded: string[];    // prior-evaluation exception ids set to SUPERSEDED_BY_EVALUATION
          priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          priority_basis: PriorityBasisEntry[];
          open_exception_count: number;
          exception_type_summary: string;   // sorted distinct types joined by ',' — split on ',' to render
          queued: 0 | 1;
          skipped_rules: EvaluationResult['skipped_rules'];
          invalid_rules: EvaluationResult['invalid_rules'];
        }

        // The hook wave 1's seed accepts. scripts/seed.ts passes createEvaluateHook() so a
        // fresh migrate+seed leaves real evaluations/exceptions/evidence rows behind.
        export function createEvaluateHook(
          opts?: { trigger?: DetectionInput['trigger']; clock?: Clock; ids?: IdGenerator },
        ): (db: Database, cargoEntryId: string) => void;
      verify: "grep -qE 'export function detectExceptions' src/app/evaluationService.ts && grep -qE 'export function createEvaluateHook' src/app/evaluationService.ts && grep -q 'exception_type_summary' src/app/evaluationService.ts && echo CONTRACT_OK"

    - artifact: "The exception record shape waves 3-5 read (src/shared/types/detection.ts)"
      exports: ["ExceptionRecord", "EvidenceRecord", "MissingInformationItem", "PriorityBasisEntry", "EntrySnapshot", "RuleDefinition"]
      shape: |
        // BINDING projection. Wave 3 serves this from GET /api/shipments/{id}/exceptions;
        // wave 4 renders it. Property names equal the SQL column names (src/shared/types/db.ts).

        export interface ExceptionRecord {
          id: string;
          evaluation_id: string;
          cargo_entry_id: string;
          case_id: string;
          rule_id: string;
          rule_version: number;
          exception_type: 'MISSING_REQUIRED_DOCUMENT' | 'INVALID_HTS_CODE' | 'CONFLICTING_COUNTRY_OF_ORIGIN';
          sub_reason: string;
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          status: 'OPEN' | 'RESOLVED_BY_REVALIDATION' | 'CLEARED_BY_DECISION' | 'SUPERSEDED_BY_EVALUATION';
          assertion: string;                                  // e.g. "Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)"
          missing_information: MissingInformationItem[];      // parsed from exceptions.missing_information_json
          first_detected_evaluation_id: string;
          opened_at: string;                                  // ISO-8601 UTC with milliseconds
          created_at: string;
          evidence: EvidenceRecord[];                         // ordered by display_order ASC; ALWAYS length >= 1
          // Rule presentation fields, joined from `rules` so the review screen can name the authority:
          rule_name: string;
          rule_description: string;
          policy_reference: string;                           // e.g. "19 CFR 134.1"
        }

        export interface EvidenceRecord {
          id: string;
          kind: 'OBSERVED' | 'COMPARISON' | 'MISSING' | 'CONTEXT';
          field_path: string;                                 // e.g. "country_of_origin", "hts_code", "documents"
          raw_value: string | null;                           // "Malaysia"  — verbatim, never reformatted
          normalized_value: string | null;                    // "MY"
          comparison_field_path: string | null;               // "manufacturer.address.country"
          comparison_raw_value: string | null;                // "China"
          comparison_normalized_value: string | null;         // "CN"
          expected: string | null;                            // "10 digits"
          observed: string | null;                            // "6 digits"
          assertion: string | null;
          truncated: 0 | 1;
          display_order: number;
        }

        export interface MissingInformationItem {
          field_path: string | null;                          // "hts_code" for HTS; null for a document item
          document_type: string | null;                       // "CERTIFICATE_OF_ORIGIN" for a document item; null otherwise
          requirement: string;                                // "Certificate of Origin is required for shipments valued at or above $50,000"
          required_by_rule: string;                           // rule id
          policy_reference: string;
          observed_digits: number | null;                     // HTS only
          missing_digits: number | null;                      // HTS only
        }

        export interface PriorityBasisEntry {
          factor: 'BASE_SEVERITY' | 'VALUE_ESCALATION' | 'MULTIPLICITY_ESCALATION' | 'AGE_ESCALATION' | 'CLAMP';
          detail: string;
          from: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          to: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        }
      verify: "grep -q 'ExceptionRecord' src/shared/types/detection.ts && grep -q 'MissingInformationItem' src/shared/types/detection.ts && grep -q 'PriorityBasisEntry' src/shared/types/detection.ts && grep -q 'comparison_normalized_value' src/shared/types/detection.ts && echo CONTRACT_OK"

    - artifact: "Priority derivation and initial queue status (the rules wave 3/4 must not re-implement)"
      exports: ["derivePriority", "cases.priority", "cases.priority_basis_json", "cases.queued", "cases.status"]
      shape: |
        // src/domain/priority.ts — PURE, pure function of its inputs (FRD F05 §Process step 6).
        export function derivePriority(input: {
          severities: Severity[];              // severities of OPEN exceptions, AFTER each rule's priority_mapping
          shipment_value_cents: number;
          open_exception_count: number;
          oldest_opened_at: string | null;     // ISO-8601 UTC
          now: string;                         // ISO-8601 UTC (SeedClock during seeding)
        }): { priority: CasePriority; basis: PriorityBasisEntry[] };

        // Algorithm, in order:
        //  1. base = max severity across OPEN exceptions by SEVERITY_RANK; no OPEN exceptions => LOW
        //  2. VALUE_ESCALATION:        shipment_value_cents >= 5000000  (i.e. $50,000) => raise one level
        //  3. MULTIPLICITY_ESCALATION: open_exception_count >= 3        => raise one level
        //  4. AGE_ESCALATION:          oldest opened_at > 7 days before `now` => raise one level
        //  5. clamp at CRITICAL; every applied step is appended to `basis`
        //
        // INITIAL QUEUE STATUS set by detection:
        //  * cases.queued = open_exception_count > 0 ? 1 : 0     — the queue read filters on this
        //  * cases.status stays 'NEW' for a newly detected shipment with >= 1 OPEN exception
        //  * detection NEVER mutates cases.status on a case that already exists — the seven seeded
        //    statuses survive detection untouched. Status ownership belongs to the case workflow (wave 3).
        //  * cases.exception_type_summary = sorted distinct OPEN exception types joined by ','
        //  * cases.current_evaluation_id = the evaluation just written
      verify: "grep -qE 'export function derivePriority' src/domain/priority.ts && grep -q 'MULTIPLICITY_ESCALATION' src/domain/priority.ts && grep -q 'AGE_ESCALATION' src/domain/priority.ts && echo CONTRACT_OK"

    - artifact: "Populated-state guarantee — migrate + seed leaves real exception data behind"
      exports:
        - "scripts/seed.ts passes createEvaluateHook() into runSeed as SeedOptions.evaluate"
        - "after `npm run migrate && npm run seed`: exceptions > 0, evidence > 0, every exception has >= 1 evidence row"
        - "SHP-2026-0007 has exactly 3 OPEN exceptions, one per exception type"
        - "SHP-2026-0011 has 0 exceptions and cases.queued = 0"
        - "every seeded shipment's detected OPEN exception types equal its fixture expected_exception_types (asserted by the seed itself; mismatch throws SEED_COVERAGE_FAILED and rolls back)"
      shape: |
        # Wave 4's queue screen and wave 5's end-to-end run read REAL rows, not fixture expectations.
        # Wave 5 composes the runtime as: npm run migrate && npm run seed && <serve>
        # `npm run seed:reset` re-runs detection and produces byte-identical evaluation/exception/evidence rows.
      verify: "rm -rf data && npm run migrate >/dev/null && npm run seed >/dev/null && npx tsx -e \"import {openDb} from './src/infra/db/connection.ts'; const d=openDb(); const x=d.prepare('select count(*) c from exceptions').get().c; const v=d.prepare('select count(*) c from evidence').get().c; const k=d.prepare(\\\"select count(*) c from exceptions x join cargo_entries e on e.id=x.cargo_entry_id where e.shipment_id='SHP-2026-0007' and x.status='OPEN'\\\").get().c; const o=d.prepare('select count(*) c from exceptions x where not exists (select 1 from evidence v where v.exception_id=x.id)').get().c; if(x<1||v<1||k!==3||o!==0){console.error('exceptions',x,'evidence',v,'canonical',k,'orphans',o);process.exit(1)}\" && echo CONTRACT_OK"
---

<objective>
Implement the configuration-driven business rule engine and the exception-detection layer for
CargoDemo: three evaluators (missing required document, invalid/incomplete HTS code,
conflicting country-of-origin) whose every threshold, document list, digit count and
comparison field is read from `rules.params_json` as data, and the persistence layer that
turns their findings into `evaluations`, `exceptions` and `evidence` rows with derived
priority, queue membership and structured missing information.

Purpose: this is the wave that makes the demo real. Wave 1 seeded shipments and left
`evaluations`, `exceptions` and `evidence` empty behind an explicit `evaluate` hook. This
plan fills that hook, so a fresh `npm run migrate && npm run seed` produces a database in
which the exception queue has actual exceptions with actual evidence behind them — not
fixture expectations that later waves would render as a hollow demo.

Output: a pure `src/domain/rules/*` engine, a pure `src/domain/priority.ts`, an
`src/app/evaluationService.ts` detection service, three new repositories, and the seed wiring
that proves the whole thing populated the database.
</objective>

<feature_dependencies>
Implements: F4: Configurable Business Rule Engine, F5: Exception Detection, Evidence Capture & Flagging
Depends on: F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset (both wave 1)
Enables: F3: Backend HTTP API, F9: Exception Case Workflow & User Actions, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
</feature_dependencies>

<context>
@.planning/PROJECT.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/SCOPE-DECISION.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/WAVE-SCHEDULE.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/01-PLAN.md
@project_specs/FRD/F04-rule-engine.md
@project_specs/FRD/F05-exception-detection-evidence.md
@project_specs/FRD/Y2-errors.md
@project_specs/FRD/Y3-integrations.md
@project_specs/TechArch/01-components.md
@project_specs/TechArch/05-tech-stack.md
@project_specs/TechArch/06a-integrations-rules-ai.md
</context>

<scope_boundary>
Read this before writing code.

**Rules are DATA, not branches.** `exception_type` selects which of exactly three evaluators
runs — that is the only thing code decides. Every threshold, document type list, digit count,
separator set, comparison field path, severity and applicability condition is read from the
`rules` row at evaluation time. There must be no literal `50000`, no literal `10`, no literal
`"CERTIFICATE_OF_ORIGIN"` and no literal `"manufacturer.address.country"` anywhere in
`src/domain/rules/evaluators/`. Configurability is the feature being demonstrated; a
hardcoded threshold silently deletes it. The one permitted piece of application data is the
country alias table in `normalize.ts`, which the spec explicitly holds outside per-rule
configuration so all evaluators normalize identically.

**Exactly three exception types. No mechanism for a fourth.** The evaluator registry is a
closed map with no registration API. A `rules` row declaring an unknown `exception_type` is
recorded in `invalid_rules[]` as `EXCEPTION_TYPE_UNSUPPORTED`; it is never dispatched.

**What this wave writes.** Rows into exactly three tables: `evaluations`, `exceptions`,
`evidence`, plus the derived-column update on `cases`
(`priority`, `priority_basis_json`, `queued`, `open_exception_count`,
`exception_type_summary`, `current_evaluation_id`, `updated_at`) through wave 1's
`caseRepository.updateProjection`. It writes **zero** rows into `audit_entries`,
`notifications`, `approvals`, `recommendations`, `document_requests`, `case_actions`,
`ai_outputs`, `sessions`.

**Recorded deviations from FRD F05, and why.**

- F05 §Process step 9 requires a `SYSTEM`-actor `EXCEPTIONS_DETECTED` audit entry. The
  audit-record feature is out of scope for this build, so no audit row is written; the same
  facts (evaluation version, fingerprint, exception set, derived priority with its basis) are
  returned in `DetectionResult` and printed in the seed report instead.
- F05 §Process step 10 requires invalidating the cached AI summary and recommendation. No
  such cache exists — AI-generated summaries and recommendations are out of scope, so there
  is nothing to invalidate.
- F05 §Process step 5 delegates exception reconciliation to revalidation. Re-running rules
  after a document upload is out of scope, so this wave implements only the forward path:
  on a re-evaluation, prior-evaluation `OPEN` exceptions are marked
  `SUPERSEDED_BY_EVALUATION` (history preserved, never deleted) and `DetectionResult.resolved`
  stays empty. The `RESOLVED_BY_REVALIDATION` status is never written by this wave.
- Detection produces the exception, its structured evidence and its `missing_information`. It
  does **not** produce prose narrative, a recommended action or a confidence level — those are
  out of scope. The `assertion` string is a mechanical sentence rendered from the evidence
  values, not a generated explanation.
- Detection does not mutate `cases.status`. Wave 1 seeded all seven statuses declaratively and
  overwriting them would collapse the queue to a single status. Initial status for a newly
  created flagged case is `NEW`; ownership of every status change belongs to the case workflow
  in wave 3.

**Two spec-name conflicts, resolved here and recorded.**

1. FRD F04 §3 names applicability conditions `min_shipment_value_usd` /
   `max_shipment_value_usd`, and F05 §Process step 6 says `shipment_value_usd >= 50000`. The
   canonical column is `cargo_entries.shipment_value_cents` (FRD Y0a DDL); `shipment_value_usd`
   is the API projection name and wave 3 owns it. Keep the **parameter names exactly as the
   seeded rule rows spell them** (`min_shipment_value_usd: 50000`) and convert at the
   comparison site: `shipment_value_cents / 100 >= min_shipment_value_usd`. Never rename a
   seeded parameter and never add a `shipment_value_usd` column.
2. F04 §Process step 3 orders rules by `severity DESC`. Severity is a TEXT enum, so a string
   sort gives `MEDIUM > LOW > HIGH > CRITICAL` — wrong. Order by the explicit
   `SEVERITY_RANK` map (`LOW 0, MEDIUM 1, HIGH 2, CRITICAL 3`) descending. The same rank drives
   `max(severity)` in priority derivation.

**Infrastructure:** SQLite is file-backed and needs no server process. This wave ships **no**
`docker-compose.yml` and no datastore service. Wave 5 owns the single-command boot.
</scope_boundary>

<tasks>

<task type="auto">
  <name>Task 1: Build the pure, configuration-driven rule engine — three evaluators, shared conditions, deterministic ordering</name>
  <files>
package.json
src/shared/types/rules.ts
src/domain/rules/types.ts
src/domain/rules/normalize.ts
src/domain/rules/fieldPath.ts
src/domain/rules/conditions.ts
src/domain/rules/schemas.ts
src/domain/rules/evaluators/missingDocument.ts
src/domain/rules/evaluators/htsCode.ts
src/domain/rules/evaluators/countryOfOrigin.ts
src/domain/rules/engine.ts
tests/unit/rules.normalize.test.ts
tests/unit/rules.evaluators.test.ts
tests/unit/rules.engine.test.ts
  </files>

  <feature_dependencies>
Implements: F4: Configurable Business Rule Engine
Depends on: F0: Cargo Entry Data Model & Persistence (the `rules`, `cargo_entries` and `documents` shapes from wave 1)
Enables: F5: Exception Detection & Evidence Capture (Task 2 of this plan), F3, F9, F17, F18
  </feature_dependencies>

  <action>
Everything in `src/domain/` is **pure**: no `better-sqlite3`, no `node:fs`, no `Date.now()`,
no network. `node:crypto` is permitted (the fingerprint). The layer boundary is a real rule
from TechArch `01-components` §1.2 — keep it.

**1. `package.json`** — add `ajv` `^8` to dependencies (TechArch §5.2 lists Ajv 8.x; Fastify
arrives in wave 3, so install it directly here). Change nothing else.

**2. `src/domain/rules/types.ts` + `src/shared/types/rules.ts`** — the engine's I/O types,
exactly as declared in this plan's `integration_contracts.provides`:

```ts
export interface RuleDefinition {
  id: string; name: string; exception_type: ExceptionType; description: string;
  policy_reference: string; severity: Severity;
  priority_mapping: Partial<Record<Severity, Severity>> | null;  // parsed from rules.priority_mapping
  conditions: Record<string, unknown>;                            // parsed from rules.conditions_json
  params: Record<string, unknown>;                                // parsed from rules.params_json
  enabled: boolean; version: number;
}
export interface DocumentSnapshot {
  document_type: string; status: string; filename: string | null; storage_path: string | null;
  superseded: 0 | 1; stated_country: string | null;
}
export interface EntrySnapshot {
  id: string; shipment_id: string; product_description: string;
  hts_code: string | null; country_of_origin: string | null;
  manufacturer_address_country: string | null; shipment_value_cents: number;
  documents: DocumentSnapshot[];
}
```
Plus `EvidenceDraft`, `MissingInformationItem`, `Finding`, `EvaluationResult` verbatim from
the contract block above. Re-export the public ones from `src/shared/types/rules.ts` so wave 3
imports types without reaching into `domain/`.

**3. `src/domain/rules/normalize.ts`** — deterministic, table-driven canonicalization
(F04 §5 "Country normalization"):

- `normalizeCountry(raw): string | null` — trim, collapse internal whitespace, uppercase,
  strip a trailing period and a leading `THE `, then look up in an alias table mapping ISO
  alpha-2, ISO alpha-3, official names and a curated synonym list to alpha-2. Required
  entries: `MALAYSIA/MY/MYS → MY`, `CHINA/CN/CHN/PEOPLE'S REPUBLIC OF CHINA/PRC → CN`,
  `HONG KONG/HK → HK` (deliberately distinct from `CN`), `TAIWAN/TW → TW`,
  `VIETNAM/VIET NAM/VN/VNM → VN`, plus `US/USA/UNITED STATES`, `DE`, `MX`, `KR`, `IN`, `TH`,
  `SG`, `JP`, `IT`, `TR` — enough to cover all twelve seeded shipments. Unknown → `null`.
- `normalizeHts(raw, allowedSeparators: string[]): string` — strip every character present in
  `allowedSeparators`, then trim. Separators come from the rule params; do not hardcode.
- `normalizeDocumentType(raw): string` — upper snake case.

This alias table is application data, not per-rule configuration, and is deliberately not
editable — all three evaluators must normalize identically.

**4. `src/domain/rules/fieldPath.ts` — `resolveFieldPath(entry, path)`.** Rule params carry
dot-paths (`manufacturer.address.country`,
`documents.CERTIFICATE_OF_ORIGIN.stated_country`). Resolve them through an **explicit
allow-list of path shapes**, never a generic property walk:

| Path | Resolves to |
|---|---|
| `country_of_origin` | `entry.country_of_origin` |
| `manufacturer.address.country` | `entry.manufacturer_address_country` |
| `product_description` | `entry.product_description` |
| `hts_code` | `entry.hts_code` |
| `documents.<TYPE>.stated_country` | `stated_country` of the first non-superseded `RECEIVED` document whose normalized `document_type` equals `<TYPE>`; `null` when absent |

Return `{ ok: true, value }` or `{ ok: false, code: 'RULE_PARAM_PATH_UNKNOWN' }`. Reject any
path containing `__proto__`, `constructor` or `prototype` outright. An unresolvable path is a
rule-definition error surfaced in `invalid_rules[]`, not a crash and not a silent pass.

**5. `src/domain/rules/conditions.ts` — `evaluateConditions(entry, conditions)`.** All present
conditions AND together; `{}` is always applicable (F04 §3). Support exactly:
`min_shipment_value_usd`, `max_shipment_value_usd` (compare against
`entry.shipment_value_cents / 100` — see the recorded conflict in `<scope_boundary>`),
`commodity_keywords` (case-insensitive substring over `product_description`), `hts_prefixes`
(prefix match over the HTS normalized with the default separator set; a null/empty HTS matches
only if `""` is listed), `country_of_origin_in`, `country_of_origin_not_in` (both over
`normalizeCountry(entry.country_of_origin)`). An unknown condition key is a rule-definition
error. Return `{ applicable: true }` or
`{ applicable: false, condition, expected, actual, result: 'NOT_APPLICABLE' }` so a skipped
rule can be explained.

**6. `src/domain/rules/schemas.ts`** — one Ajv JSON Schema per `exception_type`, all with
`additionalProperties: false`, plus a shared schema for `conditions`. Parameter surfaces and
defaults verbatim from F04 §4/§5/§6 (the tables of `expected_digit_count`, `min_digit_count`,
`allowed_separators`, `allow_partial`, `treat_missing_as_exception`, `check_known_codes`,
`known_code_prefix_length`, `known_codes`, `placeholder_characters`; `declared_field`,
`comparison_fields`, `treat_missing_declared_as_conflict`,
`treat_missing_comparison_as_conflict`, `allowed_pairs`, `case_sensitive`;
`required_document_types` (required, 1-20 items), `match_mode`, `accept_statuses`,
`require_file_present`, `ignore_superseded`). Export
`validateParams(exception_type, params): { ok: true; params: withDefaultsApplied } | { ok: false; detail }`
with Ajv `useDefaults: true`. Include the cross-field check from F04 §4 step 7:
`check_known_codes: true` with an empty `known_codes` is `RULE_CONFIG_INVALID`, not a rule
that passes everything. `additionalProperties: false` is load-bearing — a typo in a parameter
name must be a loud error, never a silently ignored key that disables a check.

**7. The three evaluators.** Each exports one function
`(entry: EntrySnapshot, rule: RuleDefinition) => Finding | null`, reads every value from
`rule.params`, and never throws on bad shipment data — bad data is a finding.

- **`htsCode.ts`** — F04 §4, checks in this exact order, first failure wins and stops:
  `MISSING` (respecting `treat_missing_as_exception`) → normalize → `PLACEHOLDER` (any
  character in `placeholder_characters`) → `NON_NUMERIC` (evidence records the offending
  characters and their zero-based positions) → `ODD_STRUCTURE` (separator run > 1, leading or
  trailing separator, checked against the **raw** code) → digit count
  (`TOO_MANY_DIGITS` / `INCOMPLETE_DIGITS`, honouring `allow_partial` + `min_digit_count`) →
  `UNKNOWN_CODE` (when `check_known_codes`). Evidence for the canonical case is exactly:
  `{ kind:'OBSERVED', field_path:'hts_code', raw_value:'8541.40', normalized_value:'854140', expected:'10 digits', observed:'6 digits' }`
  with `assertion: "HTS code has 6 significant digits; a complete classification requires 10"`,
  `sub_reason: 'INCOMPLETE_DIGITS'`, plus a `MISSING`-kind evidence row and a
  `missing_information` item carrying `observed_digits: 6`, `missing_digits: 4`.
- **`countryOfOrigin.ts`** — F04 §5. Normalize `entry[declared_field]`; unresolvable →
  `UNRESOLVABLE_DECLARED_ORIGIN` (when `treat_missing_declared_as_conflict`). Then walk
  `comparison_fields` in order via `resolveFieldPath`: absent → `insufficient_evidence` note
  (or `MISSING_COMPARISON_ORIGIN` when configured); unnormalizable →
  `UNRESOLVABLE_COMPARISON_ORIGIN`; equal → continue; listed in `allowed_pairs` → tolerated;
  otherwise `ORIGIN_MISMATCH` and stop. **One rule produces at most one finding** — further
  disagreeing fields append evidence to the same finding. Canonical evidence is exactly two
  rows, `OBSERVED country_of_origin Malaysia/MY` and
  `COMPARISON manufacturer.address.country China/CN`, with
  `assertion: "Declared country of origin (Malaysia/MY) conflicts with the manufacturer address country (China/CN)"`.
- **`missingDocument.ts`** — F04 §6. Build the received set from documents whose `status` is in
  `accept_statuses`, excluding superseded rows when `ignore_superseded`, excluding rows failing
  the `require_file_present` check. `match_mode: 'ALL'` → one finding listing every missing
  type; `ANY_ONE_OF` → one finding listing all acceptable alternatives when the intersection is
  empty. `sub_reason` precedence: `DOCUMENT_FILE_MISSING` > `DOCUMENT_NOT_RECEIVED` >
  `DOCUMENT_NOT_DECLARED`, with each `missing_information` item keeping its own. Each item is
  `{ document_type, requirement, required_by_rule: rule.id, policy_reference: rule.policy_reference }`.
  Emit a `CONTEXT` evidence row for every applicability condition that made the rule apply
  (e.g. `shipment_value_usd = 85000.00 >= 50000 threshold`) — context evidence is what lets a
  reviewer see *why this rule applied to this shipment*.

Every evaluator assigns `display_order` from its emission order, starting at 0.

**8. `src/domain/rules/engine.ts` — `evaluateEntry(entry, rules)`.** F04 §Process steps 3-7:

- Filter to `enabled` rules, then sort by `(exception_type ASC, SEVERITY_RANK DESC, rule_id ASC)`.
  Export `SEVERITY_RANK` — see the recorded conflict about string sorting in
  `<scope_boundary>`. This ordering IS the persisted finding order and the display order; it
  never varies between runs.
- Per rule: `validateParams` → on failure push `{ rule_id, code:'RULE_CONFIG_INVALID', detail }`
  to `invalid_rules[]` and continue with the next rule (an invalid rule must never prevent
  others evaluating). An `exception_type` outside the closed map pushes
  `EXCEPTION_TYPE_UNSUPPORTED`.
- Then `evaluateConditions` → non-applicable pushes to `skipped_rules[]` **with the failing
  condition** and continues. "Did not apply" and "applied and passed" are different outcomes
  and both are recorded.
- Then dispatch through a `const EVALUATORS = { MISSING_REQUIRED_DOCUMENT: …, INVALID_HTS_CODE: …, CONFLICTING_COUNTRY_OF_ORIGIN: … } as const` — a
  closed map with no registration API.
- Retain **all** findings: no suppression, no dedup across rules, no "highest severity only".
- `ruleSetFingerprint(rules)` = SHA-256 hex over the ordered `(rule_id, version, enabled)`
  tuples, computed over the full rule set (including disabled rules, so disabling one changes
  the fingerprint).
- Return `EvaluationResult` with `duration_ms`. Never mutate `entry`, its documents or the
  rule set.

**9. Unit tests (Vitest, `tests/unit/`).** No database, no fixtures from disk — build
`EntrySnapshot` and `RuleDefinition` objects inline so the tests document the engine's
contract.

- `rules.normalize.test.ts`: the alias table (Malaysia/MY/MYS, China/PRC/CHN, Hong Kong stays
  HK and is not CN, unknown → null); HTS normalization with a param-supplied separator set;
  document-type casing.
- `rules.evaluators.test.ts`, at minimum:
  - HTS: `"8541.40"` with the seeded params → `INCOMPLETE_DIGITS` with expected/observed
    populated; `"8541.40.10.00"` → no finding; `"8541.40.XX"` → `PLACEHOLDER`;
    `"85A1.40"` → `NON_NUMERIC`; `null` → `MISSING`, and `null` with
    `treat_missing_as_exception: false` → no finding; `allow_partial: true` +
    `min_digit_count: 6` turns the canonical `INCOMPLETE_DIGITS` into no finding — **this is
    the configurability proof: same code, same entry, different rule row, different outcome.**
  - Origin: Malaysia vs China → `ORIGIN_MISMATCH` with two evidence rows and both
    `normalized_value`s populated; Malaysia vs `MYS` → no finding; the pair tolerated via
    `allowed_pairs` → no finding; a null comparison field → no finding by default.
  - Documents: all three baseline types received → no finding; one missing → one finding with
    one `missing_information` item; two missing → one finding with two items (never two
    findings); a `RECEIVED` row with no filename under `require_file_present` →
    `DOCUMENT_FILE_MISSING`; `match_mode: 'ANY_ONE_OF'` satisfied by one of two.
- `rules.engine.test.ts`:
  - The canonical entry against the seven seeded rule definitions yields **exactly three
    findings**, in the order `CONFLICTING_COUNTRY_OF_ORIGIN`, `INVALID_HTS_CODE`,
    `MISSING_REQUIRED_DOCUMENT`, from `rule-origin-manufacturer`, `rule-hts-completeness`,
    `rule-doc-highvalue-coo`.
  - Disabled rules never fire: enabling `rule-doc-solar-cert` produces a fourth finding, and
    with it disabled there are three.
  - A rule with a typo'd parameter key lands in `invalid_rules[]` while the other rules still
    produce their findings.
  - A rule whose condition excludes the entry lands in `skipped_rules[]` with the failing
    condition named.
  - Determinism: evaluate the same entry twice and assert `JSON.stringify` equality of
    `findings` (evidence arrays and ordering included).
  - `ruleSetFingerprint` changes when a rule's `enabled` or `version` changes and is stable
    otherwise.
  - Severity ordering: a set containing `CRITICAL` and `MEDIUM` rules of the same
    `exception_type` orders `CRITICAL` first (this fails if anyone string-sorts severity).
  </action>

  <verify>
npm install 2>&1 | tail -3 && npm run typecheck && npx vitest run tests/unit --reporter=list 2>&1 | tail -30 && ! grep -rnE '50000|"CERTIFICATE_OF_ORIGIN"|manufacturer\.address\.country' src/domain/rules/evaluators/ && echo TASK1_OK
  </verify>

  <done>
- `npm run typecheck` exits 0 and all four unit test files pass with 0 failing, 0 skipped.
- `src/domain/rules/evaluators/` contains no hardcoded threshold, document type or field path
  — the grep in `<verify>` finds nothing, and every value comes from `rule.params`.
- The canonical entry against the seeded rule set produces exactly three findings in the
  documented order, each with the exact evidence rows named in the action.
- Flipping `allow_partial` on the HTS rule changes the outcome with no code change (the
  configurability claim, proven by test).
- A disabled rule never produces a finding; an invalid rule definition is recorded in
  `invalid_rules[]` and the remaining rules still evaluate.
- Evaluating the same entry twice produces byte-identical serialized findings.
- `src/domain/` imports no database driver, no `node:fs` and no clock.
  </done>
</task>

<task type="auto">
  <name>Task 2: Persist detection — evaluations, exceptions, field-level evidence, derived priority and queue membership</name>
  <files>
src/shared/types/detection.ts
src/domain/priority.ts
src/infra/db/repositories/evaluationRepository.ts
src/infra/db/repositories/exceptionRepository.ts
src/infra/db/repositories/evidenceRepository.ts
src/infra/db/index.ts
src/app/evaluationService.ts
tests/unit/priority.test.ts
tests/integration/detection.test.ts
  </files>

  <feature_dependencies>
Implements: F5: Exception Detection, Evidence Capture & Flagging
Depends on: F4: Configurable Business Rule Engine (Task 1 of this plan), F0: Cargo Entry Data Model & Persistence (wave 1)
Enables: F3: Backend HTTP API, F9: Exception Case Workflow & User Actions, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen
  </feature_dependencies>

  <action>
**1. `src/domain/priority.ts` — `derivePriority(input)`.** PURE, and a pure function of
`(open exception severities, shipment value, open exception count, oldest opened_at, now)`
exactly as F05 §Process step 6 requires. Signature and algorithm verbatim from this plan's
`integration_contracts.provides` ("Priority derivation and initial queue status"): base =
max severity by `SEVERITY_RANK` after applying each rule's `priority_mapping`, then
`VALUE_ESCALATION` (`shipment_value_cents >= 5000000`), `MULTIPLICITY_ESCALATION`
(`open_exception_count >= 3`), `AGE_ESCALATION` (oldest `opened_at` more than 7 days before
`now`), clamped at `CRITICAL`. Every applied step appends a `PriorityBasisEntry` with
`{ factor, detail, from, to }` — including a `CLAMP` entry when an escalation was absorbed by
the ceiling, so the queue can explain a priority on hover and the derivation can be defended.
No `OPEN` exceptions → `LOW` with a single `BASE_SEVERITY` basis entry. Never read the clock
inside this module; `now` is a parameter.

**2. `src/shared/types/detection.ts`** — `ExceptionRecord`, `EvidenceRecord`,
`MissingInformationItem`, `PriorityBasisEntry` exactly as declared in
`integration_contracts.provides`. Property names equal the SQL column names. This is the file
waves 3 and 4 import; do not rename a field into camelCase.

**3. Three repositories** (`src/infra/db/repositories/`), thin modules of **named prepared
statements** with bound parameters only — no ORM, no query builder, no template-literal SQL
(TechArch §5.3). Each is a factory taking the `Database` handle:

- `evaluationRepository`: `nextVersion(cargoEntryId)` (`SELECT COALESCE(MAX(version),0)+1 …`,
  called inside the transaction), `insert(row)`, `getById`, `getCurrentForEntry`,
  `listByEntry`.
- `exceptionRepository`: `insert(row)`, `listOpenByEntry`, `listByEvaluation`,
  `listByCaseWithEvidence(caseId)` returning the `ExceptionRecord[]` projection (join `rules`
  for `rule_name`, `rule_description`, `policy_reference`; parse
  `missing_information_json`; attach evidence ordered by `display_order ASC`),
  `markSuperseded(exceptionId, supersededByExceptionId | null, at)`.
- `evidenceRepository`: `insert(row)`, `listByException`.

Extend `src/infra/db/index.ts`'s `repositories(db)` factory with
`{ evaluations, exceptions, evidence }` alongside wave 1's five. Do **not** add repositories
for tables belonging to features excluded from this build.

**4. `src/app/evaluationService.ts` — `detectExceptions(db, input, deps?)`.** Signature exactly
as declared in `integration_contracts.provides`. Everything below runs inside **one**
`db.transaction(...)()` so a failure leaves nothing partial:

1. Load the cargo entry, its documents and the full `rules` set through wave 1's repositories;
   build the `EntrySnapshot` and parse each row's `conditions_json` / `params_json` /
   `priority_mapping` into a `RuleDefinition`. A row whose JSON does not parse becomes an
   `invalid_rules[]` entry, not a throw.
2. Call `evaluateEntry(entry, rules)`.
3. Resolve the case via `caseRepository.getByCargoEntryId`; missing → throw
   `RESOURCE_NOT_FOUND: Case for shipment {id} not found`.
4. `version = evaluationRepository.nextVersion(cargoEntryId)` read inside this transaction, so
   concurrent evaluations cannot collide on the `UNIQUE (cargo_entry_id, version)` index; a
   collision surfaces as `EVALUATION_VERSION_CONFLICT`.
5. Insert the `evaluations` row with `trigger`, `rule_set_fingerprint`,
   `skipped_rules_json`, `invalid_rules_json`, `finding_count`, `duration_ms`,
   `actor_kind`, `actor_user_id`, `evaluated_at`.
6. If a prior evaluation exists, mark its `OPEN` exceptions `SUPERSEDED_BY_EVALUATION` (never
   delete, never update a superseded evaluation's evidence — historical evaluations stay
   readable, and `EVALUATION_HISTORY_IMMUTABLE` is the error if anything tries).
7. Per finding, in engine order, insert the `exceptions` row: `status: 'OPEN'`,
   `sub_reason`, `severity`, `assertion`, `missing_information_json` = JSON of the finding's
   `missing_information`, `rule_version`, and `first_detected_evaluation_id` **carried forward**
   from the earliest unresolved evaluation in which this `(cargo_entry_id, rule_id)` pair fired
   (falling back to this evaluation's id), with `opened_at` likewise carried forward so
   "open since" age survives re-evaluation.
8. Per finding, insert its `evidence` rows with `display_order` from the draft. Truncate any
   `raw_value` over 2000 characters, appending `…(truncated)` and setting `truncated = 1`.
9. **Write-time validation gates** (F05 §Validation) — each throws and rolls the whole
   transaction back:
   - an exception with zero evidence rows → `EXCEPTION_EVIDENCE_REQUIRED`;
   - a `MISSING_REQUIRED_DOCUMENT` exception with no `MISSING`-kind evidence →
     `MISSING_INFORMATION_REQUIRED`;
   - a `CONFLICTING_COUNTRY_OF_ORIGIN` / `ORIGIN_MISMATCH` exception without at least one
     `OBSERVED` and one `COMPARISON` row each carrying a non-null `normalized_value`;
   - an `INVALID_HTS_CODE` exception whose `OBSERVED` row lacks `expected` or `observed`;
   - a derived priority outside the canonical set → `PRIORITY_DERIVATION_FAILED`.
10. Derive priority from the new `OPEN` set via `derivePriority`, then publish the case
    projection through wave 1's `caseRepository.updateProjection`: `priority`,
    `priority_basis_json`, `queued` (`open_exception_count > 0 ? 1 : 0`),
    `open_exception_count`, `exception_type_summary` (sorted distinct types joined by `,`),
    `current_evaluation_id`, `updated_at`. **Do not write `cases.status`** — see
    `<scope_boundary>`.
11. Return the `DetectionResult`.

`deps.clock` / `deps.ids` are injected for seeding and tests; production defaults are
`SystemClock` and `UuidGenerator` from wave 1's `src/infra/clock.ts` / `src/infra/ids.ts`.
When a `DeterministicIdGenerator` is supplied, ids are derived from the entry so they are
stable regardless of iteration order: `eval-<entrySeq>-<version>`,
`exc-<entrySeq>-<version>-<findingIndex>`, `evd-<entrySeq>-<version>-<findingIndex>-<order>`.

Also export `createEvaluateHook(opts?)`, which closes over `trigger` (default `'SEED'`), the
clock and the id generator and returns `(db, cargoEntryId) => void` — the exact shape wave 1's
`SeedOptions.evaluate` declares. Task 3 wires it.

**5. `tests/unit/priority.test.ts`** — table-driven, asserting `derivePriority` is a pure
function of its inputs: base severity selection uses the rank not the string; a `HIGH` base at
$85,000 with 3 open exceptions escalates and clamps at `CRITICAL` with all applied factors in
the basis; a `MEDIUM` base with 1 exception under $50,000 and a fresh `opened_at` stays
`MEDIUM` with a single basis entry; zero exceptions → `LOW`; an 8-day-old exception adds
`AGE_ESCALATION`; `priority_mapping` applied to a severity changes the base.

**6. `tests/integration/detection.test.ts`** — the real thing against a temp SQLite database
(`fs.mkdtempSync`), migrating and seeding via wave 1's `initDatabase`, then calling
`detectExceptions` directly. No network.

- Canonical shipment: exactly 3 `OPEN` exceptions with types
  `MISSING_REQUIRED_DOCUMENT`, `INVALID_HTS_CODE`, `CONFLICTING_COUNTRY_OF_ORIGIN`; every one
  has ≥ 1 evidence row; the origin exception has an `OBSERVED` row
  (`country_of_origin`, `Malaysia`, `MY`) and a `COMPARISON` row
  (`manufacturer.address.country`, `China`, `CN`); the HTS exception's `OBSERVED` row has
  `expected: '10 digits'` and `observed: '6 digits'`; the document exception's
  `missing_information_json` contains `CERTIFICATE_OF_ORIGIN` with a non-empty `requirement`
  and its `policy_reference`.
- Case projection after detection: `queued = 1`, `open_exception_count = 3`,
  `priority = 'CRITICAL'`, `priority_basis_json` names `BASE_SEVERITY`,
  `current_evaluation_id` set, `exception_type_summary` equals the three types sorted and
  comma-joined, and `status` is **unchanged** from its seeded value.
- Clean shipment `SHP-2026-0011`: 0 exceptions, `queued = 0`, `priority = 'LOW'`, and it does
  not appear in `caseRepository.listQueued()`.
- Every seeded shipment: detected `OPEN` exception types equal the fixture's
  `expected_exception_types` (set equality) — run this over all twelve.
- Re-evaluation: calling `detectExceptions` a second time creates version 2, marks the version-1
  exceptions `SUPERSEDED_BY_EVALUATION`, leaves their evidence rows readable, and carries
  `opened_at` / `first_detected_evaluation_id` forward on the re-fired exceptions.
- Evidence integrity gate: a finding stripped of its evidence (inject a stubbed engine result)
  throws `EXCEPTION_EVIDENCE_REQUIRED` and leaves `exceptions` row count unchanged — proving
  the transaction rolls back.
- Determinism: two runs with a `SeedClock` + `DeterministicIdGenerator` against freshly reset
  databases produce byte-identical serialized `evaluations` / `exceptions` / `evidence` rows.
  </action>

  <verify>
npm run typecheck && npx vitest run tests/unit/priority.test.ts tests/integration/detection.test.ts --reporter=list 2>&1 | tail -30 && echo TASK2_OK
  </verify>

  <done>
- `npm run typecheck` exits 0; `tests/unit/priority.test.ts` and
  `tests/integration/detection.test.ts` pass with 0 failing, 0 skipped.
- The canonical shipment persists exactly three `OPEN` exceptions with the exact field-level
  evidence rows named above, and structured `missing_information` naming
  `CERTIFICATE_OF_ORIGIN`.
- Every persisted exception has at least one evidence row; the write-time gates provably roll
  the transaction back when that is violated.
- The case projection is recomputed authoritatively (priority, basis, queued,
  open_exception_count, exception_type_summary, current_evaluation_id) and `cases.status` is
  never written.
- All twelve seeded shipments reproduce their declared `expected_exception_types` exactly.
- Re-evaluation preserves history: prior exceptions become `SUPERSEDED_BY_EVALUATION`, nothing
  is deleted, `opened_at` carries forward.
- `src/infra/db/index.ts` exposes `{ evaluations, exceptions, evidence }` on the repositories
  factory; no repository was added for a table belonging to an excluded feature.
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire the seed's evaluate hook so migrate + seed leaves a populated exception queue</name>
  <files>
src/app/seedService.ts
scripts/seed.ts
tests/integration/seed-detection.test.ts
  </files>

  <feature_dependencies>
Implements: F5: Exception Detection, Evidence Capture & Flagging (seed-time population), F4: Configurable Business Rule Engine (invoked at seed time)
Depends on: F2: Synthetic Seed Dataset (wave 1's seed and its evaluate hook), F4 and F5 (Tasks 1 and 2 of this plan)
Enables: F17: Cargo Exception Queue Screen, F18: Shipment Review Screen, F3: Backend HTTP API
  </feature_dependencies>

  <action>
This task closes the blocker wave 1 recorded: its seed writes shipments and cases but leaves
`evaluations`, `exceptions` and `evidence` empty, so without this wiring the queue screen would
list shipments whose exception counts came from fixture expectations with no exception rows
behind them — a demo that looks correct and is hollow.

**1. `scripts/seed.ts`** — pass the hook. Import `createEvaluateHook` from
`src/app/evaluationService` and call
`runSeed(db, { mode, evaluate: createEvaluateHook({ trigger: 'SEED', clock: seedClock, ids: deterministicIds }) })`.
Use the same `SeedClock` (base `CARGODEMO_SEED_CLOCK`, default `2026-09-01T08:00:00.000Z`) and
`DeterministicIdGenerator` the seed already uses, so detection output is byte-identical across
runs. Extend the printed `SeedReport` line with `evaluations_created`, `exceptions_created`,
`evidence_created` and `evaluate_hook_present: true`.

**2. `src/app/seedService.ts`** — call the hook and assert the result. Minimal, surgical edits
to wave 1's file:

- After each entry's `cases` row is written, and inside the same seed transaction, call
  `opts.evaluate?.(db, cargoEntryId)`. Keep the hook optional: `runSeed` without it must still
  work exactly as wave 1 specified.
- Add three coverage assertions, checked before commit, that throw `SEED_COVERAGE_FAILED` and
  roll the whole seed back on failure (a half-populated demo is worse than a failed seed):
  1. when the hook was supplied, `exceptions` and `evidence` are both non-empty, and every
     exception row has at least one evidence row;
  2. for every seeded shipment, the set of detected `OPEN` exception types equals the fixture's
     `expected_exception_types` — name the shipment and both sets in the error message;
  3. `SHP-2026-0007` has exactly three `OPEN` exceptions, one of each type, and
     `SHP-2026-0011` has zero with `cases.queued = 0`.
- Recount the report fields from the database rather than from the hook's return value, so the
  numbers in the report are observed facts.
- Leave `FORCE_RESEED`'s delete order untouched; `evaluations`, `exceptions` and `evidence`
  already sit in wave 1's documented reverse-dependency order, so a reset clears them before
  their parents.

Write nothing to `audit_entries` or `notifications` — those belong to a feature that is out of
scope, and wave 1's zero-rows assertion for them must keep passing.

**3. `tests/integration/seed-detection.test.ts`** — the end-to-end proof, against a temp
database:

- `initDatabase` + seed **with** the hook → `exceptions > 0`, `evidence > 0`, zero exceptions
  without evidence, and `evaluations` has exactly one row per shipment (12).
- `SHP-2026-0007` → exactly 3 `OPEN` exceptions, one per type; its case row has
  `queued = 1`, `open_exception_count = 3`, `priority = 'CRITICAL'`, a non-null
  `current_evaluation_id`, and an `exception_type_summary` of the three types sorted and joined
  by `,`.
- `SHP-2026-0011` → 0 exceptions, `queued = 0`.
- All seven seeded case statuses still present after detection (proving detection did not
  overwrite `cases.status`).
- Determinism: `FORCE_RESEED` twice, snapshotting `evaluations`, `exceptions` and `evidence` as
  sorted canonical JSON both times, and assert byte-identical strings.
- Idempotency: `SEED_IF_EMPTY` twice → no duplicate evaluations, no duplicate exceptions.
- Backwards compatibility: `runSeed` **without** the hook still succeeds and still leaves the
  three tables empty (wave 1's contract must not break).
- Negative: a fixture mutated in-memory so its `expected_exception_types` no longer matches
  what the rules produce makes the seed throw `SEED_COVERAGE_FAILED` and leaves the tables
  empty — this is the assertion that keeps the fixture expectations and the engine honest as
  later waves edit either one.
  </action>

  <verify>
npm run typecheck && rm -rf data && npm run migrate && npm run seed && npx tsx -e "import {openDb} from './src/infra/db/connection.ts'; const d=openDb(); const x=d.prepare('select count(*) c from exceptions').get().c; const v=d.prepare('select count(*) c from evidence').get().c; const ev=d.prepare('select count(*) c from evaluations').get().c; const k=d.prepare(\"select count(*) c from exceptions x join cargo_entries e on e.id=x.cargo_entry_id where e.shipment_id='SHP-2026-0007' and x.status='OPEN'\").get().c; const o=d.prepare('select count(*) c from exceptions x where not exists (select 1 from evidence v where v.exception_id=x.id)').get().c; const s=d.prepare('select count(distinct status) c from cases').get().c; if(x<1||v<1||ev!==12||k!==3||o!==0||s!==7){console.error('exceptions',x,'evidence',v,'evaluations',ev,'canonical',k,'orphans',o,'statuses',s);process.exit(1)} console.log('exceptions',x,'evidence',v,'canonical',k)" && npm run seed && npm run seed:reset && npx vitest run --reporter=list 2>&1 | tail -35 && echo TASK3_OK
  </verify>

  <done>
- After `rm -rf data && npm run migrate && npm run seed`, the `exceptions` and `evidence`
  tables are provably non-empty, `evaluations` has 12 rows, and no exception lacks evidence —
  asserted by the command in `<verify>`, which exits non-zero otherwise.
- `SHP-2026-0007` has exactly 3 `OPEN` exceptions after a fresh migrate+seed; `SHP-2026-0011`
  has 0 and stays off the queue.
- All seven case statuses survive detection, so wave 4's queue still demonstrates status
  coverage.
- `npm run seed` is still idempotent and `npm run seed:reset` still produces byte-identical
  rows, now including the evaluation, exception and evidence rows.
- The seed fails loudly with `SEED_COVERAGE_FAILED` if detected exception types diverge from
  the fixture's declared expectations.
- `runSeed` without the hook still behaves exactly as wave 1 specified.
- The full suite (`npx vitest run`) is green: wave 1's three files plus this wave's six.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| rule config→evaluator | `rules.params_json` / `conditions_json`, editable data, crosses into evaluation logic that decides whether cargo is flagged |
| rule config→field resolver | Rule-supplied dot-paths (`comparison_fields`) cross into an object-graph lookup over the cargo entry |
| fixture→engine→database | Repo-committed seed content crosses the engine and lands in `evaluations` / `exceptions` / `evidence` INSERTs |
| caller→SQL | Wave 3+ callers pass entry, case and exception identifiers that reach SQLite queries |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | `src/domain/rules/fieldPath.ts` — rule-supplied dot-paths reaching an object walk | mitigate | `resolveFieldPath` resolves through an explicit allow-list of path shapes (`country_of_origin`, `manufacturer.address.country`, `product_description`, `hts_code`, `documents.<TYPE>.stated_country`) and rejects any path containing `__proto__`, `constructor` or `prototype`. There is no generic recursive property walk. An unrecognized path returns `RULE_PARAM_PATH_UNKNOWN` into `invalid_rules[]` rather than reading an arbitrary property. |
| T-02-02 | Tampering | `src/domain/rules/schemas.ts` — unvalidated `params_json` silently disabling a check | mitigate | Ajv validation per `exception_type` with `additionalProperties: false` runs on **every load**, not only on save. A typo'd parameter key is a `RULE_CONFIG_INVALID` entry in `invalid_rules[]`, never an ignored key. The cross-field check (`check_known_codes` with empty `known_codes`) is enforced in the same validator, so a rule cannot degrade into one that passes everything. A silently non-firing rule is the worst failure mode for a compliance system: it looks like a passing shipment. |
| T-02-03 | Elevation of privilege | `src/domain/rules/engine.ts` — dispatch could admit a fourth exception type | mitigate | Dispatch is a closed `const EVALUATORS = {…} as const` map with no registration API; an unknown `exception_type` on a persisted rule becomes an `EXCEPTION_TYPE_UNSUPPORTED` entry in `invalid_rules[]` and is never executed. Reinforced at the storage layer by wave 1's `CHECK (exception_type IN (…))` on both `rules` and `exceptions`. |
| T-02-04 | Tampering | `src/infra/db/repositories/{evaluation,exception,evidence}Repository.ts` — every write reaching SQLite | mitigate | All three repositories are named prepared statements with bound parameters only; no template-literal SQL and no caller-supplied string is concatenated into a query. Evidence values — attacker-influenceable in principle, since they are copied verbatim from entry fields — are bound, never interpolated. |
| T-02-05 | Denial of service | `src/app/evaluationService.ts` — unbounded evidence values and unbounded evaluation time | mitigate | `raw_value` is truncated at 2000 characters with an explicit `…(truncated)` marker and `truncated = 1`, matching wave 1's `CHECK (length(raw_value) <= 2000)` so a long value is trimmed rather than aborting the transaction. `duration_ms` is recorded on every evaluation; exceeding the 2 s ceiling raises `EVALUATION_TIMEOUT` instead of hanging the seed. |
| T-02-06 | Information disclosure | `evidence.raw_value` / `assertion` — shipment field values copied verbatim into persisted rows | accept | Evidence must record the observed value verbatim to be defensible; this is the feature. The entire dataset is synthetic and wave 1's seed-time PII deny-list screen (email, phone, SSN-shaped digits) already gates what can enter `cargo_entries` and `documents`, so nothing sensitive can reach evidence. Residual risk owned by the synthetic-data-only constraint in PROJECT.md. |
| T-02-07 | Repudiation | Detection writes no audit entry for `EXCEPTIONS_DETECTED` | transfer | The audit-record feature is out of scope for this build by the recorded scope decision, so there is no append-only audit surface to write to. The equivalent facts (evaluation version, rule-set fingerprint, exception set, derived priority with basis) are persisted on the `evaluations` and `exceptions` rows themselves and returned in `DetectionResult`. Residual risk owned by `SCOPE-DECISION.md`. |
| T-02-08 | Tampering | `detectExceptions` partial writes leaving a case flagged with no evidence behind it | mitigate | The whole detection run is one `db.transaction(...)()`; the write-time gates (`EXCEPTION_EVIDENCE_REQUIRED`, `MISSING_INFORMATION_REQUIRED`, `PRIORITY_DERIVATION_FAILED`) throw inside it, rolling back the evaluation, its exceptions, its evidence and the case projection together. Asserted by the rollback test in `tests/integration/detection.test.ts`. |
</threat_model>

<verification>
Run from the repository root on a clean checkout:

1. `npm install && npm run typecheck` — exits 0.
2. `npx vitest run --reporter=list` — all nine test files green (wave 1's three plus this
   wave's six), 0 failing, 0 skipped.
3. `rm -rf data && npm run migrate && npm run seed` — exits 0 and the populated-state check in
   `integration_contracts.provides` prints `CONTRACT_OK`.
4. `npm run seed && npm run seed:reset` — both exit 0; no duplicated evaluations or exceptions,
   and reset produces byte-identical rows.
5. Configuration-not-code check — these must find nothing:
   `grep -rnE '50000|"CERTIFICATE_OF_ORIGIN"|manufacturer\.address\.country' src/domain/rules/evaluators/`
6. Layer-boundary check — `src/domain/` must not touch I/O:
   `! grep -rnE "better-sqlite3|node:fs|from 'fs'" src/domain/`
7. Scope check — these must all print `0`:
   `npx tsx -e "import {openDb} from './src/infra/db/connection.ts'; const d=openDb(); for (const t of ['audit_entries','notifications','approvals','recommendations','document_requests','case_actions','ai_outputs','sessions']) console.log(t, d.prepare('select count(*) c from '+t).get().c)"`
8. Contract spot-checks: every `verify` one-liner in `integration_contracts.requires` and
   `integration_contracts.provides` prints `CONTRACT_OK`.
9. No compose file was added: `test ! -f docker-compose.yml && echo NO_COMPOSE_OK`.
</verification>

<success_criteria>
- Business rules are evaluated as configuration: every threshold, document list, digit count,
  separator, severity and comparison field comes from a `rules` row, and flipping a seeded
  parameter changes validation output with no code change — proven by a test, not asserted.
- Exactly three exception types exist and no mechanism admits a fourth; an unknown type on a
  persisted rule is recorded, never executed.
- The canonical shipment `SHP-2026-0007` produces exactly three exceptions — missing
  certificate of origin, incomplete 6-of-10-digit HTS code, and Malaysia/China origin conflict
  — each with structured field-level evidence carrying raw and normalized values, and the
  document exception carrying `CERTIFICATE_OF_ORIGIN` in its `missing_information`.
- Every persisted exception has at least one evidence row, enforced at write time inside the
  transaction; a violation rolls the whole detection back.
- Case priority is derived deterministically and its derivation is recorded in
  `priority_basis_json`; queue membership (`queued`) follows the open exception count; the
  clean shipment stays off the queue.
- **A fresh `npm run migrate && npm run seed` leaves `evaluations`, `exceptions` and `evidence`
  populated** — 12 evaluations, non-zero exceptions, no exception without evidence — and the
  seed fails loudly if detected types diverge from the fixtures' declared expectations. The
  queue wave 4 renders is backed by real rows.
- Detection never writes `cases.status`, so all seven seeded statuses survive; detection writes
  no rows into any table belonging to a feature excluded from this build.
- Two consecutive force-reseeds produce byte-identical evaluation, exception and evidence rows.
- `src/domain/` remains pure: no database driver, no filesystem, no clock.
</success_criteria>

<output>
After completion, create
`.planning/express/cargodemo-cbp-cargo-exception-review-app/02-SUMMARY.md` recording:
the exported signatures of `evaluateEntry`, `derivePriority`, `detectExceptions` and
`createEvaluateHook`; the exact persisted shape of an exception with its evidence and
`missing_information` (a real serialized row from `SHP-2026-0007` is the most useful form);
the priority-derivation rule and the initial queue status detection sets; the
`exception_type_summary` delimiter wave 4 must split on; the seed report showing
`exceptions_created` / `evidence_created`; and the two spec-name conflicts resolved in
`<scope_boundary>` (`min_shipment_value_usd` compared against `shipment_value_cents / 100`,
and severity ordered by `SEVERITY_RANK` rather than string sort) with the resolution taken.
</output>
