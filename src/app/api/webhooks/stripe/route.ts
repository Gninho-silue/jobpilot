import { NextRequest, NextResponse } from 'next/server'
import { billing } from '@/lib/billing'
import { applyBillingEvent } from '@/lib/billing/apply-event'
import { type BillingEvent, InvalidWebhookSignatureError } from '@/lib/billing/types'
import { trackEvent } from '@/lib/analytics'

// Billing webhooks are the only source of truth for plan status.
export async function POST(req: NextRequest) {
  const body = await req.text()

  let event: BillingEvent
  try {
    event = await billing.parseWebhook(body, req.headers)
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  let result
  try {
    result = await applyBillingEvent(billing.name, event)
  } catch (err) {
    // Nothing was recorded (the transaction rolled back): a 500 makes the provider retry.
    console.error('[webhooks/billing] failed to apply event', event.id, err)
    return NextResponse.json({ error: 'Failed to process event' }, { status: 500 })
  }

  if (result === 'duplicate') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (result === 'applied' && event.type === 'subscription.activated' && event.isNewSubscription) {
    trackEvent.upgraded()
  }
  return NextResponse.json({ received: true })
}
