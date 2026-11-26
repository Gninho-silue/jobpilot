import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { setRequestCookie } from '@test/mocks/next-headers'
import { signInAs } from '@test/mocks/clerk'
import { readJson } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'
import { DEMO_MAX_AGE_MS } from '@/lib/demo/purge'
import * as demo from '@/app/api/demo/route'
import * as cron from '@/app/api/cron/purge-demo/route'
import * as applications from '@/app/api/applications/route'

const start = (ip = '203.0.113.7') =>
  demo.POST(new NextRequest('http://localhost:3000/api/demo', { method: 'POST', headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } }))

/** Where a 303 sends the browser (path and query). */
function where(res: Response): string {
  expect(res.status).toBe(303)
  const url = new URL(res.headers.get('location')!)
  return url.pathname + url.search
}

function cookieOf(res: Response): string {
  const header = res.headers.get('set-cookie') ?? ''
  return header.match(new RegExp(`${DEMO_COOKIE}=([^;]*)`))?.[1] ?? ''
}

describe('POST /api/demo: start a demo', () => {
  it('seeds a workspace, sets the signed cookie and redirects to the dashboard', async () => {
    const res = await start()
    expect(res.status).toBe(303)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard')
    const header = res.headers.get('set-cookie') ?? ''
    expect(header).toMatch(/HttpOnly/i)
    expect(header).toMatch(/SameSite=lax/i)
    expect(header).toMatch(/Max-Age=86400/)

    const demos = await prisma.user.findMany({ where: { isDemo: true } })
    expect(demos).toHaveLength(1)

    setRequestCookie(DEMO_COOKIE, decodeURIComponent(cookieOf(res)))
    const list = await readJson<{ data: unknown[] }>(await applications.GET())
    expect(list.data).toHaveLength(5)
  })

  it('at most 5 starts per IP and per hour; then back to the home page with a readable message, never JSON', async () => {
    for (let i = 0; i < 5; i++) expect(where(await start())).toBe('/dashboard')
    const refused = await start()
    expect(refused.status).toBe(303)
    expect(where(refused)).toBe('/?demo=limit')
    expect(refused.headers.get('content-type') ?? '').not.toMatch(/json/)
    expect(refused.headers.get('set-cookie')).toBeNull()
    expect(where(await start('198.51.100.9'))).toBe('/dashboard')
  })

  it('refused attempts do not count against the limit (a reload after a refusal changes nothing)', async () => {
    for (let i = 0; i < 5; i++) await start()
    for (let i = 0; i < 4; i++) expect(where(await start())).toBe('/?demo=limit')
    expect(await prisma.rateLimitHit.count({ where: { key: 'demo-start:203.0.113.7' } })).toBe(5)
    expect(await prisma.user.count({ where: { isDemo: true } })).toBe(5)
  })

  it('a visitor who already has a valid demo goes straight to the dashboard: no new workspace, no attempt counted', async () => {
    await prisma.user.create({ data: { id: 'demo_existing1', email: 'demo_existing1@demo.invalid', isDemo: true } })
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_existing1'))
    const res = await start()
    expect(where(res)).toBe('/dashboard')
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(await prisma.user.count({ where: { isDemo: true } })).toBe(1)
    expect(await prisma.rateLimitHit.count()).toBe(0)
  })

  it('a signed-in user goes to the dashboard, without a demo', async () => {
    signInAs('user_real01')
    expect(where(await start())).toBe('/dashboard')
    expect(await prisma.user.count({ where: { isDemo: true } })).toBe(0)
  })

  it('a demo cookie whose workspace was purged starts a new demo', async () => {
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_purged001'))
    expect(where(await start())).toBe('/dashboard')
    expect(await prisma.user.count({ where: { isDemo: true } })).toBe(1)
  })

  it('a failure while seeding → home page with a message', async () => {
    // Only the seeding transaction (an array of queries) fails.
    const original = prisma.$transaction.bind(prisma) as (arg: unknown) => Promise<unknown>
    const spy = vi.spyOn(prisma, '$transaction').mockImplementation(((arg: unknown) =>
      Array.isArray(arg) ? Promise.reject(new Error('db down')) : original(arg)) as never)
    try {
      expect(where(await start())).toBe('/?demo=error')
    } finally {
      spy.mockRestore()
    }
  })

  it('any unexpected error (database down) → home page with a message, never a 500', async () => {
    const spy = vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('db down'))
    try {
      expect(where(await start())).toBe('/?demo=error')
    } finally {
      spy.mockRestore()
    }
  })

  it('purges expired demos when a new one starts', async () => {
    await prisma.user.create({ data: { id: 'demo_expired01', email: 'demo_expired01@demo.invalid', isDemo: true, createdAt: new Date(Date.now() - DEMO_MAX_AGE_MS - 1000) } })
    await start()
    expect(await prisma.user.findUnique({ where: { id: 'demo_expired01' } })).toBeNull()
  })

  it('demo disabled (no DEMO_COOKIE_SECRET) → home page with a message', async () => {
    const secret = process.env.DEMO_COOKIE_SECRET
    delete process.env.DEMO_COOKIE_SECRET
    try {
      expect(where(await start())).toBe('/?demo=unavailable')
      expect(await prisma.user.count({ where: { isDemo: true } })).toBe(0)
    } finally {
      process.env.DEMO_COOKIE_SECRET = secret
    }
  })
})

