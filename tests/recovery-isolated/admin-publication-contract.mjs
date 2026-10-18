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
assert.ok((await adminAuth.rpc('admin_publish_complaint', { p_complaint_id: reportId })).error,
  'even super admin cannot publish with an AAL1 session');
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
console.log('SYNTHETIC_ADMIN_PUBLICATION_CONTRACT_PASS');
