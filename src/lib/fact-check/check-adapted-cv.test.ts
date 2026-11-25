import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeTypography } from '@/lib/text/typography'
import { checkAdaptedCv } from './check-adapted-cv'

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../test/fixtures/anonymized-2026-11-25/${name}`, import.meta.url)), 'utf8')

const ORIGINAL = normalizeTypography(fixture('original-cv.txt'))
const ADAPTED = fixture('adapted-cv.llm.txt')

describe('checkAdaptedCv — real case of 2026-11-25 (anonymised)', () => {
  const issues = checkAdaptedCv(ORIGINAL, ADAPTED)

  it('flags the changed title', () => {
    expect(issues).toContainEqual(
      expect.objectContaining({
        kind: 'title',
        unsupported: ['Digital Transformation Consultant'],
        expected: 'AI Software Engineer',
      })
    )
  })

  // These skills are in the CV's skills section: flagged "to verify", never sent as removals.
  it('flags CI/CD, Docker and GitHub Actions added to the final-year project (to verify)', () => {
    expect(issues).toContainEqual(
      expect.objectContaining({
        kind: 'verify',
        entry: 'Full-Stack Developer – Final Year Project (PFE)',
        line: '- Applied CI/CD pipelines with Docker and GitHub Actions to ensure reliable deployments and rapid iteration.',
        unsupported: ['CI/CD', 'Docker', 'GitHub Actions'],
      })
    )
  })

  it('flags PostgreSQL and Redis added to the internship (to verify)', () => {
    expect(issues).toContainEqual(
      expect.objectContaining({
        kind: 'verify',
        entry: 'Full-Stack Developer Intern',
        line: '- Integrated backend services with PostgreSQL and Redis, reinforcing data consistency and performance under concurrent access.',
        unsupported: ['PostgreSQL', 'Redis'],
      })
    )
  })

  it('flags nothing else: rewordings ("seven" = 7, "five-state" = 5-state, "Groq AI" = Groq) are accepted', () => {
    expect(issues).toHaveLength(3)
  })

  it('accepts a title variant the user explicitly approved', () => {
    const approved = checkAdaptedCv(ORIGINAL, ADAPTED, { approvedTitles: ['Digital Transformation Consultant'] })
    expect(approved.filter(i => i.kind === 'title')).toEqual([])
  })
})

// The plan's cases, on a small CV.
const CV = `Jane Doe
Backend Developer
jane@example.test
EXPERIENCE
Backend Developer  March 2022 – June 2024
Acme Corp, Paris
- Built 4 REST services with Node.js and PostgreSQL, cutting latency by 30%
SKILLS
Node.js, PostgreSQL, Docker`

const adapted = (bullet: string, extra: { company?: string; date?: string; skills?: string; title?: string } = {}) => `Jane Doe
${extra.title ?? 'Backend Developer'} | Node.js · PostgreSQL
jane@example.test

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: ${extra.company ?? 'Acme Corp'}
>DATE: ${extra.date ?? 'March 2022 – June 2024'}
- ${bullet}

