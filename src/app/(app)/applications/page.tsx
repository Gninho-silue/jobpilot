'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Plus,
  FileText,
  SearchX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { NewApplicationModal } from '@/components/applications/new-application-modal'
import { EditApplicationSheet, type Application } from '@/components/applications/edit-application-sheet'
import {
  ApplicationsFilterBar,
  INITIAL_FILTER_STATE,
  type FilterState,
} from '@/components/applications/applications-filter-bar'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'

type ApplicationStatus = 'APPLIED' | 'PHONE' | 'TECHNICAL' | 'OFFER' | 'REJECTED'

const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: 'APPLIED', label: 'Applied' },
  { status: 'PHONE', label: 'Phone screen' },
  { status: 'TECHNICAL', label: 'Technical' },
  { status: 'OFFER', label: 'Offer' },
  { status: 'REJECTED', label: 'Rejected' },
]

// Stages are neutral; only Offer (green) and Rejected (dimmed) stand out.
function stageDot(status: ApplicationStatus): string {
  if (status === 'OFFER') return 'bg-[hsl(var(--state-success))]'
  if (status === 'REJECTED') return 'bg-[hsl(var(--text-muted))]'
  return 'bg-[hsl(var(--text-secondary))]'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

interface ApplicationCardProps {
  app: Application
  onEdit: (app: Application) => void
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onDragEnd?: () => void
}

/** One application: the whole card opens it (keyboard included) and can be dragged to another stage. */
function ApplicationCard({ app, onEdit, isDragging, onDragStart, onDragEnd }: ApplicationCardProps) {
  return (
    <button
      type="button"
      draggable
      onDragStart={e => onDragStart?.(e, app.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(app)}
      className={`grid w-full gap-2 rounded-xl border bg-[hsl(var(--bg-surface))] p-3 text-left transition-colors select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-40 border-[hsl(var(--accent-primary))]'
          : 'border-[hsl(var(--border-default))] hover:border-[hsl(var(--border-strong))]'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[hsl(var(--text-primary))]">{app.company}</span>
          <span className="block truncate text-sm text-[hsl(var(--text-secondary))]">{app.role}</span>
        </span>
        <span className="num shrink-0 rounded border border-[hsl(var(--border-default))] px-1 text-[11px] text-[hsl(var(--text-secondary))]">
          {app.language}
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 text-xs text-[hsl(var(--text-muted))]">
        <span>{timeAgo(app.createdAt)}</span>
        {app.salary ? <span className="num text-[hsl(var(--text-secondary))]">{app.salary}</span> : null}
      </span>
    </button>
  )
}

interface KanbanColumnProps {
  status: ApplicationStatus
  label: string
  apps: Application[]
  draggedAppId: string | null
  onAddClick: () => void
  onEditApp: (app: Application) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDrop: (targetStatus: ApplicationStatus) => void
}

function KanbanColumn({ status, label, apps, draggedAppId, onAddClick, onEditApp, onDragStart, onDragEnd, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <section
      aria-label={`${label}: ${apps.length}`}
      data-stage={status}
      onDragOver={e => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!isDragOver) setIsDragOver(true)
      }}
      onDragEnter={e => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setIsDragOver(false)
        onDrop(status)
      }}
      className={`flex w-[calc(100vw-2rem)] shrink-0 snap-center flex-col gap-2.5 rounded-xl p-1.5 md:w-64 md:snap-align-none xl:w-auto xl:min-w-0 ${
        isDragOver ? 'bg-[hsl(var(--accent-light))] ring-2 ring-[hsl(var(--focus))]' : ''
      }`}
    >
      <h2 className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-[hsl(var(--text-primary))]">
        <span aria-hidden className={`h-2 w-2 rounded-full ${stageDot(status)}`} />
        {label}
        <span className="num text-xs font-medium text-[hsl(var(--text-muted))]">{apps.length}</span>
      </h2>

      <div className="flex min-h-[90px] flex-1 flex-col gap-2">
        {apps.map(app => (
          <ApplicationCard
            key={app.id}
            app={app}
            onEdit={onEditApp}
            isDragging={draggedAppId === app.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {apps.length === 0 && !isDragOver ? (
          <p className="px-2 py-3 text-xs text-[hsl(var(--text-muted))]">No application at this stage.</p>
        ) : null}
        {apps.length === 0 && isDragOver ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[hsl(var(--accent-primary))] text-xs font-medium text-[hsl(var(--text-primary))]">
            Drop here
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onAddClick}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--border-default))] px-3 py-2 text-xs text-[hsl(var(--text-muted))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--text-secondary))]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add an application
      </button>
    </section>
  )
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editApp, setEditApp] = useState<Application | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [userHasCv, setUserHasCv] = useState(false)
  const [userIsPro, setUserIsPro] = useState(false)
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null)

  // A failed load is an error to show, never an empty board ("No applications yet").
  const [loadError, setLoadError] = useState(false)
  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/applications')
      const json = await res.json().catch(() => ({})) as { data?: Application[] }
      if (res.ok && json.data) {
        setApplications(json.data)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mobile: one stage at a time, swiped sideways; the tabs above follow and jump.
  const board = useRef<HTMLDivElement>(null)
  const [visibleStage, setVisibleStage] = useState(0)
  function showStage(index: number) {
    const column = board.current?.children[index] as HTMLElement | undefined
    column?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
  function trackStage() {
    const el = board.current
    if (!el || !el.clientWidth) return
    setVisibleStage(Math.min(COLUMNS.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))))
  }

  const searchParams = useSearchParams()
  const router = useRouter()

  // Auto-open modal from dashboard deep-links (?new=1 or ?edit=<id>)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setModalOpen(true)
      router.replace('/applications')
    }
  }, [searchParams, router])

  // The open application lives in the URL (?edit=<id>) for as long as the sheet
  // is open: a reload or a remount of the page (a Clerk dev handshake can reload
  // it) reopens the same sheet. The parameter goes away only when the sheet closes.
  const editId = searchParams.get('edit')
  const handledEditId = useRef<string | null>(null)
  useEffect(() => {
    if (!editId) {
      handledEditId.current = null
      return
    }
    if (editId === handledEditId.current) return
    const target = applications.find(a => a.id === editId)
    if (target) {
      handledEditId.current = editId
      setEditApp(target)
      setSheetOpen(true)
    }
  }, [editId, applications])

  useEffect(() => {
    void fetchApplications()
    fetch('/api/cv')
      .then(r => r.json() as Promise<{ data?: { hasCv: boolean } }>)
      .then(j => { if (j.data?.hasCv) setUserHasCv(true) })
      .catch(() => {})
    fetch('/api/user/plan')
      .then(r => r.json() as Promise<{ data?: { plan: string } }>)
      .then(j => { if (j.data?.plan === 'PRO') setUserIsPro(true) })
      .catch(() => {})
  }, [fetchApplications])

  function openEdit(app: Application) {
    handledEditId.current = app.id
    setEditApp(app)
    setSheetOpen(true)
    router.replace(`/applications?edit=${app.id}`, { scroll: false })
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open) router.replace('/applications', { scroll: false })
  }

  function handleCvAdapted(id: string, text: string) {
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, adaptedCvText: text } : a)
    )
    setEditApp(prev => prev?.id === id ? { ...prev, adaptedCvText: text } : prev)
  }

  function handleCoverLetterGenerated(id: string, text: string) {
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, coverLetter: text } : a)
    )
    setEditApp(prev => prev?.id === id ? { ...prev, coverLetter: text } : prev)
  }

  function handleInterviewQsGenerated(id: string, questions: InterviewQuestion[]) {
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, interviewQs: questions } : a)
    )
    setEditApp(prev => prev?.id === id ? { ...prev, interviewQs: questions } : prev)
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedAppId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggedAppId(null)
  }

  async function handleStatusDrop(targetStatus: ApplicationStatus) {
    if (!draggedAppId) return
    const appId = draggedAppId
    setDraggedAppId(null)

    const targetApp = applications.find(a => a.id === appId)
    if (!targetApp || targetApp.status === targetStatus) return

    const previousStatus = targetApp.status

    // Optimistically update status in UI
    setApplications(prev =>
      prev.map(a => (a.id === appId ? { ...a, status: targetStatus } : a))
    )

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })

      if (!res.ok) {
        // Rollback state on error
        setApplications(prev =>
          prev.map(a => (a.id === appId ? { ...a, status: previousStatus } : a))
        )
        toast.error('Failed to update application status.')
        return
      }

      const statusLabel = COLUMNS.find(c => c.status === targetStatus)?.label ?? targetStatus
      toast.success(`Moved to ${statusLabel}`)
    } catch {
      // Rollback state on network error
      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, status: previousStatus } : a))
      )
      toast.error('Network error. Failed to move application.')
    }
  }

  // Filter and Sort applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter(app => {
        // Search filter (company, role, notes)
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase().trim()
          const matchCompany = app.company.toLowerCase().includes(q)
          const matchRole = app.role.toLowerCase().includes(q)
          const matchNotes = app.notes?.toLowerCase().includes(q) ?? false
          if (!matchCompany && !matchRole && !matchNotes) {
            return false
          }
        }

        // Language filter
        if (filters.language !== 'ALL' && app.language !== filters.language) {
          return false
        }

        // Stage filter
        if (filters.stages.length > 0 && !filters.stages.includes(app.status as ApplicationStatus)) {
          return false
        }

        // AI Asset: Adapted CV
        if (filters.aiAssets.hasAdaptedCv) {
          if (!app.adaptedCvText || app.adaptedCvText.trim() === '') {
            return false
          }
        }

        // AI Asset: Cover Letter
        if (filters.aiAssets.hasCoverLetter) {
          if (!app.coverLetter || app.coverLetter.trim() === '') {
            return false
          }
        }

        // AI Asset: Interview Prep
        if (filters.aiAssets.hasInterviewQs) {
          const qs = app.interviewQs
          if (!qs || (Array.isArray(qs) && qs.length === 0)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          case 'company_asc':
            return a.company.localeCompare(b.company)
          case 'company_desc':
            return b.company.localeCompare(a.company)
          case 'role_asc':
            return a.role.localeCompare(b.role)
          case 'newest':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })
  }, [applications, filters])

  const grouped = useMemo(() => {
    return COLUMNS.reduce<Record<ApplicationStatus, Application[]>>(
      (acc, col) => {
        acc[col.status] = filteredApplications.filter(a => a.status === col.status)
        return acc
      },
      { APPLIED: [], PHONE: [], TECHNICAL: [], OFFER: [], REJECTED: [] }
    )
  }, [filteredApplications])

  const isFiltering =
    Boolean(filters.search.trim()) ||
    filters.language !== 'ALL' ||
    filters.stages.length > 0 ||
    filters.aiAssets.hasAdaptedCv ||
    filters.aiAssets.hasCoverLetter ||
    filters.aiAssets.hasInterviewQs ||
    filters.sortBy !== 'newest'

  return (
    <div className="flex flex-col gap-5 h-full min-w-0">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[hsl(var(--text-primary))]">Applications</h1>
          <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
            {loadError && applications.length === 0 ? (
              'Loading failed'
            ) : isFiltering ? (
              <>
                Showing <span className="num font-semibold text-[hsl(var(--text-primary))]">{filteredApplications.length}</span> of{' '}
                {applications.length} applications
              </>
            ) : (
              `${applications.length} application${applications.length !== 1 ? 's' : ''} across 5 stages`
            )}
          </p>
        </div>
        {/* On mobile the same action is in the top bar. */}
        <div className="hidden items-center gap-2 md:flex">
          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))] font-medium h-9 px-3 text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New application
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      {applications.length > 0 && (
        <ApplicationsFilterBar
          filters={filters}
          onChange={setFilters}
          totalCount={applications.length}
          filteredCount={filteredApplications.length}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <p role="status" className="text-sm text-[hsl(var(--text-muted))]">Loading your applications…</p>
        </div>
      ) : loadError && applications.length === 0 ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] p-5">
          <p className="font-semibold text-[hsl(var(--text-primary))]">Your applications could not be loaded.</p>
          <p className="text-sm text-[hsl(var(--text-secondary))]">The server did not answer. Try again in a moment.</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true)
              void fetchApplications()
            }}
            className="h-9 rounded-lg border-[hsl(var(--border-strong))] px-3 text-sm"
          >
            Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="h-10 w-10 text-[hsl(var(--text-muted))]" />
          <p className="text-[hsl(var(--text-secondary))] text-sm">No applications yet</p>
          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))] font-medium h-8 px-3 text-sm mt-1 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add your first application
          </Button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[hsl(var(--bg-surface))] border border-dashed border-[hsl(var(--border-default))] rounded-2xl">
          <SearchX className="h-10 w-10 text-[hsl(var(--text-muted))]" />
          <p className="text-[hsl(var(--text-primary))] font-medium text-sm">No matching applications</p>
          <p className="text-xs text-[hsl(var(--text-muted))] max-w-sm text-center">
            No applications match your active filter criteria. Try adjusting your search query or reset filters.
          </p>
          <Button
            variant="outline"
            onClick={() => setFilters(INITIAL_FILTER_STATE)}
            className="rounded-lg border-[hsl(var(--border-strong))] text-xs h-8 px-3 mt-1 cursor-pointer"
          >
            Reset all filters
          </Button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex gap-1 overflow-x-auto md:hidden" aria-label="Stages">
            {COLUMNS.map((col, index) => (
              <button
                key={col.status}
                type="button"
                aria-current={visibleStage === index ? 'true' : undefined}
                onClick={() => showStage(index)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${
                  visibleStage === index
                    ? 'bg-[hsl(var(--bg-surface-raised))] font-semibold text-[hsl(var(--text-primary))]'
                    : 'text-[hsl(var(--text-secondary))]'
                }`}
              >
                {col.label}
                <span className="num text-xs text-[hsl(var(--text-muted))]">{grouped[col.status].length}</span>
              </button>
            ))}
          </div>
          <div
            ref={board}
            onScroll={trackStage}
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:snap-none md:px-0 xl:grid xl:grid-cols-5 xl:gap-3 xl:overflow-visible"
          >
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                {...col}
                apps={grouped[col.status]}
                draggedAppId={draggedAppId}
                onAddClick={() => setModalOpen(true)}
                onEditApp={openEdit}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleStatusDrop}
              />
            ))}
          </div>
        </div>
      )}

      <NewApplicationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => void fetchApplications()}
      />

      <EditApplicationSheet
        application={editApp}
        open={sheetOpen}
        hasCv={userHasCv}
        isPro={userIsPro}
        onOpenChange={handleSheetOpenChange}
        onUpdated={() => void fetchApplications()}
        onDeleted={() => void fetchApplications()}
        onCvAdapted={handleCvAdapted}
        onCoverLetterGenerated={handleCoverLetterGenerated}
        onInterviewQsGenerated={handleInterviewQsGenerated}
      />
    </div>
  )
}
