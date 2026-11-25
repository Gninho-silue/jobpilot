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

- [x] AI Interview Feedback (Part 1 of prompt)
  - [x] lib/ai/interview-feedback.ts — generateInterviewFeedback(), bilingual FR/EN, score + strengths + improvements + betterAnswer
  - [x] POST /api/interview/feedback — Clerk auth, PRO-only check, Zod validation, rate limit
  - [x] GET /api/user/plan — lightweight plan endpoint
  - [x] MockInterviewModal — isPro + language props; FeedbackCard with colored stars, collapsible betterAnswer; PRO feedback on Next/Finish; FREE upgrade banner

- [x] Security Audit & Fixes (Part 2 of prompt)
  - [x] src/lib/rate-limit.ts — in-memory rate limiter (10 req/min/user), applied to all 4 AI endpoints
  - [x] src/lib/env.ts — validateEnv() checks all required env vars
  - [x] next.config.ts — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers
  - [x] All [id] routes — id non-empty validation + combined 403 (no-leak pattern)
  - [x] PDF magic bytes validation in /api/cv/upload
  - [x] Generic error messages in all catch blocks (no stack traces)
  - [x] eslint.config.mjs — downgraded react-hooks/set-state-in-effect to warn (pre-existing patterns)

- [x] GitHub Actions CI/CD (Part 3 of prompt)
  - [x] .github/workflows/ci.yml — lint+type-check → build → security-scan jobs
  - [x] .github/workflows/deploy.yml — notifies on push to main (Vercel integration handles actual deploy)
  - [x] .github/PULL_REQUEST_TEMPLATE.md — checklist with build/lint/type/security gates

- [x] Dashboard Deep-Linking & Action Routing
  - [x] "New Application" and row actions link to `/applications?new=1` and `/applications?edit=<id>`
  - [x] applications page reads `useSearchParams()`, auto-opens modal/sheet, cleans URL

- [x] Frontend Metadata, Favicon & Brand Identity
  - [x] Custom amber jet brand SVG icons: `src/app/icon.svg` & `public/icon.svg`
  - [x] Apple touch icon generated via `next/og` `ImageResponse`
  - [x] OpenGraph, Twitter card, robots.txt, sitemap.xml, manifest.json

- [x] Applications Search & Multi-Criteria Filtering
  - [x] `src/components/applications/applications-filter-bar.tsx`
  - [x] Real-time text search (company, role, notes)
  - [x] Language filter pills (ALL, EN, FR)
  - [x] Stage multi-select filter
  - [x] AI Asset status toggles (Adapted CV, Cover Letter, Interview Prep)
  - [x] Sorting options (Newest, Oldest, Company A-Z, Company Z-A, Role A-Z)
  - [x] Active filter chips with individual remove & clear all
  - [x] Empty search state with reset button

- [x] My CV Dual-Mode PDF Viewer
  - [x] `src/app/api/cv/route.ts` returns `cvText` and `cvUrl`
  - [x] Native embedded PDF viewer with PDF Preview vs Extracted Text tabs
  - [x] Toolbar: Copy text, Open in new tab, Download PDF

- [x] Real-Time AI Text Streaming (Phase 11)
  - [x] Backend `ReadableStream` responses for `/api/applications/[id]/adapt-resume` and `/api/applications/[id]/cover-letter`
  - [x] Groq model streaming via `streamAdaptResume()` and `streamCoverLetter()`
  - [x] Frontend stream reader with `TextDecoder` and blinking amber cursor UI

- [x] Kanban Drag-and-Drop (Phase 12)
  - [x] HTML5 drag handlers on `ApplicationCard` and `KanbanColumn`
  - [x] Optimistic UI updates on card drop
  - [x] Background `PATCH /api/applications/[id]` with automatic rollback and Sonner toast on failure
  - [x] Drag-over dashed ring animations and drop zone placeholders

