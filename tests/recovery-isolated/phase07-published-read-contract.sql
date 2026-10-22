-- Read-only assertions against the disposable synthetic SQL contract.
-- The hosted popularity snapshot schedule was separately checked read-only.
DO $verify$
DECLARE
  v_report_id text;
  v_before_count bigint;
  v_after_count bigint;
  v_before_timestamp timestamptz;
  v_after_timestamp timestamptz;
  v_all jsonb;
  v_home jsonb;
  v_responses jsonb;
BEGIN
  SELECT id INTO v_report_id FROM public.complaints
  WHERE client_submission_id LIKE 'ci-gateway-%' AND status='published';
  IF v_report_id IS NULL THEN
    RAISE EXCEPTION 'Phase07 synthetic published report missing';
  END IF;
  SELECT count(*),max(snapshot_at) INTO v_before_count,v_before_timestamp
  FROM public.public_category_popularity_snapshot;

  v_all := public.get_public_published_reports();
  v_home := public.get_public_home_feed(23.75,90.39,'all','all');
  v_responses := public.get_public_published_responses(v_report_id);
  IF jsonb_typeof(v_all)<>'array' OR jsonb_typeof(v_home)<>'array'
     OR jsonb_typeof(v_responses)<>'array' THEN
    RAISE EXCEPTION 'Published read RPC returned invalid JSON contract';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_all) r
                 WHERE r->>'id'=v_report_id AND r->>'postOrigin'='user') THEN
    RAISE EXCEPTION 'Provenance is missing from the real published-list RPC';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_home) r
                 WHERE r->>'id'=v_report_id AND r->>'postOrigin'='user') THEN
    RAISE EXCEPTION 'Published report missing from Home ranked feed';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_home) r
             WHERE r->>'status'<>'published'
                OR r ? 'latitude' OR r ? 'longitude'
                OR r ? 'internal_distance_km' OR r ? 'visitorLat') THEN
    RAISE EXCEPTION 'Unreviewed data or private coordinates escaped the Home RPC';
  END IF;
  IF (SELECT count(*) FROM public.get_public_category_popularity()) <> 7 THEN
    RAISE EXCEPTION 'Popularity read RPC must include seven canonical active categories';
  END IF;
  IF jsonb_array_length(v_responses)<>2
     OR (SELECT count(DISTINCT r->>'responseType') FROM jsonb_array_elements(v_responses) r)<>2 THEN
    RAISE EXCEPTION 'Both reviewed response types must be publicly visible';
  END IF;
  IF v_responses::text LIKE '%private-citizen-reply@example.test%'
     OR v_responses::text LIKE '%private-subject-reply@example.test%'
     OR v_responses::text LIKE '%correctionDetails%' THEN
    RAISE EXCEPTION 'Private response contact/correction details leaked';
  END IF;

  SELECT count(*),max(snapshot_at) INTO v_after_count,v_after_timestamp
  FROM public.public_category_popularity_snapshot;
  IF v_after_count IS DISTINCT FROM v_before_count
     OR v_after_timestamp IS DISTINCT FROM v_before_timestamp THEN
    RAISE EXCEPTION 'Public GET/RPC unexpectedly mutated delayed popularity snapshot';
  END IF;
  RAISE NOTICE 'PHASE07_PUBLISHED_READ_CONTRACT_PASS';
END
$verify$;
