import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { billing } from '@/lib/billing'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (actor?.kind === 'demo') return NextResponse.json({ error: 'Not available in the demo workspace' }, { status: 403 })

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
