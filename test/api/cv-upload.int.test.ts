import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { CV_MAX_BYTES } from '@/lib/validation'
import { signInAs } from '@test/mocks/clerk'
import { upload } from '@test/mocks/supabase'
import { SAMPLE_CV, createUser } from '@test/helpers/db'
import { formRequest, readJson } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'
import { POST } from '@/app/api/cv/upload/route'

function send(file?: File): Promise<Response> {
  const form = new FormData()
  if (file) form.append('file', file)
  return POST(formRequest('/api/cv/upload', form))
}

// Real PDFs, parsed by the real parser (see test/fixtures/make-fixtures.mjs).
const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)))

function pdfFile(name = 'cv-1-page.pdf'): File {
  return new File([new Uint8Array(fixture(name))], 'cv.pdf', { type: 'application/pdf' })
}

describe('POST /api/cv/upload', () => {
  let user: string

  beforeEach(async () => {
    user = uid('cv')
    await createUser(user)
    signInAs(user)
  })

  async function expectRejected(res: Response, message: string) {
    expect(res.status).toBe(400)
    expect(await readJson(res)).toEqual({ error: message })
    expect(upload).not.toHaveBeenCalled()
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user } })).cvText).toBe(SAMPLE_CV)
  }

  it('400 when no file is sent', async () => {
    await expectRejected(await send(), 'No file provided')
  })

  it('400 for a file that is not declared as a PDF', async () => {
    await expectRejected(
      await send(new File(['hello'], 'cv.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
      'Only PDF files are accepted'
    )
  })

  it('400 for a PDF larger than 5 MB', async () => {
    const big = new Uint8Array(CV_MAX_BYTES + 1)
    big.set([0x25, 0x50, 0x44, 0x46])
    await expectRejected(await send(new File([big], 'cv.pdf', { type: 'application/pdf' })), 'File too large. Maximum size is 5MB')
  })

  it('400 for a fake PDF (right MIME type, wrong magic bytes)', async () => {
    await expectRejected(
      await send(new File(['MZ this is an exe'], 'cv.pdf', { type: 'application/pdf' })),
      'File does not appear to be a valid PDF'
    )
  })

  it('accepts a one-page CV: extracts the text, stores the original file under the user folder, saves the text', async () => {
    const res = await send(pdfFile('cv-1-page.pdf'))

    expect(res.status).toBe(200)
    expect(upload).toHaveBeenCalledWith(`${user}/cv.pdf`, fixture('cv-1-page.pdf'), { contentType: 'application/pdf', upsert: true })
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user } })
    expect(saved.cvText).toContain('Jane Doe')
    expect(saved.cvText).toContain('Backend Developer')
    expect(saved.cvUrl).toContain(`${user}/cv.pdf`)
    expect((await readJson<{ data: { cvText: string } }>(res)).data.cvText).toBe(saved.cvText)
  })

  it('accepts a two-page CV and keeps the text of both pages', async () => {
    const res = await send(pdfFile('cv-2-pages.pdf'))
    expect(res.status).toBe(200)
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user } })
    expect(saved.cvText).toContain('PAGE ONE MARKER')
    expect(saved.cvText).toContain('PAGE TWO MARKER')
  })

  it('uploads the same valid PDF 10 times in a row without a single parse failure', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await send(pdfFile())).status).toBe(200)
    }
  })

  it('400 with a clear message for a scanned PDF (image only, no text layer)', async () => {
    await expectRejected(
      await send(pdfFile('cv-scanned.pdf')),
      'This PDF contains no text, it is probably a scan. Export your CV to PDF from Word, Google Docs or a similar tool and upload it again.'
    )
  })

  it('400 when the PDF is corrupt (valid header, unreadable body)', async () => {
    await expectRejected(
      await send(new File(['%PDF-1.7\nthis is not a real pdf body'], 'cv.pdf', { type: 'application/pdf' })),
      'Failed to extract text from PDF'
    )
  })

  it('500 with a generic message when storage fails, and keeps the old CV', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'bucket not found: internal detail' } })
    const res = await send(pdfFile())
    expect(res.status).toBe(500)
    expect(await readJson(res)).toEqual({ error: 'Failed to upload file' })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user } })).cvText).toBe(SAMPLE_CV)
  })
})
