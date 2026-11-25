import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeTypography } from '@/lib/text/typography'
import { checkAndIncrementUsage } from '@/lib/usage'
import { adaptResume, streamAdaptResume } from '@/lib/ai/adapt-resume'
import { checkAdaptedCv } from '@/lib/fact-check/check-adapted-cv'
import { describeIssues } from '@/lib/fact-check/corrections'
import { STREAM_REPLACE } from '@/lib/stream-protocol'
import { checkLlmRateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
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
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              accumulatedText += content
              controller.enqueue(encoder.encode(content))
            }
          }

          // Fact-check the draft against the original CV; one regeneration at most,
          // with the corrections. The corrected version replaces the draft on screen.
          let finalText = normalizeTypography(accumulatedText)
          const issues = finalText ? checkAdaptedCv(user.cvText!, finalText) : []
          if (issues.length) {
            try {
              const corrected = normalizeTypography(
                await adaptResume(user.cvText!, application.offerText, application.language, {
                  corrections: describeIssues(issues),
                })
              )
              if (corrected.trim()) {
                finalText = corrected
                controller.enqueue(encoder.encode(STREAM_REPLACE + corrected))
              }
            } catch (regenErr) {
              console.error('[adapt-resume] regeneration failed, keeping the draft:', regenErr)
            }
          }

          if (finalText) {
            await prisma.application.update({
              where: { id },
              data: { adaptedCvText: finalText },
            })
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
