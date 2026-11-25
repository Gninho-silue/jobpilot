// Runs the Playwright tests against a throwaway Postgres in Docker.
// Usage: npm run test:e2e [-- playwright args]
import { execSync, spawnSync } from 'node:child_process'

const NAME = 'jobpilot-e2e-db'
const URL = 'postgresql://postgres:postgres@localhost:55433/jobpilot_e2e'
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

try {
  execSync(`docker rm -f ${NAME}`, { stdio: 'ignore' })
} catch {}
sh(`docker run -d --rm --name ${NAME} -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jobpilot_e2e -p 55433:5432 postgres:16-alpine`, { stdio: 'ignore' })
try {
  for (let i = 0; i < 60; i++) {
    try {
      execSync(`docker exec ${NAME} pg_isready -U postgres -d jobpilot_e2e`, { stdio: 'ignore' })
      break
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  await new Promise(resolve => setTimeout(resolve, 1000))
  sh('npx prisma db push', { env: { ...process.env, DATABASE_URL: URL } })
  const result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, E2E_DATABASE_URL: URL },
  })
  process.exitCode = result.status ?? 1
} finally {
  execSync(`docker rm -f ${NAME}`, { stdio: 'ignore' })
}
