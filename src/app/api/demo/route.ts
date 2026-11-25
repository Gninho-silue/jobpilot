import { NextResponse } from 'next/server'
import { getActor } from '@/lib/actor'
import { clientIp } from '@/lib/client-ip'
import { DEMO_COOKIE, demoCookieOptions, isDemoEnabled, signDemoCookie } from '@/lib/demo/cookie'
import { deleteDemo, purgeExpiredDemos } from '@/lib/demo/purge'
import { createDemoWorkspace } from '@/lib/demo/seed'
import { checkRateLimit, tooManyRequests } from '@/lib/rate-limit'

/** Demo starts allowed per IP and per hour. */
const DEMO_STARTS = { limit: 5, windowMs: 60 * 60 * 1000 }

/**
 * Starts a demo workspace. The one API route without an actor: it creates the
 * actor (rate-limited per IP), with fictional data only.
 */
export async function POST(request: Request) {
  if (!isDemoEnabled()) {
    return NextResponse.json({ error: 'The demo is not available right now.' }, { status: 503 })
  }

  const limit = await checkRateLimit(`demo-start:${clientIp(request)}`, DEMO_STARTS)
  if (!limit.allowed) return tooManyRequests(limit)

  try {
    await purgeExpiredDemos()
  } catch (err) {
    // The daily cron purges too: a failure here must not block a visitor.
    console.error('[demo] purge failed:', err)
  }

  const demoId = await createDemoWorkspace()
  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303)
  response.cookies.set(DEMO_COOKIE, signDemoCookie(demoId), demoCookieOptions())
  return response
}

/** Leaves the demo: the workspace is deleted and the cookie cleared. */
export async function DELETE() {
  const actor = await getActor()
  if (actor?.kind === 'demo') await deleteDemo(actor.id)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEMO_COOKIE, '', { ...demoCookieOptions(), maxAge: 0 })
  return response
}
