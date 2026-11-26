import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

/** Mobile top bar (under 768 px): the brand and the main action. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-4 py-2.5 md:hidden">
      <Link href="/dashboard" className="text-[17px] font-semibold tracking-tight text-[hsl(var(--text-primary))]">
        JobPilot
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link
          href="/applications?new=1"
          aria-label="New application"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))]"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </header>
  )
}
