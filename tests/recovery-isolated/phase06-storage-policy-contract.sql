-- Disposable local Supabase only. Verify the captured hosted vulnerability is
-- present before the migration, then enforce the post-migration contract.
DO $before$
BEGIN
  IF current_setting('recovery.test_only', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Refuse evidence policy fixture outside disposable recovery SQL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='public complaint evidence upload'
      AND cmd='INSERT' AND 'anon'=ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Expected captured unsafe anonymous direct evidence INSERT policy';
  END IF;
END
$before$;

\i supabase/migrations/20261019000100_private_public_evidence_uploads.sql

DO $after$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage'
      AND tablename='objects' AND policyname='public complaint evidence upload'
  ) THEN
    RAISE EXCEPTION 'Anonymous bypass policy survived the evidence hardening migration';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage'
      AND tablename='objects' AND policyname='active admin evidence insert'
      AND cmd='INSERT' AND 'authenticated'=ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Authorized Admin evidence upload policy was lost';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage'
      AND tablename='objects' AND policyname='published complaint evidence read'
  ) THEN
    RAISE EXCEPTION 'Published evidence read policy was lost';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage'
      AND tablename='objects' AND cmd IN ('INSERT','ALL') AND 'anon'=ANY(roles)
      AND coalesce(with_check,'false') <> 'false'
  ) THEN
    RAISE EXCEPTION 'Another anonymous Storage INSERT policy remains';
  END IF;
  RAISE NOTICE 'PHASE06_STORAGE_POLICY_CONTRACT_PASS';
END
$after$;
