import { supabase } from '@/lib/supabase'

/**
 * CV files live in the private Supabase Storage bucket `cvs`, one per user at
 * `<userId>/cv.pdf`. The database stores that path, never a URL. Browsers get
 * the file only through GET /api/cv/file, which checks ownership and redirects
 * to a short-lived signed URL. The server uses the service-role client.
 */
export const CV_BUCKET = 'cvs'

/** Lifetime of a signed CV URL (10 minutes). */
export const CV_SIGNED_URL_TTL_SECONDS = 600

/** App route that serves the signed-in user's CV (never a Storage URL). */
export const CV_FILE_ROUTE = '/api/cv/file'

export function cvPathFor(userId: string): string {
  return `${userId}/cv.pdf`
}

/** A stored path is usable only if it is exactly this user's file. */
export function isOwnCvPath(userId: string, path: string | null | undefined): path is string {
  return path === cvPathFor(userId)
}

export async function uploadCv(userId: string, pdf: Buffer): Promise<{ path: string } | { error: string }> {
  const path = cvPathFor(userId)
  const { error } = await supabase.storage.from(CV_BUCKET).upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  return error ? { error: error.message } : { path }
}

export async function signCvUrl(path: string, opts: { download?: boolean } = {}): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, CV_SIGNED_URL_TTL_SECONDS, opts.download ? { download: 'cv.pdf' } : undefined)
  if (error || !data?.signedUrl) {
    console.error('[cv-storage] signing failed:', error?.message)
    return null
  }
  return data.signedUrl
}
