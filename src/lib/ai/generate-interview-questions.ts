import { groq, GROQ_MODEL } from '@/lib/groq'

export interface InterviewQuestion {
  id: string
  type: 'technical' | 'behavioral'
  question: string
  hint: string
}

export async function generateInterviewQuestions(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
): Promise<InterviewQuestion[]> {
  const prompt =
    language === 'FR'
      ? `Tu es un expert RH et interviewer technique.

CV du candidat:
${cvText}

Offre d'emploi pour ${role} chez ${company}:
${offerText}

Génère exactement 10 questions d'entretien en JSON.
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
]`
      : `You are an expert HR interviewer and technical screener.

Candidate CV:
${cvText}

Job offer for ${role} at ${company}:
${offerText}

Generate exactly 10 interview questions as JSON.
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
]`

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
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
