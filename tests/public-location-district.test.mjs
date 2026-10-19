import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveCanonicalDistrict, reportIsInDistrict } from '../src/services/publicDistrictMatcher.mjs';

const districts = [
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { id: 'feni', nameEn: 'Feni', nameBn: 'ফেনী' },
  { id: 'munshiganj', nameEn: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ' },
];

test('location routes resolve only the existing district identity in EN, BN or slug', () => {
  assert.equal(resolveCanonicalDistrict(' dhaka ', districts), districts[0]);
  assert.equal(resolveCanonicalDistrict('ঢাকা', districts), districts[0]);
  assert.equal(resolveCanonicalDistrict('FENI', districts), districts[1]);
  assert.equal(resolveCanonicalDistrict('Dhaka-Mawa Expressway', districts), null);
  assert.equal(resolveCanonicalDistrict('unknown', districts), null);
});

test('district feeds never count road-name mentions from other districts', () => {
  const dhaka = districts[0];
  const reports = [
    { districtEn: 'Dhaka', districtBn: 'ঢাকা', locationEn: 'Mirpur, Dhaka' },
    { districtEn: 'Feni', districtBn: 'ফেনী', locationEn: 'Dhaka-Chattogram Highway, Feni' },
    { districtEn: 'Munshiganj', districtBn: 'মুন্সীগঞ্জ', locationEn: 'Dhaka-Mawa Expressway' },
    { districtEn: ' ', districtBn: '', locationEn: 'Dhaka' },
  ];
  assert.deepEqual(reports.filter((report) => reportIsInDistrict(report, dhaka)), [reports[0]]);
});

test('location page and district filters use the same exact canonical matcher', async () => {
  const source = await readFile(new URL('../src/services/publicReportService.ts', import.meta.url), 'utf8');
  assert.match(source, /resolveCanonicalDistrict\(filters\.district, BANGLADESH_DISTRICTS\)/);
  assert.match(source, /resolveCanonicalDistrict\(locationQuery, BANGLADESH_DISTRICTS\)/);
  assert.match(source, /reportIsInDistrict\(r, district\)/);
  assert.doesNotMatch(source, /locEn\.includes\(clean\)|locBn\.includes\(clean\)/);
});
