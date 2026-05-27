'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/cv', label: 'My CV', icon: FileText },
  { href: '/interview', label: 'Interview Prep', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
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

      <div className="p-3 border-t border-[hsl(var(--border-default))]">
        <Link
          href="/upgrade"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-amber-500 text-black text-sm font-medium hover:bg-amber-400 transition-colors"
        >
          <Zap className="h-4 w-4" />
          Upgrade to Pro
        </Link>
      </div>
    </aside>
  )
}
