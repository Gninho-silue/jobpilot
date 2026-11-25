const MESSAGES: Record<string, string> = {
  limit: 'Too many demos were started from your network in the last hour. Try again later, or create a free account.',
  unavailable: 'The demo is not available right now. You can still create a free account.',
  error: 'The demo could not start. Please try again in a moment.',
}

/** Why "Try the demo" sent the visitor back home (?demo=<reason>). Unknown reasons show nothing. */
export function DemoNotice({ reason }: { reason: string | undefined }) {
  const message = reason ? MESSAGES[reason] : undefined
  if (!message) return null
  return (
    <p
      role="alert"
      className="mx-auto mb-6 max-w-xl rounded-lg border border-[hsl(var(--state-warning))] bg-[hsl(var(--bg-surface-raised))] px-4 py-3 text-sm text-[hsl(var(--text-primary))]"
    >
      {message}
    </p>
  )
}
