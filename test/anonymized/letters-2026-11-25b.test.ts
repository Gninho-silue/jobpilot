import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { extractPdfText } from '@/lib/pdf/extract-text'
import { checkCoverLetter } from '@/lib/fact-check/check-cover-letter'

// Sentences of the real cover letters of 2026-11-25 (anonymised like the
// 3-page CV fixture: Banking Platform, Northwind & Co, ERPNext 15, 180 tests…),
// checked against that anonymised CV.
let CV = ''
beforeAll(async () => {
  const pdf = readFileSync(fileURLToPath(new URL('../fixtures/anonymized-2026-11-26/original-cv.pdf', import.meta.url)))
  CV = (await extractPdfText(pdf)).text
})

const issuesOf = (letter: string) => checkCoverLetter(CV, letter)

describe('point 3: each sentence is attached to the right experience', () => {
  it('"During my Banking Platform project" is about Banking Platform, not the final-year project', () => {
    const letter =
      'During my Banking Platform project (2025-2026) I delivered idempotent money transfers with fixed-order row locking, verified by 25 concurrent transfers, and achieved 98% line coverage on the service layer with 180 automated tests.'
    expect(issuesOf(letter).filter(i => i.kind === 'merged')).toEqual([])
  })

  it('a closing paragraph about skills is not attached to a degree because it names "Fabrikam Engineering"', () => {
    const letter = [
      'Enfin, mon projet « Banking Platform » (2025-2026) a démontré ma capacité à implémenter des transferts idempotents vérifiés par 25 transferts concurrents.',
      'Je serais ravi de vous rencontrer pour discuter de la façon dont mon expérience en développement backend et mes compétences en Python peuvent contribuer aux projets de Fabrikam Engineering.',
    ].join('\n\n')
    const issues = issuesOf(letter)
    expect(issues.filter(i => i.entry?.includes('Engineering Degree'))).toEqual([])
    expect(issues.filter(i => i.kind === 'verify' && i.unsupported.includes('Python'))).toEqual([])
  })

  it('a new paragraph starts without the previous experience as context', () => {
    // Ollama is in the CV, but not in Banking Platform: in the same paragraph it would be "to verify".
    const letter = ['My Banking Platform project used Kafka and MySQL.', 'I also worked with Ollama.'].join('\n\n')
    expect(issuesOf(letter)).toEqual([])
  })
})
