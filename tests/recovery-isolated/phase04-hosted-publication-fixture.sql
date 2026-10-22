-- Phase 04 isolated fixture generated from authenticated, read-only PUBLIC taxonomy metadata 2026-10-19.
-- Only public labels, taxonomy IDs, published form field definitions; no user/report rows.
-- TEST ONLY: disposable loopback database. Never apply this fixture to hosted Supabase.
BEGIN;

UPDATE public.segments SET slug='harassment',name_bn='হয়রানি ও নির্যাতন',name_en='Harassment & abuse',active=TRUE,sort_order=1,config_status='published' WHERE id='harassment';
UPDATE public.segments SET slug='load-shedding',name_bn='ইউটিলিটি সমস্যা',name_en='Utility issues',active=TRUE,sort_order=2,config_status='published' WHERE id='load_shedding';
UPDATE public.segments SET slug='extortion',name_bn='চাঁদাবাজি ও ঘুষ',name_en='Extortion & Bribery',active=TRUE,sort_order=3,config_status='published' WHERE id='extortion';
UPDATE public.segments SET slug='public-safety',name_bn='জননিরাপত্তা',name_en='Public Safety',active=TRUE,sort_order=4,config_status='published' WHERE id='public_safety';
UPDATE public.segments SET slug='road-transport',name_bn='সড়ক ও যাতায়াত সমস্যা',name_en='Road & Transport Issues',active=TRUE,sort_order=5,config_status='published' WHERE id='road_transport';
UPDATE public.segments SET slug='illegal-occupation',name_bn='অবৈধ দখল',name_en='Illegal Occupation',active=TRUE,sort_order=6,config_status='published' WHERE id='illegal_occupation';
UPDATE public.segments SET slug='rickshaw',name_bn='অবৈধ অটো-রিকশা চার্জিং স্টেশন',name_en='Illegal Auto-rickshaw Charging Station',active=TRUE,sort_order=7,config_status='published' WHERE id='rickshaw';

