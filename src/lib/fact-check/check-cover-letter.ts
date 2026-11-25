import { extractCvFacts, findTerms, numbersIn, type CvBlock } from './cv-facts'

/** `verify`: in the CV, but under another experience; shown, never sent as a removal. */
export type LetterIssueKind = 'merged' | 'technology' | 'number' | 'claim' | 'verify'

/** A sentence of the cover letter that the CV does not support. */
export interface LetterIssue {
  /** Stable for a given text: `<kind>-<sentence index>`. */
  id: string
  kind: LetterIssueKind
  /** The experience the sentence is about (its context in the letter). */
  entry?: string
  /** The sentence. */
  line: string
  lineIndex: number
  unsupported: string[]
}

// Claims about the candidate's past that a CV cannot back ("I have closely followed
// your company"). Deliberately narrow: no false alarm on ordinary motivation.
const PERSONAL_CLAIMS = [
  /\bI(?:'ve| have)\s+(?:(?:long|always|closely|been|personally)\s+)*(?:followed|following|admired|been fascinated|been a (?:fan|user|customer))\b/i,
  /\bas a long[- ]time (?:user|customer|follower|fan|admirer)\b/i,
  /\bje (?:vous )?suis depuis (?:longtemps|des années)\b/i,
  /\bj['’]ai toujours (?:admiré|suivi|été (?:fasciné|admiratif))/i,
  /\bj['’]ai suivi de près\b/i,
  /\bje suis de près\b/i,
  /\bje connais bien votre\b/i,
]

// "for enterprise clients", "with major international customers", "auprès de grands comptes":
// flagged when the CV does not contain the expression (without its preposition).
const CLIENTELE_CLAIM =
  /\b(?:for|with|to|serving)\s+(?:(?:enterprise|fortune[- ]\d+|large|major|international|global|key|blue[- ]chip|top[- ]tier)\s+)+(?:clients|customers|accounts|companies)\b|(?:auprès de|pour|avec)\s+(?:des\s+|de\s+)?(?:grands comptes|clients (?:grands comptes|internationaux|prestigieux))\b/i

const MONTH_WORDS =
  /^(january|february|march|april|may|june|july|august|september|october|november|december|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|summer|spring|autumn|winter|present)$/i

// Header words that name no experience in particular: any project is a "project",
// and a target company can be "… Engineering" (the closing line named one).
const GENERIC_HEADER_WORDS =
  /^(projects?|projets?|engineering|engineer|ingénieur|ingénierie|developer|développeur|development|degree|diplôme|sciences?|computer|informatique|services?|classes|preparatory|full-stack|frontend|backend)$/i

const words = (text: string) => text.toLowerCase().match(/[\p{L}][\p{L}'-]*/gu) ?? []

/**
 * Words that name one experience and no other (company, "Final", "Intern",
 * project name): finding one in a sentence sets the context of what follows.
 */
function distinctiveWords(blocks: CvBlock[]): Map<CvBlock, Set<string>> {
  const perBlock = new Map<CvBlock, Set<string>>()
  const count = new Map<string, number>()
  for (const block of blocks) {
    const candidates = new Set(
      (block.header.match(/[\p{Lu}][\p{L}'-]{3,}/gu) ?? [])
        .filter(word => !MONTH_WORDS.test(word) && !GENERIC_HEADER_WORDS.test(word) && findTerms(word).size === 0)
        .map(word => word.toLowerCase())
    )
    perBlock.set(block, candidates)
    for (const word of candidates) count.set(word, (count.get(word) ?? 0) + 1)
  }
  for (const [block, candidates] of perBlock) {
    perBlock.set(block, new Set([...candidates].filter(word => count.get(word) === 1)))
  }
  return perBlock
}

const sorted = (items: Iterable<string>) => [...items].sort((a, b) => a.localeCompare(b))
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

export function checkCoverLetter(originalCv: string, letter: string): LetterIssue[] {
  const facts = extractCvFacts(originalCv)
  const originalText = originalCv.toLowerCase().replace(/\s+/g, ' ')
  const markers = distinctiveWords(facts.blocks)
  // Sentences with their paragraph: an experience's context never carries over
  // to the next paragraph (the closing paragraph is about the candidate overall).
  const sentences = letter
    .split(/\n\s*\n/)
    .flatMap((paragraph, paragraphIndex) =>
      paragraph
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+(?=[\p{Lu}“"«(])/u)
        .map(sentence => ({ sentence: sentence.trim(), paragraphIndex }))
    )
    .filter(({ sentence }) => sentence)

  const issues: LetterIssue[] = []
  const add = (issue: Omit<LetterIssue, 'id'>) => issues.push({ ...issue, id: `${issue.kind}-${issue.lineIndex}` })
  let context: CvBlock | undefined
  let currentParagraph = 0

  sentences.forEach(({ sentence, paragraphIndex }, index) => {
    if (paragraphIndex !== currentParagraph) {
      context = undefined
      currentParagraph = paragraphIndex
    }
    // A clientele the CV does not mention ("for enterprise clients") is a claim too.
    const clientele = sentence.match(CLIENTELE_CLAIM)?.[0]
    const unbackedClientele = clientele && !originalText.includes(clientele.toLowerCase().replace(/^\S+\s+/, ''))
    if (PERSONAL_CLAIMS.some(pattern => pattern.test(sentence)) || unbackedClientele) {
      // The whole sentence is flagged once (no separate number or technology issue).
      add({ kind: 'claim', line: sentence, lineIndex: index, unsupported: clientele && unbackedClientele ? [clientele] : [] })
      return
    }

    // A sentence naming an experience sets the context for the following ones.
    const sentenceWords = new Set(words(sentence))
    // The experience the sentence names most precisely ("Banking Platform project":
    // two words of Banking Platform, not the first block that matches one word).
    let named: CvBlock | undefined
    let bestScore = 0
    for (const block of facts.blocks) {
      const score = [...markers.get(block)!].filter(word => sentenceWords.has(word)).length
      if (score > bestScore) {
        named = block
        bestScore = score
      }
    }
    if (named) context = named

    const terms = findTerms(sentence)
    const numbers = numbersIn(sentence)
    const entry = context ? oneLine(context.header) : undefined

    if (context) {
      // Facts that are not in this experience but in another one: two experiences merged.
      const foreign = [...numbers].filter(n => !context!.numbers.has(n) && facts.numbers.has(n))
      if (foreign.length) {
        add({ kind: 'merged', entry, line: sentence, lineIndex: index, unsupported: sorted(foreign) })
        return
      }
      const extraTerms = [...terms].filter(t => !context!.terms.has(t))
      const invented = extraTerms.filter(t => !facts.terms.has(t))
      const elsewhere = extraTerms.filter(t => facts.terms.has(t))
      if (invented.length) add({ kind: 'technology', entry, line: sentence, lineIndex: index, unsupported: sorted(invented) })
      if (elsewhere.length) add({ kind: 'verify', entry, line: sentence, lineIndex: index, unsupported: sorted(elsewhere) })
    } else {
      const extraTerms = [...terms].filter(t => !facts.terms.has(t))
      if (extraTerms.length) add({ kind: 'technology', line: sentence, lineIndex: index, unsupported: sorted(extraTerms) })
    }

    const invented = [...numbers].filter(n => !facts.numbers.has(n))
    if (invented.length) add({ kind: 'number', entry, line: sentence, lineIndex: index, unsupported: sorted(invented) })
  })

  return issues
}
