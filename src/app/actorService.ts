/**
 * Actor resolution (T-03-01). Access control is out of scope for this build:
 * there is no session, no token and no login. The acting identity is a
 * server-side constant (`CARGODEMO_DEFAULT_ACTOR_USER_ID`) resolved against the
 * `users` table on every request, so the name and role written onto every record
 * are read facts rather than client claims.
 *
 * No handler ever reads an actor, user id or role from a request body, query
 * string or header.
 */

import type { Db } from '../infra/db/connection.js';
import { repositories } from '../infra/db/index.js';
import { config } from '../server/config.js';
import type { UserRef } from '../shared/api/types.js';

export class ActorUnavailableError extends Error {
  constructor(message: string) {
    super(`ACTOR_UNAVAILABLE: ${message}`);
    this.name = 'ActorUnavailableError';
  }
}

/**
 * Resolve the single default actor from the database. Throws when the configured
 * user is absent or inactive — a boot failure rather than a mid-demo surprise.
 */
export function resolveActor(db: Db): UserRef & { role: 'CARGO_SPECIALIST' | 'SUPERVISOR' } {
  const id = config.CARGODEMO_DEFAULT_ACTOR_USER_ID;
  const user = repositories(db).users.getById(id);
  if (!user) {
    throw new ActorUnavailableError(`default actor '${id}' does not exist in the users table`);
  }
  if (user.active !== 1) {
    throw new ActorUnavailableError(`default actor '${id}' is not active`);
  }
  if (user.role !== 'CARGO_SPECIALIST' && user.role !== 'SUPERVISOR') {
    throw new ActorUnavailableError(
      `default actor '${id}' has role '${user.role}', which cannot author case actions`,
    );
  }
  return { id: user.id, name: user.name, role: user.role };
}
