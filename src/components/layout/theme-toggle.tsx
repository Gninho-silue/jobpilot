'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/providers'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // The stored theme is only known in the browser: render the same icon on the server.
  useEffect(() => setMounted(true), [])
  const dark = !mounted || theme === 'dark'

  return (
    <button
      type="button"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-primary))] ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  )
}
