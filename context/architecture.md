## Stack

| Layer        | Technology                                        | Role                                         |
| ------------ | ------------------------------------------------- | -------------------------------------------- |
| Framework    | Next.js 14 + TypeScript                           | Full-stack React framework, App Router       |
| UI           | Tailwind CSS + shadcn/ui                          | Styling and component library                |
| Auth         | Clerk                                             | Authentication, OAuth, user management       |
| Database     | Supabase (PostgreSQL) + Prisma                    | Application data, user data, applications    |
| File Storage | Supabase Storage                                  | CV PDFs, generated documents                 |
| LLM          | Groq API (llama-3.3-70b)                          | CV adaptation, cover letters, interview prep |
| Payment      | Stripe (test mode) behind `lib/billing`           | Subscriptions, Free + Pro tiers              |
| PDF Parse    | unpdf (serverless build of pdf.js)                | Extract text from uploaded CVs               |
| Deploy       | Vercel (frontend + API)                           | Auto-deploy on push                          |
| CI/CD        | GitLab CI                                         | lint → test → build → deploy pipeline        |
| IaC          | Terraform                                         | Provision Railway/Vercel environments        |

## System Boundaries

- `app/` — Next.js App Router pages and layouts
- `app/api/` — API route handlers (REST endpoints)
- `components/` — Reusable UI components
- `components/ui/` — shadcn/ui generated components (DO NOT modify manually)
- `lib/` — Shared utilities: groq client, stripe client, supabase client, prisma client
- `lib/ai/` — All Groq AI prompt functions (CV adapt, cover letter, interview prep); `lib/ai/untrusted.ts` wraps user text as data
- `lib/billing/` — `BillingProvider` interface, Stripe implementation, idempotent event handling. Routes import `billing` from here, never Stripe directly
- `lib/rate-limit.ts` — Postgres sliding-window rate limit shared by all LLM routes
- `lib/pdf/` — PDF parsing and generation utilities
- `prisma/` — Database schema and migrations
- `context/` — Claude Code context files (this folder)

## Storage Model

- **PostgreSQL (Supabase via Prisma)**: User profiles, applications, subscription status, usage counters, generated text content (cover letters, interview questions), rate-limit hits (`RateLimitHit`, pruned to the window), processed billing event ids (`ProcessedBillingEvent`)
- **Supabase Storage**: CV PDF files in the private bucket `cvs` at `<userId>/cv.pdf`. The DB stores that path (`User.cvPath`), never a URL; browsers get the file only via `GET /api/cv/file` (ownership check → 10-minute signed URL). Server code uses the service-role client and works from the extracted text
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
- API routes call `getActor()` (`lib/actor.ts`) before any data access: a Clerk session, or else a demo visitor named by the signed `jp_demo` cookie (`lib/demo/cookie.ts`, HMAC-SHA256 with `DEMO_COOKIE_SECRET`, 24 h). A Clerk session always wins, and signing in removes the demo cookie (`lib/demo/proxy.ts`)
- A demo visitor is a `User` row with `id = demo_<random>` and `isDemo = true`, holding fictional data only, purged after 24 h. The `userId` filters that isolate users therefore isolate demos too. No CV upload in the demo
- Supabase Storage files are namespaced by userId: `cvs/{userId}/cv.pdf`; the bucket is private and no public URL is ever built (`lib/cv-storage.ts`)

## Language Detection

- Job offer language is auto-detected using a simple heuristic (fr/en keyword ratio) or Groq
- All AI outputs (CV adaptation, cover letter, interview questions) match the detected language
- UI remains in the user's browser language preference

## Invariants

1. No API route runs without an authenticated actor (Clerk session or signed demo cookie). Exceptions, each with its own protection: the billing webhook (provider signature), the demo purge cron (`CRON_SECRET`) and `POST /api/demo`, which creates the demo actor (rate-limited per IP)
2. Free tier limits are checked server-side before every AI generation call
3. CV text is extracted once on upload and stored — never re-parsed on every request
4. All AI prompts are defined in `lib/ai/` — no prompt strings inline in route handlers
5. `components/ui/` is never modified manually — use shadcn CLI only
6. Billing webhooks (`lib/billing`, Stripe today) are the only source of truth for subscription status; each event id is applied at most once
7. Every route that calls the LLM checks the per-user rate limit (`checkLlmRateLimit`) before any work
8. User text reaches a prompt only inside `wrapUntrusted()` tags in the user message; system messages hold our instructions only
9. No public Storage URL: files are served through short-lived signed URLs after an ownership check; buckets are private and public tables have RLS (checked in CI)
