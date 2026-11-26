import { describe, expect, it } from 'vitest'
import { assertProductionAppUrl } from './env'

const prod = (url?: string) => ({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: url })

describe('NEXT_PUBLIC_APP_URL in a production build', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['http://', 'http://jobpilot-jet.vercel.app'],
    ['localhost', 'https://localhost:3000'],
    ['127.0.0.1', 'https://127.0.0.1'],
    ['the 25/11 value', 'http://localhost:3000'],
    ['not a URL', 'jobpilot-jet.vercel.app'],
  ])('%s → the build fails', (_name, url) => {
    expect(() => assertProductionAppUrl(prod(url))).toThrow(/NEXT_PUBLIC_APP_URL/)
  })

  it('the production URL passes', () => {
    expect(() => assertProductionAppUrl(prod('https://jobpilot-jet.vercel.app'))).not.toThrow()
  })

  it('preview and local builds are not checked', () => {
    expect(() => assertProductionAppUrl({ VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' })).not.toThrow()
    expect(() => assertProductionAppUrl({ NEXT_PUBLIC_APP_URL: undefined })).not.toThrow()
  })
})
