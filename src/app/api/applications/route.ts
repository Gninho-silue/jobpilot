import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkAndIncrementUsage } from '@/lib/usage'

const createSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  offerText: z.string().min(1),
  language: z.enum(['FR', 'EN']).default('EN'),
  salary: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: applications })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  // Ensure user exists in our DB
  const clerkUser = await currentUser()
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
    },
    update: {},
  })

  const usage = await checkAndIncrementUsage(userId, 'applications')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `Free tier limit reached (${usage.limit} applications). Upgrade to Pro for unlimited applications.` },
      { status: 403 }
    )
  }

  const { company, role, offerText, language, salary, link, notes } = parsed.data

  const application = await prisma.application.create({
    data: {
      userId,
      company,
      role,
      offerText,
      language,
      status: 'APPLIED',
      salary: salary || null,
      link: link || null,
      notes: notes || null,
    },
  })

  return NextResponse.json({ data: application }, { status: 201 })
}
