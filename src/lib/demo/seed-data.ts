import type { ApplicationStatus, Language } from '@prisma/client'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'

/**
 * Fictional data of the demo workspace: an invented candidate, example.com
 * contact, invented companies. The adapted CV contains one invented technology
 * (Kubernetes) and the letter one generic phrase, so a visitor sees the
 * fact-check panel at once without spending an AI generation.
 */
export const DEMO_CV = `Sam Rivera
Backend Developer | Node.js · TypeScript · PostgreSQL
sam.rivera@example.com | +00 000 000 000 | Remote

PROFILE
Backend developer with three years of experience building REST APIs in TypeScript. I like small services, fast queries and tests that catch regressions before users do.

TECHNICAL SKILLS
Languages: TypeScript · JavaScript · Python · SQL
Backend: Node.js · Express · NestJS · REST
Databases: PostgreSQL · Redis
Tools: Docker · GitHub Actions · Jest

PROFESSIONAL EXPERIENCE
Backend Developer, Fabrikam Logistics, Remote | March 2024 – November 2026
- Built 6 REST services with Node.js and PostgreSQL for shipment tracking across 12 warehouses.
- Cut p95 API latency by 35% with Redis caching.
- Set up CI with GitHub Actions for 4 services.
Junior Developer, Contoso Retail, Lyon | September 2022 – February 2024
- Maintained an Express order API and wrote 120 Jest tests.
- Moved 3 scheduled jobs into Docker containers.

PROJECTS
ShelfSense | TypeScript, NestJS, PostgreSQL | 2025
- Inventory forecasting API comparing 2 forecasting models.

EDUCATION
BSc in Computer Science, Example University | 2019 – 2022

LANGUAGES
English: Fluent · French: Native`

// The adapted CV for Northwind Traders: faithful, except "Kubernetes" in one bullet.
const ADAPTED_CV = `Sam Rivera
Backend Developer | Node.js · TypeScript · PostgreSQL
sam.rivera@example.com $|$ +00 000 000 000 $|$ Remote

PROFILE
Backend developer with three years of experience building REST APIs in TypeScript, with a focus on fast queries and tested services.

TECHNICAL SKILLS
Languages: TypeScript · JavaScript · Python · SQL
Backend: Node.js · Express · NestJS · REST
Databases: PostgreSQL · Redis
Tools: Docker · GitHub Actions · Jest

PROFESSIONAL EXPERIENCE
>TITLE: Backend Developer
>COMPANY: Fabrikam Logistics
>DATE: March 2024 – November 2026
- Built 6 REST services with Node.js and PostgreSQL for shipment tracking across 12 warehouses, deployed on Kubernetes.
- Cut p95 API latency by 35% with Redis caching.
- Set up CI with GitHub Actions for 4 services.

>TITLE: Junior Developer
>COMPANY: Contoso Retail
>DATE: September 2022 – February 2024
- Maintained an Express order API and wrote 120 Jest tests.
- Moved 3 scheduled jobs into Docker containers.

PROJECTS
>TITLE: ShelfSense
>TECH: TypeScript · NestJS · PostgreSQL
>DATE: 2025
- Inventory forecasting API comparing 2 forecasting models.

EDUCATION
>SCHOOL: Example University
>DEGREE: BSc in Computer Science
>DATE: 2019 – 2022

CERTIFICATIONS & LANGUAGES
English: Fluent · French: Native`

const COVER_LETTER = `Your offer for a Backend Engineer mentions slow shipment queries and a growing number of services, and my experience aligns perfectly with your needs.

At Fabrikam Logistics, I built 6 REST services with Node.js and PostgreSQL for shipment tracking across 12 warehouses. I cut p95 API latency by 35% with Redis caching, and I set up CI with GitHub Actions for 4 services.

I would welcome the chance to discuss how this work could help your team. Thank you for your time.`

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  { id: 'q1', type: 'technical', question: 'How did you choose what to cache in Redis to cut p95 latency by 35%?', hint: 'Name the slow queries, the cache keys and how you invalidated them.' },
  { id: 'q2', type: 'technical', question: 'How would you design an idempotent endpoint for a payment-like operation?', hint: 'Idempotency keys, unique constraints, what happens on a retry.' },
  { id: 'q3', type: 'behavioral', question: 'Tell us about a regression your tests caught before release.', hint: 'Situation, the test, what would have happened without it.' },
]

export interface DemoApplication {
  company: string
  role: string
  status: ApplicationStatus
  language: Language
  offerText: string
  salary?: string
  notes?: string
  adaptedCvText?: string
  coverLetter?: string
  interviewQs?: InterviewQuestion[]
  /** Days before now, so the dashboard shows a recent history. */
  daysAgo: number
}

export const DEMO_APPLICATIONS: DemoApplication[] = [
  {
    company: 'Northwind Traders',
    role: 'Backend Engineer',
    status: 'APPLIED',
    language: 'EN',
    offerText: 'Northwind Traders is hiring a Backend Engineer (Node.js, TypeScript, PostgreSQL) to speed up shipment queries and run a growing number of services. Remote in Europe.',
    salary: '55k€',
    adaptedCvText: ADAPTED_CV,
    coverLetter: COVER_LETTER,
    daysAgo: 1,
  },
  {
    company: 'Tailspin Toys',
    role: 'Node.js Developer',
    status: 'PHONE',
    language: 'EN',
    offerText: 'Tailspin Toys needs a Node.js Developer for its order platform: Express, PostgreSQL, Jest. Hybrid, Lyon.',
    notes: 'Phone screen with the engineering manager on Thursday.',
    daysAgo: 6,
  },
  {
    company: 'Woodgrove Bank',
    role: 'Backend Developer',
    status: 'TECHNICAL',
    language: 'EN',
    offerText: 'Woodgrove Bank is looking for a Backend Developer to build payment APIs in TypeScript with PostgreSQL and Redis.',
    interviewQs: INTERVIEW_QUESTIONS,
    daysAgo: 12,
  },
  {
    company: 'Adventure Works',
    role: 'Développeur Backend',
    status: 'OFFER',
    language: 'FR',
    offerText: 'Adventure Works recrute un Développeur Backend Node.js / NestJS pour sa plateforme de réservation. CDI, Lyon, télétravail partiel.',
    salary: '50k€',
    notes: 'Offer received: answer by Friday.',
    daysAgo: 20,
  },
  {
    company: 'Litware',
    role: 'Platform Engineer',
    status: 'REJECTED',
    language: 'EN',
    offerText: 'Litware wants a Platform Engineer with 5+ years of Kubernetes and Terraform.',
    notes: 'Rejected: they wanted more infrastructure experience.',
    daysAgo: 30,
  },
]
