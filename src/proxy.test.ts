import { describe, expect, it } from 'vitest'
import { config } from './proxy'

// The matcher decides which requests go through Clerk and the demo cookie check.
// A lost backslash once made it match "/" only: every app page then crashed.
const matches = (path: string) => config.matcher.some(pattern => new RegExp(`^${pattern}$`).test(path))

describe('proxy matcher', () => {
  it.each(['/', '/dashboard', '/applications', '/settings', '/my-cv', '/interview', '/api/applications', '/api/demo', '/api/applications/abc/cover-letter-pdf'])(
    'runs on %s',
    path => expect(matches(path)).toBe(true)
  )

  it.each(['/_next/static/chunk.js', '/favicon.ico', '/logo.svg'])('skips static file %s', path => {
    expect(matches(path)).toBe(false)
  })
})
