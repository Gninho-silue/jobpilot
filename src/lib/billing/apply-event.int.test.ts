import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createUser } from '@test/helpers/db'
import { uid } from '@test/helpers/ids'
import { applyBillingEvent } from './apply-event'
import type { BillingEvent } from './types'

// Provider-independent: these are the internal events any BillingProvider
// (Stripe today, a Merchant of Record later) turns its webhooks into.

const planOf = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).plan

function activated(extra: Partial<Extract<BillingEvent, { type: 'subscription.activated' }>> = {}): BillingEvent {
  return { id: uid('evt'), type: 'subscription.activated', isNewSubscription: true, ...extra }
}
function canceled(extra: Partial<Extract<BillingEvent, { type: 'subscription.canceled' }>> = {}): BillingEvent {
  return { id: uid('evt'), type: 'subscription.canceled', ...extra }
}

describe('applyBillingEvent', () => {
  it('subscription.activated with a user id → PRO', async () => {
    const user = uid('u')
    await createUser(user)
    await expect(applyBillingEvent('fake', activated({ userId: user }))).resolves.toBe('applied')
    expect(await planOf(user)).toBe('PRO')
  })

  it('subscription.activated with only a customer id → finds the user by customer id', async () => {
    const user = uid('u')
    await createUser(user, { stripeCustomerId: 'cus_1' })
    await applyBillingEvent('fake', activated({ customerId: 'cus_1' }))
    expect(await planOf(user)).toBe('PRO')
  })

  it('subscription.canceled → FREE', async () => {
    const user = uid('u')
    await createUser(user, { plan: 'PRO', stripeCustomerId: 'cus_2' })
    await applyBillingEvent('fake', canceled({ customerId: 'cus_2' }))
    expect(await planOf(user)).toBe('FREE')
  })

  it('an event for an unknown user or customer changes nothing', async () => {
    const user = uid('u')
    await createUser(user, { plan: 'PRO', stripeCustomerId: 'cus_3' })
    await expect(applyBillingEvent('fake', canceled({ customerId: 'cus_other' }))).resolves.toBe('applied')
    await expect(applyBillingEvent('fake', activated({ userId: 'nobody' }))).resolves.toBe('applied')
    expect(await planOf(user)).toBe('PRO')
  })

  it('ignored events are acknowledged and not recorded', async () => {
    await expect(applyBillingEvent('fake', { id: 'evt_x', type: 'ignored', providerType: 'invoice.paid' })).resolves.toBe('ignored')
    expect(await prisma.processedBillingEvent.count()).toBe(0)
  })

  describe('idempotence', () => {
    it('the same event id applied twice → the second is a duplicate and changes nothing', async () => {
      const user = uid('u')
      await createUser(user, { stripeCustomerId: 'cus_4' })
      const checkout = activated({ userId: user })

      await expect(applyBillingEvent('fake', checkout)).resolves.toBe('applied')
      await applyBillingEvent('fake', canceled({ customerId: 'cus_4' }))
      await expect(applyBillingEvent('fake', checkout)).resolves.toBe('duplicate')

      expect(await planOf(user)).toBe('FREE')
    })

    it('records the event as "<provider>:<event id>"', async () => {
      const user = uid('u')
      await createUser(user)
      await applyBillingEvent('fake', activated({ id: 'evt_42', userId: user }))
      expect(await prisma.processedBillingEvent.findUnique({ where: { id: 'fake:evt_42' } })).toMatchObject({
        type: 'subscription.activated',
      })
    })

    it('the same event id from two different providers is not a duplicate', async () => {
      const user = uid('u')
      await createUser(user)
      await expect(applyBillingEvent('a', activated({ id: 'evt_1', userId: user }))).resolves.toBe('applied')
      await expect(applyBillingEvent('b', activated({ id: 'evt_1', userId: user }))).resolves.toBe('applied')
    })

    it('5 simultaneous deliveries of one event → applied once, 4 duplicates', async () => {
      const user = uid('u')
      await createUser(user)
      const event = activated({ userId: user })

      const results = await Promise.all(Array.from({ length: 5 }, () => applyBillingEvent('fake', event)))

      expect(results.sort()).toEqual(['applied', 'duplicate', 'duplicate', 'duplicate', 'duplicate'])
    })
  })
})
