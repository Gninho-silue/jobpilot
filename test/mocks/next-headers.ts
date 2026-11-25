import { vi } from 'vitest'

// Fake for `next/headers`: route handlers read the request cookies through
// cookies(); tests set them with setRequestCookie().

const jar = new Map<string, string>()

export function setRequestCookie(name: string, value: string): void {
  jar.set(name, value)
}

export function resetRequestCookies(): void {
  jar.clear()
}

export const cookies = vi.fn(async () => ({
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  has: (name: string) => jar.has(name),
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
}))

export const headers = vi.fn(async () => new Headers())
