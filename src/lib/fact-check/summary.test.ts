import { describe, expect, it } from 'vitest'
import { summarizeIssues, toCheckItems, type StoredFactCheck } from './summary'
import type { ReviewedIssue } from './fix-issue'

const issue = (kind: ReviewedIssue['kind'], unsupported: string[]): ReviewedIssue =>
  ({ id: `${kind}-1`, kind, line: 'x', lineIndex: 1, unsupported, fixable: false }) as ReviewedIssue

describe('summarizeIssues: what is stored when a text is written', () => {
  it('keeps the kind and the unsupported items of each issue, with the time', () => {
    const now = new Date('2026-11-26T10:00:00Z')
    expect(summarizeIssues([issue('technology', ['Kubernetes']), issue('hollow', ['aligns perfectly'])], now)).toEqual({
      checkedAt: '2026-11-26T10:00:00.000Z',
      issues: [
        { kind: 'technology', unsupported: ['Kubernetes'] },
        { kind: 'hollow', unsupported: ['aligns perfectly'] },
      ],
    })
  })
})

const stored = (...issues: Array<[string, string[]]>): StoredFactCheck => ({
  checkedAt: '2026-11-26T10:00:00.000Z',
  issues: issues.map(([kind, unsupported]) => ({ kind, unsupported })),
})

describe('toCheckItems: the dashboard "To check" list, from stored results only', () => {
  it('claims of the adapted CV, then of the letter (generic phrases apart), then offers', () => {
    const items = toCheckItems([
      { id: 'a', company: 'Northwind Traders', status: 'APPLIED', adaptedCvCheck: stored(['technology', ['Kubernetes']]), coverLetterCheck: stored(['hollow', ['aligns perfectly']]) },
      { id: 'b', company: 'Adventure Works', status: 'OFFER', adaptedCvCheck: null, coverLetterCheck: null },
      { id: 'c', company: 'Tailspin Toys', status: 'PHONE', adaptedCvCheck: stored(), coverLetterCheck: null },
    ])
    expect(items).toEqual([
      { applicationId: 'a', company: 'Northwind Traders', tone: 'claim', text: 'Adapted CV: 1 claim not found in your CV', example: 'Kubernetes' },
      { applicationId: 'a', company: 'Northwind Traders', tone: 'phrase', text: 'Cover letter: 1 generic phrase', example: 'aligns perfectly' },
      { applicationId: 'b', company: 'Adventure Works', tone: 'offer', text: 'At the offer stage', example: null },
    ])
  })

  it('counts several claims, and a letter with claims and generic phrases gives two items', () => {
    const items = toCheckItems([
      {
        id: 'a',
        company: 'Contoso',
        status: 'TECHNICAL',
        adaptedCvCheck: stored(['technology', ['Terraform', 'Ansible']], ['number', ['45%']]),
        coverLetterCheck: stored(['claim', []], ['hollow', ['high-profile']], ['hollow', ['proven ability']]),
      },
    ])
    expect(items.map(i => `${i.text} · ${i.example}`)).toEqual([
      'Adapted CV: 2 claims not found in your CV · Terraform',
      'Cover letter: 1 claim not found in your CV · null',
      'Cover letter: 2 generic phrases · high-profile',
    ])
  })

  it('"verify" issues (in the CV, under another entry) are not listed', () => {
    expect(toCheckItems([{ id: 'a', company: 'X', status: 'APPLIED', adaptedCvCheck: stored(['verify', ['Docker']]), coverLetterCheck: null }])).toEqual([])
  })

  it('no stored result → nothing listed (the checker is never run here)', () => {
    expect(toCheckItems([{ id: 'a', company: 'X', status: 'APPLIED', adaptedCvCheck: null, coverLetterCheck: null }])).toEqual([])
  })
})
