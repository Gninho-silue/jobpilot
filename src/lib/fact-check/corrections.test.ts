import { describe, expect, it } from 'vitest'
import { describeIssues } from './corrections'
import type { FactIssue } from './check-adapted-cv'

const issue = (over: Partial<FactIssue>): FactIssue => ({ id: 'x-1', kind: 'technology', line: '', lineIndex: 1, unsupported: [], ...over })

describe('describeIssues', () => {
  it('turns each issue into a correction the model can apply', () => {
    expect(
      describeIssues([
        issue({ kind: 'title', unsupported: ['Digital Transformation Consultant'], expected: 'AI Software Engineer' }),
        issue({ kind: 'technology', entry: 'Full-Stack Developer Intern', unsupported: ['PostgreSQL', 'Redis'] }),
        issue({ kind: 'technology', entry: 'TECHNICAL SKILLS', unsupported: ['Kubernetes'] }),
        issue({ kind: 'number', entry: 'Backend Developer', unsupported: ['60%'] }),
        issue({ kind: 'company', entry: 'Backend Developer', unsupported: ['Globex'] }),
        issue({ kind: 'date', entry: 'Backend Developer', unsupported: ['2021'] }),
      ])
    ).toEqual([
      'Use the job title "AI Software Engineer" exactly, not "Digital Transformation Consultant".',
      'In "Full-Stack Developer Intern": remove PostgreSQL, Redis (the CV does not list them for this experience).',
      'In "TECHNICAL SKILLS": remove Kubernetes (not in the CV).',
      'In "Backend Developer": use the numbers of the CV, not 60%.',
      'In "Backend Developer": use the company name of the CV, not "Globex".',
      'In "Backend Developer": use the dates of the CV, not 2021.',
    ])
  })
})
