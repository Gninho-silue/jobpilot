import { GROQ_MODEL } from '@/lib/groq'
import { completeChat } from './call'
import { PROMPT_LIMITS, UNTRUSTED_DATA_RULE, wrapUntrusted } from './untrusted'

export interface InterviewFeedback {
  score: number
  strengths: string[]
  improvements: string[]
  betterAnswer: string
}

function systemPrompt(type: 'technical' | 'behavioral', language: 'FR' | 'EN'): string {
  return language === 'FR'
    ? `Tu es un interviewer expert. Évalue une réponse d'entretien.

Tu reçois la question (${type === 'technical' ? 'technique' : 'comportementale'}) dans <question> et la réponse du candidat dans <answer>.

Réponds UNIQUEMENT avec un JSON valide:
{
  "score": 7,
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["amélioration 1", "amélioration 2"],
  "betterAnswer": "Voici une meilleure réponse..."
}

${UNTRUSTED_DATA_RULE}`
    : `You are an expert interviewer. Evaluate an interview answer.

You receive the question (${type}) in <question> and the candidate's answer in <answer>.

Respond ONLY with valid JSON:
{
  "score": 7,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "betterAnswer": "Here is a better answer..."
}

${UNTRUSTED_DATA_RULE}`
}

export async function generateInterviewFeedback(
  question: string,
  answer: string,
  type: 'technical' | 'behavioral',
  language: 'FR' | 'EN'
): Promise<InterviewFeedback> {
  const user = [
    wrapUntrusted('question', question, PROMPT_LIMITS.question),
    wrapUntrusted('answer', answer, PROMPT_LIMITS.answer),
  ].join('\n\n')

  const response = await completeChat('interview-feedback', {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt(type, language) },
      { role: 'user', content: user },
    ],
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
