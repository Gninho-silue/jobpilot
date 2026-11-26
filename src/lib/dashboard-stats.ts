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
  /** Applications created last calendar month. */
  lastMonthCount: number
  /** Same rate, restricted to applications created last calendar month. */
  lastMonthRate: number
  /** responseRate − lastMonthRate, in percentage points; null without applications last month. */
  responseRateDelta: number | null
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
    lastMonthCount: lastMonth.length,
    lastMonthRate,
    responseRateDelta: lastMonth.length ? responseRate - lastMonthRate : null,
  }
}

export type Trend = 'up' | 'down' | 'none'

export interface StatCard {
  label: 'TOTAL APPLICATIONS' | 'RESPONSE RATE' | 'INTERVIEWS' | 'OFFERS'
  value: string
  subtext: string
  /** The arrow shown next to the subtext: it follows the sign of the change. */
  trend: Trend
}

const MINUS = '−'

function pointsDelta(delta: number | null): { text: string; trend: Trend } {
  if (delta === null) return { text: '— vs last month', trend: 'none' }
  if (delta > 0) return { text: `+${delta} pts vs last month`, trend: 'up' }
  if (delta < 0) return { text: `${MINUS}${-delta} pts vs last month`, trend: 'down' }
  return { text: '0 pts vs last month', trend: 'none' }
}

/** The four dashboard cards. Each subtext says exactly what is counted. */
export function presentStatCards(stats: DashboardStats): StatCard[] {
  const response = pointsDelta(stats.responseRateDelta)
  return [
    {
      label: 'TOTAL APPLICATIONS',
      value: String(stats.totalApplications),
      subtext: stats.thisWeekCount ? `+${stats.thisWeekCount} in the last 7 days` : 'none in the last 7 days',
      trend: stats.thisWeekCount ? 'up' : 'none',
    },
    { label: 'RESPONSE RATE', value: `${stats.responseRate}%`, subtext: response.text, trend: response.trend },
    { label: 'INTERVIEWS', value: String(stats.byStatus.TECHNICAL), subtext: 'at the technical stage', trend: 'none' },
    {
      label: 'OFFERS',
      value: String(stats.byStatus.OFFER),
      subtext: `out of ${stats.totalApplications} application${stats.totalApplications === 1 ? '' : 's'}`,
      trend: 'none',
    },
  ]
}

/** "Welcome back, Sam." — or just "Welcome back." without a first name. */
export function greeting(firstName: string | null | undefined): string {
  const name = firstName?.trim()
  return name ? `Welcome back, ${name}.` : 'Welcome back.'
}

/**
 * Applications counted against the free plan this month: the usage counter of
 * the current month (UTC, as lib/usage.ts keys it); a counter left from an
 * earlier month counts as 0.
 */
export function applicationsUsedThisMonth(counter: { month: string; applications: number } | null, now: Date): number {
  return counter && counter.month === now.toISOString().slice(0, 7) ? counter.applications : 0
}
