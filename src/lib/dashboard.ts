import type { Language } from '@prisma/client'
import type { Actor } from '@/lib/actor'
import { FREE_TIER_LIMITS } from '@/lib/config'
import {
  applicationsUsedThisMonth,
  computeDashboardStats,
  greeting,
  presentStatCards,
  type AppStatus,
  type DashboardStats,
  type StatCard,
} from '@/lib/dashboard-stats'
import { DEMO_FIRST_NAME } from '@/lib/demo/seed-data'
import { prisma } from '@/lib/prisma'
import { toCheckItems, type ToCheckItem } from '@/lib/fact-check/summary'

export interface Dashboard {
  plan: 'FREE' | 'PRO'
  stats: DashboardStats
  cards: StatCard[]
  greeting: string
  /** Free plan: applications counted this month, against the limit. */
  usage: { used: number; limit: number }
  /** What to check, from the stored fact-check results (never computed here). */
  toCheck: ToCheckItem[]
  recent: Array<{ id: string; company: string; role: string; status: AppStatus; language: Language; createdAt: Date }>
}

/**
 * Every figure of the dashboard, from the database, for the page and for
 * GET /api/dashboard. `firstName`: the Clerk first name of a signed-in user.
 */
export async function loadDashboard(actor: Actor, now = new Date(), firstName?: string | null): Promise<Dashboard> {
  const [user, apps, counter] = await Promise.all([
    prisma.user.findUnique({ where: { id: actor.id }, select: { plan: true } }),
    prisma.application.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, company: true, role: true, status: true, language: true, createdAt: true, adaptedCvCheck: true, coverLetterCheck: true },
    }),
    prisma.usageCounter.findUnique({ where: { userId: actor.id } }),
  ])

  const stats = computeDashboardStats(apps, now)
  return {
    plan: user?.plan ?? 'FREE',
    stats,
    cards: presentStatCards(stats),
    greeting: greeting(actor.kind === 'demo' ? DEMO_FIRST_NAME : firstName),
    usage: { used: applicationsUsedThisMonth(counter, now), limit: FREE_TIER_LIMITS.applications },
    toCheck: toCheckItems(apps),
    recent: apps.slice(0, 5).map(({ adaptedCvCheck: _cv, coverLetterCheck: _letter, ...app }) => app),
  }
}
