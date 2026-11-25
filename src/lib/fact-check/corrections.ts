import type { FactIssue } from './check-adapted-cv'

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
    }
  })
}
