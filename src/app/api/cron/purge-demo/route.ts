import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { purgeExpiredDemos } from '@/lib/demo/purge'

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** Daily purge of the demo workspaces older than 24 h (vercel.json). */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await purgeExpiredDemos())
}
