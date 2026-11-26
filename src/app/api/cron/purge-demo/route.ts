import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { purgeExpiredDemos } from '@/lib/demo/purge'
import { prisma } from '@/lib/prisma'

const JOB = 'purge-demo'

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** Records a run; a failure to record is only logged (it must not hide the purge result). */
async function record(run: { startedAt: Date; status: 'success' | 'error'; deleted?: number; error?: string }) {
  try {
    await prisma.cronRun.create({
      data: { job: JOB, startedAt: run.startedAt, finishedAt: new Date(), status: run.status, deleted: run.deleted ?? null, error: run.error?.slice(0, 2000) ?? null },
    })
  } catch (err) {
    console.error('[cron] could not record the run:', err)
  }
}

/** Daily purge of the demo workspaces older than 24 h (vercel.json); each run is kept in CronRun. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const startedAt = new Date()
  try {
    const result = await purgeExpiredDemos()
    await record({ startedAt, status: 'success', deleted: result.deleted })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron] purge-demo failed:', err)
    await record({ startedAt, status: 'error', error: message })
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 })
  }
}
