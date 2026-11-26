// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockInterviewModal } from './mock-interview-modal'

afterEach(cleanup)

const QUESTIONS = [
  { id: 'q1', type: 'technical' as const, question: 'How did you cut latency?', hint: 'Caching.' },
  { id: 'q2', type: 'behavioral' as const, question: 'Tell us about a regression.', hint: 'STAR.' },
]

describe('MockInterviewModal: an accessible dialog', () => {
  it('is a modal dialog named after the company, focused on open', () => {
    render(<MockInterviewModal company="Woodgrove Bank" questions={QUESTIONS} language="EN" isPro={false} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Mock interview: Woodgrove Bank' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
  })

  it('Escape closes it', async () => {
    const onClose = vi.fn()
    render(<MockInterviewModal company="Woodgrove Bank" questions={QUESTIONS} language="EN" isPro={false} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
