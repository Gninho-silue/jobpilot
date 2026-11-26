import type { Prisma } from '@prisma/client'
import { reviewAdaptedCv, reviewCoverLetter, type ReviewedIssue } from './fix-issue'

/**
 * The result of a fact-check, stored on the application when its adapted CV or
 * cover letter is written (Application.adaptedCvCheck / coverLetterCheck). The
 * dashboard reads it; it never runs the checker itself.
 */
export interface StoredFactCheck {
  checkedAt: string
  issues: Array<{ kind: string; unsupported: string[] }>
}

export function summarizeIssues(issues: ReviewedIssue[], now = new Date()): StoredFactCheck {
  return { checkedAt: now.toISOString(), issues: issues.map(({ kind, unsupported }) => ({ kind, unsupported })) }
}

const json = (check: StoredFactCheck) => check as unknown as Prisma.InputJsonValue

/** Check result of an adapted CV, ready to store (null when there is nothing to check). */
export function adaptedCvCheck(cvText: string | null, adaptedCvText: string | null, approvedTitle: string | null) {
  return cvText && adaptedCvText ? json(summarizeIssues(reviewAdaptedCv(cvText, adaptedCvText, approvedTitle))) : null
}

/** Check result of a cover letter, ready to store (null when there is nothing to check). */
export function coverLetterCheck(cvText: string | null, coverLetter: string | null) {
  return cvText && coverLetter ? json(summarizeIssues(reviewCoverLetter(cvText, coverLetter))) : null
}

export interface ToCheckItem {
  applicationId: string
  company: string
  /** claim: not supported by the CV; phrase: generic wording; offer: offer stage. */
  tone: 'claim' | 'phrase' | 'offer'
  text: string
  /** One unsupported item, as an example (a technology, a figure, a phrase). */
  example: string | null
}

interface ToCheckApplication {
  id: string
  company: string
  status: string
  adaptedCvCheck: unknown
  coverLetterCheck: unknown
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function asCheck(value: unknown): StoredFactCheck | null {
  return value && typeof value === 'object' && Array.isArray((value as StoredFactCheck).issues) ? (value as StoredFactCheck) : null
}

/** "To check" on the dashboard, from the stored results only. */
export function toCheckItems(apps: ToCheckApplication[]): ToCheckItem[] {
  const claims: ToCheckItem[] = []
  const phrases: ToCheckItem[] = []
  const offers: ToCheckItem[] = []
  for (const app of apps) {
    const base = { applicationId: app.id, company: app.company }
    // "verify": in the CV, under another entry; shown in the panel, not a claim to fix.
    const cvIssues = asCheck(app.adaptedCvCheck)?.issues.filter(i => i.kind !== 'verify') ?? []
    if (cvIssues.length) {
      claims.push({ ...base, tone: 'claim', text: `Adapted CV: ${plural(cvIssues.length, 'claim')} not found in your CV`, example: cvIssues.flatMap(i => i.unsupported)[0] ?? null })
    }
    const letter = asCheck(app.coverLetterCheck)?.issues.filter(i => i.kind !== 'verify') ?? []
    const letterClaims = letter.filter(i => i.kind !== 'hollow')
    const hollow = letter.filter(i => i.kind === 'hollow')
    if (letterClaims.length) {
      claims.push({ ...base, tone: 'claim', text: `Cover letter: ${plural(letterClaims.length, 'claim')} not found in your CV`, example: letterClaims.flatMap(i => i.unsupported)[0] ?? null })
    }
    if (hollow.length) {
      phrases.push({ ...base, tone: 'phrase', text: `Cover letter: ${plural(hollow.length, 'generic phrase')}`, example: hollow.flatMap(i => i.unsupported)[0] ?? null })
    }
    if (app.status === 'OFFER') offers.push({ ...base, tone: 'offer', text: 'At the offer stage', example: null })
  }
  // Grouped by application in the order given, claims before generic phrases before offers.
  const order = new Map(apps.map((app, index) => [app.id, index]))
  const byApp = (a: ToCheckItem, b: ToCheckItem) => order.get(a.applicationId)! - order.get(b.applicationId)!
  return [...claims, ...phrases].sort((a, b) => byApp(a, b) || rank(a) - rank(b)).concat(offers)
}

const rank = (item: ToCheckItem) => (item.tone === 'claim' ? (item.text.startsWith('Adapted') ? 0 : 1) : 2)
