import { describe, expect, it } from 'vitest'
import { STREAM_REPLACE, visibleStreamText } from './stream-protocol'

describe('visibleStreamText', () => {
  it('shows the streamed text as is', () => {
    expect(visibleStreamText('Jane Doe\nEngineer')).toBe('Jane Doe\nEngineer')
  })

  it('after a replace marker, shows only what follows it (the corrected version)', () => {
    expect(visibleStreamText(`first draft${STREAM_REPLACE}corrected`)).toBe('corrected')
    expect(visibleStreamText(`a${STREAM_REPLACE}b${STREAM_REPLACE}c`)).toBe('c')
  })

  it('a marker split across chunks is not shown while incomplete', () => {
    expect(visibleStreamText('draft\u001Erep')).toBe('draft')
  })
})

describe('streamError', () => {
  it('returns the message after an error marker, and hides the draft', async () => {
    const { STREAM_ERROR, streamError } = await import('./stream-protocol')
    const received = `draft text${STREAM_ERROR}The AI answer was cut off. Please try again.`
    expect(streamError(received)).toBe('The AI answer was cut off. Please try again.')
    expect(streamError('draft only')).toBeNull()
    expect(visibleStreamText(received)).toBe('')
  })
})
