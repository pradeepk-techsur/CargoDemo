---
phase: express-wave-5
plan: 05
type: execute
wave: 5
domain: integration
depends_on: [1, 2, 3, 4]
autonomous: true
files_modified:
  - package.json
  - scripts/ensureClientBuild.mjs
  - scripts/verifyPreview.mjs
  - src/server/index.ts
  - playwright.config.ts
  - playwright.journey.config.ts
  - e2e/journey/primary-journey.spec.ts

features:
  implements: ["F0", "F2", "F3", "F4", "F5", "F9", "F17", "F18"]
  depends_on: []
  enables: []

must_haves:
  truths:
    - "One command — `npm start` — on a fresh checkout with no database file builds the client if it is missing or stale, migrates the schema, seeds the synthetic dataset and serves the whole app on 0.0.0.0:3000."
    - "On that fresh start the queue is non-empty on first load: at least one flagged shipment is listed, including SHP-2026-0007 carrying three exception types."
    - "The preview URL http://0.0.0.0:3000/ returns the Cargo Exception Queue document with no X-Frame-Options header and no CSP frame-ancestors directive, so the preview iframe renders rather than blanking."
    - "A deep link to /shipments/SHP-2026-0007 returns the same SPA document, so a reload inside the iframe resolves instead of 404ing."
    - "Every navigation element the client renders resolves to a route the app actually serves — no dead links, no 404 from a nav element."
    - "An unknown /api path returns the uniform JSON error envelope, not the SPA HTML."
    - "One end-to-end browser run proves the in-scope slice: the queue lists flagged shipments, the canonical solar-panel shipment opens, its three exceptions are visible with their triggering rule and field-level evidence, an action is submitted with a mandatory justification, and the resulting state change is visible on both the review screen and the queue."
    - "The action submit control is inert until the typed justification meets the server-advertised minimum length."
    - "Two consecutive fresh boots of the same command produce the same queue contents, because the seed is deterministic."
  artifacts:
    - path: "package.json"
      provides: "The single start command, its client-build prestep, and the two verification commands"
      contains: "prestart"
    - path: "scripts/ensureClientBuild.mjs"
      provides: "Builds dist/client only when it is missing or older than the client sources"
      exports: ["default (CLI)"]
    - path: "src/server/index.ts"
      provides: "migrate -> schema self-check -> seed-if-empty -> queue-non-empty assertion -> listen 0.0.0.0:3000 with a readiness block naming the preview URL"
      contains: "http://0.0.0.0:3000"
    - path: "scripts/verifyPreview.mjs"
      provides: "Automated boot + iframe-compatibility + seeded-queue + nav-target check against the real start command"
      exports: ["default (CLI)"]
    - path: "playwright.journey.config.ts"
      provides: "Journey harness driving the single start command against a throwaway database"
      contains: "webServer"
    - path: "e2e/journey/primary-journey.spec.ts"
      provides: "The one end-to-end proof of the in-scope journey slice"
      contains: "SHP-2026-0007"
  key_links:
    - from: "package.json prestart"
      to: "scripts/ensureClientBuild.mjs"
      via: "npm runs prestart before start, so `npm start` always has a client bundle to serve"
      pattern: "ensureClientBuild"
    - from: "src/server/index.ts"
      to: "src/infra/db (runMigrations, runSchemaSelfCheck, runSeed)"
      via: "the startup sequence performs migrate -> seed -> serve in that order before binding"
      pattern: "runSeed"
    - from: "e2e/journey/primary-journey.spec.ts"
      to: "the wave 4 test ids"
      via: "queue-row-SHP-2026-0007, exception-card, evidence-row, justification-input, action-submit, action-confirmation, review-status, queue-row-status"
      pattern: "queue-row-SHP-2026-0007"
    - from: "playwright.journey.config.ts"
      to: "npm start"
      via: "webServer command boots the production path against ./data/journey.db"
      pattern: "npm start"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "src/infra/db/index.ts — migrate, self-check and seed entrypoints the boot sequence composes"
      exports: ["openDb", "runMigrations", "runSchemaSelfCheck", "runSeed", "initDatabase", "repositories"]
      verify: "grep -q 'runMigrations' src/infra/db/index.ts && grep -q 'runSchemaSelfCheck' src/infra/db/index.ts && grep -q 'runSeed' src/infra/db/index.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json migration and seed scripts"
      exports: ["npm run migrate", "npm run seed", "npm run seed:reset", "npm test"]
      verify: "node -e \"const s=require('./package.json').scripts; if(!s.migrate||!s.seed||!s['seed:reset']||!s.test) process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "fixtures/cargo-entries.seed.json — the deterministic dataset the fresh-boot queue is populated from"
      exports: ["12 shipments", "SHP-2026-0007 canonical solar-panel scenario", "SHP-2026-0011 clean shipment"]
      verify: "node -e \"const e=require('./fixtures/cargo-entries.seed.json');const a=Array.isArray(e)?e:e.shipments;const c=a.find(x=>x.shipment_id==='SHP-2026-0007');if(!c||c.hts_code!=='8541.40'||c.country_of_origin!=='Malaysia'||c.manufacturer_address_country!=='China')process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "src/app/evaluationService.ts + scripts/seed.ts — detection runs during seeding, so a seeded database has real exceptions"
      exports: ["detectExceptions", "createEvaluateHook", "SHP-2026-0007 has 3 OPEN exceptions", "SHP-2026-0011 has 0 and cases.queued = 0"]
      verify: "grep -q 'createEvaluateHook' src/app/evaluationService.ts && grep -q 'createEvaluateHook' scripts/seed.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/server/index.ts — the startup sequence and the 0.0.0.0:3000 binding this wave wraps"
      exports: ["runMigrations -> runSchemaSelfCheck -> runSeed(SEED_IF_EMPTY) -> listen", "host 0.0.0.0", "port 3000, no fallback"]
      verify: "grep -q '0.0.0.0' src/server/index.ts && grep -q '3000' src/server/config.ts && node -e \"const s=require('./package.json').scripts; if(!s.start) process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "The six HTTP routes the journey run and the preview check exercise"
      exports: ["GET /api/queue", "GET /api/shipments/:shipment_id", "GET /api/shipments/:shipment_id/exceptions", "GET /api/shipments/:shipment_id/documents", "GET /api/cases/:case_id/available-actions", "POST /api/cases/:case_id/actions"]
      verify: "grep -q \"'/api/queue'\" src/server/routes/queue.ts && grep -q 'shipment_id/exceptions' src/server/routes/shipments.ts && grep -q 'available-actions' src/server/routes/cases.ts && grep -q 'case_id/actions' src/server/routes/cases.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "Iframe-safe headers and the SPA fallback that makes the preview embeddable"
      exports: ["no X-Frame-Options anywhere", "CSP without a frame-ancestors directive", "dist/client/index.html served for every non-/api path"]
      verify: "! grep -rqi 'x-frame-options\\|frame-ancestors' src/server/ && grep -q 'dist/client' src/server/plugins/spa.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "The uniform error envelope and the workflow transition the journey drives"
      exports: ["error.code", "error.request_id", "RESOURCE_NOT_FOUND", "PLACE_ON_HOLD from NEW -> ON_HOLD", "justification 10-2000 chars, mandatory on all five actions"]
      verify: "grep -q 'request_id' src/shared/api/errors.ts && grep -q 'RESOURCE_NOT_FOUND' src/shared/api/errors.ts && grep -q 'PLACE_ON_HOLD' src/domain/workflow/stateMachine.ts && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "Client routes and the build output the API serves"
      exports: ["/", "/shipments/:shipmentId", "npm run build:client -> dist/client", "npm run build"]
      verify: "grep -q 'shipments/:shipmentId' src/client/App.tsx && grep -q 'dist/client' vite.config.ts && node -e \"const s=require('./package.json').scripts; if(!s['build:client']||!s.build) process.exit(1)\" && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "Stable test ids the journey run targets"
      exports: ["queue-screen", "queue-table", "queue-row-SHP-2026-0007", "queue-row-exception-chip", "queue-row-status", "review-screen", "review-status", "back-to-queue", "exception-card", "exception-rule-name", "exception-policy-reference", "evidence-row", "action-option-PLACE_ON_HOLD", "field-hold-reason", "justification-input", "justification-counter", "action-submit", "action-confirmation", "document-row-CERTIFICATE_OF_ORIGIN"]
      verify: "grep -q 'queue-row-exception-chip' src/client/screens/queue/QueueTable.tsx && grep -q 'exception-card' src/client/screens/review/ValidationResultsPanel.tsx && grep -q 'evidence-row' src/client/components/EvidenceRow.tsx && grep -q 'justification-input' src/client/screens/review/JustificationInput.tsx && grep -q 'action-submit' src/client/screens/review/ActionPanel.tsx && grep -q 'back-to-queue' src/client/screens/review/ReviewScreen.tsx && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "playwright.config.ts — the existing browser harness this wave keeps green and partitions"
      exports: ["testDir e2e", "chromium 1280x720", "webServer driving npm start"]
      verify: "test -f playwright.config.ts && grep -q 'webServer' playwright.config.ts && node -e \"const s=require('./package.json').scripts; if(!s['test:e2e']) process.exit(1)\" && echo CONTRACT_OK"

  provides:
    - artifact: "THE SINGLE START COMMAND — how the app is launched, for the preview and for a human"
      exports: ["npm start"]
      shape: |
        # npm start   <-- the one command. Nothing else needs to be run first.
        #
        #   prestart (npm runs it automatically):
        #       node scripts/ensureClientBuild.mjs
        #         -> builds dist/client with vite ONLY when index.html is absent or older
        #            than the newest file under src/client / vite.config.ts. Otherwise skips.
        #   start:
        #       tsx src/server/index.ts
        #         (1) load + validate configuration        invalid value -> exit 1
        #         (2) open SQLite at CARGODEMO_DB_PATH     unwritable    -> exit 1
        #         (3) MIGRATE   runMigrations              checksum drift-> exit 1
        #         (4) self-check runSchemaSelfCheck        missing CHECK -> exit 1
        #         (5) SEED      runSeed({ mode: 'SEED_IF_EMPTY' })  (default on)
        #         (6) queue-non-empty assertion when this boot seeded    -> exit 1
        #         (7) SERVE     listen 0.0.0.0:3000  (port occupied -> exit 1, never rebinds)
        #         (8) print the readiness block
        #
        # migrate -> seed -> serve, in that order, inside one command. No datastore service
        # exists to start: SQLite is file-backed (TechArch 05 §5.4), so there is deliberately
        # NO docker-compose.yml in this repository.
        #
        # Optional overrides (all defaulted, none required):
        #   CARGODEMO_HOST=0.0.0.0  CARGODEMO_PORT=3000  CARGODEMO_DB_PATH=./data/cargodemo.db
        #   CARGODEMO_SEED_ON_EMPTY=true
      verify: "node -e \"const s=require('./package.json').scripts; if(!s.start||!s.prestart||!/src\\/server\\/index/.test(s.start)) process.exit(1)\" && grep -q 'ensureClientBuild' package.json && echo CONTRACT_OK"

    - artifact: "THE PREVIEW URL — what the embedded iframe should open"
      exports: ["http://0.0.0.0:3000/"]
      shape: |
        # Bind:        0.0.0.0 : 3000   (deterministic; no automatic port fallback)
        # Preview URL: http://0.0.0.0:3000/
        #              The root path IS the Cargo Exception Queue — the landing screen.
        #              No login, no redirect, no intermediate page.
        # Deep link:   http://0.0.0.0:3000/shipments/SHP-2026-0007 serves the same SPA document.
        # API base:    http://0.0.0.0:3000/api  (same origin as the UI; no CORS, no proxy)
        #
        # Framing: the app sends NO X-Frame-Options header and a CSP with NO frame-ancestors
        # directive, so the preview iframe renders rather than returning 200-and-blank.
        # scripts/verifyPreview.mjs asserts this on the real response, every run.
      verify: "grep -q 'http://0.0.0.0:3000' src/server/index.ts && grep -q 'x-frame-options' scripts/verifyPreview.mjs && grep -q 'frame-ancestors' scripts/verifyPreview.mjs && echo CONTRACT_OK"

    - artifact: "THE END-TO-END PROOF COMMAND — the one run that demonstrates the in-scope journey slice"
      exports: ["npm run verify:journey", "npm run verify:preview", "npm run verify:all"]
      shape: |
        # npm run verify:journey
        #     playwright test --config=playwright.journey.config.ts
        #     Boots the SINGLE start command against a wiped ./data/journey.db and drives one
        #     browser run of the in-scope slice:
        #        queue lists flagged shipments
        #     -> canonical solar-panel shipment SHP-2026-0007 opens
        #     -> its three exceptions render with triggering rule, authority and field-level evidence
        #     -> one of the five actions is submitted with a mandatory justification
        #     -> the resulting state change is visible on the review screen AND on the queue
        #
        # npm run verify:preview
        #     node scripts/verifyPreview.mjs
        #     Boots the same command against a wiped ./data/preview-check.db and asserts:
        #     readiness, seeded non-empty queue, no frame-blocking header, deep-link fallback,
        #     JSON error envelope on an unknown /api path, and no dead client nav target.
        #
        # npm run verify:all
        #     typecheck -> test -> build:client -> verify:preview -> test:e2e -> verify:journey
        #     A composition of commands waves 1-4 already ship plus this wave's two checks.
        #     It introduces no new test families, no coverage target and no CI matrix.
      verify: "node -e \"const s=require('./package.json').scripts; for (const k of ['verify:journey','verify:preview','verify:all']) if(!s[k]) process.exit(1)\" && test -f e2e/journey/primary-journey.spec.ts && test -f playwright.journey.config.ts && echo CONTRACT_OK"

    - artifact: "Boot-state guarantee — the queue is never empty on first load"
      exports: ["seeded-by-default fresh start", "queue-non-empty startup assertion", "deterministic across boots"]
      shape: |
        # A fresh checkout with no ./data directory, started with `npm start`, ends with:
        #   * schema migrated and integrity-checked
        #   * 12 shipments, 7 rule rows, 5 users seeded deterministically
        #   * detection run during seeding, so exceptions and evidence rows exist
        #   * >= 1 case with queued = 1, including SHP-2026-0007 with three exception types
        # If a boot ran the seed and still left zero queued cases, startup FAILS with
        # QUEUE_EMPTY_AFTER_SEED and exit 1 rather than serving an empty demo. If the seed was
        # skipped because the database already had entries, an operator may legitimately have
        # worked the queue down, so that case warns instead of failing.
      verify: "grep -q 'QUEUE_EMPTY_AFTER_SEED' src/server/index.ts && grep -q 'SEED_IF_EMPTY' src/server/index.ts && echo CONTRACT_OK"

    - artifact: "Browser-harness partition — the wave 4 specs and the journey run never share a database"
      exports: ["playwright.config.ts testIgnore '**/journey/**'", "e2e/journey/* driven only by playwright.journey.config.ts"]
      shape: |
        # playwright.config.ts        testDir 'e2e', testIgnore '**/journey/**', DB ./data/e2e.db
        # playwright.journey.config.ts testDir 'e2e/journey',                    DB ./data/journey.db
        # Both boot `npm start` on 127.0.0.1:3000 and are run sequentially, never concurrently.
        # The journey run therefore always starts from a freshly seeded canonical shipment.
      verify: "grep -q 'journey' playwright.config.ts && grep -q 'e2e/journey' playwright.journey.config.ts && grep -q 'journey.db' playwright.journey.config.ts && echo CONTRACT_OK"
