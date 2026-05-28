import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

// pdf-parse v1 is CJS-only. serverExternalPackages in next.config.ts ensures
// Next.js loads it via native require() at runtime instead of bundling it,
// which sidesteps the ESM default-export issue at the TypeScript/bundler level.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let cvText: string
  try {
    const data = await pdfParse(buffer)
    cvText = data.text.trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cv/upload] pdf-parse error:', msg)
    return NextResponse.json({ error: `Failed to extract text from PDF: ${msg}` }, { status: 400 })
  }

  if (!cvText) {
    return NextResponse.json(
      { error: 'Could not extract text from this PDF. Make sure it is not a scanned image.' },
      { status: 400 }
    )
  }

  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(`${userId}/cv.pdf`, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[cv/upload] supabase error:', uploadError.message)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(`${userId}/cv.pdf`)
  const cvUrl = urlData.publicUrl

  const clerkUser = await currentUser()
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
      cvUrl,
      cvText,
    },
    update: { cvUrl, cvText },
  })

  return NextResponse.json({ data: { cvUrl, cvText } })
}
