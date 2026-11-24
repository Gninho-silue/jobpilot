-- Dedicated role for the CI job "Supabase Security" (scripts/check-supabase-security.mjs).
-- It can log in and read the system catalog (pg_class, pg_namespace: readable by
-- every role) to find tables without Row Level Security. It is granted nothing
-- else: no table, no schema privilege beyond PUBLIC's, read-only sessions.
--
-- Run once as `postgres` in the Supabase SQL Editor, after replacing
-- CHANGE_ME_GENERATED_PASSWORD with a long random password. Never commit it.

CREATE ROLE jobpilot_ci_audit WITH
  LOGIN
  PASSWORD 'CHANGE_ME_GENERATED_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT 2;

ALTER ROLE jobpilot_ci_audit SET default_transaction_read_only = on;
ALTER ROLE jobpilot_ci_audit SET statement_timeout = '10s';

-- Belt and braces: make sure no table privilege was ever granted to it.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM jobpilot_ci_audit;
