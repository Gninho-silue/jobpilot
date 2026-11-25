import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// window.confirm / alert / prompt block the page and Chrome can suppress them
// silently ("Regenerate" did nothing in production): use useConfirm instead.
const SRC = fileURLToPath(new URL('../../src', import.meta.url))
const NATIVE = /\b(?:window\.)?(?:confirm|alert|prompt)\(/

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) && !name.includes('.test.') ? [path] : []
  })
}

describe('no native browser dialog in the app', () => {
  it('no window.confirm, alert or prompt', () => {
    const offenders = files(SRC).filter(path => {
      // `confirm(` from useConfirm is fine; only the global functions are banned.
      const code = readFileSync(path, 'utf8').replace(/const \[confirm[^\n]*|await confirm\(/g, '')
      return NATIVE.test(code)
    })
    expect(offenders.map(path => relative(SRC, path))).toEqual([])
  })
})
