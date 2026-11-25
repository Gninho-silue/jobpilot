import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BillingEvent } from './types'

export type ApplyResult = 'applied' | 'duplicate' | 'ignored'

/**
 * Applies a billing event to the user's plan, at most once per event id.
 *
 * The event id is inserted in the same transaction as the plan change: a
 * concurrent duplicate blocks on the primary key until the first commits, then
 * fails with P2002 and is reported as a duplicate. If the plan change fails,
 * the whole transaction rolls back and the provider's retry is applied normally.
 */
export async function applyBillingEvent(provider: string, event: BillingEvent): Promise<ApplyResult> {
  if (event.type === 'ignored') return 'ignored'

  const plan = event.type === 'subscription.activated' ? 'PRO' : 'FREE'
  // A demo event changes only that demo row; an event naming a user never changes a demo.
  const demoId = event.type === 'subscription.activated' ? event.demoId : undefined
  const where: Prisma.UserWhereInput = demoId
    ? { id: demoId, isDemo: true }
    : event.userId
    ? { id: event.userId, isDemo: false }
    : event.customerId
      ? { stripeCustomerId: event.customerId }
      : { id: { in: [] } }

  try {
    await prisma.$transaction(async tx => {
      await tx.processedBillingEvent.create({ data: { id: `${provider}:${event.id}`, type: event.type } })
      await tx.user.updateMany({ where, data: { plan } })
    })
    return 'applied'
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate'
    throw err
  }
}