INSERT INTO public.subcategories (id, segment_id, slug, name_bn, name_en, active, sort_order, config_status, is_sensitive) VALUES
  ('bribe-demanded-service', 'extortion', 'bribe-demanded-service', 'ঘুষ', 'Bribery', TRUE, 1, 'published', TRUE),
  ('bribe-paid', 'extortion', 'bribe-paid', 'ঘুষ প্রদান', 'Bribe Paid', FALSE, 2, 'published', TRUE),
  ('shop-business', 'extortion', 'shop-business', 'দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদা দাবি', 'Extortion from Shops & Businesses', TRUE, 3, 'published', FALSE),
  ('transport-movement', 'extortion', 'transport-movement', 'পরিবহন বা চলাচলে চাঁদা দাবি', 'Extortion in Transport & Transit', TRUE, 4, 'published', FALSE),
  ('construction-property', 'extortion', 'construction-property', 'নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদা দাবি', 'Construction & Property Extortion', TRUE, 5, 'published', FALSE),
  ('threat-money-demand', 'extortion', 'threat-money-demand', 'হুমকি দিয়ে টাকা দাবি', 'Threats & Coercive Demands', TRUE, 6, 'published', FALSE),
  ('extortion-other', 'extortion', 'extortion-other', 'অন্যান্য চাঁদাবাজি', 'Other Extortion', TRUE, 7, 'published', FALSE),
  ('rape-sexual-violence', 'harassment', 'rape-sexual-violence', 'ধর্ষণ / ধর্ষণের চেষ্টা', 'Rape / Attempt to Rape', TRUE, 1, 'published', TRUE),
  ('sexual-harassment', 'harassment', 'sexual-harassment', 'যৌন হয়রানি', 'Sexual Harassment', TRUE, 2, 'published', FALSE),
  ('domestic-violence', 'harassment', 'domestic-violence', 'পারিবারিক সহিংসতা', 'Domestic Violence', TRUE, 3, 'published', FALSE),
  ('blackmail-coercion', 'harassment', 'blackmail-coercion', 'ব্ল্যাকমেইল / জবরদস্তি', 'Blackmailing / Coercion', TRUE, 4, 'published', TRUE),
  ('honeytrap', 'harassment', 'honeytrap', 'হানিট্র্যাপ', 'Honeytrap', TRUE, 5, 'published', FALSE),
  ('road-public-space-encroachment', 'illegal_occupation', 'road-public-space-encroachment', 'রাস্তা / ফুটপাত / ফুটওভার ব্রিজ দখল', 'Road / Footpath / Foot-over-bridge Encroachment', TRUE, 1, 'published', FALSE),
  ('private-property-occupation', 'illegal_occupation', 'private-property-occupation', 'ব্যক্তিগত জমি/সম্পত্তি অবৈধ দখল', 'Illegal Occupation of Private Land / Property', TRUE, 2, 'published', TRUE),
  ('government-property-occupation', 'illegal_occupation', 'government-property-occupation', 'সরকারি জমি/সম্পত্তি অবৈধ দখল', 'Illegal Occupation of Government Land / Property', TRUE, 3, 'published', TRUE),
  ('load-shedding-outage', 'load_shedding', 'load-shedding-outage', 'লোডশেডিং', 'Load Shedding', TRUE, 1, 'published', FALSE),
  ('gas-shortage', 'load_shedding', 'gas-shortage', 'গ্যাস সংকট', 'Gas Shortage', TRUE, 2, 'published', FALSE),
  ('excess-electricity-bill', 'load_shedding', 'excess-electricity-bill', 'অতিরিক্ত বিদ্যুৎ বিল', 'Excess Electricity Bill', TRUE, 3, 'published', FALSE),
  ('theft', 'public_safety', 'theft', 'চুরি', 'Theft', TRUE, 1, 'published', TRUE),
  ('robbery', 'public_safety', 'robbery', 'ডাকাতি', 'Robbery / Dacoity', TRUE, 2, 'published', TRUE),
  ('snatching', 'public_safety', 'snatching', 'ছিনতাই', 'Snatching', TRUE, 3, 'published', TRUE),
  ('mob-justice', 'public_safety', 'mob-justice', 'গণপিটুনি / মব সহিংসতা', 'Mob Justice / Mob Violence', TRUE, 4, 'published', TRUE),
  ('child_abduction_murder', 'public_safety', 'child-abduction-murder', 'শিশু অপহরণ / হত্যা', 'Child Abduction / Murder', TRUE, 5, 'published', TRUE),
  ('ride_sharing_safety', 'public_safety', 'ride-sharing-safety', 'রাইড-শেয়ারিং নিরাপত্তা', 'Ride-sharing Safety', TRUE, 6, 'published', TRUE),
  ('charging-station-location', 'rickshaw', 'charging-station-location', 'অবৈধ অটো-রিকশা চার্জিং স্টেশন', 'Illegal Auto-rickshaw Charging Station', TRUE, 1, 'published', FALSE),
  ('road-repair-delay', 'road_transport', 'road-repair-delay', 'রাস্তা মেরামতে বিলম্ব', 'Road Repair Delay', TRUE, 1, 'published', FALSE),
  ('road-accident', 'road_transport', 'road-accident', 'সড়ক দুর্ঘটনা', 'Road Accident', TRUE, 2, 'published', TRUE),
  ('road-block', 'road_transport', 'road-block', 'সড়ক অবরোধ', 'Road Block / Obstruction', TRUE, 3, 'published', FALSE);