---

<objective>
Wire the four built waves into one runnable application and prove the in-scope journey slice end to
end.

Two deliverables, and only two. First, a **single command** that takes a fresh checkout with no
database to a served application: build the client if needed, migrate the schema, seed the synthetic
dataset, assert the queue is not empty, and bind `0.0.0.0:3000` — with the preview URL printed and
nothing frame-blocking on the wire. Second, **one end-to-end run** that opens the queue in a real
browser, opens the canonical solar-panel shipment, reads its three exceptions with their triggering
rule and field-level evidence, submits one of the five actions with a justification the test types
itself, and confirms the resulting state change is visible on both screens.

Purpose: waves 1-4 each ended green in isolation. Nothing has yet started the whole thing with one
command, and nothing has yet proved that a person can walk from a flagged queue to a recorded
decision without a developer standing next to them. That walk is the entire product claim of this
build, and this wave is where it either holds or does not.

Output: a `npm start` that boots the stack, a `npm run verify:preview` that proves the preview will
render, and a `npm run verify:journey` that proves the slice works.
</objective>

<feature_dependencies>
Implements: F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset, F3: Backend HTTP API, F4: Configurable Business Rule Engine, F5: Exception Detection Evidence Capture & Flagging, F9: Exception Case Workflow & User Actions, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen — integrated, booted by one command and proved end to end
Depends on: None outside waves 1-4, whose declared contracts this wave composes
Enables: None — this is the final wave of the build
</feature_dependencies>

