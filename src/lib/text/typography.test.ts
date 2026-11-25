import { describe, expect, it } from 'vitest'
import { normalizeTypography, toPdfSafe } from './typography'

describe('normalizeTypography', () => {
  it.each([
    ['non-breaking hyphen U+2011', 'e‑commerce', 'e-commerce'],
    ['hyphen U+2010', 'end‐to‐end', 'end-to-end'],
    ['figure dash U+2012', '2023‒2026', '2023-2026'],
    ['minus sign U+2212', '−5', '-5'],
    ['soft hyphen U+00AD is removed', 'e­commerce', 'ecommerce'],
  ])('hyphens: %s', (_name, input, expected) => {
    expect(normalizeTypography(input)).toBe(expected)
  })

  it.each([
    ['narrow no-break space before %', '100 %', '100%'],
    ['thin space before %', '60 %', '60%'],
    ['narrow no-break space between words', 'Odoo 17', 'Odoo 17'],
    ['thin space between words', 'Odoo 17', 'Odoo 17'],
    ['no-break space', 'Odoo 17', 'Odoo 17'],
    ['zero-width characters are removed', 'Fast​API﻿', 'FastAPI'],
  ])('spaces: %s', (_name, input, expected) => {
    expect(normalizeTypography(input)).toBe(expected)
  })

  it.each([
    ['LaTeX acute before its letter', 'Zo´e Martin-Ferr´e', 'Zoé Martin-Ferré'],
    ['LaTeX acute on a capital', '´Ecole d\'Ing´enieurs', "École d'Ingénieurs"],
    ['LaTeX grave inside a word', 'Compl`ete', 'Complète'],
    ['LaTeX diaeresis and circumflex', 'Ma¨ıs, hˆotel', 'Maïs, hôtel'],
    ['combining acute is composed', 'Zoé', 'Zoé'],
    ['upper-case name', 'ZO´E MARTIN-FERR´E', 'ZOÉ MARTIN-FERRÉ'],
  ])('accents: %s', (_name, input, expected) => {
    expect(normalizeTypography(input)).toBe(expected)
  })

  it('leaves ordinary text alone: -, %, é, &, _, /, backticks in code, CI/CD, 24/7', () => {
    const text = "C'est 100% e-commerce & data_eng: CI/CD, 24/7, Python/Backend, `npm test`, Café – Lyon — 2026"
    expect(normalizeTypography(text)).toBe(text)
  })
})

describe('toPdfSafe (characters the built-in Helvetica font can draw)', () => {
  it('keeps ASCII, Latin-1 and the typographic marks Helvetica has', () => {
    const text = "Zoé Martin-Ferré · 95% · R&D · data_eng · « Complète » – — • ’ “ ” …"
    expect(toPdfSafe(text)).toBe(text)
  })

  it('normalises typography first', () => {
    expect(toPdfSafe('e‑commerce 100 % Zo´e')).toBe('e-commerce 100% Zoé')
  })

  it('replaces arrows with ASCII equivalents and drops other unsupported symbols', () => {
    expect(toPdfSafe('Draft → Evaluated')).toBe('Draft -> Evaluated')
    expect(toPdfSafe('GitHub ↗')).toBe('GitHub')
    expect(toPdfSafe('Deploy \u{1F680} done')).toBe('Deploy done')
  })

  it('decomposes letters outside Latin-1 instead of dropping them', () => {
    // ó and á are in Latin-1 (kept); Ł, ź, ř are not (base letter kept).
    expect(toPdfSafe('Łódź, Dvořák')).toBe('Lódz, Dvorák')
  })
})
