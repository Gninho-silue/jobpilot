import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  status: z.enum(['APPLIED', 'PHONE', 'TECHNICAL', 'OFFER', 'REJECTED']).optional(),
  notes: z.string().optional(),
  salary: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
})

export async function PATCH(
  request: Request,
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

  const existing = await prisma.application.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const data: Record<string, string | null | undefined> = {}
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null
  if (parsed.data.salary !== undefined) data.salary = parsed.data.salary || null
  if (parsed.data.link !== undefined) data.link = parsed.data.link || null

  const application = await prisma.application.update({
    where: { id },
    data,
  })

  return NextResponse.json({ data: application })
}

export async function DELETE(
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

  const existing = await prisma.application.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.application.delete({ where: { id } })

  return NextResponse.json({ data: { id } })
}