<context>
@.planning/PROJECT.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/SCOPE-DECISION.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/WAVE-SCHEDULE.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/01-PLAN.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/02-PLAN.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/03-PLAN.md
@.planning/express/cargodemo-cbp-cargo-exception-review-app/04-PLAN.md
@project_specs/TechArch/05-tech-stack.md
@project_specs/TechArch/06b-testing-deployment.md
@project_specs/JOURNEYS/JRN-01-1-canonical-walkthrough.md
@package.json
@src/server/index.ts
@playwright.config.ts
</context>

<scope_boundary>
Read this before writing a line. This is the most easily over-built wave in the plan set, because
"integration" sits directly next to two whole features that this build does not contain.

**What this wave is authorised to do.** Exactly two things: make the eight integrated features boot
from one command, and prove the in-scope journey slice with one end-to-end run. Nothing else.

**Two features sit adjacent to this work and are excluded. Do not build any part of either.**

- The **automated test-suite feature is deferred, out of scope and not in this plan.** Do not create
  test families for rule coverage, workflow-transition matrices, RBAC, audit completeness,
  revalidation, ingestion, seed coverage or upload security. Do not add a CI workflow, a coverage
  threshold, a golden-fixture regeneration path or a test matrix. `npm run verify:all` is a
  composition of commands waves 1-4 already ship plus this wave's two checks — it adds no new test
  families and asserts no coverage target. This wave writes exactly **one** new spec file.
- The **demo-environment and reset feature is deferred, out of scope and not in this plan.** Do not
  add `GET /api/health`. Do not add `POST /api/admin/reset` or any reset endpoint or UI control. Do
  not add a scripted demo driver, a pre-demo checklist command, a degradation banner, a demo-mode
  indicator or seeded demo personas beyond the users wave 1 already seeded. Readiness is probed with
  `GET /api/queue`, which is a real endpoint returning real data — wave 3 said so explicitly, and it
  is a strictly better probe than a health endpoint because it proves the data path, not just the
  process.

  Note the boundary carefully: `npm run seed:reset` already exists from wave 1 and stays exactly as
  it is. Do not extend it, do not surface it in the UI, do not add an endpoint in front of it, and
  do not put it in the readiness block.

**If you conclude the app cannot boot without one of those, stop and raise it as a dependency
problem in the summary. Do not build it under an integration label.**

**The journey is only HALF in scope, and the half that is not must not be asserted.**
JRN-01.1 is a ten-step walkthrough. This build implements its front portion. The end-to-end run may
assert only:

1. the queue loads and lists flagged shipments;
2. the canonical solar-panel shipment `SHP-2026-0007` opens;
3. its exceptions are visible with their triggering rule, its authority reference and the
   field-level evidence that fired it;
4. one of the five actions is submitted with a mandatory justification;
5. the resulting state change is visible on the review screen and on the queue.

