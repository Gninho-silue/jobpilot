import { getActor } from '@/lib/actor'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isOwnCvPath, signCvUrl } from '@/lib/cv-storage'

/**
 * Serves the signed-in user's CV: checks that the stored path is the user's own
 * file, then redirects to a short-lived signed Storage URL. `?download=1` makes
 * Storage send it as an attachment.
 */
export async function GET(request: NextRequest) {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cvPath: true } })
  if (!isOwnCvPath(userId, user?.cvPath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const download = request.nextUrl.searchParams.get('download') === '1'
  const signedUrl = await signCvUrl(user.cvPath, { download })
  if (!signedUrl) {
    return NextResponse.json({ error: 'Could not open the CV. Please try again.' }, { status: 500 })
  }

  const res = NextResponse.redirect(signedUrl, 302)
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
