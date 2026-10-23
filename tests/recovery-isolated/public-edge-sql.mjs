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

  console.log('PASS: CORS, unknown action, and anonymous direct RPC denial');
}

async function publishedTaxonomy() {
  const res = await fetch(`${api}/rest/v1/rpc/get_public_reporting_configuration`, {
    method: 'POST',
    headers: { ...baseHeaders, 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(res.status, 200, 'read-only active taxonomy RPC must be callable by anon');
  const config = await res.json();
  assert.deepEqual(config.segments.map((s) => s.id), [
    'harassment', 'load_shedding', 'extortion', 'public_safety',
    'road_transport', 'illegal_occupation', 'rickshaw',
  ]);
  assert.equal(config.subcategories.length, 27, 'published active subcategories');
  assert.equal(config.forms.length, 27, 'one published form per active subcategory');
  assert.equal(config.subcategories.some((s) => s.id === 'bribe-paid'), false);
  assert.equal(config.forms.some((f) => f.subcategoryId === 'bribe-paid'), false);

  const child = config.forms.find((f) => f.subcategoryId === 'child_abduction_murder');
  const ride = config.forms.find((f) => f.subcategoryId === 'ride_sharing_safety');
  assert.equal(child?.engineMode, 'schema');
  assert.equal(ride?.engineMode, 'schema');
  assert.equal(child.fields.some((f) => f.fieldKey === 'child_incident_type' && f.required), true);
  for (const fieldKey of ['rideshare_platform', 'rideshare_incident_type', 'rideshare_role']) {
    const field = ride.fields.find((f) => f.fieldKey === fieldKey);
    assert.equal(field?.required, true, `${fieldKey} must remain required`);
    assert.ok(Array.isArray(field?.options) && field.options.length > 0,
      `${fieldKey} must have server-issued options`);
  }
  console.log('PASS: anon SQL RPC returned 7/27/27 exact taxonomy and both dynamic form contracts');
  return config;
}

async function ipLocationSafety() {
  const endpointUrl = `${api}/functions/v1/public-ip-location`;
  const good = await fetch(endpointUrl, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173' },
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(good.status, 200, 'restored IP-location Edge source must serve trusted CORS preflight');
  assert.equal(await good.text(), 'ok');

  const forbidden = await fetch(endpointUrl, {
    method: 'OPTIONS',
    headers: { Origin: 'https://unknown.invalid' },
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(forbidden.status, 403, 'unapproved origin must not pass IP-location preflight');

  const wrongMethod = await fetch(endpointUrl, {
    method: 'POST', headers: { Origin: 'http://localhost:5173', apikey: anonKey },
    body: '{}', signal: AbortSignal.timeout(25_000),
  });
  assert.equal(wrongMethod.status, 405, 'IP location must not accept writes');
  console.log('PASS: recovered IP-location Edge source CORS and method gates');
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
      segment: 'road_transport', subcategoryId: 'road-accident',
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

  // A formerly permissive Storage INSERT policy could be used from any browser
  // to bypass the Edge byte sanitizer with a forged image/webp content type.
  // The anonymous path must fail even for a valid, currently submitted ID.
  const forgedStoragePath = `public-submissions/${submissionId}/evidence-forged.webp`;
  const directUpload = await fetch(`${api}/storage/v1/object/complaint-evidence/${forgedStoragePath}`, {
    method: 'POST',
    headers: { ...baseHeaders, 'content-type': 'image/webp', 'x-upsert': 'false' },
    body: '<svg xmlns="http://www.w3.org/2000/svg"><script>bad()</script></svg>',
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(directUpload.ok, false,
    `anonymous direct Storage upload bypassed WebP sanitization: HTTP ${directUpload.status}`);

  // The authorized rate-limited Edge gateway still accepts a real decodable
  // two-pixel WebP, strips its metadata and registers the private object.
  const tinyWebp = Buffer.from(
    'UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoCAAIAAkA8JaACdLoB+AADsAD+8Bvf/xZyMR2eb/8Ka+FNfCmv+ECAAAA=',
    'base64',
  );
  const legitimate = new FormData();
  legitimate.append('clientSubmissionId', submissionId);
  legitimate.append('file', new Blob([tinyWebp], { type: 'image/webp' }), '../unsafe-name.svg');
  const uploaded = await endpoint('public-evidence-upload', legitimate);
  assert.equal(uploaded.status, 200,
    `valid sanitized Edge upload must succeed: ${JSON.stringify(uploaded.json)}`);
  assert.equal(uploaded.json.success, true);
  const storagePath = uploaded.json.evidence?.storagePath;
  assert.match(storagePath, new RegExp(`^public-submissions/${submissionId}/evidence-[a-f0-9]{32}\\.webp$`));
  assert.equal(uploaded.json.evidence?.width, 2);
  assert.equal(uploaded.json.evidence?.height, 2);

  const retryUpload = await endpoint('public-evidence-upload', legitimate);
  assert.equal(retryUpload.status, 200,
    `a duplicate sanitized upload must be idempotent: ${JSON.stringify(retryUpload.json)}`);
  assert.equal(retryUpload.json.success, true);
  assert.equal(retryUpload.json.evidence?.storagePath, storagePath);

  const earlyRead = await fetch(`${api}/storage/v1/object/authenticated/complaint-evidence/${storagePath}`, {
    headers: baseHeaders, signal: AbortSignal.timeout(25_000),
  });
  assert.equal(earlyRead.ok, false, 'anonymous visitors must not fetch unmoderated private evidence');
  console.log('PASS: anon forged Storage bypass denied, real Edge WebP registered idempotently, draft evidence private');

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `synthetic_report_id=${id}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `synthetic_evidence_path=${storagePath}\n`);
  }
}

async function submitPublishedSchemaForms() {
  const cases = [
    {
      subcategoryId: 'child_abduction_murder',
      customFieldAnswers: { childIncidentType: 'abduction' },
      // Explicitly malicious/obsolete fields must be stripped by the server.
      reportedSubject: 'This hidden subject must never be stored',
      evidenceTypes: ['image'],
      evidenceDescription: 'This hidden evidence must never be stored',
      hasSupportingInfo: true,
    },
    {
      subcategoryId: 'ride_sharing_safety',
      customFieldAnswers: {
        rideSharePlatform: 'pathao',
        rideShareIncidentType: 'unsafe_driving',
        rideShareRole: 'passenger',
        rideShareVehicleType: 'motorcycle',
      },
    },
  ];
  for (const entry of cases) {
    const submissionId = `ci-schema-${entry.subcategoryId}-${randomUUID()}`;
    const req = {
      action: 'complaint',
      submissionRpc: 'submit_public_configured_complaint',
      clientSubmissionId: submissionId,
      reporterContext: {
        latitude: 23.75, longitude: 90.39, accuracy_meters: 50,
        visitor_id: `ci-visitor-${entry.subcategoryId}`,
        session_id: `ci-session-${entry.subcategoryId}`,
      },
      payload: {
        segment: 'public_safety',
        subcategoryId: entry.subcategoryId,
        title: `Synthetic isolated ${entry.subcategoryId} test`,
        description: 'Synthetic isolated reporting form test; not a real incident.',
        incidentDate: new Date().toISOString().slice(0, 10),
        frequency: 'one-time',
        privacyChoice: 'anonymous',
        location: { division: 'Dhaka', district: 'Dhaka', upazilaOrThana: 'Dhanmondi' },
        ...entry,
      },
    };
    const first = await endpoint('public-write-gateway', req);
    assert.equal(first.status, 200,
      `${entry.subcategoryId} gateway returned HTTP ${first.status}: ${JSON.stringify(first.json)}`);
    assert.equal(first.json.success, true,
      `${entry.subcategoryId} dynamic schema rejected: ${JSON.stringify(first.json)}`);
    assert.match(first.json.result?.reportId, /^SJ-[0-9]{4}-[0-9]{6}$/);
    // Reuse a real configured-form Edge submission for the isolated AAL2
    // withdrawal phase; do not issue an extra write that can hit rate limits.
    if (entry.subcategoryId === 'child_abduction_murder' && process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT,
        `synthetic_withdraw_report_id=${first.json.result.reportId}\n`);
    }

    const retry = await endpoint('public-write-gateway', req);
    assert.equal(retry.json.success, true, `${entry.subcategoryId} retry rejected`);
    assert.equal(retry.json.result?.reportId, first.json.result.reportId,
      `${entry.subcategoryId} retry created a duplicate report`);
  }
  console.log('PASS: both schema-driven forms submitted through local Edge/SQL with idempotent retries');
}

await preflight();
await publishedTaxonomy();
await ipLocationSafety();
await submitSyntheticReport();
await submitPublishedSchemaForms();
console.log('SYNTHETIC_EDGE_HTTP_TESTS_PASS');
