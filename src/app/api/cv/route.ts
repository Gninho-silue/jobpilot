import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvUrl: true, cvText: true, updatedAt: true },
  })

  return NextResponse.json({
    data: {
      hasCv: !!user?.cvUrl,
      cvUrl: user?.cvUrl ?? null,
      cvTextPreview: user?.cvText ? user.cvText.slice(0, 500) : null,
      updatedAt: user?.updatedAt ?? null,
    },
  })
}
