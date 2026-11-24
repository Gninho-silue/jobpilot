import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { stripe } from '@test/mocks/stripe'
import { TEST_STRIPE_WEBHOOK_SECRET } from '@test/setup/env'
import { InvalidWebhookSignatureError } from './types'
import { stripeBillingProvider as provider } from './stripe-provider'

const signer = new Stripe('sk_test_dummy')

function signed(type: string, object: Record<string, unknown>, id = 'evt_1') {
  const payload = JSON.stringify({ id, object: 'event', type, data: { object } })
  const headers = new Headers({
    'stripe-signature': signer.webhooks.generateTestHeaderString({ payload, secret: TEST_STRIPE_WEBHOOK_SECRET }),
  })
  return [payload, headers] as const
}

describe('stripeBillingProvider.parseWebhook → internal events', () => {
  it('checkout.session.completed → subscription.activated (new subscription), user from metadata', async () => {
    const [body, headers] = signed('checkout.session.completed', {
      object: 'checkout.session',
      customer: 'cus_1',
      metadata: { clerkUserId: 'user_1' },
    })
    await expect(provider.parseWebhook(body, headers)).resolves.toEqual({
      id: 'evt_1',
      type: 'subscription.activated',
      isNewSubscription: true,
      userId: 'user_1',
      customerId: 'cus_1',
    })
  })

  it('customer.subscription.deleted → subscription.canceled', async () => {
    const [body, headers] = signed('customer.subscription.deleted', { object: 'subscription', customer: 'cus_1' })
    await expect(provider.parseWebhook(body, headers)).resolves.toEqual({
      id: 'evt_1',
      type: 'subscription.canceled',
      customerId: 'cus_1',
    })
  })

  it.each([
    ['active', 'subscription.activated'],
    ['trialing', 'subscription.activated'],
    ['past_due', 'subscription.canceled'],
    ['unpaid', 'subscription.canceled'],
    ['canceled', 'subscription.canceled'],
  ])('customer.subscription.updated with status %s → %s', async (status, type) => {
    const [body, headers] = signed('customer.subscription.updated', { object: 'subscription', customer: 'cus_1', status })
    const event = await provider.parseWebhook(body, headers)
    expect(event.type).toBe(type)
    if (event.type === 'subscription.activated') expect(event.isNewSubscription).toBe(false)
  })

  it('other event types → ignored', async () => {
    const [body, headers] = signed('invoice.paid', { object: 'invoice' })
    await expect(provider.parseWebhook(body, headers)).resolves.toEqual({ id: 'evt_1', type: 'ignored', providerType: 'invoice.paid' })
  })

  it('missing or invalid signature → InvalidWebhookSignatureError', async () => {
    const [body] = signed('invoice.paid', {})
    await expect(provider.parseWebhook(body, new Headers())).rejects.toThrow(new InvalidWebhookSignatureError('Missing signature'))
    await expect(provider.parseWebhook(body, new Headers({ 'stripe-signature': 't=1,v1=bad' }))).rejects.toThrow(
      new InvalidWebhookSignatureError('Invalid signature')
    )
  })
})

describe('stripeBillingProvider.createCheckout', () => {
  const input = {
    userId: 'user_1',
    email: 'jane@example.test',
    successUrl: 'http://app.test/ok',
    cancelUrl: 'http://app.test/cancel',
  }

  it('creates the Stripe customer on first checkout, then a subscription session', async () => {
    stripe.customers.create.mockResolvedValueOnce({ id: 'cus_new' })
    stripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://checkout.stripe.test/s' })

    await expect(provider.createCheckout({ ...input, customerId: null })).resolves.toEqual({
      url: 'https://checkout.stripe.test/s',
      customerId: 'cus_new',
    })
    expect(stripe.customers.create).toHaveBeenCalledWith({ email: 'jane@example.test', metadata: { clerkUserId: 'user_1' } })
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_new',
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: 'price_test', quantity: 1 }],
      success_url: 'http://app.test/ok',
      cancel_url: 'http://app.test/cancel',
      metadata: { clerkUserId: 'user_1' },
    })
  })

  it('reuses an existing customer', async () => {
    stripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://checkout.stripe.test/s' })
    await expect(provider.createCheckout({ ...input, customerId: 'cus_old' })).resolves.toMatchObject({ customerId: 'cus_old' })
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it('throws when Stripe returns a session without a URL', async () => {
    stripe.checkout.sessions.create.mockResolvedValueOnce({ url: null })
    await expect(provider.createCheckout({ ...input, customerId: 'cus_old' })).rejects.toThrow()
  })
})

describe('stripeBillingProvider.createPortal', () => {
  it('opens a billing portal session', async () => {
    stripe.billingPortal.sessions.create.mockResolvedValueOnce({ url: 'https://billing.stripe.test/p' })
    await expect(provider.createPortal({ customerId: 'cus_1', returnUrl: 'http://app.test/dashboard' })).resolves.toEqual({
      url: 'https://billing.stripe.test/p',
    })
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({ customer: 'cus_1', return_url: 'http://app.test/dashboard' })
  })
})
