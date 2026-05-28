'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UpgradeButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'link'
}

export function UpgradeButton({ children, className, variant = 'primary' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Failed to start checkout. Please try again.')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors whitespace-nowrap disabled:opacity-60',
          className
        )}
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Redirecting…
          </span>
        ) : (
          children
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-amber-500 text-black text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-60',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting…
        </>
      ) : (
        children
      )}
    </button>
  )
}