- [x] LaTeX / Jake's Resume PDF Template & Zero-Hallucination Prompts (Phase 13)
  - [x] `src/lib/pdf/generate-cv-pdf.tsx` rewritten for LaTeX / Jake's Resume standard
  - [x] Strict anti-hallucination prompt rules in `adapt-resume.ts` and `generate-cover-letter.ts`
  - [x] Clean Markdown stripping on cover letters and CVs
  - [x] Clean multi-item language formatting (e.g. `Français: Langue maternelle · Anglais: Courant`)

## Current Phase

Phase 13 — Complete Production-Ready SaaS

## Current Goal

Vercel Deploy & Production Verification

- [x] Test safety net + CI (JOBPILOT_PLAN.md, step 1)
  - [x] Vitest 5 with two projects: `unit` (no DB) and `integration` (Postgres 16 via Testcontainers, or `TEST_DATABASE_URL`)
  - [x] Fakes for Clerk, Groq, Supabase, Stripe API and analytics in `test/mocks/`, registered globally
  - [x] Unit: Zod schemas (moved to `lib/validation.ts`), dashboard stats (moved to `lib/dashboard-stats.ts`), prompt construction and LLM response parsing, rate limiter, FreeTierBanner + UpgradeButton (Testing Library), 401 on all 17 authenticated route handlers
  - [x] Integration: free-tier quotas (5/3/3, PRO unlimited, monthly reset), IDOR on all 7 `/api/applications/[id]` handlers, CV upload validation, Stripe webhook signature + plan transitions
  - [x] Cross-user access on `/api/applications/[id]/*` now returns 404 (was 403)
  - [x] CI: `test` job (Node 22, Postgres service) runs before `build`; CI badge in README
  - [x] Node 22 required (Vitest 5)
- [x] Dependency security fixes (`npm audit --audit-level=high` clean)
  - [x] next 16.2.6 → 16.4.6 (+ eslint-config-next), prisma / @prisma/client / @prisma/adapter-pg 7.8.0 → 7.10.1, zod 4.4.3 → 4.6.7, shadcn 4.8.1 → 4.23.0, transitive fixes via `npm audit fix` / `npm update` (brace-expansion…); proxy-addr left the tree with the shadcn update
  - [x] `overrides` pins `effect` ^3.22.5 under `@prisma/config` (Prisma 7.10.1 still pins the vulnerable 3.20.0; used by the Prisma CLI config loader only)
  - [x] Lock file regenerated with Linux npm 10 (`npm install --package-lock-only` in a `node:22` container): a Windows-generated lock lacked Vite's nested `lightningcss@1.33.0` platform binaries, so `npm ci` failed in CI
  - [x] Test DB setup uses `prisma db push` without `--accept-data-loss` (the DB starts empty; Prisma 7.10 also refuses that flag when run by an AI agent)
