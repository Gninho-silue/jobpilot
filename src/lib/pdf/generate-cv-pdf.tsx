import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

// Disable hyphenation — no word splitting in CV text
Font.registerHyphenationCallback(w => [w])

// ── Emoji / encoding sanitization ────────────────────────────────────────────
// Built-in PDF fonts (Helvetica, Courier) support Basic Latin + Latin Extended
// only. Emoji characters render as garbage (e.g. 📍→Í, 📞→ñ, ✉→ç).
// We strip/replace them before the text reaches the renderer.

const CONTACT_LINE_RE = /@\w|(?:\+?\d[\d \-().]{5,})|(github|linkedin|portfolio|gitlab|twitter|http)/i

function replaceContactEmoji(s: string): string {
  return s
    .replace(/📍\s*/g, '')
    .replace(/📞\s*|📱\s*/g, '')
    .replace(/✉️?\s*/g, '')
    .replace(/🔗\s*|🌐\s*/g, '')
    .replace(/💼\s*|👤\s*/g, '')
    // Garbled versions: same emoji rendered as wrong Latin chars by react-pdf
    // Safe to strip only when the char appears as an isolated icon (surrounded by spaces)
    .replace(/(^|\s)Í\s+/g, ' ')
    .replace(/(^|\s)ñ\s+/g, ' ')
    .replace(/(^|\s)ç\s+/g, ' ')
}

function stripNonPrintable(s: string): string {
  // Keep Basic Latin (0x20–0x7E) + Latin Extended A/B (U+00C0–U+024F)
  return s.replace(/[^\x20-\x7EÀ-ɏ]/g, '')
}

function sanitizeLine(line: string): string {
  if (CONTACT_LINE_RE.test(line)) {
    // Contact info line: clean emoji icons then reformat segments with · separator
    const cleaned = stripNonPrintable(replaceContactEmoji(line))
    const parts = cleaned
      .split(/\s{2,}|\s*[|]\s*|\s+·\s+/)
      .map(p => p.trim())
      .filter(Boolean)
    return parts.length > 1 ? parts.join('  ·  ') : cleaned.trim()
  }
  // All other lines: just strip emoji / non-printable chars
  return stripNonPrintable(line)
}

function preprocessCvText(text: string): string {
  return text.split('\n').map(sanitizeLine).join('\n')
}

// ── Section parsing ───────────────────────────────────────────────────────────

const SECTION_KEYWORDS = new Set([
  'PROFILE', 'SUMMARY', 'ABOUT', 'OBJECTIVE', 'RÉSUMÉ', 'RESUME',
  'SKILLS', 'TECHNICAL SKILLS', 'TECHNOLOGIES', 'COMPETENCES', 'COMPÉTENCES',
  'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE',
  'EXPÉRIENCE', 'EXPÉRIENCES', 'EXPÉRIENCE PROFESSIONNELLE',
  'PROJECTS', 'PROJETS', 'PORTFOLIO', 'OPEN SOURCE',
  'EDUCATION', 'FORMATION', 'DIPLOMES', 'DIPLÔMES', 'STUDIES', 'ÉTUDES',
  'CERTIFICATIONS', 'CERTIFICATIONS & AWARDS', 'AWARDS',
  'LANGUAGES', 'LANGUES',
  'CONTACT', 'CONTACTS', 'REFERENCES', 'RÉFÉRENCES',
  'INTERESTS', 'HOBBIES', 'LOISIRS',
])

function isSectionHeader(line: string): boolean {
  const t = line.trim()
  if (t.length < 2 || t.length > 60) return false
  const upper = t.toUpperCase()
  if (SECTION_KEYWORDS.has(upper)) return true
  // All-uppercase short line (letters, spaces, accents, & /)
  return /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ\s&\/\-]+$/.test(t) && t.length <= 40
}

interface CvSection {
  title: string
  lines: string[]
}

