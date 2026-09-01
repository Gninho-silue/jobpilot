'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Plus,
  FileText,
  Edit,
  MessageSquare,
  MoreHorizontal,
  SearchX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NewApplicationModal } from '@/components/applications/new-application-modal'
import { EditApplicationSheet, type Application } from '@/components/applications/edit-application-sheet'
import {
  ApplicationsFilterBar,
  INITIAL_FILTER_STATE,
  type FilterState,
} from '@/components/applications/applications-filter-bar'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'

type ApplicationStatus = 'APPLIED' | 'PHONE' | 'TECHNICAL' | 'OFFER' | 'REJECTED'
type Language = 'FR' | 'EN'

const COLUMNS: {
  status: ApplicationStatus
  label: string
  bgVar: string
  textVar: string
}[] = [
  { status: 'APPLIED', label: 'Applied', bgVar: '--kanban-applied-bg', textVar: '--kanban-applied-text' },
  { status: 'PHONE', label: 'Phone Screen', bgVar: '--kanban-phone-bg', textVar: '--kanban-phone-text' },
  { status: 'TECHNICAL', label: 'Technical', bgVar: '--kanban-technical-bg', textVar: '--kanban-technical-text' },
  { status: 'OFFER', label: 'Offer', bgVar: '--kanban-offer-bg', textVar: '--kanban-offer-text' },
  { status: 'REJECTED', label: 'Rejected', bgVar: '--kanban-rejected-bg', textVar: '--kanban-rejected-text' },
]

const COMPANY_COLORS = [
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
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

interface ApplicationCardProps {
  app: Application
  onEdit: (app: Application) => void
}

function ApplicationCard({ app, onEdit }: ApplicationCardProps) {
  const colorClass = getCompanyColor(app.company)
  const initial = app.company.charAt(0).toUpperCase()

  return (
    <div
      onClick={() => onEdit(app)}
      className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] rounded-xl p-3 space-y-3 hover:border-[hsl(var(--border-strong))] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`${colorClass} h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-semibold`}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">{app.company}</p>
            <p className="text-xs text-[hsl(var(--text-secondary))] truncate">{app.role}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 text-[10px] px-1.5 py-0 border-[hsl(var(--border-strong))] text-[hsl(var(--text-muted))]"
        >
          {app.language}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
        <span>{timeAgo(app.createdAt)}</span>
        {app.salary && (
          <span className="text-[hsl(var(--text-secondary))]">{app.salary}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Adapt CV"
            onClick={e => { e.stopPropagation(); onEdit(app) }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Edit"
            onClick={e => { e.stopPropagation(); onEdit(app) }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Interview prep (coming soon)"
            onClick={e => e.stopPropagation()}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          title="More options"
          onClick={e => e.stopPropagation()}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors cursor-pointer"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  status: ApplicationStatus
  label: string
  bgVar: string
  textVar: string
  apps: Application[]
  totalAppsCount: number
  onAddClick: () => void
  onEditApp: (app: Application) => void
}

function KanbanColumn({ label, bgVar, textVar, apps, onAddClick, onEditApp }: KanbanColumnProps) {
  return (
    <div className="w-[280px] shrink-0 flex flex-col gap-3">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl"
        style={{ background: `hsl(var(${bgVar}))` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: `hsl(var(${textVar}))` }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: `hsl(var(${textVar}))` }}
          >
            {label}
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: `hsl(var(${textVar}) / 20%)`,
              color: `hsl(var(${textVar}))`,
            }}
          >
            {apps.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {apps.map(app => (
          <ApplicationCard key={app.id} app={app} onEdit={onEditApp} />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[hsl(var(--border-default))] text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--border-strong))] transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
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

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/applications')
      const json = await res.json() as { data?: Application[] }
      if (res.ok && json.data) {
        setApplications(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const searchParams = useSearchParams()
  const router = useRouter()

  // Auto-open modal from dashboard deep-links (?new=1 or ?edit=<id>)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setModalOpen(true)
      router.replace('/applications')
    }
  }, [searchParams, router])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && applications.length > 0) {
      const target = applications.find(a => a.id === editId)
      if (target) {
        openEdit(target)
        router.replace('/applications')
      }
    }
  }, [searchParams, applications, router])

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
    setEditApp(app)
    setSheetOpen(true)
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
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Applications</h1>
          <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
            {isFiltering ? (
              <>
                Showing <span className="font-semibold text-amber-500">{filteredApplications.length}</span> of{' '}
                {applications.length} applications
              </>
            ) : (
              `${applications.length} application${applications.length !== 1 ? 's' : ''} across 5 stages`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-9 px-3 text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Application
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
          <p className="text-sm text-[hsl(var(--text-muted))]">Loading...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="h-10 w-10 text-[hsl(var(--text-muted))]" />
          <p className="text-[hsl(var(--text-secondary))] text-sm">No applications yet</p>
          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-8 px-3 text-sm mt-1 cursor-pointer"
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
        <div className="overflow-x-auto pb-4 -mx-6 px-6">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                {...col}
                apps={grouped[col.status]}
                totalAppsCount={applications.length}
                onAddClick={() => setModalOpen(true)}
                onEditApp={openEdit}
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
        onOpenChange={setSheetOpen}
        onUpdated={() => void fetchApplications()}
        onDeleted={() => void fetchApplications()}
        onCvAdapted={handleCvAdapted}
        onCoverLetterGenerated={handleCoverLetterGenerated}
        onInterviewQsGenerated={handleInterviewQsGenerated}
      />
    </div>
  )
}
