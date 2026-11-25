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
- HTTP status codes: 200 success, 400 validation error, 401 unauthorized, 403 forbidden (tier limit), 404 not found, 429 rate limited (with `Retry-After`), 500 internal error
- Every route that calls the LLM starts with `checkLlmRateLimit(userId)` and returns `tooManyRequests(result)` when refused, before consuming a free-tier credit
- A resource owned by another user returns 404, exactly like one that does not exist (no existence leak)
- Request schemas live in `lib/validation.ts` (route files may only export HTTP handlers)

## AI (Groq)

- All prompts defined in `lib/ai/` as named functions: `adaptResume()`, `generateCoverLetter()`, `generateInterviewQuestions()`
- Always include language parameter in every AI function
- Always handle Groq API errors gracefully — return a user-friendly error, never crash
- Streaming responses for cover letters and CV adaptation (better UX)
- Every model call goes through `completeChat` / `streamChat` (`lib/ai/call.ts`): one JSON log line per call (label, model, finish_reason, budget, prompt / reasoning / completion tokens), never the prompt or the answer
- Prompts are generic: no real person's employer, school, project or contact details, examples included (src/lib/ai/generic-prompts.test.ts fails on known terms)
- Prompt structure: a `system` message with our instructions ending with `UNTRUSTED_DATA_RULE`, and a `user` message holding each piece of user text in `wrapUntrusted(tag, text, PROMPT_LIMITS.x)`. Short values interpolated anywhere go through `inlineField()`. Never put CV, offer, company, role or answer text in the system message
- Token budget of long generations from `generationOptions` (`lib/ai/generation.ts`): grows with the CV (min 4000 for a CV, 3000 for a letter), `reasoning_effort: low` for reasoning models. Always read `finish_reason`: a "length" answer is truncated and never saved as valid (`finishGeneration`: one retry with twice the budget, else credit refunded and an error sent after `STREAM_ERROR`)

## Database (Prisma)

- All DB operations go through the Prisma client in `lib/prisma.ts`
- Never write raw SQL unless Prisma cannot handle the query (e.g. `lib/usage.ts` uses `INSERT … ON CONFLICT` and a conditional `UPDATE … RETURNING` so quota checks are atomic)
- Always include userId filter on every query that returns user data
- Use transactions for operations that modify multiple tables
- Every schema change ships as a Prisma migration in `prisma/migrations/` (applied with `prisma migrate deploy`, never by hand). Never edit an existing migration. A migration that must wait (e.g. a destructive cleanup after a deploy) lives in `prisma/pending-migrations/` until it can run
- New tables in the `public` schema get `ENABLE ROW LEVEL SECURITY` in their migration (Supabase exposes `public` through its REST API)

## Testing

- Vitest. Unit tests: `*.test.ts(x)` next to the code (no database). Integration tests: `*.int.test.ts` (real Postgres via Testcontainers locally, a service container in CI)
- Route handlers are tested by calling the exported `GET`/`POST`/… directly, with Clerk mocked (`signInAs()` / `signOut()` from `test/mocks/clerk.ts`)
- Never call Groq, Stripe, Clerk or Supabase from a test. Their fakes are registered for every test in `test/setup/mocks.ts`; an unprepared Groq or Stripe API call throws
- Integration tests refuse to run against a non-local database
- Pure logic used by pages (e.g. dashboard numbers) lives in `lib/` so it can be unit-tested
- Tests named `KNOWN BUG` / `KNOWN GAP` pin current, wrong behavior; flip them when the fix lands
- New code is written test-first

## Storage (Supabase)

- Never call `getPublicUrl` or build `/object/public/` URLs (a test fails on any occurrence). Store the object path; serve files through a route that checks ownership and redirects to `createSignedUrl` (5–10 min)
- Storage access goes through `lib/cv-storage.ts` (service-role client, server only)

## Billing (Stripe today)

- Routes depend only on the `BillingProvider` interface (`lib/billing/types.ts`); the Stripe SDK is used only in `lib/billing/stripe-provider.ts`. A Merchant of Record (Lemon Squeezy / Paddle) is added as another provider
- Subscription status is updated only via billing webhooks — never trust client-side claims
- Webhook handler in `app/api/webhooks/stripe/route.ts`: `billing.parseWebhook()` verifies the signature, `applyBillingEvent()` applies each event id once (`ProcessedBillingEvent`, same transaction as the plan change)
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
