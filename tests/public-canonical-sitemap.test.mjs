import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const home = 'https://shobaikejanao.com/';
const html = readFileSync(new URL('index.html', root), 'utf8');
const robots = readFileSync(new URL('public/robots.txt', root), 'utf8');
const sitemap = readFileSync(new URL('public/sitemap.xml', root), 'utf8');

test('Public home has one consistent preferred canonical URL', () => {
  const canonical = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
  assert.equal(canonical.length, 1, 'exactly one canonical link');
  assert.ok(canonical[0][0].includes('href="' + home + '"'));
  assert.match(html, /<meta property="og:url" content="https:\/\/shobaikejanao\.com\/"\s*\/>/);
  assert.match(html, /"url": "https:\/\/shobaikejanao\.com\/"/);
  assert.match(html, /<meta name="robots" content="index, follow"/);
});

test('Public robots and sitemap list only currently crawlable canonical homepage', () => {
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Sitemap:\s*https:\/\/shobaikejanao\.com\/sitemap\.xml/);
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(entries, [home]);
  assert.ok(!sitemap.includes('#/'), 'hash routes cannot be claimed as distinct indexable URLs');
});

test('SEO changes retain application startup and publication controls', () => {
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /src="\/src\/main\.tsx"/);
  assert.doesNotMatch(robots, /Disallow:\s*\//);
});
