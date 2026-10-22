// Hosted anonymous read-only contract test. No submissions, updates, or privileged credentials.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.env.SUPABASE_URL;
const apiKey = process.env.SUPABASE_KEY;
assert.match(endpoint || '', /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/);
assert.ok(apiKey?.startsWith('sb_publishable_') || apiKey?.split('.').length === 3,
  'Use only an anonymous/publishable credential, never service_role');
const project = new URL(endpoint).hostname;
assert.equal(project, 'eztqgqgpluoqwmprgeas.supabase.co',
  'Never exercise a different Supabase project from this replacement-backend workflow');

async function readRpc(name, payload = {}) {
  const url = new URL('/rest/v1/rpc/' + name, endpoint);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: 'Bearer ' + apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.text();
  assert.equal(response.status, 200, name + ' anonymous HTTP status ' +
    response.status + ' (response excerpt: ' + body.slice(0, 160) + ')');
  let json;
  try { json = JSON.parse(body); } catch { throw new Error(name + ': invalid JSON'); }
  return { json, digest: createHash('sha256').update(body).digest('hex') };
}

const cfg = await readRpc('get_public_reporting_configuration');
const banners = await readRpc('get_public_site_banners');
const reports = await readRpc('get_public_published_reports');
const home = await readRpc('get_public_home_feed', {
  p_visitor_lat: null, p_visitor_lng: null, p_filter: 'all', p_district: null,
});
const popularity = await readRpc('get_public_category_popularity');

assert.ok(cfg.json && !Array.isArray(cfg.json) && typeof cfg.json === 'object');
assert.equal(cfg.json.segments?.length, 7, 'seven published categories');
assert.equal(cfg.json.forms?.length, 27, '27 published reporting forms');
assert.equal(cfg.json.subcategories?.length, 27, '27 published subcategories');
assert.equal(banners.json?.length, 7, 'seven published banners');
assert.ok(Array.isArray(reports.json) && reports.json.length > 0);
assert.ok(Array.isArray(home.json) && home.json.length > 0);
assert.equal(popularity.json?.length, 7, 'category popularity result');

const forbidden = new Set([
  'latitude', 'longitude', 'lat', 'lng', 'coordinates', 'coordinate',
  'distance_m', 'distance_meters', 'visitor_lat', 'visitor_lng',
  'reporter_latitude', 'reporter_longitude', 'reporter_lat', 'reporter_lng',
  'gps', 'location_accuracy', 'location_accuracy_m', 'location_accuracy_meters',
  'reporter_contact', 'contact_info', 'contact_email_or_phone',
  'client_submission_id', 'visitor_id', 'session_id',
]);

function assertPrivateKeysAbsent(value, label) {
  const leaked = [];
  function walk(node, path) {
    if (Array.isArray(node)) return node.forEach((child, i) => walk(child, path + '[' + i + ']'));
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      if (forbidden.has(key.toLowerCase())) leaked.push(path + '.' + key);
      walk(child, path + '.' + key);
    }
  }
  walk(value, label);
  assert.deepEqual(leaked, [], 'private key leakage: ' + leaked.slice(0, 5).join(', '));
}
assertPrivateKeysAbsent(reports.json, 'published');
assertPrivateKeysAbsent(home.json, 'home');

const sample = reports.json.find(row => typeof row?.id === 'string');
assert.ok(sample, 'At least one published report has an ID');
const report = await readRpc('get_public_published_report', { p_report_id: sample.id });
const evidence = await readRpc('get_public_published_report_evidence', { p_report_ids: [sample.id] });
const responses = await readRpc('get_public_published_responses', { p_report_id: sample.id });
const sources = await readRpc('get_public_report_sources', { p_report_id: sample.id });
const origins = await readRpc('get_public_report_origins', { p_report_ids: [sample.id] });
assert.ok(report.json && typeof report.json === 'object' && !Array.isArray(report.json));
assert.ok(Array.isArray(evidence.json), 'public evidence listing must be an array');
assert.ok(Array.isArray(responses.json), 'public published responses must be an array');
for (const [name, result] of [['detail', report], ['evidence', evidence], ['responses', responses], ['sources', sources], ['origins', origins]]) {
  assertPrivateKeysAbsent(result.json, name);
}

const counts = {
  project, timestamp: new Date().toISOString(),
  evidence_level: 'Hosted HTTP anonymous read-only',
  published_categories: cfg.json.segments.length,
  published_subcategories: cfg.json.subcategories.length,
  published_forms: cfg.json.forms.length,
  published_banners: banners.json.length,
  published_reports: reports.json.length,
  public_home_feed: home.json.length,
  popularity_categories: popularity.json.length,
  rpc_response_sha256: Object.fromEntries(Object.entries({
    configuration: cfg, banners, reports, home, popularity, report, evidence, responses, sources, origins,
  }).map(([key, result]) => [key, result.digest])),
};
await mkdir('recovery-evidence', {recursive: true});
await writeFile('recovery-evidence/anonymous-read-contract.json', JSON.stringify(counts, null, 2) + '\n');
console.log('HOSTED_ANON_READ_CONTRACT_PASS:', JSON.stringify({
  project, categories: counts.published_categories, forms: counts.published_forms,
  banners: counts.published_banners, reports: counts.published_reports,
  popularity: counts.popularity_categories,
}));
