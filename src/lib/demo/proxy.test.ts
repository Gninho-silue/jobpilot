import { describe, expect, it } from 'vitest'
import { DEMO_TTL_MS, signDemoCookie } from './cookie'
import { demoProxyDecision } from './proxy'

describe('demo cookie in the proxy', () => {
  it('a valid demo cookie without a Clerk session reaches the app', () => {
    expect(demoProxyDecision({ userId: null, cookieValue: signDemoCookie('demo_visitor01') })).toEqual({ allowDemo: true, clearCookie: false })
  })

  it('signing in with Clerk during a demo removes the demo cookie', () => {
    expect(demoProxyDecision({ userId: 'user_real01', cookieValue: signDemoCookie('demo_visitor01') })).toEqual({ allowDemo: false, clearCookie: true })
  })

  it('an expired or forged cookie is removed and grants nothing', () => {
    const expired = signDemoCookie('demo_visitor01', Date.now() - DEMO_TTL_MS - 1)
    expect(demoProxyDecision({ userId: null, cookieValue: expired })).toEqual({ allowDemo: false, clearCookie: true })
    expect(demoProxyDecision({ userId: null, cookieValue: 'forged.1.x' })).toEqual({ allowDemo: false, clearCookie: true })
  })

  it('no cookie: nothing to do', () => {
    expect(demoProxyDecision({ userId: null, cookieValue: undefined })).toEqual({ allowDemo: false, clearCookie: false })
    expect(demoProxyDecision({ userId: 'user_real01', cookieValue: undefined })).toEqual({ allowDemo: false, clearCookie: false })
  })
})
