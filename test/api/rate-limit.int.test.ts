import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { checkLlmRateLimit } from '@/lib/rate-limit'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, mockCompletion } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as interview from '@/app/api/applications/[id]/interview/route'
import * as interviewFeedback from '@/app/api/interview/feedback/route'
import * as offersParse from '@/app/api/offers/parse/route'

// Every route that calls the LLM shares one per-user budget (10 calls / minute),
// stored in Postgres so it holds across serverless instances.
const LLM_ROUTES: Array<[string, (appId: string) => Promise<Response>]> = [
  ['POST /api/offers/parse', () => offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'Globex hires' }))],
  ['POST /api/applications/[id]/adapt-resume', id => adaptResume.POST(emptyRequest(`/api/applications/${id}/adapt-resume`, 'POST'), routeParams(id))],
  ['POST /api/applications/[id]/cover-letter', id => coverLetter.POST(emptyRequest(`/api/applications/${id}/cover-letter`, 'POST'), routeParams(id))],
  ['POST /api/applications/[id]/interview', id => interview.POST(emptyRequest(`/api/applications/${id}/interview`, 'POST'), routeParams(id))],
  [
    'POST /api/interview/feedback',
    () =>
      interviewFeedback.POST(
        jsonRequest('/api/interview/feedback', { question: 'Why us?', answer: 'Because of the mission.', type: 'behavioral', language: 'EN' })
      ),
  ],
]

describe('LLM routes — distributed rate limit', () => {
  let user: string
  let appId: string

  beforeEach(async () => {
    user = uid('rl')
    await createUser(user, { plan: 'PRO' })
    appId = (await createApplication(user)).id
    signInAs(user)
  })

  it.each(LLM_ROUTES)('%s → 429 with Retry-After once the budget is spent, without calling Groq', async (_name, call) => {
    for (let i = 0; i < 10; i++) await checkLlmRateLimit(user)

    const res = await call(appId)

    expect(res.status).toBe(429)
    expect(await readJson(res)).toEqual({ error: 'Too many requests. Please wait before trying again.' })
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(groqCreate).not.toHaveBeenCalled()
  })

  it('a rate-limited free user does not lose a monthly credit', async () => {
    const free = uid('rl-free')
    await createUser(free)
    const app = await createApplication(free)
    signInAs(free)
    for (let i = 0; i < 10; i++) await checkLlmRateLimit(free)

    const res = await adaptResume.POST(emptyRequest(`/api/applications/${app.id}/adapt-resume`, 'POST'), routeParams(app.id))

    expect(res.status).toBe(429)
    expect(await prisma.usageCounter.findUnique({ where: { userId: free } })).toBeNull()
  })

  it('offers/parse: 10 calls reach Groq, the 11th is refused', async () => {
    for (let i = 0; i < 10; i++) {
      mockCompletion('{}')
      expect((await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: `offer ${i}` }))).status).toBe(200)
    }
    const res = await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'offer 11' }))
    expect(res.status).toBe(429)
    expect(groqCreate).toHaveBeenCalledTimes(10)
  })

  it('the budget is per user', async () => {
    for (let i = 0; i < 10; i++) await checkLlmRateLimit(user)
    const other = uid('rl-other')
    signInAs(other)
    mockCompletion('{}')
    expect((await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'x' }))).status).toBe(200)
  })
})
