## Current Phase

Phase 7 — Interview Prep (completed)

## Current Goal

GitHub push + Vercel deploy

## Completed

- [x] Next.js 16.2.6 project initialized (TypeScript, Tailwind v4, App Router, src/ dir)
- [x] shadcn/ui v4 initialized + all required components added (button, card, badge, input, textarea, dialog, sheet, tabs, dropdown-menu, avatar, separator, tooltip, progress, table)
- [x] All npm dependencies installed: @clerk/nextjs, prisma, @prisma/client, @supabase/supabase-js, stripe, @stripe/stripe-js, groq-sdk, next-themes, zod, @fontsource/jetbrains-mono, dotenv, pdf-parse, @types/pdf-parse
- [x] globals.css rewritten with full CSS token system (light + dark) and JetBrains Mono font
- [x] next-themes ThemeProvider in src/components/providers.tsx, default theme: dark
- [x] Root layout updated: ClerkProvider + Providers wrapper
- [x] Clerk auth proxy (src/proxy.ts) — public routes: /, /sign-in, /sign-up, /api/webhooks
- [x] Prisma 7 schema: User, Application, UsageCounter models with correct enums
- [x] prisma.config.ts wired to DATABASE_URL env var
- [x] Prisma client generated
- [x] All lib clients: src/lib/prisma.ts, groq.ts, stripe.ts, supabase.ts, config.ts
- [x] .env.local and .env.example with all required keys (values empty)
- [x] App shell: (app)/layout.tsx with Navbar + Sidebar
- [x] src/components/layout/navbar.tsx — logo, notifications, theme toggle, user avatar
- [x] src/components/layout/sidebar.tsx — nav links + amber Upgrade button
- [x] /dashboard placeholder page
- [x] npm run build passes with no errors
- [x] Database migration applied manually via Supabase SQL Editor (port 5432 blocked by ISP/firewall on Windows)
- [x] _prisma_migrations table created and init migration registered manually
- [x] prisma.config.ts loads .env.local first, then .env
- [x] npm run dev running at localhost:3000
- [x] All env keys filled in .env.local (Clerk, Supabase, Groq, Stripe)
- [x] Job Tracker Kanban board (/applications)
  - [x] src/lib/usage.ts — checkAndIncrementUsage() with free tier enforcement
  - [x] POST /api/applications — create with free tier check
  - [x] GET /api/applications — list all for user
  - [x] PATCH /api/applications/[id] — update status/notes/salary/link
  - [x] DELETE /api/applications/[id] — delete with ownership check
  - [x] NewApplicationModal — paste offer, detect FR/EN, company/role/link/salary
  - [x] EditApplicationSheet — status dropdown, notes, salary, link, delete
  - [x] Kanban board page with 5 columns, cards, empty state
  - [x] pg + @prisma/adapter-pg installed — Prisma 7 driver adapter pattern wired up
- [x] Dashboard page (/dashboard)
  - [x] GET /api/dashboard — stats (totalApplications, byStatus, recentApplications, usageThisMonth, plan, thisWeekCount, responseRate)
  - [x] Free Tier Banner — amber left accent, usage progress bar, session-only dismiss (Client Component)
  - [x] Stats Cards Row — Total Applications, Response Rate, Interviews, Offers
  - [x] Recent Applications Table — company avatar, language badge, status badge with kanban colors, relative date, action buttons
  - [x] Empty state — links to /applications to add first application
  - [x] Page is a Server Component — data fetched via Prisma directly, firstName from Clerk currentUser()
- [x] Stripe integration (Phase 4)
  - [x] Prisma schema: added `stripeCustomerId String? @unique` to User model
  - [x] `npx prisma generate` updated client
  - [x] POST /api/stripe/checkout — creates Checkout session, get-or-create Stripe customer
  - [x] POST /api/stripe/portal — opens Stripe Customer Portal
  - [x] POST /api/webhooks/stripe — handles checkout.session.completed, customer.subscription.deleted/updated
  - [x] NEXT_PUBLIC_APP_URL added to .env.local
  - [x] `sonner` installed for toasts; Toaster added to (app)/layout.tsx
  - [x] `src/components/upgrade-button.tsx` — reusable button with loading state (primary + link variants)
  - [x] `src/components/manage-subscription-button.tsx` — calls /api/stripe/portal with loading state
  - [x] Sidebar Upgrade button wired to UpgradeButton (calls checkout)
  - [x] FreeTierBanner "Upgrade to Pro →" wired to UpgradeButton (link variant)
  - [x] Dashboard: UpgradeSuccessToast shows on ?upgraded=true and removes param from URL
  - [x] /settings page — shows plan (FREE/PRO), Manage Subscription (PRO) or Upgrade (FREE)
  - [x] npm run build passes with no errors
- [x] Auto-Parse Job Offer (Phase 5a)
  - [x] lib/ai/parse-offer.ts — updated with language parameter, JSON mode, graceful fallback
  - [x] POST /api/offers/parse — validates Clerk session, calls parseJobOffer(), returns nulls on failure
  - [x] NewApplicationModal — debounce 800ms on offerText, auto-fills company/role/salary if fields empty, "Auto" badge on auto-filled fields, spinner while parsing
