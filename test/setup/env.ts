// Dummy values only. Real keys never reach the test process: the Groq, Clerk
// and Supabase clients are mocked, and Stripe is only used offline
// (webhook signature checks).
export const TEST_STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = TEST_STRIPE_WEBHOOK_SECRET
process.env.STRIPE_PRO_PRICE_ID = 'price_test'
process.env.GROQ_API_KEY = 'gsk_test_dummy'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy'

// Unit tests must never open a database connection. Integration tests
// replace this with the Testcontainers URL in test/setup/db.ts.
process.env.DATABASE_URL = 'postgresql://unit-tests-have-no-db@127.0.0.1:1/none'
