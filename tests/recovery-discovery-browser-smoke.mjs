import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.RECOVERY_BROWSER_BASE_URL;
assert.ok(baseUrl?.startsWith('http://127.0.0.1:'), 'browser must use isolated loopback only');

const segments = [
  'harassment', 'load_shedding', 'extortion', 'public_safety',
  'road_transport', 'illegal_occupation', 'rickshaw',
];
const published = Array.from({ length: 21 }, (_, i) => ({
  id: `SJ-2026-${String(i + 1).padStart(6, '0')}`,
  segment: segments[i % segments.length],
  subcategoryId: 'synthetic-browser-type',
  subcategoryBn: 'পরীক্ষামূলক ধরন', subcategoryEn: 'Synthetic category',
  postOrigin: i === 0 ? 'admin' : 'user',
  titleBn: `পরীক্ষামূলক প্রতিবেদন ${i + 1}`,
  titleEn: `Synthetic report number ${i + 1}`,
  summaryBn: `বাংলা সারাংশ ${i + 1}`,
  summaryEn: `English summary ${i + 1}`,
  descriptionBn: `বাংলা বিস্তারিত ${i + 1}`,
  descriptionEn: `English full detail ${i + 1}`,
  district: 'Dhaka', districtBn: 'ঢাকা', districtEn: 'Dhaka',
  locationBn: 'ধানমন্ডি, ঢাকা', locationEn: 'Dhanmondi, Dhaka',
  location: 'Dhanmondi, Dhaka',
  organization: i === 0 ? 'Synthetic Organization' : null,
  reportedSubject: i === 0 ? 'Synthetic Reported Party' : null,
  publishedAt: '2026-10-17T10:00:00Z',
  status: 'published',
}));

const approvedResponses = [
  { id: 'SR-2026-000001', responseType: 'citizen_information', content: 'Reviewed synthetic witness information.',
    incidentDate: null, publishedAt: '2026-10-18T10:00:00Z', responderType: null,
    responderName: null, designation: null, organizationName: null },
  { id: 'SR-2026-000002', responseType: 'subject_response', content: 'Reviewed synthetic subject clarification.',
    incidentDate: null, publishedAt: '2026-10-18T11:00:00Z', responderType: 'organization_rep',
    responderName: 'Test Response', designation: null, organizationName: 'Synthetic Organization' },
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type',
  };
  await page.route('**/rest/v1/rpc/*', async (route) => {
    const request = route.request();
    const name = new URL(request.url()).pathname.split('/').at(-1);
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers, body: '' });
      return;
    }
    let body;
    if (name === 'get_public_home_feed') {
      const filter = request.postDataJSON()?.p_filter || 'all';
      body = filter === 'latest' ? [...published].reverse() : published;
    } else if (name === 'get_public_published_reports') {
      body = published;
    } else if (name === 'get_public_published_report') {
      body = published.find((row) => row.id === request.postDataJSON()?.p_report_id) || null;
    } else if (name === 'get_public_published_responses') {
      body = approvedResponses;
    } else if (name === 'get_public_published_report_evidence' ||
               name === 'get_public_harassment_classifications') {
      body = [];
    } else {
      body = [];
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) });
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#home-feed-section').waitFor({ state: 'visible' });
  const notice = page.locator('#first-visit-notice-modal');
  if (await notice.isVisible()) {
    await page.locator('label[for="first-visit-ack-checkbox"]').click();
    await page.locator('#first-visit-acknowledge-btn').click();
  }
  const location = page.locator('#location-consent-modal');
  if (await location.isVisible()) await page.getByRole('button', { name: 'এখন নয়', exact: true }).click();
  await page.locator('#mobile-header-menu-btn').click();
  await page.locator('#drawer-lang-toggle').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.documentElement.lang === 'en');

  await page.locator('#report-card-SJ-2026-000001').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[id^="report-card-SJ-"]').count(), 10, 'Home shows 10 ranked results first');
  assert.equal((await page.locator('#report-origin-SJ-2026-000001').innerText()).trim(), 'Sourced report');
  assert.equal((await page.locator('#report-origin-SJ-2026-000002').innerText()).trim(), 'Citizen-submitted report');
  await page.locator('#home-load-more-button').click();
  assert.equal(await page.locator('[id^="report-card-SJ-"]').count(), 20);
  await page.locator('#home-load-more-button').click();
  assert.equal(await page.locator('[id^="report-card-SJ-"]').count(), 21);
  await page.locator('#filter-chip-latest').click();
  await page.locator('#report-card-SJ-2026-000021').waitFor({ state: 'visible' });
  // The filter resets progressive pagination in a React effect after the click.
  // Wait for the actual rendered outcome rather than sampling the previous frame.
  await page.waitForFunction(() => document.querySelectorAll('[id^="report-card-SJ-"]').length === 10);
  assert.equal(await page.locator('[id^="report-card-SJ-"]').count(), 10,
    'changing the ranking filter resets Home pagination');

  await page.locator('#bottom-nav-search').click();
  const search = page.locator('#search-page-container input[aria-label]');
  await search.waitFor({ state: 'visible' });
  await search.fill('Synthetic');
  await page.locator('#report-card-SJ-2026-000001').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#search-page-container [id^="report-card-SJ-"]').count(), 10);
  await page.locator('#search-load-more-reports').click();
  assert.equal(await page.locator('#search-page-container [id^="report-card-SJ-"]').count(), 20);
  await page.locator('#search-report-category').selectOption('harassment');
  assert.equal(await page.locator('#search-page-container [id^="report-card-SJ-"]').count(), 3,
    'search category facet must filter all 21 published rows');
  await page.locator('#search-clear-filters').click();
  assert.equal(await search.inputValue(), '', 'reset clears query and facet state');
  assert.equal(await page.locator('#search-report-category').inputValue(), 'all');

  await search.fill('Synthetic Organization');
  await page.getByRole('heading', { name: 'People & organizations' }).waitFor({ state: 'visible' });
  await search.fill('Dhaka');
  await page.getByRole('button', { name: /^People & organizations \(0\)$/ }).click();
  await page.getByRole('heading', { name: 'No results found.' }).waitFor({ state: 'visible' });
  await page.locator('#search-clear-filters').click();
  await page.locator('#bottom-nav-home').click();
  await page.locator('#report-card-SJ-2026-000001').click();
  await page.locator('#report-detail-page-container').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#report-detail-origin').innerText()).trim(), 'Sourced report');
  assert.ok((await page.locator('#report-detail-page-container').innerText()).includes('Dhanmondi, Dhaka'));
  assert.ok((await page.locator('#report-detail-page-container').innerText()).includes('Reviewed synthetic witness information.'));
  assert.ok((await page.locator('#report-detail-page-container').innerText()).includes('Reviewed synthetic subject clarification.'));
  await page.locator('#btn-respond-citizen-info').click();
  await page.locator('#citizen-description-input').waitFor({ state: 'visible' });
  await page.locator('#citizen-action-modal button[aria-label="Close"]').click();
  await page.locator('#btn-respond-subject-party').click();
  await page.locator('#subject-response-modal').waitFor({ state: 'visible' });
  await page.locator('#subject-response-modal button[aria-label="Close"]').click();

  console.log('PHASE07_DISCOVERY_BROWSER_PASS: 21 synthetic published rows, Home/Search paging and filters, provenance, detail and response forms; no hosted writes.');
} finally {
  await browser.close();
}
