# Pending migrations

Migrations written ahead of time that must NOT run yet. `prisma migrate deploy`
applies every migration in `prisma/migrations/`, so a migration waits here until
its precondition holds, then moves there with `git mv`.

None at the moment. (`20261124000200_drop_cv_url` moved to `prisma/migrations/`
once the private CV storage was verified in production.)
