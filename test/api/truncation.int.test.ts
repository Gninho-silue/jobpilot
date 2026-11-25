import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { STREAM_ERROR, STREAM_REPLACE } from '@/lib/stream-protocol'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, groqCall, mockCompletion, mockStream } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'

// SAMPLE_CV: Backend Developer at Acme Corp, 2023 – 2025.
const COMPLETE = `Jane Doe
Full-Stack Engineer | Node.js
jane@example.test

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Acme Corp
>DATE: 2023 – 2025
- Built REST APIs with Node.js and PostgreSQL.`
// Cut by the token budget in the middle of a marker, as in production (">DE").
const CUT = `${COMPLETE}\n\nEDUCATION\n>DE`
const WITH_REDIS = COMPLETE.replace('Node.js and PostgreSQL', 'Node.js, PostgreSQL and Redis')
const CUT_OFF_MESSAGE = 'The AI answer was cut off before the end. Your credit was not used: please try again.'

async function setup(field: 'adaptedCvText' | 'coverLetter' = 'adaptedCvText') {
  const user = uid('u')
  await createUser(user)
  const app = await createApplication(user)
  signInAs(user)
  const route = field === 'adaptedCvText' ? adaptResume : coverLetter
  const path = field === 'adaptedCvText' ? 'adapt-resume' : 'cover-letter'
  return {
    run: async () => (await route.POST(emptyRequest(`/api/applications/${app.id}/${path}`, 'POST'), routeParams(app.id))).text(),
    saved: async () => (await prisma.application.findUniqueOrThrow({ where: { id: app.id } }))[field],
    credits: async () => {
      const usage = await prisma.usageCounter.findUnique({ where: { userId: user } })
      return field === 'adaptedCvText' ? usage?.cvAdaptations : usage?.coverLetters
    },
  }
}

describe('adapt-resume — a truncated answer is never saved as a CV', () => {
  it('a cut-off draft is retried once with twice the budget; the complete retry replaces it', async () => {
    const { run, saved } = await setup()
    mockStream([CUT], 'length')
    mockCompletion(COMPLETE)

    const body = await run()

    expect(body).toBe(`${CUT}${STREAM_REPLACE}${COMPLETE}`)
    expect(await saved()).toBe(COMPLETE)
    expect(groqCall(1).max_completion_tokens).toBe(groqCall(0).max_completion_tokens! * 2)
  })

  it('if the retry is cut off too: nothing saved, credit refunded, clear error for the page', async () => {
    const { run, saved, credits } = await setup()
    mockStream([CUT], 'length')
    mockCompletion(CUT, 'length')

    const body = await run()

    expect(body).toBe(`${CUT}${STREAM_ERROR}${CUT_OFF_MESSAGE}`)
    expect(await saved()).toBeNull()
    expect(await credits()).toBe(0)
    expect(groqCreate).toHaveBeenCalledTimes(2)
  })

  it('a correction that comes back truncated never replaces a complete draft', async () => {
    const { run, saved } = await setup()
    mockStream([WITH_REDIS])
    mockCompletion(CUT, 'length')

    const body = await run()

    expect(body).toBe(WITH_REDIS)
    expect(await saved()).toBe(WITH_REDIS)
  })
})

describe('cover-letter — same rule', () => {
  it('a cut-off letter is retried; if still cut off, nothing saved and credit refunded', async () => {
    const { run, saved, credits } = await setup('coverLetter')
    mockStream(['Dear hiring manager, I built REST APIs at Acme Corp and'], 'length')
    mockCompletion('Dear hiring manager, I', 'length')

    const body = await run()

    expect(body).toContain(`${STREAM_ERROR}${CUT_OFF_MESSAGE}`)
    expect(await saved()).toBeNull()
    expect(await credits()).toBe(0)
  })
})
