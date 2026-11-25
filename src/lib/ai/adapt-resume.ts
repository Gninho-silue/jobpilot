import { groq, GROQ_MODEL } from '@/lib/groq'
import { PROMPT_LIMITS, UNTRUSTED_DATA_RULE, wrapUntrusted } from './untrusted'

// ─────────────────────────────────────────────────────────────────────────────
// Structured plain-text format the AI must follow.
// The PDF renderer parses this schema; do NOT use markdown.
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_SPEC = `
OUTPUT FORMAT — follow EXACTLY, no markdown whatsoever:

LINE 1:  Full Name
LINE 2:  The candidate's job title EXACTLY as written in the CV, optionally followed by " | " and key skills from the CV (e.g. "Backend Engineer | Java · Spring Boot · PostgreSQL")
LINE 3:  Contact line — each item separated by  $|$  (e.g. "+33 6 00 00 00 00 $|$ email@example.com $|$ https://www.linkedin.com/in/name $|$ Paris, France")
         Profile links: use the full URLs listed on the CV's "Links:" line (LinkedIn, GitHub, portfolio), never a bare label such as "LinkedIn" or "GitHub".

Then sections using these exact headers (ALL CAPS, no punctuation):
  PROFILE
  TECHNICAL SKILLS
  PROFESSIONAL EXPERIENCE
  PROJECTS
  EDUCATION
  CERTIFICATIONS & LANGUAGES

Inside PROFESSIONAL EXPERIENCE, each entry:
  >TITLE: Job title as written in the CV (e.g. "Backend Developer – Internship")
  >COMPANY: Company name as written in the CV (e.g. "Acme Corp")
  >DATE: Date range as written in the CV (e.g. "March – July 2024")
  Then bullet points starting with a dash "- "

Inside PROJECTS, each entry:
  >TITLE: Project Name
  >TECH: Technologies used (e.g. "Python · FastAPI · LangGraph · React · Docker")
  >DATE: Year (e.g. "2026")
  >LINK: full URL of this project taken from the CV (optional, e.g. "https://github.com/user/project"); omit the line if the CV has no URL for it, never a bare label
  Then bullet points starting with a dash "- "

Inside EDUCATION, each entry:
  >SCHOOL: School name as written in the CV (e.g. "University of Example")
  >DEGREE: Degree and field as written in the CV (e.g. "MSc in Computer Science")
  >DATE: Year range (e.g. "2020 – 2022")

Inside TECHNICAL SKILLS, list skills by categories with colon, separated by middle dots ( · ):
  Category: Skill 1 · Skill 2 · Skill 3

Inside CERTIFICATIONS & LANGUAGES:
  List certifications line by line, worded and capitalised exactly as in the CV
  List languages with colon separated by middle dots: English: Native · Spanish: Fluent

Rules:
- NO asterisks (**bold**), NO #, NO backticks, NO markdown
- Use plain characters: the ASCII hyphen (-), regular spaces, and numbers, percentages and versions written as in the CV (e.g. 30%, Next.js 14, Tailwind CSS)
- Bullet points start with "- "
- Separate entries with a blank line
`

export interface AdaptResumeOptions {
  /** Corrections from the fact-checker, for the single regeneration (lib/fact-check). */
  corrections?: string[]
}

function getAdaptResumeMessages(
  cvText: string,
  offerText: string,
  language: 'FR' | 'EN',
  { corrections = [] }: AdaptResumeOptions = {}
) {
  const langInstruction = language === 'FR'
    ? 'Write the ENTIRE adapted CV in French.'
    : 'Write the ENTIRE adapted CV in English.'

  const system = `You are an expert recruiter and CV writer.
You receive the candidate's CV in <cv> and the job offer in <job_offer>, and you adapt the CV to the offer.
${langInstruction}

${FORMAT_SPEC}

CRITICAL ANTI-HALLUCINATION & TRUTHFULNESS RULES (MANDATORY):
1. ZERO-HALLUCINATION. Everything you write must come from the CV:
   - Each experience and project keeps ONLY the tools, technologies and achievements the CV lists FOR THAT experience or project. Never move a skill from the skills list, another job or a project into an experience, even if the offer asks for it.
   - Never add a company, school, job title, date, degree, certification or number (count, percentage, duration) that is not in the CV. Never change one (e.g. "9" stays "9", "60%" stays "60%").
   - Keep the candidate's own job title (line 2), even if the offer is for a different role.
   - Keep the status of what the candidate built: a personal, demo or test-mode project (e.g. a payment integration in test mode) is never presented as a production system with real users or real payments.
   - Keep company names exactly as in the CV, separate from the internship or contract type and from the dates.
2. HOW TO MATCH THE OFFER HONESTLY:
   - Reorder the TECHNICAL SKILLS section to put skills matching the offer first.
   - Highlight and prioritize matching personal / open-source projects from the candidate's actual projects list.
   - Rephrase bullet points to emphasize the transferable strengths each bullet already describes (e.g. architecture, performance, automation), without adding a practice, tool or result it does not mention.
3. PLAIN CHARACTERS:
   - Use plain characters: the ASCII hyphen (-), regular spaces, and numbers, percentages and versions written as in the CV (e.g. 30%, Next.js 14, Tailwind CSS).
4. Follow the OUTPUT FORMAT strictly — no markdown asterisks, no hash signs.
5. Respond ONLY with the adapted CV text.
${
  corrections.length
    ? `
6. CORRECTIONS: a previous version of this adapted CV contained claims the CV does not support. The <corrections> block lists them (written by our fact-checker): apply every correction in the new version, and add nothing in their place that the CV does not support.
`
    : ''
}
${UNTRUSTED_DATA_RULE}`

  const user = [
    wrapUntrusted('cv', cvText, PROMPT_LIMITS.cv),
    wrapUntrusted('job_offer', offerText, PROMPT_LIMITS.offer),
    ...(corrections.length ? [wrapUntrusted('corrections', corrections.map(c => `- ${c}`).join('\n'), PROMPT_LIMITS.cv)] : []),
  ].join('\n\n')

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

export async function adaptResume(
  cvText: string,
  offerText: string,
  language: 'FR' | 'EN',
  options: AdaptResumeOptions = {}
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: getAdaptResumeMessages(cvText, offerText, language, options),
    max_tokens: 3000,
    temperature: 0.2,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function streamAdaptResume(
  cvText: string,
  offerText: string,
  language: 'FR' | 'EN'
) {
  return groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: getAdaptResumeMessages(cvText, offerText, language),
    max_tokens: 3000,
    temperature: 0.2,
    stream: true,
  })
}
