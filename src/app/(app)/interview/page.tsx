'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, MessageSquare } from 'lucide-react'
import { MockInterviewModal } from '@/components/applications/mock-interview-modal'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'

interface AppWithQuestions {
  id: string
  company: string
  role: string
  interviewQs: InterviewQuestion[]
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

export default function InterviewPrepPage() {
  const [apps, setApps] = useState<AppWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<AppWithQuestions | null>(null)

  useEffect(() => {
    fetch('/api/applications')
      .then(r => r.json() as Promise<{ data?: { id: string; company: string; role: string; interviewQs: unknown }[] }>)
      .then(j => {
        const filtered = (j.data ?? [])
          .filter(a => Array.isArray(a.interviewQs) && (a.interviewQs as InterviewQuestion[]).length > 0)
          .map(a => ({
            id: a.id,
            company: a.company,
            role: a.role,
            interviewQs: a.interviewQs as InterviewQuestion[],
          }))
        setApps(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Interview Prep</h1>
        <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
          Select an application to prepare for its interview.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[hsl(var(--text-muted))]">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-14 w-14 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-[hsl(var(--text-muted))]" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-[hsl(var(--text-primary))]">No interview questions yet</p>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Generate interview questions from an application first.
            </p>
          </div>
          <Link
            href="/applications"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
          >
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Go to Applications
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {apps.map(app => {
            const colorClass = getCompanyColor(app.company)
            const initial = app.company.charAt(0).toUpperCase()
            return (
              <div
                key={app.id}
                className="flex items-center justify-between gap-4 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] rounded-xl p-4 hover:border-[hsl(var(--border-strong))] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`${colorClass} h-10 w-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold`}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">
                      {app.company}
                    </p>
                    <p className="text-xs text-[hsl(var(--text-secondary))] truncate">{app.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                    {app.interviewQs.length} questions ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setActive(app)}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm transition-colors"
                  >
                    Practice
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {active && (
        <MockInterviewModal
          company={active.company}
          questions={active.interviewQs}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
