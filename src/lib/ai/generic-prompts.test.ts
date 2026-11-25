import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { groqCall, mockCompletion } from '@test/mocks/groq'
import { adaptResume } from './adapt-resume'
import { generateCoverLetter } from './generate-cover-letter'
import { generateInterviewQuestions } from './generate-interview-questions'
import { generateInterviewFeedback } from './interview-feedback'
import { parseJobOffer } from './parse-offer'

// Prompts serve every user: they must not describe one person's career (the
// first version cited the author's employer, internships and projects).
const FORBIDDEN = [/techpal/i, /devscope/i, /jobpilot/i, /agentflow/i, /\bPFE/i, /\bPFA\b/i, /synertic/i]

const DIR = fileURLToPath(new URL('.', import.meta.url))
const PROMPT_SOURCES = readdirSync(DIR).filter(name => name.endsWith('.ts') && !name.includes('.test.'))

const CV = 'Jane Doe\nBackend Developer\njane@example.test'
const OFFER = 'Globex hires a Backend Engineer.'

describe('prompts are generic (no one’s career in them)', () => {
  it.each(PROMPT_SOURCES)('source %s contains none of the forbidden terms', name => {
    const source = readFileSync(DIR + name, 'utf8')
    for (const term of FORBIDDEN) expect(source, `${name} matches ${term}`).not.toMatch(term)
  })

  it.each([
    ['adaptResume FR', () => adaptResume(CV, OFFER, 'FR')],
    ['adaptResume EN', () => adaptResume(CV, OFFER, 'EN')],
    ['generateCoverLetter FR', () => generateCoverLetter(CV, OFFER, 'Globex', 'Ingénieur', 'FR')],
    ['generateCoverLetter EN', () => generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', 'EN')],
    ['generateInterviewQuestions FR', () => generateInterviewQuestions(CV, OFFER, 'Globex', 'Ingénieur', 'FR')],
    ['generateInterviewFeedback EN', () => generateInterviewFeedback('Why us?', 'Because of the mission.', 'behavioral', 'EN')],
    ['parseJobOffer', () => parseJobOffer(OFFER, 'FR')],
  ])('%s: the system message contains none of the forbidden terms', async (_name, run) => {
    mockCompletion('[]')
    await run()
    const system = groqCall().messages[0]?.content ?? ''
    for (const term of FORBIDDEN) expect(system).not.toMatch(term)
  })
})

describe('truthfulness rules reach the model', () => {
  it('adapted CV: own title, per-experience tools, no new numbers, demo stays demo', async () => {
    mockCompletion('x')
    await adaptResume(CV, OFFER, 'EN')
    const system = groqCall().messages[0]?.content ?? ''
    expect(system).toContain("Keep the candidate's own job title")
    expect(system).toContain('ONLY the tools, technologies and achievements the CV lists FOR THAT experience')
    expect(system).toContain('Never add a company, school, job title, date, degree, certification or number')
    expect(system).toContain('test-mode')
  })

  it.each([
    ['EN', 'never merge two experiences', 'No claim about the candidate that is not in the CV'],
    ['FR', 'ne fusionne jamais deux expériences', 'Aucune affirmation sur le candidat absente du CV'],
  ] as const)('cover letter %s: no merged experiences, no invented claims', async (language, merge, claims) => {
    mockCompletion('x')
    await generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', language)
    const system = groqCall().messages[0]?.content ?? ''
    expect(system).toContain(merge)
    expect(system).toContain(claims)
  })
})

describe('cover letter: CI never becomes deployment', () => {
  it.each([
    ['EN', 'Continuous integration (CI) never becomes continuous deployment'],
    ['FR', "L'intégration continue (CI) ne devient jamais du déploiement continu"],
  ] as const)('%s: the rule reaches the model', async (language, rule) => {
    mockCompletion('x')
    await generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', language)
    expect(groqCall().messages[0]?.content ?? '').toContain(rule)
  })
})

describe('cover letter: short sentences, an opening that does not paraphrase the offer', () => {
  it.each([
    ['EN', 'Every sentence has 30 words or fewer', 'never paraphrases the job offer'],
    ['FR', 'Chaque phrase fait 30 mots au maximum', "ne paraphrase jamais l'offre"],
  ] as const)('%s: both rules reach the model', async (language, length, opening) => {
    mockCompletion('x')
    await generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', language)
    const system = groqCall().messages[0]?.content ?? ''
    expect(system).toContain(length)
    expect(system).toContain(opening)
  })
})

describe('cover letter: no hollow phrases', () => {
  it.each([
    ['EN', 'No hollow phrases', 'strong work ethic'],
    ['FR', 'Aucune formule creuse', 'projets innovants'],
    ['FR', 'Aucune formule creuse', 'compétences acquises'],
  ] as const)('%s: the rule reaches the model', async (language, rule, example) => {
    mockCompletion('x')
    await generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', language)
    const system = groqCall().messages[0]?.content ?? ''
    expect(system).toContain(rule)
    expect(system).toContain(example)
  })
})

describe('a figure keeps its scope', () => {
  it.each([
    ['adaptResume EN', () => adaptResume(CV, OFFER, 'EN'), 'A number keeps its scope'],
    ['generateCoverLetter EN', () => generateCoverLetter(CV, OFFER, 'Globex', 'Engineer', 'EN'), 'A number keeps its scope'],
    ['generateCoverLetter FR', () => generateCoverLetter(CV, OFFER, 'Globex', 'Ingénieur', 'FR'), 'Un chiffre garde son périmètre'],
  ])('%s: the rule and the real example reach the model', async (_name, run, rule) => {
    mockCompletion('x')
    await run()
    const system = groqCall().messages[0]?.content ?? ''
    expect(system).toContain(rule)
    expect(system).toMatch(/on the service layer|sur la couche service/)
  })
})
