---

## F2: Synthetic Seed Dataset

**Priority:** P0 · **Category:** Platform & Data Foundation · **Walkthrough steps:** 1, 6, 10

**Description:** F2 provides a curated, fully synthetic dataset of 12 shipments that makes every screen, every exception type, and every queue status demonstrable with no manual data entry. It includes the canonical solar-panel scenario verbatim, a multi-exception shipment, a pre-cleared shipment with a complete historical audit trail for walkthrough step 10, document fixtures for both pre-attached documents and the step-6 simulated upload, and the users that back the simulated login. The seed script is deterministic and safe to re-run.

**Terminology:**
- **Deterministic seed:** All identifiers, timestamps, and generated content are fixed constants, not derived from `Date.now()` or a random source. Two seed runs produce byte-identical rows except for the database file's own metadata.
- **Seed clock:** A fixed base instant, `2026-09-01T08:00:00Z`, from which all seeded timestamps are computed as fixed offsets. Used only while seeding; live actions use the real clock.
- **Fixture:** A synthetic document file on disk under `fixtures/documents/`, referenced by seeded and uploadable documents.
- **Upload-ready fixture:** A fixture that is *not* attached at seed time and exists specifically to be attached during walkthrough step 6 (`CERTIFICATE_OF_ORIGIN_SHP-2026-0007.pdf`).

**Sub-features:**
- 12 synthetic shipments spanning all three exception types and all seven statuses
- The canonical solar-panel scenario, reproduced exactly
- A multi-exception shipment (the canonical one carries three)
- A pre-cleared shipment with a full historical audit chain including an approving official
- Document fixtures (attached and upload-ready)
- Seeded users for all three roles, including two supervisors
- Seeded rule set (the default rules of F4)
- Idempotent, re-runnable seed with explicit reset

**Process:**
1. The seed routine is invoked on an empty database at startup (F0 §Process step 5), by `npm run seed`, or by `POST /api/admin/reset` (F22).
2. If invoked in reset mode, the routine deletes all rows from all domain tables in reverse-dependency order inside one transaction, including `audit_entries` and `notifications`. This is the **only** code path permitted to remove audit rows, it is administrator-gated, and it is a whole-database reset rather than a selective edit — the append-only guarantee applies to the application's operational surface, not to a full demo reset. The reset is recorded by writing a fresh `SYSTEM` audit entry `DEMO_RESET` as the first row after reseeding.
3. The routine inserts users: 2 cargo specialists, 2 supervisors, 1 system administrator (see §Seeded users).
4. The routine inserts the default rule set (7 rules — see F4 §Default rule set) with fixed rule IDs.
5. The routine inserts the 12 cargo entries with their declared documents, using the seed clock for `entry_date` and document `received_at`.
6. The routine creates one case per entry and runs the rule engine (F4) against each, producing evaluation version 1 and its exception set. Priorities are derived, not hardcoded, so the seed proves the derivation rather than faking it.
7. The routine then applies scripted workflow history to the shipments that must not be in `NEW`: each scripted step is executed through the **real** workflow service (F9/F11) with a seeded acting user and a seed-clock timestamp, so every seeded status is backed by a genuine, complete audit chain and notification set rather than injected rows.
8. For the pre-cleared shipment, the scripted history covers: flagging → document request → upload → revalidation → specialist recommendation → supervisor approval, so walkthrough step 10 has a full ten-event timeline to replay from a shipment other than the live demo one.
9. The routine copies fixture files into the configured document storage directory if they are not already present, and verifies that the upload-ready fixture exists but is **not** attached to `SHP-2026-0007`.
10. The routine emits a `SeedReport` and verifies its own coverage assertions (§Validation). A coverage assertion failure aborts seeding with a non-zero exit rather than leaving a partially seeded demo.

**Inputs:**
- `mode` (enum, required): `SEED_IF_EMPTY` | `FORCE_RESEED`. Startup uses the former; `POST /api/admin/reset` uses the latter.
- `CARGODEMO_SEED_CLOCK` (ISO-8601 datetime, optional): overrides the seed base instant. Default `2026-09-01T08:00:00Z`.
- `CARGODEMO_DOC_STORAGE_DIR` (string, optional): default `./data/documents`.
- Static seed definition modules (shipments, users, rules, scripted histories) compiled into the app — not user-supplied at runtime.

**Outputs:**
- `SeedReport`: `{ mode, users_created, rules_created, entries_created, cases_created, exceptions_created, audit_entries_created, notifications_created, fixtures_copied, coverage: { exception_types: [...], statuses: [...], multi_exception_shipments: [...], precleared_shipments: [...] }, seed_clock, duration_ms }`
- A database in which the exception queue immediately shows work, and every screen has non-empty data.
- Fixture files present in document storage.
- `GET /api/health` seed section reporting `seeded: true`, `entry_count`, and `canonical_scenario_present: true` (F22).

**Seeded shipments (12):**

