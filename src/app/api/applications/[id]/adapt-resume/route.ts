import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAndIncrementUsage, refundUsage } from '@/lib/usage'
import { CUT_OFF_MESSAGE, finishGeneration } from '@/lib/ai/finish-generation'
import { adaptResume, streamAdaptResume } from '@/lib/ai/adapt-resume'
import { checkAdaptedCv } from '@/lib/fact-check/check-adapted-cv'
import { actionableIssues, describeIssues } from '@/lib/fact-check/corrections'
import { STREAM_ERROR, STREAM_REPLACE } from '@/lib/stream-protocol'
import { checkLlmRateLimit, tooManyRequests } from '@/lib/rate-limit'
import { checkDemoQuota } from '@/lib/demo/quota'
import { adaptedCvCheck } from '@/lib/fact-check/summary'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const rateLimit = await checkLlmRateLimit(userId)
  if (!rateLimit.allowed) {
    return tooManyRequests(rateLimit)
  }
  // Demo visitors: a strict daily AI budget (lib/demo/quota.ts), whatever the plan.
  const demoLimit = await checkDemoQuota(actor!, request, 'heavy')
  if (demoLimit) return demoLimit

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvText: true, plan: true },
  })

  if (!user?.cvText) {
    return NextResponse.json({ error: 'No CV uploaded yet' }, { status: 400 })
  }

  const usage = await checkAndIncrementUsage(userId, 'cvAdaptations')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Free tier limit reached', upgrade: true },
      { status: 403 }
    )
  }

  try {
    const stream = await streamAdaptResume(user.cvText, application.offerText, application.language)
    const encoder = new TextEncoder()
    let accumulatedText = ''

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          let finishReason: string | null | undefined
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            finishReason = chunk.choices[0]?.finish_reason ?? finishReason
            if (content) {
              accumulatedText += content
              controller.enqueue(encoder.encode(content))
            }
          }

          // Cut-off draft → one retry with a bigger budget; complete draft with
          // fact-check issues → one regeneration with the corrections.
          const finalText = await finishGeneration({
            draft: accumulatedText,
            draftTruncated: finishReason === 'length',
            check: text => actionableIssues(checkAdaptedCv(user.cvText!, text)),
            regenerate: ({ budgetFactor, issues }) =>
              adaptResume(user.cvText!, application.offerText, application.language, {
                budgetFactor,
                corrections: issues ? describeIssues(issues) : undefined,
              }),
            onReplace: text => controller.enqueue(encoder.encode(STREAM_REPLACE + text)),
            logLabel: 'adapt-resume',
          })

          if (finalText) {
            await prisma.application.update({
              where: { id },
              // The check result is stored with the text: the dashboard reads it.
              data: { adaptedCvText: finalText, adaptedCvCheck: adaptedCvCheck(user.cvText, finalText, application.approvedCvTitle) ?? undefined },
            })
          } else {
            // Nothing usable was produced: never save a truncated CV, give the credit back.
            await refundUsage(userId, 'cvAdaptations')
            controller.enqueue(encoder.encode(STREAM_ERROR + CUT_OFF_MESSAGE))
          }

          controller.close()
        } catch (streamErr) {
          console.error('[adapt-resume] Stream processing error:', streamErr)
          controller.error(streamErr)
        }
      },
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[adapt-resume] AI generation failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
