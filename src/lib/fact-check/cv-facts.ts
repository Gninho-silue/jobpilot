import { TERM_PATTERNS } from './vocabulary'

/**
 * Facts of a CV that an adapted CV or a cover letter must not contradict:
 * technologies, numbers and years, per experience / project / degree ("block")
 * and for the whole document. Works on free text (any user's CV), so it is
 * deliberately conservative: what it cannot recognise is never flagged.
 */
export interface CvBlock {
  /** First line(s) of the block: title, dates, company. */
  header: string
  text: string
  terms: Set<string>
  numbers: Set<string>
  years: Set<string>
}

export interface CvFacts {
  name: string
  /** Job title from the line after the name (before any " | skills"). */
  title: string
  blocks: CvBlock[]
  terms: Set<string>
  numbers: Set<string>
  years: Set<string>
  /** Section headings of the CV, as written, with what they contain. */
  sections: Array<{ heading: string; categories: SectionCategory[] }>
}

export type SectionCategory = 'profile' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'languages' | 'interests'

const CATEGORY_PATTERNS: Array<[SectionCategory, RegExp]> = [
  ['profile', /profil|summary|résumé|about/i],
  ['skills', /skill|compétence/i],
  ['experience', /experience|expérience/i],
  ['projects', /project|projet/i],
  ['education', /education|formation/i],
  ['certifications', /certif/i],
  ['languages', /language|langue/i],
  ['interests', /interest|intérêt/i],
]

/** What a section heading covers ("Certifications & Languages" → both). */
export function sectionCategories(heading: string): SectionCategory[] {
  return CATEGORY_PATTERNS.filter(([, pattern]) => pattern.test(heading)).map(([category]) => category)
}

/** Canonical names of the known technologies in a text. */
export function findTerms(text: string): Set<string> {
  const found = new Set<string>()
  let rest = text
  // Longest alias first, and blank it out: "Spring Boot" must not also count as "Spring".
  for (const { name, pattern } of TERM_PATTERNS) {
    rest = rest.replace(pattern, match => {
      found.add(name)
      return ' '.repeat(match.length)
    })
  }
  return found
}

const NUMBER_WORDS: Record<string, string> = {
  two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', twenty: '20',
  deux: '2', trois: '3', quatre: '4', cinq: '5', huit: '8', dix: '10', douze: '12', quinze: '15', vingt: '20',
}
const NUMBER_WORD = new RegExp(`(?<![\\p{L}])(${Object.keys(NUMBER_WORDS).join('|')})(?![\\p{L}])`, 'giu')
const NUMBER = /(?<![\p{L}\p{N}_.,/])(\d+(?:[.,]\d+)?)(\s?%|\+)?(?![\p{L}\p{N}_])/gu
const YEAR = /(?<![\p{N}])(19\d{2}|20\d{2})(?![\p{N}])/gu

/** Counts, percentages and "N+" (number words as digits); not years or product versions. */
export function numbersIn(text: string): Set<string> {
  return new Set(numberOccurrences(text).map(occurrence => occurrence.value))
}

const CONTEXT_STOPWORDS = new Set(['with', 'that', 'from', 'this', 'have', 'into', 'over', 'dans', 'pour', 'avec', 'plus', 'sont', 'mais', 'leur', 'their', 'which', 'were', 'been'])

/** Words around a figure ("custom", "module", "time"…), lower-case and singular, for comparing contexts. */
function contextWords(text: string): string[] {
  return (text.toLowerCase().match(/\p{L}{4,}/gu) ?? [])
    .map(word => word.replace(/s$/, ''))
    .filter(word => !CONTEXT_STOPWORDS.has(word))
}

/**
 * Each figure of a text (counts, percentages, "N+"; number words as digits; not
 * years or product versions) with the words around it: 4 before, 4 after.
 */
