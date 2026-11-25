'use client'

import { useState } from 'react'

/** Leaves the demo: the workspace is deleted and the cookie cleared (DELETE /api/demo). */
export function ExitDemoButton({ onExited = () => window.location.assign('/') }: { onExited?: () => void }) {
  const [leaving, setLeaving] = useState(false)

  async function exit() {
    setLeaving(true)
    try {
      await fetch('/api/demo', { method: 'DELETE' })
    } finally {
      onExited()
    }
  }

  return (
    <button
      type="button"
      onClick={exit}
      disabled={leaving}
      className="h-9 rounded-lg border border-[hsl(var(--border-default))] px-3 text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] disabled:opacity-50"
    >
      Exit demo
    </button>
  )
}
