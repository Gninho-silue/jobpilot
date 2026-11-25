/**
 * Text clean-up shared by CV extraction, prompts and PDF rendering.
 *
 * Two sources of broken characters were found in production:
 * - the LLM writes typographic Unicode (U+2011 non-breaking hyphen, U+202F
 *   narrow no-break space) that the built-in PDF font cannot draw: the hyphen
 *   became a space ("e commerce") and U+202F a slash ("100/%", "Odoo/17");
 * - text extracted from LaTeX PDFs has accents detached from their letter
 *   ("Silu´e", "Compl`ete", "´Ecole").
 */

const HYPHENS = /[‐‑‒−]/g
const SOFT_HYPHEN_AND_ZERO_WIDTH = /[­​‌‍⁠﻿]/g
const NARROW_SPACE_BEFORE_PERCENT = /(\d)[     ]%/g
const SPECIAL_SPACES = /[       ]/g

// Spacing accent (as extracted from LaTeX) → combining mark.
const DETACHED_ACCENT: Record<string, string> = {
  '´': '́', // ´ acute
  '¨': '̈', // ¨ diaeresis
  'ˆ': '̂', // ˆ circumflex
  '˜': '̃', // ˜ tilde
  '¸': '̧', // ¸ cedilla
}
const DETACHED_BEFORE_LETTER = /([´¨ˆ˜¸])([A-Za-zı])/g
// A grave accent is also a backtick: only compose it inside a word, before a vowel.
const GRAVE_INSIDE_WORD = /(?<=\p{L})`([aeiouAEIOU])/gu

export function normalizeTypography(text: string): string {
  return text
    .replace(SOFT_HYPHEN_AND_ZERO_WIDTH, '')
    .replace(HYPHENS, '-')
    .replace(NARROW_SPACE_BEFORE_PERCENT, '$1%')
    .replace(SPECIAL_SPACES, ' ')
    .replace(DETACHED_BEFORE_LETTER, (_m, accent: string, letter: string) =>
      (letter === 'ı' ? 'i' : letter) + DETACHED_ACCENT[accent]
    )
    .replace(GRAVE_INSIDE_WORD, (_m, vowel: string) => vowel + '̀')
    .normalize('NFC')
}

// Characters of the WinAnsi encoding used by the PDF standard fonts (Helvetica).
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
function isWinAnsi(char: string): boolean {
  const code = char.codePointAt(0)!
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || char === '\n' || WIN_ANSI_EXTRA.includes(char)
}

const ARROWS: Array<[RegExp, string]> = [
  [/[→⇒➔➜⟶]/g, '->'],
  [/[←⇐⟵]/g, '<-'],
  [/[↖-↙⇗]/g, ''],
]
const NO_DECOMPOSITION: Record<string, string> = { Ł: 'L', ł: 'l', Đ: 'D', đ: 'd', ı: 'i', Ħ: 'H', ħ: 'h' }

/** normalizeTypography, then only characters the built-in Helvetica can draw. */
export function toPdfSafe(text: string): string {
  let out = normalizeTypography(text)
  for (const [pattern, replacement] of ARROWS) out = out.replace(pattern, replacement)

  out = Array.from(out, char => {
    if (isWinAnsi(char)) return char
    if (NO_DECOMPOSITION[char]) return NO_DECOMPOSITION[char]
    const base = char.normalize('NFKD').replace(/\p{M}/gu, '')
    return Array.from(base).every(isWinAnsi) ? base : ''
  }).join('')

  // Dropped symbols leave double or trailing spaces behind.
  return out.replace(/ {2,}/g, ' ').replace(/ +$/gm, '')
}
