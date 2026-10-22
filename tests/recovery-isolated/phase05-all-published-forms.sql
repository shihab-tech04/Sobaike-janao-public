-- Phase 05: test-only exhaustive published legacy form contract.
-- Runs exclusively in the workflow-validated disposable loopback database.
-- Does NOT emulate or override the Public Edge request throttle. Three real
-- Edge paths, including both schema-driven forms, are separately exercised.
DO $phase05$
DECLARE
  v_form record;
  v_payload jsonb;
  v_context jsonb;
  v_submission_id text;
  v_result jsonb;
  v_retry jsonb;
  v_index integer := 0;
  v_ip_only_denied boolean := false;
BEGIN
  FOR v_form IN
    SELECT sc.id AS subcategory_id, sc.segment_id
    FROM public.subcategories sc
    JOIN public.segments s ON s.id=sc.segment_id
    JOIN public.reporting_form_schemas rfs ON rfs.scope_type='subcategory' AND rfs.scope_id=sc.id
    WHERE sc.active AND sc.config_status='published'
      AND s.active AND s.config_status='published'
      AND rfs.status='published' AND rfs.engine_mode='legacy'
    ORDER BY sc.segment_id,sc.sort_order,sc.id
  LOOP
    v_index := v_index+1;
    -- PostgREST supplies request.headers per HTTP request. Model 25 distinct
    -- TEST-NET reporters in this isolated SQL transaction, so the real IP/
    -- subject limits continue to run unchanged for each synthetic submission.
    PERFORM set_config('request.headers',jsonb_build_object(
      'x-real-ip','198.51.100.'||(v_index+10)
    )::text,true);
    v_submission_id := 'ci-alltypes-'||v_form.subcategory_id||'-'||gen_random_uuid()::text;
    v_context := jsonb_build_object(
      'latitude',23.75,'longitude',90.39,'accuracy_meters',50,
      'visitor_id','ci-alltypes-visitor-'||v_index,
      'session_id','ci-alltypes-session-'||v_index
    );
    v_payload := jsonb_build_object(
      'segment',v_form.segment_id,'subcategoryId',v_form.subcategory_id,
      'title','Synthetic contract '||v_form.subcategory_id,
      'description','This synthetic disposable SQL fixture does not represent a real incident.',
      'incidentDate',current_date::text,'frequency','one-time',
      'privacyChoice','anonymous',
      'location',jsonb_build_object(
        'division','Dhaka','district','Dhaka','upazilaOrThana','Dhanmondi'
      )
    );

    IF v_form.segment_id='harassment' THEN
      v_payload := v_payload || jsonb_build_object(
        'affectedPersonAgeGroup','unknown_not_stated',
        'allegedAbuserRelationship','unknown_not_stated','reportingFor','self'
      );
    END IF;
    IF v_form.subcategory_id='mob-justice' THEN
      v_payload := v_payload || jsonb_build_object(
        'mobJusticeDetails',jsonb_build_object(
          'trigger','unknown','outcome','unknown','ongoingStatus','unknown'
        )
      );
    END IF;
    IF v_form.subcategory_id IN ('load-shedding-outage','gas-shortage') THEN
      v_payload := v_payload || jsonb_build_object('incidentTime','12:00');
    END IF;
    IF v_form.subcategory_id='excess-electricity-bill' THEN
      v_payload := v_payload || jsonb_build_object(
        'recentBillMonth','2026-10','previousBillMonth','2026-09',
        'recentBillAmount',500,'previousBillAmount',400
      );
    END IF;

    v_result := public.submit_public_complaint_v2(v_payload,v_submission_id,v_context);
    IF coalesce(v_result->>'success','') <> 'true' OR
       coalesce(v_result->>'reportId','') !~ '^SJ-[0-9]{4}-[0-9]{6}$' THEN
      RAISE EXCEPTION 'Legacy form % rejected synthetic SQL contract: %',
        v_form.subcategory_id,v_result;
    END IF;

    v_retry := public.submit_public_complaint_v2(v_payload,v_submission_id,v_context);
    IF v_retry->>'reportId' IS DISTINCT FROM v_result->>'reportId' THEN
      RAISE EXCEPTION 'Legacy form % duplicated on idempotent SQL retry',
        v_form.subcategory_id;
    END IF;
  END LOOP;

  IF v_index <> 25 THEN
    RAISE EXCEPTION 'Expected to test 25 active legacy forms, exercised %',v_index;
  END IF;
  IF (SELECT count(*) FROM public.complaints
      WHERE client_submission_id LIKE 'ci-alltypes-%') <> 25 THEN
    RAISE EXCEPTION 'Expected exactly 25 submitted legacy reports';
  END IF;

  -- The accepted "Not now" choice permits approximate-IP browsing, never
  -- a citizen submission. Keep this denial test on a separate synthetic IP,
  -- without consuming the Edge smoke test's real request quota.
  PERFORM set_config('request.headers',
    '{"x-real-ip":"198.51.100.240"}',true);
  BEGIN
    PERFORM public.submit_public_complaint_v2(
      jsonb_build_object(
        'segment','road_transport','subcategoryId','road-accident',
        'title','IP-only synthetic denial',
        'description','An approximate browse location is not reporter GPS.',
        'location',jsonb_build_object('division','Dhaka','district','Dhaka')
      ),
      'ci-ip-only-'||gen_random_uuid()::text,
      jsonb_build_object('visitor_id','ci-ip-only','session_id','ci-ip-only',
        'country','BD','source','approximate_ip')
    );
  EXCEPTION WHEN OTHERS THEN
    IF sqlerrm NOT LIKE 'REPORTER_LOCATION_REQUIRED:%'
       AND sqlerrm NOT LIKE 'INVALID_REPORTER_COORDINATES:%' THEN
      RAISE EXCEPTION 'Unexpected IP-only rejection: %',sqlerrm;
    END IF;
    v_ip_only_denied := true;
  END;
  IF NOT v_ip_only_denied THEN
    RAISE EXCEPTION 'Approximate-IP-only reporter bypassed the mandatory GPS guard';
  END IF;
  RAISE NOTICE 'PASS: all % active legacy forms, each with one SQL row and idempotent retry',v_index;
  RAISE NOTICE 'PASS: approximate IP browsing alone is rejected for report submission';
END;
$phase05$;
