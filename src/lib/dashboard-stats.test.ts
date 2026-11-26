import { describe, expect, it } from 'vitest'
import { applicationsUsedThisMonth, computeDashboardStats, greeting, presentStatCards, type AppStatus, type StatsApplication } from './dashboard-stats'

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
      lastMonthCount: 0,
      lastMonthRate: 0,
      responseRateDelta: null,
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

  it('no applications last month → no delta (null), never the whole current rate', () => {
    const stats = computeDashboardStats([app('PHONE', daysAgo(1)), app('APPLIED', daysAgo(2))], NOW)
    expect(stats.lastMonthCount).toBe(0)
    expect(stats.responseRateDelta).toBeNull()
  })
})

describe('presentStatCards', () => {
  const card = (stats: ReturnType<typeof computeDashboardStats>, label: string) =>
    presentStatCards(stats).find(c => c.label === label)!

  it('a fall: down arrow, in points, with a real minus sign', () => {
    // The demo of 25/11: 80 % now, 100 % in October.
    const stats = computeDashboardStats(
      [app('APPLIED', daysAgo(1)), app('PHONE', daysAgo(2)), app('TECHNICAL', daysAgo(3)), app('OFFER', daysAgo(4)), app('REJECTED', lastMonth(27))],
      NOW
    )
    expect(card(stats, 'RESPONSE RATE')).toEqual(expect.objectContaining({ value: '80%', subtext: '−20 pts vs last month', trend: 'down' }))
  })

  it('a rise: up arrow; no change: no arrow', () => {
    const up = computeDashboardStats([app('PHONE', daysAgo(1)), app('APPLIED', lastMonth(10))], NOW)
    expect(card(up, 'RESPONSE RATE')).toEqual(expect.objectContaining({ subtext: '+50 pts vs last month', trend: 'up' }))
    const flat = computeDashboardStats([app('PHONE', daysAgo(1)), app('PHONE', lastMonth(10))], NOW)
    expect(card(flat, 'RESPONSE RATE')).toEqual(expect.objectContaining({ subtext: '0 pts vs last month', trend: 'none' }))
  })

  it('no data last month: "—", no arrow', () => {
    const stats = computeDashboardStats([app('PHONE', daysAgo(1))], NOW)
    expect(card(stats, 'RESPONSE RATE')).toEqual(expect.objectContaining({ subtext: '— vs last month', trend: 'none' }))
  })

  it('every other figure says what it counts, with an arrow only for a real increase', () => {
    const stats = computeDashboardStats([app('TECHNICAL', daysAgo(1)), app('OFFER', daysAgo(10)), app('APPLIED', daysAgo(20))], NOW)
    expect(card(stats, 'TOTAL APPLICATIONS')).toEqual(expect.objectContaining({ value: '3', subtext: '+1 in the last 7 days', trend: 'up' }))
    expect(card(stats, 'INTERVIEWS')).toEqual(expect.objectContaining({ value: '1', subtext: 'at the technical stage', trend: 'none' }))
    expect(card(stats, 'OFFERS')).toEqual(expect.objectContaining({ value: '1', subtext: 'out of 3 applications', trend: 'none' }))
    const quiet = computeDashboardStats([app('APPLIED', daysAgo(20))], NOW)
    expect(card(quiet, 'TOTAL APPLICATIONS')).toEqual(expect.objectContaining({ subtext: 'none in the last 7 days', trend: 'none' }))
  })
})

describe('greeting', () => {
  it('with a first name, and without one (never "there")', () => {
    expect(greeting('Sam')).toBe('Welcome back, Sam.')
    expect(greeting(null)).toBe('Welcome back.')
    expect(greeting('  ')).toBe('Welcome back.')
  })
})

describe('applicationsUsedThisMonth', () => {
  it('the counter of the current month; a stale month counts as 0', () => {
    const now = new Date('2026-11-26T12:00:00Z')
    expect(applicationsUsedThisMonth({ month: '2026-11', applications: 4 }, now)).toBe(4)
    expect(applicationsUsedThisMonth({ month: '2026-10', applications: 5 }, now)).toBe(0)
    expect(applicationsUsedThisMonth(null, now)).toBe(0)
  })
})
