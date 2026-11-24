import { z } from 'zod'

// Upper bounds on user text. The LLM prompts cap again (lib/ai/untrusted.ts).
export const INPUT_LIMITS = {
  company: 200,
  role: 200,
  offerText: 20_000,
  notes: 5_000,
  salary: 200,
  question: 1_000,
  answer: 5_000,
} as const

export const APPLICATION_STATUSES = ['APPLIED', 'PHONE', 'TECHNICAL', 'OFFER', 'REJECTED'] as const

export const createApplicationSchema = z.object({
  company: z.string().min(1).max(INPUT_LIMITS.company),
  role: z.string().min(1).max(INPUT_LIMITS.role),
  offerText: z.string().min(1).max(INPUT_LIMITS.offerText),
  language: z.enum(['FR', 'EN']).default('EN'),
  salary: z.string().max(INPUT_LIMITS.salary).optional(),
  link: z.string().url().optional().or(z.literal('')),
  notes: z.string().max(INPUT_LIMITS.notes).optional(),
})

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(INPUT_LIMITS.notes).optional(),
  salary: z.string().max(INPUT_LIMITS.salary).optional(),
  link: z.string().url().optional().or(z.literal('')),
})

export const parseOfferSchema = z.object({
  offerText: z.string().min(1).max(INPUT_LIMITS.offerText),
  language: z.enum(['FR', 'EN']).default('EN'),
})

export const interviewFeedbackSchema = z.object({
  question: z.string().min(1, 'Question is required').max(INPUT_LIMITS.question),
  answer: z.string().min(10, 'Answer is too short').max(INPUT_LIMITS.answer, 'Answer is too long'),
  type: z.enum(['technical', 'behavioral']),
  language: z.enum(['FR', 'EN']),
})

export const CV_MAX_BYTES = 5 * 1024 * 1024
