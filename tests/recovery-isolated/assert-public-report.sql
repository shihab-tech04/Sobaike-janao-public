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
  IF submitted_count <> 1 OR report_status <> 'submitted' THEN
    RAISE EXCEPTION 'Expected one pending synthetic report after duplicate request, found % status %',
      submitted_count, report_status;
  END IF;

  SELECT count(*) INTO context_count
    FROM public.complaint_submission_contexts
   WHERE client_submission_id LIKE 'ci-gateway-%';
  IF context_count <> 1 THEN
    RAISE EXCEPTION 'Expected one private context row for idempotent synthetic report, found %', context_count;
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
