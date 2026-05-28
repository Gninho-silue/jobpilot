'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Loader2, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CvData {
  cvUrl: string
  cvTextPreview: string | null
  updatedAt: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function MyCvPage() {
  const [cvData, setCvData] = useState<CvData | null>(null)
  const [loadingCv, setLoadingCv] = useState(true)
  const [showUploadZone, setShowUploadZone] = useState(false)

  useEffect(() => {
    fetch('/api/cv')
      .then(r => r.json() as Promise<{ data?: { hasCv: boolean; cvUrl: string | null; cvTextPreview: string | null; updatedAt: string | null } }>)
      .then(j => {
        if (j.data?.hasCv && j.data.cvUrl) {
          setCvData({ cvUrl: j.data.cvUrl, cvTextPreview: j.data.cvTextPreview, updatedAt: j.data.updatedAt })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCv(false))
  }, [])

  function handleUploaded(data: CvData) {
    setCvData(data)
    setShowUploadZone(false)
  }

  if (loadingCv) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--text-muted))]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">My CV</h1>
        <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
          Upload your CV once. JobPilot uses it for all AI generations.
        </p>
      </div>

      {cvData && !showUploadZone ? (
        <ExistingCvView
          cvData={cvData}
          onReplace={() => setShowUploadZone(true)}
        />
      ) : (
        <UploadZone onUploaded={handleUploaded} onCancel={cvData ? () => setShowUploadZone(false) : undefined} />
      )}
    </div>
  )
}

// ── Existing CV View ──────────────────────────────────────────────────────────

function ExistingCvView({ cvData, onReplace }: { cvData: CvData; onReplace: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-[hsl(var(--state-success-light))] flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-[hsl(var(--state-success))]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[hsl(var(--text-primary))]">cv.pdf</p>
          {cvData.updatedAt && (
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
              Uploaded {formatDate(cvData.updatedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-xs text-[hsl(var(--state-success))]">
            <Check className="h-3.5 w-3.5" />
            Active
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReplace}
            className="h-7 px-2 text-xs rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
          >
            Replace CV
          </Button>
        </div>
      </div>

      {cvData.cvTextPreview && (
        <div className="rounded-xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-4 space-y-2">
          <p className="text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wide">
            Extracted Text Preview
          </p>
          <pre className="text-xs text-[hsl(var(--text-muted))] leading-relaxed whitespace-pre-wrap font-(family-name:--font-mono) max-h-48 overflow-y-auto">
            {cvData.cvTextPreview}
            {cvData.cvTextPreview.length >= 500 ? '…' : ''}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onUploaded, onCancel }: { onUploaded: (data: CvData) => void; onCancel?: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setError('')

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

    setUploading(true)
    setProgress(20)

    const formData = new FormData()
    formData.append('file', file)

    try {
      setProgress(50)
      const res = await fetch('/api/cv/upload', { method: 'POST', body: formData })
      setProgress(90)
      const json = await res.json() as { data?: { cvUrl: string; cvText: string }; error?: string }

      if (!res.ok) {
        setError(json.error ?? 'Upload failed. Please try again.')
        return
      }

      setProgress(100)
      onUploaded({
        cvUrl: json.data!.cvUrl,
        cvTextPreview: json.data!.cvText.slice(0, 500),
        updatedAt: new Date().toISOString(),
      })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed p-12 flex flex-col items-center gap-3 transition-colors
          ${dragOver
            ? 'border-amber-500 bg-[hsl(var(--accent-light))]'
            : 'border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-surface-raised))]'
          }
          ${uploading ? 'cursor-wait' : 'cursor-pointer'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-[hsl(var(--text-secondary))]">Uploading and extracting text…</p>
            <div className="w-48 h-1.5 rounded-full bg-[hsl(var(--bg-surface-raised))] overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-xl bg-[hsl(var(--bg-surface-raised))] flex items-center justify-center">
              <UploadCloud className="h-6 w-6 text-[hsl(var(--text-muted))]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
                Drop your CV here, or click to browse
              </p>
              <p className="text-xs text-[hsl(var(--text-muted))]">PDF only · Max 5MB</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--state-error-light))] border border-[hsl(var(--state-error))/20%] px-3 py-2">
          <X className="h-4 w-4 text-[hsl(var(--state-error))] shrink-0" />
          <p className="text-sm text-[hsl(var(--state-error))]">{error}</p>
        </div>
      )}

      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
        >
          Cancel
        </Button>
      )}
    </div>
  )
}