export function numberOccurrences(text: string): Array<{ value: string; context: Set<string> }> {
  let rest = text
  // A number right after a technology is its version ("Odoo 17", "React 18").
  for (const { pattern } of TERM_PATTERNS) {
    rest = rest.replace(new RegExp(`(${pattern.source})\\s*v?\\d+(?:\\.\\d+)*`, pattern.flags), '$1')
  }
  rest = rest.replace(NUMBER_WORD, word => NUMBER_WORDS[word.toLowerCase()]!)

  const occurrences: Array<{ value: string; context: Set<string> }> = []
  for (const match of rest.matchAll(NUMBER)) {
    const [whole, value, suffix] = match
    const isYear = /^(19|20)\d{2}$/.test(value!) && !suffix
    if (isYear) continue
    const before = contextWords(rest.slice(Math.max(0, match.index! - 80), match.index)).slice(-4)
    const after = contextWords(rest.slice(match.index! + whole.length, match.index! + whole.length + 80)).slice(0, 4)
    occurrences.push({ value: value!.replace(',', '.') + (suffix ? suffix.trim() : ''), context: new Set([...before, ...after]) })
  }
  return occurrences
}

const MONTH_NUMBER: Array<[RegExp, number]> = [
  [/^jan/i, 1], [/^f[ée]v|^feb/i, 2], [/^mar/i, 3], [/^a[pv]r/i, 4], [/^ma[iy]/i, 5], [/^jui?n|^june?/i, 6],
  [/^juil|^jul/i, 7], [/^ao[uû]|^aug/i, 8], [/^sep/i, 9], [/^oct/i, 10], [/^nov/i, 11], [/^d[ée]c/i, 12],
]
const monthNumber = (word: string) => {
  // "juil" before "juin": both start with "jui".
  if (/^juil/i.test(word)) return 7
  return MONTH_NUMBER.find(([pattern]) => pattern.test(word))?.[1]
}
/** Month ranges of a text, EN or FR ("March – July 2026", "mars-juillet 2026") as "3-7-2026". */
export function periodsIn(text: string): Set<string> {
  // Built here: MONTHS is declared further down.
  const period = new RegExp(`(${MONTHS})\\.?\\s*[–-]\\s*(${MONTHS})\\.?\\s+((?:19|20)\\d{2})`, 'giu')
  return new Set(
    Array.from(text.replace(/\s+/g, ' ').matchAll(period), ([, from, to, year]) => `${monthNumber(from!)}-${monthNumber(to!)}-${year}`)
  )
}

function yearsIn(text: string): Set<string> {
  return new Set(Array.from(text.matchAll(YEAR), m => m[1]!))
}

const MONTHS =
  'jan(?:uary|vier)?|feb(?:ruary)?|f[ée]v(?:rier)?|mar(?:ch|s)?|apr(?:il)?|avr(?:il)?|may|mai|june?|juin|july?|juil(?:let)?|aug(?:ust)?|ao[uû]t|sep(?:t(?:ember)?)?|sept(?:embre)?|oct(?:ober|obre)?|nov(?:ember|embre)?|dec(?:ember)?|d[ée]c(?:embre)?'
/** A line that dates an entry: "March – July 2026", "2023 – 2026", "… | Docker 2025". */
const DATED_LINE = new RegExp(`((${MONTHS})\\.?\\s+(19|20)\\d{2})|((${MONTHS})\\.?\\s*[–-]\\s*(${MONTHS})\\.?\\s+(19|20)\\d{2})|((19|20)\\d{2}\\s*[–-]\\s*((19|20)\\d{2}|present|now|aujourd'hui|présent))|((19|20)\\d{2}\\s*$)`, 'iu')

