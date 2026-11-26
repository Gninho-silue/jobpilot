import { getActor } from '@/lib/actor'
import { Toaster } from 'sonner'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import type { PlanUsage } from '@/components/layout/plan-meter'
import { DemoBanner } from '@/components/demo/demo-banner'
import { FREE_TIER_LIMITS } from '@/lib/config'
import { applicationsUsedThisMonth } from '@/lib/dashboard-stats'
import { prisma } from '@/lib/prisma'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor()
  const [dbUser, counter] = actor
    ? await Promise.all([
        prisma.user.findUnique({ where: { id: actor.id }, select: { plan: true } }),
        prisma.usageCounter.findUnique({ where: { userId: actor.id } }),
      ])
    : [null, null]
  const usage: PlanUsage = {
    plan: dbUser?.plan ?? 'FREE',
    used: applicationsUsedThisMonth(counter, new Date()),
    limit: FREE_TIER_LIMITS.applications,
  }
  const isDemo = actor?.kind === 'demo'

  return (
    <div className="min-h-screen overflow-x-clip bg-[hsl(var(--bg-base))]">
      <Sidebar usage={usage} isDemo={isDemo} />
      <TopBar />
      <main className="min-w-0 pb-24 md:pb-0 md:pl-60">
        {isDemo ? <DemoBanner /> : null}
        <div className="mx-auto max-w-[1320px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
      <BottomNav usage={usage} isDemo={isDemo} />
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  )
}
