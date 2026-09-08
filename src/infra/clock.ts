/**
 * Clock abstractions (TechArch 01-components §1.3.4).
 *
 * `SystemClock` reads the real wall clock; live actions use it. `SeedClock` is a
 * fixed base instant with a monotonic step helper, so every seeded timestamp is
 * a fixed offset from the base and two seed runs are byte-identical.
 */

export interface Clock {
  /** Current instant as ISO-8601 UTC with milliseconds. */
  now(): string;
}

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

/** ISO-8601 UTC with milliseconds, e.g. 2026-09-01T08:00:00.000Z. */
function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export class SeedClock implements Clock {
  private readonly baseMs: number;
  private cursorMinutes = 0;

  constructor(base = '2026-09-01T08:00:00.000Z') {
    const parsed = Date.parse(base);
    if (Number.isNaN(parsed)) {
      throw new Error(`SeedClock: invalid base instant '${base}'`);
    }
    this.baseMs = parsed;
  }

  /** The base instant (offset 0). */
  now(): string {
    return toIso(this.baseMs);
  }

  /** A fixed instant `n` minutes after the base. Pure — does not advance. */
  plusMinutes(n: number): string {
    return toIso(this.baseMs + n * 60_000);
  }

  /**
   * Monotonic step: returns the base + accumulated minutes, then advances the
   * cursor by `by` minutes (default 1). Deterministic given the call sequence.
   */
  step(by = 1): string {
    const ts = toIso(this.baseMs + this.cursorMinutes * 60_000);
    this.cursorMinutes += by;
    return ts;
  }

  /** Reset the monotonic cursor so a fresh seed run reproduces the same series. */
  reset(): void {
    this.cursorMinutes = 0;
  }
}
