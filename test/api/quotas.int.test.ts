import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, mockCompletion, mockStream } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as applications from '@/app/api/applications/route'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as interviewFeedback from '@/app/api/interview/feedback/route'
import * as offersParse from '@/app/api/offers/parse/route'

function newApplication(userId: string, n: number) {
  return applications.POST(
    jsonRequest('/api/applications', { company: `Company ${n}`, role: 'Engineer', offerText: 'Offer', language: 'EN' })
  ).then(res => ({ res, userId }))
}

async function adapt(appId: string): Promise<Response> {
  const res = await adaptResume.POST(emptyRequest(`/api/applications/${appId}/adapt-resume`, 'POST'), routeParams(appId))
  if (res.ok) await res.text() // drain the stream: the DB write happens at the end
  return res
}

async function letter(appId: string): Promise<Response> {
  const res = await coverLetter.POST(emptyRequest(`/api/applications/${appId}/cover-letter`, 'POST'), routeParams(appId))
  if (res.ok) await res.text()
  return res
}

describe('POST /api/applications — free plan: 5 per month', () => {
  it('creates 5 applications, refuses the 6th with 403', async () => {
    const user = uid('free')
    await createUser(user)
    signInAs(user)

    for (let i = 1; i <= 5; i++) {
      const { res } = await newApplication(user, i)
      expect(res.status).toBe(201)
    }
    const { res } = await newApplication(user, 6)
    expect(res.status).toBe(403)
    expect((await readJson<{ error: string }>(res)).error).toContain('Free tier limit reached (5 applications)')
    expect(await prisma.application.count({ where: { userId: user } })).toBe(5)
  })

  // End-to-end check. At this level the old read-then-write race only showed up
  // in about one run out of three; src/lib/usage.int.test.ts reproduces it reliably.
  it('10 simultaneous requests with 1 credit left → exactly 1 application is created', async () => {
    const user = uid('race')
    await createUser(user)
    await prisma.usageCounter.create({
      data: { userId: user, month: new Date().toISOString().slice(0, 7), applications: 4 },
    })
    signInAs(user)

    const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => newApplication(user, i)))

    expect(responses.map(r => r.res.status).sort()).toEqual([201, ...Array(9).fill(403)])
    expect(await prisma.application.count({ where: { userId: user } })).toBe(1)
  })

  it('creates the user row on first use (signed in with Clerk, unknown to the DB)', async () => {
    const user = uid('new')
    signInAs(user)
    const { res } = await newApplication(user, 1)
    expect(res.status).toBe(201)
    expect(await prisma.user.findUnique({ where: { id: user } })).toMatchObject({ plan: 'FREE' })
  })

  it('PRO plan has no limit', async () => {
    const user = uid('pro')
    await createUser(user, { plan: 'PRO' })
    signInAs(user)
    for (let i = 1; i <= 7; i++) {
      expect((await newApplication(user, i)).res.status).toBe(201)
    }
  })

  it('rejects an invalid body with 400 before counting usage', async () => {
    const user = uid('free')
    await createUser(user)
    signInAs(user)
    const res = await applications.POST(jsonRequest('/api/applications', { company: '', role: 'x', offerText: 'y' }))
    expect(res.status).toBe(400)
    const bad = await applications.POST(jsonRequest('/api/applications', '{not json'))
    expect(bad.status).toBe(400)
    expect(await prisma.usageCounter.findUnique({ where: { userId: user } })).toBeNull()
  })
})

describe('POST /api/applications/[id]/adapt-resume — free plan: 3 per month', () => {
  it('streams and saves 3 adaptations, refuses the 4th with 403 + upgrade flag, without calling Groq', async () => {
    const user = uid('free')
    await createUser(user)
    const app = await createApplication(user)
    signInAs(user)

    for (let i = 1; i <= 3; i++) {
      // A faithful adaptation of SAMPLE_CV (same title and section), so the fact-check passes.
      mockStream([
        'Jane Doe\nFull-Stack Engineer\njane@example.test\n\nPROFESSIONAL EXPERIENCE\n',
        `>TITLE: Backend Developer\n- Built REST APIs (version ${'ABC'[i - 1]})`,
      ])
      const res = await adapt(app.id)
      expect(res.status).toBe(200)
    }
    expect((await prisma.application.findUniqueOrThrow({ where: { id: app.id } })).adaptedCvText).toContain('Built REST APIs (version C)')

    const res = await adapt(app.id)
    expect(res.status).toBe(403)
    expect(await readJson(res)).toEqual({ error: 'Free tier limit reached', upgrade: true })
    expect(groqCreate).toHaveBeenCalledTimes(3)
  })

  it('refuses with 400 when the user has no CV, without using a credit', async () => {
    const user = uid('nocv')
    await createUser(user, { cvText: null })
    const app = await createApplication(user)
    signInAs(user)

    const res = await adapt(app.id)
    expect(res.status).toBe(400)
    expect(await prisma.usageCounter.findUnique({ where: { userId: user } })).toBeNull()
  })
})

describe('POST /api/applications/[id]/cover-letter — free plan: 3 per month', () => {
  it('generates 3 letters, refuses the 4th with 403', async () => {
    const user = uid('free')
    await createUser(user)
    const app = await createApplication(user)
    signInAs(user)

    for (let i = 1; i <= 3; i++) {
      mockStream([`Letter ${'ABC'[i - 1]}`]) // no number: the fact-check would flag one absent from the CV
      expect((await letter(app.id)).status).toBe(200)
    }
    expect((await prisma.application.findUniqueOrThrow({ where: { id: app.id } })).coverLetter).toBe('Letter C')

    const res = await letter(app.id)
    expect(res.status).toBe(403)
    expect(groqCreate).toHaveBeenCalledTimes(3)
  })
})

describe('POST /api/interview/feedback — PRO only', () => {
  const body = { question: 'Why us?', answer: 'Because of the mission and team.', type: 'behavioral', language: 'EN' }

  it('FREE user → 403 and no Groq call', async () => {
    const user = uid('free')
    await createUser(user)
    signInAs(user)
    const res = await interviewFeedback.POST(jsonRequest('/api/interview/feedback', body))
    expect(res.status).toBe(403)
    expect(groqCreate).not.toHaveBeenCalled()
  })

  it('PRO user → feedback', async () => {
    const user = uid('pro')
    await createUser(user, { plan: 'PRO' })
    signInAs(user)
    mockCompletion('{"score":8,"strengths":["clear"],"improvements":[],"betterAnswer":"…"}')
    const res = await interviewFeedback.POST(jsonRequest('/api/interview/feedback', body))
    expect(res.status).toBe(200)
    expect((await readJson<{ data: { score: number } }>(res)).data.score).toBe(8)
  })
})

describe('POST /api/offers/parse', () => {
  it('returns the parsed fields', async () => {
    signInAs(uid('free'))
    mockCompletion('{"company":"Globex","role":"Engineer","salary":null}')
    const res = await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'Globex hires' }))
    expect(await readJson(res)).toEqual({ data: { company: 'Globex', role: 'Engineer', salary: null } })
  })

  it('returns nulls (200) when Groq fails', async () => {
    signInAs(uid('free'))
    groqCreate.mockRejectedValueOnce(new Error('down'))
    const res = await offersParse.POST(jsonRequest('/api/offers/parse', { offerText: 'Globex hires' }))
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ data: { company: null, role: null, salary: null } })
  })
  // Rate limiting of this route (audit item 2) is covered in test/api/rate-limit.int.test.ts.
})
