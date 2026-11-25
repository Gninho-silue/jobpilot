import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { factCheckActionSchema } from '@/lib/validation'
import { applyIssueFix, reviewAdaptedCv, reviewCoverLetter } from '@/lib/fact-check/fix-issue'

type Params = { params: Promise<{ id: string }> }

/** The signed-in user's application with what the fact-check needs, or null (→ 404). */
async function loadOwned(userId: string, id: string) {
  const [application, user] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      select: { userId: true, adaptedCvText: true, approvedCvTitle: true, coverLetter: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { cvText: true } }),
  ])
  if (!application || application.userId !== userId) return null
  return { ...application, cvText: user?.cvText ?? null }
}

/** Unsupported claims of the adapted CV, or of the cover letter with ?document=cover-letter (shown before export). */
export async function GET(request: Request, { params }: Params) {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const app = await loadOwned(userId, id)
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const issues =
    new URL(request.url).searchParams.get('document') === 'cover-letter'
      ? reviewCoverLetter(app.cvText, app.coverLetter)
      : reviewAdaptedCv(app.cvText, app.adaptedCvText, app.approvedCvTitle)
  return NextResponse.json({ data: { issues } })
}

/** Fix one issue in one click, or approve a title variant. */
export async function POST(request: Request, { params }: Params) {
  const actor = await getActor()
  const userId = actor?.id
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
