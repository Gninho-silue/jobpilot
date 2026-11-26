import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadDashboard } from '@/lib/dashboard'

export async function GET() {
  const actor = await getActor()
  const userId = actor?.id
  if (!actor || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const [dashboard, usageCounter] = await Promise.all([
    loadDashboard(actor, now),
    prisma.usageCounter.findUnique({ where: { userId } }),
  ])
  // A counter left from an earlier month counts as 0, like on the dashboard page.
  const current = usageCounter?.month === now.toISOString().slice(0, 7) ? usageCounter : null

  return NextResponse.json({
    data: {
      totalApplications: dashboard.stats.totalApplications,
      byStatus: dashboard.stats.byStatus,
      recentApplications: dashboard.recent,
      usageThisMonth: {
        applications: dashboard.usage.used,
        cvAdaptations: current?.cvAdaptations ?? 0,
        coverLetters: current?.coverLetters ?? 0,
      },
      plan: dashboard.plan,
      thisWeekCount: dashboard.stats.thisWeekCount,
      responseRate: dashboard.stats.responseRate,
    },
  })
}
