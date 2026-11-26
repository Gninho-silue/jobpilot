// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockInterviewModal } from './mock-interview-modal'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const QUESTIONS = [
  { id: 'q1', type: 'technical' as const, question: 'How did you cut latency?', hint: 'Caching.' },
  { id: 'q2', type: 'behavioral' as const, question: 'Tell us about a regression.', hint: 'STAR.' },
]
const FEEDBACK = { score: 7, strengths: ['Concrete example.'], improvements: ['Give figures.'], betterAnswer: 'Cut p95 by 35%.' }

describe('MockInterviewModal: feedback on answers', () => {
  it('when feedback is available (Pro or demo), an answer gets feedback, shown with its score', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: FEEDBACK }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MockInterviewModal company="Woodgrove Bank" questions={QUESTIONS} language="EN" feedbackAvailable onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/Type your answer/), 'I cached the slowest queries in Redis.')
    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    await waitFor(() => expect(screen.getByText('7/10')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/interview/feedback', expect.objectContaining({ method: 'POST' }))
  })

  it('when it is not available, no request and an upgrade note instead', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<MockInterviewModal company="Woodgrove Bank" questions={QUESTIONS} language="EN" feedbackAvailable={false} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/Type your answer/), 'I cached the slowest queries in Redis.')
    expect(screen.getByText(/Upgrade to Pro for AI feedback/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
