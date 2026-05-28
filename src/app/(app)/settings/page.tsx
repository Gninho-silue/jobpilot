import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Zap, Crown, CreditCard } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { UpgradeButton } from '@/components/upgrade-button'
import { ManageSubscriptionButton } from '@/components/manage-subscription-button'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, email: true, stripeCustomerId: true },
  })

  const plan = dbUser?.plan ?? 'FREE'
  const isPro = plan === 'PRO'

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Settings</h1>
        <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
          Manage your account and subscription.
        </p>
      </div>

      {/* Plan card */}
      <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
          <h2 className="text-sm font-semibold text-[hsl(var(--text-primary))]">Subscription</h2>
        </div>

        <div className="px-5 py-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                isPro ? 'bg-amber-500/20' : 'bg-[hsl(var(--bg-surface-raised))]'
              }`}
            >
              {isPro ? (
                <Crown className="h-5 w-5 text-amber-500" />
              ) : (
                <Zap className="h-5 w-5 text-[hsl(var(--text-muted))]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                {isPro ? 'Pro Plan' : 'Free Plan'}
              </p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                {isPro
                  ? 'Unlimited applications, CV adaptations, and cover letters.'
                  : '5 applications · 3 CV adaptations · 3 cover letters per month'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isPro ? (
              <ManageSubscriptionButton />
            ) : (
              <UpgradeButton source="settings" className="w-auto px-4">
                <Zap className="h-4 w-4" />
                Upgrade to Pro
              </UpgradeButton>
            )}
          </div>
        </div>

        {isPro && (
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--state-success))] bg-[hsl(var(--state-success-light))] rounded-lg px-3 py-2">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              Active subscription — managed via Stripe Customer Portal
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
