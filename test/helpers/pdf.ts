import { getDocumentProxy } from 'unpdf'

/** URLs of the link annotations of a PDF, in page order. */
export async function pdfLinkUrls(pdfBytes: Buffer | Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBytes))
  const urls: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    for (const annotation of await (await pdf.getPage(p)).getAnnotations()) {
      if (annotation.subtype === 'Link' && annotation.url) urls.push(annotation.url as string)
    }
  }
  return urls
}