| Shipment | Commodity | Exceptions | Status | Purpose |
|---|---|---|---|---|
| `SHP-2026-0007` | Solar panels (canonical) | Missing doc + invalid HTS + origin conflict | `NEW` | The live walkthrough subject |
| `SHP-2026-0001` | Cotton apparel | Invalid HTS | `NEW` | Single-exception baseline |
| `SHP-2026-0002` | Lithium cells | Missing doc | `AWAITING_INFORMATION` | Open document request already in flight |
| `SHP-2026-0003` | Ceramic tile | Origin conflict | `IN_REVIEW` | Active review state |
| `SHP-2026-0004` | Auto brake pads | Missing doc + invalid HTS | `ON_HOLD` | Hold state, multi-exception |
| `SHP-2026-0005` | Bicycle frames | Origin conflict | `ESCALATED` | Escalated to supervisor |
| `SHP-2026-0006` | LED luminaires | Missing doc | `PENDING_APPROVAL` | Supervisor has approval work on landing |
| `SHP-2026-0008` | Steel fasteners | Invalid HTS + origin conflict | `PENDING_APPROVAL` | Second approval item; multi-exception |
| `SHP-2026-0009` | Frozen shrimp | Missing doc (resolved) | `CLEARED` | Pre-cleared with full historical audit trail |
| `SHP-2026-0010` | Plastic resin | Invalid HTS | `IN_REVIEW` | Filter/sort variety |
| `SHP-2026-0011` | Furniture | *(none)* | `NEW` | Clean shipment — proves clean entries stay off the queue |
| `SHP-2026-0012` | Pharmaceutical excipients | Missing doc + origin conflict | `AWAITING_INFORMATION` | Second awaiting-info case, `CRITICAL` priority |

**Seeded users:**

| User ID | Name | Role | Notes |
|---|---|---|---|
| `usr-cs-001` | Marisol Reyes | `CARGO_SPECIALIST` | Default acting user on first load |
| `usr-cs-002` | Marcus Hale | `CARGO_SPECIALIST` | Second specialist for hand-off scenarios |
| `usr-sup-001` | Dwayne Okafor | `SUPERVISOR` | The approving official in the walkthrough |
| `usr-sup-002` | Ronald Pike | `SUPERVISOR` | Exists so a supervisor-authored recommendation still has a distinct approver (F11 SoD-2) |
| `usr-adm-001` | Priya Raghavan | `SYSTEM_ADMINISTRATOR` | Rule administration and reset |

`usr-cs-001`, `usr-sup-001` and `usr-adm-001` **are** the three system personas PER-01, PER-02 and PER-03 of PERSONAS-CargoDemo. The seeded identity and the narrated identity are the same person by design: a walkthrough in which the queue shows a name the specification never mentions is a defect. `usr-cs-002` and `usr-sup-002` have no persona; they exist only so the hand-off and supervisor-authored-recommendation paths are demonstrable.

All names, companies, addresses, and document contents are invented. No real importer, carrier, manufacturer, or person is referenced anywhere in the dataset, fixtures, logs, or AI prompts.

**Validation (coverage assertions, enforced at seed time):**
- Entry count MUST be between 10 and 15 inclusive (currently 12).
- All three `exception_type` values MUST appear across the seeded exception set.
- All seven case statuses MUST be represented by at least one shipment.
- At least one shipment MUST carry ≥ 2 simultaneous `OPEN` exceptions; at least one MUST carry exactly 3.
- Exactly one shipment MUST be `CLEARED`, and it MUST have a non-null `approving_official_user_id` on its finalizing audit entry and ≥ 8 audit entries in its chain.
- At least one shipment MUST have zero exceptions and MUST NOT appear in the exception queue response.
- `SHP-2026-0007` MUST match the canonical scenario field-for-field: `country_of_origin = "Malaysia"`, `manufacturer.address.country = "China"`, `hts_code = "8541.40"`, `shipment_value_usd = 85000.00`, `CERTIFICATE_OF_ORIGIN` with `status = NOT_RECEIVED`, and exactly 3 `OPEN` exceptions of the three distinct types.
- The upload-ready fixture for `SHP-2026-0007` MUST exist on disk and MUST NOT be attached to the shipment.
- Every seeded shipment whose status is not `NEW` MUST have at least one `case_actions` row and a matching audit entry — no status is set without a recorded human act.
- Every seeded audit entry MUST satisfy the eight-field completeness rule of F12 for its entry class.
- No seeded string field may match the PII deny-list patterns (email address, US phone number, SSN-shaped digits); a match aborts seeding with `SEED_PII_SUSPECTED`.
- Two consecutive `FORCE_RESEED` runs MUST produce identical row contents for all non-audit tables and identical audit-entry payloads (timestamps included, because the seed clock is fixed).

**State transitions caused:** Seeding drives cases through real F9/F11 transitions to reach their target statuses. `SHP-2026-0009` traverses `NEW → AWAITING_INFORMATION → IN_REVIEW → PENDING_APPROVAL → CLEARED`. No seeded transition bypasses the state machine or the approval chain.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Seed invoked on non-empty DB without `FORCE_RESEED` | 409 | `SEED_DB_NOT_EMPTY` | "Database already contains data; use reset to reseed" |
| Coverage assertion fails | 500 | `SEED_COVERAGE_FAILED` | "Seed coverage assertion failed: {assertion}" |
| Canonical scenario mismatch | 500 | `SEED_CANONICAL_SCENARIO_INVALID` | "Canonical scenario shipment does not match required values: {detail}" |
| Fixture file missing from the repository | 500 | `SEED_FIXTURE_MISSING` | "Document fixture not found: {filename}" |
| Suspected PII in seed content | 500 | `SEED_PII_SUSPECTED` | "Seed data failed PII screen at {path}" |
| Scripted workflow step rejected by the state machine | 500 | `SEED_WORKFLOW_SCRIPT_INVALID` | "Seed history step {n} rejected: {reason}" |
| Non-administrator triggers reset | 403 | `FORBIDDEN_ROLE` | "Role {role} may not reset demo data" |

**API Surface (this feature):**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/admin/reset` | ADM | Force reseed to pristine state (shared with F22) |
| GET | `/api/admin/seed-report` | ADM | Last seed report including coverage |

Full schemas: `Y1c-api-admin.md` §Demo operations.

**Schema Surface (this feature):** writes every domain table; see `Y0a`/`Y0b`. Fixture files live on the filesystem under `CARGODEMO_DOC_STORAGE_DIR`, referenced by `documents.storage_path`.
