import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Step 6 of JOBPILOT_PLAN.md: screenshots of every screen, from the demo workspace
// (fictional data), at 1440 and 390 px, dark and light themes.
// Run only on demand:
//   CAPTURE=1 npm run test:e2e -- capture.spec.ts                 → design/before (PNG, 6.1)
//   CAPTURE=1 CAPTURE_DIR=design/after npm run test:e2e -- capture.spec.ts   (JPEG)
//   CAPTURE_ONLY=dashboard|kanban keeps only the matching screens.
// Every AI and Stripe call is blocked: no credit spent, nothing created outside.
test.skip(!process.env.CAPTURE, 'screenshots only on demand (CAPTURE=1)')
test.describe.configure({ timeout: 300_000 })

const OUT = process.env.CAPTURE_DIR ?? 'design/before'
const ONLY = process.env.CAPTURE_ONLY ? new RegExp(process.env.CAPTURE_ONLY) : null
const JPEG = OUT !== 'design/before'
mkdirSync(OUT, { recursive: true })

const BLOCKED = /\/api\/(offers\/parse|interview\/feedback|stripe\/(checkout|portal)|applications\/[^/]+\/(adapt-resume|cover-letter|interview))$/

async function blockOutsideCalls(page: Page) {
  await page.route(url => BLOCKED.test(url.pathname), route =>
    route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 503, json: { error: 'Blocked during screenshots' } })
  )
}

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const

for (const viewport of VIEWPORTS) {
  for (const theme of ['dark', 'light'] as const) {
    test(`screens at ${viewport.name} px, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.addInitScript(t => localStorage.setItem('theme', t), theme)
      await blockOutsideCalls(page)
      const shot = async (name: string, fullPage = true) => {
        if (ONLY && !ONLY.test(name)) return
        await page.waitForTimeout(400)
        const path = `${OUT}/${name}-${viewport.name}-${theme}.${JPEG ? 'jpg' : 'png'}`
        await page.screenshot({ path, fullPage, animations: 'disabled', ...(JPEG ? { type: 'jpeg' as const, quality: 72 } : {}) })
      }

      // Public pages.
      await page.goto('/')
      await shot('01-home')
      await page.goto('/?demo=limit')
      await shot('02-home-demo-limit-message', false)
      await page.goto('/sign-in')
      await page.waitForTimeout(2500) // Clerk widget
      await shot('03-sign-in', false)
      await page.goto('/sign-up')
      await page.waitForTimeout(2500)
      await shot('04-sign-up', false)

      // Demo workspace.
      await page.goto('/')
      await page.getByRole('button', { name: 'Try the demo' }).click()
      await page.waitForURL('**/dashboard')
      await shot('05-dashboard')
      await shot('05b-dashboard-first-screen', false)

      const apps = await page.evaluate(async () => (await (await fetch('/api/applications')).json()).data as Array<{ id: string; company: string }>)
      const id = (company: string) => apps.find(a => a.company === company)!.id

      await page.goto('/applications')
      await expect(page.getByText('Northwind Traders').first()).toBeVisible()
      await shot('06-applications-kanban')

      await page.goto(`/applications?edit=${id('Northwind Traders')}`)
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
      await shot('07-detail-overview', false)
      await page.getByRole('tab', { name: 'Resume' }).click()
      await expect(page.getByText('Kubernetes').first()).toBeVisible()
      await shot('08-detail-resume-fact-check', false)
      await page.getByRole('tab', { name: 'Cover Letter' }).click()
      await shot('09-detail-cover-letter', false)
      await page.getByRole('tab', { name: 'Interview' }).click()
      await shot('10-detail-interview-empty', false)

      // A confirmation (cancelled: nothing is regenerated).
      await page.getByRole('tab', { name: 'Resume' }).click()
      await page.getByRole('button', { name: 'Regenerate' }).first().click()
      await expect(page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: 'Regenerate the adapted CV?' }))).toBeVisible()
      await shot('11-confirm-dialog', false)
      await page.getByRole('button', { name: 'Cancel' }).click()

      await page.goto(`/applications?edit=${id('Woodgrove Bank')}`)
      await page.getByRole('tab', { name: 'Interview' }).click()
      await shot('12-detail-interview-questions', false)

      await page.goto('/applications?new=1')
      await expect(page.getByRole('dialog')).toBeVisible()
      await shot('13-new-application-modal', false)

      await page.goto('/my-cv')
      await page.waitForLoadState('networkidle')
      await shot('14-my-cv')

      await page.goto('/interview')
      await page.waitForLoadState('networkidle')
      await shot('15-interview-prep')
      await page.getByRole('button', { name: 'Practice' }).first().click()
      // A full-screen overlay without role="dialog" (noted in the inventory).
      await expect(page.getByText(/Question 1 of/)).toBeVisible()
      await shot('16-mock-interview', false)

      await page.goto('/settings')
      await shot('17-settings')

      // Loading and error states of the kanban (the list is fetched on the client).
      await page.route('**/api/applications', async route => {
        await new Promise(resolve => setTimeout(resolve, 4000))
        await route.continue()
      })
      await page.goto('/applications')
      await shot('18-applications-loading', false)
      await page.unroute('**/api/applications')
      await page.route('**/api/applications', route => route.fulfill({ status: 500, json: { error: 'Internal server error' } }))
      await page.goto('/applications')
      await page.waitForTimeout(1500)
      await shot('19-applications-error', false)
      await page.unroute('**/api/applications')

      // Empty states: the demo deletes its own applications.
      await page.evaluate(async ids => {
        for (const appId of ids) await fetch(`/api/applications/${appId}`, { method: 'DELETE' })
      }, apps.map(a => a.id))
      await page.goto('/dashboard')
      await shot('20-dashboard-empty')
      await page.goto('/applications')
      await page.waitForLoadState('networkidle')
      await shot('21-applications-empty')
      await page.goto('/interview')
      await page.waitForLoadState('networkidle')
      await shot('22-interview-prep-empty')
    })
  }
}
