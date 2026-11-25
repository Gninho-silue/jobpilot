import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, mockCompletion } from '@test/mocks/groq'
import { setRequestCookie } from '@test/mocks/next-headers'
import { createUser, SAMPLE_CV } from '@test/helpers/db'
import { readJson } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'
import { DEMO_QUOTAS } from '@/lib/demo/quota'
import * as interviewFeedback from '@/app/api/interview/feedback/route'
import * as offersParse from '@/app/api/offers/parse/route'

const IP = '203.0.113.7'

function post(path: string, body: unknown, ip = IP) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

const parse = (ip?: string) => {
  mockCompletion('{"company":"Globex","role":"Engineer","salary":null}')
  return offersParse.POST(post('/api/offers/parse', { offerText: 'Globex hires' }, ip))
}
const feedback = (ip?: string) => {
  mockCompletion('{"score":8,"strengths":["clear"],"improvements":[],"betterAnswer":"…"}')
  return interviewFeedback.POST(post('/api/interview/feedback', { question: 'Why us?', answer: 'Because of the mission and team.', type: 'behavioral', language: 'EN' }, ip))
}

async function asNewDemo(id: string, plan: 'FREE' | 'PRO' = 'FREE') {
  await prisma.user.create({ data: { id, email: `${id}@demo.invalid`, isDemo: true, cvText: SAMPLE_CV, plan } })
  setRequestCookie(DEMO_COOKIE, signDemoCookie(id))
}

describe('demo quotas', () => {
  it('limits are 3 heavy generations and 10 feedbacks per demo per day', () => {
    expect(DEMO_QUOTAS.heavy.perDemo).toBe(3)
    expect(DEMO_QUOTAS.feedback.perDemo).toBe(10)
  })

  it('3 heavy generations a day, then 429 with a clear message and no Groq call', async () => {
    await asNewDemo('demo_heavy0001')
    for (let i = 0; i < 3; i++) expect((await parse()).status).toBe(200)
    const calls = groqCreate.mock.calls.length
    const res = await parse()
    expect(res.status).toBe(429)
    expect((await readJson<{ error: string }>(res)).error).toMatch(/demo/i)
    expect(groqCreate.mock.calls.length).toBe(calls)
  })

  it('the heavy quota applies even once the demo is PRO (test payment)', async () => {
    await asNewDemo('demo_heavypro1', 'PRO')
    for (let i = 0; i < 3; i++) expect((await parse()).status).toBe(200)
    expect((await parse()).status).toBe(429)
  })

  it('interview feedback has its own quota (10 a day), open to a FREE demo, and does not use the heavy one', async () => {
    await asNewDemo('demo_feedback1')
    for (let i = 0; i < 10; i++) expect((await feedback()).status).toBe(200)
    // Only the demo quota is under test: forget the per-minute LLM limit (10 / min).
    const forgetPerMinuteLimit = () => prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: 'llm:' } } })
    await forgetPerMinuteLimit()
    const res = await feedback()
    expect(res.status).toBe(429)
    expect((await readJson<{ error: string }>(res)).error).toMatch(/feedback/i)
    await forgetPerMinuteLimit()
    expect((await parse()).status).toBe(200)
  })

  it('a per-IP cap stops a visitor who opens demo after demo', async () => {
    for (let d = 0; d < 4; d++) {
      await asNewDemo(`demo_ipcap000${d}`)
      for (let i = 0; i < 3; i++) {
        const n = d * 3 + i
        expect((await parse()).status, `call ${n + 1}`).toBe(n < DEMO_QUOTAS.heavy.perIp ? 200 : 429)
      }
    }
    // Another IP is not affected.
    await asNewDemo('demo_otherip01')
    expect((await parse('198.51.100.9')).status).toBe(200)
  })

  it('a real user is not subject to demo quotas', async () => {
    await createUser('user_real01')
    signInAs('user_real01')
    for (let i = 0; i < 4; i++) expect((await parse()).status).toBe(200)
  })

  it('feedback stays PRO-only for a real FREE user', async () => {
    await createUser('user_free01')
    signInAs('user_free01')
    expect((await feedback()).status).toBe(403)
  })
})
