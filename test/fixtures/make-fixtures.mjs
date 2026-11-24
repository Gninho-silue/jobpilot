// Regenerates the PDF fixtures used by the CV upload tests.
// Run from the repo root: node test/fixtures/make-fixtures.mjs
//
// - cv-1-page.pdf   one page of real text
// - cv-2-pages.pdf  text on two pages (page 2 has its own marker)
// - cv-scanned.pdf  one page holding only a raster image, no text layer,
//                   like a scanned paper CV
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { Document, Image, Page, Text, renderToFile } from '@react-pdf/renderer'

const h = React.createElement
const out = name => fileURLToPath(new URL(name, import.meta.url))

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
// Grayscale PNG: white page with dark horizontal bars standing in for lines of text.
function scanLikePng(width, height) {
  const rows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width + 1, 0xff)
    row[0] = 0 // filter: none
    const inLine = y % 24 >= 8 && y % 24 < 16
    if (inLine) for (let x = 20; x < width - 20 - (y % 48) * 2; x++) row[x + 1] = 0x30
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 0 // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const page = (...children) => h(Page, { size: 'A4', style: { padding: 40, fontSize: 11 } }, ...children)

await renderToFile(
  h(Document, null, page(
    h(Text, null, 'Jane Doe'),
    h(Text, null, 'Backend Developer'),
    h(Text, null, 'Acme Corp 2023 - 2025: built REST APIs with Node.js and PostgreSQL.'),
  )),
  out('cv-1-page.pdf'),
)

await renderToFile(
  h(Document, null,
    page(h(Text, null, 'Jane Doe'), h(Text, null, 'PAGE ONE MARKER: professional experience')),
    page(h(Text, null, 'PAGE TWO MARKER: education and certifications')),
  ),
  out('cv-2-pages.pdf'),
)

const png = scanLikePng(400, 560)
await renderToFile(
  h(Document, null, page(h(Image, { src: { data: png, format: 'png' }, style: { width: 400, height: 560 } }))),
  out('cv-scanned.pdf'),
)

console.log('fixtures written')
