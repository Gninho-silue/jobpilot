'use client'

import { useEffect, useState } from 'react'
import { Check, Download, ExternalLink, FileText, Loader2, MessageSquare, MoreHorizontal, RefreshCw, Sparkles, X } from 'lucide-react'
import { MockInterviewModal } from '@/components/applications/mock-interview-modal'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'
import {
  Sheet,
  SheetClose,
  SheetContent,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UpgradeButton } from '@/components/upgrade-button'
import { trackEvent } from '@/lib/analytics'
import Link from 'next/link'

type ApplicationStatus = 'APPLIED' | 'PHONE' | 'TECHNICAL' | 'OFFER' | 'REJECTED'
type Language = 'FR' | 'EN'

export interface Application {
  id: string
  company: string
  role: string
  status: ApplicationStatus
  language: Language
  salary: string | null
  link: string | null
  notes: string | null
  offerText: string
  adaptedCvText: string | null
  coverLetter: string | null
  interviewQs: InterviewQuestion[] | null
  createdAt: string
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  APPLIED:   { label: 'Applied',      badgeClass: 'bg-[hsl(var(--kanban-applied-bg))] text-[hsl(var(--kanban-applied-text))]',     dotClass: 'bg-[hsl(var(--kanban-applied-text))]' },
  PHONE:     { label: 'Phone Screen', badgeClass: 'bg-[hsl(var(--kanban-phone-bg))] text-[hsl(var(--kanban-phone-text))]',         dotClass: 'bg-[hsl(var(--kanban-phone-text))]' },
  TECHNICAL: { label: 'Technical',    badgeClass: 'bg-[hsl(var(--kanban-technical-bg))] text-[hsl(var(--kanban-technical-text))]', dotClass: 'bg-[hsl(var(--kanban-technical-text))]' },
  OFFER:     { label: 'Offer',        badgeClass: 'bg-[hsl(var(--kanban-offer-bg))] text-[hsl(var(--kanban-offer-text))]',         dotClass: 'bg-[hsl(var(--kanban-offer-text))]' },
  REJECTED:  { label: 'Rejected',     badgeClass: 'bg-[hsl(var(--kanban-rejected-bg))] text-[hsl(var(--kanban-rejected-text))]',   dotClass: 'bg-[hsl(var(--kanban-rejected-text))]' },
}

const STATUSES = Object.keys(STATUS_CONFIG) as ApplicationStatus[]

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const LANG_LABEL: Record<Language, string> = {
  EN: '🇬🇧 English',
  FR: '🇫🇷 Français',
}