It must **not** assert, wait for, click or look for: the AI-generated plain-language summary; the
recommended action or its confidence level; requesting a document as a tracked request record;
uploading a document; revalidating the shipment; supervisor approval of a clearance; or the
audit-trail view. Every one of those belongs to a feature that is deferred and out of scope, so an
assertion against it would fail at execute time because nothing implements it. The only permitted
mention of them in the spec is a single negative assertion that none of their surfaces is rendered.

**Which action the journey submits, and why.** `PLACE_ON_HOLD` on `SHP-2026-0007`, transitioning
`NEW -> ON_HOLD` (wave 3 transition T04). It is one of the five actions, it demands the same
mandatory justification as every other, and it is non-terminal — the case stays inspectable and the
row stays on the queue so the state change is visible on both screens. `CLEAR_EXCEPTION` is
deliberately **not** used: wave 3 records the acting user as the approving official on their own
decision because the two-person approval chain is deferred and out of scope, and driving a clearance
in the headline proof would invite exactly the misreading the scope decision warns against.

**No new API routes, no new screens, no new domain logic.** Wave 3 serves six routes and wave 4
serves two client routes. This wave adds zero of either. If the journey needs something no wave
declared, that is a dependency problem to report, not a route to add.

**No docker-compose.yml.** SQLite is file-backed and the app needs no datastore service, no broker
and no cache — TechArch 05 §5.4 excludes containers deliberately, and every prior wave recorded the
same decision. The single-command requirement is satisfied natively by `npm start`. Do not create a
compose file; creating one would add a runtime the app does not need and a second way to boot that
nobody verifies.

**Do not weaken anything to make a check pass.** If the preview check finds a frame-blocking header,
remove the header — never relax the assertion. If the journey finds a dead nav link, fix the link —
never delete the assertion.
</scope_boundary>

<tasks>

<task type="auto">
  <name>Task 1: Make `npm start` the single command — build client if needed, migrate, seed, assert a non-empty queue, serve 0.0.0.0:3000</name>
  <files>
package.json
scripts/ensureClientBuild.mjs
src/server/index.ts
  </files>

  <feature_dependencies>
Implements: F0: Cargo Entry Data Model & Persistence, F2: Synthetic Seed Dataset, F3: Backend HTTP API, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen — composed into one runnable start command
Depends on: F0 and F2 (wave 1 migrate/seed entrypoints), F4 and F5 (wave 2 detection, run during seeding), F3 and F9 (wave 3 server and startup sequence), F17 and F18 (wave 4 client bundle in dist/client)
Enables: Task 2 (preview verification) and Task 3 (the end-to-end journey run), both of which boot this exact command
  </feature_dependencies>

  <action>
The goal of this task is a property, not a script: **a person who has just cloned the repository and
run `npm install` can type one command and get a working, populated application on a stable URL.**
Everything below serves that.

**1. `scripts/ensureClientBuild.mjs` — build the client only when it is needed.**

Plain Node ESM, no TypeScript, no dependencies beyond `node:*`, so it runs before anything is
compiled.

- Compute `newestSourceMtime` = the maximum `mtimeMs` across every file under `src/client/`
  (recursive), plus `vite.config.ts`, plus `src/shared/api/` (the client imports it, so a contract
  change must rebuild), plus `package.json`.
- Read `dist/client/index.html`. If it is absent, or its `mtimeMs` is **older** than
  `newestSourceMtime`, run the build; otherwise print `client bundle up to date` and exit 0.
- Build by spawning `npm run build:client` with `stdio: 'inherit'` and
  `shell: process.platform === 'win32'`. A non-zero exit code from the build propagates:
  `process.exit(code)`. A stale bundle silently served would be worse than a failed start.
- Honour `CARGODEMO_SKIP_CLIENT_BUILD=1` as an escape hatch that skips the check entirely (used by
  nothing in this repo; it exists so a debugging session can bypass a slow build without editing
  scripts).
- Never delete `dist/`. `vite build` already sets `emptyOutDir`.

**2. `package.json` — the command surface.**

Add, keeping every existing script byte-identical:

```json
"prestart":        "node scripts/ensureClientBuild.mjs",
"verify:preview":  "node scripts/verifyPreview.mjs",
"verify:journey":  "playwright test --config=playwright.journey.config.ts",
"verify:all":      "npm run typecheck && npm test && npm run build:client && npm run verify:preview && npm run test:e2e && npm run verify:journey"
```

`prestart` is why `npm start` is a single command: npm runs it automatically. Do **not** change
`"start"` itself — wave 4's `playwright.config.ts` already invokes `npm run build:client && npm start`
and that must keep working (the prestart check will find a fresh bundle and skip, so the build does
not run twice). `verify:preview` and `verify:journey` are written in Tasks 2 and 3; declaring them
here keeps the command surface in one place.

Add nothing else. No new dependency, no compose file, no CI configuration.

**3. `src/server/index.ts` — finish the boot sequence and make it legible.**

Wave 3 already implements migrate -> self-check -> seed-if-empty -> default-actor check -> listen.
Three additions, and no restructuring:

*(a) Seeding is on by default and its outcome is captured.* Confirm `CARGODEMO_SEED_ON_EMPTY`
defaults to `true` in `src/server/config.ts` (wave 1 set it; verify rather than duplicate) and that
the boot calls `runSeed(db, { mode: 'SEED_IF_EMPTY' })`. Keep the returned `SeedReport` in scope —
step (b) and the readiness block both read it.

*(b) The queue-non-empty assertion.* Immediately after seeding, count the flagged work:

```sql
SELECT COUNT(*) AS c FROM cases WHERE queued = 1
```

- If **this boot performed the seed** (the `SeedReport` mode was a seed rather than a skip, and it
  reports entries created) and the count is `0`, print
  `QUEUE_EMPTY_AFTER_SEED: the seed ran but left no flagged shipments; the queue would load empty`
  to stderr and `process.exit(1)`. A demo that starts with an empty work list is a failed demo, and
  it must fail at boot, in the operator's terminal, not in front of an audience.
- If the seed was **skipped** because the database already had entries and the count is `0`, print a
  single-line warning naming `npm run seed:reset` as the way back to the seeded state, and continue
  serving. An operator who legitimately worked every case to a terminal state must not be locked out
  of their own database.

Also assert the canonical shipment is present when this boot seeded — a single
`SELECT 1 FROM cargo_entries WHERE shipment_id = 'SHP-2026-0007'` — and fail with
`CANONICAL_SCENARIO_MISSING` if it is not. Wave 1's seed already asserts this internally; this is the
boot-level restatement, and it is cheap.

*(c) The readiness block.* Replace wave 3's single readiness line with a block printed to stdout
after `listen` resolves, modelled on TechArch 06b §8.1 but carrying **only facts this build can
truthfully report**:

