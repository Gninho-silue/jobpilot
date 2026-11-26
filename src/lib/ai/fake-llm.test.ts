import { afterEach, describe, expect, it } from 'vitest'
import { create as groqCreate } from '@test/mocks/groq'
import { checkAdaptedCv } from '@/lib/fact-check/check-adapted-cv'
import { checkCoverLetter } from '@/lib/fact-check/check-cover-letter'
import { DEMO_CV } from '@/lib/demo/seed-data'
import { assertNoFakeLlmInProduction, fakeCompletion, fakeLlmEnabled, fakeStream } from './fake-llm'
import { completeChat, streamChat } from './call'

afterEach(() => {
  delete process.env.E2E_FAKE_LLM
  delete process.env.VERCEL_ENV
})

describe('fake LLM: when it is on', () => {
  it('only with E2E_FAKE_LLM=1, and never on a Vercel production deployment', () => {
    expect(fakeLlmEnabled({})).toBe(false)
    expect(fakeLlmEnabled({ E2E_FAKE_LLM: '0' })).toBe(false)
    expect(fakeLlmEnabled({ E2E_FAKE_LLM: 'true' })).toBe(false)
    expect(fakeLlmEnabled({ E2E_FAKE_LLM: '1' })).toBe(true)
    expect(fakeLlmEnabled({ E2E_FAKE_LLM: '1', VERCEL_ENV: 'preview' })).toBe(true)
    expect(fakeLlmEnabled({ E2E_FAKE_LLM: '1', VERCEL_ENV: 'production' })).toBe(false)
  })

  it('a production build fails if E2E_FAKE_LLM is present, whatever its value', () => {
    expect(() => assertNoFakeLlmInProduction({ VERCEL_ENV: 'production', E2E_FAKE_LLM: '1' })).toThrow(/E2E_FAKE_LLM/)
    expect(() => assertNoFakeLlmInProduction({ VERCEL_ENV: 'production', E2E_FAKE_LLM: '' })).toThrow(/E2E_FAKE_LLM/)
    expect(() => assertNoFakeLlmInProduction({ VERCEL_ENV: 'production' })).not.toThrow()
    expect(() => assertNoFakeLlmInProduction({ VERCEL_ENV: 'preview', E2E_FAKE_LLM: '1' })).not.toThrow()
    expect(() => assertNoFakeLlmInProduction({ E2E_FAKE_LLM: '1' })).not.toThrow()
  })

  it('completeChat and streamChat answer from the fake, without calling Groq, when it is on', async () => {
    process.env.E2E_FAKE_LLM = '1'
    const done = await completeChat('parse-offer', { model: 'm', messages: [] })
    expect(JSON.parse(done.choices[0]!.message.content!)).toEqual(expect.objectContaining({ company: expect.any(String) }))
    let streamed = ''
    for await (const chunk of await streamChat('adapt-resume.stream', { model: 'm', messages: [], stream: true })) streamed += chunk.choices[0]?.delta?.content ?? ''
    expect(streamed).toContain('Sam Rivera')
    expect(groqCreate).not.toHaveBeenCalled()
  })

  it('off: completeChat calls Groq as usual', async () => {
    groqCreate.mockResolvedValueOnce({ choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] })
    await completeChat('parse-offer', { model: 'm', messages: [] })
    expect(groqCreate).toHaveBeenCalledTimes(1)
  })
})

describe('fake LLM: fixed outputs', () => {
  const text = (label: string) => fakeCompletion(label).choices[0]!.message.content!

  it('the offer analysis is valid JSON with company, role and salary', () => {
    expect(JSON.parse(text('parse-offer'))).toEqual({ company: 'Contoso Robotics', role: 'Backend Engineer', salary: '52k€' })
  })

  it('the adapted CV holds one claim absent from the CV, so the fact-check panel opens', () => {
    expect(checkAdaptedCv(DEMO_CV, text('adapt-resume'))).toEqual([expect.objectContaining({ kind: 'technology', unsupported: ['Terraform'] })])
  })

  it('the cover letter holds a claim absent from the CV too', () => {
    expect(checkCoverLetter(DEMO_CV, text('cover-letter')).map(i => i.kind)).toContain('technology')
  })

  it('interview questions and feedback are valid JSON', () => {
    expect(JSON.parse(text('interview-questions'))).toHaveLength(10)
    expect(JSON.parse(text('interview-feedback'))).toEqual(expect.objectContaining({ score: expect.any(Number) }))
  })

  it('the stream gives the same text as the full answer, in chunks', async () => {
    let streamed = ''
    for await (const chunk of fakeStream('cover-letter.stream')) streamed += chunk.choices[0]?.delta?.content ?? ''
    expect(streamed).toBe(text('cover-letter'))
  })

  it('an unknown label is an error, never a silent empty answer', () => {
    expect(() => fakeCompletion('something-new')).toThrow(/something-new/)
  })
})
