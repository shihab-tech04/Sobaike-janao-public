-- Synthetic only: this subtype exists solely in a disposable local database.
-- It is deliberately not part of either repository's historical migrations.
INSERT INTO public.subcategories (id, segment_id, name_bn, name_en, active, sort_order, slug)
VALUES (
  'ci-road-transport', 'road_transport', 'পরীক্ষামূলক সড়ক সমস্যা',
  'Synthetic road transport report', true, 1, 'ci-road-transport'
);
