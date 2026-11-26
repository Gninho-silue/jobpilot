import { describe, expect, it } from 'vitest'
import { runSmoke } from '../../scripts/smoke-checks.mjs'

const BASE = 'https://jobpilot-jet.vercel.app'
const COOKIE = 'jp_demo=demo_1234567890abcdef.1795722335861.sig'

type Route = (init: RequestInit) => Response

/** A fake production: each "METHOD path" answers with a canned Response; calls are recorded. */
function fakeProduction(overrides: Record<string, Route> = {}) {
  const calls: string[] = []
  const routes: Record<string, Route> = {
    'GET /': () => new Response('<html><head><link rel="canonical" href="https://jobpilot-jet.vercel.app"/><meta property="og:url" content="https://jobpilot-jet.vercel.app"/></head><body><button>Try the demo</button></body></html>', { status: 200 }),
    'GET /sitemap.xml': () => new Response(`<urlset><url><loc>${BASE}</loc></url><url><loc>${BASE}/sign-in</loc></url></urlset>`, { status: 200 }),
    'GET /robots.txt': () => new Response(`User-Agent: *\nSitemap: ${BASE}/sitemap.xml`, { status: 200 }),
    'POST /api/demo': () => new Response(null, { status: 303, headers: { location: `${BASE}/dashboard`, 'set-cookie': `${COOKIE}; Path=/; HttpOnly; SameSite=lax` } }),
    'GET /dashboard': init =>
      String((init.headers as Record<string, string>)?.cookie ?? '').includes('jp_demo=')
        ? new Response('<h1>Dashboard</h1><p>Welcome back, Sam.</p>', { status: 200 })
        : new Response(null, { status: 307, headers: { location: `${BASE}/sign-in` } }),
    'DELETE /api/demo': () => new Response('{"ok":true}', { status: 200 }),
    ...overrides,
  }
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${new URL(url).pathname}`
    calls.push(key)
    const route = routes[key]
    return route ? route(init) : new Response('not found', { status: 404 })
  }
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls }
}

const failed = (result: { checks: Array<{ ok: boolean; message: string }> }) => result.checks.filter(c => !c.ok).map(c => c.message)

describe('production smoke test', () => {
  it('passes on a healthy production: home 200, demo opens, dashboard shows, demo deleted', async () => {
    const { fetchImpl, calls } = fakeProduction()
    const result = await runSmoke(BASE, fetchImpl)
    expect(failed(result)).toEqual([])
    expect(calls).toEqual(expect.arrayContaining(['GET /', 'POST /api/demo', 'GET /dashboard', 'DELETE /api/demo']))
  })

  it('never calls an AI or billing route (no costly writes)', async () => {
    const { fetchImpl, calls } = fakeProduction()
    await runSmoke(BASE, fetchImpl)
    expect(calls.filter(c => /offers\/parse|adapt-resume|cover-letter|interview|stripe/.test(c))).toEqual([])
    expect(calls.filter(c => !c.startsWith('GET ')).sort()).toEqual(['DELETE /api/demo', 'POST /api/demo'])
  })

  it('fails when the home page is down', async () => {
    const { fetchImpl } = fakeProduction({ 'GET /': () => new Response('error', { status: 500 }) })
    expect(failed(await runSmoke(BASE, fetchImpl))).toContain('home page answers 200')
  })

  it('fails when the demo does not open (limit, disabled or error)', async () => {
    const { fetchImpl } = fakeProduction({
      'POST /api/demo': () => new Response(null, { status: 303, headers: { location: `${BASE}/?demo=unavailable` } }),
    })
    expect(failed(await runSmoke(BASE, fetchImpl))).toContain('the demo opens (303 to /dashboard with a demo cookie)')
  })

  it('fails when the dashboard does not show the demo workspace', async () => {
    const { fetchImpl } = fakeProduction({ 'GET /dashboard': () => new Response('<p>Something went wrong</p>', { status: 500 }) })
    expect(failed(await runSmoke(BASE, fetchImpl))).toContain('the dashboard shows the demo workspace')
  })

  it('fails when a public URL points to localhost', async () => {
    const { fetchImpl } = fakeProduction({ 'GET /sitemap.xml': () => new Response('<urlset><url><loc>http://localhost:3000</loc></url></urlset>', { status: 200 }) })
    const messages = failed(await runSmoke(BASE, fetchImpl))
    expect(messages).toContain(`every sitemap URL starts with ${BASE}`)
    expect(messages).toContain('no localhost anywhere')
  })
})
