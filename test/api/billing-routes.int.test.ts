import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { BillingProvider } from '@/lib/billing/types'
import { signInAs } from '@test/mocks/clerk'
import { createUser } from '@test/helpers/db'
import { readJson } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'

// The checkout and portal routes depend only on the BillingProvider interface:
// here they run against a fake provider, with no Stripe code involved.
const fake = vi.hoisted(() => ({
  name: 'fake',
  createCheckout: vi.fn(),
  createPortal: vi.fn(),
  parseWebhook: vi.fn(),
}))
vi.mock('@/lib/billing', () => ({ billing: fake }))

const checkout = await import('@/app/api/stripe/checkout/route')
const portal = await import('@/app/api/stripe/portal/route')

beforeEach(() => {
  fake.createCheckout.mockReset()
  fake.createPortal.mockReset()
})

const APP = 'http://localhost:3000'

describe('POST /api/stripe/checkout (fake provider)', () => {
  it('first checkout: passes no customer id, saves the one the provider returns, returns the URL', async () => {
    const user = uid('u')
    await createUser(user)
    signInAs(user)
    fake.createCheckout.mockResolvedValueOnce({ url: 'https://pay.test/s1', customerId: 'cust_new' })

    const res = await checkout.POST()

    expect(await readJson(res)).toEqual({ url: 'https://pay.test/s1' })
    expect(fake.createCheckout).toHaveBeenCalledWith({
      userId: user,
      email: `${user}@example.test`,
      customerId: null,
      successUrl: `${APP}/dashboard?upgraded=true`,
      cancelUrl: `${APP}/dashboard`,
    } satisfies Parameters<BillingProvider['createCheckout']>[0])
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user } })).stripeCustomerId).toBe('cust_new')
  })

  it('returning customer: reuses the stored customer id', async () => {
    const user = uid('u')
    await createUser(user, { stripeCustomerId: 'cust_old' })
    signInAs(user)
    fake.createCheckout.mockResolvedValueOnce({ url: 'https://pay.test/s2', customerId: 'cust_old' })

    await checkout.POST()

    expect(fake.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'cust_old' }))
  })

  it('500 with a generic message when the provider fails', async () => {
    const user = uid('u')
    await createUser(user)
    signInAs(user)
    fake.createCheckout.mockRejectedValueOnce(new Error('provider down: secret detail'))

    const res = await checkout.POST()

    expect(res.status).toBe(500)
    expect(await readJson(res)).toEqual({ error: 'Could not start checkout. Please try again.' })
  })
})

describe('POST /api/stripe/portal (fake provider)', () => {
  it('opens the portal for the stored customer id', async () => {
    const user = uid('u')
    await createUser(user, { stripeCustomerId: 'cust_9' })
    signInAs(user)
    fake.createPortal.mockResolvedValueOnce({ url: 'https://pay.test/portal' })

    const res = await portal.POST()

    expect(await readJson(res)).toEqual({ url: 'https://pay.test/portal' })
    expect(fake.createPortal).toHaveBeenCalledWith({ customerId: 'cust_9', returnUrl: `${APP}/dashboard` })
  })

  it('400 when the user never subscribed', async () => {
    const user = uid('u')
    await createUser(user)
    signInAs(user)
    const res = await portal.POST()
    expect(res.status).toBe(400)
    expect(fake.createPortal).not.toHaveBeenCalled()
  })
})
