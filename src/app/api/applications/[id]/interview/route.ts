import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateInterviewQuestions } from '@/lib/ai/generate-interview-questions'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    console.error('[interview] AI generation failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  await prisma.application.update({
    where: { id },
    data: { interviewQs: questions as unknown as Prisma.InputJsonValue },
  })

  return NextResponse.json({ data: { questions } })
}
