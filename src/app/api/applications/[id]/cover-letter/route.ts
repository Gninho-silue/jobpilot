import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAndIncrementUsage } from '@/lib/usage'
import { streamCoverLetter } from '@/lib/ai/generate-cover-letter'
import { checkRateLimit } from '@/lib/rate-limit'

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

  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  const application = await prisma.application.findUnique({ where: { id } })
  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvText: true, plan: true },
  })

  if (!user?.cvText) {
    return NextResponse.json({ error: 'No CV uploaded yet' }, { status: 400 })
  }

  const usage = await checkAndIncrementUsage(userId, 'coverLetters')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Free tier limit reached', upgrade: true },
      { status: 403 }
    )
  }

  try {
    const stream = await streamCoverLetter(
      user.cvText,
      application.offerText,
      application.company,
      application.role,
      application.language
    )
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

          // Save final cover letter text to database
          if (accumulatedText) {
            await prisma.application.update({
              where: { id },
              data: { coverLetter: accumulatedText },
            })
          }

          controller.close()
        } catch (streamErr) {
          console.error('[cover-letter] Stream processing error:', streamErr)
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
    console.error('[cover-letter] AI generation failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
