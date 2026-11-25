import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { parseOfferSchema } from '@/lib/validation'
import { parseJobOffer } from '@/lib/ai/parse-offer'
import { checkLlmRateLimit, tooManyRequests } from '@/lib/rate-limit'
import { checkDemoQuota } from '@/lib/demo/quota'
import { TruncatedAnswerError } from '@/lib/ai/call'

export async function POST(request: Request) {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseOfferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const rateLimit = await checkLlmRateLimit(userId)
  if (!rateLimit.allowed) {
    return tooManyRequests(rateLimit)
  }
  // Demo visitors: a strict daily AI budget (lib/demo/quota.ts), whatever the plan.
  const demoLimit = await checkDemoQuota(actor!, request, 'heavy')
  if (demoLimit) return demoLimit

  try {
    const result = await parseJobOffer(parsed.data.offerText, parsed.data.language)
    return NextResponse.json({ data: result })
  } catch (err) {
    // Never a silent success with empty fields: the form shows this message.
    const error =
      err instanceof TruncatedAnswerError
        ? 'The offer analysis was cut off. Fill in the fields by hand or try again.'
        : 'The offer analysis failed. Fill in the fields by hand or try again.'
    return NextResponse.json({ error }, { status: 502 })
  }
}
