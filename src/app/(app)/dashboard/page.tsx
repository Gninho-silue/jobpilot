import type { Metadata } from 'next'
import { Suspense } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowDown, ArrowUp, CalendarDays, Flag, Layers, Plus, Reply } from 'lucide-react'
import { getActor } from '@/lib/actor'
import { loadDashboard } from '@/lib/dashboard'
import type { AppStatus, StatCard, Trend } from '@/lib/dashboard-stats'
import type { ToCheckItem } from '@/lib/fact-check/summary'
import { UpgradeSuccessToast } from '@/components/dashboard/upgrade-success-toast'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const CARD: Record<StatCard['label'], { label: string; Icon: typeof Layers }> = {
  'TOTAL APPLICATIONS': { label: 'Applications', Icon: Layers },
  'RESPONSE RATE': { label: 'Response rate', Icon: Reply },
  INTERVIEWS: { label: 'Interviews', Icon: CalendarDays },
  OFFERS: { label: 'Offers', Icon: Flag },
}

// The arrow and the colour follow the sign of the change; nothing when nothing moved.
const TREND: Record<Trend, { Arrow: typeof ArrowUp | null; color: string; label: string }> = {
  up: { Arrow: ArrowUp, color: 'text-[hsl(var(--state-success))]', label: 'up' },
  down: { Arrow: ArrowDown, color: 'text-[hsl(var(--state-error))]', label: 'down' },
  none: { Arrow: null, color: 'text-[hsl(var(--text-muted))]', label: '' },
}

const STAGES: Array<{ status: AppStatus; label: string; short: string }> = [
  { status: 'APPLIED', label: 'Applied', short: 'Applied' },
  { status: 'PHONE', label: 'Phone screen', short: 'Phone' },
  { status: 'TECHNICAL', label: 'Technical', short: 'Technical' },
  { status: 'OFFER', label: 'Offer', short: 'Offer' },
  { status: 'REJECTED', label: 'Rejected', short: 'Rejected' },
]
const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.status, s.label])) as Record<AppStatus, string>

const TONE_DOT: Record<ToCheckItem['tone'], string> = {
  claim: 'bg-[hsl(var(--state-error))]',
  phrase: 'bg-[hsl(var(--state-warning))]',
  offer: 'bg-[hsl(var(--state-success))]',
}

function daysAgo(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function StatusLabel({ status }: { status: AppStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--text-secondary))]">
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'OFFER' ? 'bg-[hsl(var(--state-success))]' : status === 'REJECTED' ? 'bg-[hsl(var(--text-muted))]' : 'bg-[hsl(var(--text-secondary))]'
        )}
      />
      {STAGE_LABEL[status]}
    </span>
  )
}

