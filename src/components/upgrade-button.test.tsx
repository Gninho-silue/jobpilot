// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpgradeButton } from './upgrade-button'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const fetchMock = vi.fn<typeof fetch>()
const location = { href: 'http://localhost:3000/dashboard' }

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('location', location)
  location.href = 'http://localhost:3000/dashboard'
  fetchMock.mockReset()
  vi.mocked(toast.error).mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

describe('UpgradeButton', () => {
  it('starts a Stripe checkout and redirects to its URL', async () => {
    respond(200, { url: 'https://checkout.stripe.test/session' })
    render(<UpgradeButton source="sidebar">Upgrade</UpgradeButton>)

    await userEvent.click(screen.getByRole('button', { name: 'Upgrade' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/stripe/checkout', { method: 'POST' })
    await waitFor(() => expect(location.href).toBe('https://checkout.stripe.test/session'))
  })

  it('shows the server error and stays on the page when checkout fails', async () => {
    respond(401, { error: 'Unauthorized' })
    render(<UpgradeButton>Upgrade</UpgradeButton>)

    await userEvent.click(screen.getByRole('button', { name: 'Upgrade' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Unauthorized'))
    expect(location.href).toBe('http://localhost:3000/dashboard')
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeEnabled()
  })

  it('shows a generic error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<UpgradeButton>Upgrade</UpgradeButton>)

    await userEvent.click(screen.getByRole('button', { name: 'Upgrade' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.'))
  })

  it('is disabled while the request is in flight', async () => {
    let release: (r: Response) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise(resolve => { release = resolve }))
    render(<UpgradeButton>Upgrade</UpgradeButton>)

    await userEvent.click(screen.getByRole('button', { name: 'Upgrade' }))

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Redirecting…')).toBeInTheDocument()
    release(new Response(JSON.stringify({ url: 'https://checkout.stripe.test/s' })))
    await waitFor(() => expect(location.href).toBe('https://checkout.stripe.test/s'))
  })
})
