import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The demo workspace cookie: "<demo id>.<expiry in ms>.<HMAC-SHA256>". Signed
 * with DEMO_COOKIE_SECRET; without that secret the demo is disabled. The id
 * always starts with "demo_", so a valid cookie can never name a Clerk user.
 */
export const DEMO_COOKIE = 'jp_demo'
export const DEMO_TTL_MS = 24 * 60 * 60 * 1000

const DEMO_ID = /^demo_[a-z0-9]{8,40}$/

function secret(): string | undefined {
  const value = process.env.DEMO_COOKIE_SECRET
  return value && value.length >= 32 ? value : undefined
}

export function isDemoEnabled(): boolean {
  return secret() !== undefined
}

function signature(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

export function signDemoCookie(demoId: string, now = Date.now()): string {
  const key = secret()
  if (!key) throw new Error('DEMO_COOKIE_SECRET is not set (32 characters or more): the demo is disabled')
  if (!DEMO_ID.test(demoId)) throw new Error('Invalid demo id')
  const payload = `${demoId}.${now + DEMO_TTL_MS}`
  return `${payload}.${signature(payload, key)}`
}

/** The demo id of a valid, unexpired cookie; null for anything else. */
export function verifyDemoCookie(value: string | undefined, now = Date.now()): string | null {
  const key = secret()
  if (!key || !value) return null
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [demoId, expiry, given] = parts as [string, string, string]
  if (!DEMO_ID.test(demoId) || !/^\d{13}$/.test(expiry)) return null

  const expected = Buffer.from(signature(`${demoId}.${expiry}`, key))
  const received = Buffer.from(given)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  if (Number(expiry) <= now) return null
  return demoId
}

export function demoCookieOptions(env = process.env.NODE_ENV) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: env === 'production', path: '/', maxAge: DEMO_TTL_MS / 1000 }
}
