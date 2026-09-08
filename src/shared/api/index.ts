/**
 * The single import path for the API contract.
 *
 * Wave 4 imports ONLY from `src/shared/api`. It must not reach into
 * `src/server`, `src/app`, `src/domain` or `src/infra` (TechArch 01-components
 * §1.2 layer rule). The two lines below are asserted verbatim by the contract
 * greps — do not collapse or reorder them.
 */

export * from './types';
export * from './errors';
