import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

Font.registerHyphenationCallback(w => [w])

function stripNonPrintable(s: string): string {
  return s.replace(/[^\x20-\x7EÀ-ɏ]/g, '')
}

function extractCandidateHeader(cvText: string): { name: string; contact: string } {
  const lines = cvText.split('\n').map(l => l.trim()).filter(Boolean)
  const name = stripNonPrintable(lines[0] ?? '')
  const contact = stripNonPrintable(lines[1] ?? '')
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
    marginBottom: 2,
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
    marginBottom: 18,
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
  const paragraphs = body
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
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
  const { name, contact } = extractCandidateHeader(cvText)
  return renderToBuffer(
    <CoverLetterDoc
      candidateName={name}
      candidateContact={contact}
      role={role}
      company={company}
      body={coverLetter}
    />
  )
}