const SECTION_WORDS =
  /^(profile|profil|summary|résumé|about|technical skills|skills|compétences( techniques)?|(professional )?experience|expériences?( professionnelles?)?|(ai |personal |side |academic )?projects|projets( personnels)?|education|formation|certifications?( & languages| & langues| et langues)?|languages|langues|interests|centres d'intérêt)$/i

function isSectionHeading(line: string): boolean {
  return line.length <= 45 && SECTION_WORDS.test(line.replace(/[:#*]/g, '').trim())
}

const BULLET = /^[•\-*·▸►]\s/
const NON_ENTRY_SECTIONS: SectionCategory[] = ['profile', 'skills', 'certifications', 'languages', 'interests']
// The end of a heading wrapped onto a second line: lowercase, digit or month first.
const MONTH_FIRST = new RegExp(`^(${MONTHS})\\b`, 'i')
const isHeadingFragment = (line: string) => /^[\p{Ll}\d]/u.test(line) || MONTH_FIRST.test(line)
// A line that announces its continuation on the next one.
const CONTINUES = /[|,–-]\s*$/
// An email address, or a phone number (starts with + or 0: "2019 - 2022" is a date range).
const CONTACT = /@|(?<![\p{N}])(\+|0)\d[\d\s().-]{6,}\d/u

function makeBlock(header: string, text: string): CvBlock {
  return { header, text, terms: findTerms(text), numbers: numbersIn(text), years: yearsIn(text) }
}

export function extractCvFacts(cvText: string): CvFacts {
  const lines = cvText.split('\n').map(line => line.trim()).filter(Boolean)
  const name = lines[0] ?? ''
  const titleLine = lines.slice(1, 4).find(line => !CONTACT.test(line) && !isSectionHeading(line)) ?? ''
  const title = titleLine.split(/\s+\|\s+/)[0]!.trim()

  // Contact details are not facts to check (phone digits are not counts).
  const body = lines.filter(line => !CONTACT.test(line) && !line.startsWith('Links: '))

  const blocks: CvBlock[] = []
  const sections: CvFacts['sections'] = []
  let current: { header: string[]; text: string[] } | null = null
  const close = () => {
    if (current) blocks.push(makeBlock(current.header.join(' '), current.text.join('\n')))
    current = null
  }

  // Lines of the current section that are not in an entry yet: the first half of
  // a heading wrapped onto the dated line (e.g. "Banking Platform | Java 21 … |"
  // then "2025 – 2026") sits there.
  let loose: string[] = []
  let entriesAllowed = true

  for (const line of body.slice(1)) {
    if (isSectionHeading(line)) {
      close()
      loose = []
      const categories = sectionCategories(line)
      // Profile, skills, certifications: no entries ("(June 2026)" in a sentence is not one).
      entriesAllowed = !(categories.length && categories.every(category => NON_ENTRY_SECTIONS.includes(category)))
      sections.push({ heading: line.replace(/[:#*]/g, '').trim(), categories })
      continue
    }
    if (entriesAllowed && DATED_LINE.test(line) && !BULLET.test(line)) {
      // Take back the heading lines that wrap onto this dated line: up to two
      // lines above it that do not end a sentence. They leave the previous entry.
      // Only when this line is the end of a heading ("demo | 2026", "2026",
      // "March – July 2026") or the line above announces a continuation ("… |"):
      // a complete heading line ("Intern June – September 2025") pulls nothing.
      const source = current ? current.text : loose
      const pulled: string[] = []
      const fragment = isHeadingFragment(line)
      while (pulled.length < 2 && source.length > (current ? 1 : 0)) {
        const previous = source[source.length - 1]!
        if (BULLET.test(previous) || /[.!?;]$/.test(previous) || DATED_LINE.test(previous)) break
        if (!fragment && !CONTINUES.test(previous)) break
        pulled.unshift(source.pop()!)
        if (current && current.header.length > 1 && current.header[current.header.length - 1] === pulled[0]) current.header.pop()
      }
      close()
      loose = []
      current = { header: [...pulled, line], text: [...pulled, line] }
      continue
    }
    if (!current) {
      loose.push(line)
      continue
    }
    // The line after the heading is usually the company or school, part of the header.
    if (current.text.length === current.header.length && !BULLET.test(line)) current.header.push(line)
    current.text.push(line)
  }
  close()

  const whole = body.slice(1).join('\n')
  return { name, title, blocks, terms: findTerms(whole), numbers: numbersIn(whole), years: yearsIn(whole), sections }
}
