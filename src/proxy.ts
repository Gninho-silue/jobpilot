import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { DEMO_COOKIE } from '@/lib/demo/cookie'
import { demoProxyDecision } from '@/lib/demo/proxy'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  // Start or leave a demo (POST is rate-limited per IP), and the purge cron (CRON_SECRET).
  '/api/demo',
  '/api/cron(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const demo = demoProxyDecision({ userId, cookieValue: request.cookies.get(DEMO_COOKIE)?.value })

  if (!isPublicRoute(request) && !demo.allowDemo) {
    await auth.protect()
  }
  // /api/demo sets or clears the cookie itself: two Set-Cookie headers would race.
  if (demo.clearCookie && request.nextUrl.pathname !== '/api/demo') {
    const response = NextResponse.next()
    response.cookies.delete(DEMO_COOKIE)
    return response
  }
})

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
