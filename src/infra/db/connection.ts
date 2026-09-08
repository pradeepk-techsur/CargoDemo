/**
 * SQLite connection factory.
 *
 * Every connection sets, in this exact order, WAL journalling, foreign-key
 * enforcement (off by default in SQLite — ON DELETE RESTRICT is inert without
 * it) and a busy timeout (TechArch §2.1). Callers must use `openDb` and never
 * construct `better-sqlite3` directly, so these pragmas are never skipped.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

import { config } from '../../server/config.js';

export type Db = Database.Database;

export class DbUnavailableError extends Error {
  constructor(path: string, cause: unknown) {
    super(`DB_UNAVAILABLE: cannot open database at '${path}': ${String(cause)}`);
    this.name = 'DbUnavailableError';
  }
}

/**
 * Open (creating if needed) the SQLite database at `path`, defaulting to the
 * configured path. Parent directories are created. Sets the required pragmas.
 */
export function openDb(path?: string): Db {
  const target = path ?? config.CARGODEMO_DB_PATH;
  let db: Db;
  try {
    if (target !== ':memory:') {
      mkdirSync(dirname(target), { recursive: true });
    }
    db = new Database(target);
  } catch (cause) {
    throw new DbUnavailableError(target, cause);
  }

  // Order matters: journal mode, then FK enforcement, then busy timeout.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}
