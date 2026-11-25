import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Document, Link, Page, Text, renderToBuffer } from '@react-pdf/renderer'
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

describe('extractPdfText — typography of the extracted text', () => {
  it('recomposes accents detached by LaTeX PDFs', async () => {
    // Text as a LaTeX-made PDF stores it: spacing accent next to the letter.
    const latexLike = await renderToBuffer(
      <Document>
        <Page>
          <Text>{'Zo´e Martin-Ferr´e, ´Ecole, Formation Compl`ete'}</Text>
        </Page>
      </Document>
    )
    const { text } = await extractPdfText(Buffer.from(latexLike))
    expect(text).toBe('Zoé Martin-Ferré, École, Formation Complète')
  })
})

describe('extractPdfText — link URLs', () => {
  it('appends the URLs of link annotations (the text only shows their labels), without mailto and duplicates', async () => {
    const pdf = await renderToBuffer(
      <Document>
        <Page>
          <Text>
            <Link src="mailto:candidate_test@example.com">candidate_test@example.com</Link>
            {' | '}
            <Link src="https://www.linkedin.com/in/zoe-test">LinkedIn</Link>
            {' | '}
            <Link src="https://github.com/zoe-test">GitHub</Link>
            {' | '}
            <Link src="https://github.com/zoe-test">GitHub again</Link>
          </Text>
        </Page>
      </Document>
    )
    const { text, links } = await extractPdfText(Buffer.from(pdf))

    expect(links).toEqual(['https://www.linkedin.com/in/zoe-test', 'https://github.com/zoe-test'])
    expect(text.split('\n').at(-1)).toBe('Links: https://www.linkedin.com/in/zoe-test | https://github.com/zoe-test')
  })

  it('adds no Links line when the PDF has no link', async () => {
    const pdf = await renderToBuffer(<Document><Page><Text>No links here</Text></Page></Document>)
    expect(await extractPdfText(Buffer.from(pdf))).toEqual({ text: 'No links here', pages: 1, links: [] })
  })
})
