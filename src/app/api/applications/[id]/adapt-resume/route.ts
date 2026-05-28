import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAndIncrementUsage } from '@/lib/usage'
import { adaptResume } from '@/lib/ai/adapt-resume'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (application.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvText: true, plan: true },
  })

  if (!user?.cvText) {
    return NextResponse.json({ error: 'No CV uploaded yet' }, { status: 400 })
  }

  const usage = await checkAndIncrementUsage(userId, 'cvAdaptations')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Free tier limit reached', upgrade: true },
      { status: 403 }
    )
  }

  let adaptedCvText: string
  try {
    adaptedCvText = await adaptResume(user.cvText, application.offerText, application.language)
  } catch {
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 })
  }

  await prisma.application.update({
    where: { id },
    data: { adaptedCvText },
  })

  return NextResponse.json({ data: { adaptedCvText } })
}
