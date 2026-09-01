'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Filter,
  X,
  Check,
  ArrowUpDown,
  Sparkles,
  FileText,
  MessageSquare,
  FileCode,
  RotateCcw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type LanguageFilter = 'ALL' | 'EN' | 'FR'
export type SortOption = 'newest' | 'oldest' | 'company_asc' | 'company_desc' | 'role_asc'
export type StageFilter = 'APPLIED' | 'PHONE' | 'TECHNICAL' | 'OFFER' | 'REJECTED'

export interface AiAssetFilters {
  hasAdaptedCv: boolean
  hasCoverLetter: boolean
  hasInterviewQs: boolean
}

export interface FilterState {
  search: string
  language: LanguageFilter
  stages: StageFilter[]
  aiAssets: AiAssetFilters
  sortBy: SortOption
}

export const INITIAL_FILTER_STATE: FilterState = {
  search: '',
  language: 'ALL',
  stages: [],
  aiAssets: {
    hasAdaptedCv: false,
    hasCoverLetter: false,
    hasInterviewQs: false,
  },
  sortBy: 'newest',
}

interface ApplicationsFilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
}

const STAGE_LABELS: Record<StageFilter, string> = {
  APPLIED: 'Applied',
  PHONE: 'Phone Screen',
  TECHNICAL: 'Technical',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
}

