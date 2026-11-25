import { currentUser } from '@clerk/nextjs/server'
import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { billing } from '@/lib/billing'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Demo visitors pay only in Stripe test mode (card 4242 4242 4242 4242).
  if (actor?.kind === 'demo' && !billing.isTestMode()) {
    return NextResponse.json({ error: 'Payments are not available in the demo workspace.' }, { status: 403 })
  }

  const user = actor?.kind === 'user' ? await currentUser() : null
  const email = user?.emailAddresses[0]?.emailAddress

  const dbUser = await prisma.user.findUnique({ where: { id: userId } })
  const savedCustomerId = dbUser?.stripeCustomerId ?? null

  let checkout
  try {
    checkout = await billing.createCheckout({
      userId,
      ...(actor?.kind === 'demo' ? { demoId: userId } : {}),
      email,
      customerId: savedCustomerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
  } catch (err) {
    console.error('[billing/checkout] provider error:', err)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }

  if (checkout.customerId !== savedCustomerId) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: checkout.customerId },
    })
  }

  return NextResponse.json({ url: checkout.url })
}
