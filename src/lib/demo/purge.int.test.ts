import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createApplication, createUser } from '@test/helpers/db'
import { createDemoWorkspace } from './seed'
import { DEMO_MAX_AGE_MS, purgeExpiredDemos } from './purge'

const HOUR = 60 * 60 * 1000

async function age(userId: string, ms: number) {
  await prisma.user.update({ where: { id: userId }, data: { createdAt: new Date(Date.now() - ms) } })
}

describe('demo purge after 24 h', () => {
  it('deletes demos older than 24 h with their applications and usage; keeps recent demos and real users', async () => {
    const old = await createDemoWorkspace()
    const recent = await createDemoWorkspace()
    await age(old, DEMO_MAX_AGE_MS + HOUR)
    await age(recent, HOUR)
    await prisma.usageCounter.create({ data: { userId: old, month: '2026-11' } })
    await createUser('user_real01')
    await age('user_real01', 30 * 24 * HOUR)
    await createApplication('user_real01')

    const result = await purgeExpiredDemos()

    expect(result.deleted).toBe(1)
    expect(await prisma.user.findUnique({ where: { id: old } })).toBeNull()
    expect(await prisma.application.count({ where: { userId: old } })).toBe(0)
    expect(await prisma.usageCounter.count({ where: { userId: old } })).toBe(0)
    expect(await prisma.application.count({ where: { userId: recent } })).toBe(5)
    expect(await prisma.user.findUnique({ where: { id: 'user_real01' } })).not.toBeNull()
    expect(await prisma.application.count({ where: { userId: 'user_real01' } })).toBe(1)
  })

  it('drops the demo rate-limit rows older than 24 h, never the others', async () => {
    const old = new Date(Date.now() - DEMO_MAX_AGE_MS - HOUR)
    await prisma.rateLimitHit.createMany({
      data: [
        { key: 'demo-heavy:demo_x1234567', createdAt: old },
        { key: 'demo-start:203.0.113.7', createdAt: old },
        { key: 'demo-heavy:demo_y1234567', createdAt: new Date() },
        { key: 'llm:user_real01', createdAt: old },
      ],
    })
    await purgeExpiredDemos()
    expect((await prisma.rateLimitHit.findMany({ select: { key: true } })).map(h => h.key).sort()).toEqual([
      'demo-heavy:demo_y1234567',
      'llm:user_real01',
    ])
  })

  it('a seeded workspace: demo row with the fictional CV and 5 applications', async () => {
    const id = await createDemoWorkspace()
    expect(id).toMatch(/^demo_[a-z0-9]{16}$/)
    const user = await prisma.user.findUniqueOrThrow({ where: { id } })
    expect(user).toEqual(expect.objectContaining({ isDemo: true, plan: 'FREE', cvPath: null, email: `${id}@demo.invalid` }))
    expect(user.cvText).toContain('Sam Rivera')
    expect(await prisma.application.count({ where: { userId: id } })).toBe(5)
  })
})
