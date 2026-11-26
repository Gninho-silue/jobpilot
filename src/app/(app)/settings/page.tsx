import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CreditCard, Crown, Zap } from 'lucide-react'
import { getActor } from '@/lib/actor'
import { billing } from '@/lib/billing'
import { FREE_TIER_LIMITS } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { ManageSubscriptionButton } from '@/components/manage-subscription-button'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const actor = await getActor()
  if (!actor) redirect('/sign-in')

  const dbUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { plan: true },
  })
  const isPro = dbUser?.plan === 'PRO'
  // Said only when it is true: with live keys this line disappears.
  const testMode = billing.isTestMode()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[hsl(var(--text-primary))]">Settings</h1>
        <p className="mt-1 text-[hsl(var(--text-secondary))]">Your plan and subscription.</p>
      </div>

      <section aria-labelledby="plan-title" className="overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
        <h2 id="plan-title" className="border-b border-[hsl(var(--border-default))] px-5 py-3.5 text-base font-semibold text-[hsl(var(--text-primary))]">
          Plan
        </h2>

        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--bg-surface-raised))]">
              {isPro ? (
                <Crown className="h-5 w-5 text-[hsl(var(--text-primary))]" aria-hidden />
              ) : (
                <Zap className="h-5 w-5 text-[hsl(var(--text-muted))]" aria-hidden />
              )}
            </div>
            <div className="grid gap-1">
              <p className="font-semibold text-[hsl(var(--text-primary))]">{isPro ? 'Pro plan' : 'Free plan'}</p>
              {isPro ? (
                <p className="text-sm text-[hsl(var(--text-secondary))]">Unlimited applications, CV adaptations and cover letters.</p>
              ) : (
                <>
                  <p className="text-sm text-[hsl(var(--text-secondary))]">
                    Each month: <span className="num">{FREE_TIER_LIMITS.applications}</span> applications,{' '}
                    <span className="num">{FREE_TIER_LIMITS.cvAdaptations}</span> CV adaptations,{' '}
                    <span className="num">{FREE_TIER_LIMITS.coverLetters}</span> cover letters. Deleting an application does not give a credit back.
                  </p>
                  {/* The upgrade call itself stays in one place: the plan meter (sidebar, or "More" on mobile). */}
                  <p className="text-sm text-[hsl(var(--text-secondary))]">To upgrade, use &ldquo;Upgrade to Pro&rdquo; under the plan meter.</p>
                </>
              )}
            </div>
          </div>
          {isPro ? (
            <div className="shrink-0">
              <ManageSubscriptionButton />
            </div>
          ) : null}
        </div>

        {isPro ? (
          <div className="px-5 pb-5">
            <p className="flex items-center gap-2 rounded-lg bg-[hsl(var(--state-success-light))] px-3 py-2 text-sm text-[hsl(var(--state-success))]">
              <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
              Active subscription, managed in the Stripe customer portal.
            </p>
          </div>
        ) : null}

        {testMode ? (
          <p className="border-t border-[hsl(var(--border-default))] px-5 py-3 text-sm text-[hsl(var(--text-secondary))]">
            Payments run in Stripe test mode: no real charge is possible (test card <span className="num">4242 4242 4242 4242</span>).
          </p>
        ) : null}
      </section>
    </div>
  )
}
