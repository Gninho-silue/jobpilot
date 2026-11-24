import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { CV_MAX_BYTES } from '@/lib/validation'
import { extractPdfText } from '@/lib/pdf/extract-text'

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // %PDF

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
  if (file.size > CV_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validate PDF magic bytes (%PDF-) — guards against spoofed MIME type
  if (
    buffer.length < 4 ||
    buffer[0] !== PDF_MAGIC[0] ||
    buffer[1] !== PDF_MAGIC[1] ||
    buffer[2] !== PDF_MAGIC[2] ||
    buffer[3] !== PDF_MAGIC[3]
  ) {
    return NextResponse.json({ error: 'File does not appear to be a valid PDF' }, { status: 400 })
  }

  let cvText: string
  try {
    cvText = (await extractPdfText(buffer)).text
  } catch (err) {
    console.error('[cv/upload] PDF text extraction failed:', err)
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 400 })
  }

  if (!cvText) {
    return NextResponse.json(
      {
        error:
          'This PDF contains no text, it is probably a scan. Export your CV to PDF from Word, Google Docs or a similar tool and upload it again.',
      },
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
