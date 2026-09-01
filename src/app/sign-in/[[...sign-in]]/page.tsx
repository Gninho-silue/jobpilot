import type { Metadata } from 'next'
import { SignIn } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-base))]">
      <SignIn />
    </div>
  )
}
