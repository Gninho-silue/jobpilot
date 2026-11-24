-- Column added to production by hand (Supabase SQL Editor) and never recorded in
-- a migration. IF NOT EXISTS: a no-op in production, and lets the migration
-- history rebuild the real schema on a fresh database.
-- (stripeCustomerId and its unique index come from 20260528000000_add_stripe_customer_id.)
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "adaptedCvText" TEXT;
