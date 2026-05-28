import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateInterviewFeedback } from '@/lib/ai/interview-feedback'
import { checkRateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(10, 'Answer is too short'),
  type: z.enum(['technical', 'behavioral']),
  language: z.enum(['FR', 'EN']),
})

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (user?.plan !== 'PRO') {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
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
  } catch {
    console.error('[interview/feedback] AI generation failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
