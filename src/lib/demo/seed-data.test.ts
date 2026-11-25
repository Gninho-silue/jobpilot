import { describe, expect, it } from 'vitest'
import { checkAdaptedCv } from '@/lib/fact-check/check-adapted-cv'
import { checkCoverLetter } from '@/lib/fact-check/check-cover-letter'
import { isFixable } from '@/lib/fact-check/fix-issue'
import { DEMO_APPLICATIONS, DEMO_CV } from './seed-data'

describe('demo data', () => {
  it('is a fictional person: example.com contact, no real data', () => {
    expect(DEMO_CV).toMatch(/@example\.com/)
    expect(DEMO_CV).not.toMatch(/linkedin\.com|github\.com\/(?!example)/)
  })

  it('has 5 applications, one per stage', () => {
    expect(DEMO_APPLICATIONS.map(a => a.status).sort()).toEqual(['APPLIED', 'OFFER', 'PHONE', 'REJECTED', 'TECHNICAL'])
  })

  it('the adapted CV shows the flagship feature: exactly one invented technology, removable in one click', () => {
    const withCv = DEMO_APPLICATIONS.filter(a => a.adaptedCvText)
    expect(withCv).toHaveLength(1)
    const issues = checkAdaptedCv(DEMO_CV, withCv[0]!.adaptedCvText!)
    expect(issues).toEqual([expect.objectContaining({ kind: 'technology', unsupported: ['Kubernetes'] })])
    expect(isFixable(issues[0]!)).toBe(true)
  })

  it('the cover letter has one generic phrase flagged, and nothing else', () => {
    const withLetter = DEMO_APPLICATIONS.filter(a => a.coverLetter)
    expect(withLetter).toHaveLength(1)
    expect(checkCoverLetter(DEMO_CV, withLetter[0]!.coverLetter!)).toEqual([
      expect.objectContaining({ kind: 'hollow', unsupported: ['aligns perfectly'] }),
    ])
  })

  it('one application has interview questions ready', () => {
    const withQs = DEMO_APPLICATIONS.filter(a => a.interviewQs?.length)
    expect(withQs).toHaveLength(1)
  })
})
