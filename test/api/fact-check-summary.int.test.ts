import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { mockCompletion, mockStream } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, jsonRequest, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'
import * as factCheck from '@/app/api/applications/[id]/fact-check/route'
import { loadDashboard } from '@/lib/dashboard'
import { createDemoWorkspace } from '@/lib/demo/seed'
import { refreshFactChecks } from '@/lib/fact-check/refresh'
import type { StoredFactCheck } from '@/lib/fact-check/summary'

// SAMPLE_CV (test/helpers/db.ts): Backend Developer at Acme Corp, Node.js and PostgreSQL.
const cv = (bullet: string) => `Jane Doe
Full-Stack Engineer | Node.js
jane@example.test

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Acme Corp
>DATE: 2023 – 2025
- ${bullet}`
const INVENTED = cv('Built REST APIs with Node.js, PostgreSQL and Redis.')

const kinds = (check: unknown) => (check as StoredFactCheck | null)?.issues.map(i => `${i.kind}:${i.unsupported.join(',')}`)

async function setup() {
  const user = uid('u')
  await createUser(user)
  const app = await createApplication(user)
  signInAs(user)
  const saved = () => prisma.application.findUniqueOrThrow({ where: { id: app.id } })
  return { user, app, saved }
}

describe('the result of each check is stored when the text is written', () => {
  it('adapt-resume stores the issues of the saved CV', async () => {
    const { app, saved } = await setup()
    mockStream([INVENTED])
    mockCompletion(INVENTED) // the regeneration keeps the invention: saved with its issue
    await (await adaptResume.POST(emptyRequest(`/x/${app.id}`, 'POST'), routeParams(app.id))).text()
    expect(kinds((await saved()).adaptedCvCheck)).toEqual(['technology:Redis'])
  })

  it('a one-click fix stores the new result', async () => {
    const { app, saved } = await setup()
    await prisma.application.update({ where: { id: app.id }, data: { adaptedCvText: INVENTED } })
    const issueId = (await (await factCheck.GET(emptyRequest(`/x/${app.id}`), routeParams(app.id))).json()).data.issues[0].id
    await factCheck.POST(jsonRequest(`/x/${app.id}`, { action: 'fix', issueId }), routeParams(app.id))
    expect(kinds((await saved()).adaptedCvCheck)).toEqual([])
  })

  it('cover-letter stores the issues of the saved letter (a generic phrase here)', async () => {
    const { app, saved } = await setup()
    mockStream(['My experience aligns perfectly with your needs.'])
    await (await coverLetter.POST(emptyRequest(`/x/${app.id}`, 'POST'), routeParams(app.id))).text()
    expect(kinds((await saved()).coverLetterCheck)).toEqual(['hollow:aligns perfectly'])
  })

  it('a new CV refreshes the stored results of every application of the user', async () => {
    const { user, app, saved } = await setup()
    await prisma.application.update({ where: { id: app.id }, data: { adaptedCvText: INVENTED } })
    await prisma.user.update({ where: { id: user }, data: { cvText: cv('Built REST APIs with Node.js, PostgreSQL and Redis.') } })
    await refreshFactChecks(user)
    expect(kinds((await saved()).adaptedCvCheck)).toEqual([])
  })

  it('the demo workspace starts with its stored results', async () => {
    const id = await createDemoWorkspace()
    const northwind = await prisma.application.findFirstOrThrow({ where: { userId: id, company: 'Northwind Traders' } })
    expect(kinds(northwind.adaptedCvCheck)).toEqual(['technology:Kubernetes'])
    expect(kinds(northwind.coverLetterCheck)).toEqual(['hollow:aligns perfectly'])
  })
})

describe('the dashboard reads the stored results and never runs the checker', () => {
  it('shows what is stored, even when the text would check differently', async () => {
    const { user, app } = await setup()
    // A faithful text, but a stored result naming Kubernetes: the dashboard must show the stored one.
    await prisma.application.update({
      where: { id: app.id },
      data: {
        adaptedCvText: cv('Built REST APIs with Node.js and PostgreSQL.'),
        adaptedCvCheck: { checkedAt: '2026-11-26T10:00:00.000Z', issues: [{ kind: 'technology', unsupported: ['Kubernetes'] }] },
      },
    })
    const dashboard = await loadDashboard({ kind: 'user', id: user }, new Date(), null)
    expect(dashboard.toCheck).toEqual([
      expect.objectContaining({ company: 'Globex', text: 'Adapted CV: 1 claim not found in your CV', example: 'Kubernetes' }),
    ])
  })
})
