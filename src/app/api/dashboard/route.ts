import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [user, applications, usageCounter] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, company: true, role: true, status: true, language: true, createdAt: true },
    }),
    prisma.usageCounter.findUnique({ where: { userId } }),
  ])

  const totalApplications = applications.length
  const byStatus = { APPLIED: 0, PHONE: 0, TECHNICAL: 0, OFFER: 0, REJECTED: 0 }
  for (const app of applications) {
    byStatus[app.status]++
  }

  const recentApplications = applications.slice(0, 5)
  const thisWeekCount = applications.filter(a => a.createdAt >= sevenDaysAgo).length

  const movedPast = byStatus.PHONE + byStatus.TECHNICAL + byStatus.OFFER + byStatus.REJECTED
  const responseRate = totalApplications > 0 ? Math.round((movedPast / totalApplications) * 100) : 0

  return NextResponse.json({
    data: {
      totalApplications,
      byStatus,
      recentApplications,
      usageThisMonth: {
        applications: usageCounter?.applications ?? 0,
        cvAdaptations: usageCounter?.cvAdaptations ?? 0,
        coverLetters: usageCounter?.coverLetters ?? 0,
      },
      plan: user?.plan ?? 'FREE',
      thisWeekCount,
      responseRate,
    },
  })
}