- [x] Security and costs (JOBPILOT_PLAN.md, step 2)
  - [x] CV text extraction: pdf-parse 1.1.1 replaced by `unpdf` (`lib/pdf/extract-text.ts`); tests use real PDFs (`test/fixtures/`, regenerate with `node test/fixtures/make-fixtures.mjs`): one page, two pages, image-only scan → clear 400 message; the fake parser is gone
  - [x] Rate limit in Postgres (`RateLimitHit`, sliding window, advisory lock per key): 10 LLM calls / minute / user shared by offers/parse, adapt-resume, cover-letter, interview, interview/feedback; 429 + `Retry-After`; checked before a free-tier credit is consumed
  - [x] Atomic quotas: `INSERT … ON CONFLICT` (monthly reset) + conditional `UPDATE … RETURNING`; 10 concurrent requests with 1 credit left → 1 succeeds
  - [x] `BillingProvider` interface (`lib/billing`): checkout, portal, webhook → internal `subscription.activated` / `subscription.canceled` events; Stripe is the only implementation; checkout and portal routes tested with a fake provider
  - [x] Idempotent billing webhook: `ProcessedBillingEvent` (id = `stripe:<event id>`) inserted in the same transaction as the plan change; redelivered or concurrent duplicates are no-ops
  - [x] Private CV storage: the DB stores `User.cvPath` (`<userId>/cv.pdf`), never a URL; `GET /api/cv/file` checks the path is the user's own and redirects to a 10-minute signed URL (`?download=1` for a download); no `getPublicUrl` / `/object/public/` anywhere (test-enforced). AI routes never download the PDF: they use the text extracted at upload (`User.cvText`)
  - [x] CI job "Supabase Security" (`scripts/check-supabase-security.mjs`): fails if a Storage bucket is public or a `public` table has RLS disabled; skipped with a warning until the `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (bucket check) and `SUPABASE_AUDIT_DB_URL` (RLS check, read-only role `jobpilot_ci_audit` from `scripts/sql/create-ci-audit-role.sql`, never the DB owner; optional `SUPABASE_DB_CA_CERT`) repository secrets are set. Runs only on push to `main`
  - [x] Prompt injection: system message = instructions + `UNTRUSTED_DATA_RULE`; user text only in `wrapUntrusted()` tags (angle brackets neutralised, length capped by `PROMPT_LIMITS`); Zod max lengths on company, role, offer, notes, salary, interview question and answer
- [ ] Adapted CV without invention (JOBPILOT_PLAN.md, step 3), in progress
  - [x] Anonymised real-world fixtures (`test/fixtures/anonymized-2026-11-25/`); real PDFs local only (`test/fixtures/real-*/`, git-ignored, tests in `test/real/` skipped when absent)
  - [x] PDF rendering: `lib/text/typography.ts` (`normalizeTypography`: U+2011/U+2010 hyphens, U+202F/U+2009 spaces, detached LaTeX accents, combining marks; `toPdfSafe`: only WinAnsi characters Helvetica can draw). Applied at extraction, prompt input (`wrapUntrusted`), saved AI output and PDF rendering. Prompt counter-examples ("NEVER 100/%") removed: the model copied them
  - [x] Letter header uses the contact line (email/phone), not the CV's 2nd line; `stripNonPrintable` removed
  - [x] Links: `extractPdfText` returns the PDF's link URLs and appends a `Links:` line to the text; the adapted CV renders URL-like contact parts and project links as clickable addresses; a `>LINK:` that is not a URL is not rendered
  - [x] `isSectionHeader` tests the line as written (it upper-cased first, so short lines such as certifications became headings)
  - [x] Generic prompts (test fails on TechPal, DevScope, JobPilot, AgentFlow, PFE, PFA, Synertic) with stricter truthfulness rules (own title, per-experience tools, no merged experiences, no invented claims)
  - [x] Fact extraction (`lib/fact-check/cv-facts.ts`): technologies from a curated vocabulary with accepted rewordings (`vocabulary.ts`), counts / percentages / "N+" (number words as digits, versions and years excluded), years, title, and per-entry blocks cut at dated lines
  - [x] Deterministic checker (`lib/fact-check/check-adapted-cv.ts`): title kept (or user-approved variant); each entry matched to its block of the original (title + dates); technologies and numbers of each bullet must belong to that block; company and years must exist; profile / skills / certifications terms and numbers must exist in the CV. Issues carry a stable id and the exact line. Real case flags exactly: title, CI/CD + Docker + GitHub Actions on the PFE, PostgreSQL + Redis on the internship. Not checked: presenting a test-mode integration as real payments (prompt rule only)
  - [x] One regeneration: `adapt-resume` streams the draft, fact-checks it, and if issues are found calls the model once more with the corrections (`describeIssues`, `<corrections>` block); the corrected text is sent after `STREAM_REPLACE` (`lib/stream-protocol.ts`, the UI shows only what follows the marker) and saved even if issues remain. Same credit; a failed regeneration keeps the draft. Prompt rule 2 no longer lists CI/CD among strengths to emphasise (it invited the invention)

## Known Issues (found while writing tests)

- 10 moderate `npm audit` findings remain, all in dev tooling (Testcontainers' `archiver`/`glob`, the shadcn CLI's `ts-morph`/`minimatch`); npm's only fix is downgrading those packages to older majors. CI gates on high and above.
- After changing dependencies on Windows, check the lock file with `npm ci` in a Linux `node:22` container before pushing (npm bug: optional platform packages of nested deps are dropped).
- Tests still marked KNOWN BUG / KNOWN GAP: unvalidated LLM JSON shapes, misleading "vs last month" delta.
- The DB column is still named `User.stripeCustomerId`; a second billing provider will need it renamed (e.g. `billingCustomerId`).
- RLS: enabled by hand in production on `User`, `Application`, `UsageCounter`, `_prisma_migrations` (confirmed by the owner, app working); recorded in migration `20261124000150`. The "Supabase Security" CI job checks it on every push to `main` once its secrets are set.

## Schema Changes (Prisma Migrate)

Production is managed by `prisma migrate` (`_prisma_migrations` exists). History:

- `20260527000000_init`
- `20260528000000_add_stripe_customer_id`: applied in production (registered by hand in `_prisma_migrations`) but its file was never committed. Rebuilt as Prisma generates it (`stripeCustomerId` + unique index); its checksum is the SHA-256 of the file bytes (`d068e672…`). Prisma does not re-check applied migrations, so `migrate deploy` works even if production stored another checksum
- `20261124000000_baseline_adapted_cv_text`: `adaptedCvText`, added by hand without a migration. `IF NOT EXISTS`: a no-op in production
- `20261124000100_rate_limit_billing_events_cv_path` (phase 1): `RateLimitHit`, `ProcessedBillingEvent` (both with RLS), `User.cvPath` + backfill. Apply BEFORE deploying step 2, otherwise every LLM route and the billing webhook fail
- `20261124000150_enable_rls_existing_tables`: RLS on `User`, `Application`, `UsageCounter`, `_prisma_migrations` (already enabled by hand in production: a no-op there; a database rebuilt from migrations gets RLS)
- `prisma/pending-migrations/20261124000200_drop_cv_url` (phase 2, NOT in `prisma/migrations` on purpose, since `migrate deploy` applies everything there): catch-up backfill + `DROP COLUMN "cvUrl"`. Move it into `prisma/migrations/` only after the CV preview and an adaptation are verified in production

Applying to production: `DATABASE_URL` in `.env.local` is the transaction pooler (port 6543), which Prisma Migrate does not support. Point `DATABASE_URL` at `DIRECT_URL` (or the session pooler, port 5432) for the command only, run `npx prisma migrate status` (must list only `20261124000000_baseline_adapted_cv_text`, `20261124000100_rate_limit_billing_events_cv_path` and `20261124000150_enable_rls_existing_tables`), then `npx prisma migrate deploy`.

Verified on a throwaway Postgres 16 with production's exact history (init + add_stripe_customer_id applied and registered, adaptedCvText by hand, RLS already on), once with a matching and once with a different stored checksum: status lists only the three new migrations (no "not found locally"), deploy applies them, the backfill sets `cvPath` only for users with a CV, and after phase 2 the database matches `schema.prisma` exactly.

After phase 1 and the deploy: make the `cvs` bucket private (Storage → cvs → Edit bucket → Public off). New environments: create `cvs` as a PRIVATE bucket.

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

- For future schema changes: write a migration in `prisma/migrations/<timestamp>_<name>/migration.sql` (generate it with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`, which needs a shadow database in the Prisma config) and apply it with `npx prisma migrate deploy`. Never change production by hand in the SQL Editor
- Dev server: `npm run dev` → localhost:3000
- Supabase bucket `cvs` must be created manually (PRIVATE) before CV upload will work