TECHNICAL SKILLS
Backend: ${extra.skills ?? 'Node.js · PostgreSQL · Docker'}
`

describe('checkAdaptedCv — plan cases', () => {
  it('a faithful adaptation has no issue', () => {
    expect(checkAdaptedCv(CV, adapted('Built four REST services with Node.js and PostgreSQL, reducing latency by 30%.'))).toEqual([])
  })

  it('invented skill in an experience', () => {
    const issues = checkAdaptedCv(CV, adapted('Built 4 REST services with Node.js, PostgreSQL and Kafka.'))
    expect(issues).toEqual([expect.objectContaining({ kind: 'technology', unsupported: ['Kafka'] })])
  })

  it('invented skill in the skills section (absent from the whole CV)', () => {
    const issues = checkAdaptedCv(CV, adapted('Built 4 REST services.', { skills: 'Node.js · PostgreSQL · Docker · Kubernetes' }))
    expect(issues).toEqual([expect.objectContaining({ kind: 'technology', entry: 'TECHNICAL SKILLS', unsupported: ['Kubernetes'] })])
  })

  it('a skill from elsewhere in the CV is fine in the skills section, and only "to verify" in an experience', () => {
    expect(checkAdaptedCv(CV, adapted('Built 4 REST services.', { skills: 'Docker' }))).toEqual([])
    const issues = checkAdaptedCv(CV, adapted('Containerised 4 REST services with Docker.'))
    expect(issues).toEqual([expect.objectContaining({ kind: 'verify', unsupported: ['Docker'] })])
  })

  it('invented company', () => {
    const issues = checkAdaptedCv(CV, adapted('Built 4 REST services.', { company: 'Globex' }))
    expect(issues).toEqual([expect.objectContaining({ kind: 'company', unsupported: ['Globex'] })])
  })

  it('inflated number', () => {
    const issues = checkAdaptedCv(CV, adapted('Built 4 REST services, cutting latency by 60%.'))
    expect(issues).toEqual([expect.objectContaining({ kind: 'number', unsupported: ['60%'] })])
  })

  it('changed dates', () => {
    const issues = checkAdaptedCv(CV, adapted('Built 4 REST services.', { date: 'March 2021 – June 2024' }))
    expect(issues).toEqual([expect.objectContaining({ kind: 'date', unsupported: ['2021'] })])
  })

  it('changed title', () => {
    const issues = checkAdaptedCv(CV, adapted('Built 4 REST services.', { title: 'Senior Platform Architect' }))
    expect(issues).toEqual([expect.objectContaining({ kind: 'title', unsupported: ['Senior Platform Architect'], expected: 'Backend Developer' })])
  })

  it('every issue carries a stable id and the exact line of the adapted CV it is about', () => {
    const text = adapted('Built 4 REST services with Kafka.')
    const [issue] = checkAdaptedCv(CV, text)
    expect(text.split('\n')).toContain(issue!.line)
    expect(issue!.id).toMatch(/^[a-z]+-\d+$/)
    expect(checkAdaptedCv(CV, text)[0]!.id).toBe(issue!.id)
  })
})

describe('checkAdaptedCv — sections removed from the CV', () => {
  const withoutLastSection = ADAPTED.slice(0, ADAPTED.indexOf('CERTIFICATIONS & LANGUAGES'))

  it('flags every section of the original CV that the adapted CV lost (the production CV ended at "ESTEM Casablanca")', () => {
    const issues = checkAdaptedCv(ORIGINAL, withoutLastSection).filter(i => i.kind === 'section')
    expect(issues.map(i => i.unsupported)).toEqual([['Certifications & Languages']])
  })

  it('a section kept under another wording (French heading, "AI Projects" → "PROJECTS") is not flagged', () => {
    const french = ADAPTED.replace('CERTIFICATIONS & LANGUAGES', 'CERTIFICATIONS ET LANGUES').replace('PROJECTS', 'PROJETS')
    expect(checkAdaptedCv(ORIGINAL, french).filter(i => i.kind === 'section')).toEqual([])
  })

  it('the faithful real-case adaptation keeps all its sections', () => {
    expect(checkAdaptedCv(ORIGINAL, ADAPTED).filter(i => i.kind === 'section')).toEqual([])
  })
})

describe('checkAdaptedCv — never ask to remove what the CV contains', () => {
  const ORIGINAL_3P = `Zoé Martin-Ferré
Backend Engineer | Java 21 · Spring Boot
candidate_test@example.com
Profile
Engineering graduate (June 2026).
Projects
Banking Platform | Java 21, Spring Boot 4, Spring Cloud, Kafka, MySQL | GitHub | 2025 –
2026
205 tests (JUnit, Testcontainers), 100% line coverage on the service layer.
HireLoop | Next.js, TypeScript, Prisma, PostgreSQL, Clerk, Groq, Stripe (test mode) | Live
demo | 2026
Postgres-backed rate limiting, idempotent Stripe webhooks; 364 tests.
Technical Skills
Backend: Java 21, Spring Boot, Docker, Kubernetes`

  const adapted = (extra = '') => `Zoé Martin-Ferré
Backend Engineer | Java 21 · Spring Boot
candidate_test@example.com

PROFILE
Engineering graduate (June 2026).

PROJECTS
>TITLE: Banking Platform
>TECH: Java 21 · Spring Boot 4 · Spring Cloud · Kafka · MySQL
>DATE: 2025 – 2026
- 205 tests, 100% line coverage on the service layer.

>TITLE: HireLoop
>TECH: Next.js · TypeScript · Prisma · PostgreSQL · Clerk · Groq · Stripe (test mode)
>DATE: 2026
- Postgres-backed rate limiting, idempotent Stripe webhooks; 364 tests.${extra}

TECHNICAL SKILLS
Backend: Java 21 · Spring Boot · Docker · Kubernetes
`

  it('the real case: no issue at all for the HireLoop and Banking stacks, nor for "364 tests"', () => {
    expect(checkAdaptedCv(ORIGINAL_3P, adapted())).toEqual([])
  })

  it('a term that is in the CV, but not under this entry, is only "to verify" and never a removal', () => {
    const issues = checkAdaptedCv(ORIGINAL_3P, adapted('\n- Deployed with Docker and Kubernetes.'))
    expect(issues).toEqual([expect.objectContaining({ kind: 'verify', entry: 'HireLoop', unsupported: ['Docker', 'Kubernetes'] })])
  })

  it('a term absent from the whole CV is still an invention to remove', () => {
    const issues = checkAdaptedCv(ORIGINAL_3P, adapted('\n- Deployed with Terraform.'))
    expect(issues).toEqual([expect.objectContaining({ kind: 'technology', unsupported: ['Terraform'] })])
  })

  it('an entry that matches no block of the CV is checked against the whole CV, not against the first block of that year', () => {
    const unknown = adapted().replace('>TITLE: HireLoop', '>TITLE: Side Project')
    expect(checkAdaptedCv(ORIGINAL_3P, unknown)).toEqual([])
  })
})
