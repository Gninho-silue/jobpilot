/** Starts a demo workspace: POST /api/demo seeds it, sets the cookie and redirects to the dashboard. */
export function TryDemoButton({ className }: { className?: string }) {
  return (
    <form action="/api/demo" method="post">
      <button
        type="submit"
        className={
          className ??
          'rounded-lg border border-[hsl(var(--border-default))] px-8 py-3 text-sm font-medium text-[hsl(var(--text-primary))] transition-colors hover:bg-[hsl(var(--bg-surface-raised))]'
        }
      >
        Try the demo
      </button>
    </form>
  )
}
