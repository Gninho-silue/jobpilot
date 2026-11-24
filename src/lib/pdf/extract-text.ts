import { extractText } from 'unpdf'

export interface ExtractedPdf {
  /** Text of every page, pages separated by a blank line, trimmed. Empty for a scan. */
  text: string
  pages: number
}

/**
 * Extracts the text layer of a PDF with unpdf (a serverless build of Mozilla's
 * pdf.js). Throws when the bytes are not a readable PDF.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdf> {
  // pdf.js takes ownership of (and may detach) the array it is given: pass a copy
  // so the caller can still upload the original buffer.
  const { totalPages, text } = await extractText(new Uint8Array(buffer), { mergePages: false })
  return {
    pages: totalPages,
    text: text.map(page => page.trim()).filter(Boolean).join('\n\n'),
  }
}
