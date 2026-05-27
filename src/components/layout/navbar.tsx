'use client'

import { useTheme } from 'next-themes'
import { UserButton } from '@clerk/nextjs'
import { Sun, Moon, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-6 border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 font-bold text-lg tracking-tight">
          Job<span className="text-[hsl(var(--text-primary))]">Pilot</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="h-9 w-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <UserButton />
      </div>
    </header>
  )
}