function StatusBadge({
  status,
  onChange,
}: {
  status: ApplicationStatus
  onChange: (s: ApplicationStatus) => void
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${cfg.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
        {cfg.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {STATUSES.map(s => {
          const c = STATUS_CONFIG[s]
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onChange(s)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${c.dotClass}`} />
              {c.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Resume Tab ────────────────────────────────────────────────────────────────

interface ResumeTabProps {
  applicationId: string
  hasCv: boolean
  initialAdaptedCvText: string | null
  onAdapted: (text: string) => void
}

function ResumeTab({ applicationId, hasCv, initialAdaptedCvText, onAdapted }: ResumeTabProps) {
  const [adaptedCvText, setAdaptedCvText] = useState(initialAdaptedCvText)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    setAdaptedCvText(initialAdaptedCvText)
    setError('')
    setShowUpgrade(false)
  }, [applicationId, initialAdaptedCvText])

  async function generate() {
    setError('')
    setShowUpgrade(false)
    setGenerating(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/adapt-resume`, {
        method: 'POST',
      })
      const json = await res.json() as { data?: { adaptedCvText: string }; error?: string; upgrade?: boolean }

      if (res.status === 403 && json.upgrade) {
        setShowUpgrade(true)
        return
      }
      if (res.status === 400 && json.error === 'No CV uploaded yet') {
        setError('no-cv')
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Generation failed. Please try again.')
        return
      }

      const text = json.data?.adaptedCvText ?? ''
      setAdaptedCvText(text)
      onAdapted(text)
      trackEvent.cvAdapted()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPdf() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/adapted-cv-pdf`)
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        setError(j.error ?? 'Failed to generate PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'adapted-cv.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  // No CV uploaded
  if (!hasCv && !adaptedCvText) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
          <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Upload your CV first</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">JobPilot needs your CV to adapt it for this role.</p>
        </div>
        <Link
          href="/my-cv"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
        >
          Go to My CV →
        </Link>
      </div>
    )
  }

  // Upgrade required
  if (showUpgrade) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Free tier limit reached</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">Upgrade to Pro for unlimited CV adaptations.</p>
        </div>
        <UpgradeButton source="cv-adaptation">Upgrade to Pro — $9/mo</UpgradeButton>
        <button
          type="button"
          onClick={() => setShowUpgrade(false)}
          className="text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))]"
        >
          Go back
        </button>
      </div>
    )
  }

  // Error: no CV (server-side check failed)
  if (error === 'no-cv') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
          <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
        </div>
        <p className="text-sm text-[hsl(var(--text-muted))]">Upload your CV first</p>
        <Link
          href="/my-cv"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
        >
          Go to My CV →
        </Link>
      </div>
    )
  }

  // Generating
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        <p className="text-sm text-[hsl(var(--text-muted))]">Adapting your CV…</p>
      </div>
    )
  }

  // Has adapted CV
  if (adaptedCvText) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--state-success-light))] flex items-center justify-center">
          <Check className="h-5 w-5 text-[hsl(var(--state-success))]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">CV adapted for this offer</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">Ready to download as PDF</p>
        </div>
        {error && (
          <p className="text-sm text-[hsl(var(--state-error))] bg-[hsl(var(--state-error-light))] rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={downloadPdf}
            disabled={downloading}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
          >
            {downloading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating…</>
            ) : (
              <><Download className="h-3.5 w-3.5 mr-1.5" />Download PDF</>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={generate}
            className="rounded-lg border border-[hsl(var(--border-default))] h-8 px-4 text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        </div>
      </div>
    )
  }

  // Empty — CV uploaded but no adaptation yet
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
      <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
        <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-[hsl(var(--text-primary))]">No adapted CV yet</p>
        <p className="text-xs text-[hsl(var(--text-muted))]">Generate a version tailored to this specific role.</p>
      </div>
      {error && (
        <p className="text-sm text-[hsl(var(--state-error))] text-center">{error}</p>
      )}
      <Button
        onClick={generate}
        className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        Generate Adapted CV
      </Button>
    </div>
  )
}

// ── Cover Letter Tab ──────────────────────────────────────────────────────────

interface CoverLetterTabProps {
  applicationId: string
  hasCv: boolean
  initialCoverLetter: string | null
  onGenerated: (text: string) => void
}

function CoverLetterTab({ applicationId, hasCv, initialCoverLetter, onGenerated }: CoverLetterTabProps) {
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    setCoverLetter(initialCoverLetter)
    setError('')
    setShowUpgrade(false)
  }, [applicationId, initialCoverLetter])

  async function generate(skipConfirm = false) {
    if (coverLetter && !skipConfirm) {
      if (!window.confirm('Regenerate the cover letter? The current one will be replaced.')) return
    }
    setError('')
    setShowUpgrade(false)
    setGenerating(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/cover-letter`, {
        method: 'POST',
      })
      const json = await res.json() as { data?: { coverLetter: string }; error?: string; upgrade?: boolean }

      if (res.status === 403 && json.upgrade) {
        setShowUpgrade(true)
        return
      }
      if (res.status === 400 && json.error === 'No CV uploaded yet') {
        setError('no-cv')
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Generation failed. Please try again.')
        return
      }

      const text = json.data?.coverLetter ?? ''
      setCoverLetter(text)
      onGenerated(text)
      trackEvent.coverLetterGenerated()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPdf() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/cover-letter-pdf`)
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        setError(j.error ?? 'Failed to generate PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cover-letter.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  // No CV uploaded
  if (!hasCv && !coverLetter) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
          <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Upload your CV first</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">JobPilot needs your CV to write your cover letter.</p>
        </div>
        <Link
          href="/my-cv"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
        >
          Go to My CV →
        </Link>
      </div>
    )
  }

  // Upgrade required
  if (showUpgrade) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Free tier limit reached</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">Upgrade to Pro for unlimited cover letters.</p>
        </div>
        <UpgradeButton source="cover-letter">Upgrade to Pro — $9/mo</UpgradeButton>
        <button
          type="button"
          onClick={() => setShowUpgrade(false)}
          className="text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))]"
        >
          Go back
        </button>
      </div>
    )
  }

  // Error: no CV (server-side check failed)
  if (error === 'no-cv') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
          <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
        </div>
        <p className="text-sm text-[hsl(var(--text-muted))]">Upload your CV first</p>
        <Link
          href="/my-cv"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
        >
          Go to My CV →
        </Link>
      </div>
    )
  }

  // Generating
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        <p className="text-sm text-[hsl(var(--text-muted))]">Writing your cover letter…</p>
      </div>
    )
  }

  // Has cover letter
  if (coverLetter) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--state-success-light))] flex items-center justify-center">
          <Check className="h-5 w-5 text-[hsl(var(--state-success))]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Cover letter ready</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">Ready to download as PDF</p>
        </div>
        {error && (
          <p className="text-sm text-[hsl(var(--state-error))] bg-[hsl(var(--state-error-light))] rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={downloadPdf}
            disabled={downloading}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
          >
            {downloading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating…</>
            ) : (
              <><Download className="h-3.5 w-3.5 mr-1.5" />Download PDF</>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => generate(false)}
            className="rounded-lg border border-[hsl(var(--border-default))] h-8 px-4 text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        </div>
      </div>
    )
  }

  // Empty — CV uploaded but no cover letter yet
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
      <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
        <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-[hsl(var(--text-primary))]">No cover letter yet</p>
        <p className="text-xs text-[hsl(var(--text-muted))]">Generate a personalized cover letter for this role.</p>
      </div>
      {error && (
        <p className="text-sm text-[hsl(var(--state-error))] text-center">{error}</p>
      )}
      <Button
        onClick={() => generate(true)}
        className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        Generate Cover Letter
      </Button>
    </div>
  )
}

// ── Interview Tab ─────────────────────────────────────────────────────────────

interface InterviewTabProps {
  applicationId: string
  company: string
  hasCv: boolean
  language: 'FR' | 'EN'
  isPro: boolean
  initialQuestions: InterviewQuestion[] | null
  onGenerated: (questions: InterviewQuestion[]) => void
}

function InterviewTab({ applicationId, company, hasCv, language, isPro, initialQuestions, onGenerated }: InterviewTabProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(initialQuestions)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [mockOpen, setMockOpen] = useState(false)

  useEffect(() => {
    setQuestions(initialQuestions)
    setError('')
  }, [applicationId, initialQuestions])

  async function generate(skipConfirm = false) {
    if (questions?.length && !skipConfirm) {
      if (!window.confirm('Regenerate interview questions? The current ones will be replaced.')) return
    }
    setError('')
    setGenerating(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview`, { method: 'POST' })
      const json = await res.json() as { data?: { questions: InterviewQuestion[] }; error?: string }

      if (res.status === 400 && json.error === 'No CV uploaded') {
        setError('no-cv')
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Generation failed. Please try again.')
        return
      }

      const qs = json.data?.questions ?? []
      setQuestions(qs)
      onGenerated(qs)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (!hasCv && !questions?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
          <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Upload your CV first</p>
          <p className="text-xs text-[hsl(var(--text-muted))]">JobPilot needs your CV to generate interview questions.</p>
        </div>
        <a
          href="/my-cv"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
        >
          Go to My CV →
        </a>
      </div>
    )
  }

  if (error === 'no-cv') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
          <FileText className="h-5 w-5 text-[hsl(var(--text-muted))]" />
        </div>
        <p className="text-sm text-[hsl(var(--text-muted))]">Upload your CV first</p>
        <a
          href="/my-cv"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
        >
          Go to My CV →
        </a>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        <p className="text-sm text-[hsl(var(--text-muted))]">Preparing your interview…</p>
      </div>
    )
  }

  if (questions?.length) {
    const technical = questions.filter(q => q.type === 'technical')
    const behavioral = questions.filter(q => q.type === 'behavioral')

    return (
      <div className="p-5 space-y-6">
        {error && (
          <p className="text-sm text-[hsl(var(--state-error))] bg-[hsl(var(--state-error-light))] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {technical.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide">
              Technical Questions ({technical.length})
            </p>
            {technical.map(q => (
              <div
                key={q.id}
                className="rounded-xl border border-[hsl(var(--border-default))] border-l-2 border-l-sky-500 p-4 space-y-2 bg-[hsl(var(--bg-surface-raised))]"
              >
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                  Technical
                </span>
                <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{q.question}</p>
                <p className="text-xs text-[hsl(var(--text-secondary))] italic">{q.hint}</p>
              </div>
            ))}
          </div>
        )}

        {behavioral.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide">
              Behavioral Questions ({behavioral.length})
            </p>
            {behavioral.map(q => (
              <div
                key={q.id}
                className="rounded-xl border border-[hsl(var(--border-default))] border-l-2 border-l-amber-500 p-4 space-y-2 bg-[hsl(var(--bg-surface-raised))]"
              >
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                  Behavioral
                </span>
                <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{q.question}</p>
                <p className="text-xs text-[hsl(var(--text-secondary))] italic">{q.hint}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => generate(false)}
            className="inline-flex items-center justify-center rounded-lg border border-[hsl(var(--border-default))] h-8 px-4 text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => setMockOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Mock Interview
          </button>
        </div>

        {mockOpen && (
          <MockInterviewModal
            company={company}
            questions={questions}
            language={language}
            isPro={isPro}
            onClose={() => setMockOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 px-5">
      <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
        <MessageSquare className="h-5 w-5 text-[hsl(var(--text-muted))]" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-[hsl(var(--text-primary))]">No interview questions yet</p>
        <p className="text-xs text-[hsl(var(--text-muted))]">Generate targeted questions based on the actual offer.</p>
      </div>
      {error && (
        <p className="text-sm text-[hsl(var(--state-error))] text-center">{error}</p>
      )}
      <button
        type="button"
        onClick={() => generate(true)}
        className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        Generate Questions
      </button>
    </div>
  )
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

interface EditApplicationSheetProps {
  application: Application | null
  open: boolean
  hasCv: boolean
  isPro: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onDeleted: () => void
  onCvAdapted: (id: string, text: string) => void
  onCoverLetterGenerated: (id: string, text: string) => void
  onInterviewQsGenerated: (id: string, questions: InterviewQuestion[]) => void
}

export function EditApplicationSheet({
  application,
  open,
  hasCv,
  isPro,
  onOpenChange,
  onUpdated,
  onDeleted,
  onCvAdapted,
  onCoverLetterGenerated,
  onInterviewQsGenerated,
}: EditApplicationSheetProps) {
  const [status, setStatus] = useState<ApplicationStatus>('APPLIED')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (application) {
      setStatus(application.status)
      setNotes(application.notes ?? '')
      setError('')
    }
  }, [application?.id])

  async function handleSave() {
    if (!application) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes || undefined }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
      onOpenChange(false)
      onUpdated()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!application) return
    if (!window.confirm(`Delete application for ${application.company}?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/applications/${application.id}`, { method: 'DELETE' })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to delete'); return }
      onOpenChange(false)
      onDeleted()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (!application) return null

  const colorClass = getCompanyColor(application.company)
  const initial = application.company.charAt(0).toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-120 sm:max-w-120 p-0 gap-0 flex flex-col bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border-default))] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[hsl(var(--border-default))] space-y-3">
          <div className="flex items-start gap-3">
            <div
              className={`${colorClass} h-10 w-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold`}
            >
              {initial}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[hsl(var(--text-primary))] font-semibold truncate leading-tight">
                {application.company}
              </p>
              <p className="text-sm text-[hsl(var(--text-secondary))] truncate">
                {application.role}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="More options"
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-[hsl(var(--state-error))] focus:text-[hsl(var(--state-error))] cursor-pointer"
                  >
                    {deleting ? 'Deleting…' : 'Delete application'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <SheetClose
                aria-label="Close"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
              >
                <X className="h-4 w-4" />
              </SheetClose>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={status} onChange={setStatus} />
            <span className="text-xs px-2 py-1 rounded-lg border border-[hsl(var(--border-strong))] text-[hsl(var(--text-muted))]">
              {application.language}
            </span>
            <span className="text-xs text-[hsl(var(--text-muted))]">
              Applied {timeAgo(application.createdAt)}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden min-h-0">
          <TabsList
            variant="line"
            className="shrink-0 px-5 pt-3 w-full justify-start rounded-none border-b border-[hsl(var(--border-default))] h-auto pb-0"
          >
            <TabsTrigger value="overview" className="pb-3">Overview</TabsTrigger>
            <TabsTrigger value="resume" className="pb-3">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter" className="pb-3">Cover Letter</TabsTrigger>
            <TabsTrigger value="interview" className="pb-3">Interview</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto min-h-0">
            <div className="p-5 space-y-5">
              <div className="space-y-0 divide-y divide-[hsl(var(--border-default))]">
                <InfoRow label="Status">
                  <StatusBadge status={status} onChange={setStatus} />
                </InfoRow>

                <InfoRow label="Date Applied">
                  <span className="text-sm text-[hsl(var(--text-primary))]">
                    {formatDate(application.createdAt)}
                  </span>
                </InfoRow>

                <InfoRow label="Language">
                  <span className="text-sm text-[hsl(var(--text-primary))]">
                    {LANG_LABEL[application.language]}
                  </span>
                </InfoRow>

                <InfoRow label="Salary">
                  {application.salary ? (
                    <span className="text-sm text-[hsl(var(--text-primary))]">{application.salary}</span>
                  ) : (
                    <span className="text-sm text-[hsl(var(--text-muted))]">—</span>
                  )}
                </InfoRow>

                <InfoRow label="Link">
                  {application.link ? (
                    <a
                      href={application.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400 transition-colors truncate max-w-65"
                    >
                      <span className="truncate">{application.link.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-sm text-[hsl(var(--text-muted))]">—</span>
                  )}
                </InfoRow>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide">
                  Notes
                </p>
                <Textarea
                  placeholder="Add notes about this application..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  className="resize-none field-sizing-fixed bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))]"
                />
              </div>

              {error && (
                <p className="text-sm text-[hsl(var(--state-error))] bg-[hsl(var(--state-error-light))] rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          {/* ── Resume ── */}
          <TabsContent value="resume" className="flex-1 overflow-y-auto min-h-0">
            <ResumeTab
              applicationId={application.id}
              hasCv={hasCv}
              initialAdaptedCvText={application.adaptedCvText}
              onAdapted={text => onCvAdapted(application.id, text)}
            />
          </TabsContent>

          {/* ── Cover Letter ── */}
          <TabsContent value="cover-letter" className="flex-1 overflow-y-auto min-h-0">
            <CoverLetterTab
              applicationId={application.id}
              hasCv={hasCv}
              initialCoverLetter={application.coverLetter}
              onGenerated={text => onCoverLetterGenerated(application.id, text)}
            />
          </TabsContent>

          {/* ── Interview ── */}
          <TabsContent value="interview" className="flex-1 overflow-y-auto min-h-0">
            <InterviewTab
              applicationId={application.id}
              company={application.company}
              hasCv={hasCv}
              language={application.language}
              isPro={isPro}
              initialQuestions={application.interviewQs}
              onGenerated={qs => onInterviewQsGenerated(application.id, qs)}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <span className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wide shrink-0 w-28">
        {label}
      </span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

