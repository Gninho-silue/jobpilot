import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { FREE_TIER_LIMITS } from '@/lib/config'

type UsageField = 'cvAdaptations' | 'coverLetters' | 'applications'

// Column names are interpolated into SQL, so they come from this closed map only.
const COLUMN: Record<UsageField, Prisma.Sql> = {
  applications: Prisma.raw('"applications"'),
  cvAdaptations: Prisma.raw('"cvAdaptations"'),
  coverLetters: Prisma.raw('"coverLetters"'),
}

/**
 * Consumes one free-tier credit if one is left this month. Safe under
 * concurrency: N simultaneous calls with one credit left → exactly one succeeds.
 *
 * 1. INSERT … ON CONFLICT creates the row, or resets it when the stored month is
 *    stale. A concurrent second reset matches nothing (the month is already current).
 * 2. A single conditional UPDATE … RETURNING checks and increments; Postgres
 *    re-evaluates the WHERE after taking the row lock, so the limit cannot be passed.
 */
export async function checkAndIncrementUsage(
  userId: string,
  field: UsageField
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const month = new Date().toISOString().slice(0, 7)
  const limit = FREE_TIER_LIMITS[field]

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })

  if (user?.plan === 'PRO') {
    return { allowed: true, current: 0, limit: Infinity }
  }

  await prisma.$executeRaw`
    INSERT INTO "UsageCounter" ("id", "userId", "month", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, ${month}, NOW())
    ON CONFLICT ("userId") DO UPDATE
      SET "month" = EXCLUDED."month",
          "applications" = 0, "cvAdaptations" = 0, "coverLetters" = 0,
          "updatedAt" = NOW()
      WHERE "UsageCounter"."month" <> EXCLUDED."month"`

  const column = COLUMN[field]
  const incremented = await prisma.$queryRaw<Array<{ current: number }>>`
    UPDATE "UsageCounter"
    SET ${column} = ${column} + 1, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "month" = ${month} AND ${column} < ${limit}
    RETURNING ${column} AS "current"`

  if (incremented[0]) {
    return { allowed: true, current: incremented[0].current, limit }
  }

  const usage = await prisma.usageCounter.findUnique({ where: { userId } })
  return { allowed: false, current: usage?.[field] ?? limit, limit }
}

/** Gives back a credit consumed by a generation that produced nothing usable. */
export async function refundUsage(userId: string, field: UsageField): Promise<void> {
  const column = COLUMN[field]
  await prisma.$executeRaw`
    UPDATE "UsageCounter" SET ${column} = ${column} - 1, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND ${column} > 0`
}
