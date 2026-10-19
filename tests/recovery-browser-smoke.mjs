import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const app = process.env.RECOVERY_BROWSER_APP;
const baseUrl = process.env.RECOVERY_BROWSER_BASE_URL;
const expectedSupabaseHost = process.env.RECOVERY_EXPECT_SUPABASE_HOST;
assert.equal(app, 'public');
assert.ok(baseUrl, 'RECOVERY_BROWSER_BASE_URL must point to the site under test');

const widths = [360, 390, 768, 1280, 1536];
const browser = await chromium.launch({ headless: true });
const screenshotDir = join(process.env.RUNNER_TEMP || tmpdir(), 'sobaike-responsive-smoke');
await mkdir(screenshotDir, { recursive: true });
const supabaseHosts = new Set();

try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    page.on('request', (request) => {
      const host = new URL(request.url()).hostname;
      if (host.endsWith('.supabase.co')) supabaseHosts.add(host);
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const feedHeading = page.locator('#home-feed-section h2');
    await feedHeading.waitFor({ state: 'visible' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await feedHeading.waitFor({ state: 'visible' });
    assert.equal((await feedHeading.innerText()).trim(), 'সকল প্রতিবেদন');

    // The public app presents this first-visit notice before its navigation.
    // Acknowledge it through the existing UI so the responsive menu can be tested.
    const notice = page.locator('#first-visit-notice-modal');
    if (await notice.isVisible()) {
      await page.locator('label[for="first-visit-ack-checkbox"]').click();
      await page.locator('#first-visit-acknowledge-btn').click();
      await notice.waitFor({ state: 'hidden' });
    }

    // Do not grant geolocation in this smoke; choose the existing consent option.
    const locationConsent = page.locator('#location-consent-modal');
    if (await locationConsent.isVisible()) {
      await page.getByRole('button', { name: 'এখন নয়', exact: true }).click();
      await locationConsent.waitFor({ state: 'hidden' });
    }

    const assertNoHorizontalOverflow = async (locale) => {
      const widths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.ok(widths.document <= widths.viewport + 1, `${locale} at ${width}px overflows horizontally: ${JSON.stringify(widths)}`);
    };
    await assertNoHorizontalOverflow('bn');
    let screenshot = await page.screenshot({
      path: join(screenshotDir, `public-${width}-bn-light.png`),
      animations: 'disabled',
    });
    assert.ok(screenshot.byteLength > 1000, `Bengali viewport screenshot was unexpectedly small at ${width}px`);

    const mobile = width < 768;
    const desktop = width >= 1440;
    if (mobile) {
      const header = page.locator('#mobile-header');
      assert.equal(await header.getAttribute('data-compact'), 'false');
      const brand = page.locator('#mobile-header-brand-logo');
      assert.equal(await brand.locator('img').count(), 1, 'one mobile brand mark');
      assert.equal(await brand.getByText('সবাইকে জানাও').count(), 1, 'one Bangla wordmark');
      assert.equal(await brand.getByText('Sobaike Janao').count(), 0, 'no duplicate English wordmark');
      for (const id of ['menu', 'search', 'report', 'home']) {
        const target = page.locator(`#bottom-nav-${id}`);
        const box = await target.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, `mobile ${id} tap target at ${width}px must be at least 44px`);
      }
      assert.equal(await page.locator('#bottom-nav button').count(), 4);

      // Scroll down compacts, then scrolling back toward the top expands.
      await page.evaluate(() => {
        const spacer = document.createElement('div');
        spacer.id = 'responsive-test-scroll-spacer';
        spacer.style.height = '2000px';
        document.querySelector('#main-content')?.append(spacer);
        window.scrollTo(0, 450);
      });
      await page.waitForFunction(() => document.querySelector('#mobile-header')?.getAttribute('data-compact') === 'true');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('#mobile-header')?.getAttribute('data-compact') === 'false');
      await page.locator('#responsive-test-scroll-spacer').evaluate((element) => element.remove());
    }

    if (desktop) {
      await page.locator('#rail-lang-toggle').click();
    } else {
      await page.locator(mobile ? '#mobile-header-menu-btn' : '#tablet-menu-button').click();
      const toggle = page.locator('#drawer-lang-toggle');
      await toggle.waitFor({ state: 'visible' });
      await toggle.click();
    }
    await assertNoHorizontalOverflow('en');
    await page.getByRole('heading', { name: 'All reports', exact: true }).waitFor({ state: 'visible' });
    screenshot = await page.screenshot({
      path: join(screenshotDir, `public-${width}-en-light.png`),
      animations: 'disabled',
    });
    assert.ok(screenshot.byteLength > 1000, `English viewport screenshot was unexpectedly small at ${width}px`);

    // The theme and text-size modes are changed through the actual application UI.
    if (desktop) {
      await page.locator('#compact-theme-selector-btn').click();
      await page.getByRole('option', { name: 'Dark' }).click();
    } else {
      await page.getByRole('radio', { name: 'Dark' }).click();
    }
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await assertNoHorizontalOverflow('en dark');
    screenshot = await page.screenshot({
      path: join(screenshotDir, `public-${width}-en-dark.png`),
      animations: 'disabled',
    });
    assert.ok(screenshot.byteLength > 1000);

    await page.locator(desktop ? '#rail-text-size-large' : '#drawer-text-size-large').click();
    assert.equal(await page.locator('html').getAttribute('data-text-size'), 'large');
    // Theme state, HTML attributes and the browser's computed styles can
    // settle in separate rendering tasks on headless CI workers.
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.body).fontSize) >= 15.5,
      null, { timeout: 5000 });
    const largeBodySize = await page.locator('body').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(largeBodySize >= 15.5, `larger reading mode must increase body text: ${largeBodySize}px`);
    await assertNoHorizontalOverflow('en dark large text');
    await page.locator(desktop ? '#rail-text-size-standard' : '#drawer-text-size-standard').click();

    if (desktop) {
      await page.locator('#rail-lang-toggle').click();
    } else {
      await page.locator('#drawer-lang-toggle').click();
    }
    assert.equal(await page.locator('html').getAttribute('lang'), 'bn');
    screenshot = await page.screenshot({
      path: join(screenshotDir, `public-${width}-bn-dark.png`),
      animations: 'disabled',
    });
    assert.ok(screenshot.byteLength > 1000);
    await assertNoHorizontalOverflow('bn dark');

    if (mobile) {
      await page.keyboard.press('Escape'); // Close the language/theme drawer.
      await page.locator('#tablet-drawer').waitFor({ state: 'hidden' });
      await page.locator('#bottom-nav-search').click();
      await page.locator('#search-page-container input[aria-label]').waitFor({ state: 'visible' });
      await page.locator('#search-page-container input[aria-label]').focus();
      assert.equal(await page.locator('#search-page-container input[aria-label]').evaluate((element) => document.activeElement === element), true);
      await page.locator('#root [data-text-entry-focused="true"]').waitFor({ state: 'attached' });
      await page.locator('#bottom-nav').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#bottom-nav').isVisible(), false, 'bottom navigation must yield to text entry');
      await page.locator('#search-page-container input[aria-label]').evaluate((element) => element.blur());
      await page.locator('#bottom-nav').waitFor({ state: 'visible' });
      await page.locator('#bottom-nav-home').click();
      await page.locator('#home-feed-section').waitFor({ state: 'visible' });
      await page.locator('#bottom-nav-menu').click();
      await page.locator('#tablet-drawer').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.locator('#bottom-nav-report').click();
      await page.locator('#report-composer-modal').waitFor({ state: 'visible' });
    }
    await page.close();
  }
  if (expectedSupabaseHost) {
    assert.deepEqual([...supabaseHosts], [expectedSupabaseHost], 'connected Public site must contact only its approved Supabase project');
  } else {
    assert.deepEqual([...supabaseHosts], [], 'isolated browser smoke must not contact any hosted Supabase project');
  }
  console.log(`Responsive Public EN/BN × light/dark gate passed at ${widths.join(', ')} CSS pixels, including mobile navigation, scroll header, keyboard, text size, and focus targets. Supabase mode: ${expectedSupabaseHost || 'isolated'}.`);
} finally {
  await browser.close();
}
