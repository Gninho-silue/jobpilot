/**
 * Payment provider boundary. The app depends only on this interface; Stripe
 * (test mode) is the current implementation. Stripe does not accept businesses
 * based in Morocco, so real payments will go through a Merchant of Record
 * (Lemon Squeezy or Paddle): adding one means writing another BillingProvider.
 */

/** Internal events every provider's webhooks are translated into. */
export type BillingEvent =
  | {
      id: string
      type: 'subscription.activated'
      /** true for a completed checkout, false for a status change of an existing subscription. */
      isNewSubscription: boolean
      userId?: string
      customerId?: string
    }
  | {
      id: string
      type: 'subscription.canceled'
      userId?: string
      customerId?: string
    }
  | {
      id: string
      type: 'ignored'
      providerType: string
    }

export interface CheckoutInput {
  userId: string
  email?: string
  /** Provider customer id saved from a previous checkout, if any. */
  customerId: string | null
  successUrl: string
  cancelUrl: string
}

export interface BillingProvider {
  /** Short stable name, used to namespace processed event ids. */
  readonly name: string
  createCheckout(input: CheckoutInput): Promise<{ url: string; customerId: string }>
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>
  /** Verifies the signature and translates the payload. Throws InvalidWebhookSignatureError. */
  parseWebhook(rawBody: string, headers: Headers): Promise<BillingEvent>
}

export class InvalidWebhookSignatureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWebhookSignatureError'
  }
}
