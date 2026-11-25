// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConfirm } from './confirm-dialog'

afterEach(cleanup)

// The edit sheet's Regenerate flow, reduced: ask, then act only on "yes".
function Harness({ onConfirmed }: { onConfirmed: () => void }) {
  const [confirm, dialog] = useConfirm()
  const [answer, setAnswer] = useState('')
  async function regenerate() {
    const ok = await confirm({
      title: 'Regenerate the adapted CV?',
      description: 'The current one will be replaced.',
      confirmLabel: 'Regenerate',
    })
    setAnswer(String(ok))
    if (ok) onConfirmed()
  }
  return (
    <>
      <button type="button" onClick={regenerate}>Regenerate</button>
      <p data-testid="answer">{answer}</p>
      {dialog}
    </>
  )
}

describe('useConfirm (replaces window.confirm, which Chrome can silently block)', () => {
  it('never calls a native dialog', async () => {
    const native = vi.spyOn(window, 'confirm')
    render(<Harness onConfirmed={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(native).not.toHaveBeenCalled()
    native.mockRestore()
  })

  it('opens an app modal with the question; the action runs only after "confirm"', async () => {
    const onConfirmed = vi.fn()
    render(<Harness onConfirmed={onConfirmed} />)

    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    const dialog = await screen.findByRole('dialog', { name: 'Regenerate the adapted CV?' })
    expect(dialog).toHaveTextContent('The current one will be replaced.')
    expect(onConfirmed).not.toHaveBeenCalled()

    await userEvent.click(screen.getAllByRole('button', { name: 'Regenerate' }).at(-1)!)
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('answer')).toHaveTextContent('true')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('"Cancel" resolves false and does nothing', async () => {
    const onConfirmed = vi.fn()
    render(<Harness onConfirmed={onConfirmed} />)
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.getByTestId('answer')).toHaveTextContent('false'))
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it('Escape resolves false', async () => {
    render(<Harness onConfirmed={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByTestId('answer')).toHaveTextContent('false'))
  })
})

describe('useConfirm inside the edit sheet (a dialog opened in a dialog)', () => {
  it('answering the modal does not close the sheet', async () => {
    const { Sheet, SheetContent, SheetTitle } = await import('@/components/ui/sheet')
    const onOpenChange = vi.fn()
    function InSheet() {
      const [confirm, dialog] = useConfirm()
      return (
        <Sheet open onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetTitle>Globex</SheetTitle>
            <button type="button" onClick={() => void confirm({ title: 'Regenerate?', confirmLabel: 'Yes' })}>
              Regenerate
            </button>
            {dialog}
          </SheetContent>
        </Sheet>
      )
    }
    render(<InSheet />)

    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Yes' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Regenerate?' })).toBeNull())
    expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything())
    expect(screen.getByRole('dialog', { name: 'Globex' })).toBeInTheDocument()
  })
})
