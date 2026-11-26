import { config as loadEnv } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// Clerk development keys (pk_test / sk_test) for @clerk/testing. Run through
// `npm run test:e2e` (e2e/run.mjs), which starts a throwaway Postgres and sets
// E2E_DATABASE_URL: the app under test never touches the real database.
loadEnv({ path: '.env.local' })

const databaseUrl = process.env.E2E_DATABASE_URL
if (!databaseUrl || !/@(localhost|127\.0\.0\.1):/.test(databaseUrl)) {
  throw new Error('E2E_DATABASE_URL must point to a local throwaway database (run `npm run test:e2e`).')
}

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    // No trace: it records action arguments, and the sign-in may carry the test
    // account's password (E2E_CLERK_PASSWORD). Screenshots only.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // CI fails fast (no retries: an unstable test gets fixed, not retried) and keeps
  // screenshots of failures; locally the same settings apply.
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  webServer: {
    // CI tests the production build (`npm run build` runs before); locally the dev server.
    command: process.env.CI ? 'npx next start --port 3100' : 'npx next dev --port 3100',
    url: 'http://localhost:3100',
    // Never reuse a running dev server: it would use the real DATABASE_URL.
    reuseExistingServer: false,
    timeout: 180_000,
    // A throwaway demo signing secret: the demo workspace is enabled in E2E.
    env: {
      DATABASE_URL: databaseUrl, NEXT_PUBLIC_APP_URL: 'http://localhost:3100', DEMO_COOKIE_SECRET: 'e2e-demo-cookie-secret-0123456789abcdef',
      // Fixed AI answers (src/lib/ai/fake-llm.ts): the E2E tests never call Groq.
      E2E_FAKE_LLM: '1',
    },
  },
})
