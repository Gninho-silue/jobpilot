import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  Briefcase,
  RefreshCw,
  Calendar,
  Star,
  Plus,
  ArrowUpRight,
  FileText,
  Edit,
  MoreHorizontal,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { FREE_TIER_LIMITS } from '@/lib/config'
import { FreeTierBanner } from '@/components/dashboard/free-tier-banner'
import { UpgradeSuccessToast } from '@/components/dashboard/upgrade-success-toast'

type AppStatus = 'APPLIED' | 'PHONE' | 'TECHNICAL' | 'OFFER' | 'REJECTED'

const STATUS_CONFIG: Record<AppStatus, { label: string; bgVar: string; textVar: string }> = {
  APPLIED:   { label: 'Applied',      bgVar: '--kanban-applied-bg',   textVar: '--kanban-applied-text' },
  PHONE:     { label: 'Phone Screen', bgVar: '--kanban-phone-bg',     textVar: '--kanban-phone-text' },
  TECHNICAL: { label: 'Technical',    bgVar: '--kanban-technical-bg', textVar: '--kanban-technical-text' },
  OFFER:     { label: 'Offer',        bgVar: '--kanban-offer-bg',     textVar: '--kanban-offer-text' },
  REJECTED:  { label: 'Rejected',     bgVar: '--kanban-rejected-bg',  textVar: '--kanban-rejected-text' },
}

const COMPANY_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
]

function getCompanyColor(company: string): string {
  let hash = 0
  for (let i = 0; i < company.length; i++) {
    hash = (hash * 31 + company.charCodeAt(i)) & 0xffffffff
  }
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length]!
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  const firstName = clerkUser?.firstName ?? 'there'

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [user, allApps, usageCounter] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, company: true, role: true, status: true, language: true, createdAt: true },
    }),
    prisma.usageCounter.findUnique({ where: { userId } }),
  ])

  const plan = user?.plan ?? 'FREE'
  const totalApplications = allApps.length

  const byStatus: Record<AppStatus, number> = { APPLIED: 0, PHONE: 0, TECHNICAL: 0, OFFER: 0, REJECTED: 0 }
  for (const app of allApps) {
    byStatus[app.status as AppStatus]++
  }

  const thisWeekApps = allApps.filter(a => a.createdAt >= sevenDaysAgo).length
  const thisWeekOffers = allApps.filter(a => a.status === 'OFFER' && a.createdAt >= sevenDaysAgo).length

  const movedPast = byStatus.PHONE + byStatus.TECHNICAL + byStatus.OFFER + byStatus.REJECTED
  const responseRate = totalApplications > 0 ? Math.round((movedPast / totalApplications) * 100) : 0

  const lastMonthApps = allApps.filter(a => a.createdAt >= firstOfLastMonth && a.createdAt < firstOfMonth)
  const lastMonthMoved = lastMonthApps.filter(a =>
    a.status === 'PHONE' || a.status === 'TECHNICAL' || a.status === 'OFFER' || a.status === 'REJECTED'
  ).length
  const lastMonthRate = lastMonthApps.length > 0
    ? Math.round((lastMonthMoved / lastMonthApps.length) * 100)
    : 0
  const responseRateDelta = responseRate - lastMonthRate

  const recentApps = allApps.slice(0, 5)
  const usedThisMonth = usageCounter?.applications ?? 0
  const nextResetDate = firstOfNextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const statCards = [
    {
      label: 'TOTAL APPLICATIONS',
      value: String(totalApplications),
      subtext: `+${thisWeekApps} this week`,
      Icon: Briefcase,
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-400',
    },
    {
      label: 'RESPONSE RATE',
      value: `${responseRate}%`,
      subtext: `${responseRateDelta >= 0 ? '+' : ''}${responseRateDelta}% vs last month`,
      Icon: RefreshCw,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'INTERVIEWS',
      value: String(byStatus.TECHNICAL),
      subtext: `${byStatus.TECHNICAL} scheduled`,
      Icon: Calendar,
      iconBg: 'bg-sky-500/20',
      iconColor: 'text-sky-400',
    },
    {
      label: 'OFFERS',
      value: String(byStatus.OFFER),
      subtext: `+${thisWeekOffers} this week`,
      Icon: Star,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <UpgradeSuccessToast />
      </Suspense>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
            Welcome back, {firstName}. Here&apos;s where your search stands.
          </p>
        </div>
        <Link
          href="/applications"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Application
        </Link>
      </div>

      {/* Free Tier Banner */}
      {plan === 'FREE' && (
        <FreeTierBanner
          used={usedThisMonth}
          limit={FREE_TIER_LIMITS.applications}
          nextResetDate={nextResetDate}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, subtext, Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] rounded-xl p-4 relative"
          >
            <div className="absolute top-4 right-4">
              <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2 pr-12">
              {label}
            </p>
            <p className="text-3xl font-bold text-[hsl(var(--text-primary))] mb-1">{value}</p>
            <p className="text-xs text-[hsl(var(--state-success))] flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              {subtext}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] rounded-xl overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-[hsl(var(--border-default))]">
          <div>
            <h2 className="text-sm font-semibold text-[hsl(var(--text-primary))]">Recent Applications</h2>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Your last 5 applications.</p>
          </div>
          <Link
            href="/applications"
            className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium"
          >
            View all →
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-10 w-10 text-[hsl(var(--text-muted))]" />
            <p className="text-sm text-[hsl(var(--text-secondary))]">No applications yet</p>
            <Link
              href="/applications"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium text-sm transition-colors mt-1"
            >
              <Plus className="h-4 w-4" />
              Add your first application
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border-default))]">
                  {(['COMPANY', 'ROLE', 'STATUS', 'APPLIED', 'ACTIONS'] as const).map(col => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentApps.map(app => {
                  const statusCfg = STATUS_CONFIG[app.status as AppStatus]!
                  const colorClass = getCompanyColor(app.company)
                  return (
                    <tr
                      key={app.id}
                      className="border-b border-[hsl(var(--border-default))] last:border-0 hover:bg-[hsl(var(--bg-surface-raised))] transition-colors"
                    >
                      {/* Company */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg ${colorClass} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
                          >
                            {app.company.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--text-primary))] leading-tight">
                              {app.company}
                            </p>
                            <span className="text-[10px] border border-[hsl(var(--border-strong))] text-[hsl(var(--text-muted))] rounded px-1 py-0.5 font-medium">
                              {app.language === 'EN' ? '🇬🇧 EN' : '🇫🇷 FR'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3">
                        <p className="text-sm text-[hsl(var(--text-secondary))]">{app.role}</p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap"
                          style={{
                            background: `hsl(var(${statusCfg.bgVar}))`,
                            color: `hsl(var(${statusCfg.textVar}))`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: `hsl(var(${statusCfg.textVar}))` }}
                          />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Applied */}
                      <td className="px-5 py-3">
                        <p className="text-sm text-[hsl(var(--text-muted))]">{timeAgo(app.createdAt)}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            title="View CV"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            href="/applications"
                            title="Edit"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            title="More options"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
