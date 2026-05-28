import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

async function getUserIdFromCustomer(customerId: string): Promise<string | undefined> {
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
  return user?.id
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const clerkUserId = session.metadata?.clerkUserId
      if (clerkUserId) {
        await prisma.user.update({
          where: { id: clerkUserId },
          data: { plan: 'PRO' },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = await getUserIdFromCustomer(sub.customer as string)
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: 'FREE' },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = await getUserIdFromCustomer(sub.customer as string)
      if (userId) {
        const isActive = sub.status === 'active' || sub.status === 'trialing'
        await prisma.user.update({
          where: { id: userId },
          data: { plan: isActive ? 'PRO' : 'FREE' },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
