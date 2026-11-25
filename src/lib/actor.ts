import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { DEMO_COOKIE, verifyDemoCookie } from '@/lib/demo/cookie'

/**
 * Who is calling: a signed-in Clerk user, or a demo visitor (signed cookie,
 * row with isDemo = true). Every API route starts here; null → 401.
 * A Clerk session always wins over a demo cookie.
 */
export type Actor = { kind: 'user'; id: string } | { kind: 'demo'; id: string }

export async function getActor(): Promise<Actor | null> {
  const { userId } = await auth()
  if (userId) return { kind: 'user', id: userId }

  const demoId = verifyDemoCookie((await cookies()).get(DEMO_COOKIE)?.value)
  if (!demoId) return null
  // The cookie outlives a purge or a reset: the demo must still exist.
  const demo = await prisma.user.findFirst({ where: { id: demoId, isDemo: true }, select: { id: true } })
  return demo ? { kind: 'demo', id: demo.id } : null
}
