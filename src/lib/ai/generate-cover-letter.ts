import { groq, GROQ_MODEL } from '@/lib/groq'

function getCoverLetterPrompt(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
): string {
  return language === 'FR'
    ? `Tu es un expert en recrutement et rédaction de lettres de motivation.

Voici le profil du candidat (extrait de son CV):
${cvText}

Voici l'offre d'emploi pour le poste de ${role} chez ${company}:
${offerText}

Rédige une lettre de motivation professionnelle et personnalisée en français.

Règles de rédaction et d'authenticité (TRÈS STRICTES) :
- Longueur: 3 paragraphes, maximum 280 mots
- Paragraphe 1: accroche forte montrant la connaissance et l'intérêt pour ${company} et ses missions
- Paragraphe 2: 2-3 réalisations CONCRÈTES et VRAIES issues du CV qui correspondent aux besoins de l'offre
- Paragraphe 3: conclusion dynamique avec appel à l'action pour un entretien

Règles ANTI-HALLUCINATION & VÉRACITÉ (OBLIGATOIRES) :
- INTERDICTION FORMELLE d'inventer des technologies pour une expérience professionnelle passée :
  * Si un stage chez TechPal Services a été fait en Odoo/Python/Flutter, NE DIS PAS qu'il a été fait en React/Node.js/Express/MongoDB. Reste 100% fidèle aux outils réels de chaque expérience.
  * Pour illustrer les compétences demandées dans l'offre (ex: React, Node.js, Next.js, API REST, Docker), cite les VRAIS projets personnels ou les compétences transversales où le candidat les a réellement utilisées (ex: DevScope, JobPilot, AgentFlow, etc.).
- Attention aux noms d'entreprises : "PFE" ou "PFA" désigne le type de stage (Projet de Fin d'Études / d'Année), le nom de l'entreprise est la vraie société (ex: "TechPal Services"), ne dis JAMAIS "chez PFEMars".
- Format propre sans markdown : AUCUN astérisque (**gras** ou *italique*), écris du texte brut fluide.
- Français naturel sans slashes d'échappement : écris "100%", "Next.js 14", "Tailwind CSS", "Synertic :", et non "100/%", "Next.js/14", "Synertic/:".
- Commencer directement par le texte de la lettre, sans "Objet:" ni en-tête.

Réponds uniquement avec le texte de la lettre, sans commentaire.`
    : `You are an expert recruiter and cover letter writer.

Here is the candidate's profile (extracted from their CV):
${cvText}

Here is the job offer for ${role} at ${company}:
${offerText}

Write a professional, highly tailored cover letter in English.

Writing & Structure Rules:
- Length: 3 paragraphs, maximum 280 words
- Paragraph 1: strong opening showing genuine knowledge and enthusiasm for ${company}
- Paragraph 2: 2-3 CONCRETE, TRUTHFUL achievements from the CV matching the role
- Paragraph 3: enthusiastic closing with call to action for an interview

ANTI-HALLUCINATION & TRUTHFULNESS RULES (MANDATORY):
- NEVER alter or fabricate technologies for past work experiences. Keep the exact true tools for each past job.
- To demonstrate skills matching the offer, reference the candidate's actual projects (e.g. personal projects, open source) or real skills where they were actually used.
- Be precise with company names (e.g. "TechPal Services", not internship acronyms like "PFEMars").
- Output pure clean plain text with NO markdown asterisks (**bold**), NO backticks, and NO escaped slashes (e.g. write "100%", not "100/%").
- Start directly with the letter body, no "Subject:" line or header.

Respond ONLY with the cover letter text, no explanations.`
}

export async function generateCoverLetter(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
): Promise<string> {
  const prompt = getCoverLetterPrompt(cvText, offerText, company, role, language)

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.2,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function streamCoverLetter(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
) {
  const prompt = getCoverLetterPrompt(cvText, offerText, company, role, language)

  return groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.2,
    stream: true,
  })
}
