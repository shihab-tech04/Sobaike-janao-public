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

  IF (SELECT count(*) FROM public.complaints WHERE client_submission_id LIKE 'ci-schema-%') <> 2 THEN
    RAISE EXCEPTION 'Expected precisely two unique schema-driven synthetic submissions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.complaints
                 WHERE subcategory_id='child_abduction_murder'
                   AND custom_field_answers->>'childIncidentType'='abduction'
                   AND privacy_choice='anonymous'
                   AND has_supporting_info=false
                   AND evidence_types='[]'::jsonb
                   AND evidence_description IS NULL
                   AND reporter_name IS NULL AND reporter_contact IS NULL) THEN
    RAISE EXCEPTION 'Child-safety schema/hidden-field sanitization failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.complaint_parties p JOIN public.complaints c ON c.id=p.complaint_id
             WHERE c.client_submission_id LIKE 'ci-schema-child_abduction_murder-%') THEN
    RAISE EXCEPTION 'Hidden child-safety party was persisted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.complaints
                 WHERE subcategory_id='ride_sharing_safety'
                   AND custom_field_answers->>'rideSharePlatform'='pathao'
                   AND custom_field_answers->>'rideShareIncidentType'='unsafe_driving'
                   AND custom_field_answers->>'rideShareRole'='passenger') THEN
    RAISE EXCEPTION 'Ride-sharing published custom answers were not saved';
  END IF;
  -- The real isolated AAL2 Admin test deliberately withdrew the child
  -- configured-form report; the other form must stay unreviewed.
  IF (SELECT count(*) FROM public.complaints
      WHERE client_submission_id LIKE 'ci-schema-ride_sharing_safety-%'
        AND status='submitted') <> 1 THEN
    RAISE EXCEPTION 'Unmoderated ride-sharing configured report changed status';
  END IF;
  IF (SELECT count(*) FROM public.complaints
      WHERE client_submission_id LIKE 'ci-schema-child_abduction_murder-%'
        AND status='unpublished') <> 1 THEN
    RAISE EXCEPTION 'Expected one explicitly withdrawn child-safety report';
  END IF;
  IF (SELECT count(*) FROM public.admin_audit_logs a
      JOIN public.complaints c ON c.id=a.target_id
      WHERE c.client_submission_id LIKE 'ci-schema-child_abduction_murder-%'
        AND a.action='complaint.unpublish') <> 1 THEN
    RAISE EXCEPTION 'Expected one authenticated Admin withdrawal audit';
  END IF;
  IF EXISTS (SELECT 1 FROM public.complaints
      WHERE client_submission_id LIKE 'ci-schema-%' AND status='published') THEN
    RAISE EXCEPTION 'Configured-form report unexpectedly remains public';
  END IF;

  IF (SELECT count(*) FROM public.complaints c WHERE c.client_submission_id LIKE 'ci-alltypes-%') <> 25 THEN
    RAISE EXCEPTION 'Expected precisely 25 distinct legacy form submissions in the disposable database';
  END IF;
  IF (SELECT count(DISTINCT subcategory_id) FROM public.complaints
      WHERE client_submission_id LIKE 'ci-alltypes-%') <> 25 THEN
    RAISE EXCEPTION 'Every active legacy subcategory must have its own SQL report';
  END IF;
  IF EXISTS (SELECT 1 FROM public.complaints WHERE client_submission_id LIKE 'ci-alltypes-%'
             AND (status <> 'submitted' OR custom_field_answers <> '{}'::jsonb)) THEN
    RAISE EXCEPTION 'Legacy form leaked custom fields or auto-published';
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
