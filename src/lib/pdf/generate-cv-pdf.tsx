import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer, Link } from '@react-pdf/renderer'

// Disable hyphenation
Font.registerHyphenationCallback(w => [w])

// ── Color palette (mirrors the LaTeX template) ───────────────────────────────
const C = {
  black:   '#000000',
  body:    '#1a1a1a',
  muted:   '#444444',
  rule:    '#000000',
  white:   '#FFFFFF',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    paddingHorizontal: 42,
    paddingTop: 36,
    paddingBottom: 36,
    fontSize: 9,
    color: C.body,
    fontFamily: 'Helvetica',
    lineHeight: 1.35,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: C.black,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: C.body,
    marginTop: 2,
    marginBottom: 5,
    textAlign: 'center',
  },
  contactLine: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.muted,
    textAlign: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
  },
  contactPart: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.muted,
  },
  contactSep: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.muted,
    paddingHorizontal: 4,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  section: { marginTop: 10 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: C.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: C.rule,
  },

  // ── Experience / Education entry ───────────────────────────────────────────
  entryBlock: {
    marginTop: 4,
    marginBottom: 1,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: C.black,
    flex: 1,
  },
  entryDate: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.muted,
    textAlign: 'right',
  },
  entrySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 0.5,
  },
  entryCompany: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 8.5,
    color: C.muted,
    flex: 1,
  },
  entryTech: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 8,
    color: C.muted,
    flex: 1,
  },
  entryLink: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 8,
    color: '#1155CC',
    textAlign: 'right',
  },

  // ── Bullets ────────────────────────────────────────────────────────────────
  bulletList: {
    marginTop: 2,
    paddingLeft: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.body,
    marginRight: 4,
    marginTop: 0.5,
    lineHeight: 1.35,
  },
  bulletText: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.body,
    lineHeight: 1.35,
    flex: 1,
  },

  // ── Skills / Profile plain text ───────────────────────────────────────────
  bodyText: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.body,
    lineHeight: 1.45,
    marginTop: 3,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 1.5,
  },
  skillLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: C.black,
  },
  skillValue: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.body,
  },
  emptyGap: { height: 3 },
})

// ── Structured CV types ───────────────────────────────────────────────────────

interface CvEntry {
  title: string
  company?: string
  date?: string
  tech?: string
  link?: string
  bullets: string[]
}

interface CvSection {
  heading: string
  paragraphs: string[]  // for profile / skills
  entries: CvEntry[]
}

interface ParsedCv {
  name: string
  subtitle: string
  contactParts: string[]
  sections: CvSection[]
}

// ── Parser ────────────────────────────────────────────────────────────────────

const SECTION_HEADERS = new Set([
  'PROFILE', 'PROFIL', 'SUMMARY', 'RÉSUMÉ',
  'TECHNICAL SKILLS', 'COMPÉTENCES TECHNIQUES', 'SKILLS', 'COMPÉTENCES',
  'PROFESSIONAL EXPERIENCE', 'EXPÉRIENCE PROFESSIONNELLE', 'EXPERIENCE',
  'EXPÉRIENCE', 'FULL-STACK PROJECTS', 'PROJECTS', 'PROJETS',
  'EDUCATION', 'FORMATION',
  'CERTIFICATIONS & LANGUAGES', 'CERTIFICATIONS & LANGUES',
  'CERTIFICATIONS', 'LANGUES', 'LANGUAGES',
])

