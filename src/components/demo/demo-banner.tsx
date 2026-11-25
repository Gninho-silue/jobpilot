/** Shown on every page of the demo workspace. */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-[hsl(var(--state-warning))] bg-[hsl(var(--bg-surface-raised))] px-6 py-2 text-center text-xs text-[hsl(var(--text-primary))]"
    >
      Demo workspace — data resets daily. Payments run in Stripe test mode (card 4242 4242 4242 4242).
    </div>
  )
}
