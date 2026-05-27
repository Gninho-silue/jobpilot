import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--bg-base))]">
      <Navbar />
      <Sidebar />
      <main className="pl-60 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
