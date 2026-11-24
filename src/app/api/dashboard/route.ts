import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeDashboardStats } from '@/lib/dashboard-stats'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const [user, applications, usageCounter] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, company: true, role: true, status: true, language: true, createdAt: true },
    }),
    prisma.usageCounter.findUnique({ where: { userId } }),
  ])

  const { totalApplications, byStatus, thisWeekCount, responseRate } =
    computeDashboardStats(applications, now)
  const recentApplications = applications.slice(0, 5)

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
