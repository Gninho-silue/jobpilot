/**
 * Token budget of long generations (adapted CV, cover letter).
 *
 * A fixed max_tokens of 3000 cut adapted CVs of a 3-page CV in production
 * ("ESTEM Casablanca • >DE"): reasoning models (openai/gpt-oss-*) spend part of
 * the same budget on hidden reasoning tokens. So: low reasoning effort for those
 * models, and a budget that grows with the CV.
 */
export type GenerationKind = 'cv' | 'letter'

const MIN = { cv: 4000, letter: 3000 } as const
const MAX = 16_000

export interface GenerationOptions {
  max_completion_tokens: number
  reasoning_effort?: 'low'
}

export function generationOptions(model: string, cvText: string, kind: GenerationKind, factor = 1): GenerationOptions {
  // The adapted CV is about as long as the original (~0.3 token per character),
  // plus room for the low-effort reasoning and the format markers.
  const estimate = kind === 'cv' ? Math.ceil(cvText.length * 0.7) + 2500 : MIN.letter
  const budget = Math.min(MAX, Math.max(MIN[kind], estimate)) * factor
  return /gpt-oss/i.test(model) ? { max_completion_tokens: budget, reasoning_effort: 'low' } : { max_completion_tokens: budget }
}

/** finish_reason "length": the answer was cut by the token budget, it is not complete. */
export function finishedByLength(response: { choices: Array<{ finish_reason?: string | null }> }): boolean {
  return response.choices[0]?.finish_reason === 'length'
}

/** A non-streamed generation: its text, and whether the token budget cut it. */
export interface GeneratedText {
  text: string
  truncated: boolean
}
