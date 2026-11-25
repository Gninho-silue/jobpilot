import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { STREAM_REPLACE } from '@/lib/stream-protocol'
import type { ReviewedIssue } from '@/lib/fact-check/fix-issue'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate, groqCall, mockCompletion, mockStream } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, readJson, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as coverLetterPdf from '@/app/api/applications/[id]/cover-letter-pdf/route'
import * as factCheck from '@/app/api/applications/[id]/fact-check/route'

// SAMPLE_CV: Backend Developer at Acme Corp, 2023 – 2025, REST APIs with Node.js and PostgreSQL.
const FAITHFUL = 'At Acme Corp, I built REST APIs with Node.js and PostgreSQL.'
const WITH_CLAIM = `I have closely followed your company for years. ${FAITHFUL}`

async function setup() {
  const user = uid('u')
  await createUser(user)
  const app = await createApplication(user)
  signInAs(user)
  return { appId: app.id }
}
const generate = async (appId: string) =>
  (await coverLetter.POST(emptyRequest(`/api/applications/${appId}/cover-letter`, 'POST'), routeParams(appId))).text()
const saved = async (appId: string) => (await prisma.application.findUniqueOrThrow({ where: { id: appId } })).coverLetter

describe('cover-letter — fact-check and one regeneration', () => {
  it('a faithful letter is saved as is, one model call', async () => {
    const { appId } = await setup()
    mockStream([FAITHFUL])
    expect(await generate(appId)).toBe(FAITHFUL)
    expect(await saved(appId)).toBe(FAITHFUL)
    expect(groqCreate).toHaveBeenCalledTimes(1)
  })

  it('a letter with an unsupported claim is regenerated once with the corrections', async () => {
    const { appId } = await setup()
    mockStream([WITH_CLAIM])
    mockCompletion(FAITHFUL)

    expect(await generate(appId)).toBe(`${WITH_CLAIM}${STREAM_REPLACE}${FAITHFUL}`)
    expect(await saved(appId)).toBe(FAITHFUL)
    expect(groqCall(1).messages[1]?.content).toContain('I have closely followed your company for years.')
  })
})

describe('cover letter — issues shown before export', () => {
  it('GET fact-check?document=cover-letter lists the unsupported sentences (no one-click fix)', async () => {
    const { appId } = await setup()
    await prisma.application.update({ where: { id: appId }, data: { coverLetter: WITH_CLAIM } })
    const res = await factCheck.GET(emptyRequest(`/api/applications/${appId}/fact-check?document=cover-letter`), routeParams(appId))
    const { data } = await readJson<{ data: { issues: ReviewedIssue[] } }>(res)
    expect(data.issues.map(i => [i.kind, i.fixable])).toEqual([['claim', false]])
  })

  it('cover-letter-pdf: 409 with the issues unless ?confirm=1', async () => {
    const { appId } = await setup()
    await prisma.application.update({ where: { id: appId }, data: { coverLetter: WITH_CLAIM } })
    const exportPdf = (q = '') => coverLetterPdf.GET(emptyRequest(`/api/applications/${appId}/cover-letter-pdf${q}`), routeParams(appId))

    const blocked = await exportPdf()
    expect(blocked.status).toBe(409)
    expect((await readJson<{ issues: unknown[] }>(blocked)).issues).toHaveLength(1)
    expect((await exportPdf('?confirm=1')).status).toBe(200)
  })
})
