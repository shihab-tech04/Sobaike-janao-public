import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// Fail closed unless *both* SQL and GoTrue are the disposable local instance.
const api = process.env.RECOVERY_LOCAL_API_URL;
const db = process.env.RECOVERY_LOCAL_DB_URL;
const anonKey = process.env.RECOVERY_LOCAL_ANON_KEY;
const serviceKey = process.env.RECOVERY_LOCAL_SERVICE_ROLE_KEY;
const reportId = process.env.RECOVERY_SYNTHETIC_REPORT_ID;
assert.equal(new URL(api).hostname, '127.0.0.1');
assert.equal(new URL(api).port, '54321');
assert.equal(new URL(db).hostname, '127.0.0.1');
assert.equal(new URL(db).port, '54322');
assert.ok(anonKey && serviceKey && anonKey !== serviceKey, 'distinct disposable keys required');
assert.match(reportId, /^SJ-[0-9]{4}-[0-9]{6}$/);

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const visitor = createClient(api, anonKey, options);
const adminAuth = createClient(api, anonKey, options);
const localService = createClient(api, serviceKey, options);

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let value = 0;
  let bits = 0;
  const bytes = [];
  for (const char of input.toUpperCase().replaceAll(/[^A-Z2-7]/g, '')) {
    const digit = alphabet.indexOf(char);
    assert.ok(digit >= 0, 'invalid local TOTP secret');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totp(secret, timestamp = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30_000)));
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest.at(-1) & 0x0f;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

function unwrap(result, label) {
  assert.equal(result.error, null, `${label}: ${result.error?.message}`);
  return result.data;
}

function assertNotPresent(items, label) {
  assert.ok(Array.isArray(items), `${label} must be an array`);
  assert.equal(items.some((row) => row.id === reportId), false, `${label} leaked unmoderated report`);
}

const beforeFeed = unwrap(await visitor.rpc('get_public_home_feed'), 'pre-publication feed');
assertNotPresent(beforeFeed, 'public feed');
assert.equal(unwrap(await visitor.rpc('get_public_published_report', { p_report_id: reportId }),
  'pre-publication public report'), null);
const deniedAnon = await visitor.rpc('admin_publish_complaint', { p_complaint_id: reportId });
assert.ok(deniedAnon.error, 'anonymous users must not invoke Admin publication');

// Create a genuine local Auth session. We neither forge a JWT nor insert an
// auth.sessions row. The service key is restricted to the 127.0.0.1 API above.
const email = `recovery-admin-${randomUUID()}@example.test`;
const password = randomBytes(24).toString('hex');
const authUser = unwrap(await localService.auth.admin.createUser({
  email, password, email_confirm: true,
}), 'create local synthetic Auth user').user;
assert.match(authUser.id, /^[0-9a-f-]{36}$/i);
unwrap(await adminAuth.auth.signInWithPassword({ email, password }), 'local password login');

const noRole = unwrap(await adminAuth.from('complaints').select('id,status').eq('id', reportId),
  'non-admin complaint query');
assert.equal(noRole.length, 0, 'authenticated non-admin must not read submitted report');
assert.ok((await adminAuth.rpc('admin_publish_complaint', { p_complaint_id: reportId })).error,
  'authenticated non-admin must not publish');

execFileSync('psql', [db, '--set', 'ON_ERROR_STOP=1',
  '--set', `ci_admin_user_id=${authUser.id}`,
  '--file', 'tests/recovery-isolated/seed-synthetic-admin.sql'], { stdio: 'pipe' });

const pendingForAdmin = unwrap(await adminAuth.from('complaints').select('id,status').eq('id', reportId),
  'real-session Admin complaint query');
assert.equal(pendingForAdmin.length, 1, 'Admin read gate must reveal pending report');
assert.equal(pendingForAdmin[0].status, 'submitted');
assert.equal(unwrap(await adminAuth.rpc('has_permission', { p_permission_id: 'complaints.publish' }),
  'AAL1 sensitive permission'), false);
assert.equal(unwrap(await adminAuth.rpc('has_permission', { p_permission_id: 'responses.publish' }),
  'AAL1 response moderation permission'), false);
assert.ok((await adminAuth.rpc('admin_publish_complaint', { p_complaint_id: reportId })).error,
  'even super admin cannot publish with an AAL1 session');
