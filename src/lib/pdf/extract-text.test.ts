import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractPdfText } from './extract-text'

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../test/fixtures/${name}`, import.meta.url)))

describe('extractPdfText (real PDFs, real parser)', () => {
  it('extracts the text of a one-page CV', async () => {
    const result = await extractPdfText(fixture('cv-1-page.pdf'))
    expect(result.pages).toBe(1)
    expect(result.text).toContain('Jane Doe')
    expect(result.text).toContain('Backend Developer')
    expect(result.text).toContain('Node.js and PostgreSQL')
  })

  it('extracts every page of a two-page CV, in order', async () => {
    const result = await extractPdfText(fixture('cv-2-pages.pdf'))
    expect(result.pages).toBe(2)
    const one = result.text.indexOf('PAGE ONE MARKER')
    const two = result.text.indexOf('PAGE TWO MARKER')
    expect(one).toBeGreaterThanOrEqual(0)
    expect(two).toBeGreaterThan(one)
  })

  it('returns empty text for a scanned PDF (image only, no text layer)', async () => {
    const result = await extractPdfText(fixture('cv-scanned.pdf'))
    expect(result.pages).toBe(1)
    expect(result.text).toBe('')
  })

  it('is stable: the same PDF parses identically 20 times in a row', async () => {
    const pdf = fixture('cv-1-page.pdf')
    const texts = await Promise.all(Array.from({ length: 20 }, () => extractPdfText(pdf)))
    expect(new Set(texts.map(t => t.text)).size).toBe(1)
  })

  it('does not mutate or detach the caller buffer (it is uploaded afterwards)', async () => {
    const pdf = fixture('cv-1-page.pdf')
    const copy = Buffer.from(pdf)
    await extractPdfText(pdf)
    expect(pdf.equals(copy)).toBe(true)
  })

  it('rejects bytes that are not a PDF', async () => {
    await expect(extractPdfText(Buffer.from('%PDF-1.7 truncated garbage'))).rejects.toThrow()
  })
})
