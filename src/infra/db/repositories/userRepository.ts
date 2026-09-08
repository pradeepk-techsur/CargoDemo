/**
 * User repository — named prepared statements, bound parameters only.
 */

import type { Db } from '../connection.js';
import type { UserRow } from '../../../shared/types/db.js';

export interface UserRepository {
  getById(id: string): UserRow | undefined;
  listActive(): UserRow[];
  upsert(row: UserRow): void;
}

export function createUserRepository(db: Db): UserRepository {
  const getByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const listActiveStmt = db.prepare('SELECT * FROM users WHERE active = 1 ORDER BY id');
  const upsertStmt = db.prepare(
    `INSERT INTO users (id, name, role, active, created_at, updated_at)
     VALUES (@id, @name, @role, @active, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, role = excluded.role, active = excluded.active,
       updated_at = excluded.updated_at`,
  );

  return {
    getById: (id) => getByIdStmt.get(id) as UserRow | undefined,
    listActive: () => listActiveStmt.all() as UserRow[],
    upsert: (row) => {
      upsertStmt.run(row);
    },
  };
}
