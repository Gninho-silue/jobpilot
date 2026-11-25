// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReviewedIssue } from '@/lib/fact-check/fix-issue'
import { FactCheckPanel } from './fact-check-panel'

afterEach(cleanup)

const ISSUES: ReviewedIssue[] = [
  { id: 'title-1', kind: 'title', line: 'Digital Transformation Consultant | Python', lineIndex: 1, unsupported: ['Digital Transformation Consultant'], expected: 'AI Software Engineer', fixable: true },
  { id: 'technology-22', kind: 'technology', entry: 'Full-Stack Developer Intern', line: '- Integrated backend services with PostgreSQL and Redis.', lineIndex: 22, unsupported: ['PostgreSQL', 'Redis'], fixable: true },
  { id: 'company-7', kind: 'company', entry: 'Backend Developer', line: '>COMPANY: Globex', lineIndex: 7, unsupported: ['Globex'], fixable: false },
]

function setup(issues = ISSUES, busy = false) {
  const onFix = vi.fn()
  const onApproveTitle = vi.fn()
  render(<FactCheckPanel issues={issues} busy={busy} onFix={onFix} onApproveTitle={onApproveTitle} />)
  return { onFix, onApproveTitle }
}

describe('FactCheckPanel', () => {
  it('renders nothing when there is no issue', () => {
    const { container } = render(<FactCheckPanel issues={[]} busy={false} onFix={vi.fn()} onApproveTitle={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('says how many claims are not in the CV and lists each with its unsupported items', () => {
    setup()
    expect(screen.getByRole('heading', { name: '3 claims not found in your CV' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[1]!).getByText('Full-Stack Developer Intern')).toBeInTheDocument()
    expect(within(items[1]!).getByText('PostgreSQL, Redis')).toBeInTheDocument()
    expect(within(items[1]!).getByText(/Integrated backend services/)).toBeInTheDocument()
  })

  it('removes a claim in one click', async () => {
    const { onFix } = setup()
    const item = screen.getAllByRole('listitem')[1]!
    await userEvent.click(within(item).getByRole('button', { name: 'Remove' }))
    expect(onFix).toHaveBeenCalledWith('technology-22')
  })

  it('title: restore the CV title, or keep the new one explicitly', async () => {
    const { onFix, onApproveTitle } = setup()
    const item = screen.getAllByRole('listitem')[0]!
    await userEvent.click(within(item).getByRole('button', { name: 'Use “AI Software Engineer”' }))
    expect(onFix).toHaveBeenCalledWith('title-1')
    await userEvent.click(within(item).getByRole('button', { name: 'Keep “Digital Transformation Consultant”' }))
    expect(onApproveTitle).toHaveBeenCalledWith('Digital Transformation Consultant')
  })

  it('an issue without a one-click fix explains what to do and has no Remove button', () => {
    setup()
    const item = screen.getAllByRole('listitem')[2]!
    expect(within(item).queryByRole('button')).toBeNull()
    expect(within(item).getByText(/regenerate or edit/i)).toBeInTheDocument()
  })

  it('buttons are disabled while a change is being saved', () => {
    setup(ISSUES, true)
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  })
})

describe('FactCheckPanel — cover letter issues', () => {
  it('shows merged experiences and statements about the candidate, without a one-click fix', () => {
    setup([
      { id: 'claim-2', kind: 'claim', line: 'I have closely followed Contoso.', lineIndex: 2, unsupported: [], fixable: false },
      { id: 'merged-5', kind: 'merged', entry: 'Final Year Project', line: 'I also automated a workflow.', lineIndex: 5, unsupported: ['45%', '5'], fixable: false },
    ])
    const [claim, merged] = screen.getAllByRole('listitem')
    expect(within(claim!).getByText('Statement about you not in your CV')).toBeInTheDocument()
    expect(within(merged!).getByText(/Facts from another experience/)).toBeInTheDocument()
    expect(within(merged!).getByText('45%, 5')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('a changed figure says which figure the CV has', () => {
    setup([
      { id: 'number-3', kind: 'number', entry: 'Final Year Project', line: "J'ai conçu cinq modules.", lineIndex: 3, unsupported: ['5'], expected: '7', fixable: false },
    ])
    expect(screen.getByText(/Number different from your CV \(7\)/)).toBeInTheDocument()
  })
})
