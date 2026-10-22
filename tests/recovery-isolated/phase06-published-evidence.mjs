import assert from 'node:assert/strict';

const api = process.env.RECOVERY_LOCAL_API_URL;
const anonKey = process.env.RECOVERY_LOCAL_ANON_KEY;
const reportId = process.env.RECOVERY_SYNTHETIC_REPORT_ID;
const storagePath = process.env.RECOVERY_SYNTHETIC_EVIDENCE_PATH;

assert.equal(new URL(api).hostname, '127.0.0.1');
assert.equal(new URL(api).port, '54321');
assert.match(reportId, /^SJ-[0-9]{4}-[0-9]{6}$/);
assert.match(storagePath, /^public-submissions\/ci-gateway-[a-f0-9]+\/evidence-[a-f0-9]{32}\.webp$/);

const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
const metadata = await fetch(`${api}/rest/v1/rpc/get_public_published_report_evidence`, {
  method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ p_report_ids: [reportId] }), signal: AbortSignal.timeout(25_000),
});
assert.equal(metadata.status, 200, `published evidence RPC status ${metadata.status}`);
const rows = await metadata.json();
assert.ok(Array.isArray(rows), 'published evidence metadata is a row array');
assert.ok(rows.some((row) => row.report_id === reportId && row.storage_path === storagePath),
  'public RPC must expose only published evidence metadata');

const response = await fetch(`${api}/storage/v1/object/authenticated/complaint-evidence/${storagePath}`, {
  headers, signal: AbortSignal.timeout(25_000),
});
assert.equal(response.status, 200, 'published private evidence must become authorized for anon read');
const bytes = new Uint8Array(await response.arrayBuffer());
assert.equal(new TextDecoder('ascii').decode(bytes.subarray(0, 4)), 'RIFF');
assert.equal(new TextDecoder('ascii').decode(bytes.subarray(8, 12)), 'WEBP');
console.log('PHASE06_PUBLISHED_PRIVATE_EVIDENCE_PASS');
