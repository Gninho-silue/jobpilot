import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCoverLetterPdf } from '@/lib/pdf/generate-cover-letter-pdf'

export async function GET(
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

  const application = await prisma.application.findUnique({
    where: { id },
    select: { userId: true, coverLetter: true, company: true, role: true },
  })

  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!application.coverLetter) {
    return NextResponse.json({ error: 'No cover letter yet. Generate it first.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvText: true },
  })

  try {
    const pdfBuffer = await generateCoverLetterPdf(
      application.coverLetter,
      user?.cvText ?? '',
      application.company,
      application.role
    )

    const slug = `${application.company}-${application.role}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filename = `${slug}-cover-letter.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[cover-letter-pdf] generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
