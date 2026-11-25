// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoBanner } from './demo-banner'
import { ExitDemoButton } from './exit-demo-button'
import { TryDemoButton } from './try-demo-button'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('demo UI', () => {
  it('the banner says the data resets daily and payments run in Stripe test mode', () => {
    render(<DemoBanner />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Demo workspace — data resets daily. Payments run in Stripe test mode (card 4242 4242 4242 4242).'
    )
  })

  it('"Try the demo" posts to /api/demo', () => {
    render(<TryDemoButton />)
    const button = screen.getByRole('button', { name: 'Try the demo' })
    const form = button.closest('form')!
    expect(form).toHaveAttribute('action', '/api/demo')
    expect(form).toHaveAttribute('method', 'post')
  })

  it('"Exit demo" deletes the workspace, then goes home', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)
    const navigate = vi.fn()
    render(<ExitDemoButton onExited={navigate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Exit demo' }))
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith('/api/demo', { method: 'DELETE' })
  })
})
