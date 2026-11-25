import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractPdfText } from '@/lib/pdf/extract-text'
import { generateCvPdf } from '@/lib/pdf/generate-cv-pdf'
import { extractCvFacts } from '@/lib/fact-check/cv-facts'
import { checkAdaptedCv } from '@/lib/fact-check/check-adapted-cv'
import { checkCoverLetter } from '@/lib/fact-check/check-cover-letter'
import { describeIssues } from '@/lib/fact-check/corrections'

// Anonymised copy of the real case of 2026-11-26 (see the README of the folder):
// a 3-page CV whose entry titles wrap onto a second line holding the date, with
// "Name / Page X of 3" at the bottom of every page.
const DIR = fileURLToPath(new URL('../fixtures/anonymized-2026-11-26/', import.meta.url))
const file = (name: string) => readFileSync(DIR + name)

const extracted = extractPdfText(file('original-cv.pdf'))
const ADAPTED = file('adapted-cv.llm.txt').toString('utf8')
const LETTER = file('cover-letter.txt').toString('utf8')

describe('3-page CV: extraction', () => {
  it('reads 3 pages and the link URLs; the repeated footer is gone and the name stays once, at the top', async () => {
    const { text, pages, links } = await extracted
    expect(pages).toBe(3)
    expect(links).toContain('https://www.linkedin.com/in/zoe-test')
    expect(text).not.toMatch(/Page \d of 3/)
    expect(text.split('\n').filter(line => line === 'Zoé Martin-Ferré')).toHaveLength(1)
    expect(text.startsWith('Zoé Martin-Ferré\n')).toBe(true)
  })
})

describe('3-page CV: facts per entry despite titles wrapped over two lines', () => {
  it('HireLoop and Banking Platform keep their own stack and figures', async () => {
    const facts = extractCvFacts((await extracted).text)
    const block = (name: string) => facts.blocks.find(b => b.header.startsWith(name))!

    expect(block('HireLoop').terms).toEqual(new Set(['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Clerk', 'Groq', 'Stripe']))
    expect(block('HireLoop').numbers).toEqual(new Set(['312']))
    expect([...block('Banking Platform').terms]).toEqual(expect.arrayContaining(['Java', 'Spring Boot', 'Kafka', 'MySQL']))
    expect(facts.blocks.some(b => b.header.startsWith('Full-stack engineer ('))).toBe(false)
  })
})

describe('adapted CV of 2026-11-26 (cut at ">DE", stacks lost)', () => {
  it('flags the lost Certifications & Languages section', async () => {
    const issues = checkAdaptedCv((await extracted).text, ADAPTED)
    expect(issues.filter(i => i.kind === 'section').map(i => i.unsupported)).toEqual([['Certifications & Languages']])
  })

  it('never asks the model to remove a technology or figure of the CV', async () => {
    const corrections = describeIssues(checkAdaptedCv((await extracted).text, ADAPTED)).join('\n')
    for (const kept of ['Next.js', 'Stripe', 'Prisma', 'Java', 'Spring Boot', 'PostgreSQL', '312']) {
      expect(corrections).not.toContain(kept)
    }
  })

  it('the faithful version (stacks restored) has no technology or number issue', async () => {
    const faithful = ADAPTED.replace(
      '>TECH: Spring Cloud · Kafka · MySQL · Keycloak · Testcontainers',
      '>TECH: Java 21 · Spring Boot 4 · Spring Cloud · Kafka · MySQL · Keycloak · Testcontainers'
    ).replace(
      '>TITLE: HireLoop\n>DATE: 2026',
      '>TITLE: HireLoop\n>TECH: Next.js · TypeScript · Prisma · PostgreSQL · Clerk · Groq · Stripe (test mode)\n>DATE: 2026'
    )
    const issues = checkAdaptedCv((await extracted).text, faithful)
    expect(issues.filter(i => ['technology', 'number', 'verify'].includes(i.kind))).toEqual([])
  })

  it('its PDF never prints the cut marker', async () => {
    const { text } = await extractPdfText(await generateCvPdf(ADAPTED))
    expect(text).not.toMatch(/>\s*[A-Z]{2,}/)
  })
})

describe('cover letter of 2026-11-26', () => {
  it('flags "for enterprise clients", absent from the CV', async () => {
    const claims = checkCoverLetter((await extracted).text, LETTER).filter(i => i.kind === 'claim')
    expect(claims.map(c => c.unsupported)).toEqual([['for enterprise clients']])
  })
})
