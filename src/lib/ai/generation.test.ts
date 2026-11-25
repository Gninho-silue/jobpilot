import { describe, expect, it } from 'vitest'
import { finishedByLength, generationOptions } from './generation'

describe('generationOptions', () => {
  it('reasoning models (gpt-oss) get low reasoning effort: their reasoning tokens count against the budget', () => {
    expect(generationOptions('openai/gpt-oss-120b', 'x'.repeat(1000), 'cv')).toMatchObject({ reasoning_effort: 'low' })
    expect(generationOptions('llama-3.3-70b-versatile', 'x'.repeat(1000), 'cv')).not.toHaveProperty('reasoning_effort')
  })

  it('CV budget: at least 4000 tokens, more for a long CV (a 3-page CV must fit with room to spare)', () => {
    const short = generationOptions('m', 'x'.repeat(1000), 'cv').max_completion_tokens
    const threePages = generationOptions('m', 'x'.repeat(7000), 'cv').max_completion_tokens
    expect(short).toBe(4000)
    expect(threePages).toBeGreaterThanOrEqual(7000)
    expect(generationOptions('m', 'x'.repeat(200_000), 'cv').max_completion_tokens).toBe(16000)
  })

  it('cover letter budget: at least 3000 tokens', () => {
    expect(generationOptions('m', 'x'.repeat(1000), 'letter').max_completion_tokens).toBe(3000)
  })

  it('a retry can double the budget', () => {
    expect(generationOptions('m', 'x'.repeat(1000), 'cv', 2).max_completion_tokens).toBe(8000)
  })
})

describe('finishedByLength', () => {
  it('is true only for finish_reason "length"', () => {
    expect(finishedByLength({ choices: [{ finish_reason: 'length' }] })).toBe(true)
    expect(finishedByLength({ choices: [{ finish_reason: 'stop' }] })).toBe(false)
    expect(finishedByLength({ choices: [] })).toBe(false)
  })
})
