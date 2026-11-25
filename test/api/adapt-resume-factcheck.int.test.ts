import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { STREAM_REPLACE } from '@/lib/stream-protocol'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, groqCall, mockCompletion, mockGroqFailure, mockStream } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'

// SAMPLE_CV (test/helpers/db.ts): Backend Developer at Acme Corp, 2023 – 2025,
// "Built REST APIs with Node.js and PostgreSQL". Title: Full-Stack Engineer.
const cv = (bullet: string) => `Jane Doe
Full-Stack Engineer | Node.js
jane@example.test

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Acme Corp
>DATE: 2023 – 2025
- ${bullet}`

const FAITHFUL = cv('Built REST APIs with Node.js and PostgreSQL.')
const INVENTED = cv('Built REST APIs with Node.js, PostgreSQL and Redis.')

async function setup() {
  const user = uid('u')
  await createUser(user)
  const app = await createApplication(user)
  signInAs(user)
  const run = async () => {
    const res = await adaptResume.POST(emptyRequest(`/api/applications/${app.id}/adapt-resume`, 'POST'), routeParams(app.id))
    return { res, body: await res.text() }
  }
  const saved = async () => (await prisma.application.findUniqueOrThrow({ where: { id: app.id } })).adaptedCvText
  const credits = async () => (await prisma.usageCounter.findUnique({ where: { userId: user } }))?.cvAdaptations
  return { run, saved, credits }
}

describe('adapt-resume — fact-check and one regeneration', () => {
  it('a faithful draft is saved as is: one model call, no replace marker', async () => {
    const { run, saved } = await setup()
    mockStream([FAITHFUL])
    const { body } = await run()
    expect(body).toBe(FAITHFUL)
    expect(await saved()).toBe(FAITHFUL)
    expect(groqCreate).toHaveBeenCalledTimes(1)
  })

  it('a draft with an invented fact is regenerated once with the corrections; the client gets a replace marker', async () => {
    const { run, saved, credits } = await setup()
    mockStream([INVENTED])
    mockCompletion(FAITHFUL)

    const { body } = await run()

    expect(body).toBe(`${INVENTED}${STREAM_REPLACE}${FAITHFUL}`)
    expect(await saved()).toBe(FAITHFUL)
    expect(groqCreate).toHaveBeenCalledTimes(2)
    expect(groqCall(1).messages[1]?.content).toContain('remove Redis')
    expect(await credits()).toBe(1)
  })

  it('never more than one regeneration, even if the second version still has issues', async () => {
    const { run, saved } = await setup()
    mockStream([INVENTED])
    mockCompletion(cv('Built REST APIs with Node.js, PostgreSQL and Kafka.'))

    await run()

    expect(groqCreate).toHaveBeenCalledTimes(2)
    expect(await saved()).toContain('Kafka')
  })

  it('if the regeneration fails, the draft is kept', async () => {
    const { run, saved } = await setup()
    mockStream([INVENTED])
    mockGroqFailure()

    const { res, body } = await run()

    expect(res.status).toBe(200)
    expect(body).toBe(INVENTED)
    expect(await saved()).toBe(INVENTED)
  })
})
