import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { FREE_TIER_LIMITS } from '@/lib/config'
import { checkAndIncrementUsage } from '@/lib/usage'
import { createUser } from '@test/helpers/db'

const currentMonth = () => new Date().toISOString().slice(0, 7)

describe('free tier limits (config)', () => {
  it('are 5 applications, 3 CV adaptations and 3 cover letters per month', () => {
    expect(FREE_TIER_LIMITS).toEqual({ applications: 5, cvAdaptations: 3, coverLetters: 3 })
  })
})

describe('checkAndIncrementUsage', () => {
  it.each([
    ['applications', 5],
    ['cvAdaptations', 3],
    ['coverLetters', 3],
  ] as const)('FREE user: %s allowed %i times, then refused', async (field, limit) => {
    await createUser('user_free')

    for (let i = 1; i <= limit; i++) {
      await expect(checkAndIncrementUsage('user_free', field)).resolves.toEqual({ allowed: true, current: i, limit })
    }
    await expect(checkAndIncrementUsage('user_free', field)).resolves.toEqual({ allowed: false, current: limit, limit })

    const usage = await prisma.usageCounter.findUnique({ where: { userId: 'user_free' } })
    expect(usage?.[field]).toBe(limit)
  })

  it('counts each field separately', async () => {
    await createUser('user_free')
    for (let i = 0; i < 3; i++) await checkAndIncrementUsage('user_free', 'cvAdaptations')

    await expect(checkAndIncrementUsage('user_free', 'cvAdaptations')).resolves.toMatchObject({ allowed: false })
    await expect(checkAndIncrementUsage('user_free', 'coverLetters')).resolves.toMatchObject({ allowed: true, current: 1 })
  })

  it('counts each user separately', async () => {
    await createUser('user_a')
    await createUser('user_b')
    for (let i = 0; i < 5; i++) await checkAndIncrementUsage('user_a', 'applications')

    await expect(checkAndIncrementUsage('user_a', 'applications')).resolves.toMatchObject({ allowed: false })
    await expect(checkAndIncrementUsage('user_b', 'applications')).resolves.toMatchObject({ allowed: true, current: 1 })
  })

  it('PRO user: always allowed and nothing is counted', async () => {
    await createUser('user_pro', { plan: 'PRO' })
    for (let i = 0; i < 10; i++) {
      await expect(checkAndIncrementUsage('user_pro', 'cvAdaptations')).resolves.toEqual({
        allowed: true,
        current: 0,
        limit: Infinity,
      })
    }
    expect(await prisma.usageCounter.findUnique({ where: { userId: 'user_pro' } })).toBeNull()
  })

  it('resets every counter when the stored month is not the current month', async () => {
    await createUser('user_free')
    await prisma.usageCounter.create({
      data: { userId: 'user_free', month: '2000-01', applications: 5, cvAdaptations: 3, coverLetters: 3 },
    })

    await expect(checkAndIncrementUsage('user_free', 'applications')).resolves.toEqual({
      allowed: true,
      current: 1,
      limit: 5,
    })
    const usage = await prisma.usageCounter.findUnique({ where: { userId: 'user_free' } })
    expect(usage).toMatchObject({ month: currentMonth(), applications: 1, cvAdaptations: 0, coverLetters: 0 })
  })
})
