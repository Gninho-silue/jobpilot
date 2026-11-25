import { extractCvFacts, findTerms, numbersIn, sectionCategories, type CvBlock, type CvFacts } from './cv-facts'

/**
 * `verify`: in the CV, but not under this entry. Shown to the user, never sent
 * to the model as something to remove.
 */
export type IssueKind = 'title' | 'technology' | 'number' | 'company' | 'date' | 'section' | 'verify'

/** Something in the adapted CV that the original CV does not support. */
export interface FactIssue {
  /** Stable for a given text: `<kind>-<line index>`. */
  id: string
  kind: IssueKind
  /** Entry title (e.g. "Backend Developer") or section heading (e.g. "TECHNICAL SKILLS"). */
  entry?: string
  /** Short name of the entry, for display: "title · company · dates". */
  label?: string
  /** The exact line of the adapted CV the issue is about. */
  line: string
  lineIndex: number
  /** The unsupported items (technologies, numbers, years, company, title). */
  unsupported: string[]
  /** For a changed title: the title of the original CV. */
  expected?: string
}

export interface CheckOptions {
  /** Title variants the user explicitly approved. */
  approvedTitles?: string[]
}

interface Entry {
  title: string
  company?: { value: string; lineIndex: number }
  date?: { value: string; lineIndex: number }
  tech?: { value: string; lineIndex: number }
  bullets: Array<{ text: string; lineIndex: number }>
}

const HEADING = /^[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s&\-/]{2,54}$/
const FIELD = /^>(TITLE|COMPANY|DATE|TECH|LINK|SCHOOL|DEGREE):\s*(.*)$/
const BULLET = /^[-•*]\s+/

const norm = (text: string) =>
  text.toLowerCase().replace(/[–—-]/g, '-').replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim()

const sorted = (items: Iterable<string>) => [...items].sort((a, b) => a.localeCompare(b))
const missing = (found: Set<string>, allowed: Set<string>) => sorted([...found].filter(item => !allowed.has(item)))

function findBlock(facts: CvFacts, entry: Entry): CvBlock | undefined {
  const title = norm(entry.title)
  const date = entry.date ? norm(entry.date.value) : ''
  const has = (block: CvBlock, part: string) => part !== '' && norm(block.header).includes(part)
  const dateIsSpecific = /[a-zà-ÿ]|-/.test(date) // a month or a range, not a bare year
  return (
    facts.blocks.find(b => has(b, title) && has(b, date)) ??
    (dateIsSpecific ? facts.blocks.find(b => has(b, date)) : undefined) ??
    facts.blocks.find(b => has(b, title))
    // No "first block with that year": it compared JobPilot with the Profile
    // ("364 tests" flagged). An unmatched entry is checked against the whole CV.
  )
}

