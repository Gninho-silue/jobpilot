-- Columns that were added to production by hand (Supabase SQL Editor) and never
-- recorded in a migration. IF NOT EXISTS: a no-op in production, and lets the
-- migration history rebuild the real schema on a fresh database.
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "adaptedCvText" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
