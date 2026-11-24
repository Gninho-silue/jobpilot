import { describe, expect, it } from 'vitest'
import { computeDashboardStats, type AppStatus, type StatsApplication } from './dashboard-stats'

// Fixed "now": 24 November 2026, local time.
const NOW = new Date(2026, 10, 24, 12, 0, 0)

function app(status: AppStatus, createdAt: Date): StatsApplication {
  return { status, createdAt }
}

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)
const lastMonth = (day: number) => new Date(2026, 9, day, 12) // October 2026
const twoMonthsAgo = new Date(2026, 8, 15, 12) // September 2026

describe('computeDashboardStats', () => {
  it('returns zeros for a user with no applications', () => {
    expect(computeDashboardStats([], NOW)).toEqual({
      totalApplications: 0,
      byStatus: { APPLIED: 0, PHONE: 0, TECHNICAL: 0, OFFER: 0, REJECTED: 0 },
      thisWeekCount: 0,
      thisWeekOffers: 0,
      responseRate: 0,
      lastMonthRate: 0,
      responseRateDelta: 0,
    })
  })

  it('counts applications per status', () => {
    const stats = computeDashboardStats(
      [app('APPLIED', daysAgo(1)), app('APPLIED', daysAgo(2)), app('PHONE', daysAgo(3)), app('OFFER', daysAgo(30))],
      NOW
    )
    expect(stats.totalApplications).toBe(4)
    expect(stats.byStatus).toEqual({ APPLIED: 2, PHONE: 1, TECHNICAL: 0, OFFER: 1, REJECTED: 0 })
  })

  it('counts this week as the last 7 days, offers included', () => {
    const stats = computeDashboardStats(
      [app('OFFER', daysAgo(1)), app('APPLIED', daysAgo(6)), app('OFFER', daysAgo(8)), app('APPLIED', daysAgo(20))],
      NOW
    )
    expect(stats.thisWeekCount).toBe(2)
    expect(stats.thisWeekOffers).toBe(1)
  })

  it('response rate = share of applications past APPLIED (rejections count as a response), rounded', () => {
    const stats = computeDashboardStats(
      [app('APPLIED', daysAgo(1)), app('APPLIED', daysAgo(1)), app('REJECTED', daysAgo(1))],
      NOW
    )
    expect(stats.responseRate).toBe(33)
  })

  it('last-month rate only looks at applications created in the previous calendar month', () => {
    const stats = computeDashboardStats(
      [
        app('PHONE', lastMonth(1)),
        app('APPLIED', lastMonth(31)),
        app('OFFER', twoMonthsAgo), // ignored
        app('OFFER', daysAgo(1)), // this month, ignored
      ],
      NOW
    )
    expect(stats.lastMonthRate).toBe(50)
  })

  it('delta is a difference in percentage points', () => {
    // overall: 3/4 = 75 %, last month: 1/2 = 50 % → +25 points
    const stats = computeDashboardStats(
      [app('PHONE', lastMonth(5)), app('APPLIED', lastMonth(6)), app('OFFER', daysAgo(1)), app('TECHNICAL', daysAgo(2))],
      NOW
    )
    expect(stats.responseRate).toBe(75)
    expect(stats.responseRateDelta).toBe(25)
  })

  // Characterization of a known bug (JOBPILOT_PLAN.md, audit item 4, fixed in step 5):
  // with no applications last month, lastMonthRate falls back to 0 and the whole
  // current rate is shown as a "+X% vs last month" improvement.
  it('KNOWN BUG: with no data last month, the delta equals the current rate', () => {
    const stats = computeDashboardStats([app('PHONE', daysAgo(1)), app('APPLIED', daysAgo(2))], NOW)
    expect(stats.lastMonthRate).toBe(0)
    expect(stats.responseRateDelta).toBe(50)
  })
})
