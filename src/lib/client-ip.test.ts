import { describe, expect, it } from 'vitest'
import { clientIp } from './client-ip'

const req = (headers: Record<string, string>) => new Request('https://example.test/', { headers })

describe('clientIp', () => {
  it('Vercel: the first address of x-forwarded-for is the client', () => {
    expect(clientIp(req({ 'x-forwarded-for': '196.127.10.20, 76.76.21.21' }))).toBe('196.127.10.20')
    expect(clientIp(req({ 'x-forwarded-for': ' 2001:db8::1 ' }))).toBe('2001:db8::1')
  })

  it('falls back to x-real-ip, then to "unknown"', () => {
    expect(clientIp(req({ 'x-real-ip': '196.127.10.20' }))).toBe('196.127.10.20')
    expect(clientIp(req({}))).toBe('unknown')
  })
})
