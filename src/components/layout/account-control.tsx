'use client'

import { UserButton } from '@clerk/nextjs'
import { ExitDemoButton } from '@/components/demo/exit-demo-button'

/** The Clerk account menu, or "Exit demo" in the demo workspace. */
export function AccountControl({ isDemo }: { isDemo: boolean }) {
  return isDemo ? <ExitDemoButton /> : <UserButton />
}
