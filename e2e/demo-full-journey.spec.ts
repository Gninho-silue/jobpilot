import { expect, test, type Page } from '@playwright/test'

// The whole demo flow with the fake language model (E2E_FAKE_LLM=1, see
// playwright.config.ts): create an application from an offer, adapt the CV,
// see the fact-check, write the letter, export both PDFs. No call to Groq: the
// fake answers claim Terraform, absent from the demo CV, so the panel opens.
const OFFER = 'Contoso Robotics is hiring a Backend Engineer (Node.js, PostgreSQL, Redis) for its fleet platform. Remote, 52k€.'

async function exportPdf(page: Page, panel: ReturnType<Page['getByRole']>) {
  const download = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Download PDF' }).click()
  // Claims are not supported by the CV: exporting anyway needs a confirmation.
  await page.getByRole('button', { name: 'Export anyway' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.pdf$/)
}

test('demo: offer → application → adapted CV with its fact-check → letter → PDFs → interview feedback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/dashboard')

  // A new application: the offer is analysed and fills in company and role.
  await page.goto('/applications?new=1')
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder(/Paste the job offer/).fill(OFFER)
  await expect(modal.getByPlaceholder('Company')).toHaveValue('Contoso Robotics')
  await expect(modal.getByPlaceholder('Role')).toHaveValue('Backend Engineer')
  await modal.getByRole('button', { name: 'Create Application' }).click()
  await expect(modal).toBeHidden()

  // The adapted CV, streamed, then checked against the demo CV.
  await page.getByText('Contoso Robotics').first().click()
  const panel = page.getByRole('dialog')
  await panel.getByRole('tab', { name: 'Resume' }).click()
  await panel.getByRole('button', { name: 'Generate Adapted CV' }).click()
  const warnings = panel.locator('section', { has: page.getByRole('heading', { name: /not found in your CV/ }) })
  await expect(warnings).toBeVisible({ timeout: 30_000 })
  await expect(warnings.getByText('Terraform').first()).toBeVisible()
  await exportPdf(page, panel)

  // The cover letter, checked too.
  await panel.getByRole('tab', { name: 'Cover Letter' }).click()
  await panel.getByRole('button', { name: 'Generate Cover Letter' }).click()
  await expect(panel.getByText('Terraform').first()).toBeVisible({ timeout: 30_000 })
  await exportPdf(page, panel)

  // Interview practice: one question, one answer, feedback on it (open to the
  // demo within its daily feedback quota; Pro-only for free accounts).
  await page.goto('/interview')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Practice' }).click()
  const interview = page.getByRole('dialog', { name: 'Mock interview: Woodgrove Bank' })
  await interview.getByPlaceholder(/Type your answer/).fill('I cached the slowest shipment queries in Redis and measured p95 before and after.')
  await interview.getByRole('button', { name: /Next/ }).click()
  await expect(interview.getByText('7/10')).toBeVisible()
  await expect(interview.getByText('Concrete example from the CV.')).toBeVisible()
})