interface ParsedCv {
  name: string
  subtitle: string
  sections: CvSection[]
}

export function parseCvText(cvText: string): ParsedCv {
  const raw = cvText.split('\n').map(l => l.trimEnd())

  const nameIdx = raw.findIndex(l => l.trim().length > 0)
  const name = nameIdx >= 0 ? raw[nameIdx]!.trim() : ''

  let subtitle = ''
  let bodyStart = nameIdx + 1
  for (let i = nameIdx + 1; i < Math.min(nameIdx + 4, raw.length); i++) {
    const t = raw[i]!.trim()
    if (!t) continue
    if (!isSectionHeader(t) && t.length < 80) {
      subtitle = t
      bodyStart = i + 1
    }
    break
  }

  const sections: CvSection[] = []
  let current: CvSection | null = null

  for (let i = bodyStart; i < raw.length; i++) {
    const trimmed = raw[i]!.trim()
    if (isSectionHeader(trimmed)) {
      if (current) sections.push(current)
      current = { title: trimmed, lines: [] }
    } else {
      if (!current) current = { title: '', lines: [] }
      current.lines.push(trimmed)
    }
  }
  if (current) sections.push(current)

  const clean = sections
    .map(s => {
      const lines = [...s.lines]
      while (lines.length && lines[lines.length - 1] === '') lines.pop()
      return { ...s, lines }
    })
    .filter(s => s.lines.length > 0)

  return { name, subtitle, sections: clean }
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Built-in PDF fonts used (no external files needed — always renders reliably).
// Helvetica-Bold for name/headings, Helvetica for body.

const C = {
  black:    '#0F172A',
  body:     '#1E293B',
  muted:    '#64748B',
  accent:   '#92400E',   // amber-800 — legible on white
  border:   '#CBD5E1',
  white:    '#FFFFFF',
}

const S = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 44,
    fontSize: 9.5,
    color: C.body,
    lineHeight: 1.5,
  },
  // Header
  name: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: C.black,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.muted,
    marginBottom: 10,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
    marginBottom: 2,
  },
  // Section
  section: { marginTop: 14 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  // Content lines — bullet items use Courier for monospace feel
  bullet: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: C.body,
    lineHeight: 1.5,
    marginBottom: 1.5,
  },
  normal: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: C.body,
    lineHeight: 1.5,
    marginBottom: 1,
  },
  gap: { marginBottom: 5 },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const BULLET_RE = /^[-•*·▸►>]\s+/

function ContentLine({ line }: { line: string }) {
  if (BULLET_RE.test(line)) {
    return <Text style={S.bullet}>{line}</Text>
  }
  return <Text style={S.normal}>{line}</Text>
}

// ── Document ─────────────────────────────────────────────────────────────────

function CvDocument({ name, subtitle, sections }: ParsedCv) {
  return (
    <Document
      title={name ? `${name} — Adapted CV` : 'Adapted CV'}
      author="JobPilot"
      creator="JobPilot"
    >
      <Page size="A4" style={S.page}>
        {/* Header */}
        {name ? <Text style={S.name}>{name}</Text> : null}
        {subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}
        <View style={S.headerRule} />

        {/* Sections */}
        {sections.map((sec, i) => (
          <View key={i} style={S.section} wrap={false}>
            {sec.title ? <Text style={S.sectionTitle}>{sec.title}</Text> : null}
            {sec.lines.map((line, j) =>
              line === '' ? (
                <View key={j} style={S.gap} />
              ) : (
                <ContentLine key={j} line={line} />
              )
            )}
          </View>
        ))}
      </Page>
    </Document>
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateCvPdf(adaptedCvText: string): Promise<Buffer> {
  const parsed = parseCvText(preprocessCvText(adaptedCvText))
  return renderToBuffer(
    <CvDocument
      name={parsed.name}
      subtitle={parsed.subtitle}
      sections={parsed.sections}
    />
  )
}
