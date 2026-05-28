'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { trackEvent } from '@/lib/analytics'

const FR_KEYWORDS = ['le', 'la', 'les', 'de', 'du', 'vous', 'nous', 'emploi', 'poste', 'entreprise', 'société', 'recherche', 'compétences', 'expérience', 'formation']
const EN_KEYWORDS = ['the', 'and', 'or', 'you', 'we', 'job', 'role', 'position', 'company', 'team', 'skills', 'experience', 'requirements', 'responsibilities']

function detectLanguage(text: string): 'FR' | 'EN' {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  const frCount = words.filter(w => FR_KEYWORDS.includes(w)).length
  const enCount = words.filter(w => EN_KEYWORDS.includes(w)).length
  return frCount > enCount ? 'FR' : 'EN'
}

interface AutoFilled {
  company: boolean
  role: boolean
  salary: boolean
}

interface NewApplicationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatus?: string
  onCreated: () => void
}

export function NewApplicationModal({
  open,
  onOpenChange,
  onCreated,
}: NewApplicationModalProps) {
  const [offerText, setOfferText] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [link, setLink] = useState('')
  const [salary, setSalary] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [autoFilled, setAutoFilled] = useState<AutoFilled>({ company: false, role: false, salary: false })
  const [error, setError] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const detectedLang = offerText.trim().length > 20 ? detectLanguage(offerText) : null

  // Debounced auto-parse on offer text change
  useEffect(() => {
    if (offerText.trim().length < 50) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setParsing(true)
      try {
        const res = await fetch('/api/offers/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerText,
            language: detectLanguage(offerText),
          }),
        })
        if (res.ok) {
          const json = await res.json() as { data?: { company: string | null; role: string | null; salary: string | null } }
          const parsed = json.data
          if (parsed) {
            if (parsed.company) {
              setCompany(prev => {
                if (!prev) { setAutoFilled(a => ({ ...a, company: true })); return parsed.company! }
                return prev
              })
            }
            if (parsed.role) {
              setRole(prev => {
                if (!prev) { setAutoFilled(a => ({ ...a, role: true })); return parsed.role! }
                return prev
              })
            }
            if (parsed.salary) {
              setSalary(prev => {
                if (!prev) { setAutoFilled(a => ({ ...a, salary: true })); return parsed.salary! }
                return prev
              })
            }
          }
        }
      } catch {
        // Silent fail — auto-parse is best-effort
      } finally {
        setParsing(false)
      }
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [offerText])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setOfferText('')
      setCompany('')
      setRole('')
      setLink('')
      setSalary('')
      setError('')
      setParsing(false)
      setAutoFilled({ company: false, role: false, salary: false })
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          role,
          offerText,
          language: detectedLang ?? 'EN',
          salary: salary || undefined,
          link: link || undefined,
        }),
      })

      const json = await res.json() as { data?: unknown; error?: string }

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
        return
      }

      trackEvent.applicationCreated(detectedLang ?? 'EN')
      onOpenChange(false)
      onCreated()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[540px] max-w-[calc(100%-2rem)] sm:max-w-[540px] min-h-130 rounded-2xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden ring-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle className="text-[hsl(var(--text-primary))] text-lg font-semibold">
            New Application
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-4">
          <div>
            <Textarea
              placeholder="Paste the job offer here..."
              value={offerText}
              onChange={e => setOfferText(e.target.value)}
              required
              className="w-full h-40 field-sizing-fixed resize-none overflow-y-auto bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))]"
            />
            <div className="mt-1.5 flex items-center gap-2">
              {detectedLang && (
                <Badge
                  variant="outline"
                  className="text-xs border-[hsl(var(--border-strong))] text-[hsl(var(--text-secondary))]"
                >
                  {detectedLang} detected
                </Badge>
              )}
              {parsing && (
                <span className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auto-filling…
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Company field */}
            <div className="relative">
              <Input
                placeholder="Company"
                value={company}
                onChange={e => { setCompany(e.target.value); setAutoFilled(a => ({ ...a, company: false })) }}
                required
                className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))] pr-8"
              />
              {parsing && !company && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[hsl(var(--text-muted))]" />
              )}
              {autoFilled.company && company && (
                <span className="absolute -top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 leading-none">
                  Auto
                </span>
              )}
            </div>

            {/* Role field */}
            <div className="relative">
              <Input
                placeholder="Role"
                value={role}
                onChange={e => { setRole(e.target.value); setAutoFilled(a => ({ ...a, role: false })) }}
                required
                className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))] pr-8"
              />
              {parsing && !role && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[hsl(var(--text-muted))]" />
              )}
              {autoFilled.role && role && (
                <span className="absolute -top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 leading-none">
                  Auto
                </span>
              )}
            </div>
          </div>

          <Input
            placeholder="Job listing URL (optional)"
            value={link}
            onChange={e => setLink(e.target.value)}
            type="url"
            className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))]"
          />

          {/* Salary field */}
          <div className="relative">
            <Input
              placeholder="Salary (optional, e.g. $80k)"
              value={salary}
              onChange={e => { setSalary(e.target.value); setAutoFilled(a => ({ ...a, salary: false })) }}
              className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))] pr-8"
            />
            {autoFilled.salary && salary && (
              <span className="absolute -top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 leading-none">
                Auto
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-[hsl(var(--state-error))] bg-[hsl(var(--state-error-light))] border border-[hsl(var(--state-error))/20%] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium"
            >
              {loading ? 'Creating...' : 'Create Application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
