import { verifyDemoCookie } from './cookie'

/**
 * What the proxy does with the demo cookie. A Clerk session always wins: signing
 * in during a demo removes the cookie, so the demo does not stay active in the
 * background. An invalid or expired cookie is removed too. The proxy only checks
 * the signature; every route still checks that the demo exists (getActor).
 */
export function demoProxyDecision({ userId, cookieValue }: { userId: string | null; cookieValue: string | undefined }) {
  if (!cookieValue) return { allowDemo: false, clearCookie: false }
  if (userId) return { allowDemo: false, clearCookie: true }
  const valid = verifyDemoCookie(cookieValue) !== null
  return { allowDemo: valid, clearCookie: !valid }
}
