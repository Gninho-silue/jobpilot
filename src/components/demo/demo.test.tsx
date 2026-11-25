// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoBanner } from './demo-banner'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }))
import { ExitDemoButton } from './exit-demo-button'
import { TryDemoButton } from './try-demo-button'
import { DemoNotice } from './demo-notice'

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

describe('demo notice on the home page', () => {
  it.each([
    ['limit', /Too many demos were started from your network/],
    ['unavailable', /The demo is not available right now/],
    ['error', /The demo could not start/],
  ])('?demo=%s shows a readable message', (reason, text) => {
    render(<DemoNotice reason={reason} />)
    expect(screen.getByRole('alert')).toHaveTextContent(text)
  })

  it('nothing for an unknown or missing reason', () => {
    const { container } = render(<DemoNotice reason="<script>" />)
    expect(container).toBeEmptyDOMElement()
    render(<DemoNotice reason={undefined} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
