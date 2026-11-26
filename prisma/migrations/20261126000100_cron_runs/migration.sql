-- Each run of a scheduled job (the demo purge), since the free Vercel logs only
-- keep one hour. Row Level Security on, no policy: unreachable through the anon key.
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "deleted" INTEGER,
    "error" TEXT,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CronRun_job_startedAt_idx" ON "CronRun"("job", "startedAt");

ALTER TABLE "CronRun" ENABLE ROW LEVEL SECURITY;
