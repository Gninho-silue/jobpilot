## General

- Keep modules small and single-purpose
- Fix root causes — never layer workarounds
- Do not mix unrelated concerns in one component or route
- All AI prompt logic lives in `lib/ai/` — never inline prompts in components or routes
- Feature flags and limits are defined in `lib/config.ts` — never hardcoded inline

## TypeScript

- Strict mode required throughout the project
- Never use `any` — use explicit interfaces or union types
- Validate all external input (API bodies, Groq responses, Stripe webhooks) before trusting it
- Use Zod for runtime validation at API boundaries

## Next.js

- Default to Server Components
- Add `'use client'` only when browser interactivity is required (state, events, hooks)
- API routes live in `app/api/` and handle one resource per file
- Never fetch data in Client Components that could be fetched in Server Components
- Use `next/font` for font loading — never load fonts via `<link>` tags

## Styling

- Use CSS custom property tokens from `ui-context.md` — no hardcoded hex values
- Tailwind utility classes for layout and spacing
- Never write custom CSS unless absolutely necessary
- Follow the border radius scale defined in `ui-context.md`

## API Routes

- Always validate and parse request input with Zod before any logic runs
- Always verify Clerk session before any data access or mutation
- Always check Free tier limits before calling Groq API
- Return consistent response shapes: `{ data: T }` for success, `{ error: string }` for errors
- Never expose internal error messages or stack traces in responses
- HTTP status codes: 200 success, 400 validation error, 401 unauthorized, 403 forbidden (tier limit), 404 not found, 500 internal error

## AI (Groq)

- All prompts defined in `lib/ai/` as named functions: `adaptResume()`, `generateCoverLetter()`, `generateInterviewQuestions()`
- Always include language parameter in every AI function
- Always handle Groq API errors gracefully — return a user-friendly error, never crash
- Streaming responses for cover letters and CV adaptation (better UX)
- Max tokens: 2048 for cover letters, 3000 for CV adaptation, 1500 for interview questions

## Database (Prisma)

- All DB operations go through the Prisma client in `lib/prisma.ts`
- Never write raw SQL unless Prisma cannot handle the query
- Always include userId filter on every query that returns user data
- Use transactions for operations that modify multiple tables

## Stripe

- Subscription status is updated only via Stripe webhooks — never trust client-side claims
- Webhook handler in `app/api/webhooks/stripe/route.ts`
- Always verify webhook signature before processing
- Plan stored in DB: `FREE` or `PRO` — checked server-side before every AI call

## File Organization

- `app/` — Pages, layouts, and API routes
- `app/api/` — REST API handlers
- `components/` — Feature components (tracker, resume, cover-letter, interview)
- `components/ui/` — shadcn/ui base components (never modify manually)
- `lib/` — Clients and utilities (groq, stripe, supabase, prisma)
- `lib/ai/` — All Groq prompt functions
- `lib/pdf/` — PDF parse and export
- `context/` — Claude Code context files
- `prisma/` — Schema and migrations
- `public/` — Static assets
- `terraform/` — Infrastructure as Code
