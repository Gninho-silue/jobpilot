// Smoke test of the deployed app: the public URLs it builds point to production.
// Usage: npm run smoke:prod [-- https://other-host]   (read-only GET requests)
const BASE = (process.argv[2] ?? 'https://jobpilot-jet.vercel.app').replace(/\/$/, '')
const failures = []
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) failures.push(message)
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' })
  return { status: res.status, text: await res.text() }
}

const sitemap = await get('/sitemap.xml')
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
check(sitemap.status === 200 && locs.length > 0, `sitemap.xml lists ${locs.length} URLs`)
check(locs.every(loc => loc.startsWith(`${BASE}/`) || loc === BASE), `every sitemap URL starts with ${BASE}`)

const robots = await get('/robots.txt')
check(robots.text.includes(`Sitemap: ${BASE}/sitemap.xml`), `robots.txt points to ${BASE}/sitemap.xml`)

const home = await get('/')
check(home.status === 200, 'home page answers 200')
const metaUrls = [...home.text.matchAll(/<(?:meta|link)[^>]+(?:content|href)="(https?:\/\/[^"]+)"/g)]
  .map(m => m[1])
  .filter(url => !/fonts\.|clerk|vercel-insights|googletagmanager/.test(url))
check(metaUrls.length > 0, `home page metadata holds ${metaUrls.length} absolute URLs`)
check(metaUrls.every(url => url.startsWith(BASE)), `every metadata URL starts with ${BASE}`)
check(!/localhost|127\.0\.0\.1/.test(sitemap.text + robots.text + metaUrls.join(' ')), 'no localhost anywhere')

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
