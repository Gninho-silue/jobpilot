import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'groq-sdk/resources/chat/completions'
import type { CompletionUsage } from 'groq-sdk/resources/completions'
import { groq } from '@/lib/groq'

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

export async function completeChat(label: string, params: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion> {
  const response = await groq.chat.completions.create(params)
  logAiCall(label, params, response.choices[0]?.finish_reason, response.usage)
  return response
}

/** A streamed call; logged once the stream is fully read (usage comes with the last chunk). */
export async function streamChat(
  label: string,
  params: ChatCompletionCreateParamsStreaming
): Promise<AsyncIterable<ChatCompletionChunk>> {
  const stream = await groq.chat.completions.create(params)
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
