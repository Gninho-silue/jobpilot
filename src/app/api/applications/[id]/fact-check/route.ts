import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { factCheckActionSchema } from '@/lib/validation'
import { applyIssueFix, reviewAdaptedCv } from '@/lib/fact-check/fix-issue'

type Params = { params: Promise<{ id: string }> }

/** The signed-in user's application with what the fact-check needs, or null (→ 404). */
async function loadOwned(userId: string, id: string) {
  const [application, user] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      select: { userId: true, adaptedCvText: true, approvedCvTitle: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { cvText: true } }),
  ])
  if (!application || application.userId !== userId) return null
  return { ...application, cvText: user?.cvText ?? null }
}

/** Unsupported claims of the adapted CV (shown before export). */
export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const app = await loadOwned(userId, id)
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: { issues: reviewAdaptedCv(app.cvText, app.adaptedCvText, app.approvedCvTitle) } })
}

/** Fix one issue in one click, or approve a title variant. */
export async function POST(request: Request, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const app = await loadOwned(userId, id)
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = factCheckActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  let { adaptedCvText, approvedCvTitle } = app
  if (parsed.data.action === 'approve-title') {
    approvedCvTitle = parsed.data.title
  } else {
    const issueId = parsed.data.issueId
    const issue = reviewAdaptedCv(app.cvText, adaptedCvText, approvedCvTitle).find(i => i.id === issueId)
    if (!issue || !issue.fixable) {
      return NextResponse.json({ error: 'This issue no longer exists or cannot be fixed automatically.' }, { status: 409 })
    }
    try {
      adaptedCvText = applyIssueFix(adaptedCvText!, issue)
    } catch {
      return NextResponse.json({ error: 'This issue no longer exists or cannot be fixed automatically.' }, { status: 409 })
    }
  }

  await prisma.application.update({ where: { id }, data: { adaptedCvText, approvedCvTitle } })

  return NextResponse.json({
    data: { adaptedCvText, issues: reviewAdaptedCv(app.cvText, adaptedCvText, approvedCvTitle) },
  })
}
