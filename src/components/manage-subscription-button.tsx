'use client'

import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Failed to open portal. Please try again.')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(var(--border-default))] bg-transparent text-sm font-medium text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-primary))] transition-colors disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening…
        </>
      ) : (
        <>
          <ExternalLink className="h-4 w-4" />
          Manage Subscription
        </>
      )}
    </button>
  )
}
