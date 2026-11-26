import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'groq-sdk/resources/chat/completions'
import type { CompletionUsage } from 'groq-sdk/resources/completions'
import { groq } from '@/lib/groq'
import { fakeCompletion, fakeLlmEnabled, fakeStream } from './fake-llm'

/**
 * Every model call goes through these two functions, which log one JSON line
 * per call: label, model, finish_reason, budget and token usage (prompt,
 * reasoning, answer). Never the prompt or the answer: they hold the user's CV.
 */

type Params = { model: string; max_completion_tokens?: number | null; max_tokens?: number | null }

function logAiCall(label: string, params: Params, finishReason: string | null | undefined, usage: CompletionUsage | null | undefined) {
  console.info(
    JSON.stringify({
      event: 'ai_call',
      label,
      model: params.model,
      finish_reason: finishReason ?? null,
      max_completion_tokens: params.max_completion_tokens ?? params.max_tokens ?? null,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      reasoning_tokens: usage?.completion_tokens_details?.reasoning_tokens ?? null,
    })
  )
}

/** A call that got no answer: HTTP status and error type only (the message may quote the request). */
function logAiCallFailed(label: string, params: Params, err: unknown) {
  const error = err as { status?: number; name?: string } | null
  console.warn(
    JSON.stringify({
      event: 'ai_call_failed',
      label,
      model: params.model,
      status: typeof error?.status === 'number' ? error.status : null,
      error: error?.name ?? 'Error',
    })
  )
}

async function create<T>(label: string, params: Params, call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (err) {
    logAiCallFailed(label, params, err)
    throw err
  }
}

export async function completeChat(label: string, params: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion> {
  // End-to-end tests only (E2E_FAKE_LLM=1, never in production): fixed answers, no network.
  const response = await create(label, params, () =>
    fakeLlmEnabled() ? Promise.resolve(fakeCompletion(label)) : groq.chat.completions.create(params)
  )
  logAiCall(label, params, response.choices[0]?.finish_reason, response.usage)
  return response
}

/** A streamed call; logged once the stream is fully read (usage comes with the last chunk). */
export async function streamChat(
  label: string,
  params: ChatCompletionCreateParamsStreaming
): Promise<AsyncIterable<ChatCompletionChunk>> {
  const stream = await create(label, params, () =>
    fakeLlmEnabled()
      ? Promise.resolve<AsyncIterable<ChatCompletionChunk>>(fakeStream(label))
      : (groq.chat.completions.create(params) as Promise<AsyncIterable<ChatCompletionChunk>>)
  )
  return (async function* () {
    let finishReason: string | null | undefined
    let usage: CompletionUsage | null | undefined
    for await (const chunk of stream) {
      finishReason = chunk.choices[0]?.finish_reason ?? finishReason
      usage = chunk.x_groq?.usage ?? usage
      yield chunk
    }
    logAiCall(label, params, finishReason, usage)
  })()
}

export const TRUNCATED_MESSAGE = 'The AI answer was cut off before the end. Please try again.'

/** The model answer was cut by its token budget twice: it must not be used. */
export class TruncatedAnswerError extends Error {
  constructor(label: string) {
    super(`${label}: answer cut off by the token budget (finish_reason "length")`)
    this.name = 'TruncatedAnswerError'
  }
}

/**
 * A short, non-streamed call that must be complete (JSON to parse, questions to
 * save): an answer cut off by the token budget is retried once with twice the
 * budget; cut off again, it throws TruncatedAnswerError instead of returning it.
 */
export async function completeUntilDone(
  label: string,
  params: (budgetFactor: number) => ChatCompletionCreateParamsNonStreaming
): Promise<ChatCompletion> {
  for (const factor of [1, 2]) {
    const response = await completeChat(label, params(factor))
    if (response.choices[0]?.finish_reason !== 'length') return response
  }
  throw new TruncatedAnswerError(label)
}
