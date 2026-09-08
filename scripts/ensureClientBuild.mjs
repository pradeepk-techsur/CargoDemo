/**
 * prestart client-build guard.
 *
 * Plain Node ESM (no TypeScript, no dependency beyond node:*) so it runs before
 * anything in the project is compiled — npm invokes it automatically as
 * `prestart`, which is the whole reason `npm start` is a single command on a
 * fresh checkout.
 *
 * It builds `dist/client` ONLY when that bundle is missing or is older than the
 * newest client source. A stale bundle silently served would be worse than a
 * failed start, so a non-zero build exit propagates. `CARGODEMO_SKIP_CLIENT_BUILD=1`
 * bypasses the check entirely (a debugging escape hatch used by nothing here).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const DIST_INDEX = join(ROOT, 'dist', 'client', 'index.html');

// The inputs whose change must trigger a rebuild: the whole client tree, the
// shared api contract the client imports, the vite config and package.json.
const SOURCE_ROOTS = [
  join(ROOT, 'src', 'client'),
  join(ROOT, 'src', 'shared', 'api'),
];
const SOURCE_FILES = [join(ROOT, 'vite.config.ts'), join(ROOT, 'package.json')];

/** Recursively collect the maximum mtimeMs under a directory. */
function newestMtimeUnder(dir) {
  let newest = 0;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0; // a missing source root contributes nothing
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtimeUnder(full));
    } else if (entry.isFile()) {
      newest = Math.max(newest, statSync(full).mtimeMs);
    }
  }
  return newest;
}

function newestSourceMtime() {
  let newest = 0;
  for (const root of SOURCE_ROOTS) newest = Math.max(newest, newestMtimeUnder(root));
  for (const file of SOURCE_FILES) {
    if (existsSync(file)) newest = Math.max(newest, statSync(file).mtimeMs);
  }
  return newest;
}

function main() {
  if (process.env.CARGODEMO_SKIP_CLIENT_BUILD === '1') {
    process.stdout.write('client build skipped (CARGODEMO_SKIP_CLIENT_BUILD=1)\n');
    return;
  }

  const bundleExists = existsSync(DIST_INDEX);
  const bundleMtime = bundleExists ? statSync(DIST_INDEX).mtimeMs : -1;
  const sourceMtime = newestSourceMtime();

  if (bundleExists && bundleMtime >= sourceMtime) {
    process.stdout.write('client bundle up to date\n');
    return;
  }

  process.stdout.write(
    bundleExists
      ? 'client bundle is stale; rebuilding dist/client\n'
      : 'client bundle missing; building dist/client\n',
  );

  // Never delete dist/ ourselves — `vite build` sets emptyOutDir.
  const result = spawnSync('npm', ['run', 'build:client'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.stderr.write(`client build failed (exit ${result.status ?? 'signal'})\n`);
    process.exit(result.status ?? 1);
  }
}

main();
