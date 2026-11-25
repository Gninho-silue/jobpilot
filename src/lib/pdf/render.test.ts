import { describe, expect, it } from 'vitest'
import { extractPdfText } from './extract-text'
import { generateCvPdf, parseCvStructured } from './generate-cv-pdf'
import { generateCoverLetterPdf } from './generate-cover-letter-pdf'
import { pdfLinkUrls } from '@test/helpers/pdf'

// Render real PDFs, read their text back: what a recruiter actually sees.

// What the LLM wrote in production (U+2011 hyphen, U+202F narrow no-break space,
// accents detached by the LaTeX extraction of the original CV).
const LLM_TEXT = 'Built an e‑commerce R&D platform (data_eng) for 95 % of orders on Odoo 17 – café'
const EXPECTED = 'Built an e-commerce R&D platform (data_eng) for 95% of orders on Odoo 17 – café'

const ADAPTED_CV = `ZO´E MARTIN-FERR´E
AI Software Engineer | Python · FastAPI
+000 600 000 000 | candidate_test@example.com | Lyon, France
PROFILE
${LLM_TEXT}
PROFESSIONAL EXPERIENCE
>TITLE: Full-Stack Developer – Final Year Project (PFE)
>COMPANY: Northwind & Co
>DATE: January – May 2026
- ${LLM_TEXT}
CERTIFICATIONS & LANGUAGES
Applied Machine Learning Practitioner Certificate
Cloud AI Fundamentals Certificate
Python: Formation Compl\`ete
French: Native · English: Fluent
`

const ORIGINAL_CV = `Zo´e Martin-Ferr´e
AI Software Engineer | Python · FastAPI · LangGraph · RAG
+000 600 000 000 | candidate_test@example.com | LinkedIn | GitHub | Lyon, France
Profile
AI software engineer.`

const flat = (text: string) => text.replace(/\s+/g, ' ')

describe('adapted CV PDF', () => {
  it('renders hyphens, %, é, &, _ exactly; no slash before % or digits, no detached accent', async () => {
    const { text } = await extractPdfText(await generateCvPdf(ADAPTED_CV))
    const seen = flat(text)

    expect(seen).toContain(EXPECTED)
    expect(seen).not.toMatch(/\/%|\/\d/)
    expect(seen).not.toContain('´')
    expect(seen).toContain('ZOÉ MARTIN-FERRÉ')
  })

  it('keeps certification lines in their original case (they are not section headings)', async () => {
    const { text } = await extractPdfText(await generateCvPdf(ADAPTED_CV))
    expect(text).toContain('Applied Machine Learning Practitioner Certificate')
    expect(text).toContain('Python: Formation Complète')
    expect(text).not.toContain('APPLIED MACHINE LEARNING')
    expect(text).not.toContain('FORMATION COMPLÈTE')
  })

  it('section detection: all-caps lines are headings, short mixed-case lines are not', () => {
    const parsed = parseCvStructured(ADAPTED_CV)
    expect(parsed.sections.map(s => s.heading)).toEqual(['PROFILE', 'PROFESSIONAL EXPERIENCE', 'CERTIFICATIONS & LANGUAGES'])
    expect(parsed.sections[2]!.paragraphs).toContain('Applied Machine Learning Practitioner Certificate')
  })
})

describe('cover letter PDF', () => {
  it('renders the body with hyphens, %, é, &, _ exactly', async () => {
    const { text } = await extractPdfText(await generateCoverLetterPdf(LLM_TEXT, ORIGINAL_CV, 'Contoso Consulting', 'Consultant'))
    const seen = flat(text)
    expect(seen).toContain(EXPECTED)
    expect(seen).not.toMatch(/\/%|\/\d/)
  })

  it('header: the accented name, then the contact line (phone, email, city), not the job title', async () => {
    const { text } = await extractPdfText(await generateCoverLetterPdf('Body.', ORIGINAL_CV, 'Contoso Consulting', 'Consultant'))
    const [name, contact] = text.split('\n')

    expect(name).toBe('Zoé Martin-Ferré')
    expect(contact).toContain('+000 600 000 000')
    expect(contact).toContain('candidate_test@example.com')
    expect(contact).toContain('Lyon, France')
    expect(contact).not.toContain('AI Software Engineer')
    expect(text.split('\n').at(-1)).toBe('Zoé Martin-Ferré') // footer
  })
})

describe('links in the adapted CV PDF', () => {
  // What is printed on the page: extractPdfText appends a "Links:" line with the annotation URLs.
  const visible = (text: string) => text.split('\n\nLinks: ')[0]!
  // pdf.js reports a URL without a path with a trailing slash.
  const urlsOf = async (pdf: Buffer) => (await pdfLinkUrls(pdf)).map(url => url.replace(/\/$/, ''))

  const cvWithLinks = (contact: string, link: string) => `Zoé Martin-Ferré
AI Software Engineer
${contact}
PROJECTS
>TITLE: Atlas
>TECH: Python · FastAPI
>DATE: 2026
>LINK: ${link}
- Agentic RAG assistant.
`

  it('header: profile URLs become clickable links labelled by their address', async () => {
    const pdf = await generateCvPdf(
      cvWithLinks('candidate_test@example.com | https://www.linkedin.com/in/zoe-test | github.com/zoe-test | Lyon, France', 'https://github.com/zoe-test/atlas')
    )
    const text = visible((await extractPdfText(pdf)).text)
    const urls = await urlsOf(pdf)

    expect(urls).toEqual(expect.arrayContaining(['https://www.linkedin.com/in/zoe-test', 'https://github.com/zoe-test']))
    expect(text).toContain('linkedin.com/in/zoe-test')
    expect(text).toContain('github.com/zoe-test')
    expect(text).not.toContain('https://')
  })

  it('project link: shown with its address, never a bare "GitHub" label or an arrow', async () => {
    const pdf = await generateCvPdf(cvWithLinks('candidate_test@example.com', 'https://atlas_demo.example.com'))
    const text = visible((await extractPdfText(pdf)).text)

    expect(await urlsOf(pdf)).toContain('https://atlas_demo.example.com')
    expect(text).toContain('atlas_demo.example.com')
    expect(text).not.toMatch(/GitHub|↗|—/)
  })

  it('a LINK that is not a URL (e.g. "GitHub") is not rendered at all', async () => {
    const pdf = await generateCvPdf(cvWithLinks('candidate_test@example.com', 'GitHub'))
    const text = visible((await extractPdfText(pdf)).text)

    expect(await urlsOf(pdf)).toEqual([])
    expect(text).not.toMatch(/GitHub|↗|—/)
  })
})

describe('format markers are never printed', () => {
  it('a truncated marker (">DE"), an empty one and an unknown one never reach the PDF; an unknown field keeps its value', async () => {
    const pdf = await generateCvPdf(`Zoé Martin-Ferré
AI Software Engineer
candidate_test@example.com
EDUCATION
>SCHOOL: École d'Ingénieurs Exemple
>DEGREE: Engineering Degree in Computer Science
>DATE: 2023 – 2026
>LOCATION: Lyon
>SCHOOL: Lycée Exemple
>DATE:
- >DEGREE
>DE`)
    const { text } = await extractPdfText(pdf)

    expect(text).not.toMatch(/>\s*[A-Z]{2,}/)
    expect(text).toContain('Engineering Degree in Computer Science')
    expect(text).toContain('Lyon')
    expect(text).toContain('Lycée Exemple')
  })
})
