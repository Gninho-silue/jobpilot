'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AccountControl } from './account-control'
import { NAV_ITEMS, isActive } from './nav-items'
import { PlanMeter, type PlanUsage } from './plan-meter'
import { ThemeToggle } from './theme-toggle'

/** Desktop navigation (768 px and up); the mobile one is BottomNav. */
export function Sidebar({ usage, isDemo }: { usage: PlanUsage; isDemo: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-3 py-5 md:flex">
      <Link href="/dashboard" className="px-3 text-[17px] font-semibold tracking-tight text-[hsl(var(--text-primary))]">
        JobPilot
      </Link>
      <nav aria-label="Main navigation" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-primary))] shadow-[inset_2px_0_0_hsl(var(--text-primary))]'
                  : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-primary))]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto grid gap-3">
        <PlanMeter {...usage} />
        <div className="flex items-center justify-between gap-2 px-1">
          <AccountControl isDemo={isDemo} />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
