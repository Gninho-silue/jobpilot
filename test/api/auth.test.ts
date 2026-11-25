import { describe, expect, it } from 'vitest'
import { create as groqCreate } from '@test/mocks/groq'
import { setRequestCookie } from '@test/mocks/next-headers'
import { DEMO_COOKIE, DEMO_TTL_MS, signDemoCookie } from '@/lib/demo/cookie'
import { emptyRequest, formRequest, jsonRequest, readJson, routeParams } from '@test/helpers/http'
import * as applications from '@/app/api/applications/route'
import * as application from '@/app/api/applications/[id]/route'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as adaptedCvPdf from '@/app/api/applications/[id]/adapted-cv-pdf/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as coverLetterPdf from '@/app/api/applications/[id]/cover-letter-pdf/route'
import * as interview from '@/app/api/applications/[id]/interview/route'
import * as cv from '@/app/api/cv/route'
import * as cvFile from '@/app/api/cv/file/route'
import * as factCheck from '@/app/api/applications/[id]/fact-check/route'
import * as cvUpload from '@/app/api/cv/upload/route'
import * as dashboard from '@/app/api/dashboard/route'
import * as interviewFeedback from '@/app/api/interview/feedback/route'
import * as offersParse from '@/app/api/offers/parse/route'
import * as stripeCheckout from '@/app/api/stripe/checkout/route'
import * as stripePortal from '@/app/api/stripe/portal/route'
import * as userPlan from '@/app/api/user/plan/route'

// No user is signed in (signOut is the default state). Unit project: there is
// no database here, so any route that touched Prisma before checking the
// session would fail with a connection error instead of a clean 401.

const ID = routeParams('app_123')

const cases: Array<[string, () => Promise<Response>]> = [
  ['GET /api/applications', () => applications.GET()],
  ['POST /api/applications', () => applications.POST(jsonRequest('/api/applications', { company: 'x', role: 'y', offerText: 'z' }))],
  ['PATCH /api/applications/[id]', () => application.PATCH(jsonRequest('/api/applications/app_123', { status: 'OFFER' }, 'PATCH'), ID)],
  ['DELETE /api/applications/[id]', () => application.DELETE(emptyRequest('/api/applications/app_123', 'DELETE'), ID)],
  ['POST /api/applications/[id]/adapt-resume', () => adaptResume.POST(emptyRequest('/x', 'POST'), ID)],
  ['GET /api/applications/[id]/adapted-cv-pdf', () => adaptedCvPdf.GET(emptyRequest('/x'), ID)],
  ['POST /api/applications/[id]/cover-letter', () => coverLetter.POST(emptyRequest('/x', 'POST'), ID)],
  ['GET /api/applications/[id]/cover-letter-pdf', () => coverLetterPdf.GET(emptyRequest('/x'), ID)],
  ['POST /api/applications/[id]/interview', () => interview.POST(emptyRequest('/x', 'POST'), ID)],
  ['GET /api/cv', () => cv.GET()],
  ['GET /api/applications/[id]/fact-check', () => factCheck.GET(emptyRequest('/x'), ID)],
  ['POST /api/applications/[id]/fact-check', () => factCheck.POST(jsonRequest('/x', { action: 'fix', issueId: 'title-1' }), ID)],
  ['GET /api/cv/file', () => cvFile.GET(emptyRequest('/api/cv/file'))],
  ['POST /api/cv/upload', () => cvUpload.POST(formRequest('/api/cv/upload', new FormData()))],
  ['GET /api/dashboard', () => dashboard.GET()],
  ['POST /api/interview/feedback', () => interviewFeedback.POST(jsonRequest('/x', { question: 'q', answer: 'long enough answer', type: 'technical', language: 'EN' }))],
  ['POST /api/offers/parse', () => offersParse.POST(jsonRequest('/x', { offerText: 'offer' }))],
  ['POST /api/stripe/checkout', () => stripeCheckout.POST()],
  ['POST /api/stripe/portal', () => stripePortal.POST()],
  ['GET /api/user/plan', () => userPlan.GET()],
]

describe('every authenticated API route', () => {
  it.each(cases)('%s → 401 without a session', async (_name, call) => {
    const res = await call()
    expect(res.status).toBe(401)
    expect(await readJson(res)).toEqual({ error: 'Unauthorized' })
    expect(groqCreate).not.toHaveBeenCalled()
  })
})

describe('every authenticated API route rejects a bad demo cookie', () => {
  it.each(cases)('%s → 401 with a forged demo cookie', async (_name, call) => {
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_visitor99').slice(0, -4) + 'AAAA')
    const res = await call()
    expect(res.status).toBe(401)
    expect(groqCreate).not.toHaveBeenCalled()
  })

  it.each(cases)('%s → 401 with an expired demo cookie', async (_name, call) => {
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_visitor99', Date.now() - DEMO_TTL_MS - 1000))
    const res = await call()
    expect(res.status).toBe(401)
    expect(groqCreate).not.toHaveBeenCalled()
  })

  it('covers the 17 authenticated route files', () => {
    expect(new Set(cases.map(([name]) => name.replace(/^\S+ /, ''))).size).toBe(17)
  })
})
