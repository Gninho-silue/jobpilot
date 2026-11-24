import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { billing } from '@/lib/billing'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
  }

  let portal
  try {
    portal = await billing.createPortal({
      customerId: dbUser.stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
  } catch (err) {
    console.error('[billing/portal] provider error:', err)
    return NextResponse.json({ error: 'Could not open the billing portal. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ url: portal.url })
}
