import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

async function loadData(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exported = {};
  runInNewContext(outputText, { exports: exported });
  return exported;
}

const districts = await loadData('../src/data/districts.ts');
const upazilas = await loadData('../src/data/upazilas.ts');

test('canonical Bangladesh administrative registry is exact, connected and unique', () => {
  const divs = districts.DIVISIONS;
  const ds = districts.BANGLADESH_DISTRICTS;
  const us = upazilas.BANGLADESH_UPAZILAS;
  assert.equal(divs.length, 8);
  assert.equal(ds.length, 64);
  assert.equal(us.length, 601);
  for (const entries of [divs, ds, us]) {
    assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length,
      'administrative identifiers must not collide');
    assert.ok(entries.every((entry) => entry.nameEn && entry.nameBn), 'bilingual registry labels required');
  }
  assert.ok(ds.every((district) => divs.some((d) => d.id === district.divisionId)));
  assert.ok(us.every((upazila) => ds.some((d) => d.id === upazila.districtId)));
  assert.ok(ds.every((district) => upazilas.getUpazilasByDistrict(district.id).length > 0),
    'every district must support thana/upazila drilldown');
  for (const district of ds) {
    assert.ok(Number.isFinite(district.lat) && district.lat >= 20.5 && district.lat <= 26.7);
    assert.ok(Number.isFinite(district.lng) && district.lng >= 87.8 && district.lng <= 92.8);
  }
  assert.equal(districts.getDistrictByStoredName('ঢাকা').id, 'dhaka');
  assert.equal(districts.getDistrictByStoredName('Dhaka').id, 'dhaka');
  assert.ok(upazilas.getUpazilasByDistrict('dhaka').length > 40);
});

test('public map does not render raw incident coordinates or keyless CARTO tiles', async () => {
  const source = await readFile(new URL('../src/components/explore/PublicIncidentMap.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
  assert.equal(source.includes('basemaps.cartocdn.com'), false);
  assert.equal(source.includes('r.coordinates'), false);
  assert.ok(source.includes("'districts'"));
  assert.ok(source.includes('BANGLADESH_DISTRICTS'));
});
