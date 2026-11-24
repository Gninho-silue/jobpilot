import { randomUUID } from 'node:crypto'

/**
 * Unique user id per test. The current rate limiter keeps per-user counters in
 * module memory for the whole test file, so reusing ids across tests would leak
 * rate-limit state between them.
 */
export function uid(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`
}
