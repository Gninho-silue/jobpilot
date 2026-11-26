'use client'

import { UpgradeButton } from '@/components/upgrade-button'

export interface PlanUsage {
  plan: 'FREE' | 'PRO'
  used: number
  limit: number
}

/**
 * The plan and its usage. On the free plan it holds the only "Upgrade" call of
 * the app shell (sidebar on desktop, "More" on mobile).
 */
export function PlanMeter({ plan, used, limit }: PlanUsage) {
  if (plan === 'PRO') {
    return (
      <p className="px-1 text-sm text-[hsl(var(--text-secondary))]">
        <span className="font-semibold text-[hsl(var(--text-primary))]">Pro plan</span>, unlimited
      </p>
    )
  }
  const pct = Math.min((used / limit) * 100, 100)
  return (
    <div className="grid gap-2 rounded-xl border border-[hsl(var(--border-default))] p-3 text-sm text-[hsl(var(--text-secondary))]">
      <p>
        <span className="font-semibold text-[hsl(var(--text-primary))]">Free plan</span>: <span className="num">{used}</span> of{' '}
        <span className="num">{limit}</span> applications created this month
      </p>
      <div
        className="h-1 overflow-hidden rounded-full bg-[hsl(var(--bg-surface-raised))]"
        role="progressbar"
        aria-label="Applications created this month"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div className="h-full bg-[hsl(var(--text-secondary))]" style={{ width: `${pct}%` }} />
      </div>
      <UpgradeButton variant="link" source="plan-meter" className="justify-self-start">
        Upgrade to Pro
      </UpgradeButton>
    </div>
  )
}
