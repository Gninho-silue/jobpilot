import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Sign Up',
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-base))]">
      <SignUp />
    </div>
  )
}
