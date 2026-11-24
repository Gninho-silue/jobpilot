export type AppStatus = 'APPLIED' | 'PHONE' | 'TECHNICAL' | 'OFFER' | 'REJECTED'

export interface StatsApplication {
  status: AppStatus
  createdAt: Date
}

export interface DashboardStats {
  totalApplications: number
  byStatus: Record<AppStatus, number>
  thisWeekCount: number
  thisWeekOffers: number
  /** Share of applications that moved past APPLIED, in percent (0–100). */
  responseRate: number
  /** Same rate, restricted to applications created last calendar month. */
  lastMonthRate: number
  /** responseRate − lastMonthRate, in percentage points. */
  responseRateDelta: number
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function hasMovedPastApplied(status: AppStatus): boolean {
  return status !== 'APPLIED'
}

function rate(apps: StatsApplication[]): number {
  if (apps.length === 0) return 0
  const moved = apps.filter(a => hasMovedPastApplied(a.status)).length
  return Math.round((moved / apps.length) * 100)
}

export function computeDashboardStats(apps: StatsApplication[], now: Date): DashboardStats {
  const sevenDaysAgo = new Date(now.getTime() - WEEK_MS)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const byStatus: Record<AppStatus, number> = { APPLIED: 0, PHONE: 0, TECHNICAL: 0, OFFER: 0, REJECTED: 0 }
  for (const app of apps) byStatus[app.status]++

  const thisWeek = apps.filter(a => a.createdAt >= sevenDaysAgo)
  const lastMonth = apps.filter(a => a.createdAt >= firstOfLastMonth && a.createdAt < firstOfMonth)

  const responseRate = rate(apps)
  const lastMonthRate = rate(lastMonth)

  return {
    totalApplications: apps.length,
    byStatus,
    thisWeekCount: thisWeek.length,
    thisWeekOffers: thisWeek.filter(a => a.status === 'OFFER').length,
    responseRate,
    lastMonthRate,
    responseRateDelta: responseRate - lastMonthRate,
  }
}
