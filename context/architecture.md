## Stack

| Layer        | Technology                                        | Role                                         |
| ------------ | ------------------------------------------------- | -------------------------------------------- |
| Framework    | Next.js 14 + TypeScript                           | Full-stack React framework, App Router       |
| UI           | Tailwind CSS + shadcn/ui                          | Styling and component library                |
| Auth         | Clerk                                             | Authentication, OAuth, user management       |
| Database     | Supabase (PostgreSQL) + Prisma                    | Application data, user data, applications    |
| File Storage | Supabase Storage                                  | CV PDFs, generated documents                 |
| LLM          | Groq API (llama-3.3-70b)                          | CV adaptation, cover letters, interview prep |
| Payment      | Stripe                                            | Subscriptions, Free + Pro tiers              |
| PDF Parse    | PyMuPDF (Python microservice) or pdf-parse (Node) | Extract text from uploaded CVs               |
| Deploy       | Vercel (frontend + API)                           | Auto-deploy on push                          |
| CI/CD        | GitLab CI                                         | lint → test → build → deploy pipeline        |
| IaC          | Terraform                                         | Provision Railway/Vercel environments        |

## System Boundaries

- `app/` — Next.js App Router pages and layouts
- `app/api/` — API route handlers (REST endpoints)
- `components/` — Reusable UI components
- `components/ui/` — shadcn/ui generated components (DO NOT modify manually)
- `lib/` — Shared utilities: groq client, stripe client, supabase client, prisma client
- `lib/ai/` — All Groq AI prompt functions (CV adapt, cover letter, interview prep)
- `lib/pdf/` — PDF parsing and generation utilities
- `prisma/` — Database schema and migrations
- `context/` — Claude Code context files (this folder)

## Storage Model

- **PostgreSQL (Supabase via Prisma)**: User profiles, applications, subscription status, usage counters, generated text content (cover letters, interview questions)
- **Supabase Storage**: CV PDF files, generated PDF exports
- **Never store**: Large file content in PostgreSQL, API keys in the database

## Database Schema (Prisma)

```
User
  id          String (Clerk user ID)
  email       String
  plan        Enum (FREE, PRO)
  cvUrl       String? (Supabase Storage URL)
  cvText      String? (extracted text from CV)
  createdAt   DateTime
  applications Application[]
  usageMonth  UsageCounter?

Application
  id            String
  userId        String
  company       String
  role          String
  status        Enum (APPLIED, PHONE, TECHNICAL, OFFER, REJECTED)
  language      Enum (FR, EN)
  offerText     String
  salary        String?
  link          String?
  notes         String?
  adaptedCvUrl  String?
  coverLetter   String?
  interviewQs   Json?
  createdAt     DateTime
  updatedAt     DateTime

UsageCounter
  userId          String
  month           String (YYYY-MM)
  cvAdaptations   Int (default 0)
  coverLetters    Int (default 0)
  applications    Int (default 0)
```

## Auth and Access Model

- Every user signs in via Clerk (email, Google, or GitHub)
- Clerk user ID is the primary key in our database
- Every application belongs to exactly one user
- API routes validate Clerk session before any data access
- Supabase Storage files are namespaced by userId: `cvs/{userId}/cv.pdf`

## Language Detection

- Job offer language is auto-detected using a simple heuristic (fr/en keyword ratio) or Groq
- All AI outputs (CV adaptation, cover letter, interview questions) match the detected language
- UI remains in the user's browser language preference

## Invariants

1. No API route runs without first validating the Clerk session
2. Free tier limits are checked server-side before every AI generation call
3. CV text is extracted once on upload and stored — never re-parsed on every request
4. All AI prompts are defined in `lib/ai/` — no prompt strings inline in route handlers
5. `components/ui/` is never modified manually — use shadcn CLI only
6. Stripe webhooks are the only source of truth for subscription status
