// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NewApplicationModal } from './new-application-modal'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const OFFER = 'Globex is hiring a Backend Engineer in Lyon to build REST APIs with Java and Spring Boot.'

function pasteOffer(response: Response | Error) {
  if (response instanceof Error) fetchMock.mockRejectedValueOnce(response)
  else fetchMock.mockResolvedValueOnce(response)
  render(<NewApplicationModal open onOpenChange={() => {}} onCreated={() => {}} />)
  fireEvent.change(screen.getByPlaceholderText('Paste the job offer here...'), { target: { value: OFFER } })
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
// The analysis starts 800 ms after the last keystroke.
const message = () => screen.findByRole('status', {}, { timeout: 3000 })

describe('NewApplicationModal — the offer analysis is never silent', () => {
  it('fills the fields when the analysis finds them', async () => {
    pasteOffer(json(200, { data: { company: 'Globex', role: 'Backend Engineer', salary: null } }))
    expect(await screen.findByDisplayValue('Globex', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('nothing found: says so', async () => {
    pasteOffer(json(200, { data: { company: null, role: null, salary: null } }))
    expect(await message()).toHaveTextContent('No company, role or salary found in this offer: fill them in by hand.')
  })

  it('analysis failed (502): shows the server message', async () => {
    pasteOffer(json(502, { error: 'The offer analysis failed. Fill in the fields by hand or try again.' }))
    expect(await message()).toHaveTextContent('The offer analysis failed. Fill in the fields by hand or try again.')
  })

  it('rate limited (429): says to wait', async () => {
    pasteOffer(json(429, { error: 'Too many requests. Please wait before trying again.' }))
    expect(await message()).toHaveTextContent('Too many requests. Please wait before trying again.')
  })

  it('network error: says so', async () => {
    pasteOffer(new TypeError('Failed to fetch'))
    expect(await message()).toHaveTextContent('Could not analyse the offer (network error). Fill in the fields by hand.')
  })
})
