// CI check against the real Supabase project. Fails when a Storage bucket is
// public or a table of the `public` schema has Row Level Security disabled.
// Read-only: lists buckets and reads the Postgres catalog, never table data.
//
// Configuration (GitHub repository secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  → bucket check
//   SUPABASE_AUDIT_DB_URL                    → RLS check. Connection URL of the read-only
//                                              role jobpilot_ci_audit (scripts/sql/create-ci-audit-role.sql),
//                                              never the database owner
//   SUPABASE_DB_CA_CERT (optional)           → PEM of the Supabase CA, enables TLS certificate verification
// A check whose secrets are missing is reported as skipped (a warning), not passed.
import pg from 'pg'
import { auditSupabase } from './supabase-audit.mjs'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_AUDIT_DB_URL, SUPABASE_DB_CA_CERT } = process.env

async function listBuckets() {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/bucket`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  })
  if (!res.ok) throw new Error(`Storage API answered ${res.status}`)
  return res.json()
}

async function listTablesWithoutRls() {
  const client = new pg.Client({
    connectionString: SUPABASE_AUDIT_DB_URL,
    // Without the CA the connection is still encrypted, but the certificate is not verified.
    // `sslmode=disable` in the URL is for local testing only.
    ssl: /[?&]sslmode=disable\b/.test(SUPABASE_AUDIT_DB_URL)
      ? false
      : SUPABASE_DB_CA_CERT ? { ca: SUPABASE_DB_CA_CERT } : { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
      ORDER BY 1`)
    return rows.map(row => row.name)
  } finally {
    await client.end()
  }
}

const { problems, skipped } = await auditSupabase({
  listBuckets: SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? listBuckets : null,
  listTablesWithoutRls: SUPABASE_AUDIT_DB_URL ? listTablesWithoutRls : null,
})

for (const name of skipped) {
  console.log(`::warning::Supabase check skipped (${name}): its repository secrets are not set. See scripts/check-supabase-security.mjs.`)
}
for (const problem of problems) {
  console.log(`::error::${problem}`)
}
if (problems.length > 0) process.exit(1)
console.log(skipped.length === 2 ? 'Supabase security check not configured.' : 'Supabase security check passed.')
