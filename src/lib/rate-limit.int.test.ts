import { describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from './rate-limit'

const T0 = new Date('2026-11-24T10:00:00.000Z')
const at = (ms: number) => new Date(T0.getTime() + ms)
const opts = (now: Date) => ({ limit: 10, windowMs: 60_000, now })

describe('checkRateLimit (Postgres sliding window)', () => {
  it('allows 10 requests per window per key, then blocks with a Retry-After', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await checkRateLimit('k:a', opts(at(i * 1000)))).toEqual({ allowed: true, remaining: 9 - i, retryAfterSeconds: 0 })
    }
    // The oldest hit (t0) leaves the window at t0 + 60 s; now is t0 + 15 s.
    expect(await checkRateLimit('k:a', opts(at(15_000)))).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 45 })
  })

  it('counts each key separately', async () => {
    for (let i = 0; i < 10; i++) await checkRateLimit('k:b', opts(T0))
    expect((await checkRateLimit('k:b', opts(T0))).allowed).toBe(false)
    expect((await checkRateLimit('k:c', opts(T0))).allowed).toBe(true)
  })

  it('slides: a slot frees up exactly when the oldest hit leaves the window', async () => {
    await checkRateLimit('k:d', opts(at(0)))
    for (let i = 0; i < 9; i++) await checkRateLimit('k:d', opts(at(30_000)))
    expect((await checkRateLimit('k:d', opts(at(59_999)))).allowed).toBe(false)
    expect((await checkRateLimit('k:d', opts(at(60_000)))).allowed).toBe(true)
    // The 9 hits from t0 + 30 s are still in the window.
    expect((await checkRateLimit('k:d', opts(at(60_001)))).allowed).toBe(false)
  })

  it('a blocked request is not recorded (it does not extend the wait)', async () => {
    for (let i = 0; i < 10; i++) await checkRateLimit('k:e', opts(T0))
    for (let i = 0; i < 5; i++) await checkRateLimit('k:e', opts(at(10_000)))
    expect(await prisma.rateLimitHit.count({ where: { key: 'k:e' } })).toBe(10)
    expect((await checkRateLimit('k:e', opts(at(60_000)))).allowed).toBe(true)
  })

  it('state lives in the database: a fresh module instance (new serverless lambda) still blocks', async () => {
    for (let i = 0; i < 10; i++) await checkRateLimit('k:f', opts(T0))
    vi.resetModules()
    const fresh = await import('./rate-limit')
    expect((await fresh.checkRateLimit('k:f', opts(T0))).allowed).toBe(false)
  })

  it('is atomic: 25 concurrent requests on an empty window → exactly 10 allowed', async () => {
    const results = await Promise.all(Array.from({ length: 25 }, () => checkRateLimit('k:g', opts(T0))))
    expect(results.filter(r => r.allowed)).toHaveLength(10)
    expect(await prisma.rateLimitHit.count({ where: { key: 'k:g' } })).toBe(10)
  })

  it('prunes expired hits, so a key never stores more than `limit` rows', async () => {
    for (let minute = 0; minute < 5; minute++) {
      for (let i = 0; i < 10; i++) await checkRateLimit('k:h', opts(at(minute * 60_000)))
    }
    expect(await prisma.rateLimitHit.count({ where: { key: 'k:h' } })).toBe(10)
  })

  it('defaults to 10 requests per minute at the current time', async () => {
    for (let i = 0; i < 10; i++) expect((await checkRateLimit('k:i')).allowed).toBe(true)
    const blocked = await checkRateLimit('k:i')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60)
  })
})
