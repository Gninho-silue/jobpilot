import { vi } from 'vitest'

// Fake for `@clerk/nextjs/server`. Tests choose the signed-in user with
// signInAs() / signOut(); nothing talks to Clerk.

let currentUserId: string | null = null

export function signInAs(userId: string): void {
  currentUserId = userId
}

export function signOut(): void {
  currentUserId = null
}

export function testEmail(userId: string): string {
  return `${userId}@example.test`
}

export const auth = vi.fn(async () => ({ userId: currentUserId }))

export const currentUser = vi.fn(async () =>
  currentUserId
    ? {
        id: currentUserId,
        firstName: 'Test',
        emailAddresses: [{ emailAddress: testEmail(currentUserId) }],
      }
    : null
)

export function resetClerk(): void {
  currentUserId = null
  auth.mockClear()
  currentUser.mockClear()
}

// Enough of the proxy helpers to import src/proxy.ts in tests (its matcher).
export const createRouteMatcher = (patterns: string[]) => (request: { nextUrl: { pathname: string } }) =>
  patterns.some(pattern => new RegExp(`^${pattern}$`).test(request.nextUrl.pathname))

export const clerkMiddleware = <T>(handler: T) => handler
