import { describe, expect, it } from 'vitest'
import {
  createApplicationSchema,
  interviewFeedbackSchema,
  parseOfferSchema,
  updateApplicationSchema,
} from './validation'

describe('createApplicationSchema', () => {
  const valid = { company: 'Globex', role: 'Engineer', offerText: 'Offer text' }

  it('accepts the minimal payload and defaults language to EN', () => {
    const result = createApplicationSchema.parse(valid)
    expect(result.language).toBe('EN')
  })

  it.each(['company', 'role', 'offerText'] as const)('rejects an empty %s', field => {
    expect(createApplicationSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false)
  })

  it.each(['company', 'role', 'offerText'] as const)('rejects a missing %s', field => {
    const { [field]: _omitted, ...rest } = valid
    expect(createApplicationSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects an unknown language', () => {
    expect(createApplicationSchema.safeParse({ ...valid, language: 'DE' }).success).toBe(false)
  })

  it('accepts an empty link but rejects a malformed one', () => {
    expect(createApplicationSchema.safeParse({ ...valid, link: '' }).success).toBe(true)
    expect(createApplicationSchema.safeParse({ ...valid, link: 'https://jobs.example.test/1' }).success).toBe(true)
    expect(createApplicationSchema.safeParse({ ...valid, link: 'not a url' }).success).toBe(false)
  })
})

describe('updateApplicationSchema', () => {
  it('accepts an empty patch', () => {
    expect(updateApplicationSchema.safeParse({}).success).toBe(true)
  })

  it.each(['APPLIED', 'PHONE', 'TECHNICAL', 'OFFER', 'REJECTED'])('accepts status %s', status => {
    expect(updateApplicationSchema.safeParse({ status }).success).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(updateApplicationSchema.safeParse({ status: 'HIRED' }).success).toBe(false)
  })

  it('strips fields that are not editable (userId, offerText)', () => {
    const result = updateApplicationSchema.parse({ notes: 'ok', userId: 'someone-else', offerText: 'x' })
    expect(result).toEqual({ notes: 'ok' })
  })
})

describe('parseOfferSchema', () => {
  it('requires a non-empty offer text', () => {
    expect(parseOfferSchema.safeParse({ offerText: '' }).success).toBe(false)
    expect(parseOfferSchema.parse({ offerText: 'x' }).language).toBe('EN')
  })
})

describe('interviewFeedbackSchema', () => {
  const valid = { question: 'Why us?', answer: 'Because I like it a lot.', type: 'behavioral', language: 'FR' }

  it('accepts a valid payload', () => {
    expect(interviewFeedbackSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects answers shorter than 10 characters with a readable message', () => {
    const result = interviewFeedbackSchema.safeParse({ ...valid, answer: 'short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Answer is too short')
  })

  it('rejects an unknown question type', () => {
    expect(interviewFeedbackSchema.safeParse({ ...valid, type: 'trick' }).success).toBe(false)
  })
})