describe('DELETE /api/demo: exit the demo', () => {
  it('clears the cookie and deletes the workspace', async () => {
    await prisma.user.create({ data: { id: 'demo_leaving01', email: 'demo_leaving01@demo.invalid', isDemo: true } })
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_leaving01'))
    const res = await demo.DELETE()
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(new RegExp(`${DEMO_COOKIE}=;.*Max-Age=0`, 'i'))
    expect(await prisma.user.findUnique({ where: { id: 'demo_leaving01' } })).toBeNull()
  })
})

describe('GET /api/cron/purge-demo', () => {
  const call = (authorization?: string) =>
    cron.GET(new NextRequest('http://localhost:3000/api/cron/purge-demo', { headers: authorization ? { authorization } : {} }))

  it('401 without or with a wrong CRON_SECRET, and nothing is recorded', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect(await prisma.cronRun.count()).toBe(0)
  })

  it('records each run: time, demos deleted, status', async () => {
    await prisma.user.create({ data: { id: 'demo_expired03', email: 'demo_expired03@demo.invalid', isDemo: true, createdAt: new Date(Date.now() - DEMO_MAX_AGE_MS - 1000) } })
    await call(`Bearer ${process.env.CRON_SECRET}`)
    await call(`Bearer ${process.env.CRON_SECRET}`)
    const runs = await prisma.cronRun.findMany({ orderBy: { startedAt: 'asc' } })
    expect(runs.map(r => [r.job, r.status, r.deleted, r.error])).toEqual([
      ['purge-demo', 'success', 1, null],
      ['purge-demo', 'success', 0, null],
    ])
    expect(runs[0]!.finishedAt!.getTime()).toBeGreaterThanOrEqual(runs[0]!.startedAt.getTime())
  })

  it('a failed run is recorded with its error, and answers 500', async () => {
    const spy = vi.spyOn(prisma.user, 'findMany').mockRejectedValueOnce(new Error('connection lost'))
    try {
      const res = await call(`Bearer ${process.env.CRON_SECRET}`)
      expect(res.status).toBe(500)
    } finally {
      spy.mockRestore()
    }
    const [run] = await prisma.cronRun.findMany()
    expect(run).toEqual(expect.objectContaining({ job: 'purge-demo', status: 'error', deleted: null, error: 'connection lost' }))
  })

  it('purges with the right secret', async () => {
    await prisma.user.create({ data: { id: 'demo_expired02', email: 'demo_expired02@demo.invalid', isDemo: true, createdAt: new Date(Date.now() - DEMO_MAX_AGE_MS - 1000) } })
    const res = await call(`Bearer ${process.env.CRON_SECRET}`)
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ deleted: 1 })
  })

  it('401 when CRON_SECRET is not set, whatever the header', async () => {
    const secret = process.env.CRON_SECRET
    delete process.env.CRON_SECRET
    try {
      expect((await call('Bearer undefined')).status).toBe(401)
      expect((await call('Bearer ')).status).toBe(401)
    } finally {
      process.env.CRON_SECRET = secret
    }
  })
})