```
  CargoDemo ready
  ─────────────────────────────────────────────
  Preview URL     http://0.0.0.0:3000
  Bind            0.0.0.0:3000
  Database        ./data/cargodemo.db (schema v1)
  Seeded          12 entries · 10 flagged · canonical SHP-2026-0007 ✓
  Exceptions      21 open across 10 cases
  Client bundle   dist/client (built)
  API routes      6 under /api
```

The counts in that banner are ILLUSTRATIVE of the output shape, not a contract — print whatever
the database actually holds. For reference: 12 seeded entries, less one clean shipment
(`SHP-2026-0011`, `queued=0`) and one already-`CLEARED` shipment (`SHP-2026-0009`) that the
default queue filters exclude, gives 10 default queue rows. No assertion in this plan depends on
any of these numbers.

Print the literal string `http://0.0.0.0:3000` (with the configured host and port interpolated) —
this is the URL the preview opens, and having it in the boot output is how an operator and a log
reader both find it. Do **not** add lines for subsystems this build does not contain: no AI mode, no
clearance-path count, no RBAC route count, no reset instruction. A readiness line for a feature that
is deferred and out of scope reads as a claim the build cannot support.

Keep every existing failure path exactly as wave 3 wrote it: an invalid config, an unwritable
database, a checksum mismatch, a failed schema self-check or an occupied port each print their code
and `process.exit(1)`. The port never falls back — a shifting URL breaks an embedded preview
mid-presentation.
  </action>

  <verify>
rm -rf ./data/boot-check.db ./data/boot-check.db-wal ./data/boot-check.db-shm dist/client && npm run typecheck && (CARGODEMO_DB_PATH=./data/boot-check.db npm start > /tmp/cargodemo-boot.log 2>&1 & echo $! > /tmp/cargodemo-boot.pid) && for i in $(seq 1 90); do curl -sf http://127.0.0.1:3000/api/queue -o /tmp/cargodemo-queue.json && break || sleep 2; done; RC=0; grep -q 'http://0.0.0.0:3000' /tmp/cargodemo-boot.log || RC=1; test -f dist/client/index.html || RC=1; node -e "const q=require('/tmp/cargodemo-queue.json'); if(!q.data||q.data.length<1) process.exit(1); if(!q.data.find(r=>r.shipment_id==='SHP-2026-0007')) process.exit(1)" || RC=1; kill $(cat /tmp/cargodemo-boot.pid) 2>/dev/null; pkill -f 'src/server/index.ts' 2>/dev/null; test $RC -eq 0 && echo TASK1_OK
  </verify>

  <done>
- `npm start` alone, on a checkout with no `./data` directory and no `dist/client`, builds the client,
  migrates, seeds and serves — no other command is required first.
- A second `npm start` skips the client build (bundle up to date) and skips the seed (database not
  empty), and still serves.
- The boot log contains the readiness block including the literal preview URL `http://0.0.0.0:3000`.
- `GET /api/queue` on a fresh boot returns at least one row, including `SHP-2026-0007` — the queue is
  never empty on first load.
- A boot that seeds but leaves zero flagged cases exits 1 with `QUEUE_EMPTY_AFTER_SEED`; a boot that
  skips seeding on an already-worked database warns and continues.
- `package.json` declares `prestart`, `verify:preview`, `verify:journey` and `verify:all`, and no
  existing script was altered.
- No `docker-compose.yml`, no health endpoint, no reset endpoint and no new dependency was added.
  </done>
</task>

<task type="auto">
  <name>Task 2: Prove the preview will actually render — boot, iframe headers, deep links, seeded queue, no dead nav targets</name>
  <files>
scripts/verifyPreview.mjs
package.json
  </files>

  <feature_dependencies>
Implements: F3: Backend HTTP API, F17: Cargo Exception Queue Screen, F18: Shipment Review Screen — verified as an embeddable, same-origin, seeded application
Depends on: Task 1 of this plan (the single start command), F3 (wave 3 routes, SPA fallback and header policy), F2 and F5 (the seeded, detected data the queue must contain)
Enables: Task 3 (the journey run assumes a preview that renders and a queue that has rows)
  </feature_dependencies>

  <action>
A preview that returns HTTP 200 and renders a blank rectangle is the single most expensive failure
mode in this delivery, because it looks like success to every automated check that only asserts a
status code. This script exists to make that failure impossible to ship unnoticed. It is plain Node
ESM using only `node:*` and `fetch`; it adds no dependency and it starts the **real** command rather
than a test harness, because the thing being verified is how the app behaves when launched the way
the preview launches it.

**Structure of `scripts/verifyPreview.mjs`:**

*1. Fresh boot.* Delete `./data/preview-check.db`, `-wal` and `-shm`. Spawn `npm start` with
`env: { ...process.env, CARGODEMO_DB_PATH: './data/preview-check.db', CARGODEMO_SEED_ON_EMPTY: 'true' }`,
`detached: true`, `stdio: ['ignore','pipe','pipe']`. Tee the child's stdout and stderr into an
in-memory buffer and to the parent's streams, so a boot failure is diagnosable from the check output.
Register a cleanup that kills the whole process group (`process.kill(-child.pid, 'SIGTERM')`, then
`SIGKILL` after 5s) on success, on failure, on an uncaught exception and on `SIGINT`. A verification
script that leaves a server holding port 3000 poisons every later run.

*2. Readiness.* Poll `GET http://127.0.0.1:3000/api/queue` every 1s for up to 120s until it returns
200. There is **no** health endpoint to poll — that belongs to a feature which is deferred and out of
scope — and the queue is the better probe anyway: it proves the database, the seed, the detection
output and the HTTP layer in one request. If the child exits before readiness, fail immediately and
print the captured output rather than waiting out the timeout.

*3. Assertions.* Collect every failure and report them all at the end — a check that stops at the
first problem costs an extra boot cycle per defect. Each assertion prints `PASS`/`FAIL` with the
detail:

- **A. Seeded, non-empty queue.** `GET /api/queue` → 200 JSON. `data.length >= 1`. A row with
  `shipment_id === 'SHP-2026-0007'` exists, its `exception_types` has 3 entries and its
  `open_exception_count` is 3. A row with `shipment_id === 'SHP-2026-0011'` is **absent** (clean
  entries stay off the queue).
- **B. The preview document.** `GET /` → 200, `content-type` starts with `text/html`, body contains
  `<div id="root"` and a `<script` tag. An HTML shell with no script tag means the bundle did not
  build.
- **C. No frame blocking — the assertion this script exists for.** On that same response:
  - no `x-frame-options` header at all (header names lowercased before checking);
  - if `content-security-policy` (or `-report-only`) is present, its value contains no
    `frame-ancestors` directive.
  On failure print the offending header verbatim plus the sentence
  `the preview iframe will render blank; remove the header rather than relaxing this check`.
