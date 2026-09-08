/**
 * Preview verification — the check that makes "200-and-blank" impossible to ship.
 *
 * A preview that returns HTTP 200 and renders an empty rectangle looks like
 * success to every check that only asserts a status code. This script boots the
 * REAL start command (the way the preview launches the app), waits on the real
 * queue endpoint, and asserts everything that has to hold for the embedded iframe
 * to show a working, populated application:
 *   - a seeded, non-empty queue carrying the canonical shipment
 *   - the SPA document at /
 *   - NO frame-blocking header (no X-Frame-Options, no CSP frame-ancestors)
 *   - deep-link fallback to index.html
 *   - an unknown /api path returns the JSON error envelope, not HTML
 *   - same-origin only (no CORS header)
 *   - no dead client navigation target (static scan of src/client)
 *
 * Plain Node ESM (node:* + fetch), no dependency. It always kills its own server
 * process group on every exit path — a leaked server holding :3000 poisons every
 * later run.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const DB_PATH = './data/preview-check.db';
const BASE = 'http://127.0.0.1:3000';
const CANONICAL = 'SHP-2026-0007';
const CLEAN = 'SHP-2026-0011';

let child = null;
let killed = false;

function killServer() {
  if (killed || !child || child.pid == null) return;
  killed = true;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    /* group already gone */
  }
  // Hard-kill after a grace period so a stuck server cannot linger.
  const pid = child.pid;
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }, 5000).unref();
}

function cleanupAndExit(code) {
  killServer();
  // Give SIGTERM a moment before the process exits.
  setTimeout(() => process.exit(code), 300).unref();
}

process.on('SIGINT', () => cleanupAndExit(130));
process.on('uncaughtException', (err) => {
  process.stderr.write(`verifyPreview crashed: ${err?.stack ?? err}\n`);
  cleanupAndExit(1);
});

function wipeDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = join(ROOT, DB_PATH + suffix);
    if (existsSync(p)) rmSync(p, { force: true });
  }
}

async function waitForReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(
        `server exited (code ${child.exitCode}) before becoming ready. Captured output:\n${outputBuffer}`,
      );
    }
    try {
      const res = await fetch(`${BASE}/api/queue`);
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`server not ready within ${timeoutMs}ms. Captured output:\n${outputBuffer}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- static client-link scan -------------------------------------------------

const LINK_RE = /\b(?:to|href)=["'](\/[^"']*)["']/g;
const ABSOLUTE_RE = /https?:\/\//;

function scanClientLinks() {
  const clientDir = join(ROOT, 'src', 'client');
  const failures = [];
  const files = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  })(clientDir);

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      let m;
      LINK_RE.lastIndex = 0;
      while ((m = LINK_RE.exec(line)) !== null) {
        const target = m[1];
        if (target !== '/' && !target.startsWith('/shipments/')) {
          failures.push(`${relative(file)}:${i + 1} link target "${target}" is outside / and /shipments/...`);
        }
      }
      if (ABSOLUTE_RE.test(line)) {
        failures.push(`${relative(file)}:${i + 1} contains an absolute URL (breaks same-origin iframe)`);
      }
    });
  }
  return failures;
}

function relative(file) {
  return file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
}

// --- assertions --------------------------------------------------------------

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`);
}

let outputBuffer = '';

