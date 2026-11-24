import { describe, expect, it, vi } from 'vitest'
import { auditSupabase } from '../../scripts/supabase-audit.mjs'

// The CI job (scripts/check-supabase-security.mjs) wires these two readers to
// the real project; here they are fakes, so tests never reach Supabase.

const buckets = (...list: Array<{ id: string; public: boolean }>) => vi.fn(async () => list)
const tablesWithoutRls = (...names: string[]) => vi.fn(async () => names)

describe('auditSupabase', () => {
  it('passes when every bucket is private and every public-schema table has RLS', async () => {
    const result = await auditSupabase({
      listBuckets: buckets({ id: 'cvs', public: false }),
      listTablesWithoutRls: tablesWithoutRls(),
    })
    expect(result).toEqual({ problems: [], skipped: [] })
  })

  it('fails on a public bucket', async () => {
    const result = await auditSupabase({
      listBuckets: buckets({ id: 'cvs', public: true }, { id: 'avatars', public: false }),
      listTablesWithoutRls: tablesWithoutRls(),
    })
    expect(result.problems).toEqual([
      'Storage bucket "cvs" is public: anyone with a file path can download it. Make it private in Supabase.',
    ])
  })

  it('fails on each table without Row Level Security', async () => {
    const result = await auditSupabase({
      listBuckets: buckets(),
      listTablesWithoutRls: tablesWithoutRls('User', 'Application'),
    })
    expect(result.problems).toEqual([
      'Table public."User" has Row Level Security disabled: it is readable through the Supabase REST API with the public anon key.',
      'Table public."Application" has Row Level Security disabled: it is readable through the Supabase REST API with the public anon key.',
    ])
  })

  it('reports a check that is not configured as skipped, not as passed', async () => {
    const result = await auditSupabase({ listBuckets: null, listTablesWithoutRls: tablesWithoutRls() })
    expect(result).toEqual({ problems: [], skipped: ['storage buckets'] })
  })

  it('a reader that throws is a problem (the check must not pass silently)', async () => {
    const result = await auditSupabase({
      listBuckets: vi.fn(async () => {
        throw new Error('401 Unauthorized')
      }),
      listTablesWithoutRls: tablesWithoutRls(),
    })
    expect(result.problems).toEqual(['Could not check storage buckets: 401 Unauthorized'])
  })
})
