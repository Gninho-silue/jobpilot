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
