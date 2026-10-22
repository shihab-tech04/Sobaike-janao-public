// Phase 17 production cross-app acceptance. READ ONLY: no citizen writes or Auth secrets.
// CI supplies only the public publishable credential and canonical hosted URLs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PUBLIC = 'https://shobaikejanao.com/';
export const ADMIN = 'https://admin.shobaikejanao.com/';
export const BACKEND = 'https://eztqgqgpluoqwmprgeas.supabase.co';

function tags(html, tag) {
  const re = new RegExp('<' + tag + '\\b[^>]*>', 'gi');
  return [...html.matchAll(re)].map(match => match[0]);
}

function attribute(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '=["\\x27]([^"\\x27]*)["\\x27]', 'i'));
  return match?.[1] ?? null;
}

function findOne(html, tag, name, expected) {
  const found = tags(html, tag).filter(item => attribute(item, name)?.toLowerCase() === expected);
  assert.equal(found.length, 1, 'Expected one ' + tag + ' with ' + name + '=' + expected);
  return found[0];
}

export function validatePublicSeo(html, robots, sitemap) {
  const canonical = findOne(html, 'link', 'rel', 'canonical');
  assert.equal(attribute(canonical, 'href'), PUBLIC);
  const ogUrl = findOne(html, 'meta', 'property', 'og:url');
  assert.equal(attribute(ogUrl, 'content'), PUBLIC);
  const indexing = findOne(html, 'meta', 'name', 'robots');
  const directives = attribute(indexing, 'content')?.toLowerCase().split(',').map(s => s.trim()) || [];
  assert.ok(directives.includes('index') && directives.includes('follow'));
  assert.ok(!directives.includes('noindex'), 'Public homepage must remain indexable');
  const ld = html.match(/<script\b[^>]*id=["']seo-jsonld["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(ld, 'Public structured data is required');
  assert.equal(JSON.parse(ld[1]).url, PUBLIC);
  assert.match(robots, /^User-agent:\s*\*/mi);
  assert.match(robots, /^Sitemap:\s*https:\/\/shobaikejanao\.com\/sitemap\.xml\s*$/mi);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
  assert.deepEqual(urls, [PUBLIC], 'Never advertise non-indexable HashRouter routes');
  assert.ok(sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9'));
}

export function validateAdminSeo(html) {
  const robots = findOne(html, 'meta', 'name', 'robots');
  const directives = attribute(robots, 'content')?.toLowerCase().split(',').map(s => s.trim()) || [];
  for (const required of ['noindex', 'nofollow', 'noarchive']) {
    assert.ok(directives.includes(required), 'Admin must have ' + required);
  }
}

export function validateReportingParity(reports, feed, banners, config) {
  assert.ok(Array.isArray(reports) && reports.length > 0, 'Published reports required');
  assert.ok(Array.isArray(feed), 'Public home feed must be an array');
  assert.ok(Array.isArray(banners) && banners.length === 7, 'Seven published banners');
  assert.ok(config && typeof config === 'object');
  assert.equal(config.segments?.length, 7);
  assert.equal(config.subcategories?.length, 27);
  assert.equal(config.forms?.length, 27);
  const ids = (rows, label) => {
    const result = rows.map(row => {
      assert.equal(row?.status, 'published', label + ' must not expose unpublished rows');
      assert.equal(typeof row?.id, 'string', label + ' must contain report ID');
      assert.ok(row.id.length > 0);
      return row.id;
    });
    assert.equal(new Set(result).size, result.length, label + ' duplicate report IDs');
    return result.sort();
  };
  assert.deepEqual(ids(feed, 'home feed'), ids(reports, 'published RPC'),
    'Published feed/report ID sets must agree');
  return { reports: reports.length, feed: feed.length, banners: banners.length, forms: config.forms.length };
}

async function get(url, expectedHost) {
  const response = await fetch(url, {
    redirect: 'follow', signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'SobaikePhase17ReadOnly/1.0' },
  });
  assert.equal(response.status, 200, 'Expected HTTP 200 for ' + new URL(url).pathname);
  const returned = new URL(response.url);
  assert.equal(returned.protocol, 'https:');
  assert.equal(returned.hostname, expectedHost, 'Unexpected redirect origin');
  return { data: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') || '' };
}

async function siteBundle(base, expectedRepo) {
  const host = new URL(base).hostname;
  const [html, manifest] = await Promise.all([
    get(base, host), get(new URL('release-manifest.json', base), host),
  ]);
  assert.match(html.type, /text\/html/i);
  const text = html.data.toString('utf8');
  const info = JSON.parse(manifest.data.toString('utf8'));
  assert.equal(info.repository, expectedRepo);
  assert.match(info.commit_sha, /^[0-9a-f]{40}$/);
  assert.equal(info.index_sha256, createHash('sha256').update(html.data).digest('hex'),
    'Live homepage must exactly match release-manifest index hash');
  assert.ok(text.includes('id="root"') && !text.includes('/src/main.tsx'),
    'Production must serve built app rather than source entry');
  const scripts = tags(text, 'script').map(tag => attribute(tag, 'src')).filter(Boolean);
  const entry = scripts.find(s => /(?:^|\/)assets\/[^/]+\.js(?:\?.*)?$/.test(s));
  assert.ok(entry, 'Bundled JS application entry is required');
  const asset = await get(new URL(entry, base), host);
  assert.match(asset.type, /javascript/i, 'Asset cannot be a GitHub Pages HTML fallback');
  const js = asset.data.toString('utf8');
  assert.ok(js.includes(BACKEND), expectedRepo + ' must use replacement backend');
  assert.ok(!js.includes('ahiaymyqfmyyrjkwgvhi.supabase.co'), 'Original backend must not remain bundled');
  return { html: text, sha: info.commit_sha };
}

async function rpc(name, payload, endpoint, key) {
  const response = await fetch(new URL('/rest/v1/rpc/' + name, endpoint), {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, 'Public RPC ' + name + ' HTTP ' + response.status);
  return response.json();
}

export async function run() {
  const api = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  assert.equal(api?.replace(/\/$/, ''), BACKEND, 'Use replacement backend only');
  assert.ok(key?.startsWith('sb_publishable_'), 'Only public publishable credential is authorized');

  const [publicSite, adminSite, robots, sitemap] = await Promise.all([
    siteBundle(PUBLIC, 'shihab-tech04/Sobaike-janao-public'),
    siteBundle(ADMIN, 'shihab-tech04/Sobaike-Janao-Admin'),
    get(new URL('robots.txt', PUBLIC), new URL(PUBLIC).hostname),
    get(new URL('sitemap.xml', PUBLIC), new URL(PUBLIC).hostname),
  ]);
  validatePublicSeo(publicSite.html, robots.data.toString('utf8'), sitemap.data.toString('utf8'));
  validateAdminSeo(adminSite.html);

  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  const denied = await fetch(new URL('/rest/v1/rpc/admin_get_response_detail', api), {
    method: 'POST', headers,
    body: JSON.stringify({ p_response_id: '__phase17_unauthorized_read_only__' }),
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(!denied.ok && denied.status < 500,
    'Anonymous access must not succeed or error with 5xx on protected Admin RPC');
  const deniedText = (await denied.text()).toLowerCase();
  for (const field of ['contact_info', 'contact_email_or_phone', 'responder_contact']) {
    assert.ok(!deniedText.includes(field), 'Admin denial response must not expose ' + field);
  }

  const [reports, feed, banners, config] = await Promise.all([
    rpc('get_public_published_reports', {}, api, key),
    rpc('get_public_home_feed', {
      p_visitor_lat: null, p_visitor_lng: null, p_filter: 'all', p_district: null,
    }, api, key),
    rpc('get_public_site_banners', {}, api, key),
    rpc('get_public_reporting_configuration', {}, api, key),
  ]);
  const counts = validateReportingParity(reports, feed, banners, config);
  console.log('PHASE17_CROSS_APP_READ_ONLY_PASS:', JSON.stringify({
    public_sha: publicSite.sha,
    admin_sha: adminSite.sha,
    backend: new URL(api).hostname,
    ...counts, seo: 'public canonical + sitemap, admin noindex',
    protected_admin_rpc: 'anonymous denied',
    data_writes: 0,
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch(error => { console.error('PHASE17_CROSS_APP_FAIL:', error.message); process.exitCode = 1; });
}
