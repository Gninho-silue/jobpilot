'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  /** Red confirm button (deleting). */
  destructive?: boolean
}

/**
 * App modal replacing window.confirm: native dialogs block the page and Chrome
 * can suppress them without showing anything ("Regenerate" silently did
 * nothing in production). `await confirm({...})` resolves true on confirm,
 * false on cancel, Escape or closing. Render the returned element once.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((answer: boolean) => void) | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>(resolve => {
      resolver.current = resolve
    })
  }, [])

  const answer = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  const dialog = (
    <Dialog open={options !== null} onOpenChange={open => !open && answer(false)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description ? <DialogDescription>{options.description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => answer(false)}
            className="rounded-lg border border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => answer(true)}
            className={
              options?.destructive
                ? 'rounded-lg bg-red-600 text-white hover:bg-red-500 font-medium'
                : 'rounded-lg bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))] font-medium'
            }
          >
            {options?.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return [confirm, dialog]
}
