import { GROQ_MODEL } from '@/lib/groq'
import { completeChat } from './call'
import { PROMPT_LIMITS, UNTRUSTED_DATA_RULE, inlineField, wrapUntrusted } from './untrusted'

export interface InterviewQuestion {
  id: string
  type: 'technical' | 'behavioral'
  question: string
  hint: string
}

const SYSTEM_FR = `Tu es un expert RH et interviewer technique.

Tu reçois le CV du candidat dans <cv>, l'offre d'emploi dans <job_offer>, le nom de l'entreprise dans <company> et l'intitulé du poste dans <role>.

Génère exactement 10 questions d'entretien en JSON pour ce poste dans cette entreprise.
Réponds UNIQUEMENT avec un tableau JSON valide.
5 questions techniques basées sur les compétences demandées.
5 questions comportementales (méthode STAR).

[
  {
    "id": "1",
    "type": "technical",
    "question": "...",
    "hint": "Conseil pour répondre: ..."
  }
]

${UNTRUSTED_DATA_RULE}`

const SYSTEM_EN = `You are an expert HR interviewer and technical screener.

You receive the candidate's CV in <cv>, the job offer in <job_offer>, the company name in <company> and the job title in <role>.

Generate exactly 10 interview questions as JSON for this role at this company.
Respond ONLY with a valid JSON array.
5 technical questions based on required skills.
5 behavioral questions (STAR method).

[
  {
    "id": "1",
    "type": "technical",
    "question": "...",
    "hint": "How to answer: ..."
  }
]

${UNTRUSTED_DATA_RULE}`

export async function generateInterviewQuestions(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
): Promise<InterviewQuestion[]> {
  const user = [
    wrapUntrusted('company', inlineField(company, PROMPT_LIMITS.company), PROMPT_LIMITS.company),
    wrapUntrusted('role', inlineField(role, PROMPT_LIMITS.role), PROMPT_LIMITS.role),
    wrapUntrusted('cv', cvText, PROMPT_LIMITS.cv),
    wrapUntrusted('job_offer', offerText, PROMPT_LIMITS.offer),
  ].join('\n\n')

  const response = await completeChat('interview-questions', {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: language === 'FR' ? SYSTEM_FR : SYSTEM_EN },
      { role: 'user', content: user },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  })

  try {
    const content = response.choices[0]?.message?.content ?? '[]'
    const clean = content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as InterviewQuestion[]
  } catch {
    return []
  }
}
