import type { ApplicationStatus, Plan } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { testEmail } from '@test/mocks/clerk'

export const SAMPLE_CV = `Jane Doe
Full-Stack Engineer
jane@example.test $|$ Rabat

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Acme Corp
>DATE: 2023 – 2025
- Built REST APIs with Node.js and PostgreSQL`

export const SAMPLE_OFFER = 'We are hiring a Full-Stack Engineer at Globex. React, Node.js, PostgreSQL. 45k€.'

export async function createUser(
  id: string,
  opts: { plan?: Plan; cvText?: string | null; stripeCustomerId?: string } = {}
) {
  return prisma.user.create({
    data: {
      id,
      email: testEmail(id),
      plan: opts.plan ?? 'FREE',
      cvText: opts.cvText === undefined ? SAMPLE_CV : opts.cvText,
      cvUrl: opts.cvText === null ? null : `http://supabase.invalid/${id}/cv.pdf`,
      stripeCustomerId: opts.stripeCustomerId,
    },
  })
}

export async function createApplication(
  userId: string,
  overrides: Partial<{
    company: string
    role: string
    status: ApplicationStatus
    adaptedCvText: string
    coverLetter: string
    notes: string
  }> = {}
) {
  return prisma.application.create({
    data: {
      userId,
      company: 'Globex',
      role: 'Full-Stack Engineer',
      offerText: SAMPLE_OFFER,
      language: 'EN',
      ...overrides,
    },
  })
}
