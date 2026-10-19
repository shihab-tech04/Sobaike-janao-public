import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const baseUrl = process.env.RECOVERY_BROWSER_BASE_URL;
assert.ok(baseUrl?.startsWith('http://127.0.0.1:'), 'Phase08 browser uses local preview only');
const screenshots = join(process.env.RUNNER_TEMP || tmpdir(), 'sobaike-phase08-map');
await mkdir(screenshots, { recursive: true });

const rows = [
  { id: 'SJ-2026-000001', district: 'Dhaka', districtBn: 'ঢাকা', districtEn: 'Dhaka' },
  { id: 'SJ-2026-000002', district: 'Chattogram', districtBn: 'চট্টগ্রাম', districtEn: 'Chattogram' },
].map((report) => ({
  ...report, segment: 'public_safety', subcategoryId: 'synthetic-map',
  titleEn: 'Synthetic published geographic report', titleBn: 'পরীক্ষামূলক প্রকাশিত প্রতিবেদন',
  summaryEn: 'Synthetic public map row', summaryBn: 'পরীক্ষামূলক মানচিত্র সারাংশ',
  locationEn: null, locationBn: null, areaEn: null, areaBn: null,
  // Canary coordinates are sensitive and MUST be ignored by the map.
  latitude: 23.123456, longitude: 90.987654, reporter_latitude: 23.111111,
  status: 'published', publishedAt: '2026-10-17T10:00:00Z',
}));

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, locale] of [[390, 'bn'], [390, 'en'], [1440, 'bn'], [1440, 'en']]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type' };
    await page.route('**/rest/v1/rpc/*', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1);
      const content = name === 'get_public_published_reports' ? rows : [];
      await route.fulfill({ status: 200, headers, contentType: 'application/json',
        body: route.request().method() === 'OPTIONS' ? '' : JSON.stringify(content) });
    });
    // Browser screenshot reliability should not depend on a third-party tile
    // provider's availability. Tile reachability is checked separately.
    await page.route('https://tile.openstreetmap.org/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLqzgAAAABJRU5ErkJggg==', 'base64') });
    });
    await page.goto(new URL('/explore', baseUrl).href, { waitUntil: 'domcontentloaded' });
    await page.locator('#explore-page-container').waitFor({ state: 'visible' });
    const notice = page.locator('#first-visit-notice-modal');
    if (await notice.isVisible()) {
      await page.locator('label[for="first-visit-ack-checkbox"]').click();
      await page.locator('#first-visit-acknowledge-btn').click();
    }
    const consent = page.locator('#location-consent-modal');
    if (await consent.isVisible()) await page.getByRole('button', { name: 'এখন নয়', exact: true }).click();
    if (locale === 'en') {
      if (width < 768) {
        await page.locator('#mobile-header-menu-btn').click();
        await page.locator('#drawer-lang-toggle').click();
        await page.keyboard.press('Escape');
      } else {
        await page.locator('#rail-lang-toggle').click();
      }
      await page.waitForFunction(() => document.documentElement.lang === 'en');
    }

    const mapButton = page.getByRole('group', { name: locale === 'bn' ? 'ভিউ পরিবর্তন' : 'View mode switcher' })
      .getByRole('button', { name: locale === 'bn' ? 'মানচিত্র' : 'Map', exact: true });
    await mapButton.click();
    await page.locator('#public-heatmap-card .leaflet-container').waitFor({ state: 'visible' });
    await page.locator('#explore-map-mode-density').click();
    assert.equal(await page.locator('#explore-map-mode-density').getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('#heatmap-legend').isVisible(), 'density legend must be visible');
    assert.ok((await page.locator('#heatmap-legend').innerText()).includes(locale === 'bn' ? '২' : '1'),
      'legend needs a numeric report scale');

    await page.locator('#explore-map-mode-points').click();
    await page.waitForFunction(() => document.querySelectorAll('#public-heatmap-card path.leaflet-interactive').length === 2);
    await page.locator('#explore-map-mode-districts').click();
    await page.waitForFunction(() => document.querySelectorAll('#public-heatmap-card path.leaflet-interactive').length === 64);
    assert.equal(await page.locator('#heatmap-legend').count(), 0, 'density scale must not overlay district pins');

    // District selection must show a complete administrative child registry;
    // it must not pretend unpublished subdistrict-level report counts exist.
    if (width >= 768) {
      await page.locator('#desktop-select-district').click();
      await page.locator('#desktop-select-district-listbox').getByRole('option', { name: /Dhaka|ঢাকা/ }).first().click();
    } else {
      await page.getByRole('button', { name: /^ফিল্টার$|^Filters$/ }).click();
      await page.locator('#mobile-filter-district').click();
      await page.locator('#mobile-filter-district-listbox').getByRole('option', { name: /Dhaka|ঢাকা/ }).first().click();
      await page.getByRole('button', { name: locale === 'bn' ? 'ফিল্টার প্রয়োগ করুন' : 'Apply filters' }).click();
    }
    await page.locator('#explore-upazila-drilldown').waitFor({ state: 'visible' });
    await page.locator('#explore-upazila-select').click();
    await page.locator('#explore-upazila-select-listbox').getByRole('option', { name: /Dhanmondi|ধানমন্ডি/ }).click();
    const message = await page.locator('#explore-upazila-selection').innerText();
    assert.ok(message.includes(locale === 'bn' ? 'জেলাভিত্তিক' : 'district-wide'), 'upazila counts are not invented');
    assert.ok(!(await page.locator('#explore-page-container').innerText()).includes('23.111111'), 'private GPS canary leaked');

    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.client + 1, `map caused horizontal overflow: ${JSON.stringify(dimensions)}`);
    await page.screenshot({ path: join(screenshots, `map-${width}-${locale}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
  }
  console.log('PHASE08_MAP_BROWSER_PASS: EN/BN mobile and desktop, three modes, 64 district pins, thana drilldown, zero private coordinates');
} finally {
  await browser.close();
}