- **D. Deep-link fallback.** `GET /shipments/SHP-2026-0007` → 200 `text/html`, body byte-identical in
  length to the `/` body (same `index.html`). A reload inside the iframe must not 404.
- **E. Unknown API path is JSON, not HTML.** `GET /api/not-a-route` → 404 with
  `content-type: application/json`, and a body matching
  `{ error: { code: 'RESOURCE_NOT_FOUND', ..., request_id } }`. This proves the SPA fallback is
  registered after the API and cannot swallow an API 404.
- **F. Same-origin only.** `GET /api/queue` response carries no `access-control-allow-origin` header
  (there is no cross-origin story; the client and API share an origin).
- **G. No dead navigation target — static scan.** Read every file under `src/client/` recursively.
  Match `\b(?:to|href)=["'](/[^"']*)["']` and collect the literals. Assert each is either `/` or
  begins `/shipments/`. Separately assert no `src/client/` file contains `http://` or `https://`
  (absolute URLs break the same-origin iframe contract). Report the offending file and line for any
  violation. The runtime half of this check — that a rendered link actually resolves — is Task 3's,
  because it needs a browser.

*4. Exit.* On all-pass print `PREVIEW OK  http://0.0.0.0:3000/` and exit 0. On any failure print a
numbered summary and exit 1.

**Wire it up.** `"verify:preview": "node scripts/verifyPreview.mjs"` was already added in Task 1;
confirm it rather than duplicating it.

Add nothing else to this script: no reset call, no seeded-persona check, no coverage report, no
demo checklist. Its job is to answer one question — *will the embedded preview show a working,
populated app?* — and answering more would put it inside a feature that is deferred and out of scope.
  </action>

  <verify>
pkill -f 'src/server/index.ts' 2>/dev/null; npm run verify:preview 2>&1 | tail -25 && echo TASK2_OK
  </verify>

  <done>
- `npm run verify:preview` exits 0 from a clean tree and prints `PREVIEW OK http://0.0.0.0:3000/`.
- It boots the real `npm start` against a throwaway database, waits on `GET /api/queue` (no health
  endpoint is added or required), and always kills its own server process group on every exit path.
- It fails, with a named reason and exit 1, if: the queue is empty, the canonical shipment is missing
  or does not carry three exception types, the clean shipment appears on the queue by default, `/`
  does not return the SPA document, an `X-Frame-Options` header or a CSP `frame-ancestors` directive
  is present, a deep link does not fall back to `index.html`, an unknown `/api` path returns HTML
  instead of the JSON error envelope, or a client file contains a link target outside `/` and
  `/shipments/...` or an absolute URL.
- Re-running it twice in a row produces identical results — the seed is deterministic and the
  database is wiped each time.
  </done>
</task>

<task type="auto">
  <name>Task 3: One end-to-end browser run of the in-scope journey slice — flagged queue to justified decision, visible on both screens</name>
  <files>
playwright.journey.config.ts
playwright.config.ts
e2e/journey/primary-journey.spec.ts
  </files>

  <feature_dependencies>
Implements: F17: Cargo Exception Queue Screen, F18: Shipment Review Screen, F9: Exception Case Workflow & User Actions, F5: Exception Detection Evidence Capture & Flagging, F4: Configurable Business Rule Engine, F3: Backend HTTP API, F2: Synthetic Seed Dataset, F0: Cargo Entry Data Model & Persistence — all eight proved working together in one browser run
Depends on: Task 1 of this plan (the single start command the harness boots), Task 2 of this plan (a preview that renders), and the wave 4 test ids the run targets
Enables: None — this is the terminal proof of the build
  </feature_dependencies>

  <action>
This is the one run that answers "does the thing work". It drives the production path — the built
bundle served by the single start command — because a pass against a developer-only configuration
would prove something nobody demos.

**1. `playwright.journey.config.ts`.**

```ts
export default defineConfig({
  testDir: 'e2e/journey',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure',
         screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'],
              viewport: { width: 1280, height: 720 } } }],
  webServer: {
    command: 'rm -f ./data/journey.db ./data/journey.db-wal ./data/journey.db-shm && npm start',
    url: 'http://127.0.0.1:3000/api/queue',
    env: { CARGODEMO_DB_PATH: './data/journey.db', CARGODEMO_SEED_ON_EMPTY: 'true' },
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

`retries: 0` is deliberate: a flaky pass on the headline proof is worse than a red run, because it
would be believed. The `webServer` command is `npm start` and nothing else — the same command an
operator types — so `prestart` builds the bundle and the readiness probe is the real queue endpoint.

**2. `playwright.config.ts` — partition the two harnesses.** Add `testIgnore: '**/journey/**'` to
wave 4's config. Change nothing else in that file. The two configs then own disjoint spec sets and
disjoint database files (`./data/e2e.db` and `./data/journey.db`), so neither run can see the
other's writes and the journey always starts from a freshly seeded canonical shipment.

**3. `e2e/journey/primary-journey.spec.ts` — one `test.describe.serial` block, one `test` per stage,
sharing a page.**

Define one module-level constant used by the final negative assertion, so the deferred surface names
appear exactly once in the file:

```ts
const DEFERRED_SURFACES =
  /AI[- ]generated|Recommended action|Model confidence|Revalidate|Audit (record|trail)|Upload|Approve clearance|Supervisor approval/i;
