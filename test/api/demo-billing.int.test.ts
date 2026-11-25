import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { setRequestCookie } from '@test/mocks/next-headers'
import { createUser } from '@test/helpers/db'
import { readJson } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'

// Checkout and portal for a demo visitor, against a fake provider.
const fake = vi.hoisted(() => ({
  name: 'fake',
  testMode: true,
  isTestMode() { return this.testMode },
  createCheckout: vi.fn(),
  createPortal: vi.fn(),
  parseWebhook: vi.fn(),
  deleteCustomer: vi.fn(),
}))
vi.mock('@/lib/billing', () => ({ billing: fake }))

const checkout = await import('@/app/api/stripe/checkout/route')
const portal = await import('@/app/api/stripe/portal/route')

beforeEach(async () => {
  fake.testMode = true
  fake.createCheckout.mockReset()
  fake.createPortal.mockReset()
  await prisma.user.create({ data: { id: 'demo_payer0001', email: 'demo_payer0001@demo.invalid', isDemo: true } })
  setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_payer0001'))
})

describe('demo checkout and portal', () => {
  it('test mode: a demo opens Stripe Checkout, marked as demo, and its customer is saved on the demo row', async () => {
    fake.createCheckout.mockResolvedValueOnce({ url: 'https://checkout.test/s', customerId: 'cus_demo1' })
    const res = await checkout.POST()
    expect(await readJson(res)).toEqual({ url: 'https://checkout.test/s' })
    expect(fake.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ userId: 'demo_payer0001', demoId: 'demo_payer0001' }))
    expect((await prisma.user.findUniqueOrThrow({ where: { id: 'demo_payer0001' } })).stripeCustomerId).toBe('cus_demo1')
  })

  it('test mode: a demo that paid opens the portal', async () => {
    await prisma.user.update({ where: { id: 'demo_payer0001' }, data: { stripeCustomerId: 'cus_demo1' } })
    fake.createPortal.mockResolvedValueOnce({ url: 'https://portal.test/p' })
    expect((await portal.POST()).status).toBe(200)
  })

  it('live mode (sk_live_): checkout and portal → 403 for a demo, and the provider is never called', async () => {
    fake.testMode = false
    await prisma.user.update({ where: { id: 'demo_payer0001' }, data: { stripeCustomerId: 'cus_demo1' } })
    expect((await checkout.POST()).status).toBe(403)
    expect((await portal.POST()).status).toBe(403)
    expect(fake.createCheckout).not.toHaveBeenCalled()
    expect(fake.createPortal).not.toHaveBeenCalled()
  })

  it('live mode does not affect a real user', async () => {
    fake.testMode = false
    await createUser('user_real01')
    signInAs('user_real01')
    fake.createCheckout.mockResolvedValueOnce({ url: 'https://checkout.test/r', customerId: 'cus_real1' })
    expect((await checkout.POST()).status).toBe(200)
    expect(fake.createCheckout).toHaveBeenCalledWith(expect.not.objectContaining({ demoId: expect.anything() }))
  })
})
