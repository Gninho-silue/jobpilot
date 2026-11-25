import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { setRequestCookie } from '@test/mocks/next-headers'
import { readJson } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'
import { DEMO_MAX_AGE_MS } from '@/lib/demo/purge'
import * as demo from '@/app/api/demo/route'
import * as cron from '@/app/api/cron/purge-demo/route'
import * as applications from '@/app/api/applications/route'

const start = (ip = '203.0.113.7') =>
  demo.POST(new NextRequest('http://localhost:3000/api/demo', { method: 'POST', headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } }))

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

  it('at most 5 starts per IP and per hour', async () => {
    for (let i = 0; i < 5; i++) expect((await start()).status).toBe(303)
    expect((await start()).status).toBe(429)
    expect((await start('198.51.100.9')).status).toBe(303)
  })

  it('purges expired demos when a new one starts', async () => {
    await prisma.user.create({ data: { id: 'demo_expired01', email: 'demo_expired01@demo.invalid', isDemo: true, createdAt: new Date(Date.now() - DEMO_MAX_AGE_MS - 1000) } })
    await start()
    expect(await prisma.user.findUnique({ where: { id: 'demo_expired01' } })).toBeNull()
  })

  it('503 when the demo is disabled (no DEMO_COOKIE_SECRET)', async () => {
    const secret = process.env.DEMO_COOKIE_SECRET
    delete process.env.DEMO_COOKIE_SECRET
    try {
      expect((await start()).status).toBe(503)
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

  it('401 without or with a wrong CRON_SECRET', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
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