export function checkAdaptedCv(originalCv: string, adaptedCv: string, options: CheckOptions = {}): FactIssue[] {
  const facts = extractCvFacts(originalCv)
  const originalText = norm(originalCv)
  const lines = adaptedCv.split('\n')
  const issues: FactIssue[] = []
  const add = (issue: Omit<FactIssue, 'id' | 'line'>) =>
    issues.push({ ...issue, id: `${issue.kind}-${issue.lineIndex}`, line: lines[issue.lineIndex]! })

  // ── Title (line 2, before " | skills") ─────────────────────────────────────
  const nonEmpty = lines.map((line, index) => ({ line: line.trim(), index })).filter(l => l.line)
  const titleLine = nonEmpty[1]
  if (titleLine && facts.title) {
    const title = titleLine.line.split(/\s+\|\s+/)[0]!.trim()
    const approved = [facts.title, ...(options.approvedTitles ?? [])].map(norm)
    if (!approved.includes(norm(title))) {
      add({ kind: 'title', lineIndex: titleLine.index, unsupported: [title], expected: facts.title })
    }
  }

  // ── Walk sections and entries ───────────────────────────────────────────────
  const entries: Entry[] = []
  const sectionLines: Array<{ section: string; text: string; lineIndex: number }> = []
  let section = ''
  const adaptedCategories = new Set<string>()
  let entry: Entry | null = null

  for (let index = (nonEmpty[2]?.index ?? 0) + 1; index < lines.length; index++) {
    const line = lines[index]!.trim()
    if (!line) continue
    if (HEADING.test(line)) {
      section = line
      for (const category of sectionCategories(line)) adaptedCategories.add(category)
      entry = null
      continue
    }
    const field = line.match(FIELD)
    if (field) {
      const [, name, value] = field as unknown as [string, string, string]
      if (name === 'TITLE' || name === 'SCHOOL' || !entry) {
        entry = { title: '', bullets: [] }
        entries.push(entry)
      }
      if (name === 'TITLE' || name === 'DEGREE') entry.title = value
      if (name === 'COMPANY' || name === 'SCHOOL') entry.company = { value, lineIndex: index }
      if (name === 'DATE') entry.date = { value, lineIndex: index }
      if (name === 'TECH') entry.tech = { value, lineIndex: index }
      continue
    }
    const text = line.replace(BULLET, '')
    if (entry) entry.bullets.push({ text, lineIndex: index })
    else sectionLines.push({ section, text, lineIndex: index })
  }

  // ── Entries: each fact must belong to the matching experience of the CV ────
  for (const e of entries) {
    const block = findBlock(facts, e)
    const terms = block?.terms ?? facts.terms
    const numbers = block?.numbers ?? facts.numbers
    const years = block?.years ?? facts.years
    const where = { entry: e.title, label: [e.title, e.company?.value, e.date?.value].filter(Boolean).join(' · ') }

    if (e.company && !originalText.includes(norm(e.company.value))) {
      add({ kind: 'company', ...where, lineIndex: e.company.lineIndex, unsupported: [e.company.value] })
    }
    if (e.date) {
      const wrongYears = [...e.date.value.matchAll(/(19|20)\d{2}/g)].map(m => m[0]).filter(y => !years.has(y))
      if (wrongYears.length) add({ kind: 'date', ...where, lineIndex: e.date.lineIndex, unsupported: wrongYears })
    }
    // Not in this entry of the CV: an invention if absent from the whole CV;
    // only "to verify" if the CV has it elsewhere (never sent as a removal).
    const checkLine = (text: string, lineIndex: number) => {
      const extraTerms = missing(findTerms(text), terms)
      const extraNumbers = missing(numbersIn(text), numbers)
      const inventedTerms = extraTerms.filter(term => !facts.terms.has(term))
      const inventedNumbers = extraNumbers.filter(n => !facts.numbers.has(n))
      const elsewhere = [
        ...extraTerms.filter(term => facts.terms.has(term)),
        ...extraNumbers.filter(n => facts.numbers.has(n)),
      ]
      if (inventedTerms.length) add({ kind: 'technology', ...where, lineIndex, unsupported: inventedTerms })
      if (inventedNumbers.length) add({ kind: 'number', ...where, lineIndex, unsupported: inventedNumbers })
      if (elsewhere.length) add({ kind: 'verify', ...where, lineIndex, unsupported: elsewhere })
    }
    if (e.tech) checkLine(e.tech.value, e.tech.lineIndex)
    for (const bullet of e.bullets) checkLine(bullet.text, bullet.lineIndex)
  }

  // ── Profile, skills, certifications: must exist somewhere in the CV ─────────
  for (const { section: heading, text, lineIndex } of sectionLines) {
    const extraTerms = missing(findTerms(text), facts.terms)
    if (extraTerms.length) add({ kind: 'technology', entry: heading, lineIndex, unsupported: extraTerms })
    const extraNumbers = missing(numbersIn(text), facts.numbers)
    if (extraNumbers.length) add({ kind: 'number', entry: heading, lineIndex, unsupported: extraNumbers })
  }

  // ── Sections of the original CV that the adapted CV lost ───────────────────
  facts.sections.forEach(({ heading, categories }, index) => {
    if (categories.length && categories.some(category => !adaptedCategories.has(category))) {
      issues.push({ id: `section-${lines.length + index}`, kind: 'section', line: '', lineIndex: lines.length + index, unsupported: [heading] })
    }
  })

  return issues.sort((a, b) => a.lineIndex - b.lineIndex)
}
