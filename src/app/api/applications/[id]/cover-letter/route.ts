import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAndIncrementUsage } from '@/lib/usage'
import { generateCoverLetter } from '@/lib/ai/generate-cover-letter'
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
    select: { cvText: true, plan: true },
  })

  if (!user?.cvText) {
    return NextResponse.json({ error: 'No CV uploaded yet' }, { status: 400 })
  }

  const usage = await checkAndIncrementUsage(userId, 'coverLetters')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Free tier limit reached', upgrade: true },
      { status: 403 }
    )
  }

  let coverLetter: string
  try {
    coverLetter = await generateCoverLetter(
      user.cvText,
      application.offerText,
      application.company,
      application.role,
      application.language
    )
  } catch (err) {
    console.error('[cover-letter] AI generation failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  await prisma.application.update({
    where: { id },
    data: { coverLetter },
  })

  return NextResponse.json({ data: { coverLetter } })
}
