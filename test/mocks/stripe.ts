import Stripe from 'stripe'
import { vi } from 'vitest'

// Fake for `@/lib/stripe`. Signature verification uses the real Stripe SDK
// (pure crypto, offline). Every method that would call the Stripe API is a
// mock that throws unless a test prepares it.

const real = new Stripe('sk_test_dummy')

function unexpected(name: string) {
  return vi.fn(async (..._args: unknown[]): Promise<unknown> => {
    throw new Error(`Unexpected Stripe API call: ${name}`)
  })
}

export const stripe = {
  webhooks: real.webhooks,
  customers: { create: unexpected('customers.create') },
  checkout: { sessions: { create: unexpected('checkout.sessions.create') } },
  billingPortal: { sessions: { create: unexpected('billingPortal.sessions.create') } },
}

export function resetStripe(): void {
  stripe.customers.create.mockReset()
  stripe.checkout.sessions.create.mockReset()
  stripe.billingPortal.sessions.create.mockReset()
}
