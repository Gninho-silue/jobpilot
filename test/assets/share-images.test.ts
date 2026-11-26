import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url))

/** Width and height from a PNG header (IHDR). */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(PUBLIC + file)
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('share images', () => {
  it('og.png is 1200 × 630 and under 300 KB (OpenGraph and Twitter)', () => {
    expect(pngSize('og.png')).toEqual({ width: 1200, height: 630 })
    expect(statSync(PUBLIC + 'og.png').size).toBeLessThan(300 * 1024)
  })

  it('apple-icon.png exists, 180 × 180, as declared in the metadata', () => {
    expect(pngSize('apple-icon.png')).toEqual({ width: 180, height: 180 })
    const layout = readFileSync(fileURLToPath(new URL('../../src/app/layout.tsx', import.meta.url)), 'utf8')
    expect(layout).toContain("url: '/apple-icon.png', sizes: '180x180'")
  })
})
