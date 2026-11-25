import type { FactIssue } from './check-adapted-cv'
import type { LetterIssue } from './check-cover-letter'

const SECTION = /^[A-ZÀ-ÖØ-Þ\s&\-/]+$/

/** One instruction per issue, for the single regeneration of an adapted CV. */
export function describeIssues(issues: FactIssue[]): string[] {
  return issues.map(issue => {
    const where = `In "${issue.entry ?? ''}"`
    const items = issue.unsupported.join(', ')
    switch (issue.kind) {
      case 'title':
        return `Use the job title "${issue.expected}" exactly, not "${items}".`
      case 'technology':
        return SECTION.test(issue.entry ?? '')
          ? `${where}: remove ${items} (not in the CV).`
          : `${where}: remove ${items} (the CV does not list ${issue.unsupported.length > 1 ? 'them' : 'it'} for this experience).`
      case 'number':
        return `${where}: use the numbers of the CV, not ${items}.`
      case 'company':
        return `${where}: use the company name of the CV, not "${items}".`
      case 'date':
        return `${where}: use the dates of the CV, not ${items}.`
      case 'section':
        return `Keep the "${items}" section of the CV, with all its entries.`
    }
  })
}

/** One instruction per sentence, for the single regeneration of a cover letter. */
export function describeLetterIssues(issues: LetterIssue[]): string[] {
  return issues.map(issue => {
    const items = issue.unsupported.join(', ')
    switch (issue.kind) {
      case 'claim':
        return `Remove this sentence, the CV does not support it: "${issue.line}"`
      case 'merged':
        return `This sentence attributes to "${issue.entry}" facts (${items}) that belong to another experience of the CV: name the right experience for each fact, with its company and dates: "${issue.line}"`
      case 'technology':
        return issue.entry
          ? `Do not attribute ${items} to "${issue.entry}": "${issue.line}"`
          : `Remove ${items}, not in the CV: "${issue.line}"`
      case 'number':
        return `Use only numbers from the CV, not ${items}: "${issue.line}"`
    }
  })
}
