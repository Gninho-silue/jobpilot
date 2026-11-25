import { extractCvFacts, findTerms, numbersIn, type CvBlock, type CvFacts } from './cv-facts'

export type IssueKind = 'title' | 'technology' | 'number' | 'company' | 'date'

/** Something in the adapted CV that the original CV does not support. */
export interface FactIssue {
  /** Stable for a given text: `<kind>-<line index>`. */
  id: string
  kind: IssueKind
  /** Entry title (e.g. "Backend Developer") or section heading (e.g. "TECHNICAL SKILLS"). */
  entry?: string
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
    facts.blocks.find(b => has(b, title)) ??
    facts.blocks.find(b => has(b, date))
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
  let entry: Entry | null = null

  for (let index = (nonEmpty[2]?.index ?? 0) + 1; index < lines.length; index++) {
    const line = lines[index]!.trim()
    if (!line) continue
    if (HEADING.test(line)) {
      section = line
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

    if (e.company && !originalText.includes(norm(e.company.value))) {
      add({ kind: 'company', entry: e.title, lineIndex: e.company.lineIndex, unsupported: [e.company.value] })
    }
    if (e.date) {
      const wrongYears = [...e.date.value.matchAll(/(19|20)\d{2}/g)].map(m => m[0]).filter(y => !years.has(y))
      if (wrongYears.length) add({ kind: 'date', entry: e.title, lineIndex: e.date.lineIndex, unsupported: wrongYears })
    }
    if (e.tech) {
      const extra = missing(findTerms(e.tech.value), terms)
      if (extra.length) add({ kind: 'technology', entry: e.title, lineIndex: e.tech.lineIndex, unsupported: extra })
    }
    for (const bullet of e.bullets) {
      const extraTerms = missing(findTerms(bullet.text), terms)
      if (extraTerms.length) add({ kind: 'technology', entry: e.title, lineIndex: bullet.lineIndex, unsupported: extraTerms })
      const extraNumbers = missing(numbersIn(bullet.text), numbers)
      if (extraNumbers.length) add({ kind: 'number', entry: e.title, lineIndex: bullet.lineIndex, unsupported: extraNumbers })
    }
  }

  // ── Profile, skills, certifications: must exist somewhere in the CV ─────────
  for (const { section: heading, text, lineIndex } of sectionLines) {
    const extraTerms = missing(findTerms(text), facts.terms)
    if (extraTerms.length) add({ kind: 'technology', entry: heading, lineIndex, unsupported: extraTerms })
    const extraNumbers = missing(numbersIn(text), facts.numbers)
    if (extraNumbers.length) add({ kind: 'number', entry: heading, lineIndex, unsupported: extraNumbers })
  }

  return issues.sort((a, b) => a.lineIndex - b.lineIndex)
}
