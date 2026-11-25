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
  const body = text.map(page => normalizeTypography(page).trim()).filter(Boolean).join('\n\n')

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
