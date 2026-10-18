-- Disposable test runner only; never apply to a hosted Supabase project.
-- The UUID comes from an actual account created by local GoTrue. No fabricated
-- JWT/session rows are inserted, so the AAL2 gate is tested as deployed.
\if :{?ci_admin_user_id}
\else
  \quit 3
\endif

INSERT INTO public.permissions (id, module, action, name_en, name_bn)
VALUES
  ('complaints.view', 'complaints', 'view', 'View complaints', 'অভিযোগ দেখুন'),
  ('complaints.publish', 'complaints', 'publish', 'Publish complaints', 'অভিযোগ প্রকাশ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_users (user_id, active, is_super_admin, display_name)
VALUES (:'ci_admin_user_id'::uuid, true, true, 'Synthetic CI administrator');

-- The catalog definition comes from the checked-in notification foundation
-- migration in the Admin repository; it contains no production notifications.
INSERT INTO public.admin_notification_event_catalogue
  (event_key, category, default_layer, default_severity, description, active)
VALUES
  ('complaint.published', 'complaint', 'workflow_activity', 'info',
   'Complaint published to public feed', true);
