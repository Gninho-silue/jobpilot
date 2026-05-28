import { groq, GROQ_MODEL } from '@/lib/groq'

export interface InterviewFeedback {
  score: number
  strengths: string[]
  improvements: string[]
  betterAnswer: string
}

export async function generateInterviewFeedback(
  question: string,
  answer: string,
  type: 'technical' | 'behavioral',
  language: 'FR' | 'EN'
): Promise<InterviewFeedback> {
  const prompt =
    language === 'FR'
      ? `Tu es un interviewer expert. Évalue cette réponse d'entretien.

Question (${type === 'technical' ? 'technique' : 'comportementale'}): ${question}

Réponse du candidat: ${answer}

Réponds UNIQUEMENT avec un JSON valide:
{
  "score": 7,
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["amélioration 1", "amélioration 2"],
  "betterAnswer": "Voici une meilleure réponse..."
}`
      : `You are an expert interviewer. Evaluate this interview answer.

Question (${type}): ${question}

Candidate answer: ${answer}

Respond ONLY with valid JSON:
{
  "score": 7,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "betterAnswer": "Here is a better answer..."
}`

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.3,
  })

  try {
    const content = response.choices[0]?.message?.content ?? '{}'
    const clean = content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as InterviewFeedback
  } catch {
    return { score: 0, strengths: [], improvements: [], betterAnswer: '' }
  }
}
