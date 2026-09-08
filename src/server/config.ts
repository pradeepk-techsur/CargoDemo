/**
 * Environment configuration for CargoDemo (TechArch 05-tech-stack §5.5).
 *
 * Fail-fast: an invalid value throws rather than defaulting silently. Every
 * variable is validated here and nowhere else, so a misconfiguration aborts the
 * process at boot with a named error instead of producing subtle runtime drift.
 */

export type AiProvider = 'openai' | 'anthropic' | 'none';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Config {
  CARGODEMO_HOST: string;
  CARGODEMO_PORT: number;
  CARGODEMO_DB_PATH: string;
  CARGODEMO_DOC_STORAGE_DIR: string;
  CARGODEMO_SEED_ON_EMPTY: boolean;
  CARGODEMO_SEED_CLOCK: string;
  CARGODEMO_AI_PROVIDER: AiProvider;
  CARGODEMO_LOG_LEVEL: LogLevel;
  CARGODEMO_DEFAULT_ACTOR_USER_ID: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(`CONFIG_INVALID: ${message}`);
    this.name = 'ConfigError';
  }
}

const AI_PROVIDERS: readonly AiProvider[] = ['openai', 'anthropic', 'none'];
const LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'];

function readString(env: NodeJS.ProcessEnv, key: string, fallback: string): string {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  return raw;
}

function readBool(env: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new ConfigError(`${key} must be 'true' or 'false', got '${raw}'`);
}

function readPort(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new ConfigError(`${key} must be an integer port 1-65535, got '${raw}'`);
  }
  return n;
}

function readEnum<T extends string>(
  env: NodeJS.ProcessEnv,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ConfigError(`${key} must be one of ${allowed.join('|')}, got '${raw}'`);
  }
  return raw as T;
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Parse and validate configuration from an environment map. Tests inject a map;
 * production passes `process.env`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const host = readString(env, 'CARGODEMO_HOST', '0.0.0.0');

  // A localhost/loopback bind cannot be reached by the sandbox preview proxy;
  // warn loudly rather than defaulting silently to a value that blanks the demo.
  if (host === 'localhost' || host === '127.0.0.1') {
    process.stderr.write(
      `CONFIG_WARNING: CARGODEMO_HOST='${host}' is loopback-only; the preview proxy cannot reach it. Use 0.0.0.0.\n`,
    );
  }

  const seedClock = readString(env, 'CARGODEMO_SEED_CLOCK', '2026-09-01T08:00:00.000Z');
  if (!ISO_INSTANT.test(seedClock) || Number.isNaN(Date.parse(seedClock))) {
    throw new ConfigError(
      `CARGODEMO_SEED_CLOCK must be an ISO-8601 UTC instant with milliseconds, got '${seedClock}'`,
    );
  }

  return {
    CARGODEMO_HOST: host,
    CARGODEMO_PORT: readPort(env, 'CARGODEMO_PORT', 3000),
    CARGODEMO_DB_PATH: readString(env, 'CARGODEMO_DB_PATH', './data/cargodemo.db'),
    CARGODEMO_DOC_STORAGE_DIR: readString(env, 'CARGODEMO_DOC_STORAGE_DIR', './data/documents'),
    CARGODEMO_SEED_ON_EMPTY: readBool(env, 'CARGODEMO_SEED_ON_EMPTY', true),
    CARGODEMO_SEED_CLOCK: seedClock,
    CARGODEMO_AI_PROVIDER: readEnum(env, 'CARGODEMO_AI_PROVIDER', AI_PROVIDERS, 'none'),
    CARGODEMO_LOG_LEVEL: readEnum(env, 'CARGODEMO_LOG_LEVEL', LOG_LEVELS, 'info'),
    CARGODEMO_DEFAULT_ACTOR_USER_ID: readString(
      env,
      'CARGODEMO_DEFAULT_ACTOR_USER_ID',
      'usr-cs-001',
    ),
  };
}

/** The process-wide validated configuration. */
export const config: Config = loadConfig();
