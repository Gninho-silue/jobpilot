/**
 * Control markers inside streamed AI text (safe for client code):
 * - STREAM_REPLACE + text: the text replaces everything before it (the
 *   fact-check or a truncation retry produced a better version);
 * - STREAM_ERROR + message: generation failed, nothing was saved; show the message.
 */
export const STREAM_REPLACE = '\u001Ereplace\u001E'
export const STREAM_ERROR = '\u001Eerror\u001E'

/** The error message sent by the server, or null. */
export function streamError(received: string): string | null {
  const at = received.lastIndexOf(STREAM_ERROR)
  return at >= 0 ? received.slice(at + STREAM_ERROR.length) : null
}

/** The text to display for what has been received so far. */
export function visibleStreamText(received: string): string {
  if (received.includes(STREAM_ERROR)) return ''
  const at = received.lastIndexOf(STREAM_REPLACE)
  const text = at >= 0 ? received.slice(at + STREAM_REPLACE.length) : received
  // Hide a marker that is still arriving (split across chunks).
  const partial = text.lastIndexOf('\u001E')
  return partial >= 0 ? text.slice(0, partial) : text
}
