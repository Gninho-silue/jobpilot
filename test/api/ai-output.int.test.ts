import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { mockStream } from '@test/mocks/groq'
import { createApplication, createUser } from '@test/helpers/db'
import { emptyRequest, routeParams } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import * as adaptResume from '@/app/api/applications/[id]/adapt-resume/route'
import * as coverLetter from '@/app/api/applications/[id]/cover-letter/route'

// What the model streamed in production: U+2011 hyphens and U+202F spaces that
// the PDF font cannot draw. The saved text must be normalised.
const STREAMED = ['Built an e‑commerce platform, ', '95 % fewer errors on Odoo 17.']
const SAVED = 'Built an e-commerce platform, 95% fewer errors on Odoo 17.'

describe('AI output is saved with normalised typography', () => {
  it('adapt-resume', async () => {
    const user = uid('u')
    await createUser(user)
    const app = await createApplication(user)
    signInAs(user)
    mockStream(STREAMED)

    const res = await adaptResume.POST(emptyRequest(`/api/applications/${app.id}/adapt-resume`, 'POST'), routeParams(app.id))
    await res.text()

    expect((await prisma.application.findUniqueOrThrow({ where: { id: app.id } })).adaptedCvText).toBe(SAVED)
  })

  it('cover-letter', async () => {
    const user = uid('u')
    await createUser(user)
    const app = await createApplication(user)
    signInAs(user)
    mockStream(STREAMED)

    const res = await coverLetter.POST(emptyRequest(`/api/applications/${app.id}/cover-letter`, 'POST'), routeParams(app.id))
    await res.text()

    expect((await prisma.application.findUniqueOrThrow({ where: { id: app.id } })).coverLetter).toBe(SAVED)
  })
})