assert.ok((await adminAuth.rpc('admin_publish_response', { p_response_id: 'ci-invalid-response' })).error,
  'AAL1 administrator cannot moderate public responses');
assert.equal(unwrap(await adminAuth.rpc('has_permission', { p_permission_id: 'categories.manage' }),
  'AAL1 taxonomy permission'), false);
assert.ok((await adminAuth.rpc('admin_create_taxonomy_item', {
  p_item_type: 'subcategory', p_item_id: 'ci_phase04_taxonomy',
  p_parent_segment_id: 'road_transport', p_name_en: 'Test draft', p_name_bn: 'পরীক্ষামূলক খসড়া', p_sort_order: 99,
})).error, 'AAL1 administrator cannot create taxonomy items');
console.log('PASS: anon/non-admin deny; real Admin AAL1 can read but cannot publish');

const enrollment = unwrap(await adminAuth.auth.mfa.enroll({ factorType: 'totp' }),
  'enroll local TOTP factor');
assert.ok(enrollment.totp?.secret, 'local Auth must return a TOTP secret');
unwrap(await adminAuth.auth.mfa.challengeAndVerify({
  factorId: enrollment.id, code: totp(enrollment.totp.secret),
}), 'verify local TOTP factor');
const assurance = unwrap(await adminAuth.auth.mfa.getAuthenticatorAssuranceLevel(), 'AAL2 assurance');
assert.equal(assurance.currentLevel, 'aal2', 'MFA must actually upgrade the session');
assert.equal(unwrap(await adminAuth.rpc('has_permission', { p_permission_id: 'complaints.publish' }),
  'AAL2 sensitive permission'), true, 'authorized real AAL2 session expected');
assert.equal(unwrap(await adminAuth.rpc('has_permission', { p_permission_id: 'categories.manage' }),
  'AAL2 taxonomy permission'), true, 'AAL2 grants the seeded taxonomy permission');

const result = unwrap(await adminAuth.rpc('admin_publish_complaint', { p_complaint_id: reportId }),
  'Admin publish SQL RPC');
assert.equal(result.success, true);
assert.equal(result.status, 'published');
const afterFeed = unwrap(await visitor.rpc('get_public_home_feed'), 'post-publication feed');
assert.equal(afterFeed.filter((row) => row.id === reportId).length, 1,
  'published report should appear exactly once in public feed');
const publicReport = unwrap(await visitor.rpc('get_public_published_report', { p_report_id: reportId }),
  'published report detail');
assert.equal(publicReport.id, reportId);
const sensitive = JSON.stringify({ publicReport, afterFeed });
for (const privateKey of ['ci-visitor-0001', 'ci-session-0001', 'reporter_contact', 'reporter_latitude',
  'accuracy_meters', 'user_agent']) {
  assert.equal(sensitive.includes(privateKey), false, `public RPC exposed private field: ${privateKey}`);
}
console.log('PASS: actual TOTP AAL2 Admin publication becomes public, without reporter context');

// Phase 07: both forms of response use the real rate-limited Edge gateway,
// remain private until moderated, and expose only sanctioned public fields.
assert.ok((await visitor.rpc('submit_public_response_v2', {
  p_report_id: reportId, p_response_type: 'citizen_information',
  p_payload: { description: 'Direct RPC bypass must fail' },
  p_visitor_id: randomUUID(), p_session_id: randomUUID(),
})).error, 'anonymous visitors cannot bypass the Edge response rate limiter');

