import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { create as groqCreate } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as applications from '@/app/api/applications/route'
import * as application from '@/app/api/applications/[id]/route'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as adaptedCvPdf from '@/app/api/applications/[id]/adapted-cv-pdf/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as coverLetterPdf from '@/app/api/applications/[id]/cover-letter-pdf/route'
import * as interview from '@/app/api/applications/[id]/interview/route'

type Handler = (id: string) => Promise<Response>

// Every route under /api/applications/[id]. An application that belongs to
// someone else must look exactly like one that does not exist: 404.
const routes: Array<[string, Handler]> = [
  ['PATCH /api/applications/[id]', id =>
    application.PATCH(jsonRequest(`/api/applications/${id}`, { status: 'OFFER', notes: 'pwned' }, 'PATCH'), routeParams(id))],
  ['DELETE /api/applications/[id]', id =>
    application.DELETE(emptyRequest(`/api/applications/${id}`, 'DELETE'), routeParams(id))],
  ['POST /api/applications/[id]/adapt-resume', id =>
    adaptResume.POST(emptyRequest(`/api/applications/${id}/adapt-resume`, 'POST'), routeParams(id))],
  ['POST /api/applications/[id]/cover-letter', id =>
    coverLetter.POST(emptyRequest(`/api/applications/${id}/cover-letter`, 'POST'), routeParams(id))],
  ['POST /api/applications/[id]/interview', id =>
    interview.POST(emptyRequest(`/api/applications/${id}/interview`, 'POST'), routeParams(id))],
  ['GET /api/applications/[id]/adapted-cv-pdf', id =>
    adaptedCvPdf.GET(emptyRequest(`/api/applications/${id}/adapted-cv-pdf`), routeParams(id))],
  ['GET /api/applications/[id]/cover-letter-pdf', id =>
    coverLetterPdf.GET(emptyRequest(`/api/applications/${id}/cover-letter-pdf`), routeParams(id))],
]

describe('ownership of applications (IDOR)', () => {
  let owner: string
  let intruder: string
  let appId: string

  beforeEach(async () => {
    owner = uid('owner')
    intruder = uid('intruder')
    await createUser(owner)
    await createUser(intruder) // has a CV and free credits: only ownership can stop it
    const app = await createApplication(owner, {
      notes: 'private notes',
      adaptedCvText: 'Jane Doe\nEngineer',
      coverLetter: 'Dear team, …',
    })
    appId = app.id
  })

  it.each(routes)("%s → 404 on another user's application, which stays untouched", async (_name, call) => {
    signInAs(intruder)
    const before = await prisma.application.findUniqueOrThrow({ where: { id: appId } })

    const res = await call(appId)

    expect(res.status).toBe(404)
    expect(await readJson(res)).toEqual({ error: 'Not found' })
    expect(await prisma.application.findUnique({ where: { id: appId } })).toEqual(before)
    expect(groqCreate).not.toHaveBeenCalled()
    expect(await prisma.usageCounter.findUnique({ where: { userId: intruder } })).toBeNull()
  })

  it.each(routes)('%s → 404 on an application that does not exist', async (_name, call) => {
    signInAs(owner)
    const res = await call('does-not-exist')
    expect(res.status).toBe(404)
  })

  it('the owner can update their application', async () => {
    signInAs(owner)
    const res = await application.PATCH(
      jsonRequest(`/api/applications/${appId}`, { status: 'PHONE' }, 'PATCH'),
      routeParams(appId)
    )
    expect(res.status).toBe(200)
    expect((await prisma.application.findUniqueOrThrow({ where: { id: appId } })).status).toBe('PHONE')
  })

  it('the owner can delete their application', async () => {
    signInAs(owner)
    const res = await application.DELETE(emptyRequest(`/api/applications/${appId}`, 'DELETE'), routeParams(appId))
    expect(res.status).toBe(200)
    expect(await prisma.application.findUnique({ where: { id: appId } })).toBeNull()
  })

  it('GET /api/applications lists only the signed-in user’s applications', async () => {
    await createApplication(intruder, { company: 'Intruder Inc' })
    signInAs(intruder)
    const res = await applications.GET()
    const body = await readJson<{ data: Array<{ company: string; userId: string }> }>(res)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({ company: 'Intruder Inc', userId: intruder })
  })
})
