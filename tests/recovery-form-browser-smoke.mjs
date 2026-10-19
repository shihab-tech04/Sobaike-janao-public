import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import ts from 'typescript';

const baseUrl = process.env.RECOVERY_BROWSER_BASE_URL;
assert.ok(baseUrl?.startsWith('http://127.0.0.1:'), 'Only an isolated loopback browser is permitted');

// This is an explicit synthetic fixture, assembled from the checked-in 27-ID
// fallback. It is NOT a claim that the live DB is seeded from these objects.
const optionsSource = await readFile(new URL('../src/data/reportOptions.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(optionsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { SEGMENT_SUBCATEGORIES } = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`);
const sections = [
  ['harassment', 'harassment', 'Harassment & Abuse', 'হয়রানি ও নির্যাতন'],
  ['load_shedding', 'load-shedding', 'Utility Issues', 'ইউটিলিটি সমস্যা'],
  ['extortion', 'extortion', 'Extortion & Bribery', 'চাঁদাবাজি ও ঘুষ'],
  ['public_safety', 'public-safety', 'Public Safety', 'জননিরাপত্তা'],
  ['road_transport', 'road-transport', 'Road & Transport Issues', 'সড়ক ও যাতায়াত সমস্যা'],
  ['illegal_occupation', 'illegal-occupation', 'Illegal Occupation', 'অবৈধ দখল'],
  ['rickshaw', 'rickshaw', 'Illegal Auto-rickshaw Charging Station', 'অবৈধ অটো-রিকশা চার্জিং স্টেশন'],
];
const subcategories = sections.flatMap(([segmentId]) => SEGMENT_SUBCATEGORIES[segmentId].map((sub, i) => ({
  id: sub.id, segmentId, nameEn: sub.nameEn, nameBn: sub.nameBn,
  sortOrder: i + 1, categoryGroup: sub.categoryGroup || 'general', isSensitive: sub.isSensitive || false,
})));
assert.equal(subcategories.length, 27, 'synthetic fallback must contain exactly 27 active options');

const choices = [
  { value: 'abduction', labelEn: 'Child abduction', labelBn: 'শিশু অপহরণ' },
  { value: 'murder', labelEn: 'Murder of a child', labelBn: 'শিশু হত্যা' },
];
const configuredField = (fieldKey, storageKey, options) => ({
  fieldKey, storageKey, storageMode: 'custom_json', fieldType: 'select', labelEn: 'Incident type',
  labelBn: 'ঘটনার ধরন', required: true, active: true, sortOrder: 30, options, config: { publicVisible: true },
});
const rideFields = [
  configuredField('rideshare_platform', 'rideSharePlatform', [
    { value: 'uber', labelEn: 'Uber', labelBn: 'Uber' },
    { value: 'pathao', labelEn: 'Pathao', labelBn: 'Pathao' },
  ]),
  configuredField('rideshare_incident_type', 'rideShareIncidentType', [
    { value: 'unsafe_driving', labelEn: 'Unsafe driving', labelBn: 'বেপরোয়া চালনা' },
  ]),
  configuredField('rideshare_role', 'rideShareRole', [
    { value: 'passenger', labelEn: 'Passenger', labelBn: 'যাত্রী' },
  ]),
  {
    ...configuredField('rideshare_vehicle_type', 'rideShareVehicleType', [
      { value: 'motorcycle', labelEn: 'Motorcycle', labelBn: 'মোটরসাইকেল' },
    ]),
    required: false,
  },
  {
    ...configuredField('rideshare_trip_id', 'rideShareTripId', []),
    fieldType: 'text', required: false, config: { publicVisible: false },
  },
];
const config = {
  segments: sections.map(([id, slug, nameEn, nameBn], i) => ({
    id, slug, nameEn, nameBn, shortNameEn: nameEn, shortNameBn: nameBn, sortOrder: i + 1,
  })),
  subcategories,
  forms: subcategories.map((sub) => ({
    subcategoryId: sub.id, schemaId: `synthetic-${sub.id}`,
    version: ['child_abduction_murder', 'ride_sharing_safety'].includes(sub.id) ? 2 : 1,
    engineMode: ['child_abduction_murder', 'ride_sharing_safety'].includes(sub.id) ? 'schema' : 'legacy',
    fields: sub.id === 'child_abduction_murder'
      ? [configuredField('child_incident_type', 'childIncidentType', choices)]
      : sub.id === 'ride_sharing_safety' ? rideFields : [],
  })),
};

const browser = await chromium.launch({ headless: true });
try {
  for (const language of ['bn', 'en']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    let configurationRequests = 0;
    await page.route('**/rest/v1/rpc/get_public_reporting_configuration', async (route) => {
      configurationRequests += 1;
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type',
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: route.request().method() === 'OPTIONS' ? '' : JSON.stringify(config), headers });
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('#home-feed-section').waitFor({ state: 'visible' });
    const notice = page.locator('#first-visit-notice-modal');
    if (await notice.isVisible()) {
      await page.locator('label[for="first-visit-ack-checkbox"]').click();
      await page.locator('#first-visit-acknowledge-btn').click();
    }
    const consent = page.locator('#location-consent-modal');
    if (await consent.isVisible()) await page.getByRole('button', { name: 'এখন নয়', exact: true }).click();
    if (language === 'en') {
      await page.locator('#mobile-header-menu-btn').click();
      await page.locator('#drawer-lang-toggle').click();
      await page.keyboard.press('Escape');
    }
    await page.waitForFunction((expected) => document.documentElement.lang === expected, language);
    await page.locator('#bottom-nav-report').click();
    await page.locator('#service-select-card-public_safety').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[id^="service-select-card-"]').count(), 7, `${language}: seven published categories`);
    await page.locator('#service-select-card-public_safety').click();
    await page.locator('#composer-footer-step1-next-btn').click();
    await page.locator('#subcategory-option-child_abduction_murder').waitFor({ state: 'visible' });
    await page.locator('#subcategory-option-child_abduction_murder').click();
    await page.locator('#composer-footer-step2-next-btn').click();
    await page.locator('#configured-field-child_incident_type').waitFor({ state: 'visible' });
    const select = page.locator('#configured-field-child_incident_type');
    assert.equal(await select.locator('option').count(), 3, `${language}: only published options plus placeholder`);
    await select.selectOption('abduction');
    assert.equal(await select.inputValue(), 'abduction');
    assert.equal(await page.locator('[id^="subcategory-option-bribe-paid"]').count(), 0);
    assert.ok(configurationRequests > 0, `${language}: the browser loaded the atomic published configuration`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${language}: no horizontal overflow; got ${overflow}px`);
    await page.close();

    // Verify the second real schema-driven route independently, including
    // server-provided options and the intentionally hidden related-party key.
    const ridePage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await ridePage.route('**/rest/v1/rpc/get_public_reporting_configuration', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: route.request().method() === 'OPTIONS' ? '' : JSON.stringify(config),
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type',
        },
      });
    });
    await ridePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await ridePage.locator('#home-feed-section').waitFor({ state: 'visible' });
    const rideNotice = ridePage.locator('#first-visit-notice-modal');
    if (await rideNotice.isVisible()) {
      await ridePage.locator('label[for="first-visit-ack-checkbox"]').click();
      await ridePage.locator('#first-visit-acknowledge-btn').click();
    }
    const rideConsent = ridePage.locator('#location-consent-modal');
    if (await rideConsent.isVisible()) await ridePage.getByRole('button', { name: 'এখন নয়', exact: true }).click();
    if (language === 'en') {
      await ridePage.locator('#mobile-header-menu-btn').click();
      await ridePage.locator('#drawer-lang-toggle').click();
      await ridePage.keyboard.press('Escape');
    }
    await ridePage.waitForFunction((expected) => document.documentElement.lang === expected, language);
    await ridePage.locator('#bottom-nav-report').click();
    await ridePage.locator('#service-select-card-public_safety').click();
    await ridePage.locator('#composer-footer-step1-next-btn').click();
    await ridePage.locator('#subcategory-option-ride_sharing_safety').click();
    await ridePage.locator('#composer-footer-step2-next-btn').click();
    for (const [fieldKey, value] of [
      ['rideshare_platform', 'pathao'],
      ['rideshare_incident_type', 'unsafe_driving'],
      ['rideshare_role', 'passenger'],
      ['rideshare_vehicle_type', 'motorcycle'],
    ]) {
      const select = ridePage.locator(`#configured-field-${fieldKey}`);
      await select.waitFor({ state: 'visible' });
      await select.selectOption(value);
      assert.equal(await select.inputValue(), value, `${language}: ${fieldKey} selected`);
    }
    assert.equal(await ridePage.locator('#configured-field-rideshare_trip_id').count(), 0,
      `${language}: unpublished/hidden trip ID must not appear`);
    await ridePage.close();
  }
  console.log('Synthetic 7-category/27-form Public browser matrix passed in BN/EN, including both dynamic schemas; no live write attempted.');
} finally {
  await browser.close();
}
