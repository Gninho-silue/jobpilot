'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Mail, MessageSquare, MoreHorizontal, Sparkles, X } from 'lucide-react'
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

function EmptyState({
  icon: Icon,
  label,
  buttonLabel,
  onAction,
}: {
  icon: React.ElementType
  label: string
  buttonLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
        <Icon className="h-5 w-5 text-[hsl(var(--text-muted))]" />
      </div>
      <p className="text-sm text-[hsl(var(--text-muted))]">{label}</p>
      <Button
        onClick={onAction}
        className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-4 text-sm"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        {buttonLabel}
      </Button>
    </div>
  )
}

interface EditApplicationSheetProps {
  application: Application | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onDeleted: () => void
}

export function EditApplicationSheet({
  application,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: EditApplicationSheetProps) {
  const [status, setStatus] = useState<ApplicationStatus>('APPLIED')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (application) {
      setStatus(application.status)
      setNotes(application.notes ?? '')
      setError('')
    }
  }, [application?.id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

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
            {/* Avatar */}
            <div
              className={`${colorClass} h-10 w-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold`}
            >
              {initial}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[hsl(var(--text-primary))] font-semibold truncate leading-tight">
                {application.company}
              </p>
              <p className="text-sm text-[hsl(var(--text-secondary))] truncate">
                {application.role}
              </p>
            </div>

            {/* Actions */}
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

          {/* Status + lang + date row */}
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
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
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
          <TabsContent value="overview" className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Info rows */}
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

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide">
                  Notes
                </p>
                <Textarea
                  placeholder="Add notes about this application..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  className="resize-none bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500"
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
          <TabsContent value="resume" className="flex-1 overflow-y-auto">
            <EmptyState
              icon={FileText}
              label="No adapted CV yet"
              buttonLabel="Generate Adapted CV"
              onAction={() => showToast('CV adaptation coming soon')}
            />
            {toast && <ToastBanner message={toast} />}
          </TabsContent>

          {/* ── Cover Letter ── */}
          <TabsContent value="cover-letter" className="flex-1 overflow-y-auto">
            <EmptyState
              icon={Mail}
              label="No cover letter yet"
              buttonLabel="Generate Cover Letter"
              onAction={() => showToast('Cover letter generation coming soon')}
            />
            {toast && <ToastBanner message={toast} />}
          </TabsContent>

          {/* ── Interview ── */}
          <TabsContent value="interview" className="flex-1 overflow-y-auto">
            <EmptyState
              icon={MessageSquare}
              label="No interview questions yet"
              buttonLabel="Generate Questions"
              onAction={() => showToast('Interview prep coming soon')}
            />
            {toast && <ToastBanner message={toast} />}
          </TabsContent>
        </Tabs>

        {/* Global toast (for Overview tab actions, unlikely but safe) */}
        {toast && <ToastBanner message={toast} />}
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

function ToastBanner({ message }: { message: string }) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-strong))] text-sm text-[hsl(var(--text-primary))] shadow-lg whitespace-nowrap pointer-events-none">
      {message}
    </div>
  )
}