const submitViaEdge = async (responseType, payload) => {
  const res = await fetch(`${api}/functions/v1/public-write-gateway`, {
    method: 'POST',
    headers: {
      apikey: anonKey, Authorization: `Bearer ${anonKey}`,
      Origin: 'http://localhost:5173', 'x-real-ip': '192.0.2.45',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action: 'response', reportId, responseType, payload,
      visitorId: randomUUID(), sessionId: randomUUID(),
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const json = await res.json();
  assert.equal(res.status, 200, `synthetic ${responseType} Edge: ${JSON.stringify(json)}`);
  assert.equal(json.success, true, `synthetic ${responseType} Edge accepted`);
  assert.equal(json.result?.status, 'pending_review');
  assert.match(json.result?.responseId, /^SR-[0-9]{4}-[0-9]{6}$/);
  return json.result.responseId;
};

const citizenResponseId = await submitViaEdge('citizen_information', {
  description: 'Synthetic additional witness information for this test-only published report.',
  contactConsent: true, contactInfo: 'private-citizen-reply@example.test',
});
const subjectResponseId = await submitViaEdge('subject_response', {
  responderType: 'organization_rep',
  responderName: 'Synthetic Organization Representative',
  organizationName: 'Test-only Organization',
  contactEmailOrPhone: 'private-subject-reply@example.test',
  officialStatement: 'Synthetic clarification that disputes the allegation without claiming a verified verdict.',
  requestCorrectionOrRemoval: true,
  correctionDetails: 'Request correction after independent administrative review.',
});
const pendingResponses = unwrap(await visitor.rpc('get_public_published_responses', { p_report_id: reportId }),
  'unmoderated responses public read');
assert.deepEqual(pendingResponses, [], 'witness and correction request must not auto-publish');
assert.equal(unwrap(await adminAuth.rpc('has_permission', { p_permission_id: 'responses.publish' }),
  'AAL2 response permission'), true);
assert.ok((await visitor.rpc('admin_publish_response', { p_response_id: citizenResponseId })).error,
  'anonymous users may not approve citizen responses');

for (const responseId of [citizenResponseId, subjectResponseId]) {
  const published = unwrap(await adminAuth.rpc('admin_publish_response', { p_response_id: responseId }),
    'AAL2 response moderation');
  assert.equal(published.status, 'published');
}
const publishedResponses = unwrap(await visitor.rpc('get_public_published_responses', { p_report_id: reportId }),
  'published-only responses');
assert.equal(publishedResponses.length, 2, 'both approved response types visible exactly once');
assert.ok(publishedResponses.some((entry) => entry.id === citizenResponseId && entry.responseType === 'citizen_information'));
assert.ok(publishedResponses.some((entry) => entry.id === subjectResponseId && entry.responseType === 'subject_response'));
const publicResponseJson = JSON.stringify(publishedResponses);
for (const forbidden of ['private-citizen-reply@example.test', 'private-subject-reply@example.test',
  'contactEmailOrPhone', 'correctionDetails', 'contactInfo']) {
  assert.equal(publicResponseJson.includes(forbidden), false, `public response leaked ${forbidden}`);
}
console.log('PHASE07_RESPONSE_MODERATION_AND_CORRECTION_PASS');

// Phase 04: exercise the actual Admin create/edit/move RPCs through a real
// AAL2 session. These records exist only in the disposable local fixture.
const publishedBefore = unwrap(await visitor.rpc('get_public_reporting_configuration'), 'taxonomy before mutations');
assert.equal(publishedBefore.forms.length, 27);
assert.ok((await visitor.rpc('admin_create_taxonomy_item', {
  p_item_type: 'subcategory', p_item_id: 'ci_phase04_taxonomy',
  p_parent_segment_id: 'road_transport', p_name_en: 'Test draft', p_name_bn: 'পরীক্ষামূলক খসড়া', p_sort_order: 99,
})).error, 'anonymous taxonomy create must be denied');

const created = unwrap(await adminAuth.rpc('admin_create_taxonomy_item', {
  p_item_type: 'subcategory', p_item_id: 'ci_phase04_taxonomy',
  p_parent_segment_id: 'road_transport', p_name_en: 'Test draft', p_name_bn: 'পরীক্ষামূলক খসড়া', p_sort_order: 99,
}), 'create inactive taxonomy draft');
assert.equal(created.success, true);
assert.equal(created.item.active, false);
assert.equal(created.item.config_status, 'draft');
const form = unwrap(await adminAuth.rpc('admin_get_reporting_form', {
  p_subcategory_id: 'ci_phase04_taxonomy',
}), 'authorized Admin draft form read');
assert.equal(form.schema?.status, 'draft');
assert.equal(form.schema?.engineMode, 'schema');
assert.ok((await adminAuth.rpc('admin_update_taxonomy_item', {
  p_item_type: 'subcategory', p_item_id: 'ci_phase04_taxonomy',
  p_name_en: 'Test draft', p_name_bn: 'পরীক্ষামূলক খসড়া', p_active: true, p_sort_order: 99,
})).error, 'unpublished taxonomy draft cannot be activated');

const renamed = unwrap(await adminAuth.rpc('admin_update_taxonomy_item', {
  p_item_type: 'subcategory', p_item_id: 'ci_phase04_taxonomy',
  p_name_en: 'Renamed synthetic draft', p_name_bn: 'নতুন পরীক্ষামূলক খসড়া', p_active: false, p_sort_order: 98,
}), 'rename and reorder inactive draft');
assert.equal(renamed.item.name_en, 'Renamed synthetic draft');
assert.equal(renamed.item.sort_order, 98);
const draftMove = unwrap(await adminAuth.rpc('admin_move_subcategory', {
  p_subcategory_id: 'ci_phase04_taxonomy', p_target_segment_id: 'public_safety', p_sort_order: 97,
}), 'move draft category');
assert.equal(draftMove.moved, true);
assert.equal(draftMove.configStatus, 'draft');

// This report already exists and is published; moving its former subcategory
// must preserve that historical report while disabling new submissions.
const publishedMove = unwrap(await adminAuth.rpc('admin_move_subcategory', {
  p_subcategory_id: 'road-accident', p_target_segment_id: 'public_safety', p_sort_order: 90,
}), 'move active category with historical report');
assert.equal(publishedMove.success, true);
assert.equal(publishedMove.moved, true);
assert.ok(publishedMove.historicalReportCount >= 1);
assert.equal(publishedMove.configStatus, 'ready');
const taxonomyAfter = unwrap(await visitor.rpc('get_public_reporting_configuration'), 'taxonomy after draft and move');
assert.equal(taxonomyAfter.forms.length, 26, 'moved active form must disappear until republished');
assert.equal(taxonomyAfter.subcategories.some((s) => s.id === 'road-accident'), false);
assert.equal(taxonomyAfter.forms.some((f) => f.subcategoryId === 'ci_phase04_taxonomy'), false);
assert.ok(unwrap(await visitor.rpc('get_public_published_report', { p_report_id: reportId }),
  'published report must survive taxonomy move'), 'historical published report was lost');
console.log('PASS: AAL2 Admin draft/rename/reorder/move and public active-only propagation with historical preservation');
// Phase 17: The submitted report came through the *real localhost Public
// Edge gateway*. Withdraw it with the genuine AAL2 Admin RPC, then prove all
// three anonymous discovery APIs and approved responses cease exposing it.
assert.ok((await visitor.rpc('admin_unpublish_complaint', {
  p_complaint_id: reportId, p_reason: 'Synthetic isolated rollback',
})).error, 'anonymous visitors cannot withdraw published complaints');
assert.equal(unwrap(await adminAuth.rpc('has_permission', {
  p_permission_id: 'complaints.unpublish',
}), 'AAL2 withdrawal permission'), true);
const withdrawn = unwrap(await adminAuth.rpc('admin_unpublish_complaint', {
  p_complaint_id: reportId, p_reason: 'Synthetic isolated rollback',
}), 'authorized synthetic withdrawal');
assert.equal(withdrawn.success, true);
assert.equal(withdrawn.status, 'unpublished');
assert.equal(withdrawn.previous_status, 'published');

const withdrawnSql = unwrap(await adminAuth.from('complaints').select('id,status').eq('id', reportId),
  'Admin confirmation of withdrawn report');
assert.equal(withdrawnSql.length, 1);
assert.equal(withdrawnSql[0].status, 'unpublished');
for (const rpc of ['get_public_home_feed', 'get_public_published_reports']) {
  const items = unwrap(await visitor.rpc(rpc), `${rpc} after withdrawal`);
  assertNotPresent(items, `${rpc} after withdrawal`);
}
assert.equal(unwrap(await visitor.rpc('get_public_published_report', { p_report_id: reportId }),
  'detail after withdrawal'), null);
assert.deepEqual(unwrap(await visitor.rpc('get_public_published_responses', { p_report_id: reportId }),
  'responses after withdrawal'), [], 'approved responses must disappear when parent report is withdrawn');
console.log('PHASE17_EDGE_SUBMISSION_AAL2_WITHDRAWAL_PUBLIC_HIDING_PASS');

console.log('SYNTHETIC_ADMIN_PUBLICATION_CONTRACT_PASS');
