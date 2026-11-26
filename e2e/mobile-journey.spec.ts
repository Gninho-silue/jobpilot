import { expect, test, type Page } from '@playwright/test'

// Step 6.4 of JOBPILOT_PLAN.md: the whole demo at 390 px, with no element past
// the edge of the screen and no horizontal page scroll. Content inside a
// container meant to scroll sideways (the kanban, the panel's tabs) is allowed.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function expectNothingOffScreen(page: Page, where: string) {
  const report = await page.evaluate(() => {
    const width = window.innerWidth
    const scrollsSideways = (el: Element | null): boolean => {
      for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth) return true
      }
      return false
    }
    const offenders: string[] = []
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      if ((box.right > width + 1 || box.left < -1) && !scrollsSideways(el)) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(box.left)}, ${Math.round(box.right)}]`)
      }
    }
    return { pageScroll: document.documentElement.scrollWidth - width, offenders: offenders.slice(0, 5) }
  })
  expect(report, where).toEqual({ pageScroll: 0, offenders: [] })
}

test('the demo at 390 px: nothing goes past the edge of the screen', async ({ page }) => {
  await page.goto('/')
  await expectNothingOffScreen(page, 'home')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/dashboard')
  await expect(page.getByText('Welcome back, Sam.')).toBeVisible()
  await expectNothingOffScreen(page, 'dashboard')

  // Main navigation: the bottom bar.
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Applications' }).click()
  await page.waitForURL('**/applications')
  await expect(page.getByText('Northwind Traders').first()).toBeVisible()
  await expectNothingOffScreen(page, 'kanban')

  // One stage at a time: the tabs jump to a stage.
  await page.getByRole('button', { name: /^Offer/ }).click()
  await expect(page.getByText('Adventure Works').first()).toBeInViewport()

  // The detail panel is full screen, its tabs are reachable.
  await page.getByRole('button', { name: /^Applied/ }).click()
  await page.getByText('Northwind Traders').first().click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()
  const box = (await panel.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(389)
  await panel.getByRole('tab', { name: 'Resume' }).click()
  await expect(panel.getByText('Kubernetes').first()).toBeVisible()
  await panel.getByRole('tab', { name: 'Interview' }).click()
  await expect(panel.getByRole('tab', { name: 'Interview' })).toHaveAttribute('aria-selected', 'true')
  await expectNothingOffScreen(page, 'detail panel')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  // More → My CV.
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('link', { name: 'My CV' }).click()
  await page.waitForURL('**/my-cv')
  await expect(page.getByRole('article', { name: 'Fictional CV of the demo' })).toBeVisible()
  await expectNothingOffScreen(page, 'my cv')

  // Interview prep and the mock interview.
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Interview' }).click()
  await page.waitForURL('**/interview')
  await page.getByRole('button', { name: 'Practice' }).click()
  await expect(page.getByRole('dialog', { name: 'Mock interview: Woodgrove Bank' })).toBeVisible()
  await expectNothingOffScreen(page, 'mock interview')
})
