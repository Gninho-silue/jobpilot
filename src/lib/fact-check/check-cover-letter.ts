import { extractCvFacts, findTerms, numberOccurrences, numbersIn, periodsIn, type CvBlock } from './cv-facts'

/**
 * `verify`: in the CV, but under another experience; shown, never sent as a removal.
 * `reworded`: a fact of the CV turned into a bigger one (CI → continuous deployment).
 */
export type LetterIssueKind = 'merged' | 'technology' | 'number' | 'claim' | 'verify' | 'reworded'

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
  /** For a changed figure: the figure of the CV. */
  expected?: string
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

// Continuous integration is not deployment: "CI across 7 services" must not
// become "continuous deployment of 7 services".
const DEPLOYMENT_WORDS = /continuous (?:deployment|delivery)|déploiement continu|livraison continue/iu
// "CD" alone (upper case); "CI/CD" is a technology of the vocabulary, checked as such.
const CD_ALONE = /(?<![\p{L}\p{N}/])CD(?![\p{L}\p{N}/])/u
const CI_IN_CV = /(?<![\p{L}\p{N}])CI(?![\p{L}\p{N}])|continuous integration|intégration continue/iu

/** "continuous deployment", "déploiement continu" or "CD" in the sentence, when the CV has none of them. */
function deploymentClaim(sentence: string, cv: string): string | undefined {
  const cvHasDeployment = DEPLOYMENT_WORDS.test(cv) || /(?<![\p{L}\p{N}])CD(?![\p{L}\p{N}])/u.test(cv)
  if (cvHasDeployment) return undefined
  return sentence.match(DEPLOYMENT_WORDS)?.[0] ?? sentence.match(CD_ALONE)?.[0]
}

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

/** The occurrence whose surrounding words overlap most with `context` (score 0 if none). */
function closest(context: Set<string>, candidates: Array<{ value: string; context: Set<string> }>) {
  let best: { score: number; value?: string } = { score: 0 }
  for (const candidate of candidates) {
    const score = [...context].filter(word => candidate.context.has(word)).length
    if (score > best.score) best = { score, value: candidate.value }
  }
  return best
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

    const deployment = deploymentClaim(sentence, originalCv)
    if (deployment) {
      add({
        kind: 'reworded',
        line: sentence,
        lineIndex: index,
        unsupported: [deployment],
        ...(CI_IN_CV.test(originalCv) ? { expected: 'continuous integration (CI)' } : {}),
      })
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
    const periods = periodsIn(sentence)
    const dated = periods.size ? facts.blocks.filter(block => [...periodsIn(block.header)].some(p => periods.has(p))) : []
    if (dated.length === 1) named = dated[0]
    if (named) context = named

    const terms = findTerms(sentence)
    const numbers = numbersIn(sentence)
    const entry = context ? oneLine(context.header) : undefined

    // Figures of this experience that the sentence changed ("cinq modules" for 7).
    const changed: Array<{ value: string; expected: string }> = []

    if (context) {
      // A figure absent from this experience is either changed (its words match a
      // figure of this experience: "cinq modules" ↔ "7 … modules") or taken from
      // another experience (they match that one better: two experiences merged).
      const own = numberOccurrences(context.text)
      const others = facts.blocks.filter(block => block !== context).flatMap(block => numberOccurrences(block.text))
      const foreign: string[] = []
      for (const occurrence of numberOccurrences(sentence)) {
        if (context.numbers.has(occurrence.value)) continue
        const closestOwn = closest(occurrence.context, own.filter(o => o.value !== occurrence.value))
        const closestElsewhere = closest(occurrence.context, others.filter(o => o.value === occurrence.value))
        if (closestOwn.score > closestElsewhere.score) changed.push({ value: occurrence.value, expected: closestOwn.value! })
        else if (facts.numbers.has(occurrence.value)) foreign.push(occurrence.value)
      }
      if (foreign.length) {
        add({ kind: 'merged', entry, line: sentence, lineIndex: index, unsupported: sorted(foreign) })
        return
      }
      if (changed.length) {
        add({
          kind: 'number',
          entry,
          line: sentence,
          lineIndex: index,
          unsupported: changed.map(c => c.value),
          expected: changed.map(c => c.expected).join(', '),
        })
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

    const invented = [...numbers].filter(n => !facts.numbers.has(n) && !changed.some(c => c.value === n))
    if (invented.length && !changed.length) add({ kind: 'number', entry, line: sentence, lineIndex: index, unsupported: sorted(invented) })
  })

  return issues
}