export function ApplicationsFilterBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: ApplicationsFilterBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Count active filters (excluding default sort & empty search)
  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.language !== 'ALL' ? 1 : 0) +
    filters.stages.length +
    (filters.aiAssets.hasAdaptedCv ? 1 : 0) +
    (filters.aiAssets.hasCoverLetter ? 1 : 0) +
    (filters.aiAssets.hasInterviewQs ? 1 : 0) +
    (filters.sortBy !== 'newest' ? 1 : 0)

  // Click outside listener for popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false)
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [popoverOpen])

  const handleSearchChange = (val: string) => {
    onChange({ ...filters, search: val })
  }

  const handleLanguageChange = (lang: LanguageFilter) => {
    onChange({ ...filters, language: lang })
  }

  const toggleStage = (stage: StageFilter) => {
    const exists = filters.stages.includes(stage)
    const nextStages = exists
      ? filters.stages.filter(s => s !== stage)
      : [...filters.stages, stage]
    onChange({ ...filters, stages: nextStages })
  }

  const toggleAiAsset = (key: keyof AiAssetFilters) => {
    onChange({
      ...filters,
      aiAssets: {
        ...filters.aiAssets,
        [key]: !filters.aiAssets[key],
      },
    })
  }

  const handleSortChange = (sort: SortOption) => {
    onChange({ ...filters, sortBy: sort })
  }

  const resetFilters = () => {
    onChange(INITIAL_FILTER_STATE)
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search & Filter Controls Bar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
          <Input
            value={filters.search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search company, role, or notes..."
            className="pl-8 pr-8 h-9 rounded-lg bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Language Toggle Pills */}
        <div className="flex items-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] p-0.5 text-xs">
          {(['ALL', 'EN', 'FR'] as const).map(lang => {
            const isActive = filters.language === lang
            return (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-black font-semibold shadow-xs'
                    : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
                }`}
              >
                {lang === 'ALL' ? 'All' : lang === 'EN' ? '🇬🇧 EN' : '🇫🇷 FR'}
              </button>
            )
          })}
        </div>

        {/* Filter Popover Button */}
        <div className="relative" ref={popoverRef}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`rounded-lg border h-9 px-3 text-sm flex items-center gap-1.5 transition-colors ${
              activeFilterCount > 0 || popoverOpen
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                : 'border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Filter Popover Dropdown */}
          {popoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-strong))] shadow-xl z-50 p-4 space-y-4 animate-in fade-in-0 zoom-in-95 duration-100">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border-default))]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                    Filter Applications
                  </span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Stage Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
                  Stages
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(['APPLIED', 'PHONE', 'TECHNICAL', 'OFFER', 'REJECTED'] as const).map(stage => {
                    const isSelected = filters.stages.includes(stage)
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => toggleStage(stage)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500/80 bg-amber-500/15 text-amber-400'
                            : 'border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--border-strong))]'
                        }`}
                      >
                        {STAGE_LABELS[stage]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* AI Generated Assets */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  AI Assets Ready
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleAiAsset('hasAdaptedCv')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      filters.aiAssets.hasAdaptedCv
                        ? 'border-amber-500/80 bg-amber-500/10 text-[hsl(var(--text-primary))]'
                        : 'border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface))]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      Adapted CV Ready
                    </span>
                    {filters.aiAssets.hasAdaptedCv && <Check className="h-3.5 w-3.5 text-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAiAsset('hasCoverLetter')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      filters.aiAssets.hasCoverLetter
                        ? 'border-amber-500/80 bg-amber-500/10 text-[hsl(var(--text-primary))]'
                        : 'border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface))]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                      Cover Letter Ready
                    </span>
                    {filters.aiAssets.hasCoverLetter && <Check className="h-3.5 w-3.5 text-amber-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAiAsset('hasInterviewQs')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      filters.aiAssets.hasInterviewQs
                        ? 'border-amber-500/80 bg-amber-500/10 text-[hsl(var(--text-primary))]'
                        : 'border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-raised))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface))]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                      Interview Prep Ready
                    </span>
                    {filters.aiAssets.hasInterviewQs && <Check className="h-3.5 w-3.5 text-amber-500" />}
                  </button>
                </div>
              </div>

              {/* Sort Order */}
              <div className="space-y-1.5 pt-1 border-t border-[hsl(var(--border-default))]">
                <label className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpDown className="h-3 w-3" />
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={e => handleSortChange(e.target.value as SortOption)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-xs text-[hsl(var(--text-primary))] focus:border-amber-500/60 outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="company_asc">Company (A to Z)</option>
                  <option value="company_desc">Company (Z to A)</option>
                  <option value="role_asc">Role Title (A to Z)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips & Counter */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-[hsl(var(--text-muted))]">
          <span className="text-[11px] font-medium">
            Showing <strong className="text-[hsl(var(--text-primary))]">{filteredCount}</strong> of{' '}
            {totalCount} applications
          </span>

          <span className="text-[hsl(var(--border-strong))]">|</span>

          {/* Search chip */}
          {filters.search.trim() && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-[hsl(var(--border-strong))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))]"
            >
              <span>Search: &quot;{filters.search}&quot;</span>
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="hover:text-[hsl(var(--text-primary))] cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Language chip */}
          {filters.language !== 'ALL' && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-[hsl(var(--border-strong))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))]"
            >
              <span>Lang: {filters.language === 'EN' ? '🇬🇧 EN' : '🇫🇷 FR'}</span>
              <button
                type="button"
                onClick={() => handleLanguageChange('ALL')}
                className="hover:text-[hsl(var(--text-primary))] cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Stage chips */}
          {filters.stages.map(st => (
            <Badge
              key={st}
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <span>Stage: {STAGE_LABELS[st]}</span>
              <button
                type="button"
                onClick={() => toggleStage(st)}
                className="hover:text-amber-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* AI Asset chips */}
          {filters.aiAssets.hasAdaptedCv && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
            >
              <span>Adapted CV</span>
              <button
                type="button"
                onClick={() => toggleAiAsset('hasAdaptedCv')}
                className="hover:text-indigo-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.aiAssets.hasCoverLetter && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            >
              <span>Cover Letter</span>
              <button
                type="button"
                onClick={() => toggleAiAsset('hasCoverLetter')}
                className="hover:text-emerald-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.aiAssets.hasInterviewQs && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-sky-500/40 bg-sky-500/10 text-sky-400"
            >
              <span>Interview Prep</span>
              <button
                type="button"
                onClick={() => toggleAiAsset('hasInterviewQs')}
                className="hover:text-sky-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Sort chip */}
          {filters.sortBy !== 'newest' && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border-[hsl(var(--border-strong))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-secondary))]"
            >
              <span>
                Sorted by:{' '}
                {filters.sortBy === 'oldest'
                  ? 'Oldest'
                  : filters.sortBy === 'company_asc'
                  ? 'Company (A-Z)'
                  : filters.sortBy === 'company_desc'
                  ? 'Company (Z-A)'
                  : 'Role (A-Z)'}
              </span>
              <button
                type="button"
                onClick={() => handleSortChange('newest')}
                className="hover:text-[hsl(var(--text-primary))] cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Clear all */}
          <button
            type="button"
            onClick={resetFilters}
            className="text-amber-500 hover:text-amber-400 underline font-medium ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
