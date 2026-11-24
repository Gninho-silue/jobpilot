import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit } from './rate-limit'

afterEach(() => {
  vi.useRealTimers()
})

describe('checkRateLimit (in-memory, current behavior)', () => {
  it('allows 10 requests per minute per user, then blocks', () => {
    const user = 'rl-user-a'
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(user)).toEqual({ allowed: true, remaining: 9 - i })
    }
    expect(checkRateLimit(user)).toEqual({ allowed: false, remaining: 0 })
  })

  it('counts each user separately', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('rl-user-b')
    expect(checkRateLimit('rl-user-b').allowed).toBe(false)
    expect(checkRateLimit('rl-user-c').allowed).toBe(true)
  })

  it('resets after the 60-second window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-24T10:00:00Z'))
    for (let i = 0; i < 10; i++) checkRateLimit('rl-user-d')
    expect(checkRateLimit('rl-user-d').allowed).toBe(false)

    vi.setSystemTime(new Date('2026-11-24T10:01:00Z'))
    expect(checkRateLimit('rl-user-d').allowed).toBe(true)
  })

  // Characterization of audit item 1 (fixed in step 2): state lives in this
  // module's memory, so a fresh instance (new serverless lambda) starts at zero.
  it('KNOWN GAP: a fresh module instance forgets every counter', async () => {
    for (let i = 0; i < 10; i++) checkRateLimit('rl-user-e')
    expect(checkRateLimit('rl-user-e').allowed).toBe(false)

    vi.resetModules()
    const fresh = await import('./rate-limit')
    expect(fresh.checkRateLimit('rl-user-e').allowed).toBe(true)
  })
})
