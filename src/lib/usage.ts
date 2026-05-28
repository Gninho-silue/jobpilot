import { prisma } from '@/lib/prisma'
import { FREE_TIER_LIMITS } from '@/lib/config'

type UsageField = 'cvAdaptations' | 'coverLetters' | 'applications'

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

  let usage = await prisma.usageCounter.findUnique({ where: { userId } })

  if (!usage || usage.month !== month) {
    usage = await prisma.usageCounter.upsert({
      where: { userId },
      create: { userId, month, cvAdaptations: 0, coverLetters: 0, applications: 0 },
      update: { month, cvAdaptations: 0, coverLetters: 0, applications: 0 },
    })
  }

  const current = usage[field]

  if (current >= limit) {
    return { allowed: false, current, limit }
  }

  await prisma.usageCounter.update({
    where: { userId },
    data: { [field]: { increment: 1 } },
  })

  return { allowed: true, current: current + 1, limit }
}
