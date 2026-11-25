import { describe, expect, it } from 'vitest'
import { checkAdaptedCv } from './check-adapted-cv'
import { checkCoverLetter } from './check-cover-letter'
import { entryLabel } from './cv-facts'

// Headers as the CV extraction builds them: heading, dates, then the first lines of the body.
describe('point 6: short entry labels (role · company · dates, or project · year)', () => {
  it.each([
    [
      'Full-Stack Developer Intern, Final Year Project (PFE), Northwind & Co, Lyon | January – May 2026 Built 7 custom ERPNext 15 Python modules for a B2B platform.',
      'Full-Stack Developer Intern · Northwind & Co · January – May 2026',
    ],
    [
      'Full-Stack Developer Intern (PFA), Northwind & Co, Lyon | June – September 2025 Designed and delivered an internship-management ERP.',
      'Full-Stack Developer Intern (PFA) · Northwind & Co · June – September 2025',
    ],
    ['Backend Developer, Acme Corp 2022 – 2024', 'Backend Developer · Acme Corp · 2022 – 2024'],
    [
      'Banking Platform | Java 21, Spring Boot 4, Kafka, MySQL | GitHub | 2025 – 2026 Extended a Spring Cloud course architecture.',
      'Banking Platform · 2025 – 2026',
    ],
    ['HireLoop | Next.js, TypeScript, Prisma | Live demo | 2026 AI job-search SaaS: CV tailoring.', 'HireLoop · 2026'],
    ['Engineering Degree in Computer Science, École d’Ingénieurs Exemple | 2023 – 2026', 'Engineering Degree in Computer Science · École d’Ingénieurs Exemple · 2023 – 2026'],
    ['Preparatory Classes (CPGE), MP/MPSI, Lycée Exemple Lyon | 2021 – 2023', 'Preparatory Classes (CPGE) · Lycée Exemple Lyon · 2021 – 2023'],
  ])('%s', (header, label) => {
    expect(entryLabel(header)).toBe(label)
  })

  it('a header without dates keeps its first line, without the body', () => {
    expect(entryLabel('Freelance web developer\nBuilt sites for 4 clients.')).toBe('Freelance web developer')
  })
})

const CV = [
  'Jane Doe',
  'Backend Developer',
  'Experience',
  'Backend Developer, Acme Corp 2022 – 2024',
  'Built four REST services with Node.js and cut latency by 30%.',
].join('\n')

describe('point 6: issues carry the short label', () => {
  it('cover letter', () => {
    const [issue] = checkCoverLetter(CV, 'At Acme Corp, I built four REST services with Node.js and Kafka.')
    expect(issue).toEqual(expect.objectContaining({ kind: 'technology', label: 'Backend Developer · Acme Corp · 2022 – 2024' }))
  })

  it('adapted CV', () => {
    const adapted = [
      'Jane Doe',
      'Backend Developer',
      'EXPERIENCE',
      '>TITLE: Backend Developer',
      '>COMPANY: Acme Corp',
      '>DATE: 2022 – 2024',
      '- Built four REST services with Node.js and Kafka.',
    ].join('\n')
    const issue = checkAdaptedCv(CV, adapted).find(i => i.kind === 'technology')
    expect(issue).toEqual(expect.objectContaining({ entry: 'Backend Developer', label: 'Backend Developer · Acme Corp · 2022 – 2024' }))
  })
})
