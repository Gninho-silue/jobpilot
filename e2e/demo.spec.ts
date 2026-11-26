import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'

// The no-signup demo: from the landing page to the fact-check panel, without an
// AI call (the seeded adapted CV already holds an invented technology).
const EMAIL = 'e2e+clerk_test@example.com'

test('"Try the demo" opens a seeded workspace with the banner and the fact-check panel', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/dashboard')

  await expect(page.getByRole('status').filter({ hasText: 'Demo · resets daily' })).toBeVisible()
  const cookie = (await context.cookies()).find(c => c.name === 'jp_demo')
  expect(cookie).toEqual(expect.objectContaining({ httpOnly: true, sameSite: 'Lax' }))

  // Step 5: honest dashboard figures (the exact numbers depend on the date: see test/api/dashboard.int.test.ts).
  await expect(page.getByText('Welcome back, Sam.', { exact: false })).toBeVisible()
  await expect(page.getByText(/Welcome back, there/)).toHaveCount(0)
  await expect(page.getByText(/Free plan · \d of 5 applications created this month/)).toBeVisible()
  await expect(page.getByText(/% vs last month/)).toHaveCount(0)

  await page.goto('/applications')
  for (const company of ['Northwind Traders', 'Tailspin Toys', 'Woodgrove Bank', 'Adventure Works', 'Litware']) {
    await expect(page.getByText(company).first()).toBeVisible()
  }

  // The flagship feature: the invented technology is flagged and removable.
  await page.getByText('Northwind Traders').first().click()
  await page.getByRole('tab', { name: 'Resume' }).click()
  const panel = page.locator('section', { has: page.getByRole('heading', { name: /not found in your CV/ }) })
  const kubernetes = panel.getByRole('listitem').filter({ hasText: 'Kubernetes' })
  await expect(kubernetes).toBeVisible()
  await kubernetes.getByRole('button', { name: 'Remove' }).click()
  await expect(kubernetes).toHaveCount(0)

  // The letter: one generic phrase, a warning.
  await page.getByRole('tab', { name: /Cover letter/i }).click()
  await expect(page.getByText('Generic phrase')).toBeVisible()
})

test('"Exit demo" goes home and the demo cookie is gone', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/dashboard')
  await page.getByRole('button', { name: 'Exit demo' }).click()
  await page.waitForURL(url => url.pathname === '/')
  expect((await context.cookies()).find(c => c.name === 'jp_demo')).toBeUndefined()
  await page.goto('/dashboard')
  await expect(page).not.toHaveURL(/\/dashboard$/)
})

test('signing in with Clerk during a demo removes the demo cookie', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/dashboard')
  expect((await context.cookies()).find(c => c.name === 'jp_demo')).toBeDefined()

  await setupClerkTestingToken({ page })
  try {
    await clerk.signIn({ page, signInParams: { strategy: 'email_code', identifier: EMAIL } })
  } catch {
    const password = process.env.E2E_CLERK_PASSWORD
    if (!password) throw new Error('Email-code sign-in refused and E2E_CLERK_PASSWORD is not set in .env.local')
    await clerk.signIn({ page, signInParams: { strategy: 'password', identifier: EMAIL, password } }).catch(() => {
      throw new Error('Clerk sign-in failed for the E2E test account')
    })
  }
  await page.goto('/dashboard')
  await expect(page.getByRole('status').filter({ hasText: 'resets daily' })).toHaveCount(0)
  expect((await context.cookies()).find(c => c.name === 'jp_demo')).toBeUndefined()
})

// Last in the file: it uses up the per-IP limit of demo starts.
// The next spec files start demos too: give the starts back once this file is done.
test.afterAll(async () => {
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL
  const { prisma } = await import('../src/lib/prisma')
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: 'demo-start:' } } })
})

test('limit reached: back home with a readable message, and a reload does not re-send the form', async ({ page, playwright }) => {
  // Use up the starts from this IP with cookie-less requests (a demo cookie would skip the limit).
  for (let i = 0; i < 6; i++) {
    const api = await playwright.request.newContext({ baseURL: 'http://localhost:3100' })
    const res = await api.post('/api/demo', { maxRedirects: 0 })
    expect(res.status()).toBe(303)
    const location = res.headers()['location'] ?? ''
    await api.dispose()
    if (location.includes('demo=limit')) break
  }

  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL(url => url.pathname === '/' && url.searchParams.get('demo') === 'limit')
  // Next.js's route announcer is an alert too: pick ours by its text.
  const notice = page.getByRole('alert').filter({ hasText: 'Too many demos were started from your network' })
  await expect(notice).toBeVisible()
  await expect(page.locator('body')).not.toContainText('{"error"')

  const posts: string[] = []
  // Only our form counts (Clerk's script posts to its own servers).
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/demo')) posts.push(request.url()) })
  await page.reload()
  await expect(notice).toBeVisible()
  expect(posts).toEqual([])
})
