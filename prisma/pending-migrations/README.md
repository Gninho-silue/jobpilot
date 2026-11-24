# Pending migrations

Migrations written ahead of time that must NOT run yet. `prisma migrate deploy`
applies every migration in `prisma/migrations/`, so these live here until their
precondition holds.

## 20261124000200_drop_cv_url

Precondition: the private-CV-storage code is deployed and verified in production
(CV preview on /my-cv and one CV adaptation work).

To apply it:

1. `git mv prisma/pending-migrations/20261124000200_drop_cv_url prisma/migrations/`
2. Commit, then run `npx prisma migrate deploy` against production (same procedure
   as phase 1, see context/progress-tracker.md).
