import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'

// The no-signup demo: from the landing page to the fact-check panel, without an
// AI call (the seeded adapted CV already holds an invented technology).
const EMAIL = 'e2e+clerk_test@example.com'

test('"Try the demo" opens a seeded workspace with the banner and the fact-check panel', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/dashboard')

  await expect(page.getByRole('status').filter({ hasText: 'Demo workspace — data resets daily.' })).toBeVisible()
  const cookie = (await context.cookies()).find(c => c.name === 'jp_demo')
  expect(cookie).toEqual(expect.objectContaining({ httpOnly: true, sameSite: 'Lax' }))

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
  await expect(page.getByRole('status').filter({ hasText: 'Demo workspace' })).toHaveCount(0)
  expect((await context.cookies()).find(c => c.name === 'jp_demo')).toBeUndefined()
})
