'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { AccountControl } from './account-control'
import { NAV_ITEMS, isActive } from './nav-items'
import { PlanMeter, type PlanUsage } from './plan-meter'

const MAIN_HREFS = ['/dashboard', '/applications', '/interview']
const MAIN = NAV_ITEMS.filter(item => MAIN_HREFS.includes(item.href))
const MORE = NAV_ITEMS.filter(item => !MAIN_HREFS.includes(item.href))

/** Mobile navigation (under 768 px): three main destinations and "More". */
export function BottomNav({ usage, isDemo }: { usage: PlanUsage; isDemo: boolean }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE.some(item => isActive(pathname, item.href))
  const tab = (active: boolean) =>
    cn(
      'flex flex-col items-center gap-0.5 py-1.5 text-xs',
      active ? 'font-semibold text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-muted))]'
    )

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden"
    >
      {MAIN.map(({ href, label, short, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={tab(active)}>
            <Icon className="h-5 w-5" aria-hidden />
            {short ?? label}
          </Link>
        )
      })}
      <button type="button" onClick={() => setMoreOpen(true)} className={tab(moreActive)} aria-haspopup="dialog">
        <MoreHorizontal className="h-5 w-5" aria-hidden />
        More
      </button>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="gap-4 rounded-t-2xl px-4 pb-8 pt-5">
          <SheetTitle className="text-base">More</SheetTitle>
          <div className="grid gap-1">
            {MORE.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(pathname, href) ? 'page' : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-surface-raised))]"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
          <PlanMeter {...usage} />
          <div className="px-1">
            <AccountControl isDemo={isDemo} />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
