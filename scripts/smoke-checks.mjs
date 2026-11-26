// Checks of the deployed app, shared by `npm run smoke:prod` and its tests.
// Read-only except for one demo workspace, created then deleted: no AI call, no
// billing call, nothing that costs anything.

/**
 * @param {string} base  e.g. https://jobpilot-jet.vercel.app
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ checks: Array<{ ok: boolean, message: string }> }>}
 */
export async function runSmoke(base, fetchImpl = fetch) {
  const BASE = base.replace(/\/$/, '')
  const checks = []
  const check = (ok, message) => checks.push({ ok: Boolean(ok), message })
  const request = async (method, path, headers = {}) => {
    const res = await fetchImpl(BASE + path, { method, redirect: 'manual', headers })
    return { status: res.status, headers: res.headers, text: await res.text() }
  }

  // Home page and the public URLs it builds (they once pointed to localhost).
  const home = await request('GET', '/')
  check(home.status === 200, 'home page answers 200')
  const metaUrls = [...home.text.matchAll(/<(?:meta|link)[^>]+(?:content|href)="(https?:\/\/[^"]+)"/g)]
    .map(m => m[1])
    .filter(url => !/fonts\.|clerk|vercel-insights|googletagmanager/.test(url))
  check(metaUrls.every(url => url.startsWith(BASE)), `every metadata URL starts with ${BASE}`)

  const sitemap = await request('GET', '/sitemap.xml')
  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  check(sitemap.status === 200 && locs.length > 0, `sitemap.xml lists ${locs.length} URLs`)
  check(locs.every(loc => loc === BASE || loc.startsWith(`${BASE}/`)), `every sitemap URL starts with ${BASE}`)

  const robots = await request('GET', '/robots.txt')
  check(robots.text.includes(`Sitemap: ${BASE}/sitemap.xml`), `robots.txt points to ${BASE}/sitemap.xml`)
  check(!/localhost|127\.0\.0\.1/.test(sitemap.text + robots.text + metaUrls.join(' ')), 'no localhost anywhere')

  // The demo opens and the dashboard shows it; then the workspace is deleted.
  const start = await request('POST', '/api/demo')
  const location = start.headers.get('location') ?? ''
  const cookie = (start.headers.get('set-cookie') ?? '').match(/jp_demo=[^;]+/)?.[0]
  const opened = start.status === 303 && new URL(location, BASE).pathname === '/dashboard' && Boolean(cookie)
  check(opened, 'the demo opens (303 to /dashboard with a demo cookie)')

  if (opened) {
    try {
      const dashboard = await request('GET', '/dashboard', { cookie })
      check(dashboard.status === 200 && dashboard.text.includes('Welcome back, Sam.'), 'the dashboard shows the demo workspace')
    } finally {
      const exit = await request('DELETE', '/api/demo', { cookie })
      check(exit.status === 200, 'the demo workspace is deleted afterwards')
    }
  } else {
    check(false, 'the dashboard shows the demo workspace')
  }

  return { checks }
}
