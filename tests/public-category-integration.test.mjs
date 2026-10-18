import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizePublishedBannerRows } from '../src/services/publicBannerMapper.mjs';

const [tokens, composer, taxonomy, banners, explore, search, appShell, header, rail, analytics, carousel] = await Promise.all([
  readFile(new URL('../src/theme/tokens.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/report-composer/Step1ServiceSelect.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/taxonomyService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/publicBannerService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/ExplorePage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/SearchPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/layout/AppShell.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/layout/Header.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/layout/DesktopLeftRail.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/explore/ReportAnalyticsOverview.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/home/ServiceHeroCarousel.tsx', import.meta.url), 'utf8'),
]);

const activeKeys = [
  'harassment',
  'load_shedding',
  'extortion',
  'public_safety',
  'road_transport',
  'illegal_occupation',
  'rickshaw',
];

test('seven active public categories remain in stable taxonomy order', () => {
  const sectionArray = tokens.match(/export const SECTION_KEYS: SectionKey\[\] = \[([\s\S]*?)\];/)?.[1] ?? '';
  const parsedKeys = [...sectionArray.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
  assert.deepEqual(parsedKeys, activeKeys);
  assert.match(tokens, /'public_safety'[\s\S]*'road_transport'[\s\S]*'illegal_occupation'/);
});

test('published banners exclude inactive, hidden, and unknown categories and sort by published order', () => {
  const fallback = Object.fromEntries(activeKeys.map((key) => [key, {
    titleBn: `${key}-bn`, titleEn: `${key}-en`, mobileDescriptionBn: 'fallback', mobileDescriptionEn: 'fallback',
    tabletDescriptionBn: 'fallback', tabletDescriptionEn: 'fallback', desktopDescriptionBn: 'fallback',
    desktopDescriptionEn: 'fallback', illustrationSrc: `/fallback/${key}.png`, primaryCtaBn: 'দেখুন', primaryCtaEn: 'View',
  }]));
  const result = normalizePublishedBannerRows([
    { category_key: 'road_transport', content: { isActive: true, showOnHome: true, sortOrder: 4, titleEn: 'Road', showHomeCta: false } },
    { category_key: 'public_safety', content: { isActive: true, showOnHome: true, sortOrder: 2, illustrationSrc: 'https://evil.example/image.png' } },
    { category_key: 'rickshaw', content: { isActive: false, showOnHome: true, sortOrder: 1 } },
    { category_key: 'unknown', content: { isActive: true, showOnHome: true, sortOrder: 0 } },
    { category_key: 'harassment', content: { isActive: true, showOnHome: false, sortOrder: 3 } },
  ], fallback, ['https://trusted.example']);

  assert.deepEqual(result.visibleKeys, ['public_safety', 'road_transport']);
  assert.equal(result.contentByKey.public_safety.illustrationSrc, '/fallback/public_safety.png');
  assert.equal(result.contentByKey.road_transport.titleEn, 'Road');
  assert.equal(Object.hasOwn(result.contentByKey.road_transport, 'showHomeCta'), false);
});

test('published banner image URLs accept only safe local paths or an explicitly trusted HTTPS origin', () => {
  const fallback = { harassment: { titleBn: 'fallback', titleEn: 'fallback', illustrationSrc: '/fallback.png' } };
  const result = normalizePublishedBannerRows([
    { category_key: 'harassment', content: { isActive: true, showOnHome: true, illustrationSrc: 'https://trusted.example/sobaike/hero.png' } },
  ], fallback, ['https://trusted.example']);
  assert.equal(result.contentByKey.harassment.illustrationSrc, 'https://trusted.example/sobaike/hero.png');

  const rejected = normalizePublishedBannerRows([
    { category_key: 'harassment', content: { isActive: true, showOnHome: true, illustrationSrc: '//trusted.example/hero.png' } },
  ], fallback, ['https://trusted.example']);
  assert.equal(rejected.contentByKey.harassment.illustrationSrc, '/fallback.png');
});

test('anonymous category reads remain scoped to active public taxonomy contracts', () => {
  assert.match(taxonomy, /rpc\('get_public_reporting_configuration'\)/);
  assert.match(taxonomy, /cachedPublishedForms = nextForms/);
  assert.match(taxonomy, /isPublishedConfigurationVerified = false/);
  assert.doesNotMatch(taxonomy, /reporting_form_schemas|reporting_form_schema_fields/);
  assert.match(banners, /rpc\('get_public_site_banners'\)/);
  assert.doesNotMatch(banners, /\.from\('site_banners'\)/);
});

test('report composer exposes published forms dynamically while retaining the four-category offline fallback', () => {
  assert.match(tokens, /export const REPORT_FORM_SECTION_KEYS: SectionKey\[\] = \[[\s\S]*?'harassment'[\s\S]*?'load_shedding'[\s\S]*?'extortion'[\s\S]*?'rickshaw'[\s\S]*?\];/);
  assert.match(composer, /REPORT_FORM_SECTION_KEYS\.includes\(service\.key\)/);
  assert.match(composer, /SECTION_KEYS\.map\(\(key\)/);
  assert.match(composer, /subcategories\[service\.key\][\s\S]*?publishedForms\[subcategory\.id\]/);
});

test('home hero keeps report actions on published form categories without a new banner toggle', () => {
  assert.match(carousel, /const canSubmit = isPublishedConfigurationVerified/);
  assert.match(carousel, /REPORT_FORM_SECTION_KEYS\.includes\(slide\.key\)/);
  assert.match(carousel, /action=\{canSubmit \? \{/);
  assert.match(carousel, /onClick: \(\) => openReportComposer\(slide\.key\)/);
  assert.doesNotMatch(carousel, /showHomeCta|navigateTo\(slide\.path\)/);
});

test('category exploration, filters, navigation, and summaries are wired to the shared seven-key registry', () => {
  assert.match(explore, /SECTION_KEYS\.map\(\(key\)/);
  assert.match(search, /\.\.\.SECTION_KEYS\.map\(\(key\)/);
  assert.match(header, /SECTION_KEYS\.map\(\(key\)/);
  assert.match(rail, /\.\.\.SECTION_KEYS\.map\(\(key\)/);
  assert.match(analytics, /SECTION_KEYS\.map\(\(key\)/);
  assert.match(appShell, /path="\/public-safety"[\s\S]*path="\/road-transport"[\s\S]*path="\/illegal-occupation"/);
});
