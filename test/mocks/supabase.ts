import { vi } from 'vitest'

// Fake for `@/lib/supabase`: records uploads and signed-URL requests, never
// touches Supabase Storage.

export const upload = vi.fn(async (_path: string, _body: Buffer, _opts: unknown) => ({ error: null as null | { message: string } }))

export const createSignedUrl = vi.fn(async (path: string, expiresIn: number, opts?: { download?: string | boolean }) => ({
  data: {
    signedUrl: `http://supabase.invalid/storage/v1/object/sign/cvs/${path}?token=test&expiresIn=${expiresIn}${opts?.download ? `&download=${opts.download}` : ''}`,
  } as { signedUrl: string } | null,
  error: null as null | { message: string },
}))

export const from = vi.fn((_bucket: string) => ({ upload, createSignedUrl }))

export const supabase = { storage: { from } }

export function resetSupabase(): void {
  upload.mockClear()
  createSignedUrl.mockClear()
  from.mockClear()
}