```

**Stage 1 — The queue loads and lists flagged shipments.**
- `page.goto('/')`. Assert `[data-testid="queue-screen"]` visible and the `<h1>` reads
  *Cargo Exception Queue*. No login, no redirect: assert `page.url()` ends with `/`.
- Assert `[data-testid="queue-table"]` is visible and `[data-testid="queue-row"]` count is `>= 1` —
  **the queue is not empty on first load**, from a database that did not exist 30 seconds ago.
- Assert the header row contains Shipment ID, Importer, Exception, Priority and Status.
- Capture the response of the `goto` and assert it carries **no** `x-frame-options` header and, if a
  `content-security-policy` header is present, no `frame-ancestors` directive. The static and HTTP
  halves of that check live in Task 2; this is the browser half, on the document the iframe actually
  loads.

**Stage 2 — The canonical solar-panel shipment is on the queue and opens.**
- `[data-testid="queue-row-SHP-2026-0007"]` is visible; it contains **exactly three**
  `[data-testid="queue-row-exception-chip"]` elements with three distinct `data-exception-type`
  values, and its text does **not** match `/3 exceptions/` — a three-problem $85,000 shipment must
  not be collapsed into one.
- Its `[data-testid="queue-row-priority"]` reads *Critical* and `[data-testid="queue-row-status"]`
  reads *New*. Record the status text as `statusBefore`.
- Click the row. Assert the URL is `/shipments/SHP-2026-0007` and `[data-testid="review-screen"]` is
  visible. Click is the only inbound navigation to this screen; if it fails the screen is orphaned.

**Stage 3 — The exceptions are visible with their triggering rule and field-level evidence.**
- Assert the entry fields render: `entry-field-importer`, `-carrier`, `-product-description`,
  `-hts-code`, `-country-of-origin`, `-manufacturer-name`, `-manufacturer-address`,
  `-shipment-value`, `-entry-date`, each non-empty. Assert `-country-of-origin` contains *Malaysia*
  and `-manufacturer-address` contains *China* — the conflict must be readable side by side.
- Assert `[data-testid="document-row-CERTIFICATE_OF_ORIGIN"]` carries
  `data-document-status="NOT_RECEIVED"` and shows a visible *Not received* text label. The absence is
  the finding, so it has to be visible as an absence.
- Assert `[data-testid="exception-card"]` count is **3**, and their `data-exception-type` values are
  exactly the set `MISSING_REQUIRED_DOCUMENT`, `INVALID_HTS_CODE`,
  `CONFLICTING_COUNTRY_OF_ORIGIN`.
- For **every** card: `[data-testid="exception-rule-name"]` non-empty,
  `[data-testid="exception-policy-reference"]` non-empty, `[data-testid="exception-assertion"]`
  non-empty, and at least one `[data-testid="evidence-row"]`. An exception with no evidence is the
  failure mode the whole product exists to prevent.
- Field-level evidence, specifically: the origin card's evidence text contains both *Malaysia* and
  *China*; the HTS card's evidence text contains *8541.40* and both *10* and *6* (expected versus
  observed digits); the missing-document card's
  `[data-testid="exception-missing-information"]` mentions *CERTIFICATE_OF_ORIGIN*.

**Stage 4 — An action is submitted with a mandatory justification.**
- Assert exactly **five** `[data-testid^="action-option-"]` cards render, and that every card with
  `data-available="false"` shows a visible non-empty `[data-testid="action-unavailable-reason"]`.
- Select `[data-testid="action-option-PLACE_ON_HOLD"]` (available from `NEW`) and choose a
  `[data-testid="field-hold-reason"]` value of `AWAITING_EXTERNAL_INPUT`.
- **The justification gate, asserted in three steps.** With the justification empty,
  `[data-testid="action-submit"]` is **disabled**. Type `abc` — still **disabled**, and
  `[data-testid="justification-counter"]` shows the shortfall. Type a full sentence of at least 40
  characters — now **enabled**. The machine lays out the evidence; the button that changes anything
  is inert until a human types a reason.
- Assert the textarea was **empty on arrival** (captured before typing) — nothing prefilled it.
- Submit. Assert `[data-testid="action-confirmation"]` becomes visible, quotes the typed
  justification verbatim, and names the status change containing *On hold*.

**Stage 5 — The state change is visible on both screens.**
- On the review screen, `[data-testid="review-status"]` now reads *On hold* and no longer reads
  `statusBefore`.
- Click `[data-testid="back-to-queue"]`; assert the URL is `/` and the queue table renders.
- Assert `[data-testid="queue-row-SHP-2026-0007"]`'s `[data-testid="queue-row-status"]` now reads
  *On hold*. The decision propagated through the API to the list a colleague works from — this is the
  closing assertion of the slice.

**Stage 6 — Integrity guards.**
- **No dead nav target (runtime half).** On the queue and again on the review screen, evaluate
  `[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))` and assert every href
  is `/` or matches `^/shipments/[^/]+$`. Then assert the back link actually resolves: it already did
  in Stage 5, so additionally `page.goto('/shipments/SHP-9999-0000')` renders
  `[data-testid="review-not-found"]` with a working back link rather than a blank page or a crash.
- **Nothing deferred rendered.** On both screens assert `page.locator('body')` text does not match
  `DEFERRED_SURFACES`.

**What this spec must never contain**, because the features behind them are deferred and out of
scope and no code implements them: any wait for or assertion on an AI summary panel, a recommended
action, a confidence level, a document-request record, a file upload, a revalidation trigger, a
supervisor approval control, or an audit timeline. The only reference to them permitted in the file
is the single `DEFERRED_SURFACES` negative assertion above.

**Prerequisite note for the summary:** `npx playwright install --with-deps chromium` must have run
once (wave 4 already required it); the journey config installs nothing itself.
  </action>

  <verify>
pkill -f 'src/server/index.ts' 2>/dev/null; npx playwright install --with-deps chromium 2>&1 | tail -2 && npm run verify:journey 2>&1 | tail -40 && npm run test:e2e 2>&1 | tail -15 && echo TASK3_OK
  </verify>

  <done>
- `npm run verify:journey` passes with **0 failing and 0 skipped**, booting the single start command
  against a wiped `./data/journey.db`.
- The run proves, in this order: the queue is non-empty on first load from a database that did not
  exist before the run; the canonical shipment shows three distinct exception chips at Critical/New;
  clicking the row opens the review screen; three exception cards render, each with its rule name,
  authority reference, assertion and at least one field-level evidence row, with Malaysia/China,
  8541.40 with 10-versus-6 digits, and the missing certificate all legible; all five actions render
  with visible reasons on unavailable ones; the submit control is disabled until the justification
  meets the server-advertised minimum; the submitted action produces a confirmation quoting the
  justification; and the new status appears on both the review screen and the queue row.
- The run asserts no AI summary, no recommendation, no confidence, no document request record, no
  upload, no revalidation, no supervisor approval and no audit trail — every one of those belongs to
  a feature that is deferred and out of scope.
- Every rendered `a[href]` on both screens resolves to `/` or `/shipments/:id`, and an unknown
  shipment renders the not-found view with a working back link.
- The document served to the browser carries no frame-blocking header.
- `npm run test:e2e` (wave 4's specs) still passes with 0 failing after the `testIgnore` change, and
  the two harnesses use separate database files.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| operator env → process | `CARGODEMO_*` environment values crossing into the start command: bind host, port, database path, seed switch |
| preview iframe → app | The embedding browser frame loading the app document; governed entirely by response headers |
| unknown URL path → SPA fallback | Any path the API does not own, resolved by the static fallback registered after the routes |
| verification harness → filesystem/process | `scripts/verifyPreview.mjs` and the journey harness deleting database files and spawning/killing a server process group |
| build inputs → served bundle | `src/client/` sources crossing into `dist/client` via the prestart build, then served to every browser |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Denial of service | `preview iframe → app` — a frame-blocking header would render the preview blank while returning 200 | mitigate | `scripts/verifyPreview.mjs` assertion C fails the run if the `/` response carries any `x-frame-options` header or a CSP containing `frame-ancestors`; the journey spec repeats the check on the document the browser actually loads. The fix is always header removal, never assertion relaxation. |
| T-05-02 | Tampering | `verification harness → filesystem` — the wipe step in `scripts/verifyPreview.mjs` and in `playwright.journey.config.ts`'s `webServer.command` | mitigate | Both delete only the three literal, hard-coded paths `./data/preview-check.db*` and `./data/journey.db*`. No path is interpolated from an environment value or an argument, no glob wider than the `-wal`/`-shm` siblings is used, and `CARGODEMO_DB_PATH` for the default `./data/cargodemo.db` is never a deletion target. |
| T-05-03 | Denial of service | `verification harness → process` — an orphaned server holding port 3000 blocks every later run, and the port never falls back | mitigate | `scripts/verifyPreview.mjs` spawns detached and registers a cleanup that kills the whole process group on success, failure, uncaught exception and `SIGINT`, escalating `SIGTERM` to `SIGKILL` after 5s. Playwright owns the lifecycle of its own `webServer` with `reuseExistingServer: false`. The two harnesses run sequentially in `verify:all`, never concurrently. |
| T-05-04 | Information disclosure | `unknown URL path → SPA fallback` — an unmatched `/api` path leaking the SPA document, or a boot error leaking a path or secret | mitigate | `scripts/verifyPreview.mjs` assertion E requires `GET /api/not-a-route` to return a `404` JSON `RESOURCE_NOT_FOUND` envelope with `content-type: application/json`, proving the fallback is registered after the API and cannot swallow API 404s. The readiness block prints only host, port, database path, counts and route count — no environment values and no secrets, and this build defines no secret to print. |
| T-05-05 | Spoofing | `build inputs → served bundle` — a stale or absent `dist/client` served as if current | mitigate | `scripts/ensureClientBuild.mjs` compares `dist/client/index.html` mtime against the newest mtime across `src/client/`, `src/shared/api/`, `vite.config.ts` and `package.json`, rebuilding when older or absent, and propagates a non-zero build exit code so a failed build aborts the start rather than serving the previous bundle. |
| T-05-06 | Elevation of privilege | `operator env → process` — booting against an unintended database or an unintended interface | mitigate | Configuration is parsed and validated at startup by wave 3's `src/server/config.ts`, which aborts on an invalid value rather than defaulting silently; the readiness block prints the resolved bind address and database path so the operator sees which database is live before anyone interacts with it. The port never auto-rebinds. |
| T-05-07 | Spoofing | Authentication of the acting user during the journey run | accept | There is no login, session or role check anywhere in this build: access control is deferred and out of scope by the recorded scope decision, and every action is attributed to wave 3's single server-resolved default actor. Residual risk is owned by `SCOPE-DECISION.md`, which states plainly that the approval chain and role enforcement are not demonstrated by this slice. |
</threat_model>

<verification>
Run in order; each must pass before the next is meaningful.

1. `npm install && npm run typecheck` — exits 0.
2. `npm test` — the wave 1-3 unit and integration suites are still green (no domain or route file was
   touched by this wave).
3. `rm -rf ./data dist/client && npm start` — one command, from nothing: the client builds, the schema
   migrates, the seed runs, the readiness block prints `http://0.0.0.0:3000`, and
   `curl -sf http://127.0.0.1:3000/api/queue` returns at least one row including `SHP-2026-0007`.
   Stop the server afterwards.
