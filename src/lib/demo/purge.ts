import { prisma } from '@/lib/prisma'

/** A demo workspace lives 24 h, like its cookie. */
export const DEMO_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Deletes the demo workspaces older than 24 h (their applications and usage go
 * with them: ON DELETE CASCADE) and the demo rate-limit rows of that age.
 * Only rows with isDemo = true are ever deleted.
 */
export async function purgeExpiredDemos(now = new Date()): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - DEMO_MAX_AGE_MS)
  const expired = await prisma.user.findMany({ where: { isDemo: true, createdAt: { lt: cutoff } }, select: { id: true } })
  const ids = expired.map(user => user.id)

  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids }, isDemo: true } })
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: 'demo-' }, createdAt: { lt: cutoff } } })
  return { deleted: ids.length }
}

/** Deletes one demo workspace now ("Exit demo"). */
export async function deleteDemo(id: string): Promise<void> {
  await prisma.user.deleteMany({ where: { id, isDemo: true } })
}
