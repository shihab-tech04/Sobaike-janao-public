import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const app = process.env.RECOVERY_BROWSER_APP;
const baseUrl = process.env.RECOVERY_BROWSER_BASE_URL;
assert.equal(app, 'public');
assert.ok(baseUrl, 'RECOVERY_BROWSER_BASE_URL must point to the loopback Vite server');

const widths = [360, 768, 1280];
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
    assert.equal((await feedHeading.innerText()).trim(), 'সকল প্রতিবেদন');

    // The public app presents this first-visit notice before its navigation.
    // Acknowledge it through the existing UI so the responsive menu can be tested.
    const notice = page.locator('#first-visit-notice-modal');
    if (await notice.isVisible()) {
      await page.locator('label[for="first-visit-ack-checkbox"]').click();
      await page.locator('#first-visit-acknowledge-btn').click();
      await notice.waitFor({ state: 'hidden' });
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
      path: join(screenshotDir, `public-${width}-bn.png`),
      animations: 'disabled',
    });
    assert.ok(screenshot.byteLength > 1000, `Bengali viewport screenshot was unexpectedly small at ${width}px`);

    const menuButton = page.locator(width < 768 ? '#mobile-header-menu-btn' : '#tablet-menu-button');
    await menuButton.click();
    const toggle = page.locator('#drawer-lang-toggle');
    await toggle.waitFor({ state: 'visible' });
    await toggle.click();
    await assertNoHorizontalOverflow('en');
    await page.getByRole('heading', { name: 'All reports', exact: true }).waitFor({ state: 'visible' });
    screenshot = await page.screenshot({
      path: join(screenshotDir, `public-${width}-en.png`),
      animations: 'disabled',
    });
    assert.ok(screenshot.byteLength > 1000, `English viewport screenshot was unexpectedly small at ${width}px`);
    await page.close();
  }
  assert.deepEqual([...supabaseHosts], [], 'browser smoke must not contact any hosted Supabase project');
  console.log(`Responsive Public home EN/BN smoke passed at ${widths.join(', ')} CSS pixels. Screenshots were rendered locally; no hosted data was requested.`);
} finally {
  await browser.close();
}
