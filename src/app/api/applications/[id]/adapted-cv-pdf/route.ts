import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCvPdf } from '@/lib/pdf/generate-cv-pdf'
import { reviewAdaptedCv } from '@/lib/fact-check/fix-issue'

export async function GET(
  request: Request,
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

  const application = await prisma.application.findUnique({
    where: { id },
    select: { userId: true, adaptedCvText: true, approvedCvTitle: true, company: true, role: true },
  })

  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!application.adaptedCvText) {
    return NextResponse.json({ error: 'No adapted CV yet. Generate it first.' }, { status: 400 })
  }

  // Unverified claims are shown to the user before export; ?confirm=1 means they
  // saw the list and export anyway.
  const confirmed = new URL(request.url).searchParams.get('confirm') === '1'
  if (!confirmed) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { cvText: true } })
    const issues = reviewAdaptedCv(user?.cvText ?? null, application.adaptedCvText, application.approvedCvTitle)
    if (issues.length) {
      return NextResponse.json({ error: 'The adapted CV contains claims not found in your CV.', issues }, { status: 409 })
    }
  }

  try {
    const pdfBuffer = await generateCvPdf(application.adaptedCvText)

    const slug = `${application.company}-${application.role}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filename = `${slug}-adapted-cv.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[adapted-cv-pdf] generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
