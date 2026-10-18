-- Phase 04: read-only production registry parity fixture.
-- Safe for hosted inspection: no DDL, DML, auth impersonation, or real submissions.
WITH config AS (
  SELECT public.get_public_reporting_configuration() AS data
),
public_segments AS (
  SELECT segment
  FROM config, jsonb_array_elements(config.data->'segments') AS segment
),
public_subcategories AS (
  SELECT subcategory
  FROM config, jsonb_array_elements(config.data->'subcategories') AS subcategory
),
public_forms AS (
  SELECT form
  FROM config, jsonb_array_elements(config.data->'forms') AS form
),
news_segments AS (
  SELECT s.id
  FROM public.segments s
  WHERE s.active = true AND s.config_status = 'published'
),
news_subcategories AS (
  SELECT sc.id
  FROM public.subcategories sc
  JOIN public.segments s ON s.id = sc.segment_id
  WHERE sc.active = true AND sc.config_status = 'published'
    AND s.active = true AND s.config_status = 'published'
)
SELECT
  (SELECT count(*) FROM public_segments) AS public_category_count,
  (SELECT count(*) FROM public_subcategories) AS public_subcategory_count,
  (SELECT count(*) FROM public_forms) AS published_form_count,
  (SELECT count(*) FROM news_segments) AS news_intake_category_count,
  (SELECT count(*) FROM news_subcategories) AS news_intake_subcategory_count,
  (SELECT count(*) FROM public.subcategories WHERE active = false AND id = 'bribe-paid') AS disabled_bribe_paid_count,
  (SELECT count(*) FROM public_forms WHERE form->>'subcategoryId' = 'bribe-paid') AS disabled_bribe_paid_form_leaks,
  (SELECT count(*) FROM public_forms WHERE form->>'engineMode' = 'schema') AS schema_form_count,
  (SELECT count(*) FROM public_segments
    WHERE coalesce(segment->>'nameEn','') = '' OR coalesce(segment->>'nameBn','') = '') AS missing_category_translations,
  (SELECT count(*) FROM public_subcategories
    WHERE coalesce(subcategory->>'nameEn','') = '' OR coalesce(subcategory->>'nameBn','') = '') AS missing_subcategory_translations,
  (SELECT count(*) FROM public_subcategories ps
    WHERE NOT EXISTS (SELECT 1 FROM news_subcategories ns WHERE ns.id=ps.subcategory->>'id')) AS public_news_intake_subcategory_gaps,
  (SELECT count(*) FROM public_forms f
    WHERE NOT EXISTS (SELECT 1 FROM public_subcategories ps WHERE ps.subcategory->>'id'=f.form->>'subcategoryId')) AS orphan_public_forms,
  (SELECT string_agg(segment->>'id', ',' ORDER BY (segment->>'sortOrder')::int) FROM public_segments) AS canonical_order,
  (SELECT count(*) FROM public_subcategories
    WHERE subcategory->>'id' IN ('ride_sharing_safety', 'child_abduction_murder', 'rape-sexual-violence')) AS safety_taxonomy_count;
