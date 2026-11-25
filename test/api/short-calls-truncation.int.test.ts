import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, groqCall, mockCompletion } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as offersParse from '@/app/api/offers/parse/route'
import * as interview from '@/app/api/applications/[id]/interview/route'
import * as interviewFeedback from '@/app/api/interview/feedback/route'

// Every model call: a cut-off answer (finish_reason "length") gets one retry with
// twice the budget; cut off again, it is an error, never a valid answer.
const CUT_OFF = 'The AI answer was cut off before the end. Please try again.'
const QUESTIONS = JSON.stringify([{ id: '1', type: 'technical', question: 'Explain indexes', hint: 'B-trees' }])

describe('POST /api/offers/parse', () => {
  it('a cut-off answer is retried with twice the budget', async () => {
    signInAs(uid('u'))
    mockCompletion('{"company":"Glo', 'length')
    mockCompletion('{"company":"Globex","role":"Engineer","salary":null}')

    const res = await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'Globex hires an engineer' }))

    expect(await readJson(res)).toEqual({ data: { company: 'Globex', role: 'Engineer', salary: null } })
    expect(groqCall(1).max_completion_tokens).toBe(groqCall(0).max_completion_tokens! * 2)
  })

  it('cut off twice: empty fields (the form is never filled from a half-read answer)', async () => {
    signInAs(uid('u'))
    mockCompletion('{"company":"Glo', 'length')
    mockCompletion('{"company":"Globex","ro', 'length')

    const res = await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'Globex hires an engineer' }))

    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ data: { company: null, role: null, salary: null } })
    expect(groqCreate).toHaveBeenCalledTimes(2)
  })
})

describe('POST /api/applications/[id]/interview', () => {
  async function setup() {
    const user = uid('u')
    await createUser(user)
    const app = await createApplication(user)
    signInAs(user)
    return {
      run: () => interview.POST(emptyRequest(`/api/applications/${app.id}/interview`, 'POST'), routeParams(app.id)),
      saved: async () => (await prisma.application.findUniqueOrThrow({ where: { id: app.id } })).interviewQs,
    }
  }

  it('a cut-off answer is retried; the complete one is saved', async () => {
    const { run, saved } = await setup()
    mockCompletion('[{"id":"1","type":"tech', 'length')
    mockCompletion(QUESTIONS)

    const res = await run()

    expect(res.status).toBe(200)
    expect(await saved()).toEqual(JSON.parse(QUESTIONS))
  })

  it('cut off twice: 502 with a clear message, nothing saved', async () => {
    const { run, saved } = await setup()
    mockCompletion('[{"id":"1","type":"tech', 'length')
    mockCompletion('[{"id":"1","type":"technical","quest', 'length')

    const res = await run()

    expect(res.status).toBe(502)
    expect(await readJson(res)).toEqual({ error: CUT_OFF })
    expect(await saved()).toBeNull()
  })
})

describe('POST /api/interview/feedback', () => {
  const body = { question: 'Why us?', answer: 'Because of the mission and team.', type: 'behavioral', language: 'EN' }
  async function asPro() {
    const user = uid('pro')
    await createUser(user, { plan: 'PRO' })
    signInAs(user)
  }

  it('a cut-off answer is retried; the complete feedback is returned', async () => {
    await asPro()
    mockCompletion('{"score":8,"stren', 'length')
    mockCompletion('{"score":8,"strengths":["clear"],"improvements":[],"betterAnswer":"…"}')

    const res = await interviewFeedback.POST(jsonRequest('/api/interview/feedback', body))

    expect(res.status).toBe(200)
    expect((await readJson<{ data: { score: number } }>(res)).data.score).toBe(8)
  })

  it('cut off twice: 502 with a clear message', async () => {
    await asPro()
    mockCompletion('{"score":8,"stren', 'length')
    mockCompletion('{"score":8,"strengths":["cl', 'length')

    const res = await interviewFeedback.POST(jsonRequest('/api/interview/feedback', body))

    expect(res.status).toBe(502)
    expect(await readJson(res)).toEqual({ error: CUT_OFF })
  })
})
