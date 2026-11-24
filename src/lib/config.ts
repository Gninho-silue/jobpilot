export const FREE_TIER_LIMITS = {
  applications: 5,
  cvAdaptations: 3,
  coverLetters: 3,
} as const

export const PLANS = {
  FREE: 'FREE',
  PRO: 'PRO',
} as const

/** Per-user budget shared by every route that calls the LLM (see lib/rate-limit.ts). */
export const LLM_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const
