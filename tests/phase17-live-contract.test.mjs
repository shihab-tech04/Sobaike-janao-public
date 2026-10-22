import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAdminSeo, validatePublicSeo, validateReportingParity } from '../scripts/phase17-live-contract.mjs';

const home = 'https://shobaikejanao.com/';
const publicHtml = [
  '<link href="' + home + '" rel="canonical" />',
  '<meta content="' + home + '" property="og:url" />',
  '<meta name="robots" content="index, follow" />',
  '<script id="seo-jsonld" type="application/ld+json">',
  '{"@context":"https://schema.org","@type":"WebSite","url":"' + home + '"}',
  '</script>',
].join('\n');
const robots = 'User-agent: *\nAllow: /\nSitemap: https://shobaikejanao.com/sitemap.xml\n';
const sitemap = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + home + '</loc></url></urlset>';
const adminHtml = '<meta name="robots" content="noindex, nofollow, noarchive" />';

test('Phase17 canonical crawler contract accepts only indexable homepage and private Admin', () => {
  validatePublicSeo(publicHtml, robots, sitemap);
  validateAdminSeo(adminHtml);
});

test('Phase17 rejects invented hash entries and missing Admin noindex', () => {
  assert.throws(() => validatePublicSeo(publicHtml, robots,
    sitemap.replace('</urlset>', '<url><loc>https://shobaikejanao.com/#/report</loc></url></urlset>')));
  assert.throws(() => validateAdminSeo('<meta name="robots" content="index, follow" />'), /noindex/);
  assert.throws(() => validatePublicSeo(publicHtml.replace('href="' + home + '"', 'href="https://www.shobaikejanao.com/"'),
    robots, sitemap));
});

test('Phase17 accepts identical unique published ID sets independently of ordering', () => {
  const reports = [{ id: 'a', status: 'published' }, { id: 'b', status: 'published' }];
  const feed = [{ id: 'b', status: 'published' }, { id: 'a', status: 'published' }];
  const config = { segments: Array(7).fill({}), subcategories: Array(27).fill({}), forms: Array(27).fill({}) };
  assert.deepEqual(validateReportingParity(reports, feed, Array(7).fill({}), config),
    { reports: 2, feed: 2, banners: 7, forms: 27 });
  assert.throws(() => validateReportingParity(reports, feed.slice(0, 1), Array(7).fill({}), config));
  assert.throws(() => validateReportingParity(reports, [{ id: 'a', status: 'published' }, { id: 'a', status: 'published' }], Array(7).fill({}), config));
  assert.throws(() => validateReportingParity(reports, [{ id: 'b', status: 'draft' }, { id: 'a', status: 'published' }], Array(7).fill({}), config));
});
