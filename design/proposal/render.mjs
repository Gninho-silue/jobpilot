// Renders the dashboard mockup to PNG: node design/proposal/render.mjs
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'

const page = pathToFileURL(new URL('./mockup-dashboard.html', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')).href
const browser = await chromium.launch()
for (const [name, width, height, mobile] of [['desktop-1440', 1440, 900, false], ['mobile-390', 390, 844, true]]) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
    const tab = await context.newPage()
    await tab.goto(`${page}?theme=${theme}`)
    await tab.evaluate(() => document.fonts.ready)
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    await tab.screenshot({ path: new URL(`./dashboard-${name}-${theme}.png`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: !mobile })
    console.log(name, theme, 'horizontal overflow:', overflow)
    await context.close()
  }
}
await browser.close()