function isSectionHeader(line: string): boolean {
  const t = line.trim().toUpperCase().replace(/[:']/g, '')
  if (SECTION_HEADERS.has(t)) return true
  // Markdown ### heading
  if (/^#{1,3}\s+/.test(line.trim())) return true
  // All-caps line ≤ 50 chars
  return /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ\s&\-/]+$/.test(t) &&
    t.length >= 3 && t.length <= 55
}

function cleanSectionTitle(line: string): string {
  return line.trim()
    .replace(/^#+\s*/, '')        // strip markdown #
    .replace(/[*_`]/g, '')        // strip markdown inline
    .replace(/\*\*/g, '')
    .trim()
    .toUpperCase()
}

function isEntryField(line: string): boolean {
  return /^>(TITLE|COMPANY|DATE|TECH|LINK|SCHOOL|DEGREE):/.test(line.trim())
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/`(.+?)`/g, '$1')          // `code` → code
    .replace(/^#{1,4}\s*/gm, '')        // ### Heading
    .replace(/^\s*---+\s*$/gm, '')      // --- divider
    .replace(/^\s*[|]\s*/gm, '')        // markdown table pipes
    .replace(/\s*[|]\s*$/gm, '')
    .trim()
}

function SkillLine({ line }: { line: string }) {
  const sanitized = line.replace(/\$\|\$/g, ' · ').replace(/^[•\-]\s*/, '').trim()

  // Handle multi-item lines separated by " · " (e.g. "Français: Langue maternelle · Anglais: Courant")
  if (sanitized.includes(' · ') && sanitized.includes(':')) {
    const parts = sanitized.split(/\s*·\s*/).filter(Boolean)
    return (
      <View style={S.skillRow}>
        {parts.map((part, idx) => {
          const colonIdx = part.indexOf(':')
          if (colonIdx > 0 && colonIdx < 30) {
            const label = part.slice(0, colonIdx).trim()
            const value = part.slice(colonIdx + 1).trim()
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {idx > 0 && <Text style={{ fontSize: 8.5, color: C.muted, paddingHorizontal: 5 }}> · </Text>}
                <Text style={S.skillLabel}>{label}: </Text>
                <Text style={S.skillValue}>{value}</Text>
              </View>
            )
          }
          return (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {idx > 0 && <Text style={{ fontSize: 8.5, color: C.muted, paddingHorizontal: 5 }}> · </Text>}
              <Text style={S.skillValue}>{part}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  // Try to parse "Label: value" lines
  const colonIdx = sanitized.indexOf(':')
  if (colonIdx > 0 && colonIdx < 30) {
    const label = sanitized.slice(0, colonIdx).trim()
    const value = sanitized.slice(colonIdx + 1).trim()
    return (
      <View style={S.skillRow}>
        <Text style={S.skillLabel}>{label}: </Text>
        <Text style={S.skillValue}>{value}</Text>
      </View>
    )
  }
  return <Text style={S.bodyText}>{sanitized}</Text>
}

export function parseCvStructured(raw: string): ParsedCv {
  const lines = raw.split('\n').map(l => l.trimEnd())

  // Find name (first non-empty line)
  let i = 0
  while (i < lines.length && !lines[i]!.trim()) i++
  const nameLine = (lines[i] ?? '').trim()
  const name = stripMarkdown(nameLine).replace(/^#+\s*/, '').trim()
  i++

  // Subtitle (2nd non-empty, non-section line)
  let subtitle = ''
  while (i < lines.length && !lines[i]!.trim()) i++
  const subtitleLine = (lines[i] ?? '').trim()
  if (subtitleLine && !isSectionHeader(subtitleLine) && subtitleLine.length < 120) {
    subtitle = stripMarkdown(subtitleLine)
    i++
  }

  // Contact line (3rd non-empty, has $|$ or @ or + digit)
  let contactParts: string[] = []
  while (i < lines.length && !lines[i]!.trim()) i++
  const contactLine = (lines[i] ?? '').trim()
  if (contactLine && !isSectionHeader(contactLine)) {
    // Split by $|$ (our custom sep) or  ·  or  |
    const rawParts = contactLine
      .split(/\$\|\$|\s*[|]\s*|\s{3,}|\s*·\s*/)
      .map(p => stripMarkdown(p).trim())
      .filter(Boolean)

    // Filter out placeholders that are just labels without URL (e.g. standalone "LinkedIn", "GitHub", "Portfolio")
    contactParts = rawParts.filter(p => {
      const lower = p.toLowerCase()
      if (lower === 'linkedin' || lower === 'github' || lower === 'portfolio' || lower === 'gitlab' || lower === 'website') {
        return false
      }
      return true
    })
    i++
  }

  // Parse sections
  const sections: CvSection[] = []
  let currentSection: CvSection | null = null
  let currentEntry: CvEntry | null = null

  const flushEntry = () => {
    if (currentEntry && currentSection) {
      currentSection.entries.push(currentEntry)
      currentEntry = null
    }
  }
  const flushSection = () => {
    flushEntry()
    if (currentSection) {
      sections.push(currentSection)
      currentSection = null
    }
  }

  for (; i < lines.length; i++) {
    const raw_line = lines[i] ?? ''
    const trimmed = raw_line.trim()

    if (!trimmed || trimmed === '---' || trimmed === '***') {
      // blank / divider
      if (currentEntry && currentEntry.title) {
        // entry separator — flush entry
        flushEntry()
      }
      continue
    }

    if (isSectionHeader(trimmed)) {
      flushSection()
      currentSection = {
        heading: cleanSectionTitle(trimmed),
        paragraphs: [],
        entries: [],
      }
      continue
    }

    if (!currentSection) continue

    // Entry field lines: >TITLE: ...
    if (isEntryField(trimmed)) {
      const match = trimmed.match(/^>(TITLE|COMPANY|DATE|TECH|LINK|SCHOOL|DEGREE):\s*(.*)/)
      if (match) {
        const field = match[1]!
        const value = stripMarkdown(match[2]!)
        if (field === 'TITLE') {
          flushEntry()
          currentEntry = { title: value, bullets: [] }
        } else if (field === 'SCHOOL') {
          // Education: school acts as the company row
          if (!currentEntry) currentEntry = { title: '', bullets: [] }
          currentEntry.company = value
        } else if (field === 'DEGREE') {
          // Education: degree is the title row
          if (!currentEntry) currentEntry = { title: '', bullets: [] }
          currentEntry.title = value
        } else if (currentEntry) {
          if (field === 'COMPANY') currentEntry.company = value
          else if (field === 'DATE') currentEntry.date = value
          else if (field === 'TECH') currentEntry.tech = value
          else if (field === 'LINK') currentEntry.link = value
        }
      }
      continue
    }

    // Bullet line
    if (/^[-•*·▸►>]\s+/.test(trimmed)) {
      const bulletText = stripMarkdown(trimmed.replace(/^[-•*·▸►>]\s+/, ''))
      if (currentEntry) {
        currentEntry.bullets.push(bulletText)
      } else {
        // Bullet without entry (e.g. skills section)
        currentSection.paragraphs.push('• ' + bulletText)
      }
      continue
    }

    // Plain paragraph / skill line
    const clean = stripMarkdown(trimmed)
    if (clean) {
      if (currentEntry) {
        // Might be a continuation bullet
        currentEntry.bullets.push(clean)
      } else {
        currentSection.paragraphs.push(clean)
      }
    }
  }

  flushSection()

  return { name, subtitle, contactParts, sections }
}

// ── React-PDF components ──────────────────────────────────────────────────────

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>•</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  )
}

function EntryBlock({ entry }: { entry: CvEntry }) {
  return (
    <View style={S.entryBlock} wrap={false}>
      <View style={S.entryRow}>
        <Text style={S.entryTitle}>{entry.title}</Text>
        {entry.date && <Text style={S.entryDate}>{entry.date}</Text>}
      </View>
      {(entry.company || entry.tech || entry.link) && (
        <View style={S.entrySubRow}>
          {entry.company && <Text style={S.entryCompany}>{entry.company}</Text>}
          {entry.tech && <Text style={S.entryTech}>{entry.tech}</Text>}
          {entry.link ? (
            <Link src={entry.link} style={S.entryLink}>GitHub ↗</Link>
          ) : null}
        </View>
      )}
      {entry.bullets.length > 0 && (
        <View style={S.bulletList}>
          {entry.bullets.map((b, bi) => (
            <BulletPoint key={bi} text={b} />
          ))}
        </View>
      )}
    </View>
  )
}



function SectionBlock({ section }: { section: CvSection }) {
  const isSkills = section.heading.includes('SKILL') || section.heading.includes('COMPÉTENCE')
  const isCerts = section.heading.includes('CERTIF') || section.heading.includes('LANGUAGE') || section.heading.includes('LANGUE')
  return (
    <View style={S.section} wrap={section.entries.length === 0}>
      <Text style={S.sectionTitle}>{section.heading}</Text>

      {section.paragraphs.map((p, pi) => {
        // Strip leading bullet marker for cert/language paragraphs
        const clean = isCerts ? p.replace(/^[•\-]\s*/, '') : p
        return (isSkills || isCerts) ? (
          <SkillLine key={pi} line={clean} />
        ) : (
          <Text key={pi} style={S.bodyText}>{p}</Text>
        )
      })}

      {section.entries.map((e, ei) => (
        <EntryBlock key={ei} entry={e} />
      ))}
    </View>
  )
}

function ContactRow({ parts }: { parts: string[] }) {
  return (
    <View style={S.contactLine}>
      {parts.map((part, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
          {idx > 0 && <Text style={S.contactSep}> · </Text>}
          <Text style={S.contactPart}>{part}</Text>
        </View>
      ))}
    </View>
  )
}

function CvDocument({ name, subtitle, contactParts, sections }: ParsedCv) {
  return (
    <Document
      title={name ? `${name} — Adapted CV` : 'Adapted CV'}
      author="JobPilot"
      creator="JobPilot"
    >
      <Page size="LETTER" style={S.page}>
        {/* ── Header ── */}
        <View style={S.headerBlock}>
          {name && <Text style={S.name}>{name}</Text>}
          {subtitle && <Text style={S.subtitle}>{subtitle}</Text>}
          {contactParts.length > 0 && <ContactRow parts={contactParts} />}
        </View>

        {/* ── Sections ── */}
        {sections.map((sec, si) => (
          <SectionBlock key={si} section={sec} />
        ))}
      </Page>
    </Document>
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateCvPdf(adaptedCvText: string): Promise<Buffer> {
  const parsed = parseCvStructured(adaptedCvText)
  return renderToBuffer(
    <CvDocument
      name={parsed.name}
      subtitle={parsed.subtitle}
      contactParts={parsed.contactParts}
      sections={parsed.sections}
    />
  )
}
