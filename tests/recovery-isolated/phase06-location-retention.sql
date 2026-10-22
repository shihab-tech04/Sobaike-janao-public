-- Exercise real privacy retention only in the already-verified local fixture.
BEGIN;
SET LOCAL recovery.test_only = 'true';
DO $test$
DECLARE
  published_count integer;
  pending_count integer;
  deleted_count integer;
BEGIN
  IF current_setting('recovery.test_only', true) <> 'true' THEN
    RAISE EXCEPTION 'Refuse retention test outside disposable SQL';
  END IF;

  -- A published row older than 24 hours and a pending row older than 7 days
  -- must be erased, while recent pending reporter context must survive.
  UPDATE public.complaint_submission_contexts
  SET created_at = now() - interval '2 days'
  WHERE client_submission_id LIKE 'ci-gateway-%';
  GET DIAGNOSTICS published_count = ROW_COUNT;
  UPDATE public.complaint_submission_contexts
  SET created_at = now() - interval '8 days'
  WHERE client_submission_id LIKE 'ci-schema-child_abduction_murder-%';
  GET DIAGNOSTICS pending_count = ROW_COUNT;
  IF published_count <> 1 OR pending_count <> 1 THEN
    RAISE EXCEPTION 'Synthetic records for retention test missing';
  END IF;
  SELECT private.prune_reporter_submission_contexts() INTO deleted_count;
  IF deleted_count < 2 THEN
    RAISE EXCEPTION 'Reporter context prune did not remove both expired cases';
  END IF;
  IF EXISTS (SELECT 1 FROM public.complaint_submission_contexts
             WHERE client_submission_id LIKE 'ci-gateway-%'
                OR client_submission_id LIKE 'ci-schema-child_abduction_murder-%') THEN
    RAISE EXCEPTION 'Expired reporter coordinates or metadata retained';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.complaint_submission_contexts
                 WHERE client_submission_id LIKE 'ci-schema-ride_sharing_safety-%') THEN
    RAISE EXCEPTION 'Recent, still-pending reporter context pruned too soon';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_visit_sessions
             WHERE latitude IS NOT NULL OR longitude IS NOT NULL
                OR accuracy_meters IS NOT NULL OR location_updated_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Browsing-only coordinates persisted';
  END IF;
  RAISE NOTICE 'PHASE06_LOCATION_RETENTION_PASS';
END
$test$;
ROLLBACK;
