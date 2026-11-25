import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DEMO_APPLICATIONS, DEMO_CV } from './seed-data'

const DAY = 24 * 60 * 60 * 1000

/** A new demo visitor: a demo row with the fictional CV and its 5 applications. Returns its id. */
export async function createDemoWorkspace(now = new Date()): Promise<string> {
  const id = `demo_${randomBytes(8).toString('hex')}`
  await prisma.$transaction([
    prisma.user.create({ data: { id, email: `${id}@demo.invalid`, isDemo: true, cvText: DEMO_CV, createdAt: now } }),
    prisma.application.createMany({
      data: DEMO_APPLICATIONS.map(({ daysAgo, interviewQs, ...app }) => ({
        ...app,
        userId: id,
        interviewQs: interviewQs ? (interviewQs as unknown as Prisma.InputJsonValue) : undefined,
        createdAt: new Date(now.getTime() - daysAgo * DAY),
      })),
    }),
  ])
  return id
}
