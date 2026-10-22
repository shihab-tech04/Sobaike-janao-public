import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const [source, taxonomySource, composerSource, reviewSource, apiSource, gatewaySource] = await Promise.all([
  readFile(new URL('../src/services/reportFormService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/taxonomyService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/report-composer/Step3ComplaintDetails.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/report-composer/Step4Review.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/apiClient.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/public-write-gateway/index.ts', import.meta.url), 'utf8'),
]);

const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { getVisibleCustomFields, validateConfiguredAnswers, publishedCustomAnswers } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
);

const select = (fieldKey, storageKey, required, options, config = { publicVisible: true }) => ({
  fieldKey, storageKey, storageMode: 'custom_json', fieldType: 'select', active: true,
  required, sortOrder: 1, labelEn: fieldKey, labelBn: fieldKey, options, config,
});
const choices = [
  { value: 'abduction', labelBn: 'শিশু অপহরণ', labelEn: 'Child abduction' },
  { value: 'unknown_not_stated', labelBn: 'নিশ্চিত নয়', labelEn: 'Unknown' },
];

test('published dynamic form accepts exact active options, preserves no hidden fields', () => {
  const form = {
    subcategoryId: 'child_abduction_murder', schemaId: 'published-2', version: 2,
    engineMode: 'schema', fields: [
      select('child_incident_type', 'childIncidentType', true, choices),
      select('private_meta', 'privateMeta', false, choices, { publicVisible: false }),
      select('inactive_meta', 'inactiveMeta', true, choices, { publicVisible: true }),
    ].map((field) => field.fieldKey === 'inactive_meta' ? { ...field, active: false } : field),
  };
  assert.deepEqual(getVisibleCustomFields(form).map((field) => field.storageKey), ['childIncidentType']);
  assert.deepEqual(validateConfiguredAnswers(form, {}), { childIncidentType: 'required' });
  assert.deepEqual(validateConfiguredAnswers(form, { childIncidentType: 'fabricated' }), { childIncidentType: 'invalid_option' });
  assert.deepEqual(validateConfiguredAnswers(form, { childIncidentType: 'abduction' }), {});
  assert.deepEqual(publishedCustomAnswers(form, {
    childIncidentType: 'abduction', privateMeta: 'abduction', inactiveMeta: 'abduction', bribePaid: true,
  }), { childIncidentType: 'abduction' });
});

test('legacy forms never inherit invented schema questions', () => {
  const form = { subcategoryId: 'road-accident', engineMode: 'legacy', fields: [select('test', 'test', true, choices)] };
  assert.deepEqual(getVisibleCustomFields(form), []);
  assert.deepEqual(validateConfiguredAnswers(form, {}), {});
});

test('frontend and Edge gateway route exactly the published schema contract', () => {
  assert.match(taxonomySource, /get_public_reporting_configuration/);
  assert.match(composerSource, /validateConfiguredAnswers\(publishedForm, formData\.customFieldAnswers/);
  assert.match(composerSource, /getFieldOptions\(field\)/);
  assert.match(reviewSource, /getVisibleCustomFields/);
  assert.match(apiSource, /TaxonomyService\.isPublishedConfigurationVerified\(\)/);
  assert.match(apiSource, /publishedCustomAnswers\(form, payload\.customFieldAnswers/);
  assert.match(apiSource, /'submit_public_configured_complaint'/);
  assert.match(gatewaySource, /["']submit_public_configured_complaint["']/);
  assert.match(gatewaySource, /service_assert_public_write_rate/);
});
