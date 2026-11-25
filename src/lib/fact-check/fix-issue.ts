import { checkAdaptedCv, type FactIssue } from './check-adapted-cv'
import { findTerms } from './cv-facts'
import { checkCoverLetter, type LetterIssue } from './check-cover-letter'

/** Issues the user can resolve in one click (company and date need a human). */
export function isFixable(issue: FactIssue): boolean {
  return issue.kind === 'title' || issue.kind === 'technology' || issue.kind === 'number'
}

const BULLET = /^\s*[-•*]\s+/
const LIST = /^(\s*>TECH:\s*|[^:]{1,40}:\s*)(.+)$/

/**
 * Applies the one-click fix of an issue to the adapted CV text:
 * - title: back to the original title (skills after " | " kept);
 * - a bullet or a sentence: the line is removed;
 * - a list (">TECH:", "Backend: a · b"): only the unsupported items are removed.
 * Throws when the issue cannot be fixed this way or its line is gone (stale).
 */
export function applyIssueFix(text: string, issue: FactIssue): string {
  if (!isFixable(issue)) throw new Error(`No one-click fix for a ${issue.kind} issue`)

  const lines = text.split('\n')
  const index = lines[issue.lineIndex] === issue.line ? issue.lineIndex : lines.indexOf(issue.line)
  if (index < 0) throw new Error('Stale issue: its line is no longer in the text')
  const line = lines[index]!

  if (issue.kind === 'title') {
    const [, ...skills] = line.split(/\s+\|\s+/)
    lines[index] = [issue.expected ?? '', ...skills].join(' | ')
    return lines.join('\n')
  }

  const list = !BULLET.test(line) && issue.kind === 'technology' ? line.match(LIST) : null
  if (list && /·|,/.test(list[2]!)) {
    const [, label, items] = list as unknown as [string, string, string]
    const separator = items.includes('·') ? ' · ' : ', '
    const kept = items
      .split(/\s*[·,]\s*/)
      .filter(item => {
        const terms = [...findTerms(item)]
        return !(terms.length > 0 && terms.every(term => issue.unsupported.includes(term)))
      })
    if (kept.length) {
      lines[index] = label + kept.join(separator)
      return lines.join('\n')
    }
  }

  lines.splice(index, 1)
  return lines.join('\n')
}

/** An issue as shown to the user, for either document. */
export type ReviewedIssue = (FactIssue | LetterIssue) & { fixable: boolean }
export type ReviewedCvIssue = FactIssue & { fixable: boolean }

/** Issues of a saved adapted CV, as shown to the user before export. */
export function reviewAdaptedCv(
  cvText: string | null,
  adaptedCvText: string | null,
  approvedTitle: string | null
): ReviewedCvIssue[] {
  if (!cvText || !adaptedCvText) return []
  return checkAdaptedCv(cvText, adaptedCvText, { approvedTitles: approvedTitle ? [approvedTitle] : [] }).map(issue => ({
    ...issue,
    fixable: isFixable(issue),
  }))
}

/** Sentences of a saved cover letter the CV does not support (no one-click fix). */
export function reviewCoverLetter(cvText: string | null, coverLetter: string | null): ReviewedIssue[] {
  if (!cvText || !coverLetter) return []
  return checkCoverLetter(cvText, coverLetter).map(issue => ({ ...issue, fixable: false }))
}
