/**
 * Identifier generators (TechArch 01-components §1.3.4).
 *
 * `UuidGenerator` produces random UUIDv4s for live rows. `DeterministicIdGenerator`
 * produces `<prefix><zero-padded counter>` ids; seeding uses it exclusively so
 * ids are stable across runs.
 */

import { randomUUID } from 'node:crypto';

export interface IdGenerator {
  next(): string;
}

export class UuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

export class DeterministicIdGenerator implements IdGenerator {
  private counter: number;

  constructor(
    private readonly prefix: string,
    private readonly width = 4,
    start = 1,
  ) {
    this.counter = start;
  }

  next(): string {
    const id = `${this.prefix}${String(this.counter).padStart(this.width, '0')}`;
    this.counter += 1;
    return id;
  }
}