- [x] Resume Adapter (Phase 5b)
  - [x] prisma/schema.prisma — added `adaptedCvText String? @db.Text` to Application model
  - [x] npx prisma generate — client updated
  - [x] lib/ai/adapt-resume.ts — adaptResume(cvText, offerText, language) — 3000 tokens, temperature 0.3, bilingual
  - [x] POST /api/applications/[id]/adapt-resume — ownership check, plan check, CV check, free tier limit, saves adaptedCvText to DB
  - [x] GET /api/cv — returns hasCv, cvUrl, cvTextPreview (500 chars), updatedAt
  - [x] POST /api/cv/upload — validates PDF (type + 5MB), extracts text via pdf-parse, uploads to Supabase Storage bucket 'cvs', updates user.cvUrl + user.cvText
  - [x] EditApplicationSheet Resume tab — 4 states: no CV / empty / generating / has result; Copy button; Regenerate button; Upgrade modal on 403
  - [x] /my-cv page — drag-and-drop upload zone, existing CV view with text preview, Replace CV flow
  - [x] Sidebar: /cv → /my-cv
  - [x] next.config.ts: serverExternalPackages: ['pdf-parse'] (CJS compat)
  - [x] npm run build passes with no errors

- [x] Cover Letter Generator (Phase 6)
  - [x] lib/ai/generate-cover-letter.ts — generateCoverLetter(cvText, offerText, company, role, language) — 2048 tokens, temperature 0.4, bilingual
  - [x] POST /api/applications/[id]/cover-letter — ownership check, CV check, free tier limit (coverLetters), saves coverLetter to DB
  - [x] GET /api/applications/[id]/cover-letter-pdf — generates A4 PDF with candidate header, date, recipient, body, footer
  - [x] lib/pdf/generate-cover-letter-pdf.tsx — Helvetica, A4, candidate name + contact from cvText, date, role/company line, paragraphs
  - [x] EditApplicationSheet Cover Letter tab — 4 states: no CV / empty / generating / has result; Copy, Regenerate (with confirm), Download PDF buttons
  - [x] applications page: onCoverLetterGenerated callback wired
  - [x] Application interface: coverLetter field added
  - [x] npm run build passes with no errors

- [x] Interview Prep (Phase 7)
  - [x] lib/ai/generate-interview-questions.ts — generateInterviewQuestions(cvText, offerText, company, role, language) — 10 questions (5 technical + 5 behavioral), 2000 tokens, temperature 0.3, bilingual
  - [x] POST /api/applications/[id]/interview — ownership check, CV check, saves interviewQs (Json) to DB
  - [x] Application interface: interviewQs field added (InterviewQuestion[] | null)
  - [x] EditApplicationSheet Interview tab — 4 states: no CV / empty / generating / has questions; two sections (Technical/Behavioral) with colored left border cards; Regenerate + Mock Interview buttons
  - [x] components/applications/mock-interview-modal.tsx — full-screen modal, timer, question counter, progress bar, hint toggle, textarea answer, Prev/Next/Finish navigation, summary screen with all Q&A
  - [x] app/(app)/interview/page.tsx — Interview Prep page listing apps with questions; empty state; Practice button opens mock interview modal
  - [x] applications page: onInterviewQsGenerated callback wired
  - [x] Sidebar already linked to /interview

## In Progress

- None

## Next Up

1. GitHub push + Vercel deploy
2. Setup GitLab CI/CD pipeline
3. Setup Terraform IaC

## Schema Changes Needed (run in Supabase SQL Editor)

```sql
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "adaptedCvText" TEXT;
```

Also create Supabase Storage bucket named `cvs` with public access.

## Open Questions

- Final name confirmed: JobPilot (verify domain availability)
- PDF export library: use `@react-pdf/renderer` or `puppeteer`?
- Language detection: heuristic (fast) or Groq call (accurate)?
- Mock interview mode: save audio or just text responses?
- Next.js 16 was installed instead of 14 (latest stable at init time) — no behavioral difference for this project

## Architecture Decisions

- Using Next.js 16 App Router (latest, not 14 as originally planned — same APIs)
- Clerk v6: `auth.protect()` async pattern in proxy.ts (not middleware.ts — Next.js 16 renamed convention)
- Prisma 7: datasource URL lives in prisma.config.ts, not schema.prisma
- Stripe SDK v18: API version `2026-04-22.dahlia` (latest)
- Groq API (llama-3.3-70b) instead of Ollama — deployable, fast, free tier generous
- Supabase for both PostgreSQL and file storage — single provider simplicity
- Prisma 7 requires driver adapter: `pg` + `@prisma/adapter-pg` — `new PrismaClient({ adapter: new PrismaPg(...) })` in lib/prisma.ts; `schema.prisma` datasource has no `url` field (it lives in `prisma.config.ts` for CLI only)
- pdf-parse loaded via `require()` (not ESM import) because `moduleResolution: "bundler"` resolves its ESM build which lacks a default export; `serverExternalPackages: ['pdf-parse']` in next.config.ts ensures CJS runtime load
- adaptedCvText stored as TEXT in Application (not a URL) — avoids extra storage round-trip for text content

## Session Notes

- For future schema changes: generate SQL with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`, run in Supabase SQL Editor, then register with the _prisma_migrations SQL pattern
- Dev server: `npm run dev` → localhost:3000
- Supabase bucket `cvs` must be created manually (public, no RLS) before CV upload will work
