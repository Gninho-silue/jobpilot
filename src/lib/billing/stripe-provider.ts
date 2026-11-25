import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { type BillingEvent, type BillingProvider, InvalidWebhookSignatureError } from './types'

function customerIdOf(customer: string | { id: string } | null | undefined): string | undefined {
  if (!customer) return undefined
  return typeof customer === 'string' ? customer : customer.id
}

function toBillingEvent(event: Stripe.Event): BillingEvent {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      return {
        id: event.id,
        type: 'subscription.activated',
        isNewSubscription: true,
        userId: session.metadata?.clerkUserId ?? undefined,
        customerId: customerIdOf(session.customer),
        ...(session.metadata?.demo === 'true' && session.metadata.demoId ? { demoId: session.metadata.demoId } : {}),
      }
    }
    case 'customer.subscription.deleted':
      return { id: event.id, type: 'subscription.canceled', customerId: customerIdOf(event.data.object.customer) }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const customerId = customerIdOf(sub.customer)
      return sub.status === 'active' || sub.status === 'trialing'
        ? { id: event.id, type: 'subscription.activated', isNewSubscription: false, customerId }
        : { id: event.id, type: 'subscription.canceled', customerId }
    }
    default:
      return { id: event.id, type: 'ignored', providerType: event.type }
  }
}

export const stripeBillingProvider: BillingProvider = {
  name: 'stripe',

  isTestMode() {
    return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_')
  },

  async createCheckout({ userId, demoId, email, customerId, successUrl, cancelUrl }) {
    const metadata = { clerkUserId: userId, ...(demoId ? { demo: 'true', demoId } : {}) }
    let customer = customerId
    if (!customer) {
      const created = await stripe.customers.create({ email, metadata })
      customer = created.id
    }

    const session = await stripe.checkout.sessions.create({
      customer,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    })
    if (!session.url) throw new Error('Stripe returned a checkout session without a URL')

    return { url: session.url, customerId: customer }
  },

  async createPortal({ customerId, returnUrl }) {
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
    return { url: session.url }
  },

  async deleteCustomer(customerId) {
    await stripe.customers.del(customerId)
  },

  async parseWebhook(rawBody, headers) {
    const signature = headers.get('stripe-signature')
    if (!signature) throw new InvalidWebhookSignatureError('Missing signature')

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      throw new InvalidWebhookSignatureError('Invalid signature')
    }
    return toBillingEvent(event)
  },
}
