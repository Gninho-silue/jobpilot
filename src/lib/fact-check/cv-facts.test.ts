import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeTypography } from '@/lib/text/typography'
import { extractCvFacts, findTerms, numbersIn } from './cv-facts'

// cvText as stored after upload (extractPdfText normalises typography).
const ORIGINAL = normalizeTypography(
  readFileSync(fileURLToPath(new URL('../../../test/fixtures/anonymized-2026-11-25/original-cv.txt', import.meta.url)), 'utf8')
)

describe('findTerms (technology vocabulary)', () => {
  it('finds known technologies and returns their canonical name', () => {
    expect(findTerms('Built with React.js, Postgres, k8s and GitHub Actions; CI/CD on Node.js')).toEqual(
      new Set(['React', 'PostgreSQL', 'Kubernetes', 'GitHub Actions', 'CI/CD', 'Node.js'])
    )
  })

  it('does not confuse close names or ordinary words', () => {
    expect(findTerms('JavaScript developer, express interest, go further')).toEqual(new Set(['JavaScript']))
    expect(findTerms('Java and Express.js')).toEqual(new Set(['Java', 'Express']))
    expect(findTerms('my GitHub profile')).toEqual(new Set())
  })
})

describe('numbersIn', () => {
  it('collects counts, percentages and "N+" with number words as digits', () => {
    expect(numbersIn('nine modules, 95% fewer errors, 14 models, 6+ months, five-state workflow, 12 KPIs')).toEqual(
      new Set(['9', '95%', '14', '6+', '5', '12'])
    )
  })

  it('ignores years and version numbers attached to a product', () => {
    expect(numbersIn('Odoo 17 in 2026, React 18, Spring Boot 3, from 2023 to 2025')).toEqual(new Set())
  })
})

describe('extractCvFacts on the anonymised real CV', () => {
  const facts = extractCvFacts(ORIGINAL)

  it('reads the title from the line after the name', () => {
    expect(facts.name).toBe('Zoé Martin-Ferré')
    expect(facts.title).toBe('AI Software Engineer')
  })

  it('splits experiences, projects and degrees into blocks, each with its own facts', () => {
    const pfe = facts.blocks.find(b => b.header.includes('Final Year Project'))!
    expect(pfe.header).toContain('January – May 2026')
    expect(pfe.terms).toEqual(new Set(['Odoo', 'Python', 'QWeb', 'SCSS', 'PostgreSQL', 'Flutter', 'iOS', 'Android']))
    expect(pfe.numbers).toEqual(new Set(['7', '95%', '14', '35%']))

    const internship = facts.blocks.find(b => b.header.includes('Intern'))!
    expect(internship.header).toContain('June – September 2025')
    expect(internship.terms).toEqual(new Set(['Python']))
    expect(internship.numbers).toEqual(new Set(['5', '45%', '12', '6+']))
    expect(internship.terms.has('Redis')).toBe(false)
    expect(pfe.terms.has('Docker')).toBe(false)
  })

  it('project blocks keep their own stack', () => {
    const hireloop = facts.blocks.find(b => b.header.startsWith('HireLoop'))!
    expect(hireloop.terms).toEqual(new Set(['Next.js', 'TypeScript', 'Groq', 'Stripe', 'Supabase']))
  })

  it('collects every term, number and year of the whole CV', () => {
    for (const term of ['Redis', 'Docker', 'GitHub Actions', 'CI/CD', 'Kubernetes', 'LangGraph']) expect(facts.terms).toContain(term)
    for (const year of ['2021', '2023', '2025', '2026']) expect(facts.years).toContain(year)
    expect(facts.numbers).toEqual(expect.objectContaining({}))
    expect([...facts.numbers]).toEqual(expect.arrayContaining(['7', '95%', '14', '35%', '5', '45%', '12', '6+']))
  })
})

describe('extractCvFacts on a French CV', () => {
  const facts = extractCvFacts(`Jean Dupont
Développeur Backend
jean@example.test | +33 6 00 00 00 00
EXPÉRIENCE PROFESSIONNELLE
Développeur Java – Stage  Février – Juillet 2024
Acme SA, Paris
• Migration de 3 services vers Spring Boot, temps de réponse réduit de 40 %
COMPÉTENCES
Java, Spring Boot, Docker`)

  it('reads title, blocks, French months and spaced percentages', () => {
    expect(facts.title).toBe('Développeur Backend')
    const job = facts.blocks.find(b => b.header.includes('Février – Juillet 2024'))!
    expect(job.terms).toEqual(new Set(['Java', 'Spring Boot']))
    expect(job.numbers).toEqual(new Set(['3', '40%']))
    expect(facts.terms).toEqual(new Set(['Spring Boot', 'Java', 'Docker']))
  })
})

describe('extractCvFacts — date ranges written with an ASCII hyphen', () => {
  it('keeps "2019 - 2022" lines as dated blocks (they are not phone numbers)', () => {
    const facts = extractCvFacts(`Ana Lima
Data Engineer
ana@example.test | 06 12 34 56 78
EXPERIENCE
Data Engineer, Globex 2019 - 2022
- Built 4 Kafka pipelines`)
    expect(facts.blocks).toHaveLength(1)
    expect(facts.blocks[0]!.header).toBe('Data Engineer, Globex 2019 - 2022')
    expect(facts.blocks[0]!.terms).toEqual(new Set(['Kafka']))
    expect(facts.numbers).toEqual(new Set(['4']))
  })
})
