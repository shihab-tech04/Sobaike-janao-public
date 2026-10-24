import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Phase17 P03/P05: an isolated, synthetic browser test against candidate built source.
// Never point this test at a live domain or real Supabase, and never submit a report.
const base = process.env.RECOVERY_BROWSER_BASE_URL;
assert.match(base || '', /^http:\/\/127\.0\.0\.1:\d+\/?$/,
  'This failure/retry fixture must run on isolated loopback only');

const report = {
  id: 'SJ-2026-099991', segment: 'public_safety',
  subcategoryId: 'synthetic-browser-only', subcategoryBn: 'পরীক্ষার ধরন',
  subcategoryEn: 'Synthetic browser-only category', postOrigin: 'admin',
  titleBn: 'পরীক্ষামূলক অনুসন্ধান', titleEn: 'Synthetic Recovery Report',
  summaryBn: 'পরীক্ষার সারাংশ', summaryEn: 'Synthetic recovery summary',
  descriptionBn: 'পরীক্ষার বিবরণ', descriptionEn: 'Synthetic recovery details',
  district: 'Dhaka', districtBn: 'ঢাকা', districtEn: 'Dhaka',
  locationBn: 'ধানমন্ডি, ঢাকা', locationEn: 'Dhanmondi, Dhaka',
  location: 'Dhanmondi, Dhaka', organization: 'Synthetic Recovery Organization',
  publishedAt: '2026-10-16T10:00:00Z', status: 'published',
};
const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
};
const results = [];
const browser = await chromium.launch({ headless: true });

async function context() {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await c.addInitScript(() => {
    localStorage.setItem('sobaike_responsibility_notice_v1', 'accepted');
    localStorage.setItem('sobaike_location_choice_v1', 'not_now');
  });
  return c;
}

function routeSyntheticRpcs(page, handler) {
  const unauthorized = [];
  page.on('request', request => {
    const u = new URL(request.url());
    if (/\/rest\/v1\/rpc\/(?:admin_|submit_public|service_)/.test(u.pathname)
       || /\/functions\/v1\/.*(?:submit|publish|upload)/.test(u.pathname)) {
      unauthorized.push(u.pathname);
    }
  });
  page.route('**/rest/v1/rpc/*', async route => {
    const u = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers, body: '' });
      return;
    }
    const outcome = handler(u.pathname.split('/').at(-1));
    await route.fulfill({
      status: outcome.status || 200, contentType: 'application/json',
      headers, body: JSON.stringify(outcome.body),
    });
  });
  return unauthorized;
}

try {
  // P03: a network failure must not be shown as 'No results'.
  {
    const c = await context();
    try {
      const page = await c.newPage();
      let fail = true;
      const unauthorized = routeSyntheticRpcs(page, name => {
        if (name === 'get_public_published_reports') {
          return fail ? { status: 503, body: { message: 'Synthetic connection unavailable' } }
                      : { body: [report] };
        }
        return { body: [] };
      });
      await page.goto(base + '#/search', { waitUntil: 'domcontentloaded' });
      const search = page.locator('#search-page-container input[aria-label]');
      await search.waitFor({ state: 'visible' });
      await search.fill('Synthetic Recovery');
      await page.locator('#search-page-container [role="alert"]').waitFor({ state: 'visible' });
      assert.equal(await page.getByText('কোনো ফল পাওয়া যায়নি।').count(), 0,
        'Transport failure must never masquerade as empty search results');
      const retry = page.getByRole('button', { name: /আবার চেষ্টা করুন|Retry/ });
      assert.equal(await retry.isVisible(), true, 'search failure must offer retry');
      fail = false;
      await retry.click();
      await page.locator('#report-card-' + report.id).waitFor({ state: 'visible' });
      assert.equal(await page.locator('#search-page-container [role="alert"]').count(), 0);
      await search.fill('phase17-no-matching-report-8f2de4');
      await page.getByRole('heading', { name: /কোনো ফল পাওয়া যায়নি।|No results found./ }).waitFor({ state: 'visible' });
      assert.equal(await page.getByRole('button', { name: /আবার চেষ্টা করুন|Retry/ }).count(), 0,
        'Genuine no-match state must not falsely show server failure controls');
      await page.locator('#search-clear-filters').click();
      assert.equal(await search.inputValue(), '', 'clearing search must restore initial state');
      assert.deepEqual(unauthorized, [], 'search/retry must not invoke any protected mutation RPC');
      results.push('P03_SEARCH_FAILURE_RETRY_EMPTY_RESET_PASS');
    } finally { await c.close(); }
  }

  // P05: an unknown detail ID must render not-found, never a fake published report.
  {
    const c = await context();
    try {
      const page = await c.newPage();
      const unauthorized = routeSyntheticRpcs(page, name =>
        name === 'get_public_published_report' ? { body: null } : { body: [] });
      await page.goto(base + '#/report-detail/SJ-PHASE17-NONPUBLIC-SYNTHETIC', { waitUntil: 'domcontentloaded' });
      await page.locator('#report-detail-not-found-container').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#report-detail-page-container').count(), 0);
      assert.equal(await page.getByRole('button', { name: /মূল পাতায় ফিরুন|Back to home/ }).isVisible(), true);
      assert.deepEqual(unauthorized, [], 'nonexistent published detail must never call protected writes');
      results.push('P05_NONPUBLIC_DETAIL_NOT_FOUND_PASS');
    } finally { await c.close(); }
  }

  // P05: a real transport failure has explicit retry; recovered published report stays in context.
  {
    const c = await context();
    try {
      const page = await c.newPage();
      let fail = true;
      const unauthorized = routeSyntheticRpcs(page, name => {
        if (name === 'get_public_published_report') {
          return fail ? { status: 503, body: { message: 'Synthetic detail network failure' } }
                      : { body: report };
        }
        return { body: [] };
      });
      await page.goto(base + '#/report-detail/' + report.id, { waitUntil: 'domcontentloaded' });
      await page.locator('#report-detail-error-container').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#report-detail-not-found-container').count(), 0,
        'API failure must not be shown as missing report');
      fail = false;
      await page.getByRole('button', { name: /আবার চেষ্টা করুন|Retry/ }).click();
      await page.locator('#report-detail-page-container').waitFor({ state: 'visible' });
      await page.locator('#report-detail-origin').waitFor({ state: 'visible' });
      assert.ok((await page.locator('#report-detail-page-container').innerText()).includes('Dhanmondi, Dhaka')
        || (await page.locator('#report-detail-page-container').innerText()).includes('ধানমন্ডি, ঢাকা'));
      assert.equal(await page.locator('#btn-respond-citizen-info').isVisible(), true);
      assert.equal(await page.locator('#btn-respond-subject-party').isVisible(), true);
      assert.deepEqual(unauthorized, [], 'detail recovery must not invoke protected writes');
      results.push('P05_DETAIL_FAILURE_RETRY_CONTEXT_PASS');
    } finally { await c.close(); }
  }

  const outputDir = join(process.env.RUNNER_TEMP || '/tmp', 'sobaike-phase17-recovery');
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'recovery-results.json'),
    JSON.stringify({ fixture: 'synthetic-loopback', production_writes: 0, results }, null, 2));
  console.log('PHASE17_PUBLIC_ERROR_RECOVERY_PASS: ' + results.join('; '));
} finally {
  await browser.close();
}
