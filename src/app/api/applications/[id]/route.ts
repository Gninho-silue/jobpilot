import { getActor } from '@/lib/actor'
import { NextResponse } from 'next/server'
import { updateApplicationSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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

  const existing = await prisma.application.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateApplicationSchema.safeParse(body)
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
  const actor = await getActor()
  const userId = actor?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const existing = await prisma.application.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.application.delete({ where: { id } })

  return NextResponse.json({ data: { id } })
}
