import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { ReviewedIssue as FactIssue } from '@/lib/fact-check/fix-issue'
import { signInAs, signOut } from '@test/mocks/clerk'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as factCheck from '@/app/api/applications/[id]/fact-check/route'
import * as adaptedCvPdf from '@/app/api/applications/[id]/adapted-cv-pdf/route'

// SAMPLE_CV: "Full-Stack Engineer", Backend Developer at Acme Corp 2023 – 2025,
// "Built REST APIs with Node.js and PostgreSQL".
const ADAPTED = `Jane Doe
Platform Architect | Node.js
jane@example.test

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Acme Corp
>DATE: 2023 – 2025
- Built REST APIs with Node.js and PostgreSQL.
- Ran Kafka pipelines.`

async function setup(adaptedCvText: string | null = ADAPTED) {
  const user = uid('u')
  await createUser(user)
  const app = await createApplication(user)
  if (adaptedCvText !== null) await prisma.application.update({ where: { id: app.id }, data: { adaptedCvText } })
  signInAs(user)
  return { user, appId: app.id }
}

const getIssues = async (appId: string) =>
  readJson<{ data: { issues: FactIssue[] } }>(await factCheck.GET(emptyRequest(`/api/applications/${appId}/fact-check`), routeParams(appId)))
const post = (appId: string, body: unknown) =>
  factCheck.POST(jsonRequest(`/api/applications/${appId}/fact-check`, body), routeParams(appId))
const savedText = async (appId: string) => (await prisma.application.findUniqueOrThrow({ where: { id: appId } })).adaptedCvText

describe('GET /api/applications/[id]/fact-check', () => {
  it('lists the unsupported claims of the adapted CV, each marked fixable or not', async () => {
    const { appId } = await setup()
    const { data } = await getIssues(appId)
    expect(data.issues.map(i => [i.kind, i.unsupported, i.fixable])).toEqual([
      ['title', ['Platform Architect'], true],
      ['technology', ['Kafka'], true],
    ])
  })

  it('no adapted CV → no issues', async () => {
    const { appId } = await setup(null)
    expect((await getIssues(appId)).data.issues).toEqual([])
  })

  it('401 without a session; 404 for another user’s application', async () => {
    const { appId } = await setup()
    signOut()
    expect((await factCheck.GET(emptyRequest('/x'), routeParams(appId))).status).toBe(401)
    signInAs(uid('intruder'))
    expect((await factCheck.GET(emptyRequest('/x'), routeParams(appId))).status).toBe(404)
    expect((await post(appId, { action: 'fix', issueId: 'technology-9' })).status).toBe(404)
    expect(await savedText(appId)).toBe(ADAPTED)
  })
})

describe('POST /api/applications/[id]/fact-check', () => {
  it('fix: removes the unsupported line, saves, returns the new text and issues', async () => {
    const { appId } = await setup()
    const kafka = (await getIssues(appId)).data.issues.find(i => i.kind === 'technology')!

    const res = await post(appId, { action: 'fix', issueId: kafka.id })
    const { data } = await readJson<{ data: { adaptedCvText: string; issues: FactIssue[] } }>(res)

    expect(res.status).toBe(200)
    expect(data.adaptedCvText).not.toContain('Kafka')
    expect(await savedText(appId)).toBe(data.adaptedCvText)
    expect(data.issues.map(i => i.kind)).toEqual(['title'])
  })

  it('fix title: restores the original title', async () => {
    const { appId } = await setup()
    await post(appId, { action: 'fix', issueId: 'title-1' })
    expect((await savedText(appId))!.split('\n')[1]).toBe('Full-Stack Engineer | Node.js')
  })

  it('approve-title: keeps the new title, the issue disappears and stays gone', async () => {
    const { appId } = await setup()
    const res = await post(appId, { action: 'approve-title', title: 'Platform Architect' })
    expect((await readJson<{ data: { issues: FactIssue[] } }>(res)).data.issues.map(i => i.kind)).toEqual(['technology'])
    expect((await getIssues(appId)).data.issues.map(i => i.kind)).toEqual(['technology'])
    expect(await savedText(appId)).toBe(ADAPTED)
  })

  it('409 for an unknown or stale issue id; 400 for an invalid body', async () => {
    const { appId } = await setup()
    expect((await post(appId, { action: 'fix', issueId: 'technology-99' })).status).toBe(409)
    expect((await post(appId, { action: 'delete-everything' })).status).toBe(400)
    expect(await savedText(appId)).toBe(ADAPTED)
  })
})

describe('GET /api/applications/[id]/adapted-cv-pdf — unverified claims before export', () => {
  const exportPdf = (appId: string, query = '') =>
    adaptedCvPdf.GET(emptyRequest(`/api/applications/${appId}/adapted-cv-pdf${query}`), routeParams(appId))

  it('409 with the issues while unverified claims remain', async () => {
    const { appId } = await setup()
    const res = await exportPdf(appId)
    expect(res.status).toBe(409)
    const body = await readJson<{ error: string; issues: FactIssue[] }>(res)
    expect(body.error).toBe('The adapted CV contains claims not found in your CV.')
    expect(body.issues).toHaveLength(2)
  })

  it('?confirm=1 exports anyway (the user saw the list)', async () => {
    const { appId } = await setup()
    const res = await exportPdf(appId, '?confirm=1')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })

  it('a clean adapted CV exports directly', async () => {
    const { appId } = await setup(ADAPTED.replace('Platform Architect', 'Full-Stack Engineer').replace('\n- Ran Kafka pipelines.', ''))
    expect((await exportPdf(appId)).status).toBe(200)
  })
})
