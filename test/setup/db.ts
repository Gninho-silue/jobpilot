import { afterAll, beforeEach, inject } from 'vitest'

// Runs before each integration test file is imported, so `@/lib/prisma`
// picks up the throwaway database URL.
process.env.DATABASE_URL = inject('databaseUrl')

const { prisma } = await import('@/lib/prisma')

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Application", "UsageCounter", "User", "RateLimitHit", "ProcessedBillingEvent", "CronRun" CASCADE')
})

afterAll(async () => {
  await prisma.$disconnect()
})