export default async function DashboardPage() {
  const actor = await getActor()
  if (!actor) redirect('/sign-in')

  const clerkUser = actor.kind === 'user' ? await currentUser() : null
  const now = new Date()
  const { stats, cards, greeting, toCheck, recent } = await loadDashboard(actor, now, clerkUser?.firstName ?? null)

  return (
    <div className="flex flex-col gap-7">
      <Suspense>
        <UpgradeSuccessToast />
      </Suspense>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[hsl(var(--text-primary))]">Dashboard</h1>
          <p className="mt-1 text-[hsl(var(--text-secondary))]">{greeting}</p>
        </div>
        {/* On mobile the same action is in the top bar. */}
        <Link
          href="/applications?new=1"
          className="hidden h-[38px] items-center gap-2 rounded-lg bg-[hsl(var(--accent-primary))] px-3.5 text-sm font-semibold text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))] md:flex"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New application
        </Link>
      </div>

      <section aria-label="Your search in figures" className="grid grid-cols-2 overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] lg:grid-cols-4">
        {cards.map(({ label, value, subtext, trend }, index) => {
          const { label: name, Icon } = CARD[label]
          const { Arrow, color, label: trendLabel } = TREND[trend]
          return (
            <div
              key={label}
              className={cn(
                'grid content-start gap-1 p-4 lg:px-5',
                index % 2 === 1 && 'border-l border-[hsl(var(--border-default))]',
                index >= 2 && 'border-t border-[hsl(var(--border-default))] lg:border-t-0',
                index === 2 && 'lg:border-l'
              )}
            >
              <span className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))]">
                <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--text-muted))]" aria-hidden />
                {name}
              </span>
              <span className="num text-[28px] font-medium leading-tight text-[hsl(var(--text-primary))]">{value}</span>
              <span className={cn('flex items-center gap-1 text-sm', color)}>
                {Arrow ? <Arrow className="h-3.5 w-3.5 shrink-0" aria-label={trendLabel} /> : null}
                {subtext}
              </span>
            </div>
          )
        })}
      </section>

      <section aria-labelledby="pipeline-title" className="grid gap-2.5">
        <h2 id="pipeline-title" className="text-base font-semibold text-[hsl(var(--text-primary))]">Pipeline</h2>
        <ol className="grid grid-cols-5 gap-[3px]">
          {STAGES.map(({ status, label, short }, index) => (
            <li
              key={status}
              className={cn(
                'grid gap-0.5 border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-1.5 py-2 sm:px-3 sm:py-2.5',
                index === 0 && 'rounded-l-xl',
                index === STAGES.length - 1 && 'rounded-r-xl',
                status === 'OFFER' && 'shadow-[inset_0_3px_0_hsl(var(--state-success))]'
              )}
            >
              <span className={cn('num text-xl', status === 'REJECTED' ? 'text-[hsl(var(--text-muted))]' : 'text-[hsl(var(--text-primary))]')}>
                {stats.byStatus[status]}
              </span>
              <span className={cn('truncate text-xs sm:text-sm', status === 'REJECTED' ? 'text-[hsl(var(--text-muted))]' : 'text-[hsl(var(--text-secondary))]')}>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="to-check-title" className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
          <h2 id="to-check-title" className="border-b border-[hsl(var(--border-default))] px-4 py-3.5 text-base font-semibold text-[hsl(var(--text-primary))] md:px-5">
            To check
          </h2>
          {toCheck.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[hsl(var(--text-secondary))] md:px-5">
              Nothing to check: no claim outside your CV in your adapted CVs and letters.
            </p>
          ) : (
            <ul className="py-1.5">
              {toCheck.map(item => (
                <li key={`${item.applicationId}-${item.text}`}>
                  <Link
                    href={`/applications?edit=${item.applicationId}`}
                    className="grid grid-cols-[8px_1fr] gap-3 px-4 py-2.5 hover:bg-[hsl(var(--bg-surface-raised))] md:px-5"
                  >
                    <span aria-hidden className={cn('mt-2 h-2 w-2 rounded-full', TONE_DOT[item.tone])} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-[hsl(var(--text-primary))]">{item.company}</span>
                      <span className="block text-sm text-[hsl(var(--text-secondary))] [overflow-wrap:anywhere]">
                        {item.text}
                        {item.example ? (
                          <>
                            {': '}
                            <span className="num rounded bg-[hsl(var(--bg-surface-raised))] px-1.5 py-px text-xs text-[hsl(var(--text-primary))]">
                              {item.example}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-title" className="min-w-0 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
          <div className="flex items-baseline justify-between border-b border-[hsl(var(--border-default))] px-4 py-3.5 md:px-5">
            <h2 id="recent-title" className="text-base font-semibold text-[hsl(var(--text-primary))]">Recent applications</h2>
            <Link href="/applications" className="text-sm text-[hsl(var(--text-secondary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))]">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="grid justify-items-start gap-3 px-4 py-6 md:px-5">
              <p className="text-sm text-[hsl(var(--text-secondary))]">No applications yet. Paste a job offer to start.</p>
              <Link
                href="/applications?new=1"
                className="flex h-9 items-center gap-2 rounded-lg bg-[hsl(var(--accent-primary))] px-3 text-sm font-semibold text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add your first application
              </Link>
            </div>
          ) : (
            <ul>
              {recent.map(app => (
                <li key={app.id} className="border-b border-[hsl(var(--border-default))] last:border-b-0">
                  <Link
                    href={`/applications?edit=${app.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-[hsl(var(--bg-surface-raised))] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_8rem_6.5rem] md:px-5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-[hsl(var(--text-primary))]">{app.company}</span>
                      <span className="num shrink-0 rounded border border-[hsl(var(--border-default))] px-1 text-[11px] text-[hsl(var(--text-secondary))]">
                        {app.language}
                      </span>
                    </span>
                    <span className="hidden truncate text-sm text-[hsl(var(--text-secondary))] md:block">{app.role}</span>
                    <span className="col-start-1 md:col-start-auto">
                      <StatusLabel status={app.status} />
                    </span>
                    <span className="col-start-2 row-start-1 whitespace-nowrap text-right text-sm text-[hsl(var(--text-muted))] md:col-start-auto md:row-start-auto md:text-left">
                      {daysAgo(app.createdAt, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
