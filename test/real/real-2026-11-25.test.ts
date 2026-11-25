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

describe.skipIf(!existsSync(DIR))('real PDFs of 2026-11-25: facts (local only)', () => {
  it('original CV: title, experience blocks with their own stack (no Docker in the PFE, no Redis in the internship)', async () => {
    const { extractCvFacts } = await import('@/lib/fact-check/cv-facts')
    const facts = extractCvFacts((await extractPdfText(real('original-cv.pdf'))).text)

    expect(facts.title).toBe('AI Software Engineer')
    expect(facts.blocks.length).toBeGreaterThanOrEqual(6)
    const pfe = facts.blocks.find(b => /Final Year Project/.test(b.header))!
    const internship = facts.blocks.find(b => /Intern\b/.test(b.header))!
    expect(pfe.terms.has('Odoo')).toBe(true)
    expect(pfe.terms.has('Docker') || pfe.terms.has('GitHub Actions') || pfe.terms.has('CI/CD')).toBe(false)
    expect(internship.terms.has('Redis') || internship.terms.has('PostgreSQL')).toBe(false)
    expect(facts.terms.has('Redis')).toBe(true)
  })
})

const DIR_26 = fileURLToPath(new URL('../fixtures/real-2026-11-26/', import.meta.url))

describe.skipIf(!existsSync(DIR_26))('real PDFs of 2026-11-26: 3-page CV (local only)', () => {
  it('footers ("Name" + "Page X of 3") are removed; the name stays once, at the top', async () => {
    const { text } = await extractPdfText(readFileSync(DIR_26 + 'original-cv.pdf'))
    const lines = text.split('\n')
    expect(text).not.toMatch(/Page \d of 3/)
    expect(lines.filter(line => line === lines[0])).toHaveLength(1)
  })
})

describe.skipIf(!existsSync(DIR_26))('real PDFs of 2026-11-26: never remove what the CV contains (local only)', () => {
  // The two entries the production regeneration damaged: JobPilot lost its stack
  // and "Postgres-backed … Stripe webhooks"; Banking lost "Java 21 · Spring Boot 4".
  const ADAPTED = (cvTitle: string) => `Name
${cvTitle}
contact@example.test

PROJECTS
>TITLE: Banking Microservices
>TECH: Java 21 · Spring Boot 4 · Spring Cloud · Kafka · MySQL · Keycloak · Testcontainers
>DATE: 2025 – 2026
- 205 tests (JUnit, Mockito, Testcontainers with MySQL and Kafka), 100% line coverage on the service layer, CI across 7 services.

>TITLE: JobPilot
>TECH: Next.js · TypeScript · Prisma · PostgreSQL · Clerk · Groq · Stripe (test mode)
>DATE: 2026
- Postgres-backed rate limiting, atomic quotas, idempotent Stripe webhooks, signed URLs for private CV storage; 364 tests.`

  it('no removal is ever requested for Next.js, Stripe, Prisma, Java or Spring Boot, and "364" is not flagged', async () => {
    const { checkAdaptedCv } = await import('@/lib/fact-check/check-adapted-cv')
    const { describeIssues } = await import('@/lib/fact-check/corrections')
    const cvText = (await extractPdfText(readFileSync(DIR_26 + 'original-cv.pdf'))).text
    const title = cvText.split('\n')[1]!

    const issues = checkAdaptedCv(cvText, ADAPTED(title)).filter(i => i.kind !== 'section')
    const corrections = describeIssues(issues).join('\n')

    for (const term of ['Next.js', 'Stripe', 'Prisma', 'Java', 'Spring Boot', 'PostgreSQL']) {
      expect(corrections).not.toContain(term)
    }
    expect(issues.flatMap(i => i.unsupported)).not.toContain('364')
    expect(issues.filter(i => i.kind === 'technology' || i.kind === 'number')).toEqual([])
  })
})

describe.skipIf(!existsSync(DIR_26))('real PDFs of 2026-11-26: cover letter (local only)', () => {
  it('"enterprise clients" is flagged as a claim the CV does not support', async () => {
    const { checkCoverLetter } = await import('@/lib/fact-check/check-cover-letter')
    const cvText = (await extractPdfText(readFileSync(DIR_26 + 'original-cv.pdf'))).text
    const letter = (await extractPdfText(readFileSync(DIR_26 + 'cover-letter.pdf'))).text
    // The letter body: from the greeting line to the closing (header lines dropped).
    const body = letter.slice(letter.indexOf('I am excited')).split('\n').slice(0, -1).join(' ')

    const claims = checkCoverLetter(cvText, body).filter(i => i.kind === 'claim')
    expect(claims.map(c => c.unsupported)).toContainEqual(['for enterprise clients'])
  })
})

const DIR_25B = fileURLToPath(new URL('../fixtures/real-2026-11-25b/', import.meta.url))

/** Letter body from its PDF: from the first sentence to the line before the signature. */
async function letterBody(name: string): Promise<string> {
  const lines = (await extractPdfText(readFileSync(DIR_25B + name))).text.split('\n')
  const start = lines.findIndex(line => /^(I am|Capgemini|Je |Madame|Dear)/.test(line))
  return lines.slice(start, -1).join(' ')
}

describe.skipIf(!existsSync(DIR_25B) || !existsSync(DIR_26))('real letters of 2026-11-25 (local only)', () => {
  it('point 3: the Banking sentence is not attached to the final-year project; the closing line is not attached to the degree', async () => {
    const { checkCoverLetter } = await import('@/lib/fact-check/check-cover-letter')
    const cvText = (await extractPdfText(readFileSync(DIR_26 + 'original-cv.pdf'))).text

    const english = checkCoverLetter(cvText, await letterBody('cover-letter-management-solutions.pdf'))
    expect(english.filter(i => i.kind === 'merged' && /Banking/.test(i.line))).toEqual([])

    const french = checkCoverLetter(cvText, await letterBody('cover-letter-capgemini-fr.pdf'))
    expect(french.filter(i => i.entry?.includes('Engineering Degree'))).toEqual([])
  })

  it('point 4: "cinq modules Odoo 17" is a figure different from the CV (9), not a merge', async () => {
    const { checkCoverLetter } = await import('@/lib/fact-check/check-cover-letter')
    const cvText = (await extractPdfText(readFileSync(DIR_26 + 'original-cv.pdf'))).text
    const french = checkCoverLetter(cvText, await letterBody('cover-letter-capgemini-fr.pdf'))
    const modules = french.filter(i => /cinq modules/.test(i.line))
    expect(modules).toEqual([expect.objectContaining({ kind: 'number', unsupported: ['5'], expected: '9' })])
  })
})
