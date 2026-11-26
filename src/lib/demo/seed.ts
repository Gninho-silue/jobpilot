import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DEMO_APPLICATIONS, DEMO_CV } from './seed-data'

const DAY = 24 * 60 * 60 * 1000

/** A new demo visitor: a demo row with the fictional CV and its 5 applications. Returns its id. */
export async function createDemoWorkspace(now = new Date()): Promise<string> {
  const id = `demo_${randomBytes(8).toString('hex')}`
  const dates = DEMO_APPLICATIONS.map(app => new Date(now.getTime() - app.daysAgo * DAY))
  // The free-plan counter reflects the seeded applications of this month (UTC
  // month, as lib/usage.ts counts), so the banner and the limit tell the truth.
  const month = now.toISOString().slice(0, 7)
  const createdThisMonth = dates.filter(date => date.toISOString().slice(0, 7) === month).length
  await prisma.$transaction([
    prisma.user.create({ data: { id, email: `${id}@demo.invalid`, isDemo: true, cvText: DEMO_CV, createdAt: now } }),
    prisma.application.createMany({
      data: DEMO_APPLICATIONS.map(({ daysAgo: _daysAgo, interviewQs, ...app }, index) => ({
        ...app,
        userId: id,
        interviewQs: interviewQs ? (interviewQs as unknown as Prisma.InputJsonValue) : undefined,
        createdAt: dates[index],
      })),
    }),
    prisma.usageCounter.create({ data: { userId: id, month, applications: createdThisMonth } }),
  ])
  return id
}