4. `npm run verify:preview` — exits 0 with `PREVIEW OK`. Specifically: seeded non-empty queue, SPA
   document at `/`, no frame-blocking header, deep-link fallback, JSON envelope on an unknown `/api`
   path, and no client link target outside `/` and `/shipments/...`.
5. `npm run test:e2e` — wave 4's queue and review specs still pass with 0 failing, 0 skipped, now
   partitioned away from the journey directory.
6. `npm run verify:journey` — the single end-to-end run passes with 0 failing, 0 skipped.
7. `npm run verify:all` — the whole chain green in one command.
8. **Scope check:** no `docker-compose.yml` in the repository; no `/api/health` and no reset route in
   `src/server/routes/`; exactly one new spec file under `e2e/`; no CI workflow file added.
</verification>

<success_criteria>
- **One command boots everything.** `npm start` on a fresh checkout with no database builds the
  client if needed, migrates, seeds, and binds `0.0.0.0:3000`, printing the preview URL. No second
  process, no datastore service, no compose file.
- **The queue is never empty on first load.** A freshly seeded boot lists flagged shipments,
  including `SHP-2026-0007` with three exception types; a boot that seeds and produces none fails
  loudly instead of serving an empty demo.
- **The preview renders.** `http://0.0.0.0:3000/` returns the queue document with no
  `X-Frame-Options` and no CSP `frame-ancestors`, deep links fall back to the SPA, unknown `/api`
  paths return the JSON error envelope, and every navigation element resolves to a route the app
  serves.
- **The in-scope journey slice is proved end to end in a real browser**, in one run, against the same
  command an operator types: flagged queue → canonical shipment opens → three exceptions with their
  triggering rule, authority and field-level evidence → an action submitted with a justification the
  human typed → the new status visible on the review screen and on the queue.
- **The justification gate holds.** The submit control is inert until the typed justification meets
  the server-advertised minimum, and the textarea is never prefilled.
- **Nothing out of scope was built or asserted.** No health endpoint, no reset endpoint or control, no
  scripted demo driver, no new test families, no coverage targets, no CI matrix — and no assertion
  against the AI summary, the recommendation, the document request or upload, revalidation,
  supervisor approval or the audit trail, all of which are deferred and out of scope.
- **The prior waves stay green.** `npm test` and `npm run test:e2e` both pass unchanged, and
  `npm run verify:all` is green end to end.
</success_criteria>

<output>
After completion, record the summary at
`.planning/express/cargodemo-cbp-cargo-exception-review-app/05-SUMMARY.md`, stating plainly:

- the single start command (`npm start`) and what it does in order (build-if-needed → migrate →
  seed → serve);
- the preview URL to open (`http://0.0.0.0:3000/`, the queue at the root path);
- the end-to-end proof command (`npm run verify:journey`) and the preview check
  (`npm run verify:preview`), plus the one-time `npx playwright install --with-deps chromium`
  prerequisite;
- exactly which steps of the canonical walkthrough this build proves, and which it does not, so no
  reader mistakes the slice for the whole;
- any contract a prior wave declared that turned out to be missing or wrong at wiring time — that is
  a dependency problem worth recording, not something to patch over silently.
</output>
