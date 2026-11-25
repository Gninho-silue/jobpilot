import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { create as groqCreate } from '@test/mocks/groq'
import { setRequestCookie } from '@test/mocks/next-headers'
import { createApplication, createUser, SAMPLE_CV } from '@test/helpers/db'
import { emptyRequest, formRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'
import * as applications from '@/app/api/applications/route'
import * as application from '@/app/api/applications/[id]/route'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as adaptedCvPdf from '@/app/api/applications/[id]/adapted-cv-pdf/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as coverLetterPdf from '@/app/api/applications/[id]/cover-letter-pdf/route'
import * as interview from '@/app/api/applications/[id]/interview/route'
import * as factCheck from '@/app/api/applications/[id]/fact-check/route'
import * as cv from '@/app/api/cv/route'
import * as cvFile from '@/app/api/cv/file/route'
import * as cvUpload from '@/app/api/cv/upload/route'
import * as dashboard from '@/app/api/dashboard/route'
import * as userPlan from '@/app/api/user/plan/route'

type Handler = (id: string) => Promise<Response>

// Every route that takes an application id.
const routes: Array<[string, Handler]> = [
  ['PATCH /api/applications/[id]', id => application.PATCH(jsonRequest(`/x/${id}`, { status: 'OFFER', notes: 'pwned' }, 'PATCH'), routeParams(id))],
  ['DELETE /api/applications/[id]', id => application.DELETE(emptyRequest(`/x/${id}`, 'DELETE'), routeParams(id))],
  ['POST /api/applications/[id]/adapt-resume', id => adaptResume.POST(emptyRequest(`/x/${id}`, 'POST'), routeParams(id))],
  ['POST /api/applications/[id]/cover-letter', id => coverLetter.POST(emptyRequest(`/x/${id}`, 'POST'), routeParams(id))],
  ['POST /api/applications/[id]/interview', id => interview.POST(emptyRequest(`/x/${id}`, 'POST'), routeParams(id))],
  ['GET /api/applications/[id]/adapted-cv-pdf', id => adaptedCvPdf.GET(emptyRequest(`/x/${id}`), routeParams(id))],
  ['GET /api/applications/[id]/cover-letter-pdf', id => coverLetterPdf.GET(emptyRequest(`/x/${id}`), routeParams(id))],
  ['GET /api/applications/[id]/fact-check', id => factCheck.GET(emptyRequest(`/x/${id}`), routeParams(id))],
  ['POST /api/applications/[id]/fact-check', id => factCheck.POST(jsonRequest(`/x/${id}`, { action: 'fix', issueId: 'title-1' }), routeParams(id))],
]

async function createDemo(id: string) {
  await prisma.user.create({ data: { id, email: `${id}@demo.invalid`, isDemo: true, cvText: SAMPLE_CV } })
}

const asDemo = (id: string) => setRequestCookie(DEMO_COOKIE, signDemoCookie(id))

describe('a demo visitor only reaches its own data', () => {
  let realApp: string
  let otherDemoApp: string
  let ownApp: string

  beforeEach(async () => {
    await createUser('user_real01')
    realApp = (await createApplication('user_real01', { notes: 'private', adaptedCvText: 'Jane Doe\nEngineer', coverLetter: 'Dear team' })).id
    await createDemo('demo_visitor01')
    await createDemo('demo_visitor02')
    otherDemoApp = (await createApplication('demo_visitor02', { adaptedCvText: 'Jane Doe\nEngineer', coverLetter: 'Dear team' })).id
    ownApp = (await createApplication('demo_visitor01', { company: 'Initech' })).id
    asDemo('demo_visitor01')
  })

  it.each(routes)("%s → 404 on a real user's application, which stays untouched", async (_name, call) => {
    const before = await prisma.application.findUniqueOrThrow({ where: { id: realApp } })
    const res = await call(realApp)
    expect(res.status).toBe(404)
    expect(await prisma.application.findUnique({ where: { id: realApp } })).toEqual(before)
    expect(groqCreate).not.toHaveBeenCalled()
  })

  it.each(routes)("%s → 404 on another demo's application", async (_name, call) => {
    const before = await prisma.application.findUniqueOrThrow({ where: { id: otherDemoApp } })
    const res = await call(otherDemoApp)
    expect(res.status).toBe(404)
    expect(await prisma.application.findUnique({ where: { id: otherDemoApp } })).toEqual(before)
  })

  it('lists and updates only its own applications', async () => {
    const list = await readJson<{ data: Array<{ id: string }> }>(await applications.GET())
    expect(list.data.map(a => a.id)).toEqual([ownApp])

    const res = await application.PATCH(jsonRequest(`/x/${ownApp}`, { status: 'PHONE' }, 'PATCH'), routeParams(ownApp))
    expect(res.status).toBe(200)
  })

  it('creates applications under its own id', async () => {
    const res = await applications.POST(jsonRequest('/api/applications', { company: 'Hooli', role: 'Engineer', offerText: 'We hire.' }))
    expect(res.status).toBe(201)
    expect(await prisma.application.count({ where: { userId: 'demo_visitor01', company: 'Hooli' } })).toBe(1)
    expect(await prisma.application.count({ where: { userId: 'user_real01' } })).toBe(1)
  })

  it('reads its own CV, plan and dashboard', async () => {
    expect((await readJson<{ data: { cvText: string } }>(await cv.GET())).data.cvText).toBe(SAMPLE_CV)
    expect((await userPlan.GET()).status).toBe(200)
    expect((await dashboard.GET()).status).toBe(200)
  })

  it('cannot upload a CV (403), and has no CV file (404)', async () => {
    const res = await cvUpload.POST(formRequest('/api/cv/upload', new FormData()))
    expect(res.status).toBe(403)
    expect((await cvFile.GET(emptyRequest('/api/cv/file'))).status).toBe(404)
  })
})
