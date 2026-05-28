import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseJobOffer } from '@/lib/ai/parse-offer'

const bodySchema = z.object({
  offerText: z.string().min(1),
  language: z.enum(['FR', 'EN']).default('EN'),
})

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  try {
    const result = await parseJobOffer(parsed.data.offerText, parsed.data.language)
    return NextResponse.json({ data: result })
  } catch {
    // Return nulls on Groq failure — never crash the UI
    return NextResponse.json({ data: { company: null, role: null, salary: null } })
  }
}
