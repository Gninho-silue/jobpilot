import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The `cvs` bucket must be reachable only through short-lived signed URLs
// generated after an ownership check (src/app/api/cv/file/route.ts).
// Fails if anything builds or uses a public Storage URL again.

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SCANNED = ['src', 'test', 'scripts']
const SELF = relative(ROOT, fileURLToPath(import.meta.url))
const FORBIDDEN = ['getPublicUrl', '/object/public/']

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : files(path)
    return /\.(ts|tsx|js|mjs|cjs)$/.test(name) ? [path] : []
  })
}

describe('no public Storage URL anywhere in the code', () => {
  const sources = SCANNED.flatMap(dir => {
    try {
      return files(join(ROOT, dir))
    } catch {
      return []
    }
  }).filter(path => relative(ROOT, path) !== SELF)

  it('scans the source tree', () => {
    expect(sources.length).toBeGreaterThan(50)
  })

  it.each(FORBIDDEN)('no occurrence of %s', needle => {
    const offenders = sources.filter(path => readFileSync(path, 'utf8').includes(needle)).map(path => relative(ROOT, path))
    expect(offenders).toEqual([])
  })
})
