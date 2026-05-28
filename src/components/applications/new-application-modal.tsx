'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

const FR_KEYWORDS = ['le', 'la', 'les', 'de', 'du', 'vous', 'nous', 'emploi', 'poste', 'entreprise', 'société', 'recherche', 'compétences', 'expérience', 'formation']
const EN_KEYWORDS = ['the', 'and', 'or', 'you', 'we', 'job', 'role', 'position', 'company', 'team', 'skills', 'experience', 'requirements', 'responsibilities']

function detectLanguage(text: string): 'FR' | 'EN' {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  const frCount = words.filter(w => FR_KEYWORDS.includes(w)).length
  const enCount = words.filter(w => EN_KEYWORDS.includes(w)).length
  return frCount > enCount ? 'FR' : 'EN'
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
  const [error, setError] = useState('')

  const detectedLang = offerText.trim().length > 20 ? detectLanguage(offerText) : null

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

      setOfferText('')
      setCompany('')
      setRole('')
      setLink('')
      setSalary('')
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
      <DialogContent className="max-w-[540px] rounded-2xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-6">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--text-primary))] text-lg font-semibold">
            New Application
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Textarea
              placeholder="Paste the job offer here..."
              value={offerText}
              onChange={e => setOfferText(e.target.value)}
              required
              rows={6}
              className="w-full resize-none bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500"
            />
            {detectedLang && (
              <div className="mt-1.5">
                <Badge
                  variant="outline"
                  className="text-xs border-[hsl(var(--border-strong))] text-[hsl(var(--text-secondary))]"
                >
                  {detectedLang} detected
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Company"
              value={company}
              onChange={e => setCompany(e.target.value)}
              required
              className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500"
            />
            <Input
              placeholder="Role"
              value={role}
              onChange={e => setRole(e.target.value)}
              required
              className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500"
            />
          </div>

          <Input
            placeholder="Job listing URL (optional)"
            value={link}
            onChange={e => setLink(e.target.value)}
            type="url"
            className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500"
          />

          <Input
            placeholder="Salary (optional, e.g. $80k)"
            value={salary}
            onChange={e => setSalary(e.target.value)}
            className="bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500"
          />

          {error && (
            <p className="text-sm text-[hsl(var(--state-error))] bg-[hsl(var(--state-error-light))] border border-[hsl(var(--state-error))/20%] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-1">
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
