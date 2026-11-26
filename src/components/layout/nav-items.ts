import { Briefcase, FileText, LayoutDashboard, MessageSquare, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  /** Shorter label for the mobile bottom bar. */
  short?: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/my-cv', label: 'My CV', icon: FileText },
  { href: '/interview', label: 'Interview prep', short: 'Interview', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')
