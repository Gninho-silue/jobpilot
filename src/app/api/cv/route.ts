import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CV_FILE_ROUTE } from '@/lib/cv-storage'

export async function GET() {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvPath: true, cvText: true, updatedAt: true },
  })

  // A demo has a fictional CV text and no file: read-only, nothing to download.
  const demo = actor?.kind === 'demo'
  const hasFile = !!user?.cvPath
  return NextResponse.json({
    data: {
      hasCv: hasFile || (demo && !!user?.cvText),
      demo,
      fileUrl: hasFile ? CV_FILE_ROUTE : null,
      cvText: user?.cvText ?? null,
      cvTextPreview: user?.cvText ? user.cvText.slice(0, 500) : null,
      updatedAt: user?.updatedAt ?? null,
    },
  })
}
