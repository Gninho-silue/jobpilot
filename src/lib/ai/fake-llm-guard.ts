/**
 * When the end-to-end tests' fake language model (fake-llm.ts) may answer.
 * No imports: next.config.ts loads this file at build time.
 */
type Env = Record<string, string | undefined>

/** On only with E2E_FAKE_LLM=1, and never on a Vercel production deployment. */
export function fakeLlmEnabled(env: Env = process.env): boolean {
  return env.E2E_FAKE_LLM === '1' && env.VERCEL_ENV !== 'production'
}

/** A production build fails if E2E_FAKE_LLM is set at all (called by next.config.ts). */
export function assertNoFakeLlmInProduction(env: Env = process.env): void {
  if (env.VERCEL_ENV === 'production' && env.E2E_FAKE_LLM !== undefined) {
    throw new Error('[env] E2E_FAKE_LLM must not be set in production: it replaces the language model with fixed test answers.')
  }
}
