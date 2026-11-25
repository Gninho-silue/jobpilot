import { vi } from 'vitest'

// Fake for `@/lib/groq`. Any call that a test did not prepare fails loudly,
// so a test can never consume the real Groq quota by accident.

export const GROQ_MODEL = 'test-model'

export interface FakeCompletionParams {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  stream?: boolean
  response_format?: { type: string }
  max_completion_tokens?: number
  reasoning_effort?: string
}

type FinishReason = 'stop' | 'length'

export const create = vi.fn(async (_params: FakeCompletionParams): Promise<unknown> => {
  throw new Error('Unexpected Groq call: prepare it with mockCompletion() or mockStream()')
})

export const groq = { chat: { completions: { create } } }

export function mockCompletion(content: string | null, finishReason: FinishReason = 'stop'): void {
  create.mockResolvedValueOnce({
    choices: [{ message: { content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 100, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 20 } },
  })
}

/** A streamed answer; the last chunk carries finish_reason ("length" = cut by the token budget). */
export function mockStream(chunks: string[], finishReason: FinishReason = 'stop'): void {
  create.mockImplementationOnce(async () =>
    (async function* () {
      for (const content of chunks) {
        yield { choices: [{ delta: { content }, finish_reason: null }] }
      }
      yield {
        choices: [{ delta: {}, finish_reason: finishReason }],
        x_groq: { usage: { prompt_tokens: 100, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 20 } } },
      }
    })()
  )
}

export function mockGroqFailure(error = new Error('Groq unavailable')): void {
  create.mockRejectedValueOnce(error)
}

/** Parameters of the n-th Groq call (0-based). */
export function groqCall(n = 0): FakeCompletionParams {
  const call = create.mock.calls[n]
  if (!call) throw new Error(`Groq was called ${create.mock.calls.length} time(s), not ${n + 1}`)
  return call[0]
}

/** Full prompt text (all messages joined) of the n-th Groq call. */
export function groqPrompt(n = 0): string {
  return groqCall(n).messages.map(m => m.content).join('\n')
}

export function resetGroq(): void {
  create.mockReset()
}
