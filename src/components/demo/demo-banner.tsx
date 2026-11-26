'use client'

import { useState } from 'react'

/** Shown on every page of the demo workspace: one short line, expandable. */
export function DemoBanner() {
  const [open, setOpen] = useState(false)
  return (
    <div
      role="status"
      className="border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-4 py-1.5 text-xs text-[hsl(var(--text-secondary))] md:px-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate">
          <span className="font-semibold text-[hsl(var(--text-primary))]">Demo</span> · resets daily · test card{' '}
          <span className="num">4242 4242 4242 4242</span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          className="shrink-0 font-medium text-[hsl(var(--text-primary))] underline underline-offset-2"
        >
          {open ? 'Hide' : 'Details'}
        </button>
      </div>
      {open ? (
        <p className="mt-1.5 pb-0.5">
          Demo workspace — data resets daily. Payments run in Stripe test mode (card 4242 4242 4242 4242).
        </p>
      ) : null}
    </div>
  )
}
