import { groq, GROQ_MODEL } from '@/lib/groq'
import { PROMPT_LIMITS, UNTRUSTED_DATA_RULE, inlineField, wrapUntrusted } from './untrusted'
import { finishedByLength, generationOptions, type GeneratedText } from './generation'

const SYSTEM_FR = `Tu es un expert en recrutement et rédaction de lettres de motivation.

Tu reçois le profil du candidat (extrait de son CV) dans <cv>, l'offre d'emploi dans <job_offer>, le nom de l'entreprise dans <company> et l'intitulé du poste dans <role>.

Rédige une lettre de motivation professionnelle et personnalisée en français pour ce poste dans cette entreprise.

Règles de rédaction et d'authenticité (TRÈS STRICTES) :
- Longueur: 3 paragraphes, maximum 280 mots
- Paragraphe 1: intérêt pour le poste et l'entreprise, fondé uniquement sur ce que dit l'offre
- Paragraphe 2: 2-3 réalisations CONCRÈTES et VRAIES issues du CV qui correspondent aux besoins de l'offre
- Paragraphe 3: conclusion avec appel à l'action pour un entretien

Règles ANTI-HALLUCINATION & VÉRACITÉ (OBLIGATOIRES) :
- Chaque fait sur le candidat vient du CV. Chaque réalisation est attribuée à l'expérience ou au projet où le CV la place, avec cette entreprise et ces dates : ne fusionne jamais deux expériences (par exemple un stage et un emploi de fin d'études) en une seule.
- N'attribue jamais à une expérience une technologie ou un outil que le CV ne cite pas pour cette expérience. Pour illustrer une compétence demandée, cite le projet ou l'expérience du CV où elle a réellement été utilisée.
- Aucune affirmation sur le candidat absente du CV : pas de « je suis depuis longtemps votre entreprise », pas de motivation, de lecture ou d'événement passé inventés.
- Ne change aucun nombre, aucune date, aucun nom d'entreprise. Le type de stage ou de contrat n'est pas un nom d'entreprise.
- Un projet personnel, de démonstration ou en mode test n'est jamais présenté comme un système en production.
- Format propre sans markdown : AUCUN astérisque (**gras** ou *italique*), écris du texte brut fluide.
- Caractères simples : trait d'union ASCII (-), espaces normales, nombres, pourcentages et versions écrits comme dans le CV (ex. 30 %, Next.js 14, Tailwind CSS).
- Commencer directement par le texte de la lettre, sans "Objet:" ni en-tête.

Réponds uniquement avec le texte de la lettre, sans commentaire.

${UNTRUSTED_DATA_RULE}`

const SYSTEM_EN = `You are an expert recruiter and cover letter writer.

You receive the candidate's profile (extracted from their CV) in <cv>, the job offer in <job_offer>, the company name in <company> and the job title in <role>.

Write a professional, highly tailored cover letter in English for this role at this company.

Writing & Structure Rules:
- Length: 3 paragraphs, maximum 280 words
- Paragraph 1: interest in the role and the company, based only on what the job offer says
- Paragraph 2: 2-3 CONCRETE, TRUTHFUL achievements from the CV matching the role
- Paragraph 3: closing with a call to action for an interview

ANTI-HALLUCINATION & TRUTHFULNESS RULES (MANDATORY):
- Every fact about the candidate comes from the CV. Each achievement is attributed to the experience or project the CV lists it under, with that company and those dates: never merge two experiences (e.g. an internship and a later job) into one.
- Never attribute to an experience a technology or tool the CV does not list for it. To show a skill the offer asks for, cite the project or experience of the CV where it was actually used.
- No claim about the candidate that is not in the CV: no "I have closely followed your company", no invented motivation, reading or past event.
- Do not change any number, date or company name. An internship or contract type is not a company name.
- A personal, demo or test-mode project is never presented as a production system.
- Output pure clean plain text with NO markdown asterisks (**bold**), NO backticks. Use plain characters: the ASCII hyphen (-), regular spaces, and numbers, percentages and versions written as in the CV (e.g. 30%, Next.js 14, Tailwind CSS).
- Start directly with the letter body, no "Subject:" line or header.

Respond ONLY with the cover letter text, no explanations.

${UNTRUSTED_DATA_RULE}`

export interface CoverLetterOptions {
  /** Corrections from the fact-checker, for the single regeneration (lib/fact-check). */
  corrections?: string[]
  /** Multiplies the token budget (retry after a truncated answer). */
  budgetFactor?: number
}

const CORRECTIONS_RULE = {
  FR: "CORRECTIONS : une version précédente de cette lettre contenait des affirmations que le CV ne soutient pas. Le bloc <corrections> les liste (écrit par notre vérificateur) : applique chaque correction dans la nouvelle version, sans rien ajouter à la place que le CV ne soutienne pas.",
  EN: 'CORRECTIONS: a previous version of this letter contained claims the CV does not support. The <corrections> block lists them (written by our fact-checker): apply every correction in the new version, and add nothing in their place that the CV does not support.',
}

function getCoverLetterMessages(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN',
  { corrections = [] }: CoverLetterOptions = {}
) {
  const user = [
    wrapUntrusted('company', inlineField(company, PROMPT_LIMITS.company), PROMPT_LIMITS.company),
    wrapUntrusted('role', inlineField(role, PROMPT_LIMITS.role), PROMPT_LIMITS.role),
    wrapUntrusted('cv', cvText, PROMPT_LIMITS.cv),
    wrapUntrusted('job_offer', offerText, PROMPT_LIMITS.offer),
    ...(corrections.length ? [wrapUntrusted('corrections', corrections.map(c => `- ${c}`).join('\n'), PROMPT_LIMITS.cv)] : []),
  ].join('\n\n')

  const system = language === 'FR' ? SYSTEM_FR : SYSTEM_EN
  return [
    { role: 'system' as const, content: corrections.length ? `${system}\n\n${CORRECTIONS_RULE[language]}` : system },
    { role: 'user' as const, content: user },
  ]
}

export async function generateCoverLetter(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN',
  options: CoverLetterOptions = {}
): Promise<GeneratedText> {
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: getCoverLetterMessages(cvText, offerText, company, role, language, options),
    ...generationOptions(GROQ_MODEL, cvText, 'letter', options.budgetFactor),
    temperature: 0.2,
  })

  return { text: response.choices[0]?.message?.content ?? '', truncated: finishedByLength(response) }
}

export async function streamCoverLetter(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
) {
  return groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: getCoverLetterMessages(cvText, offerText, company, role, language),
    ...generationOptions(GROQ_MODEL, cvText, 'letter'),
    temperature: 0.2,
    stream: true,
  })
}
