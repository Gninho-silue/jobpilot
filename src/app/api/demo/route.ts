import { NextResponse } from 'next/server'
import { getActor } from '@/lib/actor'
import { clientIp } from '@/lib/client-ip'
import { DEMO_COOKIE, demoCookieOptions, isDemoEnabled, signDemoCookie } from '@/lib/demo/cookie'
import { deleteDemo, purgeExpiredDemos } from '@/lib/demo/purge'
import { createDemoWorkspace } from '@/lib/demo/seed'
import { checkRateLimit } from '@/lib/rate-limit'

/** Demo starts allowed per IP and per hour. */
const DEMO_STARTS = { limit: 5, windowMs: 60 * 60 * 1000 }

/** A 303 back to a page: a reload of that page never re-sends the form. */
function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303)
}

/**
 * Starts a demo workspace. The one API route without an actor: it creates the
 * actor (rate-limited per IP), with fictional data only. Always answers with a
 * 303 (dashboard, or the home page with ?demo=<reason>), never with JSON.
 */
export async function POST(request: Request) {
  if (!isDemoEnabled()) return redirectTo(request, '/?demo=unavailable')
  try {
    return await startDemo(request)
  } catch (err) {
    console.error('[demo] could not start a demo:', err)
    return redirectTo(request, '/?demo=error')
  }
}

async function startDemo(request: Request): Promise<NextResponse> {
  // Already signed in, or already in a demo that still exists: no new workspace.
  if (await getActor()) return redirectTo(request, '/dashboard')

  // Only accepted starts are counted (checkRateLimit records nothing on a refusal).
  const limit = await checkRateLimit(`demo-start:${clientIp(request)}`, DEMO_STARTS)
  if (!limit.allowed) return redirectTo(request, '/?demo=limit')

  try {
    await purgeExpiredDemos()
  } catch (err) {
    // The daily cron purges too: a failure here must not block a visitor.
    console.error('[demo] purge failed:', err)
  }

  const demoId = await createDemoWorkspace()
  const response = redirectTo(request, '/dashboard')
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
