import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { DEMO_COOKIE } from '@/lib/demo/cookie'
import { demoProxyDecision } from '@/lib/demo/proxy'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const demo = demoProxyDecision({ userId, cookieValue: request.cookies.get(DEMO_COOKIE)?.value })

  if (!isPublicRoute(request) && !demo.allowDemo) {
    await auth.protect()
  }
  if (demo.clearCookie) {
    const response = NextResponse.next()
    response.cookies.delete(DEMO_COOKIE)
    return response
  }
})

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
