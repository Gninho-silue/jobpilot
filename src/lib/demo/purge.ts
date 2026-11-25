import { billing } from '@/lib/billing'
import { prisma } from '@/lib/prisma'

/** A demo workspace lives 24 h, like its cookie. */
export const DEMO_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Deletes the Stripe test customers of deleted demos; never with live keys; a failure is only logged. */
async function deleteTestCustomers(customerIds: Array<string | null>): Promise<void> {
  if (!billing.isTestMode()) return
  for (const customerId of customerIds) {
    if (!customerId) continue
    try {
      await billing.deleteCustomer(customerId)
    } catch (err) {
      console.error('[demo] could not delete test customer', customerId, err)
    }
  }
}

/**
 * Deletes the demo workspaces older than 24 h (their applications and usage go
 * with them: ON DELETE CASCADE), their Stripe test customers and the demo
 * rate-limit rows of that age. Only rows with isDemo = true are ever deleted.
 */
export async function purgeExpiredDemos(now = new Date()): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - DEMO_MAX_AGE_MS)
  const expired = await prisma.user.findMany({
    where: { isDemo: true, createdAt: { lt: cutoff } },
    select: { id: true, stripeCustomerId: true },
  })

  if (expired.length) {
    await prisma.user.deleteMany({ where: { id: { in: expired.map(user => user.id) }, isDemo: true } })
    await deleteTestCustomers(expired.map(user => user.stripeCustomerId))
  }
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: 'demo-' }, createdAt: { lt: cutoff } } })
  return { deleted: expired.length }
}

/** Deletes one demo workspace now ("Exit demo"). */
export async function deleteDemo(id: string): Promise<void> {
  const demo = await prisma.user.findFirst({ where: { id, isDemo: true }, select: { stripeCustomerId: true } })
  if (!demo) return
  await prisma.user.deleteMany({ where: { id, isDemo: true } })
  await deleteTestCustomers([demo.stripeCustomerId])
}