INSERT INTO public.reporting_form_schemas (id, scope_type, scope_id, version, status, engine_mode) VALUES
  ('c0647df1-fe0b-4195-af1b-a97e4fbb9112', 'subcategory', 'blackmail-coercion', 1, 'published', 'legacy'),
  ('22674066-d2aa-4b0e-bcf5-1781c3af9432', 'subcategory', 'bribe-demanded-service', 1, 'published', 'legacy'),
  ('e6374d6e-7220-4460-adcb-107781298a6c', 'subcategory', 'bribe-paid', 1, 'published', 'legacy'),
  ('063d5ec4-3f06-47ef-8d5c-bc7a288b1ca7', 'subcategory', 'charging-station-location', 1, 'published', 'legacy'),
  ('421ac4b1-18de-4707-8ed8-7d354f6cb2ee', 'subcategory', 'child_abduction_murder', 2, 'published', 'schema'),
  ('1878fa8b-6a07-4b15-b07e-c61f802f1758', 'subcategory', 'construction-property', 1, 'published', 'legacy'),
  ('d1430b4f-b4ae-41c3-8627-b57bd0877c17', 'subcategory', 'domestic-violence', 1, 'published', 'legacy'),
  ('e4c29ca2-46cc-4d6e-903d-0e6e1d14655e', 'subcategory', 'excess-electricity-bill', 1, 'published', 'legacy'),
  ('9f365981-4903-4c79-8ea6-78c006aa986b', 'subcategory', 'extortion-other', 1, 'published', 'legacy'),
  ('7cce2b7b-7e3f-4974-b1b6-9553137108d5', 'subcategory', 'gas-shortage', 1, 'published', 'legacy'),
  ('d82e13b1-979a-4d09-8185-37ad5ef45ca7', 'subcategory', 'government-property-occupation', 1, 'published', 'legacy'),
  ('b9e33fc7-fc02-446a-bfb1-5255c7f4fedf', 'subcategory', 'honeytrap', 1, 'published', 'legacy'),
  ('8db5ae21-a08d-4f58-ad51-9e5d4cdd7c19', 'subcategory', 'load-shedding-outage', 1, 'published', 'legacy'),
  ('8d523099-e98f-4e70-a1a1-0fb2ef19c6d8', 'subcategory', 'mob-justice', 1, 'published', 'legacy'),
  ('f9b68fff-d3e4-4de7-9ed8-6f7c5604937c', 'subcategory', 'private-property-occupation', 1, 'published', 'legacy'),
  ('de712daf-8e40-4498-9fa1-6b48a7d6fa91', 'subcategory', 'rape-sexual-violence', 1, 'published', 'legacy'),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'subcategory', 'ride_sharing_safety', 2, 'published', 'schema'),
  ('9af3b99b-dc09-4a71-a602-b4982ebf0d61', 'subcategory', 'road-accident', 1, 'published', 'legacy'),
  ('b41f394e-dba5-4741-87f0-abd0a2305e80', 'subcategory', 'road-block', 1, 'published', 'legacy'),
  ('fbbcbde5-145d-4c3f-9965-a5db9259a060', 'subcategory', 'road-public-space-encroachment', 1, 'published', 'legacy'),
  ('94087441-a73a-4fff-8ae0-7c79df6ac023', 'subcategory', 'road-repair-delay', 1, 'published', 'legacy'),
  ('09106453-fac0-42cd-b6d6-761629c46690', 'subcategory', 'robbery', 1, 'published', 'legacy'),
  ('ef70caf4-a43b-4e19-8b65-e45387473812', 'subcategory', 'sexual-harassment', 1, 'published', 'legacy'),
  ('3650001d-d34c-4e42-a48b-e9c40b8c8e13', 'subcategory', 'shop-business', 1, 'published', 'legacy'),
  ('987f7233-185b-4756-bf8d-aba1eec2c64e', 'subcategory', 'snatching', 1, 'published', 'legacy'),
  ('a56ef2b2-75ae-4533-a036-90a2a10ea485', 'subcategory', 'theft', 1, 'published', 'legacy'),
  ('0616b179-db99-4577-895f-339ef6c566f1', 'subcategory', 'threat-money-demand', 1, 'published', 'legacy'),
  ('0cd2080e-2f9a-4798-ad91-f878356fbe83', 'subcategory', 'transport-movement', 1, 'published', 'legacy');

