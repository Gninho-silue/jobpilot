'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import { UpgradeButton } from '@/components/upgrade-button'

interface FreeTierBannerProps {
  used: number
  limit: number
  nextResetDate: string
}

export function FreeTierBanner({ used, limit, nextResetDate }: FreeTierBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const pct = Math.min((used / limit) * 100, 100)

  return (
    <div className="relative flex items-start gap-4 rounded-xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-4 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl" />

      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">
            Free plan — {used} of {limit} applications used this month
          </span>
        </div>
        <p className="text-xs text-[hsl(var(--text-muted))] mb-3">
          Resets {nextResetDate}. Upgrade to Pro for unlimited applications and AI generations.
        </p>
        <div className="h-1.5 rounded-full bg-[hsl(var(--bg-surface-raised))] overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <UpgradeButton variant="link" source="banner" className="mt-0.5">
        Upgrade to Pro →
      </UpgradeButton>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
