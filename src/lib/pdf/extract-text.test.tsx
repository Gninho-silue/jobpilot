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

describe('extractPdfText — repeated headers and footers', () => {
  // Like an exported 3-page CV: "Name / Page X of Y" at the bottom of every page,
  // with an entry that runs across a page break.
  async function threePages(withHeader = false) {
    const footer = (
      <Text fixed render={({ pageNumber, totalPages }) => `Zoé Martin-Ferré\nPage ${pageNumber} of ${totalPages}`} />
    )
    const header = withHeader ? <Text fixed>Zoé Martin-Ferré — CV</Text> : null
    const pdf = await renderToBuffer(
      <Document>
        <Page>
          {header}
          <Text>Zoé Martin-Ferré</Text>
          <Text>First page body.</Text>
          {footer}
        </Page>
        <Page>
          {header}
          <Text>HireLoop | Next.js, Stripe (test mode) | Live demo | 2026</Text>
          <Text>AI job-search SaaS.</Text>
          {footer}
        </Page>
        <Page>
          {header}
          <Text>Rate limiting and signed URLs; 364 tests.</Text>
          {footer}
        </Page>
      </Document>
    )
    return (await extractPdfText(Buffer.from(pdf))).text
  }

  it('removes the name and "Page X of Y" repeated at the bottom of every page, keeps the name at the top', async () => {
    const text = await threePages()
    expect(text).not.toMatch(/Page \d of 3/)
    expect(text.split('\n').filter(line => line === 'Zoé Martin-Ferré')).toHaveLength(1)
    expect(text.startsWith('Zoé Martin-Ferré\nFirst page body.')).toBe(true)
    // The entry is no longer cut by a footer.
    expect(text).toContain('AI job-search SaaS.\n\nRate limiting and signed URLs; 364 tests.')
  })

  it('removes a header repeated at the top of pages 2 and 3, keeps it on page 1', async () => {
    const text = await threePages(true)
    expect(text.split('\n').filter(line => line === 'Zoé Martin-Ferré — CV')).toHaveLength(1)
  })

  it('a one-page document keeps all its lines except a "Page 1 of 1" footer', async () => {
    const pdf = await renderToBuffer(
      <Document>
        <Page>
          <Text>Jane Doe</Text>
          <Text>Body</Text>
          <Text>Page 1 of 1</Text>
        </Page>
      </Document>
    )
    expect((await extractPdfText(Buffer.from(pdf))).text).toBe('Jane Doe\nBody')
  })
})
