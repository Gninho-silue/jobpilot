import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractPdfText } from '@/lib/pdf/extract-text'

// Real PDFs, kept on the owner's machine only (test/fixtures/real-*/ is
// git-ignored). Skipped automatically where they are absent (CI). The committed,
// anonymised equivalent lives in test/fixtures/anonymized-2026-11-25/.
const DIR = fileURLToPath(new URL('../fixtures/real-2026-11-25/', import.meta.url))
const real = (name: string) => readFileSync(DIR + name)

describe.skipIf(!existsSync(DIR))('real PDFs of 2026-11-25 (local only)', () => {
  it('original CV: extracted text has no detached accent and no typographic hyphen', async () => {
    const { text } = await extractPdfText(real('original-cv.pdf'))
    expect(text).not.toMatch(/[´¨ˆ˜][A-Za-z]|\p{L}`[aeiou]/u)
    expect(text).not.toMatch(/[‐‑ ]/)
    expect(text).toMatch(/é/)
  })
})

describe.skipIf(!existsSync(DIR))('real PDFs of 2026-11-25: links (local only)', () => {
  it('original CV: the LinkedIn, GitHub and portfolio URLs survive extraction', async () => {
    const { links, text } = await extractPdfText(real('original-cv.pdf'))
    const hosts = links.map(url => new URL(url).hostname)
    expect(hosts.some(host => host.endsWith('linkedin.com'))).toBe(true)
    expect(hosts).toContain('github.com')
    expect(links.length).toBeGreaterThanOrEqual(5)
    expect(text).toMatch(/\nLinks: https:\/\//)
  })
})
