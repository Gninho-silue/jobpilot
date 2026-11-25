import { extractText, getDocumentProxy } from 'unpdf'
import { normalizeTypography } from '@/lib/text/typography'

export interface ExtractedPdf {
  /**
   * Text of every page, pages separated by a blank line, trimmed, followed by a
   * `Links: <url> | <url>` line when the PDF has web links. Empty for a scan.
   */
  text: string
  pages: number
  /** http(s) URLs of the PDF's link annotations, in order, without duplicates. */
  links: string[]
}

/**
 * Extracts the text layer of a PDF with unpdf (a serverless build of Mozilla's
 * pdf.js). Throws when the bytes are not a readable PDF.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdf> {
  // pdf.js takes ownership of (and may detach) the array it is given: pass a copy
  // so the caller can still upload the original buffer.
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { totalPages, text } = await extractText(pdf, { mergePages: false })

  // LaTeX PDFs detach accents from their letter ("Silu´e"): recompose them.
  const pages = text.map(page => normalizeTypography(page).split('\n').map(line => line.trim()).filter(Boolean))
  const body = stripRunningLines(pages)
    .map(lines => lines.join('\n'))
    .filter(Boolean)
    .join('\n\n')

  // The text only holds link labels ("LinkedIn | GitHub"): keep the URLs too.
  const links: string[] = []
  for (let page = 1; page <= totalPages; page++) {
    for (const annotation of await (await pdf.getPage(page)).getAnnotations()) {
      const url = annotation.subtype === 'Link' ? (annotation.url as string | undefined) : undefined
      if (url && /^https?:\/\//i.test(url) && !links.includes(url)) links.push(url)
    }
  }

  // A scan with only links is still a scan: no text.
  if (!body) return { text: '', pages: totalPages, links }
  return { text: links.length ? `${body}\n\nLinks: ${links.join(' | ')}` : body, pages: totalPages, links }
}

const EDGE = 3 // lines at the top / bottom of a page where headers and footers live
const PAGE_NUMBER = /^(page\s*)?\d+\s*(\/|of|sur|de)\s*\d+$|^page\s+\d+$/i

/**
 * Removes running headers and footers ("Name" + "Page 2 of 3" on every page of
 * an exported CV): they cut entries in two and add stray numbers to the facts.
 * - "Page X of Y" lines at the top or bottom of a page;
 * - a line found at the bottom of every page (2 pages or more);
 * - a line found at the top of every page, except on page 1, where the name
 *   at the very top is the real one.
 */
function stripRunningLines(pages: string[][]): string[][] {
  const top = (lines: string[]) => lines.slice(0, EDGE)
  const bottom = (lines: string[]) => lines.slice(-EDGE)
  const onEveryPage = (zone: (lines: string[]) => string[]) =>
    pages.length < 2 ? new Set<string>() : new Set(zone(pages[0]!).filter(line => pages.every(page => zone(page).includes(line))))

  const footers = onEveryPage(bottom)
  const headers = onEveryPage(top)

  return pages.map((lines, pageIndex) =>
    lines.filter((line, index) => {
      const inTop = index < EDGE
      const inBottom = index >= lines.length - EDGE
      if ((inTop || inBottom) && PAGE_NUMBER.test(line)) return false
      if (inBottom && footers.has(line)) return false
      if (inTop && pageIndex > 0 && headers.has(line)) return false
      return true
    })
  )
}
