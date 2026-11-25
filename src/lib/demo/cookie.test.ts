import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_COOKIE, DEMO_TTL_MS, demoCookieOptions, signDemoCookie, verifyDemoCookie } from './cookie'

const NOW = new Date('2026-11-25T12:00:00Z').getTime()

afterEach(() => {
  process.env.DEMO_COOKIE_SECRET = 'test-demo-cookie-secret-0123456789abcdef'
})

describe('demo cookie', () => {
  it('a signed cookie gives back its demo id', () => {
    const value = signDemoCookie('demo_abc12345', NOW)
    expect(verifyDemoCookie(value, NOW + 1000)).toBe('demo_abc12345')
  })

  it('expires after 24 h', () => {
    const value = signDemoCookie('demo_abc12345', NOW)
    expect(verifyDemoCookie(value, NOW + DEMO_TTL_MS - 1)).toBe('demo_abc12345')
    expect(verifyDemoCookie(value, NOW + DEMO_TTL_MS + 1)).toBeNull()
  })

  it.each([
    ['another id', (v: string) => v.replace('demo_abc12345', 'demo_other123')],
    ['a later expiry', (v: string) => v.replace(/\.(\d+)\./, (_m, t: string) => `.${Number(t) + 86_400_000}.`)],
    ['a changed signature', (v: string) => v.slice(0, -2) + (v.endsWith('A') ? 'BB' : 'AA')],
    ['no signature', (v: string) => v.split('.').slice(0, 2).join('.')],
    ['garbage', () => 'not-a-cookie'],
    ['a real user id', () => 'user_2abc.9999999999999.x'],
  ])('a cookie with %s is rejected', (_name, tamper) => {
    expect(verifyDemoCookie(tamper(signDemoCookie('demo_abc12345', NOW)), NOW + 1000)).toBeNull()
  })

  it('a cookie signed with another secret is rejected', () => {
    const value = signDemoCookie('demo_abc12345', NOW)
    process.env.DEMO_COOKIE_SECRET = 'another-secret-another-secret-another-secret'
    expect(verifyDemoCookie(value, NOW + 1000)).toBeNull()
  })

  it('without a secret (demo disabled) nothing is signed or accepted', () => {
    const value = signDemoCookie('demo_abc12345', NOW)
    delete process.env.DEMO_COOKIE_SECRET
    expect(verifyDemoCookie(value, NOW + 1000)).toBeNull()
    expect(() => signDemoCookie('demo_abc12345', NOW)).toThrow(/DEMO_COOKIE_SECRET/)
  })

  it('is HttpOnly, SameSite=Lax, Secure in production, 24 h', () => {
    expect(DEMO_COOKIE).toBe('jp_demo')
    expect(demoCookieOptions('production')).toEqual({ httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 86_400 })
    expect(demoCookieOptions('development').secure).toBe(false)
  })
})
