import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// These seven asset paths are the currently published Supabase illustrationSrc
// contract, observed read-only on 21 October 2026. No hosted requests occur here.
const paths = [
  '/illustrations/services/harassment-hero-public-harassment-v02.jpg',
  '/illustrations/services/load-shedding-hero-family-blackout-v01.jpg',
  '/illustrations/services/extortion-hero-shopkeeper-coercion-v02.jpg',
  '/illustrations/services/public-safety-hero-rickshaw-snatching-reconstructed-v01.jpg',
  '/illustrations/services/road-transport-hero-broken-road-rickshaw-reconstructed-v01.jpg',
  '/illustrations/services/illegal-occupation-hero-footpath-encroachment-reconstructed-v01.jpg',
  '/illustrations/services/rickshaw-hero-illegal-charging-station-v02.jpg',
];
const origin = process.env.RECOVERY_BROWSER_BASE_URL;
assert.ok(origin?.startsWith('http://127.0.0.1:'), 'Only isolated built candidate');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  const results = await page.evaluate(async (paths) => Promise.all(paths.map(path =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ path, width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('Banner failed to decode: ' + path));
      image.src = path;
    })
  )), paths);
  assert.equal(results.length, 7);
  for (const item of results) {
    assert.ok(item.width >= 100 && item.height >= 100,
      item.path + ': published illustration must resolve as a real image, not an SPA HTML fallback');
  }
  console.log('PUBLIC_SEVEN_BANNER_IMAGES_PASS: 7 published illustration paths decoded by Chromium from exact candidate dist.');
} finally {
  await browser.close();
}
