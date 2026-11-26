// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FreeTierBanner } from './free-tier-banner'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

afterEach(cleanup)

describe('FreeTierBanner', () => {
  it('shows usage and the reset date', () => {
    render(<FreeTierBanner used={2} limit={5} nextResetDate="December 1" />)
    expect(screen.getByText('Free plan — 2 of 5 applications created this month')).toBeInTheDocument()
    expect(screen.getByText(/Deleting an application does not give a credit back./)).toBeInTheDocument()
    expect(screen.getByText(/Resets December 1\./)).toBeInTheDocument()
  })

  it('fills the progress bar proportionally, capped at 100 %', () => {
    const { container, rerender } = render(<FreeTierBanner used={2} limit={5} nextResetDate="December 1" />)
    const bar = () => container.querySelector<HTMLElement>('[style*="width"]')
    expect(bar()).toHaveStyle({ width: '40%' })

    rerender(<FreeTierBanner used={9} limit={5} nextResetDate="December 1" />)
    expect(bar()).toHaveStyle({ width: '100%' })
  })

  it('can be dismissed', async () => {
    render(<FreeTierBanner used={2} limit={5} nextResetDate="December 1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/Free plan/)).not.toBeInTheDocument()
  })

  it('contains an upgrade call to action', () => {
    render(<FreeTierBanner used={2} limit={5} nextResetDate="December 1" />)
    expect(screen.getByRole('button', { name: 'Upgrade to Pro →' })).toBeInTheDocument()
  })
})
