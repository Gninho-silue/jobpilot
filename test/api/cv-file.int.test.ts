import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { createSignedUrl, from } from '@test/mocks/supabase'
import { createUser } from '@test/helpers/db'
import { emptyRequest, readJson } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import { CV_SIGNED_URL_TTL_SECONDS } from '@/lib/cv-storage'
import * as cv from '@/app/api/cv/route'
import * as cvFile from '@/app/api/cv/file/route'

const getFile = (query = '') => cvFile.GET(emptyRequest(`/api/cv/file${query}`))

describe('GET /api/cv/file — signed URL of the signed-in user’s own CV', () => {
  it('redirects (302, not cached) to a short-lived signed URL for the user’s own file', async () => {
    const user = uid('owner')
    await createUser(user)
    signInAs(user)

    const res = await getFile()

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      `http://supabase.invalid/storage/v1/object/sign/cvs/${user}/cv.pdf?token=test&expiresIn=600`
    )
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(from).toHaveBeenCalledWith('cvs')
    expect(createSignedUrl).toHaveBeenCalledWith(`${user}/cv.pdf`, CV_SIGNED_URL_TTL_SECONDS, undefined)
  })

  it('expires within 5 to 10 minutes', () => {
    expect(CV_SIGNED_URL_TTL_SECONDS).toBeGreaterThanOrEqual(300)
    expect(CV_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(600)
  })

  it('?download=1 asks Storage for a download (Content-Disposition: attachment)', async () => {
    const user = uid('owner')
    await createUser(user)
    signInAs(user)

    await getFile('?download=1')

    expect(createSignedUrl).toHaveBeenCalledWith(`${user}/cv.pdf`, CV_SIGNED_URL_TTL_SECONDS, { download: 'cv.pdf' })
  })

  it('401 without a session, nothing signed', async () => {
    const res = await getFile()
    expect(res.status).toBe(401)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('404 when the user has no CV', async () => {
    const user = uid('nocv')
    await createUser(user, { cvText: null })
    signInAs(user)
    const res = await getFile()
    expect(res.status).toBe(404)
    expect(await readJson(res)).toEqual({ error: 'Not found' })
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('a user cannot get a signed URL for another user’s CV: a stored path outside their folder → 404', async () => {
    const victim = uid('victim')
    const attacker = uid('attacker')
    await createUser(victim)
    await createUser(attacker)
    await prisma.user.update({ where: { id: attacker }, data: { cvPath: `${victim}/cv.pdf` } })
    signInAs(attacker)

    for (const query of ['', '?download=1']) {
      const res = await getFile(query)
      expect(res.status).toBe(404)
      expect(res.headers.get('location')).toBeNull()
    }
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('path tricks are refused too (traversal, folder prefix of another id)', async () => {
    const user = uid('u')
    await createUser(user)
    signInAs(user)
    for (const cvPath of [`${user}/../other/cv.pdf`, `${user}x/cv.pdf`, `/${user}/cv.pdf`]) {
      await prisma.user.update({ where: { id: user }, data: { cvPath } })
      expect((await getFile()).status).toBe(404)
    }
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('500 with a generic message when Storage cannot sign', async () => {
    const user = uid('u')
    await createUser(user)
    signInAs(user)
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'Object not found: internal detail' } })

    const res = await getFile()

    expect(res.status).toBe(500)
    expect(await readJson(res)).toEqual({ error: 'Could not open the CV. Please try again.' })
  })
})

describe('GET /api/cv — never exposes a storage URL', () => {
  it('returns the app route for the file, not a Supabase URL', async () => {
    const user = uid('u')
    await createUser(user)
    signInAs(user)

    const body = await readJson<{ data: Record<string, unknown> }>(await cv.GET())

    expect(body.data).toMatchObject({ hasCv: true, fileUrl: '/api/cv/file' })
    expect(JSON.stringify(body)).not.toContain('supabase')
    expect(body.data).not.toHaveProperty('cvUrl')
  })

  it('hasCv is false and fileUrl null without a CV', async () => {
    const user = uid('u')
    await createUser(user, { cvText: null })
    signInAs(user)
    const body = await readJson<{ data: Record<string, unknown> }>(await cv.GET())
    expect(body.data).toMatchObject({ hasCv: false, fileUrl: null })
  })
})
