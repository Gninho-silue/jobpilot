import { auth } from '@clerk/nextjs/server'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from 'sonner'
import { prisma } from '@/lib/prisma'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
    : null
  const plan = dbUser?.plan ?? 'FREE'

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-base))]">
      <Navbar />
      <Sidebar plan={plan} />
      <main className="pl-60 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  )
}
