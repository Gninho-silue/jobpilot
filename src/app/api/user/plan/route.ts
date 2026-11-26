import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  const plan = user?.plan ?? 'FREE'
  const demo = actor?.kind === 'demo'
  // Feedback on interview answers: Pro accounts, and demo visitors within their
  // daily feedback quota (lib/demo/quota.ts, checked by /api/interview/feedback).
  return NextResponse.json({ data: { plan, demo, interviewFeedback: plan === 'PRO' || demo } })
}
