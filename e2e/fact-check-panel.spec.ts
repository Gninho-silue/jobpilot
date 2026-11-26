import { readFileSync } from 'node:fs'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { normalizeTypography } from '../src/lib/text/typography'

// The warnings panel of the adapted CV: every button must receive the click and
// do its job, on a wide desktop, a medium one and a phone.
// Clerk development test account: "+clerk_test" emails sign in with code 424242.
const EMAIL = 'e2e+clerk_test@example.com'
const fixture = (name: string) => readFileSync(`test/fixtures/anonymized-2026-11-25/${name}`, 'utf8')

const ORIGINAL_CV = normalizeTypography(fixture('original-cv.txt'))
// The real-case adapted CV (title changed, skills moved), plus one invented
// technology, so the panel has a "Use" / "Keep" pair and a "Remove" button.
const ADAPTED_CV = fixture('adapted-cv.llm.txt').replace(
  '- Applied CI/CD pipelines with Docker and GitHub Actions to ensure reliable deployments and rapid iteration.',
  '- Applied CI/CD pipelines with Docker and GitHub Actions to ensure reliable deployments and rapid iteration.\n- Provisioned the infrastructure with Terraform.\n' +
    // A long unbreakable token, as in production labels: must not widen the panel.
    '- Deployed with Ansible, playbooks at https://example.com/zoe-test/infrastructure-automation-playbooks-for-the-northwind-erp-deployment-pipeline-and-monitoring-stack.'
)

async function db() {
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL
  return (await import('../src/lib/prisma')).prisma
}

/**
 * Email code first (424242 for "+clerk_test" addresses); if the instance does
 * not accept it, the test account's password from .env.local (never committed,
 * never logged: the error below does not include it).
 */
async function signIn(page: Page): Promise<string> {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  try {
    await clerk.signIn({ page, signInParams: { strategy: 'email_code', identifier: EMAIL } })
  } catch {
    const password = process.env.E2E_CLERK_PASSWORD
    if (!password) throw new Error('Email-code sign-in refused and E2E_CLERK_PASSWORD is not set in .env.local')
    await clerk.signIn({ page, signInParams: { strategy: 'password', identifier: EMAIL, password } }).catch(() => {
      throw new Error('Password sign-in refused for the E2E test account')
    })
  }
  return page.evaluate(() => (window as unknown as { Clerk: { user: { id: string } } }).Clerk.user.id)
}

async function seedApplication(userId: string): Promise<string> {
  const prisma = await db()
  await prisma.application.deleteMany({ where: { userId } })
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: EMAIL, cvText: ORIGINAL_CV, cvPath: `${userId}/cv.pdf` },
    update: { cvText: ORIGINAL_CV, cvPath: `${userId}/cv.pdf` },
  })
  const application = await prisma.application.create({
    data: {
      userId,
      company: 'Contoso Consulting',
      role: 'Digital Transformation Consultant',
      offerText: 'Contoso Consulting is hiring a consultant.',
      language: 'EN',
      adaptedCvText: ADAPTED_CV,
    },
  })
  return application.id
}

async function openWarnings(page: Page, applicationId: string): Promise<Locator> {
  await page.goto(`/applications?edit=${applicationId}`)
  await page.getByRole('tab', { name: 'Resume' }).click()
  const panel = page.locator('section', { has: page.getByRole('heading', { name: /not found in your CV/ }) })
  await expect(panel).toBeVisible()
  return panel
}

/** The button is fully on screen and is the element under its own centre. */
async function expectReceivesClick(button: Locator) {
  await button.scrollIntoViewIfNeeded()
  const hit = await button.evaluate(element => {
    const box = element.getBoundingClientRect()
    const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return {
      onScreen: box.left >= 0 && box.right <= window.innerWidth && box.top >= 0 && box.bottom <= window.innerHeight,
      receives: top !== null && (top === element || element.contains(top)),
      coveredBy: top && !(top === element || element.contains(top)) ? top.outerHTML.slice(0, 160) : null,
    }
  })
  expect(hit).toEqual({ onScreen: true, receives: true, coveredBy: null })
}

async function savedApplication(applicationId: string) {
  return (await db()).application.findUniqueOrThrow({ where: { id: applicationId } })
}

// The sheet opened from ?edit=<id> must survive a reload or remount of the page
// (a Clerk dev handshake can reload it): the 1175 px "Use" test once found its
// button and then lost it for good, because the page had already dropped ?edit.
test('a reload keeps the detail panel open on the same application', async ({ page }) => {
  await page.setViewportSize({ width: 1175, height: 900 })
  const applicationId = await seedApplication(await signIn(page))
  await openWarnings(page, applicationId)
  await expect(page).toHaveURL(new RegExp(`[?&]edit=${applicationId}`))

  await page.reload()
  await page.getByRole('tab', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Use “AI Software Engineer”' })).toBeVisible()

  // Closing the panel removes ?edit: a later reload does not reopen it.
  await page.keyboard.press('Escape')
  await expect(page).not.toHaveURL(/[?&]edit=/)
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Resume' })).toHaveCount(0)
})

for (const width of [1440, 1175, 390]) {
  test.describe(`warnings panel at ${width} px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
    })

    test('no horizontal overflow; "Remove" and "Keep" receive the click and act', async ({ page }) => {
      const applicationId = await seedApplication(await signIn(page))
      const panel = await openWarnings(page, applicationId)

      const overflow = await panel.evaluate(section => section.scrollWidth - section.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)

      const terraform = panel.getByRole('listitem').filter({ hasText: 'Terraform' })
      const remove = terraform.getByRole('button', { name: 'Remove' })
      await expectReceivesClick(remove)
      await remove.click()
      await expect(terraform).toHaveCount(0)
      expect((await savedApplication(applicationId)).adaptedCvText).not.toContain('Terraform')

      const keep = panel.getByRole('button', { name: 'Keep “Digital Transformation Consultant”' })
      await expectReceivesClick(keep)
      await keep.click()
      await expect(keep).toHaveCount(0)
      expect((await savedApplication(applicationId)).approvedCvTitle).toBe('Digital Transformation Consultant')
    })

    test('"Use" receives the click and restores the CV title', async ({ page }) => {
      const applicationId = await seedApplication(await signIn(page))
      const panel = await openWarnings(page, applicationId)

      const use = panel.getByRole('button', { name: 'Use “AI Software Engineer”' })
      await expectReceivesClick(use)
      await use.click()
      await expect(use).toHaveCount(0)
      const titleLine = (await savedApplication(applicationId)).adaptedCvText!.split('\n')[1]
      expect(titleLine?.startsWith('AI Software Engineer |')).toBe(true)
    })
  })
}
