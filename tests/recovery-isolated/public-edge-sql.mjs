import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const api = process.env.RECOVERY_LOCAL_API_URL;
const anonKey = process.env.RECOVERY_LOCAL_ANON_KEY;
assert.equal(new URL(api).hostname, '127.0.0.1', 'local API must be loopback only');
assert.equal(new URL(api).port, '54321', 'local API must use the test-only port');
assert.ok(anonKey, 'temporary local anonymous key is required');

const baseHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  Origin: 'http://localhost:5173',
  'x-real-ip': '192.0.2.44',
};

async function endpoint(functionName, body, extraHeaders = {}) {
  const multipart = body instanceof FormData;
  const res = await fetch(`${api}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: { ...baseHeaders, ...(multipart ? {} : { 'content-type': 'application/json' }), ...extraHeaders },
    body: multipart ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  return { status: res.status, headers: res.headers, json: await res.json() };
}

async function preflight() {
  const allowed = await fetch(`${api}/functions/v1/public-write-gateway`, {
    method: 'OPTIONS', headers: { ...baseHeaders }, signal: AbortSignal.timeout(25_000),
  });
  assert.equal(allowed.status, 200);
  // The disposable Supabase API gateway injects Access-Control-Allow-Origin: *
  // on its own response path. Assert the recovered function's distinct body,
  // rather than mistaking the local gateway's CORS header for our source header.
  assert.equal(await allowed.text(), 'ok', 'approved origin must reach Edge preflight');

  const denied = await fetch(`${api}/functions/v1/public-write-gateway`, {
    method: 'OPTIONS', headers: { Origin: 'https://unapproved.invalid' }, signal: AbortSignal.timeout(25_000),
  });
  assert.equal(denied.status, 403, 'unknown browser origin must fail preflight');
  assert.equal(await denied.text(), 'Forbidden', 'unknown origin must be rejected by Edge');

  const badAction = await endpoint('public-write-gateway', { action: 'unknown' });
  assert.equal(badAction.status, 400);
  assert.equal(badAction.json.code, 'INVALID_ACTION');

  // The direct anon RPC was intentionally revoked; no legacy bypass.
  const direct = await fetch(`${api}/rest/v1/rpc/submit_public_complaint_v2`, {
    method: 'POST',
    headers: { ...baseHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ p_payload: {}, p_client_submission_id: 'ci-forbidden-direct', p_reporter_context: {} }),
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(direct.ok, false, 'anonymous direct RPC must not succeed');
  console.log('PASS: CORS, unknown action, and direct anonymous RPC denial');
}

async function submitSyntheticReport() {
  const submissionId = `ci-gateway-${randomUUID().replaceAll('-', '')}`;
  const request = {
    action: 'complaint',
    submissionRpc: 'submit_public_complaint_v2',
    clientSubmissionId: submissionId,
    reporterContext: {
      latitude: 23.75, longitude: 90.39, accuracy_meters: 50,
      visitor_id: 'ci-visitor-0001', session_id: 'ci-session-0001',
    },
    payload: {
      segment: 'road_transport', subcategoryId: 'ci-road-transport',
      title: 'Synthetic local road issue',
      description: 'Synthetic integration submission; never sourced from a real citizen.',
      privacyChoice: 'anonymous',
      location: { division: 'Dhaka', district: 'Dhaka', upazilaOrThana: 'Dhanmondi' },
    },
  };
  const first = await endpoint('public-write-gateway', request);
  assert.equal(first.status, 200);
  assert.equal(first.json.success, true,
    `gateway rejected synthetic report: ${first.json.code ?? 'no code'}: ${first.json.error ?? 'no details'}`);
  const id = first.json.result?.reportId;
  assert.match(id, /^SJ-[0-9]{4}-[0-9]{6}$/);

  const retry = await endpoint('public-write-gateway', request);
  assert.equal(retry.json.success, true, `idempotent retry was rejected: ${retry.json.code ?? 'no code'}`);
  assert.equal(retry.json.result?.reportId, id, 'idempotency must return the same report');
  console.log('PASS: one synthetic report submitted through Edge and duplicate safely reused');

  const response = await endpoint('public-write-gateway', {
    action: 'response', reportId: id, responseType: 'citizen_information',
    payload: { description: 'Synthetic information on pending report' },
    visitorId: 'ci-visitor-0001', sessionId: 'ci-session-0001',
  });
  assert.equal(response.json.success, false, 'citizen response to unmoderated report must be denied');
  console.log('PASS: response to unpublished report denied');

  const image = new FormData();
  image.append('clientSubmissionId', submissionId);
  image.append('file', new Blob(['not actually a WebP image'], { type: 'image/webp' }), 'invalid.webp');
  const evidence = await endpoint('public-evidence-upload', image);
  assert.equal(evidence.json.success, false);
  assert.equal(evidence.json.code, 'INVALID_WEBP', 'invalid WebP bytes must never be stored');
  console.log('PASS: invalid evidence bytes rejected by local sanitizer');

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `synthetic_report_id=${id}\n`);
  }
}

await preflight();
await submitSyntheticReport();
console.log('SYNTHETIC_EDGE_HTTP_TESTS_PASS');
