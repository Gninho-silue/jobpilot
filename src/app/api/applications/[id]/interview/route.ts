import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateInterviewQuestions } from '@/lib/ai/generate-interview-questions'
import { checkLlmRateLimit, tooManyRequests } from '@/lib/rate-limit'
import { checkDemoQuota } from '@/lib/demo/quota'
import { TRUNCATED_MESSAGE, TruncatedAnswerError } from '@/lib/ai/call'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rateLimit = await checkLlmRateLimit(userId)
  if (!rateLimit.allowed) {
    return tooManyRequests(rateLimit)
  }
  // Demo visitors: a strict daily AI budget (lib/demo/quota.ts), whatever the plan.
  const demoLimit = await checkDemoQuota(actor!, request, 'heavy')
  if (demoLimit) return demoLimit

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvText: true },
  })

  if (!user?.cvText) {
    return NextResponse.json({ error: 'No CV uploaded' }, { status: 400 })
  }

  let questions
  try {
    questions = await generateInterviewQuestions(
      user.cvText,
      application.offerText,
      application.company,
      application.role,
      application.language
    )
  } catch (err) {
    if (err instanceof TruncatedAnswerError) {
      // Cut off twice by the token budget: nothing is saved.
      return NextResponse.json({ error: TRUNCATED_MESSAGE }, { status: 502 })
    }
    console.error('[interview] AI generation failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  await prisma.application.update({
    where: { id },
    data: { interviewQs: questions as unknown as Prisma.InputJsonValue },
  })

  return NextResponse.json({ data: { questions } })
}
