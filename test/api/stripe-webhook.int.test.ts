import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { TEST_STRIPE_WEBHOOK_SECRET } from '@test/setup/env'
import { createUser } from '@test/helpers/db'
import { uid } from '@test/helpers/ids'
import { POST } from '@/app/api/webhooks/stripe/route'

const signer = new Stripe('sk_test_dummy')

function event(type: string, object: Record<string, unknown>, id = `evt_${uid('t')}`) {
  return JSON.stringify({ id, object: 'event', type, data: { object } })
}

function deliver(payload: string, signature?: string): Promise<Response> {
  const headers = new Headers({ 'content-type': 'application/json' })
  const sig = signature ?? signer.webhooks.generateTestHeaderString({ payload, secret: TEST_STRIPE_WEBHOOK_SECRET })
  if (signature !== '') headers.set('stripe-signature', sig)
  return POST(new NextRequest('http://localhost:3000/api/webhooks/stripe', { method: 'POST', headers, body: payload }))
}

const planOf = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).plan

describe('POST /api/webhooks/stripe', () => {
  let user: string
  let customer: string

  beforeEach(async () => {
    user = uid('stripe')
    customer = `cus_${uid('c')}`
    await createUser(user, { stripeCustomerId: customer })
  })

  describe('signature', () => {
    it('400 without a stripe-signature header', async () => {
      const res = await deliver(event('checkout.session.completed', { metadata: { clerkUserId: user } }), '')
      expect(res.status).toBe(400)
      expect(await planOf(user)).toBe('FREE')
    })

    it('400 with a signature made with another secret', async () => {
      const payload = event('checkout.session.completed', { metadata: { clerkUserId: user } })
      const forged = signer.webhooks.generateTestHeaderString({ payload, secret: 'whsec_attacker' })
      const res = await deliver(payload, forged)
      expect(res.status).toBe(400)
      expect(await planOf(user)).toBe('FREE')
    })

    it('400 when the payload was changed after signing', async () => {
      const original = event('checkout.session.completed', { metadata: { clerkUserId: 'someone_else' } })
      const sig = signer.webhooks.generateTestHeaderString({ payload: original, secret: TEST_STRIPE_WEBHOOK_SECRET })
      const tampered = original.replace('someone_else', user)
      const res = await deliver(tampered, sig)
      expect(res.status).toBe(400)
      expect(await planOf(user)).toBe('FREE')
    })
  })

  it('checkout.session.completed → user becomes PRO', async () => {
    const res = await deliver(event('checkout.session.completed', { object: 'checkout.session', metadata: { clerkUserId: user } }))
    expect(res.status).toBe(200)
    expect(await planOf(user)).toBe('PRO')
  })

  it('checkout.session.completed without clerkUserId metadata → ignored', async () => {
    const res = await deliver(event('checkout.session.completed', { object: 'checkout.session', metadata: {} }))
    expect(res.status).toBe(200)
    expect(await planOf(user)).toBe('FREE')
  })

  it('customer.subscription.deleted → back to FREE', async () => {
    await prisma.user.update({ where: { id: user }, data: { plan: 'PRO' } })
    const res = await deliver(event('customer.subscription.deleted', { object: 'subscription', customer, status: 'canceled' }))
    expect(res.status).toBe(200)
    expect(await planOf(user)).toBe('FREE')
  })

  it.each([
    ['active', 'PRO'],
    ['trialing', 'PRO'],
    ['past_due', 'FREE'],
    ['unpaid', 'FREE'],
  ] as const)('customer.subscription.updated with status %s → %s', async (status, plan) => {
    await prisma.user.update({ where: { id: user }, data: { plan: plan === 'PRO' ? 'FREE' : 'PRO' } })
    await deliver(event('customer.subscription.updated', { object: 'subscription', customer, status }))
    expect(await planOf(user)).toBe(plan)
  })

  it('an event for an unknown customer changes nothing', async () => {
    await prisma.user.update({ where: { id: user }, data: { plan: 'PRO' } })
    const res = await deliver(event('customer.subscription.deleted', { object: 'subscription', customer: 'cus_unknown' }))
    expect(res.status).toBe(200)
    expect(await planOf(user)).toBe('PRO')
  })

  it('unhandled event types are acknowledged with 200', async () => {
    const res = await deliver(event('invoice.paid', { object: 'invoice' }))
    expect(res.status).toBe(200)
  })

  // Characterization of audit item 3 (fixed in step 2): no idempotence. Stripe
  // retries deliveries; a late retry of an old checkout event re-upgrades a
  // user whose subscription was cancelled in between.
  it('KNOWN GAP: a replayed checkout event re-upgrades a cancelled user', async () => {
    const checkout = event('checkout.session.completed', { object: 'checkout.session', metadata: { clerkUserId: user } }, 'evt_same_id')
    await deliver(checkout)
    await deliver(event('customer.subscription.deleted', { object: 'subscription', customer }))
    expect(await planOf(user)).toBe('FREE')

    await deliver(checkout) // same event id, delivered again
    expect(await planOf(user)).toBe('PRO')
  })
})
