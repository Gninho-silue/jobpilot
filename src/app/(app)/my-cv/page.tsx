'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  FileText,
  Loader2,
  UploadCloud,
  X,
  ExternalLink,
  Download,
  Copy,
  FileCode,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CvData {
  cvUrl: string
  cvText?: string | null
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
      .then(
        r =>
          r.json() as Promise<{
            data?: {
              hasCv: boolean
              cvUrl: string | null
              cvText: string | null
              cvTextPreview: string | null
              updatedAt: string | null
            }
          }>
      )
      .then(j => {
        if (j.data?.hasCv && j.data.cvUrl) {
          setCvData({
            cvUrl: j.data.cvUrl,
            cvText: j.data.cvText,
            cvTextPreview: j.data.cvTextPreview,
            updatedAt: j.data.updatedAt,
          })
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
    <div className="max-w-5xl space-y-6">
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
        <UploadZone
          onUploaded={handleUploaded}
          onCancel={cvData ? () => setShowUploadZone(false) : undefined}
        />
      )}
    </div>
  )
}

// ── Existing CV View ──────────────────────────────────────────────────────────

function ExistingCvView({
  cvData,
  onReplace,
}: {
  cvData: CvData
  onReplace: () => void
}) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf')
  const [copied, setCopied] = useState(false)

  const fullText = cvData.cvText || cvData.cvTextPreview || ''

  const handleCopyText = async () => {
    if (!fullText) return
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header Info Card */}
      <div className="rounded-xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-[hsl(var(--state-success-light))] flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-[hsl(var(--state-success))]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[hsl(var(--text-primary))] truncate">
                cv.pdf
              </p>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--state-success))] bg-[hsl(var(--state-success-light))] px-2 py-0.5 rounded-full shrink-0">
                <Check className="h-3 w-3" />
                Active
              </span>
            </div>
            {cvData.updatedAt && (
              <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                Uploaded {formatDate(cvData.updatedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={cvData.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-xs font-medium text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-primary))] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
          <a
            href={cvData.cvUrl}
            download="cv.pdf"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] text-xs font-medium text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-primary))] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReplace}
            className="h-8 px-3 text-xs rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] cursor-pointer"
          >
            Replace CV
          </Button>
        </div>
      </div>

      {/* View Mode Toggle & Content Container */}
      <div className="rounded-xl bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] overflow-hidden shadow-xs">
        {/* Toolbar Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] flex-wrap gap-2">
          {/* Tab buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-amber-500 text-black font-semibold shadow-xs'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              PDF Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-amber-500 text-black font-semibold shadow-xs'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Extracted Text
            </button>
          </div>

          {/* Action buttons depending on tab */}
          {activeTab === 'text' && (
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors px-2 py-1 rounded-md hover:bg-[hsl(var(--bg-surface-raised))] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy extracted text</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'pdf' ? (
          <div className="relative w-full bg-zinc-950 flex flex-col">
            {/* Embedded Native PDF Viewer */}
            <iframe
              src={`${cvData.cvUrl}#toolbar=1&navpanes=0`}
              className="w-full min-h-[680px] h-[75vh] border-0"
              title="CV Document PDF Preview"
            />
          </div>
        ) : (
          <div className="p-4 space-y-2">
            <p className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">
              Text Parsed by JobPilot ({fullText.length} characters)
            </p>
            <pre className="text-xs text-[hsl(var(--text-secondary))] leading-relaxed whitespace-pre-wrap font-(family-name:--font-mono) max-h-[600px] overflow-y-auto bg-[hsl(var(--bg-surface-raised))] p-4 rounded-lg border border-[hsl(var(--border-default))]">
              {fullText || 'No text extracted.'}
            </pre>
          </div>
        )}
      </div>
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
