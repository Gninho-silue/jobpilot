// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlanMeter } from './plan-meter'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
afterEach(cleanup)

describe('PlanMeter: the one upgrade call of the app shell', () => {
  it('free plan: usage, a progress bar and a single "Upgrade to Pro" link', () => {
    render(<PlanMeter plan="FREE" used={4} limit={5} />)
    expect(screen.getByText(/applications created this month/)).toHaveTextContent('Free plan · 4 of 5 applications created this month')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })

  it('pro plan: no upgrade call', () => {
    render(<PlanMeter plan="PRO" used={12} limit={5} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/unlimited/)).toBeInTheDocument()
  })
})
