const required = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GROQ_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export function validateEnv(): void {
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`[env] Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * A production build must know its public https address: Stripe redirects,
 * metadataBase, the sitemap and robots.txt are built from it (it once was
 * http://localhost:3000 in production). Called by next.config.ts at build time.
 */
export function assertProductionAppUrl(env: Record<string, string | undefined> = process.env): void {
  if (env.VERCEL_ENV !== 'production') return
  const value = env.NEXT_PUBLIC_APP_URL
  let url: URL | undefined
  try {
    url = value ? new URL(value) : undefined
  } catch {
    url = undefined
  }
  const local = url && /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(url.hostname)
  if (!url || url.protocol !== 'https:' || local) {
    throw new Error(
      `[env] NEXT_PUBLIC_APP_URL must be the public https address in production (got ${value ? `"${value}"` : 'nothing'}).`
    )
  }
}
