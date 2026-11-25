/**
 * Streamed AI text may end with a corrected version: the server sends
 * STREAM_REPLACE followed by the full text that replaces everything before it
 * (used when the fact-check triggers a regeneration). Safe for client code.
 */
export const STREAM_REPLACE = '\u001Ereplace\u001E'

/** The text to display for what has been received so far. */
export function visibleStreamText(received: string): string {
  const at = received.lastIndexOf(STREAM_REPLACE)
  const text = at >= 0 ? received.slice(at + STREAM_REPLACE.length) : received
  // Hide a marker that is still arriving (split across chunks).
  const partial = text.lastIndexOf('\u001E')
  return partial >= 0 ? text.slice(0, partial) : text
}
