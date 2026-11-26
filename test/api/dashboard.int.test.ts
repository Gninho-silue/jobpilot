import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { setRequestCookie } from '@test/mocks/next-headers'
import { createApplication, createUser } from '@test/helpers/db'
import { readJson } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'
import { createDemoWorkspace } from '@/lib/demo/seed'
import { loadDashboard } from '@/lib/dashboard'
import * as dashboardApi from '@/app/api/dashboard/route'
import * as applications from '@/app/api/applications/route'
import { jsonRequest } from '@test/helpers/http'

// 26 November 2026: the seeded applications are 1, 6, 12, 20 and 30 days old,
// so four are from November and one (Litware, rejected) from October.
const NOW = new Date('2026-11-26T12:00:00Z')

describe('dashboard figures against the database: demo workspace', () => {
  it('every figure matches the rows of the workspace', async () => {
    const id = await createDemoWorkspace(NOW)
    const dashboard = await loadDashboard({ kind: 'demo', id }, NOW)
    const rows = await prisma.application.findMany({ where: { userId: id } })

    expect(dashboard.stats.totalApplications).toBe(rows.length)
    expect(dashboard.stats.byStatus).toEqual({ APPLIED: 1, PHONE: 1, TECHNICAL: 1, OFFER: 1, REJECTED: 1 })
    expect(dashboard.cards.map(c => [c.label, c.value, c.subtext, c.trend])).toEqual([
      ['TOTAL APPLICATIONS', '5', '+2 in the last 7 days', 'up'],
      ['RESPONSE RATE', '80%', '−20 pts vs last month', 'down'],
      ['INTERVIEWS', '1', 'at the technical stage', 'none'],
      ['OFFERS', '1', 'out of 5 applications', 'none'],
    ])
    expect(dashboard.greeting).toBe('Welcome back, Sam.')
    expect(dashboard.recent.map(a => a.company)).toEqual(['Northwind Traders', 'Tailspin Toys', 'Woodgrove Bank', 'Adventure Works', 'Litware'])
  })

  it('the free plan counter shows the seeded applications of this month, and enforces the same number', async () => {
    const id = await createDemoWorkspace(NOW)
    const dashboard = await loadDashboard({ kind: 'demo', id }, NOW)
    const thisMonth = await prisma.application.count({ where: { userId: id, createdAt: { gte: new Date('2026-11-01T00:00:00Z') } } })
    expect(thisMonth).toBe(4)
    expect(dashboard.usage).toEqual({ used: 4, limit: 5 })
  })
})

describe('dashboard figures against the database: real user', () => {
  it('no first name → "Welcome back."; a usage counter of an earlier month counts as 0', async () => {
    await createUser('user_dash01')
    await createApplication('user_dash01')
    await prisma.usageCounter.create({ data: { userId: 'user_dash01', month: '2026-10', applications: 5 } })
    const dashboard = await loadDashboard({ kind: 'user', id: 'user_dash01' }, NOW, null)
    expect(dashboard.greeting).toBe('Welcome back.')
    expect(dashboard.usage).toEqual({ used: 0, limit: 5 })
    expect(dashboard.cards[1]).toEqual(expect.objectContaining({ subtext: '— vs last month', trend: 'none' }))
  })

  it('the counter follows the applications created this month', async () => {
    await createUser('user_dash02')
    signInAs('user_dash02')
    for (const company of ['A', 'B']) {
      await applications.POST(jsonRequest('/api/applications', { company, role: 'Engineer', offerText: 'Offer', language: 'EN' }))
    }
    const dashboard = await loadDashboard({ kind: 'user', id: 'user_dash02' }, new Date())
    expect(dashboard.usage.used).toBe(2)
    expect(dashboard.stats.totalApplications).toBe(2)
  })
})

describe('GET /api/dashboard uses the same figures', () => {
  it('demo: used this month and the totals', async () => {
    const id = await createDemoWorkspace()
    setRequestCookie(DEMO_COOKIE, signDemoCookie(id))
    const json = await readJson<{ data: { totalApplications: number; usageThisMonth: { applications: number } } }>(await dashboardApi.GET())
    expect(json.data.totalApplications).toBe(5)
    const counter = await prisma.usageCounter.findUnique({ where: { userId: id } })
    expect(json.data.usageThisMonth.applications).toBe(counter?.applications ?? 0)
  })
})
