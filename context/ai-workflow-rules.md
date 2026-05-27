## Approach

Build JobPilot incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent behavior not defined here.

## Scoping Rules

- Work on one feature unit at a time
- Prefer small, verifiable increments over large speculative changes
- Do not combine unrelated system boundaries in a single implementation step
- One PR = one feature unit

## When to Split Work

Split an implementation step if it combines:

- UI changes and backend/API changes simultaneously
- Multiple unrelated API routes
- Behavior not clearly defined in the context files
- A database migration AND a new feature

If a change cannot be verified end-to-end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files
- If a requirement is ambiguous, add it as an open question in `progress-tracker.md` before implementing
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — shadcn/ui generated components, use CLI only
- `prisma/migrations/*` — never edit migration files, create new ones
- `context/*` — only update when implementation changes architecture or scope

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries → update `architecture.md`
- Storage model decisions → update `architecture.md`
- Code conventions or standards → update `code-standards.md`
- Feature scope → update `project-overview.md`
- Progress → always update `progress-tracker.md`

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant defined in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `npm run build` passes without errors
5. No `any` types introduced
