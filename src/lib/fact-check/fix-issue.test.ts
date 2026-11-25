import { describe, expect, it } from 'vitest'
import { checkAdaptedCv } from './check-adapted-cv'
import { applyIssueFix, isFixable } from './fix-issue'

const CV = `Jane Doe
Backend Developer
jane@example.test
EXPERIENCE
Backend Developer  March 2022 – June 2024
Acme Corp, Paris
- Built 4 REST services with Node.js and PostgreSQL
SKILLS
Node.js, PostgreSQL, Docker`

const ADAPTED = `Jane Doe
Platform Architect | Node.js · PostgreSQL
jane@example.test

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Globex
>DATE: March 2022 – June 2024
- Built 4 REST services with Node.js and PostgreSQL.
- Ran Kafka pipelines for 4 services.

PROJECTS
>TITLE: Side project
>TECH: Node.js · Kafka · PostgreSQL
>DATE: 2022
- Small API.

TECHNICAL SKILLS
Backend: Node.js · PostgreSQL · Kubernetes · Docker
`

const issues = checkAdaptedCv(CV, ADAPTED)
const byKind = (kind: string, unsupported?: string) =>
  issues.find(i => i.kind === kind && (!unsupported || i.unsupported.includes(unsupported)))!

describe('applyIssueFix', () => {
  it('title: restores the original title and keeps the skills after " | "', () => {
    const fixed = applyIssueFix(ADAPTED, byKind('title'))
    expect(fixed.split('\n')[1]).toBe('Backend Developer | Node.js · PostgreSQL')
  })

  it('experience bullet: removes the line', () => {
    const fixed = applyIssueFix(ADAPTED, byKind('technology', 'Kafka'))
    expect(fixed).not.toContain('Ran Kafka pipelines')
    expect(fixed).toContain('- Built 4 REST services with Node.js and PostgreSQL.')
  })

  it('list line (>TECH: or skills): removes only the unsupported items', () => {
    const tech = issues.find(i => i.line.startsWith('>TECH:'))!
    expect(applyIssueFix(ADAPTED, tech)).toContain('>TECH: Node.js · PostgreSQL\n')
    expect(applyIssueFix(ADAPTED, byKind('technology', 'Kubernetes'))).toContain('Backend: Node.js · PostgreSQL · Docker\n')
  })

  it('after every fixable fix, the checker only reports what cannot be fixed in one click', () => {
    let text = ADAPTED
    for (let pass = 0; pass < 10; pass++) {
      const next = checkAdaptedCv(CV, text).find(isFixable)
      if (!next) break
      text = applyIssueFix(text, next)
    }
    expect(checkAdaptedCv(CV, text).map(i => i.kind)).toEqual(['company'])
  })

  it('company and date issues have no one-click fix', () => {
    expect(isFixable(byKind('company'))).toBe(false)
    expect(() => applyIssueFix(ADAPTED, byKind('company'))).toThrow()
  })

  it('refuses a stale issue (its line is no longer in the text)', () => {
    const issue = byKind('technology', 'Kafka')
    const edited = ADAPTED.replace(issue.line, '- Something else.')
    expect(() => applyIssueFix(edited, issue)).toThrow(/stale/i)
  })
})
