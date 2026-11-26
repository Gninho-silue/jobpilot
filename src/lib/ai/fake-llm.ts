import type { ChatCompletion, ChatCompletionChunk } from 'groq-sdk/resources/chat/completions'
import { DEMO_ADAPTED_CV, DEMO_COVER_LETTER } from '@/lib/demo/seed-data'

/**
 * A fake language model for end-to-end tests: fixed answers per call label, no
 * network. On only with E2E_FAKE_LLM=1, never on a Vercel production deployment,
 * and a production build that sees E2E_FAKE_LLM at all fails (next.config.ts).
 */
export { assertNoFakeLlmInProduction, fakeLlmEnabled } from './fake-llm-guard'

// Fixed answers. The adapted CV and the letter each claim Terraform, absent from
// the demo CV, so the fact-check panel has something to show.
const ADAPTED_CV = DEMO_ADAPTED_CV.replace('deployed on Kubernetes', 'provisioned with Terraform')
const COVER_LETTER = DEMO_COVER_LETTER.replace(
  'I set up CI with GitHub Actions for 4 services.',
  'I set up CI with GitHub Actions for 4 services and managed their infrastructure with Terraform.'
)

const QUESTIONS = Array.from({ length: 10 }, (_, i) => ({
  id: `q${i + 1}`,
  type: i < 5 ? 'technical' : 'behavioral',
  question: i < 5 ? `Technical question ${i + 1} about the offer.` : `Behavioural question ${i - 4} about your experience.`,
  hint: 'Answer with a concrete example from your CV.',
}))

const FEEDBACK = {
  score: 7,
  strengths: ['Concrete example from the CV.'],
  improvements: ['Give the result in figures.'],
  betterAnswer: 'At Fabrikam Logistics, I cut p95 API latency by 35% with Redis caching.',
}

const ANSWERS: Array<[RegExp, string]> = [
  [/^parse-offer$/, JSON.stringify({ company: 'Contoso Robotics', role: 'Backend Engineer', salary: '52k€' })],
  [/^adapt-resume(\.stream)?$/, ADAPTED_CV],
  [/^cover-letter(\.stream)?$/, COVER_LETTER],
  [/^interview-questions$/, JSON.stringify(QUESTIONS)],
  [/^interview-feedback$/, JSON.stringify(FEEDBACK)],
]

function answerFor(label: string): string {
  const found = ANSWERS.find(([pattern]) => pattern.test(label))
  if (!found) throw new Error(`Fake LLM: no fixed answer for "${label}"`)
  return found[1]
}

export function fakeCompletion(label: string): ChatCompletion {
  return {
    id: `fake-${label}`,
    object: 'chat.completion',
    created: 0,
    model: 'fake-llm',
    choices: [{ index: 0, message: { role: 'assistant', content: answerFor(label) }, finish_reason: 'stop', logprobs: null }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  } as ChatCompletion
}

export async function* fakeStream(label: string): AsyncGenerator<ChatCompletionChunk> {
  const text = answerFor(label)
  const size = 400
  for (let i = 0; i < text.length; i += size) {
    const last = i + size >= text.length
    yield {
      id: `fake-${label}`,
      object: 'chat.completion.chunk',
      created: 0,
      model: 'fake-llm',
      choices: [{ index: 0, delta: { content: text.slice(i, i + size) }, finish_reason: last ? 'stop' : null, logprobs: null }],
    } as ChatCompletionChunk
  }
}
