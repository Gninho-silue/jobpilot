import { normalizeTypography } from '@/lib/text/typography'
import type { GeneratedText } from './generation'

export const CUT_OFF_MESSAGE = 'The AI answer was cut off before the end. Your credit was not used: please try again.'

interface FinishOptions<Issue> {
  /** Streamed draft, and whether the token budget cut it (finish_reason "length"). */
  draft: string
  draftTruncated: boolean
  /** Fact-check of a complete text. */
  check: (text: string) => Issue[]
  /** The single regeneration: after a cut-off draft (bigger budget) or with corrections. */
  regenerate: (options: { budgetFactor?: number; issues?: Issue[] }) => Promise<GeneratedText>
  /** Called when a better version replaces the draft on screen. */
  onReplace: (text: string) => void
  logLabel: string
}

/**
 * Decides what to save after a streamed generation, with at most one more model
 * call. A truncated answer is never saved, and never replaces a complete one:
 * - draft cut off → one retry with twice the budget; if that is cut off too,
 *   returns null (the caller refunds the credit and tells the user);
 * - complete draft with fact-check issues → one regeneration with the
 *   corrections; it replaces the draft only if it is complete.
 */
export async function finishGeneration<Issue>(options: FinishOptions<Issue>): Promise<string | null> {
  const draft = normalizeTypography(options.draft)

  if (options.draftTruncated) {
    try {
      const retry = await options.regenerate({ budgetFactor: 2 })
      const text = normalizeTypography(retry.text)
      if (retry.truncated || !text.trim()) return null
      options.onReplace(text)
      return text
    } catch (err) {
      console.error(`[${options.logLabel}] retry after a cut-off answer failed:`, err)
      return null
    }
  }

  if (!draft) return null
  const issues = options.check(draft)
  if (!issues.length) return draft

  try {
    const corrected = await options.regenerate({ issues })
    const text = normalizeTypography(corrected.text)
    if (corrected.truncated || !text.trim()) return draft
    options.onReplace(text)
    return text
  } catch (err) {
    console.error(`[${options.logLabel}] regeneration failed, keeping the draft:`, err)
    return draft
  }
}
