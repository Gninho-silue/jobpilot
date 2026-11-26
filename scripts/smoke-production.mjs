// Smoke test of the deployed app (scripts/smoke-checks.mjs): home page, public
// URLs, and a demo workspace opened, shown and deleted. No AI or billing call.
// Usage: npm run smoke:prod [-- https://other-host]
import { runSmoke } from './smoke-checks.mjs'

const base = process.argv[2] ?? 'https://jobpilot-jet.vercel.app'
const { checks } = await runSmoke(base)
for (const { ok, message } of checks) console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`)

const failures = checks.filter(c => !c.ok)
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
