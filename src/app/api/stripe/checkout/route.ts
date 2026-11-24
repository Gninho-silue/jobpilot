import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { billing } from '@/lib/billing'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  const dbUser = await prisma.user.findUnique({ where: { id: userId } })
  const savedCustomerId = dbUser?.stripeCustomerId ?? null

  let checkout
  try {
    checkout = await billing.createCheckout({
      userId,
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
