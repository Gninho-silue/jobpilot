import { groq, GROQ_MODEL } from '@/lib/groq'

// ─────────────────────────────────────────────────────────────────────────────
// Structured plain-text format the AI must follow.
// The PDF renderer parses this schema; do NOT use markdown.
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_SPEC = `
OUTPUT FORMAT — follow EXACTLY, no markdown whatsoever:

LINE 1:  Full Name
LINE 2:  Job Title / Specialization  (e.g. "Full-Stack Engineer | Java · Spring Boot · React · DevOps")
LINE 3:  Contact line — each item separated by  $|$  (e.g. "+212 776 323 683 $|$ email@example.com $|$ Casablanca, Maroc")

Then sections using these exact headers (ALL CAPS, no punctuation):
  PROFILE
  TECHNICAL SKILLS
  PROFESSIONAL EXPERIENCE
  PROJECTS
  EDUCATION
  CERTIFICATIONS & LANGUAGES

Inside PROFESSIONAL EXPERIENCE, each entry:
  >TITLE: Job Title (e.g. "Développeur Full-Stack – PFE" or "Développeur Full-Stack – PFA")
  >COMPANY: Company Name (e.g. "TechPal Services")
  >DATE: Date Range (e.g. "Mars – Juillet 2026")
  Then bullet points starting with a dash "- "

Inside PROJECTS, each entry:
  >TITLE: Project Name
  >TECH: Technologies used (e.g. "Python · FastAPI · LangGraph · React · Docker")
  >DATE: Year (e.g. "2026")
  >LINK: URL (optional, e.g. "https://github.com/user/project")
  Then bullet points starting with a dash "- "

Inside EDUCATION, each entry:
  >SCHOOL: School Name (e.g. "ENSA Al Hoceima")
  >DEGREE: Degree and field (e.g. "Diplôme d'Ingénieur en Génie Informatique")
  >DATE: Year range (e.g. "2023 – 2026")

Inside TECHNICAL SKILLS, list skills by categories with colon, separated by middle dots ( · ):
  Category: Skill 1 · Skill 2 · Skill 3

Inside CERTIFICATIONS & LANGUAGES:
  List certifications line by line
  List languages with colon separated by middle dots: Français: Langue maternelle · Anglais: Courant

Rules:
- NO asterisks (**bold**), NO #, NO backticks, NO markdown
- NO escaped slashes: write "100%" (NEVER "100/%"), "30%" (NEVER "30/%"), "5 secondes" (NEVER "5/secondes"), "Next.js 14" (NEVER "Next.js/14"), "Tailwind CSS" (NEVER "Tailwind/CSS")
- Bullet points start with "- "
- Separate entries with a blank line
`

function getAdaptResumePrompt(
  cvText: string,
  offerText: string,
  language: 'FR' | 'EN'
): string {
  const langInstruction = language === 'FR'
    ? 'Write the ENTIRE adapted CV in French.'
    : 'Write the ENTIRE adapted CV in English.'

  return `You are an expert recruiter and CV writer.
${langInstruction}

${FORMAT_SPEC}

CANDIDATE CV:
${cvText}

JOB OFFER:
${offerText}

CRITICAL ANTI-HALLUCINATION & TRUTHFULNESS RULES (MANDATORY):
1. ZERO-HALLUCINATION on past experiences:
   - NEVER alter or invent the technologies used in past professional experiences.
   - If an internship/job was done with Odoo, Python, SCSS, or Flutter, you MUST keep those exact technologies. NEVER rewrite past jobs to claim they used React, Node.js, Express, or MongoDB if it was not in the original CV.
   - PFE / PFA are internship types (Projet de Fin d'Études / Projet de Fin d'Année), NOT company names. Keep the true company name (e.g. "TechPal Services") separate from the date.
2. HOW TO MATCH THE OFFER HONESTLY:
   - Reorder the TECHNICAL SKILLS section to put skills matching the offer first.
   - Highlight and prioritize matching personal / open-source projects from the candidate's actual projects list.
   - Rephrase bullet points to emphasize transferable software engineering strengths (architecture, APIs, CI/CD, testing, problem solving, performance optimization) without fabricating fake tools.
3. NO ESCAPED CHARACTERS / NO SLASHES:
   - Never write slashes before percentages or punctuation (write 100%, 30%, 60%, 8 mois, not 100/%, 30/%, 60/%, 8/mois).
4. Follow the OUTPUT FORMAT strictly — no markdown asterisks, no hash signs.
5. Respond ONLY with the adapted CV text.`
}

export async function adaptResume(
  cvText: string,
  offerText: string,
  language: 'FR' | 'EN'
): Promise<string> {
  const prompt = getAdaptResumePrompt(cvText, offerText, language)

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
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
  const prompt = getAdaptResumePrompt(cvText, offerText, language)

  return groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.2,
    stream: true,
  })
}
