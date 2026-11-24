-- Row Level Security on the tables that existed before step 2 (already enabled by
-- hand in production; ENABLE is a no-op on a table where RLS is already on).
-- With no policy, these tables are unreachable through Supabase's public REST API
-- (anon key). Prisma connects as the table owner, which RLS does not apply to.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
