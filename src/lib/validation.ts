import { z } from 'zod'

export const APPLICATION_STATUSES = ['APPLIED', 'PHONE', 'TECHNICAL', 'OFFER', 'REJECTED'] as const

export const createApplicationSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  offerText: z.string().min(1),
  language: z.enum(['FR', 'EN']).default('EN'),
  salary: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
})

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().optional(),
  salary: z.string().optional(),
  link: z.string().url().optional().or(z.literal('')),
})

export const parseOfferSchema = z.object({
  offerText: z.string().min(1),
  language: z.enum(['FR', 'EN']).default('EN'),
})

export const interviewFeedbackSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(10, 'Answer is too short'),
  type: z.enum(['technical', 'behavioral']),
  language: z.enum(['FR', 'EN']),
})

export const CV_MAX_BYTES = 5 * 1024 * 1024
