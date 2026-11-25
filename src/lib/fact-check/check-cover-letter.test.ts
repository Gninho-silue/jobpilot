import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeTypography } from '@/lib/text/typography'
import { checkCoverLetter } from './check-cover-letter'

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../test/fixtures/anonymized-2026-11-25/${name}`, import.meta.url)), 'utf8')

const ORIGINAL = normalizeTypography(fixture('original-cv.txt'))

// The letter body as the model wrote it: the fixture is the text of the PDF
// (header lines, wrapped lines, and the "/%" rendering bug fixed since).
const LETTER = fixture('cover-letter.txt')
  .split('\n')
  .slice(5)
  .filter(line => line && line !== 'Zoe Martin-Ferre')
  .join(' ')
  .replace(/(\d)\/(%)/g, '$1$2')
  .replace(/([A-Za-z])\/(\d)/g, '$1 $2')

describe('checkCoverLetter — real case of 2026-11-25 (anonymised)', () => {
  const issues = checkCoverLetter(ORIGINAL, LETTER)

  it('flags the claim about the candidate that is not in the CV', () => {
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'claim', line: expect.stringContaining('I have closely followed Contoso Consulting') })
    )
  })

  it('flags the internship achievements attributed to the final year (merged experiences)', () => {
    expect(issues).toContainEqual(
      expect.objectContaining({
        kind: 'merged',
        line: expect.stringContaining('I also automated a five state internship workflow'),
        entry: expect.stringContaining('Final Year Project'),
        unsupported: expect.arrayContaining(['5', '45%']),
      })
    )
  })

  it('flags nothing else (the final-year sentence and the project sentence are faithful)', () => {
    expect(issues.map(i => i.kind).sort()).toEqual(['claim', 'merged'])
  })
})

const CV = `Jane Doe
Backend Developer
jane@example.test
EXPERIENCE
Backend Developer, Acme Corp  2022 – 2024
- Built 4 REST services with Node.js, cutting latency by 30%
Data Intern, Globex  Summer 2021
- Cleaned 12 datasets with Python
PROJECTS
Weatherly | React, TypeScript 2023
- Weather dashboard`

describe('checkCoverLetter — small cases', () => {
  it('a faithful letter has no issue', () => {
    const letter =
      'I am applying for the Backend Engineer role. At Acme Corp, I built four REST services with Node.js and cut latency by 30%. ' +
      'During my internship at Globex, I cleaned 12 datasets with Python. I also built Weatherly, a React dashboard.'
    expect(checkCoverLetter(CV, letter)).toEqual([])
  })

  it('an achievement moved to another experience is flagged', () => {
    const letter = 'At Acme Corp, I built four REST services. I also cleaned 12 datasets with Python.'
    expect(checkCoverLetter(CV, letter)).toEqual([
      expect.objectContaining({ kind: 'merged', unsupported: ['12'], entry: 'Backend Developer, Acme Corp 2022 – 2024' }),
    ])
  })

  it('a technology the CV does not list for that experience is flagged', () => {
    expect(checkCoverLetter(CV, 'At Acme Corp, I built four REST services with Node.js and Kafka.')).toEqual([
      expect.objectContaining({ kind: 'technology', unsupported: ['Kafka'] }),
    ])
  })

  it('a number absent from the CV is flagged', () => {
    expect(checkCoverLetter(CV, 'I cut latency by 70%.')).toEqual([expect.objectContaining({ kind: 'number', unsupported: ['70%'] })])
  })

  it.each([
    'I have always admired your products.',
    'I have been following your company for years.',
    'As a long-time user of your app, I know it well.',
    'Je suis depuis longtemps les projets de votre entreprise.',
    "J'ai toujours admiré votre approche.",
  ])('claim about the candidate: %s', sentence => {
    expect(checkCoverLetter(CV, sentence)).toEqual([expect.objectContaining({ kind: 'claim' })])
  })

  it('interest based on the offer is fine', () => {
    expect(checkCoverLetter(CV, 'Your offer mentions a REST platform, which matches my experience.')).toEqual([])
  })
})

describe('checkCoverLetter — never ask to remove what the CV contains', () => {
  it('a technology of the CV mentioned under another experience is only "to verify", and not sent to the model', async () => {
    const { describeLetterIssues } = await import('./corrections')
    const issues = checkCoverLetter(CV, 'At Acme Corp, I built four REST services with Node.js and TypeScript.')
    expect(issues).toEqual([expect.objectContaining({ kind: 'verify', unsupported: ['TypeScript'] })])
    expect(describeLetterIssues(issues)).toEqual([])
  })
})

describe('checkCoverLetter — claims about the candidate’s clients', () => {
  // From the cover letter of 2026-11-26: nothing in the CV mentions clients.
  const SENTENCE =
    'The role aligns perfectly with my background in building robust, test-driven backend systems and delivering end-to-end solutions for enterprise clients.'

  it('"enterprise clients" absent from the CV is a claim', () => {
    expect(checkCoverLetter(CV, SENTENCE)).toEqual([expect.objectContaining({ kind: 'claim', line: SENTENCE })])
  })

  it.each([
    'I delivered solutions for Fortune 500 clients.',
    'I worked with major international customers.',
    "J'ai livré des projets auprès de grands comptes.",
  ])('other clientele claims: %s', sentence => {
    expect(checkCoverLetter(CV, sentence)).toEqual([expect.objectContaining({ kind: 'claim' })])
  })

  it('not flagged when the CV itself mentions those clients', () => {
    expect(checkCoverLetter(`${CV}\n- Delivered dashboards for enterprise clients`, SENTENCE)).toEqual([])
  })
})
