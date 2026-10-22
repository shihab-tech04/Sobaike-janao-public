import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/supabasePublicReportMapper.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exported = {};
runInNewContext(transpiled, {
  exports: exported,
  require: (id) => {
    assert.equal(id, '../utils/formatters');
    return { toBanglaDigits: (value) => value };
  },
});
const mapReport = exported.mapSupabasePublicReportToItem;
assert.equal(typeof mapReport, 'function');

test('published source-provenance and actual bilingual location and summaries survive RPC mapping', () => {
  const row = {
    id: 'SJ-2026-012345', segment: 'public_safety', subcategoryId: 'road-safety',
    postOrigin: 'admin', titleBn: 'বাংলা শিরোনাম', titleEn: 'English headline',
    summaryBn: 'বাংলা সারাংশ', summaryEn: 'English summary',
    descriptionBn: 'বাংলা বিস্তারিত', descriptionEn: 'English full detail',
    locationBn: 'ধানমন্ডি, ঢাকা', locationEn: 'Dhanmondi, Dhaka',
    districtBn: 'ঢাকা', districtEn: 'Dhaka', district: 'Dhaka',
    areaBn: 'ধানমন্ডি', areaEn: 'Dhanmondi',
  };
  const report = mapReport(row);
  assert.equal(report.postOrigin, 'admin');
  assert.equal(report.shortDescriptionBn, row.summaryBn);
  assert.equal(report.shortDescriptionEn, row.summaryEn);
  assert.equal(report.fullDescriptionBn, row.descriptionBn);
  assert.equal(report.fullDescriptionEn, row.descriptionEn);
  assert.equal(report.locationBn, row.locationBn);
  assert.equal(report.locationEn, row.locationEn);
  assert.equal(report.districtBn, row.districtBn);
  assert.equal(report.districtEn, row.districtEn);
  assert.equal(report.areaBn, row.areaBn);
  assert.equal(report.areaEn, row.areaEn);
  assert.equal(report.coordinates, undefined, 'public mapping never exposes exact location coordinates');
});

test('identity-hidden reports stay location-private and citizen content gets no fabricated source link', () => {
  const item = mapReport({
    id: 'SJ-2026-045678', segment: 'harassment', subcategoryId: 'harassment',
    postOrigin: 'user', titleEn: 'Synthetic allegation',
    summaryBn: null, summaryEn: null,
    location: null, locationBn: null, locationEn: null,
    district: null, districtBn: null, districtEn: null,
  });
  assert.equal(item.postOrigin, 'user');
  assert.equal(item.locationBn, 'অবস্থান গোপন');
  assert.equal(item.locationEn, 'Location withheld');
  assert.equal(item.districtEn, '');
  assert.equal(item.coordinates, undefined);
  assert.equal(Object.hasOwn(item, 'sourceUrl'), false);
  const unknown = mapReport({ id: 'SJ-2026-078901', segment: 'harassment', subcategoryId: 'harassment', postOrigin: 'unknown' });
  assert.equal(unknown.postOrigin, undefined, 'untrusted provenance is not shown as verified');
});
