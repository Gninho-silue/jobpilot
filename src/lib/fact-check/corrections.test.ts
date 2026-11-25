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

describe('describeLetterIssues', () => {
  it('turns each letter issue into a correction', async () => {
    const { describeLetterIssues } = await import('./corrections')
    expect(
      describeLetterIssues([
        { id: 'claim-2', kind: 'claim', line: 'I have closely followed Contoso.', lineIndex: 2, unsupported: [] },
        { id: 'merged-5', kind: 'merged', entry: 'Final Year Project 2026', line: 'I also automated a workflow.', lineIndex: 5, unsupported: ['45%', '5'] },
        { id: 'technology-6', kind: 'technology', entry: 'Acme Corp', line: 'I used Kafka.', lineIndex: 6, unsupported: ['Kafka'] },
        { id: 'number-7', kind: 'number', line: 'I cut latency by 70%.', lineIndex: 7, unsupported: ['70%'] },
        { id: 'number-8', kind: 'number', entry: 'Final Year Project', line: 'I built five modules.', lineIndex: 8, unsupported: ['5'], expected: '7' },
      ])
    ).toEqual([
      'Remove this sentence, the CV does not support it: "I have closely followed Contoso."',
      'This sentence attributes to "Final Year Project 2026" facts (45%, 5) that belong to another experience of the CV: name the right experience for each fact, with its company and dates: "I also automated a workflow."',
      'Do not attribute Kafka to "Acme Corp": "I used Kafka."',
      'Use only numbers from the CV, not 70%: "I cut latency by 70%."',
      'The CV says 7, not 5, for "Final Year Project": "I built five modules."',
    ])
  })
})

describe('describeIssues — missing section', () => {
  it('asks to keep the section', () => {
    expect(
      describeIssues([{ id: 'section-0', kind: 'section', line: '', lineIndex: 0, unsupported: ['Certifications & Languages'] }])
    ).toEqual(['Keep the "Certifications & Languages" section of the CV, with all its entries.'])
  })
})

describe('actionableIssues — what the regeneration may be asked to change', () => {
  it('drops "verify" issues: a term that exists in the CV is never sent as a removal', async () => {
    const { actionableIssues } = await import('./corrections')
    const verify = { id: 'verify-3', kind: 'verify' as const, entry: 'HireLoop', line: '- x', lineIndex: 3, unsupported: ['Next.js', 'Stripe', 'Prisma'] }
    const invented = { id: 'technology-4', kind: 'technology' as const, entry: 'HireLoop', line: '- y', lineIndex: 4, unsupported: ['Terraform'] }
    expect(actionableIssues([verify, invented])).toEqual([invented])
    expect(describeIssues(actionableIssues([verify])).join(' ')).not.toMatch(/Next\.js|Stripe|Prisma/)
  })
})