async function runAssertions() {
  // A. Seeded, non-empty queue.
  {
    const res = await fetch(`${BASE}/api/queue`);
    const ct = res.headers.get('content-type') ?? '';
    const body = await res.json().catch(() => null);
    const rows = body?.data ?? [];
    const canonical = rows.find((r) => r.shipment_id === CANONICAL);
    const cleanPresent = rows.some((r) => r.shipment_id === CLEAN);
    const okStatus = res.status === 200 && ct.startsWith('application/json');
    const okRows = rows.length >= 1;
    const okCanonical =
      !!canonical &&
      Array.isArray(canonical.exception_types) &&
      canonical.exception_types.length === 3 &&
      canonical.open_exception_count === 3;
    record(
      'A. Seeded, non-empty queue with canonical 3-exception shipment, clean off queue',
      okStatus && okRows && okCanonical && !cleanPresent,
      `status=${res.status} rows=${rows.length} canonical_types=${canonical?.exception_types?.length} open=${canonical?.open_exception_count} clean_present=${cleanPresent}`,
    );
  }

  // B. The preview document.
  let rootBody = '';
  {
    const res = await fetch(`${BASE}/`);
    rootBody = await res.text();
    const ct = res.headers.get('content-type') ?? '';
    const ok =
      res.status === 200 &&
      ct.startsWith('text/html') &&
      rootBody.includes('<div id="root"') &&
      /<script/i.test(rootBody);
    record(
      'B. GET / returns the SPA document (root div + a script tag)',
      ok,
      `status=${res.status} ct=${ct} hasRoot=${rootBody.includes('<div id="root"')} hasScript=${/<script/i.test(rootBody)}`,
    );

    // C. No frame blocking — the assertion this script exists for.
    const xfo = res.headers.get('x-frame-options');
    const csp = res.headers.get('content-security-policy');
    const cspRO = res.headers.get('content-security-policy-report-only');
    const cspHasFA = (v) => typeof v === 'string' && /frame-ancestors/i.test(v);
    const frameBlocked = xfo !== null || cspHasFA(csp) || cspHasFA(cspRO);
    record(
      'C. No frame-blocking header (no X-Frame-Options, no CSP frame-ancestors)',
      !frameBlocked,
      frameBlocked
        ? `offending: ${xfo !== null ? `x-frame-options: ${xfo}` : ''}${cspHasFA(csp) ? ` csp: ${csp}` : ''}${cspHasFA(cspRO) ? ` csp-report-only: ${cspRO}` : ''} — the preview iframe will render blank; remove the header rather than relaxing this check`
        : 'none present',
    );
  }

  // D. Deep-link fallback.
  {
    const res = await fetch(`${BASE}/shipments/${CANONICAL}`);
    const body = await res.text();
    const ct = res.headers.get('content-type') ?? '';
    const ok = res.status === 200 && ct.startsWith('text/html') && body.length === rootBody.length;
    record(
      'D. Deep link /shipments/:id falls back to the same index.html',
      ok,
      `status=${res.status} ct=${ct} sameLength=${body.length === rootBody.length} (${body.length} vs ${rootBody.length})`,
    );
  }

  // E. Unknown API path is JSON, not HTML.
  {
    const res = await fetch(`${BASE}/api/not-a-route`);
    const ct = res.headers.get('content-type') ?? '';
    const body = await res.json().catch(() => null);
    const ok =
      res.status === 404 &&
      ct.startsWith('application/json') &&
      body?.error?.code === 'RESOURCE_NOT_FOUND' &&
      typeof body?.error?.request_id === 'string';
    record(
      'E. Unknown /api path returns the JSON error envelope (RESOURCE_NOT_FOUND + request_id)',
      ok,
      `status=${res.status} ct=${ct} code=${body?.error?.code} request_id=${body?.error?.request_id ? 'present' : 'missing'}`,
    );
  }

  // F. Same-origin only.
  {
    const res = await fetch(`${BASE}/api/queue`);
    const acao = res.headers.get('access-control-allow-origin');
    record(
      'F. Same-origin only (no Access-Control-Allow-Origin on /api/queue)',
      acao === null,
      acao === null ? 'no CORS header' : `unexpected access-control-allow-origin: ${acao}`,
    );
  }

  // G. No dead navigation target — static scan.
  {
    const failures = scanClientLinks();
    record(
      'G. No dead client navigation target (static scan of src/client)',
      failures.length === 0,
      failures.length === 0 ? 'all link targets resolve to / or /shipments/...' : `\n    ${failures.join('\n    ')}`,
    );
  }
}

// --- main --------------------------------------------------------------------

async function main() {
  wipeDb();

  child = spawn('npm', ['start'], {
    cwd: ROOT,
    env: { ...process.env, CARGODEMO_DB_PATH: DB_PATH, CARGODEMO_SEED_ON_EMPTY: 'true' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const tee = (chunk) => {
    const s = chunk.toString();
    outputBuffer += s;
    process.stdout.write(s);
  };
  child.stdout.on('data', tee);
  child.stderr.on('data', tee);

  try {
    await waitForReady(120_000);
    await runAssertions();
  } catch (err) {
    process.stderr.write(`\n${err instanceof Error ? err.message : String(err)}\n`);
    cleanupAndExit(1);
    return;
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length === 0) {
    process.stdout.write(`\nPREVIEW OK  http://0.0.0.0:3000/\n`);
    cleanupAndExit(0);
  } else {
    process.stdout.write(`\nPREVIEW FAILED — ${failures.length} assertion(s):\n`);
    failures.forEach((f, i) => process.stdout.write(`  ${i + 1}. ${f.name}\n`));
    cleanupAndExit(1);
  }
}

main();
