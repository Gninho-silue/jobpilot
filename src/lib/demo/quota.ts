import { NextResponse } from 'next/server'
import type { Actor } from '@/lib/actor'
import { clientIp } from '@/lib/client-ip'
import { checkRateLimit } from '@/lib/rate-limit'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * AI budget of a demo visitor, per day, whatever its plan (also after a test
 * payment). "heavy": CV adaptation, cover letter, interview questions, offer
 * analysis. "feedback": one call per interview answer, so it has its own
 * budget. The per-IP cap stops a visitor who opens demo after demo.
 */
export const DEMO_QUOTAS = {
  heavy: { perDemo: 3, perIp: 10 },
  feedback: { perDemo: 10, perIp: 30 },
} as const

export type DemoQuotaKind = keyof typeof DEMO_QUOTAS

const MESSAGE: Record<DemoQuotaKind, string> = {
  heavy: `Demo limit reached: ${DEMO_QUOTAS.heavy.perDemo} AI generations per day. Create a free account to keep going.`,
  feedback: `Demo limit reached: ${DEMO_QUOTAS.feedback.perDemo} interview feedbacks per day. Create a free account to keep going.`,
}

/** null when the call may go on (always for a signed-in user); else the 429 to return. */
export async function checkDemoQuota(actor: Actor, request: Request, kind: DemoQuotaKind): Promise<NextResponse | null> {
  if (actor.kind !== 'demo') return null
  const quota = DEMO_QUOTAS[kind]

  for (const [key, limit] of [
    [`demo-${kind}:${actor.id}`, quota.perDemo],
    [`demo-${kind}-ip:${clientIp(request)}`, quota.perIp],
  ] as const) {
    const result = await checkRateLimit(key, { limit, windowMs: DAY_MS })
    if (!result.allowed) {
      return NextResponse.json(
        { error: MESSAGE[kind] },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
      )
    }
  }
  return null
}
