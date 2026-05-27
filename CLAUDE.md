## JobPilot — Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `context/project-overview.md` — product definition,
   goals, features, pricing, and scope
2. `context/architecture.md` — stack, system boundaries,
   database schema, storage model, and invariants
3. `context/ui-context.md` — theme, colors (light mode),
   typography, layout patterns, and component conventions
4. `context/code-standards.md` — TypeScript rules,
   Next.js conventions, API standards, AI prompt rules
5. `context/ai-workflow-rules.md` — development workflow,
   scoping rules, protected files, and delivery approach
6. `context/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

Update `context/progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.

## Key Invariants (never violate)

- No API route runs without first validating the Clerk session
- Free tier limits are checked server-side before every AI call
- All AI prompts are defined in lib/ai/ — never inline
- components/ui/\* is never modified manually
- Stripe webhooks are the only source of truth for plan status
- No hardcoded hex colors — use CSS custom property tokens
