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
  language: 'FR' | 'EN'
  interviewQs: InterviewQuestion[]
}


export default function InterviewPrepPage() {
  const [apps, setApps] = useState<AppWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<AppWithQuestions | null>(null)
  const [feedbackAvailable, setFeedbackAvailable] = useState(false)

  useEffect(() => {
    fetch('/api/applications')
      .then(r => r.json() as Promise<{ data?: { id: string; company: string; role: string; language: string; interviewQs: unknown }[] }>)
      .then(j => {
        const filtered = (j.data ?? [])
          .filter(a => Array.isArray(a.interviewQs) && (a.interviewQs as InterviewQuestion[]).length > 0)
          .map(a => ({
            id: a.id,
            company: a.company,
            role: a.role,
            language: (a.language as 'FR' | 'EN') ?? 'EN',
            interviewQs: a.interviewQs as InterviewQuestion[],
          }))
        setApps(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/user/plan')
      .then(r => r.json() as Promise<{ data?: { plan: string; interviewFeedback?: boolean } }>)
      .then(j => { if (j.data?.interviewFeedback) setFeedbackAvailable(true) })
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[hsl(var(--text-primary))]">Interview prep</h1>
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
            className="inline-flex items-center justify-center rounded-lg bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))] font-medium h-8 px-4 text-sm"
          >
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Go to Applications
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {apps.map(app => {
            const initial = app.company.charAt(0).toUpperCase()
            return (
              <div
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] rounded-xl p-4 hover:border-[hsl(var(--border-strong))] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-primary))] text-sm font-semibold"
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
                  <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-secondary))] font-medium">
                    {app.interviewQs.length} questions ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setActive(app)}
                    className="inline-flex items-center justify-center rounded-lg border border-[hsl(var(--border-strong))] text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-surface-raised))] font-medium h-8 px-4 text-sm transition-colors"
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
          language={active.language}
          feedbackAvailable={feedbackAvailable}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
