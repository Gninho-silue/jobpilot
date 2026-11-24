import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

// Integration tests TRUNCATE tables. Refuse anything that is not a local,
// throwaway database so a misconfigured env can never wipe real data.
function assertThrowaway(url: string): void {
  const { hostname } = new URL(url)
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to run integration tests against non-local database host "${hostname}"`)
  }
}

/**
 * Starts Postgres for the integration tests.
 * - CI provides TEST_DATABASE_URL (a Postgres service container).
 * - Locally, Testcontainers starts postgres:16-alpine (Docker must be running).
 * The schema is applied with `prisma db push`.
 */
export default async function setup(project: TestProject) {
  let container: StartedPostgreSqlContainer | undefined
  let url = process.env.TEST_DATABASE_URL

  if (!url) {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    url = container.getConnectionUri()
  }

  assertThrowaway(url)

  execSync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  })

  project.provide('databaseUrl', url)

  return async () => {
    await container?.stop()
  }
}
