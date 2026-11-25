/**
 * The client IP for per-IP limits: the first address of x-forwarded-for (set by
 * Vercel's edge), else x-real-ip. Never used to identify anyone, only as a key.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
}
