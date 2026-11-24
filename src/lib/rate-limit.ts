import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LLM_RATE_LIMIT } from '@/lib/config'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the next request would be allowed (0 when allowed). */
  retryAfterSeconds: number
}

interface RateLimitOptions {
  limit?: number
  windowMs?: number
  /** Injected in tests; defaults to the current time. */
  now?: Date
}

/**
 * Sliding-window rate limit stored in Postgres, so it holds across serverless
 * instances. One row per accepted request; rows older than the window are
 * pruned on each call, so a key never stores more than `limit` rows.
 *
 * A transaction-scoped advisory lock on the key serialises concurrent calls for
 * the same key (count + insert is atomic) without blocking other keys.
 */
export async function checkRateLimit(key: string, options: RateLimitOptions = {}): Promise<RateLimitResult> {
  const limit = options.limit ?? LLM_RATE_LIMIT.limit
  const windowMs = options.windowMs ?? LLM_RATE_LIMIT.windowMs
  const now = options.now ?? new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
    await tx.rateLimitHit.deleteMany({ where: { key, createdAt: { lte: windowStart } } })

    const hits = await tx.rateLimitHit.findMany({
      where: { key },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })

    if (hits.length >= limit) {
      const oldest = hits[0]!.createdAt.getTime()
      const retryAfterMs = oldest + windowMs - now.getTime()
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
    }

    await tx.rateLimitHit.create({ data: { key, createdAt: now } })
    return { allowed: true, remaining: limit - hits.length - 1, retryAfterSeconds: 0 }
  })
}

/** The per-user budget shared by every route that calls the LLM. */
export function checkLlmRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`llm:${userId}`)
}

export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait before trying again.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
  )
}
