'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UpgradeButton } from '@/components/upgrade-button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/my-cv', label: 'My CV', icon: FileText },
  { href: '/interview', label: 'Interview Prep', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  plan: 'FREE' | 'PRO'
}

export function Sidebar({ plan }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 border-r border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[hsl(var(--accent-light))] text-amber-500'
                  : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-primary))]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {plan === 'FREE' && (
        <div className="p-3 border-t border-[hsl(var(--border-default))]">
          <div className="rounded-xl bg-[hsl(var(--accent-light))] border border-amber-500/20 p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                Upgrade to Pro
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[hsl(var(--text-muted))]">
              Unlimited applications, advanced AI tailoring and interview coaching.
            </p>
            <UpgradeButton>
              Upgrade — $9/mo
            </UpgradeButton>
          </div>
        </div>
      )}
    </aside>
  )
}
