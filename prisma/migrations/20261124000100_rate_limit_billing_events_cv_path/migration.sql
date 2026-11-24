-- Phase 1 of 2 (step 2 + private CV storage). Safe to apply before deploying the
-- new code: it only adds tables and a column, and the running code ignores them.

-- Distributed rate limit (src/lib/rate-limit.ts)
CREATE TABLE "RateLimitHit" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

-- Idempotent billing webhooks (src/lib/billing/apply-event.ts)
CREATE TABLE "ProcessedBillingEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedBillingEvent_pkey" PRIMARY KEY ("id")
);

-- Not reachable through Supabase's public REST API (anon key). Prisma connects
-- as the table owner, which RLS does not apply to.
ALTER TABLE "RateLimitHit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcessedBillingEvent" ENABLE ROW LEVEL SECURITY;

-- Private CV storage: store the file path, not a public URL.
-- (The old upload code always wrote the file to "<userId>/cv.pdf".)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cvPath" TEXT;
UPDATE "User" SET "cvPath" = "id" || '/cv.pdf' WHERE "cvUrl" IS NOT NULL AND "cvPath" IS NULL;
