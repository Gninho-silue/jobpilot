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
  let rest = text
  // A number right after a technology is its version ("Odoo 17", "React 18").
  for (const { pattern } of TERM_PATTERNS) {
    rest = rest.replace(new RegExp(`(${pattern.source})\\s*v?\\d+(?:\\.\\d+)*`, pattern.flags), '$1')
  }
  rest = rest.replace(NUMBER_WORD, word => NUMBER_WORDS[word.toLowerCase()]!)

  const numbers = new Set<string>()
  for (const [, value, suffix] of rest.matchAll(NUMBER)) {
    const isYear = /^(19|20)\d{2}$/.test(value!) && !suffix
    if (isYear) continue
    numbers.add(value!.replace(',', '.') + (suffix ? suffix.trim() : ''))
  }
  return numbers
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
  let current: { header: string[]; text: string[] } | null = null
  const close = () => {
    if (current) blocks.push(makeBlock(current.header.join(' '), current.text.join('\n')))
    current = null
  }

  for (const line of body.slice(1)) {
    if (isSectionHeading(line)) {
      close()
      continue
    }
    if (DATED_LINE.test(line) && !BULLET.test(line)) {
      close()
      current = { header: [line], text: [line] }
      continue
    }
    if (!current) continue
    // The line after a dated line is usually the company or school, part of the header.
    if (current.text.length === 1 && !BULLET.test(line)) current.header.push(line)
    current.text.push(line)
  }
  close()

  const whole = body.slice(1).join('\n')
  return { name, title, blocks, terms: findTerms(whole), numbers: numbersIn(whole), years: yearsIn(whole) }
}
