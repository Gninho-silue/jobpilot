import { clerkSetup } from '@clerk/testing/playwright'

// Fetches a Clerk testing token (development instance only) so the tests can
// sign in without bot protection getting in the way.
export default async function globalSetup() {
  await clerkSetup()
}
