-- Phase 2 of 2. Apply ONLY after the new code is live and the CV preview and an
-- adaptation were checked in production (see prisma/pending-migrations/README.md).

-- CVs uploaded by the old code between phase 1 and the deploy.
UPDATE "User" SET "cvPath" = "id" || '/cv.pdf' WHERE "cvUrl" IS NOT NULL AND "cvPath" IS NULL;

-- Remove the stored public URLs.
ALTER TABLE "User" DROP COLUMN "cvUrl";
