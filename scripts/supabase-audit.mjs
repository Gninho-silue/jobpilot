// Pure decision logic of the Supabase security check (see check-supabase-security.mjs).
// Readers are injected, so tests run it against fakes.

/**
 * @typedef {{ id: string, public: boolean }} Bucket
 * @param {{
 *   listBuckets: (() => Promise<Bucket[]>) | null,
 *   listTablesWithoutRls: (() => Promise<string[]>) | null,
 * }} readers  null = that check is not configured
 * @returns {Promise<{ problems: string[], skipped: string[] }>}
 */
export async function auditSupabase({ listBuckets, listTablesWithoutRls }) {
  const problems = []
  const skipped = []

  async function run(name, reader, toProblems) {
    if (!reader) {
      skipped.push(name)
      return
    }
    try {
      problems.push(...toProblems(await reader()))
    } catch (err) {
      problems.push(`Could not check ${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  await run('storage buckets', listBuckets, list =>
    list
      .filter(bucket => bucket.public)
      .map(bucket => `Storage bucket "${bucket.id}" is public: anyone with a file path can download it. Make it private in Supabase.`)
  )

  await run('Row Level Security', listTablesWithoutRls, tables =>
    tables.map(
      table =>
        `Table public."${table}" has Row Level Security disabled: it is readable through the Supabase REST API with the public anon key.`
    )
  )

  return { problems, skipped }
}
