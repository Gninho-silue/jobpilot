import { getActor } from '@/lib/actor'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from 'sonner'
import { DemoBanner } from '@/components/demo/demo-banner'
import { prisma } from '@/lib/prisma'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor()
  const userId = actor?.id
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
    : null
  const plan = dbUser?.plan ?? 'FREE'

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-base))]">
      <Navbar isDemo={actor?.kind === 'demo'} />
      <Sidebar plan={plan} />
      <main className="pl-60 pt-16 min-h-screen">
        {actor?.kind === 'demo' ? <DemoBanner /> : null}
        <div className="p-6">{children}</div>
      </main>
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  )
}
