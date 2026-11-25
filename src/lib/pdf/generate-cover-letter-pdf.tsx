import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { toPdfSafe } from '@/lib/text/typography'

Font.registerHyphenationCallback(w => [w])

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** -> bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* -> italic
    .replace(/(^|\s)__(\S.*?\S)__(?=\s|[.,;:!?)]|$)/g, '$1$2')  // __bold__ (not data__x)
    .replace(/(^|\s)_(\S.*?\S)_(?=\s|[.,;:!?)]|$)/g, '$1$2')    // _italic_ (not data_eng)
    .replace(/`(.+?)`/g, '$1')          // `code` -> code
    .replace(/^#{1,4}\s*/gm, '')        // ### Heading -> Heading
    .replace(/^\s*---+\s*$/gm, '')      // --- divider -> removed
    .replace(/^\s*[*•-]\s+/gm, '')      // Bullet markers -> removed
    .trim()
}

// The contact line holds an email address or a phone number. In the CV it comes
// after the name and the job title, so it is not simply the second line.
const CONTACT_LINE = /@|\+?\d[\d\s().-]{6,}\d/

function extractCandidateHeader(cvText: string): { name: string; contact: string } {
  const lines = cvText.split('\n').map(l => l.trim()).filter(Boolean)
  const name = stripMarkdown(lines[0] ?? '')
  const rawContact = stripMarkdown(lines.slice(1, 5).find(line => CONTACT_LINE.test(line)) ?? '')

  const contactParts = rawContact
    .split(/\$\|\$|\s*[|]\s*|\s{3,}|\s*·\s*/)
    .map(p => p.trim())
    .filter(p => {
      const lower = p.toLowerCase()
      return Boolean(p) && !['linkedin', 'github', 'portfolio', 'gitlab', 'website'].includes(lower)
    })
  
  const contact = contactParts.join('  ·  ')
  return { name, contact }
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const C = {
  black:  '#0F172A',
  body:   '#1E293B',
  muted:  '#64748B',
  accent: '#92400E',
  border: '#CBD5E1',
  white:  '#FFFFFF',
}

const S = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    paddingHorizontal: 56,
    paddingTop: 52,
    paddingBottom: 52,
    fontSize: 10,
    color: C.body,
    lineHeight: 1.6,
    fontFamily: 'Helvetica',
  },
  name: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: C.black,
    marginBottom: 4,
  },
  contact: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.muted,
    marginBottom: 10,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
    marginBottom: 20,
  },
  date: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: C.muted,
    marginBottom: 14,
  },
  recipientLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.black,
    marginBottom: 2,
  },
  recipientCompany: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.muted,
    marginBottom: 20,
  },
  paragraph: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.body,
    lineHeight: 1.7,
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.muted,
    textAlign: 'center',
  },
})

interface CoverLetterDocProps {
  candidateName: string
  candidateContact: string
  role: string
  company: string
  body: string
}

function CoverLetterDoc({ candidateName, candidateContact, role, company, body }: CoverLetterDocProps) {
  const cleanBody = stripMarkdown(body)
  const paragraphs = cleanBody
    .split(/\n{2,}/)
    .map(p => stripMarkdown(p.replace(/\n/g, ' ').trim()))
    .filter(Boolean)

  return (
    <Document
      title={`Cover Letter — ${role} at ${company}`}
      author={candidateName || 'JobPilot'}
      creator="JobPilot"
    >
      <Page size="A4" style={S.page}>
        {candidateName ? <Text style={S.name}>{candidateName}</Text> : null}
        {candidateContact ? <Text style={S.contact}>{candidateContact}</Text> : null}
        <View style={S.headerRule} />

        <Text style={S.date}>{formatDate()}</Text>
        <Text style={S.recipientLabel}>Re: Application for {role}</Text>
        <Text style={S.recipientCompany}>{company}</Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={S.paragraph}>{p}</Text>
        ))}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>{candidateName || 'Cover Letter'}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateCoverLetterPdf(
  coverLetter: string,
  cvText: string,
  company: string,
  role: string
): Promise<Buffer> {
  // Only characters the built-in Helvetica can draw (see lib/text/typography.ts).
  const { name, contact } = extractCandidateHeader(toPdfSafe(cvText))
  return renderToBuffer(
    <CoverLetterDoc
      candidateName={name}
      candidateContact={contact}
      role={toPdfSafe(role)}
      company={toPdfSafe(company)}
      body={toPdfSafe(coverLetter)}
    />
  )
}