INSERT INTO public.reporting_form_schema_fields (schema_id, field_key, field_type, storage_mode, storage_key, label_en, label_bn, required, active, sort_order, options, validation, config) VALUES
  ('421ac4b1-18de-4707-8ed8-7d354f6cb2ee', 'title', 'text', 'core_column', 'title', 'Report title', 'প্রতিবেদনের শিরোনাম', TRUE, TRUE, 10, '[]'::jsonb, '{"maxLength":100}'::jsonb, '{"locked":true}'::jsonb),
  ('421ac4b1-18de-4707-8ed8-7d354f6cb2ee', 'description', 'textarea', 'core_column', 'description', 'What happened?', 'কি ঘটেছে?', TRUE, TRUE, 20, '[]'::jsonb, '{"maxLength":2000}'::jsonb, '{"locked":true}'::jsonb),
  ('421ac4b1-18de-4707-8ed8-7d354f6cb2ee', 'child_incident_type', 'select', 'custom_json', 'childIncidentType', 'Incident type', 'ঘটনার ধরন', TRUE, TRUE, 30, '[{"value":"abduction","labelBn":"শিশু অপহরণ","labelEn":"Child abduction"},{"value":"murder","labelBn":"শিশু হত্যা","labelEn":"Murder of a child"},{"value":"abduction_and_murder","labelBn":"অপহরণের পর হত্যা","labelEn":"Abduction followed by murder"},{"value":"unknown_not_stated","labelBn":"নিশ্চিত নয় / উল্লেখ নেই","labelEn":"Not clear / not stated"}]'::jsonb, '{}'::jsonb, '{"publicVisible":true}'::jsonb),
  ('421ac4b1-18de-4707-8ed8-7d354f6cb2ee', 'incident_date', 'date', 'core_column', 'incidentDate', 'Incident date', 'ঘটনার তারিখ', TRUE, TRUE, 40, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('421ac4b1-18de-4707-8ed8-7d354f6cb2ee', 'location', 'location', 'system_block', 'location', 'Incident location', 'ঘটনার স্থান', TRUE, TRUE, 50, '[]'::jsonb, '{}'::jsonb, '{"block":"location"}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'title', 'text', 'core_column', 'title', 'Report title', 'প্রতিবেদনের শিরোনাম', TRUE, TRUE, 10, '[]'::jsonb, '{"maxLength":100}'::jsonb, '{"locked":true}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'description', 'textarea', 'core_column', 'description', 'What happened?', 'কি ঘটেছে?', TRUE, TRUE, 20, '[]'::jsonb, '{"maxLength":2000}'::jsonb, '{"locked":true}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'rideshare_platform', 'select', 'custom_json', 'rideSharePlatform', 'Ride-sharing service', 'রাইড-শেয়ারিং সেবা', TRUE, TRUE, 30, '[{"value":"uber","labelBn":"Uber","labelEn":"Uber"},{"value":"pathao","labelBn":"Pathao","labelEn":"Pathao"},{"value":"obhai","labelBn":"Obhai","labelEn":"Obhai"},{"value":"other","labelBn":"অন্যান্য","labelEn":"Other"},{"value":"unknown_not_stated","labelBn":"জানা নেই / উল্লেখ নেই","labelEn":"Unknown / not stated"}]'::jsonb, '{}'::jsonb, '{"publicVisible":true}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'rideshare_incident_type', 'select', 'custom_json', 'rideShareIncidentType', 'Incident type', 'ঘটনার ধরন', TRUE, TRUE, 40, '[{"value":"harassment","labelBn":"হয়রানি / অশালীন আচরণ","labelEn":"Harassment / inappropriate behavior"},{"value":"sexual_harassment","labelBn":"যৌন হয়রানি","labelEn":"Sexual harassment"},{"value":"threat_assault","labelBn":"হুমকি / আক্রমণ","labelEn":"Threat / assault"},{"value":"theft_robbery","labelBn":"চুরি / ডাকাতি / ছিনতাই","labelEn":"Theft / robbery / snatching"},{"value":"unsafe_driving","labelBn":"ঝুঁকিপূর্ণ / বেপরোয়া চালনা","labelEn":"Unsafe / reckless driving"},{"value":"route_deviation","labelBn":"ভুল পথে নেওয়া / অনির্ধারিত স্থানে নেওয়া","labelEn":"Route deviation / taken to an unintended place"},{"value":"driver_vehicle_mismatch","labelBn":"চালক / যানবাহনের তথ্যের অমিল","labelEn":"Driver / vehicle mismatch"},{"value":"forced_payment","labelBn":"জোরপূর্বক টাকা / ভাড়া আদায়","labelEn":"Forced payment / coercive fare demand"},{"value":"other_safety_incident","labelBn":"অন্যান্য নিরাপত্তাজনিত ঘটনা","labelEn":"Other safety incident"},{"value":"unknown_not_stated","labelBn":"জানা নেই / উল্লেখ নেই","labelEn":"Unknown / not stated"}]'::jsonb, '{}'::jsonb, '{"publicVisible":true}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'rideshare_role', 'select', 'custom_json', 'rideShareRole', 'Your role in the ride', 'রাইডে আপনার ভূমিকা', TRUE, TRUE, 50, '[{"value":"passenger","labelBn":"যাত্রী","labelEn":"Passenger"},{"value":"driver","labelBn":"চালক","labelEn":"Driver"},{"value":"witness_other","labelBn":"প্রত্যক্ষদর্শী / অন্যান্য","labelEn":"Witness / other"},{"value":"unknown_not_stated","labelBn":"জানা নেই / উল্লেখ নেই","labelEn":"Unknown / not stated"}]'::jsonb, '{}'::jsonb, '{"publicVisible":true}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'rideshare_vehicle_type', 'select', 'custom_json', 'rideShareVehicleType', 'Vehicle type', 'যানবাহনের ধরন', FALSE, TRUE, 60, '[{"value":"car","labelBn":"গাড়ি","labelEn":"Car"},{"value":"motorcycle","labelBn":"মোটরসাইকেল","labelEn":"Motorcycle"},{"value":"cng_auto_rickshaw","labelBn":"সিএনজি / অটোরিকশা","labelEn":"CNG / auto-rickshaw"},{"value":"other","labelBn":"অন্যান্য","labelEn":"Other"},{"value":"unknown_not_stated","labelBn":"জানা নেই / উল্লেখ নেই","labelEn":"Unknown / not stated"}]'::jsonb, '{}'::jsonb, '{"publicVisible":true}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'incident_date', 'date', 'core_column', 'incidentDate', 'Incident date', 'ঘটনার তারিখ', TRUE, TRUE, 70, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'incident_time', 'time', 'core_column', 'incidentTime', 'Incident time', 'ঘটনার সময়', FALSE, TRUE, 80, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'frequency', 'radio', 'core_column', 'frequency', 'Frequency', 'পুনরাবৃত্তি', TRUE, TRUE, 90, '[{"value":"one-time","labelBn":"এককালীন","labelEn":"One-time"},{"value":"repeated","labelBn":"একাধিকবার","labelEn":"Repeated"}]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'location', 'location', 'system_block', 'location', 'Location', 'লোকেশন', TRUE, TRUE, 100, '[]'::jsonb, '{}'::jsonb, '{"block":"location"}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'subject_party', 'subject_party', 'system_block', 'subjectParty', 'Related person / organization', 'সংশ্লিষ্ট ব্যক্তি / প্রতিষ্ঠান', FALSE, TRUE, 110, '[]'::jsonb, '{}'::jsonb, '{"block":"subject_party"}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'rideshare_vehicle_registration', 'text', 'custom_json', 'rideShareVehicleRegistration', 'Vehicle registration number', 'যানবাহনের রেজিস্ট্রেশন নম্বর', FALSE, TRUE, 115, '[]'::jsonb, '{"maxLength":50}'::jsonb, '{"section":"related_party","publicVisible":false}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'rideshare_trip_id', 'text', 'custom_json', 'rideShareTripId', 'Ride / trip ID', 'রাইড / ট্রিপ আইডি', FALSE, TRUE, 120, '[]'::jsonb, '{"maxLength":100}'::jsonb, '{"section":"related_party","publicVisible":false}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'evidence', 'evidence', 'system_block', 'evidence', 'Supporting information', 'সহায়ক তথ্য', FALSE, TRUE, 900, '[]'::jsonb, '{}'::jsonb, '{"block":"evidence"}'::jsonb),
  ('94422e6f-e2b4-4a58-8b37-a647bcd10572', 'privacy', 'privacy', 'system_block', 'privacy', 'Privacy', 'গোপনীয়তা', FALSE, FALSE, 910, '[]'::jsonb, '{}'::jsonb, '{"block":"privacy"}'::jsonb);

DO $phase04$
DECLARE
 v_config jsonb;
 v_order text;
BEGIN
 SELECT string_agg(id, ',' ORDER BY sort_order) INTO v_order FROM public.segments WHERE active AND config_status='published';
 IF v_order <> 'harassment,load_shedding,extortion,public_safety,road_transport,illegal_occupation,rickshaw' THEN
   RAISE EXCEPTION 'Phase 04 category order mismatch: %', v_order;
 END IF;
 SELECT public.get_public_reporting_configuration() INTO v_config;
 IF jsonb_array_length(v_config->'segments') <> 7 OR jsonb_array_length(v_config->'subcategories') <> 27 OR jsonb_array_length(v_config->'forms') <> 27 THEN
   RAISE EXCEPTION 'Phase 04 public RPC count mismatch: %, %, %', jsonb_array_length(v_config->'segments'), jsonb_array_length(v_config->'subcategories'), jsonb_array_length(v_config->'forms');
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_config->'forms') v WHERE v->>'subcategoryId'='bribe-paid') THEN
   RAISE EXCEPTION 'Disabled bribe-paid form leaked into Public RPC';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_config->'forms') v WHERE v->>'subcategoryId'='ride_sharing_safety' AND v->>'engineMode'='schema') THEN
   RAISE EXCEPTION 'Ride-sharing schema absent';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_config->'forms') v WHERE v->>'subcategoryId'='child_abduction_murder' AND v->>'engineMode'='schema') THEN
   RAISE EXCEPTION 'Child-safety schema absent';
 END IF;
END $phase04$;
COMMIT;

