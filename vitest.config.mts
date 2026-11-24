import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = fileURLToPath(new URL('./src', import.meta.url))
const testDir = fileURLToPath(new URL('./test', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${src}/`,
      '@test/': `${testDir}/`,
    },
  },
  test: {
    // Every external service (Clerk, Groq, Supabase, Stripe network, analytics)
    // is replaced in test/setup/mocks.ts. No test may reach a real service.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
          exclude: ['**/*.int.test.{ts,tsx}', 'node_modules/**'],
          setupFiles: ['test/setup/env.ts', 'test/setup/mocks.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.int.test.ts', 'test/**/*.int.test.ts'],
          globalSetup: ['test/setup/postgres.ts'],
          setupFiles: ['test/setup/env.ts', 'test/setup/mocks.ts', 'test/setup/db.ts'],
          // One shared Postgres database: run files one after another.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
})
