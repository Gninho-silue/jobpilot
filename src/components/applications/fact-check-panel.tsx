'use client'

import { AlertTriangle } from 'lucide-react'
import type { ReviewedIssue } from '@/lib/fact-check/fix-issue'

interface FactCheckPanelProps {
  issues: ReviewedIssue[]
  /** A fix or approval is being saved. */
  busy: boolean
  onFix: (issueId: string) => void
  onApproveTitle: (title: string) => void
}

const KIND_LABEL: Record<ReviewedIssue['kind'], string> = {
  title: 'Job title changed',
  technology: 'Not in this experience of your CV',
  number: 'Number not in your CV',
  company: 'Company not in your CV',
  date: 'Dates not in your CV',
  merged: 'Facts from another experience',
  claim: 'Statement about you not in your CV',
}

const SECONDARY_BUTTON =
  'h-7 px-2.5 rounded-lg border border-[hsl(var(--border-default))] bg-transparent text-xs font-medium text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] disabled:opacity-50'

/**
 * Claims of the adapted CV that the original CV does not support, shown before
 * export. Each one can be removed (or the title restored / kept) in one click.
 */
export function FactCheckPanel({ issues, busy, onFix, onApproveTitle }: FactCheckPanelProps) {
  if (issues.length === 0) return null

  return (
    <section className="w-full rounded-xl border border-[hsl(var(--state-warning))] bg-[hsl(var(--bg-surface))] p-4 space-y-3 text-left">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--state-warning))]" aria-hidden />
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">
            {issues.length} {issues.length === 1 ? 'claim' : 'claims'} not found in your CV
          </h3>
          <p className="text-xs text-[hsl(var(--text-muted))]">
            Check them before exporting: a recruiter may ask about anything on your CV.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {issues.map(issue => (
          <li key={issue.id} className="rounded-lg border border-[hsl(var(--border-default))] p-3 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-xs text-[hsl(var(--text-muted))]">
                {KIND_LABEL[issue.kind]}
                {issue.entry && issue.kind !== 'title' ? (
                  <>
                    {' · '}
                    <span className="text-[hsl(var(--text-secondary))]">{issue.entry}</span>
                  </>
                ) : null}
              </p>
              <p className="text-xs font-semibold text-[hsl(var(--state-warning))]">{issue.unsupported.join(', ')}</p>
            </div>
            <p className="text-xs text-[hsl(var(--text-secondary))] line-clamp-2">{issue.line.replace(/^[-•*]\s+/, '')}</p>

            {issue.kind === 'title' ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => onFix(issue.id)}>
                  Use “{issue.expected}”
                </button>
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  disabled={busy}
                  onClick={() => onApproveTitle(issue.unsupported[0]!)}
                >
                  Keep “{issue.unsupported[0]}”
                </button>
              </div>
            ) : issue.fixable ? (
              <button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => onFix(issue.id)}>
                Remove
              </button>
            ) : (
              <p className="text-xs text-[hsl(var(--text-muted))]">
                This one cannot be removed automatically: regenerate or edit the CV.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
