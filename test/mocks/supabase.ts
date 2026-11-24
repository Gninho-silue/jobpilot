import { vi } from 'vitest'

// Fake for `@/lib/supabase`: records uploads, never touches Supabase Storage.

export const upload = vi.fn(async (_path: string, _body: Buffer, _opts: unknown) => ({ error: null as null | { message: string } }))
export const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `http://supabase.invalid/storage/v1/object/public/cvs/${path}` },
}))
export const from = vi.fn((_bucket: string) => ({ upload, getPublicUrl }))

export const supabase = { storage: { from } }

export function resetSupabase(): void {
  upload.mockClear()
  getPublicUrl.mockClear()
  from.mockClear()
}
