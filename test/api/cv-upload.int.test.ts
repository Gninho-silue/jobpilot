import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { CV_MAX_BYTES } from '@/lib/validation'
import { signInAs } from '@test/mocks/clerk'
import { upload } from '@test/mocks/supabase'
import { SAMPLE_CV, createUser } from '@test/helpers/db'
import { formRequest, readJson } from '@test/helpers/http'
import { uid } from '@test/helpers/ids'

function send(file?: File): Promise<Response> {
  const form = new FormData()
  if (file) form.append('file', file)
  return POST(formRequest('/api/cv/upload', form))
}

// One-page PDF with the text "Jane Doe Backend Developer" (made with @react-pdf/renderer).
const FIXTURE_PDF = readFileSync(fileURLToPath(new URL('../fixtures/cv.pdf', import.meta.url)))

function pdfFile(): File {
  return new File([new Uint8Array(FIXTURE_PDF)], 'cv.pdf', { type: 'application/pdf' })
}

// pdf-parse is loaded with a plain require() by the route, which vi.mock does
// not intercept. Put a fake in Node's require cache before importing the route.
// Reason: pdf-parse 1.1.1 is flaky — the same valid PDF fails with "bad XRef
// entry" on roughly one parse in three (KNOWN BUG, to fix in step 2), so tests
// cannot depend on it.
const fakePdfParse = vi.fn(async (_buffer: Buffer) => ({ text: 'Jane Doe Backend Developer', numpages: 1 }))
const nodeRequire = createRequire(import.meta.url)
const pdfParsePath = nodeRequire.resolve('pdf-parse')
nodeRequire.cache[pdfParsePath] = {
  id: pdfParsePath,
  filename: pdfParsePath,
  loaded: true,
  exports: fakePdfParse,
} as unknown as NodeJS.Module
const { POST } = await import('@/app/api/cv/upload/route')

describe('POST /api/cv/upload', () => {
  let user: string

  beforeEach(async () => {
    fakePdfParse.mockClear()
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

  it('accepts a real PDF: extracts the text, stores the file under the user folder, saves the text', async () => {
    const res = await send(pdfFile())

    expect(res.status).toBe(200)
    expect(fakePdfParse).toHaveBeenCalledWith(Buffer.from(FIXTURE_PDF))
    expect(upload).toHaveBeenCalledWith(`${user}/cv.pdf`, expect.any(Buffer), { contentType: 'application/pdf', upsert: true })
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user } })
    expect(saved.cvText).toContain('Jane Doe Backend Developer')
    expect(saved.cvUrl).toContain(`${user}/cv.pdf`)
  })

  it('400 when the PDF cannot be parsed', async () => {
    fakePdfParse.mockRejectedValueOnce(new Error('bad XRef entry'))
    await expectRejected(await send(pdfFile()), 'Failed to extract text from PDF')
  })

  it('400 when the PDF has no text layer (scanned image)', async () => {
    fakePdfParse.mockResolvedValueOnce({ text: '   \n ', numpages: 1 })
    await expectRejected(
      await send(pdfFile()),
      'Could not extract text from this PDF. Make sure it is not a scanned image.'
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
