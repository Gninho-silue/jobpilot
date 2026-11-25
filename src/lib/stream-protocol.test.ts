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
