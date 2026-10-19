-- Phase 06: the browser must never write directly to complaint-evidence.
-- Its former anonymous INSERT policy validated path/extension, not file bytes,
-- permitting requests that bypass public-evidence-upload's WebP sanitizer.
--
-- Anonymous clients still submit images through the rate-limited Edge function.
-- That function uploads validated, metadata-stripped bytes as service_role,
-- which bypasses Storage RLS. Preserve the distinct authenticated active-admin
-- INSERT policy and the published-only anonymous SELECT policy unchanged.
DROP POLICY IF EXISTS "public complaint evidence upload" ON storage.objects;
