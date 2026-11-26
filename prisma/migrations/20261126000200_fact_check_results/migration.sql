-- The fact-check result of the adapted CV and of the cover letter, stored when
-- the text is written, so the dashboard can list what to check without running
-- the checker on each visit.
ALTER TABLE "Application" ADD COLUMN "adaptedCvCheck" JSONB,
ADD COLUMN "coverLetterCheck" JSONB;
