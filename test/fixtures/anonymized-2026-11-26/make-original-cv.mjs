// Builds original-cv.pdf from original-cv.pages.txt: a 3-page CV laid out like
// the real one of 2026-11-26 (anonymised), for the multi-page tests in CI.
// - one text line per source line ("=== PAGE ===" starts a new page), so entry
//   titles wrap onto a second line that holds the date, as in the real PDF;
// - "Name / Page X of Y" repeated at the bottom of every page;
// - link annotations on the labels (LinkedIn, GitHub, Portfolio, Live demo).
// Run from the repo root: node test/fixtures/anonymized-2026-11-26/make-original-cv.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { Document, Link, Page, Text, renderToFile } from '@react-pdf/renderer'

const h = React.createElement
const here = name => fileURLToPath(new URL(name, import.meta.url))
const NAME = 'Zoé Martin-Ferré'

// [line prefix, label, url]: which label of which line is a link.
const LINKS = [
  ['+000 600 000 000', 'LinkedIn', 'https://www.linkedin.com/in/zoe-test'],
  ['GitHub · Portfolio', 'GitHub', 'https://github.com/zoe-test'],
  ['GitHub · Portfolio', 'Portfolio', 'https://zoe-test.example.com/'],
  ['Testcontainers | GitHub', 'GitHub', 'https://github.com/zoe-test/banking-platform'],
  ['HireLoop |', 'Live', 'https://hireloop.example.com/'],
  ['TaskWeave |', 'GitHub', 'https://github.com/zoe-test/taskweave'],
  ['Atlas |', 'Live demo', 'https://atlas.example.com/'],
]

function line(text, key) {
  const link = LINKS.find(([prefix, label]) => text.startsWith(prefix) && text.includes(label))
  if (!link) return h(Text, { key }, text)
  const [, label, url] = link
  const at = text.lastIndexOf(label)
  return h(Text, { key }, text.slice(0, at), h(Link, { src: url }, label), text.slice(at + label.length))
}

const pages = readFileSync(here('original-cv.pages.txt'), 'utf8')
  .replace(/\r\n/g, '\n')
  .trimEnd()
  .split('\n=== PAGE ===\n')
  .map(page => page.split('\n'))

const footer = h(Text, { fixed: true, render: ({ pageNumber, totalPages }) => `${NAME}\nPage ${pageNumber} of ${totalPages}` })

await renderToFile(
  h(
    Document,
    null,
    pages.map((lines, index) =>
      h(Page, { key: index, size: 'A4', style: { padding: 40, fontSize: 8.5, fontFamily: 'Helvetica' } }, ...lines.map(line), footer)
    )
  ),
  here('original-cv.pdf')
)
console.log('original-cv.pdf written')
