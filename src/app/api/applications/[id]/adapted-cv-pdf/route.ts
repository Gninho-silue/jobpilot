import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCvPdf } from '@/lib/pdf/generate-cv-pdf'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const application = await prisma.application.findUnique({
    where: { id },
    select: { userId: true, adaptedCvText: true, company: true, role: true },
  })

  if (!application) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (application.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!application.adaptedCvText) {
    return NextResponse.json({ error: 'No adapted CV yet. Generate it first.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
