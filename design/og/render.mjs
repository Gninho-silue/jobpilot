// Renders the share images: node design/og/render.mjs
// - public/og.png (1200 × 630): design/og/og-card.html at deviceScaleFactor 2,
//   downscaled with Lanczos so the text stays sharp.
// - public/apple-icon.png (180 × 180): public/icon.svg, opaque (iOS adds no background).
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFileSync, statSync } from 'node:fs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const browser = await chromium.launch()

async function render(url, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  // A line that runs past its box would be cut in the share preview: stop instead.
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll('body *')].filter(el => el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0).map(el => el.className || el.tagName),
  )
  if (overflowing.length) throw new Error(`Text overflows its box: ${overflowing.join(', ')}`)
  const png = await page.screenshot({ type: 'png' })
  await page.close()
  return png
}

const card = await render(pathToFileURL(root + 'design/og/og-card.html').href, 1200, 630)
await sharp(card)
  .resize(1200, 630, { kernel: 'lanczos3' })
  .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
  .toFile(root + 'public/og.png')

// iOS masks the corners itself: draw the icon full-bleed on its own background,
// so no light corners show behind the rounded square.
const iconPage = 'data:text/html,' + encodeURIComponent(`<style>html,body{margin:0;width:180px;height:180px;overflow:hidden;background:linear-gradient(135deg,#1c1917,#0c0a09)}svg{display:block;width:192px;height:192px;margin:-6px}</style>${readFileSync(root + 'public/icon.svg', 'utf8')}`)
const icon = await render(iconPage, 180, 180)
await sharp(icon)
  .resize(180, 180, { kernel: 'lanczos3' })
  .flatten({ background: '#0c0a09' })
  .png({ compressionLevel: 9 })
  .toFile(root + 'public/apple-icon.png')

await browser.close()
for (const file of ['public/og.png', 'public/apple-icon.png']) {
  console.log(file, Math.round(statSync(root + file).size / 1024), 'KB')
}
