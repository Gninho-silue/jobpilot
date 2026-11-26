import { expect, test, type Page } from '@playwright/test'

// Kanban cards keep long company names and roles inside their column (they are
// cut with an ellipsis), at desktop and phone widths. Seen in production on
// 26/11: "TECHNOLOGIES AND DIGITAL …" and the language badge ran over the next column.
const LONG = {
  company: 'Management Solutions Consulting International',
  role: 'TECHNOLOGIES AND DIGITAL TRANSFORMATION – Stage Pré-embauche AGIRFANT (Java/Spring Boot)',
  offerText: 'A long offer for a long role.',
  language: 'FR',
}

async function cardsInsideTheirColumn(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('section[data-stage] button[draggable="true"]')).flatMap(card => {
      const column = card.closest('section[data-stage]')!.getBoundingClientRect()
      const box = card.getBoundingClientRect()
      const problems: string[] = []
      if (card.scrollWidth > card.clientWidth + 1) problems.push(`content wider than the card (${card.scrollWidth} > ${card.clientWidth})`)
      if (box.left < column.left - 1 || box.right > column.right + 1) problems.push(`card outside its column (${Math.round(box.right)} > ${Math.round(column.right)})`)
      for (const child of Array.from(card.querySelectorAll<HTMLElement>('*'))) {
        const r = child.getBoundingClientRect()
        if (r.width && r.right > box.right + 1) problems.push(`"${child.textContent?.slice(0, 30)}" past the card edge`)
      }
      return problems.length ? [`${card.textContent?.slice(0, 40)}: ${problems.join('; ')}`] : []
    })
  )
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`kanban cards stay inside their column at ${viewport.width} px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: 'Try the demo' }).click()
    await page.waitForURL('**/dashboard')
    const created = await page.evaluate(async body => {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      return res.status
    }, LONG)
    expect(created).toBe(201)

    await page.goto('/applications')
    await expect(page.getByText(LONG.company).first()).toBeAttached()
    expect(await cardsInsideTheirColumn(page)).toEqual([])
  })
}
