import { beforeEach, vi } from 'vitest'
import { resetClerk } from '@test/mocks/clerk'
import { resetRequestCookies } from '@test/mocks/next-headers'
import { resetGroq } from '@test/mocks/groq'
import { resetStripe } from '@test/mocks/stripe'
import { resetSupabase } from '@test/mocks/supabase'

vi.mock('@clerk/nextjs/server', () => import('@test/mocks/clerk'))
vi.mock('@/lib/groq', () => import('@test/mocks/groq'))
vi.mock('@/lib/supabase', () => import('@test/mocks/supabase'))
vi.mock('@/lib/stripe', () => import('@test/mocks/stripe'))
vi.mock('next/headers', () => import('@test/mocks/next-headers'))
vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

beforeEach(() => {
  resetClerk()
  resetRequestCookies()
  resetGroq()
  resetStripe()
  resetSupabase()
})
