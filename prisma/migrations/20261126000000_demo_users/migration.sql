-- Demo workspace (step 4): a demo visitor is a User row with id "demo_<random>",
-- identified by a signed cookie instead of a Clerk session, purged after 24 h.
ALTER TABLE "User" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "User_isDemo_createdAt_idx" ON "User"("isDemo", "createdAt");
