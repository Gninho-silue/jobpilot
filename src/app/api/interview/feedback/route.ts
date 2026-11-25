import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { interviewFeedbackSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { generateInterviewFeedback } from '@/lib/ai/interview-feedback'
import { checkLlmRateLimit, tooManyRequests } from '@/lib/rate-limit'
import { checkDemoQuota } from '@/lib/demo/quota'
import { TRUNCATED_MESSAGE, TruncatedAnswerError } from '@/lib/ai/call'

export async function POST(request: Request) {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = await checkLlmRateLimit(userId)
  if (!rateLimit.allowed) {
    return tooManyRequests(rateLimit)
  }
  // Demo visitors: a strict daily AI budget (lib/demo/quota.ts), whatever the plan.
  const demoLimit = await checkDemoQuota(actor!, request, 'feedback')
  if (demoLimit) return demoLimit

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  // A demo visitor may practise the interview (its feedback quota caps the cost).
  if (user?.plan !== 'PRO' && actor?.kind !== 'demo') {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = interviewFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { question, answer, type, language } = parsed.data

  try {
    const feedback = await generateInterviewFeedback(question, answer, type, language)
    return NextResponse.json({ data: feedback })
  } catch (err) {
    if (err instanceof TruncatedAnswerError) {
      // Cut off twice by the token budget: never return a half-written review.
      return NextResponse.json({ error: TRUNCATED_MESSAGE }, { status: 502 })
    }
    console.error('[interview/feedback] AI generation failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
