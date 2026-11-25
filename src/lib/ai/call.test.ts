import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { mockCompletion, mockStream } from '@test/mocks/groq'
import { adaptResume, streamAdaptResume } from './adapt-resume'
import { generateCoverLetter, streamCoverLetter } from './generate-cover-letter'
import { generateInterviewQuestions } from './generate-interview-questions'
import { generateInterviewFeedback } from './interview-feedback'
import { parseJobOffer } from './parse-offer'

// A recognisable marker: it must never appear in the logs.
const CV = 'SECRET_CV_MARKER Jane Doe, Backend Developer at Acme Corp (2023 – 2025).'
const OFFER = 'SECRET_OFFER_MARKER Globex hires.'

let info: MockInstance
beforeEach(() => {
  info = vi.spyOn(console, 'info').mockImplementation(() => {})
})
afterEach(() => info.mockRestore())

const logged = () => info.mock.calls.map(call => JSON.parse(String(call[0])) as Record<string, unknown>)

describe('one log line per AI call: finish_reason and token usage, never the content', () => {
  it.each([
    ['adapt-resume', () => (mockCompletion('x'), adaptResume(CV, OFFER, 'EN'))],
    ['cover-letter', () => (mockCompletion('x'), generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', 'EN'))],
    ['interview-questions', () => (mockCompletion('[]'), generateInterviewQuestions(CV, OFFER, 'Globex', 'Engineer', 'EN'))],
    ['interview-feedback', () => (mockCompletion('{}'), generateInterviewFeedback('Q?', 'A long enough answer', 'technical', 'EN'))],
    ['parse-offer', () => (mockCompletion('{}'), parseJobOffer(OFFER, 'EN'))],
  ])('%s', async (label, run) => {
    await run()
    expect(logged()).toEqual([
      expect.objectContaining({
        event: 'ai_call',
        label,
        model: 'test-model',
        finish_reason: 'stop',
        prompt_tokens: 100,
        completion_tokens: 50,
        reasoning_tokens: 20,
      }),
    ])
    expect(JSON.stringify(info.mock.calls)).not.toMatch(/SECRET_(CV|OFFER)_MARKER/)
  })

  it('a truncated answer is logged with finish_reason "length" and its budget', async () => {
    mockCompletion('x', 'length')
    await adaptResume(CV, OFFER, 'EN')
    expect(logged()[0]).toMatchObject({ finish_reason: 'length', max_completion_tokens: expect.any(Number) })
  })

  it.each([
    ['adapt-resume.stream', () => streamAdaptResume(CV, OFFER, 'EN')],
    ['cover-letter.stream', () => streamCoverLetter(CV, OFFER, 'Globex', 'Engineer', 'EN')],
  ])('%s: logged once the stream ends, with the usage of its last chunk', async (label, start) => {
    mockStream(['Jane ', 'Doe'], 'length')
    const stream = await start()
    expect(info).not.toHaveBeenCalled()
    for await (const _chunk of stream) {
      // drain
    }
    expect(logged()).toEqual([
      expect.objectContaining({ event: 'ai_call', label, finish_reason: 'length', completion_tokens: 50, reasoning_tokens: 20 }),
    ])
    expect(JSON.stringify(info.mock.calls)).not.toContain('SECRET_CV_MARKER')
  })
})

describe('a failed call is logged too (status and error type only)', () => {
  it('logs ai_call_failed, then rethrows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { create } = await import('@test/mocks/groq')
    create.mockRejectedValueOnce(Object.assign(new Error('400 json_validate_failed: SECRET_OFFER_MARKER'), { status: 400, name: 'BadRequestError' }))

    await expect(parseJobOffer(OFFER, 'EN')).rejects.toThrow()

    expect(warn.mock.calls.map(call => JSON.parse(String(call[0])))).toEqual([
      { event: 'ai_call_failed', label: 'parse-offer', model: 'test-model', status: 400, error: 'BadRequestError' },
    ])
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET_OFFER_MARKER')
    warn.mockRestore()
  })
})
