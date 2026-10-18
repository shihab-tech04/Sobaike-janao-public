-- Execute after the synthetic HTTP runner against disposable local Supabase.
DO $verify$
DECLARE
  submitted_count integer;
  context_count integer;
  report_status text;
BEGIN
  SELECT count(*), min(status)
    INTO submitted_count, report_status
    FROM public.complaints
   WHERE client_submission_id LIKE 'ci-gateway-%';
  IF submitted_count <> 1 OR report_status <> 'published' THEN
    RAISE EXCEPTION 'Expected one published synthetic report after authorized moderation, found % status %',
      submitted_count, report_status;
  END IF;

  SELECT count(*) INTO context_count
    FROM public.complaint_submission_contexts
   WHERE client_submission_id LIKE 'ci-gateway-%';
  IF context_count <> 1 THEN
    RAISE EXCEPTION 'Expected one private context row for idempotent synthetic report, found %', context_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.complaint_submission_contexts
     WHERE client_submission_id LIKE 'ci-gateway-%'
       AND (reporter_latitude IS NOT NULL OR reporter_longitude IS NOT NULL
         OR accuracy_meters IS NOT NULL OR browser_name IS NOT NULL
         OR user_agent IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Moderation did not scrub reporter location/device metadata';
  END IF;

  IF (SELECT count(*) FROM public.admin_audit_logs
      WHERE action = 'complaint.publish'
        AND target_id IN (SELECT id FROM public.complaints WHERE client_submission_id LIKE 'ci-gateway-%')) <> 1 THEN
    RAISE EXCEPTION 'Expected one authentic Admin publication audit entry';
  END IF;

  IF has_table_privilege('anon', 'public.complaint_submission_contexts', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous role unexpectedly reads private reporter context';
  END IF;
  IF has_function_privilege('anon', 'public.submit_public_complaint_v2(jsonb,text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role unexpectedly bypasses the Edge submission gateway';
  END IF;
END
$verify$;

SELECT 'SYNTHETIC_PUBLIC_EDGE_SQL_PASS' AS result;
